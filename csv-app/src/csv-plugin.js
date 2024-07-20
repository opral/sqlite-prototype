/**
 * @type {import('papaparse')}
 */
let papaparse;

/**
 * @type {import('lix-sdk').LixPlugin<{
 *  cell: {
 *    id: string
 *    text: string
 *  }
 * }>}
 */
const plugin = {
  key: "csv-plugin",
  glob: "*.csv",
  diff: {
    file: async ({ old, neu }) => {
      /** @type {import("lix-sdk").DiffReport[]} */
      const result = [];
      await maybeImportPapaparse();
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
};

async function maybeImportPapaparse() {
  if (!papaparse) {
    // @ts-expect-error - no types
    papaparse = (await import("http://localhost:5173/papaparse.js")).default;
  }
}

export default plugin;
