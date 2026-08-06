# Preserve local structured-content boundaries

MWU labels, pronunciation notes, run-on forms, and usage-discussion pointers
must remain local structured content rather than global Yomitan tags or false
interactive links. This keeps source ownership and visible meaning intact:
labels such as `archaic` and `of a blade` qualify only their nearest owner,
ambiguous pronunciation text is not presented as invented IPA, and
`See Usage Discussion at bring` remains a non-interactive source pointer
without duplicating another entry's discussion.

## Consequences

- Local labels stay in structured content and do not populate the term or
  definition tag bank.
- Internal source navigation targets are discarded while visible text and
  relationship units remain.
- Rendering and tests must distinguish a pronunciation reading from an
  explanatory pronunciation note.
