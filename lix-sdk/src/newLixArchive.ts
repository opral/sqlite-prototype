import { SQLocal } from "sqlocal";

/**
 * Creates a new repository.
 *
 * The app is responsible for saving the project "whereever"
 * e.g. the user's computer, cloud storage, or OPFS in the browser.
 */
export async function newLixArchive(): Promise<Blob> {
  const opfsRoot = await navigator.storage.getDirectory();
  const interimDbName = `interim_${Math.random()}_new.lixa`;
  try {
    const { sql } = new SQLocal(interimDbName);
    await sql`

    CREATE TABLE File (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      data BLOB NOT NULL
    );
      `;
    const fileHandle = await opfsRoot.getFileHandle(interimDbName);
    const file = await fileHandle.getFile();
    // load db into memory
    const buffer = await file.arrayBuffer();
    // return a blob of the db
    return new Blob([buffer]);
  } finally {
    // in any case remove the interim db
    await opfsRoot.removeEntry(interimDbName);
  }
}

const file = await repo.file.select.where("id", "=", "sapihf093hf09na.json");
