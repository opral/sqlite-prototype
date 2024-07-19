import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SignalWatcher, watch } from "@lit-labs/preact-signals";
import { lix, openFile } from "./state";
import { Task } from "@lit/task";
import Papa from "papaparse";
import { repeat } from "lit/directives/repeat.js";

@customElement("csv-view")
export class FileView extends SignalWatcher(LitElement) {
  parseCsvTask = new Task(this, {
    args: () => [],
    task: async () => {
      const result = await lix.value?.db
        .selectFrom("file")
        .select("blob")
        .where("path", "=", openFile.value!)
        .executeTakeFirstOrThrow();
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
  }

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
                  (row: any) => html`
                    <tr>
                      ${csv.meta.fields!.map(
                        (field) =>
                          html`<td style="padding: 1rem">
                            <input
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
                          </td>`
                      )}
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
