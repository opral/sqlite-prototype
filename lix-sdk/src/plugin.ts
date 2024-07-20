import type { LixFile } from "./schema";

// named lixplugin to avoid conflict with built-in plugin type
export type LixPlugin = {
  key: string;
  glob: string;
  diff?: {
    // TODO
    cell: () => Promise<any>;
  };
  onFileChange: (args: {
    old: LixFile["blob"];
    neu: LixFile["blob"];
  }) => Promise<Array<ChangeReport>>;
};

export type ChangeReport = {
  typeId: string;
  type: string;
  /**
   * Must be a valid JSON.
   */
  data: Record<string, any>;
  meta?: Record<string, any>;
};
