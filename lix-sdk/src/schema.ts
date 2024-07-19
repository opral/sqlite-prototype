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
  /**
   * The plugin key that contributed the change.
   *
   * Exists to ease querying for changes by plugin,
   * in case the user changes the plugin configuration.
   */
  plugin_key: LixPlugin["key"];
  /**
   * The type of change that was made.
   *
   * @example
   *   - "cell" for csv cell change
   *   - "message" for inlang message change
   *   - "user" for a user change
   */
  type: string;
  /**
   * The value of the change.
   *
   * @example
   *   - For a csv cell change, the value would be the new cell value.
   *   - For an inlang message change, the value would be the new message.
   */
  value: string; // JSONB
  /**
   * Additional metadata for the change used by the plugin
   * to process changes.
   */
  meta?: string; // JSONB
};
