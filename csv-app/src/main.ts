import { html, nothing, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { Ref, createRef, ref } from "lit/directives/ref.js";
import { newLixFile, openLixFromOPFS } from "lix-sdk";
import "./file-view";
import "./csv-view";
// @ts-expect-error - no types
import plugin from "./csv-plugin.js?raw";
import { poll } from "./reactivity";
import { BaseElement } from "./baseElement";
import "@shoelace-style/shoelace";
import { v4 as uuid } from "uuid";
import { consume, provide } from "@lit/context";
import { lixContext, openFileContext } from "./contexts";

@customElement("csv-app")
export class App extends BaseElement {
  @property({ attribute: true })
  path = "instance-a.lix";

  @state()
  @provide({ context: lixContext })
  lix?: Awaited<ReturnType<typeof openLixFromOPFS>>;

  @state()
  @provide({ context: openFileContext })
  openFile?: string;

  connectedCallback() {
    super.connectedCallback();
    if (this.lix === undefined) {
      navigator.storage.getDirectory().then(async (dir) => {
        try {
          await dir.getFileHandle(this.path, {
            create: false,
          });
          this.lix = await openLixFromOPFS(this.path);
        } catch {
          // do nothing, file doesn't exist
        }
      });
    }
  }

  render() {
    return html`
      <h1>${this.path}</h1>
      <div style="display: flex; gap: 2rem;">
        <create-project
          .lixPath=${this.path}
          @lix-created=${(e) => {
            this.lix = e.detail;
          }}
        ></create-project>
        <file-importer></file-importer>
      </div>
      <hr style="margin-top: 1rem;" />
      ${this.lix
        ? html`<div>
            <file-view
              @file-select=${(file) => (this.openFile = file.detail)}
            ></file-view>
          </div>`
        : html`<p>No lix loaded</p>`}
      <hr />
      <lix-actions></lix-actions>
      <hr />
      ${this.openFile ? html`<csv-view></csv-view>` : nothing}
    `;
  }
}

@customElement("lix-actions")
export class LixActions extends BaseElement {
  @consume({ context: lixContext, subscribe: true })
  lix?: Awaited<ReturnType<typeof openLixFromOPFS>>;

  @consume({ context: openFileContext, subscribe: true })
  openFile?: string;

  @state()
  numUncommittedChanges = 0;

  @state()
  numCommittedChanges = 0;

  @state()
  username = "Samuel";

  connectedCallback(): void {
    super.connectedCallback();
    poll(
      async () => {
        const numUncommittedChanges = await this.lix?.db
          .selectFrom("change")
          .select(({ fn }) => [fn.count<number>("id").as("count")])
          .where("commit_id", "is", null)
          .executeTakeFirst();
        const comittedChanges = await this.lix?.db
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

  async handleCommit() {
    await this.lix!.commit({
      userId: this.username,
      // TODO unbundle description from commits
      description: "",
    });
  }

  render() {
    return html`
      <h2>Lix actions</h2>
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
  @consume({ context: lixContext, subscribe: true })
  lix?: Awaited<ReturnType<typeof openLixFromOPFS>>;

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
    const existingFile = await this.lix?.db
      .selectFrom("file")
      .selectAll()
      .where("path", "is", file.name)
      .executeTakeFirst();
    // create new file
    const fileArrayBuffer = await file.arrayBuffer();
    if (existingFile === undefined) {
      return await this.lix?.db
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
    const plugin = this.lix!.plugins[0]!;
    const diffs = await plugin.diff!.file!({
      old: existingFile.blob,
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
    });
    const differ = document.createElement(`lix-diff-${plugin.key}-file`);
    // @ts-expect-error - no type given for html element
    differ.old = existingFile.blob;
    // @ts-expect-error -
    differ.neu = fileArrayBuffer;
    dialog.append(differ);
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
  @consume({ context: lixContext, subscribe: true })
  lix?: Awaited<ReturnType<typeof openLixFromOPFS>>;

  @property()
  lixPath: string = "";

  async handleCreateProject() {
    const file = await newLixFile();
    await saveInOPFS({ blob: file, path: this.lixPath });
    const lix = await openLixFromOPFS(this.lixPath);

    await lix.db
      .insertInto("file")
      .values({
        id: "in280ns08n08n2",
        path: "lix/plugin/csv.js",
        blob: new TextEncoder().encode(plugin),
      })
      .execute();

    this.dispatchEvent(new CustomEvent("lix-created", { detail: lix }));
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
