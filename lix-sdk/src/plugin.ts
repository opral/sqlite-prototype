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
  diffComponent?: {
    file?: () => Promise<HTMLElement>;
  } & Record<
    // other primitives
    keyof T,
    () => Promise<HTMLElement> | undefined
  >;
  diff: {
    file?: (args: {
      old?: LixFile["blob"];
      neu: LixFile["blob"];
    }) => Promise<Array<DiffReport>>;
  } & Record<
    // other primitives
    keyof T,
    (args: { old?: T[keyof T]; neu: T[keyof T] }) => Promise<Array<DiffReport>>
  >;
};

/**
 * - diff reports do not contain html
 *   to separate frontend from backend.
 *   The frontend will render the diff reports
 *   (without slowing down the backend on each diff request).
 */
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
