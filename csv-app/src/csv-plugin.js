/**
 * Getting around bundling for the prototype.
 *
 * @type {import('papaparse')}
 */
let papaparse;

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
  diff: {
    file: async ({ old, neu }) => {
      /** @type {import("lix-sdk").DiffReport[]} */
      const result = [];
      // top level import doesn't work
      if (!papaparse) {
        // @ts-expect-error - no types
        papaparse = (await import("http://localhost:5173/papaparse.js"))
          .default;
      }
      const oldParsed = papaparse.parse(new TextDecoder().decode(old), {
        header: true,
      });
      const newParsed = papaparse.parse(new TextDecoder().decode(neu), {
        header: true,
      });

      for (const [i, row] of newParsed.data.entries()) {
        const oldRow = oldParsed.data[i];
        if (!oldRow) {
          continue;
        }
        let j = 0;
        for (const column in row) {
          const id = `${i}-${j}`;
          const diff = await plugin.diff.cell({
            old: {
              id,
              text: oldRow[column],
            },
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
    cell: async ({ old, neu }) => {
      if (old.text === neu.text) {
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
    // TODO replace async init by bundling static imports
    // @ts-expect-error - can't detect that lit elment is a htmlelement
    cell: async () => {
      /**
       * @type {import("lit")}
       */
      const lit = await import(
        // @ts-expect-error - no types
        "http://localhost:5173/lit-all.js"
      );

      const { diffWords } = await import(
        // @ts-expect-error - no types
        "http://localhost:5173/diff.js"
      );

      return class extends lit.LitElement {
        static properties = {
          old: { type: Object },
          neu: { type: Object },
          show: { type: String },
        };

        old;
        neu;
        show;

        // TODO lix css variables for colors
        addedColor = "green";
        removedColor = "red";

        render() {
          console.log("rerender");
          if (this.old === undefined || this.neu === undefined) {
            return lit.html`<span>${this.old?.text ?? this.neu?.text}</span>`;
          }

          const diff = diffWords(this.old.text, this.neu.text);

          return lit.html`
              <span>
                ${diff.map((part) => {
                  if (this.show === "neu" && part.removed) {
                    return lit.nothing;
                  } else if (this.show === "old" && part.added) {
                    return lit.nothing;
                  }
                  const color = part.added
                    ? this.addedColor
                    : part.removed
                    ? this.removedColor
                    : "black";
                  return lit.html`
                    <span style="color: ${color}">${part.value}</span>
                  `;
                })}
              </span>
            `;
        }
      };
    },
  },
};

export default plugin;
