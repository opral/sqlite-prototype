import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("fink-app")
export class MyElement extends LitElement {
  render() {
    return html` <h1>Welcome to fink 2.0!</h1> `;
  }
}
