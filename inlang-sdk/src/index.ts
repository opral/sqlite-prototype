export * from "./loadProject";
export * from "./importProject";
export { newProject } from "./newProject";
import { humanId } from "human-id";
export { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/sqlite";

export function generateBundleId() {
  return humanId({
    separator: "_",
  });
}
