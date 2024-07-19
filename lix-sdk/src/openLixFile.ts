import { Kysely, ParseJSONResultsPlugin } from "kysely";
import { SQLocalKysely } from "sqlocal/kysely";
import { Database } from "./schema";
import { LixPlugin } from "./plugin";

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

  await createCallbackFunction("fileModified", (id, oldBlob, newBlob) =>
    handleChanges({
      id,
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

  return {
    db,
    sql,
    plugins,
  };
}

async function loadPlugins(sql: any) {
  const pluginFiles = await sql`
    SELECT * FROM file
    WHERE path GLOB 'lix/plugin/*'
  `;

  const decoder = new TextDecoder("utf8");
  const plugins = await Promise.all(
    pluginFiles.map(
      async (file: any) =>
        /* @vite-ignore */
        (
          await import(
            "data:text/javascript;base64," + btoa(decoder.decode(file.blob))
          )
        ).default
    )
  );

  return plugins as LixPlugin[];
}

async function handleChanges(args: {
  id;
  oldBlob;
  newBlob;
  plugins: LixPlugin[];
  db: Kysely<Database>;
}) {
  for (const plugin of args.plugins) {
    const changes = await plugin.onFileChange({
      id: args.id,
      old: args.oldBlob,
      neu: args.newBlob,
    });
    for (const change of changes) {
      await args.db
        .insertInto("change")
        .values({
          id: change.id,
          type: change.type,
          file_id: args.id,
          plugin_key: plugin.key,
          value: JSON.stringify(change.value),
          meta: JSON.stringify(change.meta),
        })
        .execute();
    }
  }
}
