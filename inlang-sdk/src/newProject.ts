import { SQLocal } from "sqlocal";

/**
 * Creates a new inlang project.
 *
 * The app is responsible for saving the project "whereever"
 * e.g. the user's computer, cloud storage, or OPFS in the browser.
 */
export async function newProject(): Promise<Blob> {
  const opfsRoot = await navigator.storage.getDirectory();
  const interimDbName = `interim_${Math.random()}_for_new_project_creation.inlang`;
  try {
    const { sql } = new SQLocal(interimDbName);
    await sql`

    CREATE TABLE Bundle (
      id TEXT PRIMARY KEY,
      alias TEXT NOT NULL
    );

    CREATE TABLE Message (
      id TEXT PRIMARY KEY, 
      bundleId TEXT NOT NULL,
      locale TEXT NOT NULL,
      declarations TEXT NOT NULL,
      selectors TEXT NOT NULL
    );

    CREATE TABLE Variant (
      id TEXT PRIMARY KEY, 
      messageId TEXT NOT NULL,
      match TEXT NOT NULL,
      pattern TEXT NOT NULL
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
