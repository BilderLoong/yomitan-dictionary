# Preserve information over presentation

When a choice must be made between a lossless but plain rendering and a
richer rendering that may drop source content, the converter keeps the
information and improves the presentation later. Information dropped from the
result is hard to become aware of afterwards: it never shows up in per-word
tests, and it only surfaces through full-database output audits.

## Consequences

- Unknown or unsupported wrappers become atomic fallbacks that preserve the
  visible subtree once and report a finding for the owner and level, rather
  than being discarded.
- A node whose faithful rendering is not yet implemented keeps its text in
  plain fallback form instead of being omitted from the output.
- When a source unit cannot be emitted at all, a finding records its row,
  mean, and preview so the loss stays visible in `build-report.json`.
- A shape assumed rare or absent is checked against the full database before
  the assumption is relied on.
- A presentation change that strips a style maps every affected node to a
  replacement rule in `styles.css`; a node with no rule loses its styling
  silently, detectable only by comparing the built output with the source.
- The ZIP stylesheet only targets the dictionary's own structured-content
  units (`[data-sc-content]`); Yomitan's own DOM — definition-tag chips, tag
  lists, and other UI chrome — keeps Yomitan's default styling and is never
  targeted by the dictionary's CSS.
