import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { lix, openFile } from "./state";
import { poll } from "./reactivity";
import { BaseElement } from "./baseElement";

@customElement("file-view")
export class FileView extends BaseElement {
  @state()
  files: any = [];

  connectedCallback() {
    super.connectedCallback();
    poll(
      async () => {
        const result: any = await lix.value?.db
          .selectFrom("file")
          .select(["id", "path"])
          .execute();

        if (result && result.length > 0) {
          for (const file of result) {
            const changes = await lix.value?.db
              .selectFrom("uncommitted_change")
              .select("id")
              .where("file_id", "=", file.id)
              .execute();
            file.hasUncommittedChanges = changes!.length > 0 ? true : false;
          }
        }

        return result ?? [];
      },
      (files) => {
        this.files = files;
      }
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
                    <div class="flex items-center gap-2">
                      <p @click=${() => (openFile.value = file.path)}>
                        ${file.path}
                      </p>
                      ${file.hasUncommittedChanges
                        ? html`
                            <div
                              class="w-2 h-2 bg-orange-500 rounded-3xl"
                            ></div>
                            <p class="text-orange-500 text-sm">
                              uncommitted changes
                            </p>
                          `
                        : nothing}
                    </div>

                    <div style="display: flex; gap: 1rem">
                      <button
                        @click=${async () => {
                          const result = await lix.value?.db
                            .selectFrom("file")
                            .select("blob")
                            .where("path", "=", file.path)
                            .executeTakeFirstOrThrow();
                          const blob = new Blob([result!.blob]);
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
