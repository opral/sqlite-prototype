export type Database = {
  file: File;
};

export type File = {
  id: string;
  path: string;
  data: Blob;
};
