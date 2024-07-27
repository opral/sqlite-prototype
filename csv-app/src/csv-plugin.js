/** @type {import('papaparse')} */
let papaparse;

/** @type {import('lit')} */
let lit;

/**
 * @typedef {{ id: string, text: string }} Cell
 */

/**
 * @type {import('lix-sdk').LixPlugin<{
 *  cell: Cell
 * }>}
 */
const plugin = {
  key: "csv",
  glob: "*.csv",

  /**
   * Getting around bundling for the prototype.
   */
  setup: async () => {
    lit = await import(
      // @ts-expect-error - no types
      "http://localhost:5173/lit-all.js"
    );
    // @ts-expect-error - no types
    papaparse = (await import("http://localhost:5173/papaparse.js")).default;
  },
  diff: {
    file: ({ old, neu }) => {
      /** @type {import("lix-sdk").DiffReport[]} */
      const result = [];
      const oldParsed = old
        ? papaparse.parse(new TextDecoder().decode(old), {
            header: true,
          })
        : undefined;
      const neuParsed = papaparse.parse(new TextDecoder().decode(neu), {
        header: true,
      });

      for (const [i, row] of neuParsed.data.entries()) {
        const oldRow = oldParsed?.data[i];
        let j = 0;
        for (const column in row) {
          const id = `${i}-${j}`;
          const diff = plugin.diff.cell({
            old: oldRow
              ? {
                  id,
                  text: oldRow[column],
                }
              : undefined,
            neu: {
              id,
              text: row[column],
            },
          });
          if (diff.length > 0) {
            result.push(...diff);
          }
          j++;
        }
      }
      return result;
    },
    cell: ({ old, neu }) => {
      if (old?.text === neu.text) {
        return [];
      } else {
        return [
          {
            type: "cell",
            value: {
              id: neu.id,
              text: neu.text,
            },
          },
        ];
      }
    },
  },
  diffComponent: {
    // @ts-expect-error - can't detect that lit elment is a htmlelement
    file: () =>
      class extends lit.LitElement {
        static properties = {
          old: {},
          neu: {},
        };
        old;
        neu;

        static styles = lit.css`
          th, td {
            padding: 0.8rem;
          }
        `;

        connectedCallback() {
          super.connectedCallback();
          if (this.old) {
            this.oldParsed = papaparse.parse(
              new TextDecoder().decode(this.old),
              {
                header: true,
              }
            );
          }
          this.neuParsed = papaparse.parse(new TextDecoder().decode(this.neu), {
            header: true,
          });
        }

        render() {
          return lit.html`
          <table>
            <thead>
              <tr>
                ${this.neuParsed?.meta?.fields?.map((field, index) => {
                  const oldText = this.oldParsed?.meta?.fields?.[index];
                  return lit.html`<th>
                      <lix-plugin-csv-diff-cell
                        .old=${oldText ? { text: oldText } : undefined}
                        .neu=${{ text: field }}
                      >
                      </lix-plugin-csv-diff-cell>
                    </th>`;
                })}
              </tr>
            </thead>
            <tbody>
              ${this.neuParsed?.data.map((row, i) => {
                const oldRow = Object.values(this.oldParsed?.data?.[i]);
                return lit.html`<tr>
                  ${Object.values(row).map((cell, j) => {
                    const oldText = oldRow?.[j];
                    const id = `${i}-${j}`;
                    return lit.html`<td>
                      <lix-plugin-csv-diff-cell
                        .old=${oldText ? { id, text: oldText } : undefined}
                        .neu=${{ id, text: cell }}
                      >
                      </lix-plugin-csv-diff-cell>                      
                    </td>`;
                  })}
                </tr>`;
              })}
            </tbody>

          </table>`;
        }
      },
    cell: () =>
      // @ts-expect-error - can't detect that lit elment is a htmlelement
      class extends lit.LitElement {
        static properties = {
          old: { type: Object },
          neu: { type: Object },
        };

        old;
        neu;

        // TODO lix css variables for colors
        addedColor = "green";
        removedColor = "red";

        render() {
          // no comparison possible -> render text
          if (this.old === undefined || this.neu === undefined) {
            return lit.html`<span>${this.old?.text ?? this.neu?.text}</span>`;
          }
          // same text
          else if (
            plugin.diff.cell({ old: this.old, neu: this.neu }).length === 0
          ) {
            return lit.html`<span>${this.neu.text}</span>`;
          }

          return lit.html`<span style="color: ${this.removedColor}">${this.old.text}</span> <span>|</span> <span style="color: ${this.addedColor}">${this.neu.text}</span>`;
        }
      },
  },
};

export default plugin;
