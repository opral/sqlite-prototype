import { loadProject } from "./loadProject";

const repo = openRepo();

const project = await loadProject(repo);

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
    "/lix/plugin/inlang-plugin.js",
    `
    export const plugin = {
      glob: "*.inlang",
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
    "/lix/notification/too-many-variants.yaml",
    `
      - triggerOn: "bundle"
      - if (bundle.messages.length > 20)
      ...
  `
  );
  // write file to user disk
  await fs.writeFile("/my-cool-project.inlang", await toBlob(repo));
}

// ---------- load project from remote ----------------------------

const repo = await fromRemote("https://example.com/my-cool-project.inlang");

const project = await loadProject(repo);

async function loadProject(blob: Blob) {
  const repo = await openRepo(blob);
  const dbFile = repo.file.select().where("path", "=", "db.sqlite").first();
  const sqlite = new SQLocal(dbFile);

  return {
    sqlite,
    // theoretical workaround for not writing sqlite to lix fs
    // close: async () => {
    //   const file = sqlite.toBlob();
    //   await repo.file.update(file).where("path", "=", "db.sqlite");
    // },
  };
}
