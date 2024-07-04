export * from "./loadProject";
export * from "./importProject";
export { newProject } from "./newProject";
import { humanId } from "human-id";

export function generateBundleId() {
  return humanId({
    separator: "_",
    capitalize: false,
  });
}
