import { LitElement, html, nothing, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { newLixFile, openLixFromOPFS } from "lix-sdk";
import { lix, openFile } from "./state";
import "./file-view";
import "./csv-view";
// @ts-expect-error - no types
import plugin from "./csv-plugin.js?raw";
import { poll } from "./reactivity";
import { BaseElement } from "./baseElement";
import "@shoelace-style/shoelace";

const lixOPFSPath = "temporary.lix";

@customElement("csv-app")
export class App extends BaseElement {
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
    poll(
      () => {
        return lix.value?.db
          .selectFrom("change")
          .select(({ fn }) => [fn.count<number>("id").as("count")])
          .executeTakeFirst();
      },
      (value) => {
        if (value) this.numOustandingChanges = value?.count;
      }
    );
  }

  @state()
  numOustandingChanges = 0;

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
      <hr />
      <h2>Meta</h2>
      <p>Uncommitted changes: ${this.numOustandingChanges}</p>
      <hr />
      ${openFile.value ? html`<csv-view></csv-view>` : nothing}
    `;
  }
}

@customElement("file-importer")
export class InlangFileImport extends BaseElement {
  async handleFileSelection(event: any) {
    const file: File = event.target.files[0];
    await lix.value?.db
      .insertInto("file")
      .values({
        id: (Math.random() * 100).toFixed(),
        path: file.name,
        blob: await file.arrayBuffer(),
      })
      .execute();
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

@customElement("create-project")
export class CreateProject extends BaseElement {
  async handleCreateProject() {
    const file = await newLixFile();
    await saveInOPFS({ blob: file, path: lixOPFSPath });
    lix.value = await openLixFromOPFS(lixOPFSPath);
    await lix.value.db
      .insertInto("file")
      .values({
        id: "in280ns08n08n2",
        path: "lix/plugin/csv.js",
        blob: new TextEncoder().encode(plugin),
      })
      .execute();
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
