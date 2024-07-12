import { loadProject } from "./loadProject";

const repo = await fromRemote("https://example.com/my-repo.lix");

const csv = repo.file.select().where("path", "=", "financials.csv");

const updated = update(csv);

repo.file.update(updated).where("path", "=", "financials.csv");

repo.commit();

// ------------------------------------------------------------

async function newCSVProject() {
  const repo = await newRepository();

  await repo.file.create(
    "/financials.csv",
    `
    name, amount, category
    "Rent", 500, "housing"
    "Groceries", 200, "food"
    `
  );

  // create lix plugin
  await repo.file.create(
    "/lix/plugin/csv-plugin.js",
    `
    export const plugin = {
      glob: "*.csv",
      onChange({ ref, source, incoming }) {},
    };
  `
  );
  // create default notifcations
  await repo.file.create(
    "/lix/notification/transaction-exceeds-500.yaml",
    `
      - triggerOn: "amount"
      - if (amount > 500)
      ...
  `
  );
}

// ---------- load project from remote ----------------------------

const project = await loadProject(file);

async function loadProject(blob: Blob) {
  const repo = await openRepo(blob);
  const dbFile = repo.file.select().where("path", "=", "db.sqlite").first();
  const sqlite = new SQLocal(dbFile);

  return {
    sqlite,
    // theoretical workaround for not writing sqlite to lix fs
    // TODO: look up sqlite fs adapter
    close: async () => {
      const file = sqlite.toBlob();
      await repo.file.update(file).where("path", "=", "db.sqlite");
    },
  };
}
