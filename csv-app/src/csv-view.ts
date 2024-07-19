import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
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
        .select("data")
        .where("path", "=", openFile.value!)
        .executeTakeFirstOrThrow();
      const decoder = new TextDecoder();
      const str = decoder.decode(result!.data);
      return Papa.parse(str, { header: true });
    },
  });

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
                  (row) => html`
                    <tr>
                      ${csv.meta.fields!.map(
                        (field) =>
                          html`<td style="padding: 1rem">
                            <input
                              value=${row[field]}
                              @input=${(event) => {
                                csv.data[csv.data.indexOf(row)][field] =
                                  event.target.value;
                                lix.value?.db
                                  .updateTable("file")
                                  .set({
                                    data: new TextEncoder().encode(
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
