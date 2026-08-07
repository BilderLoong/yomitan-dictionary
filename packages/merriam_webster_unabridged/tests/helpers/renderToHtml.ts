import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";
import { StructuredContentGenerator } from "../rendered/vendor/js/display/structured-content-generator.js";

/**
 * Renders a structured-content node to the exact HTML the Yomitan extension
 * produces, using Yomitan's real StructuredContentGenerator against a fake
 * DOM shim (pure JS, no browser needed). The serialization mapping is
 * verified against the generator's DOM operations:
 *   - tag        -> `<tag class="gloss-sc-{tag}" ...>`
 *   - data key   -> `data.sc{PascalCase}` -> `data-sc-{kebab-case}`
 *   - style      -> inline `style="kebab-case: value; ..."`
 *   - open:true  -> `open` attribute; open:false -> no attribute
 *   - text nodes -> escaped text
 *
 * `renderToHtml` is the single shared artifact between the bun render
 * contract tests and the Storybook stories, so what is displayed is exactly
 * what is asserted.
 */

export interface FakeTextNode {
  readonly kind: "text";
  readonly data: string;
}

export interface FakeElement {
  readonly kind: "element";
  readonly tag: string;
  className: string;
  readonly dataset: Record<string, unknown>;
  readonly style: Record<string, string>;
  readonly attributes: Record<string, string>;
  lang: string | null;
  title: string | null;
  readonly children: FakeNode[];
  readonly classList: { readonly add: (name: string) => void };
  appendChild(child: FakeNode): FakeNode;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  addEventListener(): void;
  [key: string]: unknown;
}

export type FakeNode = FakeTextNode | FakeElement;

const escapeHtml = (text: string): string =>
  text
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");

const kebabCase = (name: string): string =>
  name.charAt(0).toLowerCase() +
  name
    .slice(1)
    .replace(/[A-Z]/gu, (letter: string): string => `-${letter.toLowerCase()}`);

const createElement = (tag: string): FakeElement => {
  const element: FakeElement = {
    kind: "element",
    tag,
    className: "",
    dataset: {},
    style: {},
    attributes: {},
    lang: null,
    title: null,
    children: [],
    classList: {
      add(name: string): void {
        if (!element.className.split(/\s+/u).includes(name)) {
          element.className = `${element.className} ${name}`.trim();
        }
      },
    },
    appendChild(child: FakeNode): FakeNode {
      element.children.push(child);
      return child;
    },
    setAttribute(name: string, value: string): void {
      element.attributes[name] = value;
    },
    removeAttribute(name: string): void {
      delete element.attributes[name];
    },
    addEventListener(): void {
      // The generator only registers handlers on image links, which the MWU
      // converter never emits.
    },
  };
  return element;
};

const createTextNode = (data: string): FakeTextNode => ({ kind: "text", data });

const fakeDocument = {
  createElement,
  createTextNode,
};

const serializeNode = (node: FakeNode): string => {
  if (node.kind === "text") return escapeHtml(node.data);

  const attributes: string[] = [];
  if (node.className.length > 0) {
    attributes.push(`class="${node.className}"`);
  }
  for (const [key, value] of Object.entries(node.dataset)) {
    if (key.startsWith("sc") && value !== undefined && value !== null) {
      attributes.push(
        `data-sc-${kebabCase(key.slice(2))}="${escapeHtml(String(value))}"`,
      );
    }
  }
  const styleEntries = Object.entries(node.style);
  if (styleEntries.length > 0) {
    attributes.push(
      `style="${styleEntries
        .map(
          ([key, value]: readonly [string, string]): string =>
            `${kebabCase(key)}: ${value}`,
        )
        .join("; ")}"`,
    );
  }
  if (node.lang !== null) attributes.push(`lang="${node.lang}"`);
  if (node.title !== null) attributes.push(`title="${escapeHtml(node.title)}"`);
  for (const [name, value] of Object.entries(node.attributes)) {
    attributes.push(
      value.length === 0 ? name : `${name}="${escapeHtml(value)}"`,
    );
  }
  const attributeString =
    attributes.length > 0 ? ` ${attributes.join(" ")}` : "";
  const children = node.children.map(serializeNode).join("");
  if (node.tag === "br") return `<br${attributeString}>`;
  return `<${node.tag}${attributeString}>${children}</${node.tag}>`;
};

interface GeneratorInstance {
  readonly createStructuredContent: (
    content: unknown,
    dictionary: string,
  ) => FakeElement;
}

export const renderToHtml = (content: StructuredContent): string => {
  if (globalThis.location === undefined) {
    // The generator reads location only for `?`-style link hrefs; stub it so
    // the vendored code does not throw when those occur.
    globalThis.location = {
      protocol: "chrome-extension:",
      host: "test",
    } as Location;
  }
  const generator = new StructuredContentGenerator(
    { prepareLink(): void {} },
    fakeDocument,
    {},
  ) as unknown as GeneratorInstance;
  const root = generator.createStructuredContent(
    content,
    "Merriam Webster Unabridged",
  );
  return serializeNode(root);
};
