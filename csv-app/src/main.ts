import { LitElement, html, nothing, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";
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
import { v4 as uuid } from "uuid";

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
  }

  render() {
    return html`
      <h1>Welcome to Opral CSV</h1>
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
      <lix-actions></lix-actions>
      <hr />
      ${openFile.value ? html`<csv-view></csv-view>` : nothing}
    `;
  }
}

@customElement("lix-actions")
export class LixActions extends BaseElement {
  connectedCallback(): void {
    super.connectedCallback();
    poll(
      async () => {
        const numUncommittedChanges = await lix.value?.db
          .selectFrom("change")
          .select(({ fn }) => [fn.count<number>("id").as("count")])
          .where("commit_id", "is", null)
          .executeTakeFirst();
        const comittedChanges = await lix.value?.db
          .selectFrom("change")
          .select(({ fn }) => [fn.count<number>("id").as("count")])
          .where("commit_id", "is not", null)
          .executeTakeFirst();
        return { numUncommittedChanges, comittedChanges };
      },
      ({ numUncommittedChanges, comittedChanges }) => {
        if (numUncommittedChanges && comittedChanges) {
          this.numUncommittedChanges = numUncommittedChanges!.count;
          this.numCommittedChanges = comittedChanges!.count;
        }
      }
    );
  }

  @state()
  numUncommittedChanges = 0;

  @state()
  numCommittedChanges = 0;

  @state()
  username = "Samuel";

  async handleCommit() {
    await lix.value!.commit({
      userId: this.username,
      // TODO unbundle description from commits
      description: "",
    });
  }

  render() {
    return html`
      <h2>Lix actions</h2>
      <!-- name -->
      <div>
        <label for="name">Name</label>
        <input
          id="name"
          type="text"
          .value=${this.username}
          @input=${(e: any) => {
            this.username = e.target.value;
          }}
        />
      </div>
      <!-- commits -->
      <div class="flex gap-4 justify-between">
        <div class="flex gap-4">
          <p>Uncommitted changes: ${this.numUncommittedChanges}</p>
          <p>Committed changes: ${this.numCommittedChanges}</p>
        </div>
        <button @click=${this.handleCommit}>Commit</button>
      </div>
    `;
  }
}

@customElement("file-importer")
export class InlangFileImport extends BaseElement {
  // https://shoelace.style/components/alert#the-toast-stack
  static styles = css`
    .sl-toast-stack {
      left: 0;
      right: auto;
    }
  `;

  async handleFileSelection(event: any) {
    const file: File = event.target.files[0];
    // reset the input value so that the same file can be imported again
    event.target.value = null;
    const fileExists = await lix.value?.db
      .selectFrom("file")
      .selectAll()
      .where("path", "is", file.name)
      .executeTakeFirst();
    // create new file
    const fileArrayBuffer = await file.arrayBuffer();
    if (fileExists === undefined) {
      return await lix.value?.db
        .insertInto("file")
        .values({
          id: uuid(),
          path: file.name,
          blob: fileArrayBuffer,
        })
        .execute();
    }
    // TODO non-hardcoded plugin
    //      the app needs to choose a plugin (likely the one
    //      it provides by itself, or lix has a plugin order
    //      matching to closest match which always needs to be one)
    const diffs = await lix.value!.plugins[0]!.diff!.file!({
      old: fileExists.blob,
      neu: fileArrayBuffer,
    });
    // if no diffs, show alert that the file has not been imported
    if (diffs?.length === 0) {
      const alert = Object.assign(document.createElement("sl-alert"), {
        variant: "primary",
        closable: true,
        duration: 10000,
        innerHTML: `
          <b>File not imported</b>: The imported file is identical to the existing ${file.name} file.
        `,
      });
      document.body.append(alert);
      return alert.toast();
    }
    // diffs exists, show merge view
    const dialog = Object.assign(document.createElement("sl-dialog"), {
      style: `--width: 90vw;`,
      label: "Resolve merge conflicts",
      innerHTML: `
        <p>File ${file.name} has been modified</p>
      `,
    });
    document.body.append(dialog);
    return dialog.show();
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
