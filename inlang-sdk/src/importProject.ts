/**
 * Imports a project from a blob into OPFS.
 */
export async function importProjectIntoOPFS(args: {
  blob: Blob;
  path: string;
}) {
  const opfsRoot = await navigator.storage.getDirectory();
  // TODO file names based on UUID to avoid collisions
  const fileHandle = await opfsRoot.getFileHandle(args.path, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(args.blob);
  await writable.close();
}
