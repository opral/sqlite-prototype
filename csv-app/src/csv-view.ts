import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { lix, openFile } from "./state";
import { Task } from "@lit/task";
import Papa from "papaparse";
import { classMap } from "lit/directives/class-map.js";
import { repeat } from "lit/directives/repeat.js";
import { poll } from "./reactivity";
import { Change, UncommittedChange, Commit } from "../../lix-sdk/src/schema";
import { BaseElement } from "./baseElement";
import { jsonObjectFrom } from "lix-sdk";

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

    const el = customElements.get("lix-diff-csv-cell");
    openFile.subscribe(() => this.parseCsvTask.run());

    poll(
      async () => {
        if (this.fileId === undefined) {
          return undefined;
        }
        const uncommittedChanges = await lix.value?.db
          .selectFrom("uncommitted_change")
          .selectAll()
          .where("file_id", "=", this.fileId)
          .execute();

        const changes = await lix.value?.db
          .selectFrom("change")
          .selectAll()
          .select((eb) =>
            jsonObjectFrom(
              eb
                .selectFrom("commit")
                .select([
                  "commit.id",
                  "commit.zoned_date_time",
                  "commit.user_id",
                  "commit.description",
                ])
                .whereRef("commit.id", "=", "change.commit_id")
            ).as("commit")
          )
          .where("file_id", "=", this.fileId)
          .innerJoin("commit", "commit.id", "change.commit_id")
          .orderBy("commit.zoned_date_time", "desc")
          .execute();
        return { uncommittedChanges, changes };
      },
      (value) => {
        if (value) {
          this.uncommittedChanges = value.uncommittedChanges ?? [];
          // @ts-expect-error - commit can be undefined
          this.changes = value.changes ?? [];
        }
      }
    );
  }

  @state()
  uncommittedChanges: UncommittedChange[] = [];

  @state()
  changes: (Change & { commit: Commit })[] = [];

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
                        const uncommittedChanges =
                          this.uncommittedChanges.filter(
                            (change) => change.value.id === cellId
                          );
                        const hasUncommittedChanges =
                          uncommittedChanges.length > 0;

                        const changes = this.changes.filter(
                          (change) => change.value.id === cellId
                        );
                        const hasChanges = changes.length > 0;

                        return html`<td class="p-2">
                          <div class="flex">
                            <input
                              class=${classMap({
                                "border-2": hasUncommittedChanges,
                                "border-orange-500": hasUncommittedChanges,
                              })}
                              value=${row[field]}
                              @input=${(event: any) => {
                                // @ts-ignore
                                csv.data[csv.data.indexOf(row)][field] =
                                  event.target.value;
                                // manually saving file to lix
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
                                  : html`<div class="divide-y space-y-3">
                                      ${changes.map((change, index) => {
                                        const now = new Date();
                                        const changeDate = new Date(
                                          change.commit.zoned_date_time
                                        );
                                        const diff =
                                          now.getTime() - changeDate.getTime();

                                        const minutesAgo = Math.floor(
                                          diff / 1000 / 60
                                        );
                                        // reversed order. the newest change is at
                                        // the top for the UI.
                                        const old = changes[index + 1]?.value;
                                        const neu = change.value;
                                        console.log({
                                          id: change.value.id,
                                          index,
                                          old,
                                          neu,
                                        });
                                        return html`
                                          <!-- TODO -->
                                          <div class="space-y-2 pb-3">
                                            <lix-diff-csv-cell
                                              .old=${old}
                                              .neu=${neu}
                                              .show="neu"
                                            >
                                            </lix-diff-csv-cell>
                                            <div class="p-0"></div>
                                            <div class="text-sm italic">
                                              by ${change.commit.user_id}
                                              ${minutesAgo} minutes ago
                                            </div>
                                            <button
                                              @click=${() => {
                                                // @ts-ignore
                                                csv.data[csv.data.indexOf(row)][
                                                  field
                                                ] = change.value.text;
                                                // manually saving file to lix
                                                lix.value?.db
                                                  .updateTable("file")
                                                  .set({
                                                    blob: new TextEncoder().encode(
                                                      Papa.unparse(csv.data)
                                                    ),
                                                  })
                                                  .where(
                                                    "path",
                                                    "=",
                                                    openFile.value!
                                                  )
                                                  .execute();
                                              }}
                                            >
                                              Rollback
                                            </button>
                                          </div>
                                        `;
                                      })}
                                    </div>`}
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
