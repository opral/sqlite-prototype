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

  merge: {
    file: async ({ current, incoming, conflicts, changes, fileId }) => {
      if (!papaparse) {
        // @ts-expect-error - no types
        papaparse = (await import("http://localhost:5173/papaparse.js"))
          .default;
      }

      const currentParsed = current
        ? papaparse.parse(new TextDecoder().decode(current), {
            header: true,
          })
        : undefined;

      if (currentParsed === undefined) {
        throw new Error('cannot parse file for merging ')
      }

      const resolved = []
      const unresolved = []
      for (const conflict of conflicts) {        
        const res = await plugin.merge.cell(conflict)
        
        res.resolved && resolved.push([ res.resolved ])
        res.isUnresolved && unresolved.push(conflict) 
      }

      for (const change of [...changes, ...resolved]) {
        const latestChange = change[0] // only using latest change for simple merging
        const [rowId, columnName] = latestChange.value.id.split('-')

        // TODO: handle insert/ delete row
        const existingRow = currentParsed.data.find(row => row.id === rowId)
        existingRow[columnName] = latestChange.value.text
      }

      const resultBlob = new TextEncoder().encode(
        // @ts-expect-error
        papaparse.unparse(currentParsed)
      )

      return { result: resultBlob, unresolved }
    },

    cell: async ({ current, incoming }) => {
      // const oldValue = await old.history.select("value").where("cell_id", "=", "0-2").where("id", "=", current.parent_id)

      // always fail resolving column "v" for testing conflicts
      if (current[0].value.id.endsWith('-v')) {
        // TODO: execute diff to preresolve conflicts that have the same value
        // await plugin.diff.cell(a, b)
        return { isUnresolved: true }
      }

      let chosen
      // choose latest edit
      if (current[0].zoned_date_time > incoming[0].zoned_date_time) {
        chosen = current[0]
      } else {
        chosen =incoming[0]
      }

      return { resolved: chosen }
    }
  },

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

      const oldParsed = old
        ? papaparse.parse(new TextDecoder().decode(old), {
            header: true,
          })
        : undefined;

      const newParsed = papaparse.parse(new TextDecoder().decode(neu), {
        header: true,
      });

      for (const [i, row] of newParsed.data.entries()) {
        const oldRow = oldParsed?.data[i]
        for (const column in row) {
          const id = `${row.id}-${column}`
          const diff = await plugin.diff.cell({
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
          })
          if (diff.length > 0) {
            result.push(...diff);
          }
        }
      }
      return result;
    },

    cell: async ({ old, neu }) => {
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
    // TODO replace async init by bundling static imports
    // @ts-expect-error
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
}

export default plugin

