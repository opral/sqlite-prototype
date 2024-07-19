import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { lix, openFile } from "./state";
import { poll } from "./reactivity";

@customElement("file-view")
export class FileView extends SignalWatcher(LitElement) {
  @state()
  files: any = [];

  connectedCallback() {
    super.connectedCallback();
    poll(
      async () => {
        const result = await lix.value?.db
          .selectFrom("file")
          .select(["id", "path"])
          .execute();
        return result ?? [];
      },
      (files) => (this.files = files)
    );
  }

  render() {
    return html`
      <h2>Files</h2>
      ${this.files.length === 0
        ? html`<p>No files</p>`
        : html`<ul>
            ${this.files.map(
              (file: any) =>
                html`<li
                  style="${openFile.value === file.path
                    ? "font-weight: 800"
                    : ""}"
                >
                  <div style="display: flex; justify-content: space-between;">
                    <p @click=${() => (openFile.value = file.path)}>
                      ${file.path}
                    </p>
                    <div style="display: flex; gap: 1rem">
                      <button
                        @click=${async () => {
                          const result = await lix.value?.db
                            .selectFrom("file")
                            .select("data")
                            .where("path", "=", file.path)
                            .executeTakeFirstOrThrow();
                          const blob = new Blob([result!.data]);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = file.path;
                          a.click();
                        }}
                      >
                        Download
                      </button>
                      <button
                        @click=${async () => {
                          await lix.value?.db
                            .deleteFrom("file")
                            .where("path", "=", file.path)
                            .execute();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>`
            )}
          </ul>`}
    `;
  }
}
