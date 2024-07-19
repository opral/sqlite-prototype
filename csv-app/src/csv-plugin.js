/**
 * @type {import('lix-sdk').Plugin}
 */
export default {
  name: "csv-plugin",
  glob: "*.csv",
  onFileChange: (file) => {
    console.log(`File ${file.path} has changed`);
  },
};
