import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { project } from "./state";
import { Task } from "@lit/task";
import { generateBundleId } from "inlang-sdk";

@customElement("project-view")
export class ProjectView extends LitElement {
  // manual rerender trigger until .subscribe() method exists
  @state()
  triggerRerender = 0;

  loadBundlesTask = new Task(this, {
    args: () => [this.triggerRerender],
    task: async () => {
      const bundles = await project.value?.bundle.select.execute();
      console.log(bundles);
      return bundles;
    },
  });

  render() {
    return html`
      <button
        @click=${async () => {
          await project.value?.db
            .insertInto("bundle")
            .values({
              id: generateBundleId(),
              alias: "test",
            })
            .execute();
          this.triggerRerender++;
        }}
      >
        Create a bundle
      </button>

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
