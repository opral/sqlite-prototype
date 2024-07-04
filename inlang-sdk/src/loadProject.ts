import { Kysely, ParseJSONResultsPlugin } from "kysely";
import { importProjectIntoOPFS } from "./importProject";
import { SQLocalKysely } from "sqlocal/kysely";
import { Database } from "./schema";
import { jsonArrayFrom } from "kysely/helpers/sqlite";

/**
 *
 */
export async function loadProject(blob: Blob) {
  // naively overwriting the existing db
  // todo - use uuids to store projects and avoid conflicts
  await importProjectIntoOPFS({ blob, path: "test.inlang" });
  const { dialect } = new SQLocalKysely("test.inlang");
  const db = new Kysely<Database>({
    dialect,
    plugins: [new ParseJSONResultsPlugin()],
  });

  return {
    db,
    bundle: {
      select: selectAllWithNestedMessages(db),
    },
    settings: db.selectFrom("settings"),
  };
}

/**
 * Select all bundles with nested messages and variants.
 *
 * >> { bundle, messages: [{ message, variants: [{ variant }] }] }
 */
const selectAllWithNestedMessages = (db: Kysely<Database>) => {
  return db.selectFrom("bundle").select((eb) => [
    // select all columns from bundle
    "id",
    "alias",
    // select all columns from messages as "messages"
    jsonArrayFrom(
      eb
        .selectFrom("message")
        .select((eb) => [
          // select all columns from message
          "id",
          "bundleId",
          "locale",
          "declarations",
          "selectors",
          // select all columns from variants as "variants"
          jsonArrayFrom(
            eb
              .selectFrom("variant")
              .select(["id", "messageId", "match", "pattern"])
              .whereRef("variant.messageId", "=", "message.id")
          ).as("variants"),
        ])
        .whereRef("message.bundleId", "=", "bundle.id")
    ).as("messages"),
  ]);
};
