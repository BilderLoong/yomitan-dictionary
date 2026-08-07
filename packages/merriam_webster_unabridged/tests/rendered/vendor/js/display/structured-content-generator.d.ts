/**
 * Minimal public surface of the vendored Yomitan StructuredContentGenerator.
 * See tests/rendered/vendor/README.md for provenance; the implementation is
 * the untouched upstream file next to this declaration.
 */
export class StructuredContentGenerator {
  constructor(contentManager: unknown, document: unknown, window: unknown);
  createStructuredContent(content: unknown, dictionary: string): unknown;
  appendStructuredContent(
    node: unknown,
    content: unknown,
    dictionary: string,
  ): void;
}
