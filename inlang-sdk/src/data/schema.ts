import { JSONColumnType } from "kysely";


export type Database = {
  bundle: Bundle;
  message: Message;
  variant: Variant;
  // todo - move out of database
  settings: Settings;
};

// Bundles all languages of a message -
export type Bundle = {
  id: string;
  // todo make alias relational
  alias: JSONColumnType<Record<string, string>>; // alias usually have a property "default"  that represents the message name like "welcome_message" or "login_button"
  // messages[] @relation
  // messages: Message[]
};

export type Message = {
  id: string;
  // @relation to Bundle
  bundleId: Bundle["id"];
  locale: string;
  declarations: JSONColumnType<Declaration[]>; // JSON
  selectors: JSONColumnType<Expression[]>; // JSON
  // variants: Variant[]
};

export type Variant = {
  id: string;
  // @relation to Message
  messageId: Message["id"];
  match: string[];
  pattern: Pattern; // JSON
};

export type Pattern = Array<Text | Expression>;

export type Text = {
  type: "text";
  value: string;
};

export type VariableReference = {
  type: 'variable'
  name: string
}

export type Literal = {
  type: 'literal'
  name: string
}

export type Declaration = InputDeclaration

export type InputDeclaration = {
  type: "input",
  name: string,
  value: Expression,
} 

export type Expression = {
  type: "expression";
  arg: VariableReference | Literal,
};

export type Settings = {
  baseLocale: string;
  locales: string;
  modules: string;
};
