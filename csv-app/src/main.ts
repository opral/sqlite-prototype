import { LitElement, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { newLixFile, openLixFromOPFS } from "lix-sdk";
import { lix, openFile } from "./state";
import "./file-view";
import "./csv-view";

const lixOPFSPath = "temporary.lix";

@customElement("csv-app")
export class App extends SignalWatcher(LitElement) {
  constructor() {
    super();
    if (lix.value === undefined) {
      navigator.storage.getDirectory().then(async (dir) => {
        try {
          await dir.getFileHandle(lixOPFSPath, {
            create: false,
          });
          lix.value = await openLixFromOPFS(lixOPFSPath);
        } catch {
          // do nothing, file doesn't exist
        }
      });
    }
  }

  render() {
    return html`
      <h1>Welcome to fink 2.0!</h1>
      <div style="display: flex; gap: 2rem;">
        <create-project></create-project>
        <file-importer></file-importer>
      </div>
      <hr style="margin-top: 1rem;" />
      ${lix.value
        ? html`<div>
            <file-view></file-view>
          </div>`
        : html`<p>No lix loaded</p>`}
      ${openFile.value ? html`<csv-view></csv-view>` : nothing}
    `;
  }
}

@customElement("file-importer")
export class InlangFileImport extends LitElement {
  async handleFileSelection(event: any) {
    const file: File = event.target.files[0];
    await lix.value?.db
      .insertInto("file")
      .values({ id: "3", path: file.name, data: await file.arrayBuffer() })
      .execute();
    // await saveInOPFS({ blob: file, path: file });
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
  async handleCreateProject() {
    const file = await newLixFile();
    await saveInOPFS({ blob: file, path: lixOPFSPath });
    lix.value = await openLixFromOPFS(lixOPFSPath);
  }

  render() {
    return html`
      <button @click=${this.handleCreateProject}>
        Create and load new lix
      </button>
    `;
  }
}

/**
 * Imports a project from a blob into OPFS.
 */
async function saveInOPFS(args: { blob: Blob; path: string }) {
  const opfsRoot = await navigator.storage.getDirectory();
  // TODO file names based on UUID to avoid collisions
  const fileHandle = await opfsRoot.getFileHandle(args.path, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(args.blob);
  await writable.close();
}
