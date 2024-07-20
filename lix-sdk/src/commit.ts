import { Kysely } from "kysely";
import { Database } from "./schema";
import { v4 } from "uuid";

export async function commit(args: {
  db: Kysely<Database>;
  userId: string;
  description: string;
}) {
  const uncommittedChanges = await args.db
    .selectFrom("uncommitted_change")
    .selectAll()
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

  await args.db
    .insertInto("change")
    .values(
      // @ts-expect-error - database expects stringified json
      uncommittedChanges.map((change) => ({
        ...change,
        id: v4(),
        meta: JSON.stringify(change.meta),
        data: JSON.stringify(change.data),
        commit_id: commit.id,
      }))
    )
    .execute();

  for (const change of uncommittedChanges) {
    await args.db
      .deleteFrom("uncommitted_change")
      .where("id", "=", change.id)
      .execute();
  }
  console.log("Committed changes");
}
