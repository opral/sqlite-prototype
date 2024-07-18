import { Kysely, ParseJSONResultsPlugin } from "kysely";
import { SQLocalKysely } from "sqlocal/kysely";
import { Database } from "./schema";

/**
 *
 */
export async function openLixFromOPFS(path: string) {
  const { dialect } = new SQLocalKysely(path);
  const db = new Kysely<Database>({
    dialect,
    plugins: [new ParseJSONResultsPlugin()],
  });

  return {
    db,
  };
}
