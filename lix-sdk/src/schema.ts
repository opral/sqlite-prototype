import { LixPlugin } from "./plugin";

export type Database = {
  file: LixFile;
  change: Change;
};

// named lix file to avoid conflict with built-in file type
export type LixFile = {
  id: string;
  path: string;
  blob: ArrayBuffer;
};

export type Change = {
  id: string;
  file_id: LixFile["id"];
  plugin_key: LixPlugin["key"];
  data: string; // JSONB
};
