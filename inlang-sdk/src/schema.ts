import { Generated } from "kysely";
import { Pattern } from "./pattern";

export type Database = {
  bundle: Bundle;
  message: Message;
  variant: Variant;
  settings: Settings;
};

export type Bundle = {
  id: string;
  // todo make alias relational
  alias: string;
  // messages[] @relation
};

export type Message = {
  id: string;
  // @relation to Bundle
  bundleId: Bundle["id"];
  locale: string;
  declarations: string;
  selectors: string;
  // variants[] @relation
};

export type Variant = {
  id: string;
  // @relation to Message
  messageId: Message["id"];
  match: string;
  pattern: Pattern;
};

export type Settings = {
  baseLocale: string;
  locales: string;
  modules: string;
};
