import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { SignalWatcher } from "@lit-labs/preact-signals";

@customElement("csv-app")
export class App extends SignalWatcher(LitElement) {
  render() {
    return html`
      <h1>Welcome to fink 2.0!</h1>
      <div style="display: flex; gap: 2rem;">
        <create-project></create-project>
        <file-importer></file-importer>
        <file-exporter></file-exporter>
      </div>
      <hr style="margin-top: 1rem;" />
    `;
  }
}

@customElement("file-importer")
export class InlangFileImport extends LitElement {
  async handleFileSelection(event: any) {}

  inputRef: Ref<HTMLInputElement> = createRef();

  render() {
    return html`
      <div>
        <input
          ${ref(this.inputRef)}
          style="display: none;"
          type="file"
          id="selected-file"
          name="hello"
          @change=${this.handleFileSelection}
        />
        <button @click=${() => this.inputRef.value?.click()}>
          Import file
        </button>
      </div>
    `;
  }
}

@customElement("file-exporter")
export class InlangFileExport extends LitElement {
  async handleFileSelection(event: any) {}

  render() {
    return html`
      <div>
        <button>Export file</button>
      </div>
    `;
  }
}

@customElement("create-project")
export class CreateProject extends LitElement {
  async handleCreateProject() {}

  render() {
    return html`
      <button @click=${this.handleCreateProject}>
        Create and load new project
      </button>
    `;
  }
}
