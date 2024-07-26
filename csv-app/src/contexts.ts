import { createContext } from "@lit/context";
import { openLixFromOPFS } from "../../lix-sdk/src/openLixFile";

export const lixContext = createContext<
  Awaited<ReturnType<typeof openLixFromOPFS>> | undefined
>("lix");

export const openFileContext = createContext<string | undefined>("openfile");
