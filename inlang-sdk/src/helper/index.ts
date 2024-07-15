import { humanId } from "human-id";
import { v4 } from "uuid";

export function generateBundleId() {
  return humanId({
    separator: "_",
    capitalize: false,
    adjectiveCount: 3,
  });
}

export function generateUUID() {
  return v4();
}
