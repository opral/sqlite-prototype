import { signal } from "@lit-labs/preact-signals";
import { loadProject } from "inlang-sdk";

export const project = signal<
  Awaited<ReturnType<typeof loadProject>> | undefined
>(undefined);
