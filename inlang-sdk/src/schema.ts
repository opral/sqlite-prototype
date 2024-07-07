import { Pattern } from "./pattern";

export type Database = {
  bundle: Bundle;
  message: Message;
  variant: Variant;
  // todo - move out of database
  settings: Settings;
};

export type Bundle = {
  id: string;
  // todo make alias relational
  alias: string; // JSON
  // messages[] @relation
};

export type Message = {
  id: string;
  // @relation to Bundle
  bundleId: Bundle["id"];
  locale: string;
  declarations: string; // JSON
  selectors: string; // JSON
  // variants[] @relation
};

export type Variant = {
  id: string;
  // @relation to Message
  messageId: Message["id"];
  match: string;
  pattern: Pattern; // JSON
};

export type Settings = {
  baseLocale: string;
  locales: string;
  modules: string;
};
