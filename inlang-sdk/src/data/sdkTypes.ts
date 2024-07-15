import { Bundle, Declaration, Expression, Message, Pattern, Variant } from "../data/schema";

export type SDKMessage = Message & {
    variants: Variant[]
}

export type SDKBundle = Bundle & {
    messages: SDKMessage[];
}; 
