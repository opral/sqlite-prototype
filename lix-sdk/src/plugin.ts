import type { LixFile } from "./schema";

// named lixplugin to avoid conflict with built-in plugin type
export type LixPlugin = {
  key: string;
  glob: string;
  onFileChange: (args: {
    id: LixFile["id"];
    old: LixFile["blob"];
    neu: LixFile["blob"];
  }) => Promise<Array<Record<string, any>>>;
};
