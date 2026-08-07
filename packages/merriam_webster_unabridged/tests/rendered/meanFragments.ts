import type { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";

/**
 * Extracts one fragment per numbered mean (sense) of a converted entry's
 * structured content. Mean boundaries are the `li` units of the entry-level
 * `mwu-level` list: either `sense-number` items directly (what: 4 means) or
 * `verb-subtype` groups whose nested `mwu-level` lists carry the sense items
 * (turn: 2 groups, 21 means). Labels carry the sense marker, prefixed with
 * the verb-subtype label for grouped entries.
 */

export interface MeanFragment {
  /** Sense marker, e.g. "1" or "transitive verb · 3". */
  readonly label: string;
  /** The mean subtree (an `li` structured-content node). */
  readonly node: StructuredContent;
}

interface ScElement {
  readonly tag: string;
  readonly content?: StructuredContent;
  readonly data?: Readonly<Record<string, string>>;
}

const asElement = (node: StructuredContent): ScElement | null => {
  if (typeof node === "string" || Array.isArray(node)) return null;
  return node as ScElement;
};

const elementChildren = (node: ScElement): readonly StructuredContent[] =>
  Array.isArray(node.content) ? node.content : [];

const hasContent = (node: ScElement, content: string): boolean =>
  node.data?.content === content;

const senseMarker = (node: ScElement): string => node.data?.sourceMarker ?? "";

const subtypeLabel = (node: ScElement): string => {
  for (const child of elementChildren(node)) {
    const element = asElement(child);
    if (element === null || !hasContent(element, "verb-subtype")) continue;
    if (typeof element.content === "string") return element.content;
  }
  return "";
};

const senseFragments = (
  groupLabel: string,
  list: ScElement,
): readonly MeanFragment[] => {
  const fragments: MeanFragment[] = [];
  for (const child of elementChildren(list)) {
    const element = asElement(child);
    if (element === null || !hasContent(element, "sense-number")) continue;
    fragments.push({
      label:
        groupLabel.length === 0
          ? senseMarker(element)
          : `${groupLabel} · ${senseMarker(element)}`,
      node: child,
    });
  }
  return fragments;
};

export const meanFragments = (
  root: StructuredContent,
): readonly MeanFragment[] => {
  const entry = asElement(root);
  if (entry === null) return [];
  const fragments: MeanFragment[] = [];
  for (const child of elementChildren(entry)) {
    const list = asElement(child);
    if (list === null || !hasContent(list, "mwu-level")) continue;
    for (const listChild of elementChildren(list)) {
      const item = asElement(listChild);
      if (item === null) continue;
      if (hasContent(item, "verb-subtype")) {
        const label = subtypeLabel(item);
        for (const listChildInner of elementChildren(item)) {
          const senseList = asElement(listChildInner);
          if (senseList === null || !hasContent(senseList, "mwu-level")) {
            continue;
          }
          fragments.push(...senseFragments(label, senseList));
        }
      } else {
        fragments.push({ label: senseMarker(item), node: listChild });
      }
    }
  }
  return fragments;
};
