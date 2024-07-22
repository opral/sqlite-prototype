import { Kysely } from "kysely";
import { Database } from "./schema";
import { v4 } from "uuid";

export async function commit(args: {
  db: Kysely<Database>;
  userId: string;
  description: string;
}) {
  const uncommittedChanges = await args.db
    .selectFrom("change")
    .selectAll()
    .where("commit_id", "is", null)
    .execute();

  if (uncommittedChanges.length === 0) {
    console.log("No changes to commit");
    return;
  }

  const commit = await args.db
    .insertInto("commit")
    .values({
      id: v4(),
      user_id: args.userId,
      // todo - use zoned datetime
      zoned_date_time: new Date().toISOString(),
      description: args.description,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  for (const change of uncommittedChanges) {
    await args.db
      .updateTable("change")
      .where("id", "=", change.id)
      .set({
        commit_id: commit.id,
      })
      .execute();
  }
  console.log("Committed changes");
}
