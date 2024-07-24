import { Kysely, ParseJSONResultsPlugin } from "kysely";
import { SQLocalKysely } from "sqlocal/kysely";
import { Database } from "./schema";
import { LixPlugin } from "./plugin";
import { commit } from "./commit";
import { v4 } from "uuid";

/**
 *
 */
export async function openLixFromOPFS(path: string) {
  const { dialect, sql, createCallbackFunction } = new SQLocalKysely(path);

  const db = new Kysely<Database>({
    dialect,
    plugins: [new ParseJSONResultsPlugin()],
  });

  const plugins = (await loadPlugins(sql).catch(err => console.error(err))) || []

  await createCallbackFunction("fileModified", (fileId, oldBlob, newBlob, newPath) =>
    handleFileChange({
      newPath,
      fileId,
      oldBlob,
      newBlob,
      plugins,
      db,
    })
  );

  await sql`
  CREATE TEMP TRIGGER file_modified BEFORE UPDATE ON File
  BEGIN
    SELECT fileModified(NEW.id, OLD.blob, NEW.blob, NEW.path);
  END;
  `;

  await createCallbackFunction("fileInserted", (fileId, newBlob, newPath) =>
    handleFileInsert({
      newPath,
      fileId,
      newBlob,
      plugins,
      db,
    })
  );

  await sql`
  CREATE TEMP TRIGGER file_inserted BEFORE INSERT ON File
  BEGIN
    SELECT fileInserted(NEW.id, NEW.blob, NEW.path);
  END;
  `;

  await registerDiffComponents(plugins);

  return {
    db,
    sql,
    plugins,
   
    merge: ({ path, userId }) => {
      return merge({ db, sql, path, plugins, userId });
    },
    
    commit: (args: { userId: string; description: string }) => {
      return commit({ db, ...args });
    },
  };
}

function indexByFileId (changes) {  
  const changesByFileId = {}
  changes.forEach(change => {
    if (!changesByFileId[change.file_id]) {
      changesByFileId[change.file_id] = {}
    }
    if (!changesByFileId[change.file_id][change.value.id]) {
      changesByFileId[change.file_id][change.value.id] = []
    }

    changesByFileId[change.file_id][change.value.id].push(change)
  })

  return changesByFileId
}

async function merge ({db, sql, path, plugins, userId }) {
  // TODO: use attach instead
  const incomming = await openLixFromOPFS(path)
  // @ts-expect-error
  window.db = { db, sql }

  const dirty = await db
    .selectFrom("change")
    .select('id')
    .where('commit_id', 'is', null)
    .executeTakeFirst()
  if (dirty) {
    throw new Error('cannot merge on uncommited changes, pls commit first')
  }

  const hasConflicts = await db
    .selectFrom("change")
    .selectAll()
    .where('conflict', 'is not', null)
    .executeTakeFirst()
  if (hasConflicts) {
    throw new Error('cannot merge on existing conflicts, pls resolve first')
  }

  const bCommits = (await incomming.sql`select * from "commit" order by zoned_date_time`).reverse()

  let commonAncestor
  for (const commit of bCommits) {    
    // TODO: use single join on attached database instead
    commonAncestor = (await sql`select * from "commit" where id = ${commit.id} limit 1`)[0]
    if (commonAncestor) {
      break
    }
  }
  if (!commonAncestor) {
    throw new Error('no common ancestor found')
  }

  // FIXME: hack needs replacement with other logic! (parent id or similar to vector clock)
  const aOnlyCommits = await sql`select * from "commit" where zoned_date_time > ${commonAncestor.zoned_date_time}`
  const bOnlyCommits= bCommits.filter(commit => commit.zoned_date_time > commonAncestor.zoned_date_time)

  const aOnlyChanges = await db
    .selectFrom('change')
    .selectAll()
    .where('commit_id', 'in', aOnlyCommits.map(commit => commit.id))
    .orderBy("zoned_date_time", "desc")
    .execute()

  const bOnlyChanges = await incomming.db
    .selectFrom('change')
    .selectAll()
    .where('commit_id', 'in', bOnlyCommits.map(commit => commit.id))
    .orderBy("zoned_date_time", "desc")
    .execute()

  const aOnlyChangesByFileId = indexByFileId(aOnlyChanges)
  const bOnlyChangesByFileId = indexByFileId(bOnlyChanges)

  // FIXME: new files in a are ignored for now, could have info relevant for merging, so best to add this

  const fileChanges: any[] = []
  for (const [fileId, atomChangesByAtomId ] of Object.entries(bOnlyChangesByFileId)) {
    if (!aOnlyChangesByFileId[fileId]) {
      console.warn('TODO: copy over new files fileId: ' + fileId)
      continue
    }

    const fileChange: {
      fileId: string
      changes: any[]
      conflicts: any[]
    } = {
      fileId: fileId,
      changes: [],
      conflicts: []
    }
    // @ts-ignore
    for (const [atomId, atomChanges] of Object.entries(atomChangesByAtomId)) {
      if (aOnlyChangesByFileId[fileId][atomId]) {
        const current = aOnlyChangesByFileId[fileId][atomId]
        const base = await db
          .selectFrom('change') 
          .selectAll()
          .where("id", "=", current.at(-1).parent_id)
          .executeTakeFirstOrThrow()
        
        fileChange.conflicts.push({ current, incoming: atomChanges, base})
      } else {
        fileChange.changes.push(atomChanges)
      }
    }

    fileChanges.push(fileChange)
  }

  const mergeResults: any[] = []
  for (const fileChange of fileChanges) {    
    const current = (await sql`select blob from file where id = ${fileChange.fileId}`)[0]?.blob
    const incoming = (await incomming.sql`select blob from file where id = ${fileChange.fileId}`)[0]?.blob

    for (const plugin of plugins) {
      const mergeRes = await plugin.merge!.file!({
        current,
        incoming,
        ...fileChange
      })

      mergeResults.push({fileId: fileChange.fileId, ...mergeRes})
    }
  }

  for (const { fileId, result, unresolved } of mergeResults) {
    if (result) {
      await db
        .updateTable("file")
        .set({
          blob: result,
        })
        .where(
          "id",
          "=",
          fileId
        )
        .execute()
    }

    if (unresolved) {
      for (const { current, incoming } of unresolved) {
        const parent = await db
          .selectFrom("change")
          .select("id")
          .where((eb) => eb.ref("value", "->>").key("id"), "=", current[0].value.id)
          .where("type", "=", current[0].type)
          .where("file_id", "=", current[0].file_id)
          .where("plugin_key", "=", current[0].plugin_key)
          .where("commit_id", "is not", null)
          .orderBy("zoned_date_time", "desc")
          .executeTakeFirst()
        
        await db
          .insertInto("change")
          .values({
            id: v4(),
            type: current[0].type,
            file_id: current[0].file_id,
            plugin_key: current[0].plugin_key,
            parent_id: parent?.id,
            value: JSON.stringify(current[0].value),
            conflict: JSON.stringify(incoming),
            zoned_date_time: new Date().toISOString(),
          })
          .execute()
      }
    } 
  }

  // @ts-expect-error
  window.db = { db, sql }

  // TODO: we can sync in the history from the incoming database and add a link in the merge commit
  await commit({
    db,
    userId,
    description: "Merge in " + path,
    merge: true
  })
}

