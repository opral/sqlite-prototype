import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { project } from "./state";
import { Task } from "@lit/task";
import { createBundle } from "inlang-sdk"
import "./message-bundle-component.mjs";
import { repeat } from "lit/directives/repeat.js";

@customElement("project-view")
export class ProjectView extends LitElement {
  // manual rerender trigger until .subscribe() method exists
  @state()
  crudOperationExecuted = 0;

  @state()
  numBundlesToGenerate = 1;

  @state()
  limitRendering = 100;

  loadBundlesTask = new Task(this, {
    args: () => [this.crudOperationExecuted, this.limitRendering],
    task: async () => {
      const bundles = await project.value?.bundle.select
        .limit(this.limitRendering)
        .execute();
      return bundles;
    },
  });

  numBundles = new Task(this, {
    args: () => [this.crudOperationExecuted],
    task: async () => {
      const numBundles = await project.value!
        .sql`select count(*) as count from bundle`;
      return numBundles[0].count;
    },
  });

  connectedCallback(): void {
    super.connectedCallback();
    // trigger loading of bundles
    this.loadBundlesTask.run();
  }

  async dumpDatabase() {
    const db = await project.value!
    const result = await db.sql`SELECT name FROM sqlite_master WHERE type='table'`;

    for (const { name } of result) {
      const table = name;
      
      // const tablename = table.replace("/", "");
      // const filepath = path.join(outputPath, `${tablename}.ndjson`);
      // const metapath = path.join(outputPath, `${tablename}.metadata.json`);

      // Dump rows to filepath
      const query = `SELECT * FROM ${table}`;

// Call the sql function with the constructed query
      const rows = await db.rawSql(`SELECT * FROM ${table}`);
      
      const rowStrings = rows.map(row => JSON.stringify(Object.values(row), (_, value) => typeof value === 'string' ? value : String(value))).join("\n");
      console.log(table, rowStrings);

      // Dump out metadata
      const columns = await db.rawSql(`PRAGMA table_info(${table})`).then(cols => cols.map(col => col.name))
      const schema = await db.rawSql(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`).then(row => row.sql);
      const metadata = JSON.stringify({
          name: table,
          columns: columns,
          schema: schema
      }, null, 4);
      console.log(table, metadata);
      // fs.writeFileSync(metapath, metadata);
    }

    debugger
  }

  async loadDatabase() {

  }

  // TODO move logic to inlang-sdk (query engine)
  async createBundles() {
    let bundles = [] as any;
    let messages = [] as any;
    let variants = [] as any;
    for (let i = 0; i < this.numBundlesToGenerate; i++) {
      // TODO move id generation to inlang-sdk
      const sdkBundle = createBundle(['de-DE', 'en-US'], 3, 2, 2)
      const dbBundle = sdkBundle as any
      sdkBundle.messages.forEach(message => {
        message.variants.forEach(variant => variants.push(variant))
        const dbMessage = message as any;
        delete dbMessage.variants
        messages.push(dbMessage)
      })
      delete dbBundle.messages
      bundles.push(dbBundle)
      
      // manual batching to avoid too many db operations
      if (bundles.length > 1000) {
        // TODO make in one query
        await project.value!.bundle.insert.values(bundles).execute();
        await project.value?.db
          .insertInto("message")
          .values(messages as any)
          .execute();
        await project.value?.db
          .insertInto("variant")
          .values(variants as any)
          .execute();

        bundles = [];
        messages = [];
        variants = [];
      }
    }
    // insert remaining bundles
    if (bundles.length > 0) {
      await project.value!.bundle.insert.values(bundles).execute();
      await project
        .value!.db.insertInto("message")
        .values(messages as any)
        .execute();
      await project.value?.db
        .insertInto("variant")
        .values(variants as any)
        .execute();
    }
    this.crudOperationExecuted++;
  }

  render() {
    return html`
      <div style="display: flex; gap: 1rem;">
        <input
          .value=${this.numBundlesToGenerate}
          @change=${(event: any) =>
            (this.numBundlesToGenerate = event.target.value)}
          type="number"
        />
        <button @click=${this.createBundles}>
          Create ${this.numBundlesToGenerate} Bundles
        </button>
        <button @click=${this.dumpDatabase}>
          dumpDatabase
        </button>
        <p>
          ${this.numBundles.render({
            pending: () => "Loading...",
            error: (error) => `Error: ${error}`,
            complete: (numBundles) => `Currently ${numBundles} bundles exist.`,
          })}
        </p>
        <p>Limit rendering to</p>
        <input
          .value=${this.limitRendering}
          @change=${(event: any) => (this.limitRendering = event.target.value)}
          type="number"
        />
        <p>bundles</p>
      </div>
      <hr />
      <h2>Bundles</h2>
      ${this.loadBundlesTask.value === undefined ||
      this.loadBundlesTask.value.length === 0
        ? html`<p>No bundles exist yet</p>`
        : html`${repeat(
            this.loadBundlesTask.value,
            (bundle) => bundle.id,
            (bundle) => html`<inlang-message-bundle
              .messageBundle=${bundle}
              .settings=${mockSettings}
              .mockInstalledLintRules=${mockInstalledLintRules}
            ></inlang-message-bundle>`
          )}`}
    `;
  }
}



const mockSettings = {
  $schema: "https://inlang.com/schema/project-settings",
  baseLocale: "en",
  locales: ["en", "de"],
  lintConfig: [
    {
      ruleId: "messageBundleLintRule.inlang.identicalPattern",
      level: "error",
    },
  ],
  modules: [
    "https://cdn.jsdelivr.net/npm/@inlang/plugin-i18next@4/dist/index.js",
    "https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-empty-pattern@latest/dist/index.js",
    "https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-identical-pattern@latest/dist/index.js",
    "https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-missing-translation@latest/dist/index.js",
    "https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-without-source@latest/dist/index.js",
  ],
};

const mockInstalledLintRules = [
  {
    id: "messageBundleLintRule.inlang.missingMessage",
    displayName: "Missing Message",
    description: "Reports when a message is missing in a message bundle",
    module:
      "https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-missing-translation@latest/dist/index.js",
    level: "error",
  },
  {
    id: "messageBundleLintRule.inlang.missingReference",
    displayName: "Missing Reference",
    description:
      "Reports when a reference message is missing in a message bundle",
    module:
      "https://cdn.jsdelivr.net/npm/@inlang/message-lint-rule-missing-translation@latest/dist/index.js",
    level: "warning",
  },
];
