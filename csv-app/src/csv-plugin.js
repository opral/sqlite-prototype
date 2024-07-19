/**
 * @type {import('papaparse')}
 */
let papaparse;

/**
 * @type {import('lix-sdk').LixPlugin}
 */
export default {
  key: "csv-plugin",
  glob: "*.csv",
  onFileChange: async ({ old, neu }) => {
    /** @type any */
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
        if (row[column] !== oldRow[column]) {
          const change = {
            cellId: `${i}-${j}`,
            type: "update",
            value: row[column],
          };
          result.push(change);
        }
        j++;
      }
    }
    return result;
  },
};

async function maybeImportPapaparse() {
  if (!papaparse) {
    // @ts-expect-error - no types
    papaparse = (await import("http://localhost:5173/papaparse.js")).default;
  }
}
