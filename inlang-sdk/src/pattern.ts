export type Pattern = Array<Text | Expression>;

export type Text = {
  type: "text";
  value: string;
};

export type Expression = {
  type: "expression";
};
