import type { LixFile } from "./schema";

// named lixplugin to avoid conflict with built-in plugin type
export type LixPlugin<
  T extends Record<
    string,
    // id is required for all values
    Record<string, unknown> & {
      id: string;
    }
  > = {}
> = {
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
  diff: {
    file?: (args: {
      old: LixFile["blob"];
      neu: LixFile["blob"];
    }) => Promise<Array<DiffReport>>;
  } & Record<
    // other primitives
    keyof T,
    (args: { old: T[keyof T]; neu: T[keyof T] }) => Promise<Array<DiffReport>>
  >;
};

export type DiffReport = {
  type: string;
  /**
   * Must be a valid JSON.
   */
  value: Record<string, any> & {
    id: string;
  };
  meta?: Record<string, any>;
};
