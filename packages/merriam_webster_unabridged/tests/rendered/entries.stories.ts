import { expect } from "storybook/test";

import { renderToHtml } from "../helpers/renderToHtml";
import {
  giveConverted,
  inConverted,
  oConverted,
  ohConverted,
  runConverted,
  turnConverted,
} from "./fixtures";

export default { title: "Entries" };

const renderEntryStory = (html: string): { readonly render: () => string } => ({
  render: (): string => html,
});

export const In = renderEntryStory(renderToHtml(inConverted.content));
export const Give = renderEntryStory(renderToHtml(giveConverted.content));
export const O = renderEntryStory(renderToHtml(oConverted.content));
export const Oh = renderEntryStory(renderToHtml(ohConverted.content));
export const Turn = renderEntryStory(renderToHtml(turnConverted.content));
export const Run = renderEntryStory(renderToHtml(runConverted.content));

export const GiveThanksSubDefinitionStyle = {
  render: (): string => renderToHtml(giveConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    const subDefinition = canvasElement.querySelector(
      '[data-sc-content="definition"][data-sc-level="5"] > span[data-sc-content="definition"][data-sc-level="3"]',
    );
    expect(subDefinition).not.toBeNull();
    if (subDefinition === null) return;

    for (const colorScheme of ["light", "dark"] as const) {
      canvasElement.style.colorScheme = colorScheme;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const computed = getComputedStyle(subDefinition);
      expect(computed.display).toBe("inline");
      expect(computed.borderInlineStartWidth).toBe("0px");
      expect(computed.paddingInlineStart).toBe("0px");
      expect(computed.marginBlockStart).toBe("0px");

      const example = subDefinition.querySelector(
        ':scope > [data-sc-content="example-sentence"]',
      );
      expect(example).not.toBeNull();
      if (example === null) return;
      expect(getComputedStyle(example).display).toBe("block");
    }
  },
};

export const OMetadataStyle = {
  render: (): string => renderToHtml(oConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    const metadata = [
      canvasElement.querySelector('[data-sc-content="entry-qualifier"]'),
      canvasElement.querySelector(
        '[data-sc-content="inflection-label"][data-sc-category="form-label"]',
      ),
    ];
    metadata.forEach((element) => {
      expect(element).not.toBeNull();
    });

    for (const colorScheme of ["light", "dark"] as const) {
      canvasElement.style.colorScheme = colorScheme;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      metadata.forEach((element) => {
        if (element === null) return;
        const computed = getComputedStyle(element);
        expect(computed.display).toBe("inline");
        expect(computed.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(computed.borderTopWidth).toBe("0px");
        expect(computed.fontVariantCaps).toBe("all-small-caps");
      });
    }
  },
};

export const GiveInflectionQualifierStyle = {
  render: (): string => renderToHtml(giveConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    const qualifiers = canvasElement.querySelectorAll(
      '[data-sc-content="inflection-label"][data-sc-category="qualifier"]',
    );
    expect(qualifiers.length).toBeGreaterThan(0);

    for (const colorScheme of ["light", "dark"] as const) {
      canvasElement.style.colorScheme = colorScheme;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      qualifiers.forEach((element) => {
        const computed = getComputedStyle(element);
        expect(computed.display).toBe("inline");
        expect(computed.backgroundColor).toBe("rgba(0, 0, 0, 0)");
        expect(computed.borderTopWidth).toBe("0px");
        expect(computed.fontVariantCaps).toBe("all-small-caps");
      });

      const localTag = canvasElement.querySelector(
        '[data-sc-content="verb-subtype"]',
      );
      expect(localTag).not.toBeNull();
      if (localTag === null) return;
      expect(getComputedStyle(localTag).display).toBe("inline-flex");
    }
  },
};

export const GiveLocalTagStyle = {
  render: (): string => renderToHtml(giveConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    const localTags = canvasElement.querySelectorAll(
      '[data-sc-content="tag"], span[data-sc-content="verb-subtype"]',
    );
    expect(localTags.length).toBeGreaterThan(0);

    for (const colorScheme of ["light", "dark"] as const) {
      canvasElement.style.colorScheme = colorScheme;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      localTags.forEach((element) => {
        const computed = getComputedStyle(element);
        expect(computed.display).toBe("inline-flex");
        expect(computed.borderTopWidth).toBe("0px");
        expect(computed.borderRadius).not.toBe("0px");
        expect(computed.fontWeight).toBe("700");
        expect(computed.paddingTop).not.toBe("0px");
        expect(computed.paddingRight).not.toBe("0px");
        expect(computed.backgroundColor).not.toBe(computed.color);
      });
    }
  },
};

export const GiveHeaderSurfaceStyle = {
  render: (): string => renderToHtml(giveConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    const surfaces = canvasElement.querySelectorAll(
      '[data-sc-content="mwu-header-inflections"]',
    );
    expect(surfaces.length).toBeGreaterThan(0);

    for (const colorScheme of ["light", "dark"] as const) {
      canvasElement.style.colorScheme = colorScheme;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      surfaces.forEach((element) => {
        const computed = getComputedStyle(element);
        const label = getComputedStyle(element, "::before");
        expect(computed.borderInlineStartWidth).toBe("0px");
        expect(computed.borderTopLeftRadius).not.toBe("0px");
        expect(computed.paddingTop).not.toBe("0px");
        expect(computed.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        if (label.content !== "none" && label.content !== "normal") {
          expect(label.display).toBe("block");
        }
      });
    }
  },
};

export const GiveExampleListStyle = {
  render: (): string => renderToHtml(giveConverted.content),
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    const examples = canvasElement.querySelectorAll(
      '[data-sc-content="example-sentence"]',
    );
    expect(examples.length).toBeGreaterThan(0);

    const textLeft = (element: Element): number | null => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const node = walker.nextNode();
      if (!(node instanceof Text)) return null;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, Math.min(node.length, 18));
      return range.getBoundingClientRect().left;
    };

    for (const colorScheme of ["light", "dark"] as const) {
      canvasElement.style.colorScheme = colorScheme;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      examples.forEach((element) => {
        const computed = getComputedStyle(element);
        const marker = getComputedStyle(element, "::marker");
        expect(computed.display).toBe("list-item");
        expect(computed.listStyleType).toBe("disc");
        expect(computed.borderInlineStartWidth).toBe("0px");
        expect(marker.listStyleType).toBe("disc");
      });

      const pairs = Array.from(
        canvasElement.querySelectorAll(
          'details[data-sc-content="extra-examples"]',
        ),
      )
        .map((details) => {
          const summary = details.querySelector(
            ':scope > [data-sc-content="disclosure-summary"]',
          );
          const example = details.previousElementSibling?.matches(
            '[data-sc-content="example-sentence"]',
          )
            ? details.previousElementSibling
            : null;
          const summaryLeft = summary === null ? null : textLeft(summary);
          const exampleLeft = example === null ? null : textLeft(example);
          return summaryLeft === null || exampleLeft === null
            ? null
            : Math.abs(summaryLeft - exampleLeft);
        })
        .filter((delta): delta is number => delta !== null);

      expect(pairs.length).toBeGreaterThan(0);
      expect(Math.max(...pairs)).toBeLessThan(1);
    }
  },
};
