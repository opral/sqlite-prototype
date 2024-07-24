import { Kysely } from "kysely";
import { Database } from "./schema";
import { v4 } from "uuid";

export async function commit(args: {
  db: Kysely<Database>;
  userId: string;
  description: string;
  merge?: boolean
}) {
  // FIXME: we need a refs table to store current commit etc. we cannot walk everytime or rely on timestamps!
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

    if (!args.merge) {
      // look for all conflicts and remove them if there is a new change that has same id
      // TODO: needs checking of type and plugin? and integrate into one sql statement
      const newChanges = (await args.db
        .selectFrom("change")
        .where("commit_id", "is", null)
        .selectAll()
        .execute()).map(change => change.value.id)
      
      await args.db
        .updateTable("change")
        .set({
          conflict: null,
        })
        .where("conflict", "is not", null)
        .where((eb) => eb.ref("value", "->>").key("id"), "in", newChanges)
        .execute()
    }

    return await args.db
      .updateTable("change")
      .where("commit_id", "is", null)
      .set({
        commit_id: commit.id,
      })
      .execute();
  });
}
