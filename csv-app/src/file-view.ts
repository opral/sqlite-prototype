import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { lix, openFile } from "./state";
import { poll } from "./reactivity";

@customElement("file-view")
export class FileView extends SignalWatcher(LitElement) {
  @state()
  files: any = true;

  connectedCallback() {
    poll(
      async () => {
        const result = await lix.value?.db
          .selectFrom("file")
          .select(["id", "path"])
          .execute();
        console.log({ result });
        return result ?? [];
      },
      (files) => {
        console.log("callback", { files });
        this.files = ["Sss"];
        this.requestUpdate();
      }
    );
  }

  render() {
    return html`
      <h2>Files</h2>
      <p>${this.files}</p>
      <p>${this.files.length === 0 ? "No files" : ""}</p>
    `;
  }
}
