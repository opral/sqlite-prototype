import { Kysely } from "kysely";
import { importProjectIntoOPFS } from "./importProject";
import { SQLocalKysely } from "sqlocal/kysely";
import { Database } from "./schema";

/**
 *
 */
export async function loadProject(blob: Blob) {
  // naively overwriting the existing db
  // todo - use uuids to store projects and avoid conflicts
  await importProjectIntoOPFS({ blob, path: "test.inlang" });
  const { dialect } = new SQLocalKysely("test.inlang");
  const db = new Kysely<Database>({ dialect });

  return {
    query: db,
    settings: db.selectFrom("settings"),
  };
}
