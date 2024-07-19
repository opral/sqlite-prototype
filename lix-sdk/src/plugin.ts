import type { LixFile } from "./schema";

// named lixplugin to avoid conflict with built-in plugin type
export type LixPlugin = {
  key: string;
  glob: string;
  onFileChange: (args: {
    old: LixFile["blob"];
    neu: LixFile["blob"];
  }) => Promise<Array<ChangeReport>>;
};

export type ChangeReport = {
  id: string;
  type: string;
  /**
   * Must be a valid JSON.
   */
  value: Record<string, any> | string;
  meta?: Record<string, any>;
};