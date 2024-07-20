import type { LixFile } from "./schema";

// named lixplugin to avoid conflict with built-in plugin type
export type LixPlugin<T extends Record<string, Record<string, unknown>> = {}> =
  {
    key: string;
    glob: string;
    renderDiff?: {
      file?: (args: {
        old: LixFile["blob"];
        neu: LixFile["blob"];
      }) => Promise<any>;
    } & Record<
      // other primitives
      keyof T,
      ((args: { old: T[keyof T]; neu: T[keyof T] }) => Promise<any>) | undefined
    >;
    diff?: {
      file?: (args: {
        old: LixFile["blob"];
        neu: LixFile["blob"];
      }) => Promise<Array<DiffReport>>;
    } & Record<
      // other primitives
      keyof T,
      | ((args: {
          old: T[keyof T];
          neu: T[keyof T];
        }) => Promise<Array<DiffReport>>)
      | undefined
    >;
  };

export type DiffReport = {
  typeId: string;
  type: string;
  /**
   * Must be a valid JSON.
   */
  data: Record<string, any>;
  meta?: Record<string, any>;
};
