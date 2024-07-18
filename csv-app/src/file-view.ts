import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { lix, openFile } from "./state";
import { Task } from "@lit/task";

@customElement("file-view")
export class FileView extends SignalWatcher(LitElement) {
  loadFileTreeTask = new Task(this, {
    args: () => [],
    task: async () => {
      const result = await lix.value?.db
        .selectFrom("file")
        .select(["id", "path"])
        .execute();
      return result ?? [];
    },
  });

  render() {
    return html`
      <h2>Files</h2>
      ${this.loadFileTreeTask.render({
        loading: () => html`<p>Loading...</p>`,
        error: (error) => html`<p>Error: ${error}</p>`,
        complete: (files) =>
          files.length === 0
            ? html`<p>No files</p>`
            : html`<ul>
                ${files.map(
                  (file) =>
                    html`<li>
                      <a
                        style="${openFile.value === file.path
                          ? "font-weight: 800"
                          : ""}"
                        @click=${() => (openFile.value = file.path)}
                      >
                        ${file.path}</a
                      >
                    </li>`
                )}
              </ul>`,
      })}
    `;
  }
}
