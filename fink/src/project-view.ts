import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { project } from "./state";
import { Task } from "@lit/task";
import { generateBundleId, generateUUID } from "inlang-sdk";
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

  // TODO move logic to inlang-sdk (query engine)
  async createBundles() {
    let bundles = [];
    let messages = [];
    let variants = [];
    for (let i = 0; i < this.numBundlesToGenerate; i++) {
      // TODO move id generation to inlang-sdk
      const mock = mockBundle();
      bundles.push(mock.bundle);
      messages.push(...mock.messages);
      variants.push(...mock.variants);
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

const mockBundle = () => {
  const bundleId = generateBundleId();
  const messageDeId = generateUUID();
  const messageEnId = generateUUID();
  return {
    bundle: {
      id: bundleId,
      alias: JSON.stringify({
        default: "mock_bundle_alias",
      }),
    },
    messages: [
      {
        id: messageDeId,
        bundleId,
        locale: "de",
        declarations: JSON.stringify([
          {
            type: "input",
            name: "numProducts",
            value: {
              type: "expression",
              arg: {
                type: "variable",
                name: "numProducts",
              },
            },
          },
          {
            type: "input",
            name: "count",
            value: {
              type: "expression",
              arg: {
                type: "variable",
                name: "count",
              },
            },
          },
          {
            type: "input",
            name: "projectCount",
            value: {
              type: "expression",
              arg: {
                type: "variable",
                name: "projectCount",
              },
            },
          },
        ]),
        selectors: JSON.stringify([
          {
            type: "expression",
            arg: {
              type: "variable",
              name: "numProducts",
            },
            annotation: {
              type: "function",
              name: "plural",
              options: [],
            },
          },
        ]),
      },

      // ---- EN message ----
      {
        id: messageEnId,
        locale: "en",
        bundleId,
        declarations: JSON.stringify([
          {
            type: "input",
            name: "numProducts",
            value: {
              type: "expression",
              arg: {
                type: "variable",
                name: "numProducts",
              },
            },
          },
        ]),
        selectors: JSON.stringify([
          {
            type: "expression",
            arg: {
              type: "variable",
              name: "numProducts",
            },
            annotation: {
              type: "function",
              name: "plural",
              options: [],
            },
          },
        ]),
      },
    ],
    variants: [
      // ---- DE message -----
      {
        id: generateUUID(),
        messageId: messageDeId,
        match: JSON.stringify(["zero"]),
        pattern: JSON.stringify([
          {
            type: "text",
            value: "Keine Produkte",
          },
        ]),
      },
      {
        id: generateUUID(),
        messageId: messageDeId,
        match: JSON.stringify(["one"]),
        pattern: JSON.stringify([
          {
            type: "text",
            value: "Ein Produkt",
          },
        ]),
      },
      {
        id: generateUUID(),
        messageId: messageDeId,
        match: JSON.stringify(["other"]),
        pattern: JSON.stringify([
          {
            type: "expression",
            arg: {
              type: "variable",
              name: "numProducts",
            },
          },
          {
            type: "text",
            value: " Produkte",
          },
        ]),
      },
      // ---- EN variants -----
      {
        id: generateUUID(),
        messageId: messageEnId,
        match: JSON.stringify(["zero"]),
        pattern: JSON.stringify([
          {
            type: "text",
            value: "No Products",
          },
        ]),
      },
      {
        id: generateUUID(),
        messageId: messageEnId,
        match: JSON.stringify(["one"]),
        pattern: JSON.stringify([
          {
            type: "text",
            value: "A product",
          },
        ]),
      },
      {
        id: generateUUID(),
        messageId: messageEnId,
        match: JSON.stringify(["other"]),
        pattern: JSON.stringify([
          {
            type: "expression",
            arg: {
              type: "variable",
              name: "numProducts",
            },
          },
          {
            type: "text",
            value: " products",
          },
        ]),
      },
    ],
  };
};

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
