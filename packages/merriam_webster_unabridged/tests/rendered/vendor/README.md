# Vendored Yomitan structured-content renderer

A pinned copy of the Yomitan `StructuredContentGenerator` and its pure import
chain, used by `tests/helpers/renderToHtml.ts` to render our structured
content exactly as the Yomitan extension displays it, without a browser.

## Provenance

- Upstream: https://github.com/yomidevs/yomitan
- Version: 26.7.29.0 (commit `649cfb0bdfe7b156447202b151f049784e8468dc`)
- Copied from the unpacked extension fixture
  (`tests/fixture/yomitan-chrome-playwright/js`) refreshed by
  `bun run update:fixture`; see `tests/fixture/UPSTREAM.json` for the
  resolved upstream provenance.

## Files

The set is the transitive import closure of `structured-content-generator.js`
(all pure JS, no top-level DOM access):

```
js/display/structured-content-generator.js
js/display/display-content-manager.js
js/templates/anki-template-renderer-content-manager.js
js/language/text-utilities.js
js/language/ja/japanese.js
js/language/zh/chinese.js
js/language/CJK-util.js
js/core/event-listener-collection.js
js/data/array-buffer-util.js
```

## Refresh

`bun run update:fixture` re-copies these files from the freshly built fixture
in the same pass that installs the extension, so the vendored renderer always
matches the e2e extension version.
