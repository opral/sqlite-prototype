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

  const plugins = await loadPlugins(sql);

  await createCallbackFunction("fileModified", (fileId, oldBlob, newBlob) =>
    handleFileChange({
      fileId,
      oldBlob,
      newBlob,
      plugins,
      db,
    })
  );

  await sql`
  CREATE TEMP TRIGGER file_modified AFTER UPDATE ON File
  BEGIN
    SELECT fileModified(NEW.id, OLD.blob, NEW.blob);
  END;
  `;

  await registerDiffComponents(plugins);

  return {
    db,
    sql,
    plugins,
    commit: (args: { userId: string; description: string }) => {
      return commit({ db, ...args });
    },
  };
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
  fileId;
  oldBlob;
  newBlob;
  plugins: LixPlugin[];
  db: Kysely<Database>;
}) {
  for (const plugin of args.plugins) {
    const changes = await plugin.diff!.file!({
      old: args.oldBlob,
      neu: args.newBlob,
    });
    for (const change of changes) {
      const changeExists = await args.db
        .selectFrom("uncommitted_change")
        .select("id")
        .where((eb) => eb.ref("value", "->>").key("id"), "=", change.value.id)
        .where("type", "=", change.type)
        .where("file_id", "=", args.fileId)
        .where("plugin_key", "=", plugin.key)
        .executeTakeFirst();

      if (changeExists) {
        // overwrite the (uncomitted) change
        // to avoid (potentially) saving every keystroke change
        await args.db
          .updateTable("uncommitted_change")
          .where((eb) => eb.ref("value", "->>").key("id"), "=", change.value.id)
          .where("type", "=", change.type)
          .where("file_id", "=", args.fileId)
          .where("plugin_key", "=", plugin.key)
          .set({
            // @ts-expect-error - database expects stringified json
            value: JSON.stringify(change.value),
            meta: JSON.stringify(change.meta),
          })
          .execute();
      } else {
        await args.db
          .insertInto("uncommitted_change")
          .values({
            id: v4(),
            type: change.type,
            file_id: args.fileId,
            plugin_key: plugin.key,
            // @ts-expect-error - database expects stringified json
            value: JSON.stringify(change.value),
            meta: JSON.stringify(change.meta),
          })
          .execute();
      }
    }
  }
}
