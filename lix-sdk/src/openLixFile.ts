import { Kysely, ParseJSONResultsPlugin } from "kysely";
import { SQLocalKysely } from "sqlocal/kysely";
import { Database } from "./schema";
import { Plugin } from "./plugin";

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

  await createCallbackFunction("fileModified", (id, path) => {
    for (const plugin of plugins) {
      plugin.onFileChange({ id, path });
    }
  });

  await sql`
  CREATE TEMP TRIGGER file_modified AFTER UPDATE ON File
  BEGIN
    SELECT fileModified(NEW.id, NEW.path);
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

  return plugins as Plugin[];
}
