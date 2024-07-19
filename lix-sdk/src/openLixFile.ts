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

  await createCallbackFunction("fileModified", async (id, oldBlob, newBlob) => {
    console.log("running modified");
    try {
      for (const plugin of plugins) {
        const changes = await plugin.onFileChange({
          id,
          old: oldBlob,
          neu: newBlob,
        });
        console.log({ changes });
        for (const change of changes) {
          await db
            .insertInto("change")
            .values({
              // todo - use uuids
              id: (Math.random() * 100).toFixed() + "-" + Date.now(),
              file_id: id,
              plugin_key: plugin.key,
              data: JSON.stringify(change),
            })
            .execute();
        }
      }
    } catch (e) {
      console.error("fileModified", e);
    }
  });

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
