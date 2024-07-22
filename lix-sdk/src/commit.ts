import { Kysely } from "kysely";
import { Database } from "./schema";
import { v4 } from "uuid";

export async function commit(args: {
  db: Kysely<Database>;
  userId: string;
  description: string;
}) {
  return args.db.transaction().execute(async () => {
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

    return await args.db
      .updateTable("change")
      .where("commit_id", "is", null)
      .set({
        commit_id: commit.id,
      })
      .execute();
  });
}
