import { signal } from "@lit-labs/preact-signals";
import { openLixFromOPFS } from "../../lix-sdk/src/openLixFile";

export const lix = signal<
  Awaited<ReturnType<typeof openLixFromOPFS>> | undefined
>(undefined);

export const openFile = signal<string | undefined>(undefined);
