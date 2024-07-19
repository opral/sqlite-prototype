export type Database = {
  file: File;
};

export type File = {
  id: string;
  path: string;
  blob: ArrayBuffer;
};
