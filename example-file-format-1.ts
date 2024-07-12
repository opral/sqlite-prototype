import { loadProject } from "./loadProject";

const plugin = {
  glob: "*.zettel",
  onChange({ ref, source, incoming }) {},
};

const x = openRepo();

const csv = repo.file.select().where("path", "=", "project.csv").first();

const updated = update(csv);

repo.file.update(updated).where("path", "=", "project.csv");

repo.commit();

// ------------------------------------------------------------

async function newProject() {
  const repo = await newRepository();

  const sqlite = new SQLocal("db.sqlite");

  sqlite.sql`
    CREATE TABLE Bundle (
      id TEXT PRIMARY KEY,
      alias TEXT NOT NULL
    );
  `;

  await repo.file.create("/db.sqlite", sqlite.toArrayBuffer());

  // create lix plugin
  await repo.file.create(
    "/lix/plugin/zettel-plugin.js",
    `
    export const plugin = {
      glob: "*.zettel",
      onChange({ ref, source, incoming }) {},
    };
  `
  );
  // create default notifcations
  await repo.file.create(
    "/lix/notification/inform-on-french-messages.yaml",
    `
      - triggerOn: "message"
      - if (message.locale === "fr")
      ...
  `
  );
  await repo.file.create(
    "/lix/notification/if-limits-exceeds-500.yaml",
    `
      - triggerOn: "bundle"
      - if (bundle.messages.length > 500)
      ...
  `
  );
  // write file to user disk
  await fs.writeFile("/my-cool-project.zettel", await toBlob(repo));
}

// ---------- load project from remote ----------------------------

const file = await lix.fromRemote("https://example.com/my-cool-project.zettel");

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
