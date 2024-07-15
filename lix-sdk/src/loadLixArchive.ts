import { Kysely, ParseJSONResultsPlugin } from "kysely";
import { SQLocalKysely } from "sqlocal/kysely";
import { jsonArrayFrom } from "kysely/helpers/sqlite";
import { Database } from "./schema";

/**
 * Opens a lix repository.
 *
 * @example local file
 *   const repo = await loadRepository(blob);
 *
 * @example from a remote
 *   const repo = await loadRepository(fromRemote(remote));
 */
export async function loadLixArchive(blob: Blob) {
  await importArchiveIntoOPFS({
    blob,
    // .lixa = lix archive
    path: "test.lixa",
  });

  const { dialect, sql } = new SQLocalKysely("test.inlang");
  const db = new Kysely<Database>({
    dialect,
    plugins: [new ParseJSONResultsPlugin()],
  });
  return {
    sql,
    db,
  };
}

/**
 * Imports a project from a blob into OPFS.
 */
async function importArchiveIntoOPFS(args: { blob: Blob; path: string }) {
  const opfsRoot = await navigator.storage.getDirectory();
  // TODO file names based on UUID to avoid collisions
  const fileHandle = await opfsRoot.getFileHandle(args.path, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(args.blob);
  await writable.close();
}
