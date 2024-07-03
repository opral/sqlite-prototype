import { sqlite3Worker1Promiser } from "@sqlite.org/sqlite-wasm";
import { importProjectIntoOPFS } from "./importProject";

/**
 *
 */
export async function loadProject(blob: Blob) {
  openSqlite(blob);
  return {};
}

async function openSqlite(blob: Blob) {
  // storing the blob in OPFS for fasted performance

  await importProjectIntoOPFS({ blob, path: "test.inlang" });

  const promiser: any = await new Promise((resolve) => {
    const _promiser = sqlite3Worker1Promiser({
      onready: () => resolve(_promiser),
    });
  });

  const openResponse = await promiser("open", {
    filename: `file:test.inlang?vfs=opfs`,
  });

  const { dbId } = openResponse;

  const x = await promiser("exec", {
    dbId,
    sql: "select * from employees limit 10",
  });

  console.log({ dbId, x });
}

// https://github.com/sqlite/sqlite-wasm/issues/53
declare module "@sqlite.org/sqlite-wasm" {
  export function sqlite3Worker1Promiser(...args: any): any;
}
