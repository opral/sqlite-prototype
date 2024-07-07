import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { project } from "./state";
import { Task } from "@lit/task";
import { generateBundleId } from "inlang-sdk";

@customElement("project-view")
export class ProjectView extends LitElement {
  // manual rerender trigger until .subscribe() method exists
  @state()
  crudOperationExecuted = 0;

  @state()
  numBundlesToGenerate = 1;

  loadBundlesTask = new Task(this, {
    args: () => [this.crudOperationExecuted],
    task: async () => {
      // limit to 100 bundles in case some creates 100k bundles
      const bundles = await project.value?.bundle.select.limit(100).execute();
      return bundles;
    },
  });

  numBundles = new Task(this, {
    args: () => [this.crudOperationExecuted],
    task: async () => {
      const numBundles = await project.value!
        .sql`select count(*) as count from bundle`;
      console.log({ numBundles });
      return numBundles[0].count;
    },
  });

  async createBundles() {
    let bundles = [];
    for (let i = 0; i < this.numBundlesToGenerate; i++) {
      bundles.push({
        id: generateBundleId(),
        alias: "test",
      });
      // manual batching to avoid too many db operations
      if (bundles.length > 10000) {
        await project.value!.bundle.insert.values(bundles).execute();
        bundles = [];
      }
    }
    // insert remaining bundles
    if (bundles.length > 0) {
      await project.value!.bundle.insert.values(bundles).execute();
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
      </div>
      <h2>Bundles</h2>
      ${this.loadBundlesTask.render({
        pending: () => html`<p>Loading...</p>`,
        error: (error) => html`<p>Error: ${error}</p>`,
        complete: (bundles) => html`<ul>
          ${bundles && bundles.length > 0
            ? bundles.map(
                (bundle) => html`
                  <li>
                    <h3>${bundle.id}</h3>
                    <p>${bundle.messages.length} messages</p>
                  </li>
                `
              )
            : html`<li>No bundles found</li>`}
        </ul> `,
      })}
    `;
  }
}