async function loadPlugins(sql: any) {
  const pluginFiles = await sql`
    SELECT * FROM file
    WHERE path GLOB 'lix/plugin/*'
  `;
  const decoder = new TextDecoder("utf8");
  let plugins: LixPlugin[] = [];
  for (const plugin of pluginFiles) {
    const text = btoa(decoder.decode(plugin.blob));
    const pluginModule = await import("data:text/javascript;base64," + text);
    plugins.push(pluginModule.default);
  }
  return plugins as LixPlugin[];
}

async function registerDiffComponents(plugins: LixPlugin[]) {
  for (const plugin of plugins) {
    for (const type in plugin.diffComponent) {
      const component = await plugin.diffComponent[type]();
      const name = "lix-diff-" + plugin.key + "-" + type;
      if (customElements.get(name) === undefined) {
        customElements.define(name, component);
      }
    }
  }
}

async function handleFileChange(args: {
  newPath;
  fileId;
  oldBlob;
  newBlob;
  plugins: LixPlugin[];
  db: Kysely<Database>;
}) {
  for (const plugin of args.plugins) {
    // todo: check for plugin glob
    if (!args.newPath.endsWith('.csv')) {
      return
    }
    const diffs = await plugin.diff!.file!({
      old: args.oldBlob,
      neu: args.newBlob,
    })

    for (const diff of diffs) {
      const changeExists = await args.db
        .selectFrom("change")
        .select("id")
        .where((eb) => eb.ref("value", "->>").key("id"), "=", diff.value.id)
        .where("type", "=", diff.type)
        .where("file_id", "=", args.fileId)
        .where("plugin_key", "=", plugin.key)
        .where("commit_id", "is", null)
        .executeTakeFirst()

      if (changeExists) {
        await args.db
          .updateTable("change")
          .where((eb) => eb.ref("value", "->>").key("id"), "=", diff.value.id)
          .where("type", "=", diff.type)
          .where("file_id", "=", args.fileId)
          .where("plugin_key", "=", plugin.key)
          .where("commit_id", "is", null)
          .set({
            // @ts-expect-error - database expects stringified json
            value: JSON.stringify(diff.value),
            meta: JSON.stringify(diff.meta),
            zoned_date_time: new Date().toISOString(),
          })
          .execute()
      } else {
        const parent = await args.db
          .selectFrom("change")
          .select("id")
          .where((eb) => eb.ref("value", "->>").key("id"), "=", diff.value.id)
          .where("type", "=", diff.type)
          .where("file_id", "=", args.fileId)
          .where("plugin_key", "=", plugin.key)
          .where("commit_id", "is not", null)
          .orderBy("zoned_date_time", "desc")
          .executeTakeFirst()
        
          await args.db
            .insertInto("change")
            .values({
              id: v4(),
              type: diff.type,
              file_id: args.fileId,
              plugin_key: plugin.key,
              parent_id: parent?.id, 
              // @ts-expect-error - database expects stringified json
              value: JSON.stringify(diff.value),
              meta: JSON.stringify(diff.meta),
              zoned_date_time: new Date().toISOString(),
            })
            .execute()
      }
    }
  }
}

// creates initial commit
async function handleFileInsert(args: {
  newPath;
  fileId;
  newBlob;
  plugins: LixPlugin[];
  db: Kysely<Database>;
}) {
  for (const plugin of args.plugins) {
    if (!args.newPath.endsWith('.csv')) {
      return
    }
    const diffs = await plugin.diff!.file!({
      old: undefined,
      neu: args.newBlob,
    });
    for (const diff of diffs) {
      await args.db
        .insertInto("change")
        .values({
          id: v4(),
          type: diff.type,
          file_id: args.fileId,
          plugin_key: plugin.key,
          // @ts-expect-error - database expects stringified json
          value: JSON.stringify(diff.value),
          meta: JSON.stringify(diff.meta),
          zoned_date_time: new Date().toISOString(),
        })
        .execute();
    }
    await commit({
      db: args.db,
      userId: "system",
      description: "Initial commit",
    });
  }
}
