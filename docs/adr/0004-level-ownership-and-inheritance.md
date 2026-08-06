# Level ownership and inheritance

Information belongs to the nearest semantic owner identified by the DOM
ancestor path. It does not inherit upward into the parent merely because the
parent supplies context. Entry-level pronunciation and part of speech belong
to Level 1; a `.ca` or comparison inside one specific definition stays
attached to that definition's Level 5/6 subtree; an example inside `.un`
belongs to the usage-note subtree, while an example directly inside `.dt`
belongs to the definition subtree.

The parser may carry the ancestor path while walking the DOM, but the output
model must not move a child information unit to Level 1 or copy it to every
descendant.

## Consequences

- Once a new unit's source meaning and boundary are understood, it is named,
  modeled explicitly, and rendered at the nearest owner's Level 1–6 position.
- Until a new unit is understood, its subtree is preserved once as
  unrecognized fallback content and its owner and level are reported rather
  than guessed.
- Known transparent wrappers may be traversed recursively; unknown wrappers
  are atomic fallbacks — their visible subtree is preserved once and their
  descendants are not parsed separately, which prevents a known-looking
  nested example from being rendered twice while the wrapper's own text is
  also kept.
