import { SignalWatcher } from "@lit-labs/preact-signals";
import { LitElement } from "lit-element";

export class BaseElement extends SignalWatcher(LitElement) {
  // @ts-ignore
  protected createRenderRoot(): Element | ShadowRoot {
    let root = this.attachShadow({ mode: "open" });
    const links = document.head.getElementsByTagName("link");
    for (let i = 0; i < links.length; i++) {
      const link = links.item(i);
      if (!link || link.rel !== "stylesheet") {
        continue;
      }
      root.appendChild(link.cloneNode(true));
    }
    return root;
  }
}
