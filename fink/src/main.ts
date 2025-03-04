import { LitElement, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { loadProject, newProject } from "inlang-sdk";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { project } from "./state";
import { SignalWatcher } from "@lit-labs/preact-signals";
import "./project-view";

@customElement("fink-app")
export class FinkApp extends SignalWatcher(LitElement) {
  render() {
    return html`
      <h1>Welcome to fink 2.0!</h1>
      <div style="display: flex; gap: 2rem;">
        <create-project></create-project>
        <file-importer></file-importer>
        <file-exporter></file-exporter>
      </div>
      <available-projects></available-projects>
      <hr style="margin-top: 1rem;" />
      ${project.value ? html`<project-view></project-view>` : nothing}
    `;
  }
}

@customElement("file-importer")
export class InlangFileImport extends LitElement {
  async handleFileSelection(event: any) {
    project.value = await loadProject(event.target.files[0]);
    console.log({ project: project.value });
  }

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
  async handleFileSelection(event: any) {
    const project = await loadProject(event.target.files[0]);
    console.log({ project });
  }

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
  async handleCreateProject() {
    const file = await newProject();
    project.value = await loadProject(file);
  }

  render() {
    return html`
      <button @click=${this.handleCreateProject}>
        Create and load new project
      </button>
    `;
  }
}
