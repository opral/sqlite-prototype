/**
 * @type {import('papaparse').Parser}
 */
let papaparse;

/**
 * @type {import('lix-sdk').LixPlugin}
 */
export default {
  key: "csv-plugin",
  glob: "*.csv",
  onFileChange: async ({ id, old, neu }) => {
    await maybeImportPapaparse();
    const oldString = new TextDecoder().decode(old);
    const neuString = new TextDecoder().decode(neu);

    return [
      {
        cellId: "0-1",
        type: "update",
        value: "83",
      },
    ];
  },
};

async function maybeImportPapaparse() {
  if (!papaparse) {
    // @ts-expect-error - no types
    papaparse = await import("http://localhost:5173/papaparse.js");
    console.log(papaparse);
  }
}
