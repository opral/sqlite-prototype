import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { lix, openFile } from "./state";
import { Task } from "@lit/task";
import Papa from "papaparse";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { poll } from "./reactivity";
import { Change } from "../../lix-sdk/src/schema";
import { BaseElement } from "./baseElement";

@customElement("csv-view")
export class CsvView extends BaseElement {
  parseCsvTask = new Task(this, {
    args: () => [],
    task: async () => {
      const result = await lix.value?.db
        .selectFrom("file")
        .select(["id", "blob"])
        .where("path", "=", openFile.value!)
        .executeTakeFirstOrThrow();
      this.fileId = result!.id;
      const decoder = new TextDecoder();
      const str = decoder.decode(result!.blob);
      return Papa.parse(str, { header: true });
    },
  });

  // ugly workaround to get the task to re-run once
  // another file has been selected
  connectedCallback(): void {
    super.connectedCallback();
    openFile.subscribe(() => this.parseCsvTask.run());

    poll(
      async () => {
        if (this.fileId === undefined) {
          return [];
        }
        return (
          (await lix.value?.db
            .selectFrom("change")
            .selectAll()
            .where("file_id", "=", this.fileId)
            .execute()) ?? []
        );
      },
      (value) => (this.changes = value)
    );
  }

  @state()
  changes: Change[] = [];

  @state()
  fileId?: string = undefined;

  render() {
    return html`
      ${this.parseCsvTask.render({
        loading: () => html`<p>Loading...</p>`,
        error: (error) => html`<p>Error: ${error}</p>`,
        complete: (csv) => {
          return html`
            <table>
              <thead>
                <tr>
                  ${csv.meta.fields!.map((field) => html`<th>${field}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${repeat(
                  csv.data,
                  (row) => row,
                  (row: any, rowIndex) => html`
                    <tr>
                      ${csv.meta.fields!.map((field, columnIndex) => {
                        const cellId = `${rowIndex}-${columnIndex}`;
                        const changes = this.changes.filter(
                          (change) => change.id === cellId
                        );
                        const hasChanges = changes.length > 0;
                        return html`<td class="p-2">
                          <div class="flex">
                            <input
                              class=${classMap({
                                "border-2": hasChanges,
                                "border-green-500": hasChanges,
                              })}
                              value=${row[field]}
                              @input=${(event: any) => {
                                // @ts-ignore
                                csv.data[csv.data.indexOf(row)][field] =
                                  event.target.value;
                                lix.value?.db
                                  .updateTable("file")
                                  .set({
                                    blob: new TextEncoder().encode(
                                      Papa.unparse(csv.data)
                                    ),
                                  })
                                  .where("path", "=", openFile.value!)
                                  .execute();
                              }}
                            />
                            <sl-dropdown>
                              <sl-button
                                size="sm"
                                caret
                                slot="trigger"
                              ></sl-button>
                              <div class="bg-white p-4">
                                ${hasChanges === false
                                  ? html`<p>No change history</p>`
                                  : changes.map((change) => {
                                      return html`<p>${change.value}</p>`;
                                    })}
                              </div>
                            </sl-dropdown>
                          </div>
                        </td>`;
                      })}
                    </tr>
                  `
                )}
              </tbody>
            </table>
          `;
        },
      })}
    `;
  }
}
