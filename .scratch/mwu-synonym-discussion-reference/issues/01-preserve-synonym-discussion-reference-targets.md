# 01 — Preserve synonym-discussion reference targets

**What to build:** Make every source synonym-discussion pointer preserve its
visible target words as non-interactive cross-references. In the real
`abstract` entry, both `abridgment` and `detach` must keep their target
boundaries inside correctly classified synonym-discussion references without
serializing MWU navigation data.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] A focused public conversion test proves that the pointer is a
      `synonym-discussion-reference`, its `.sr` target is a separate
      `cross-reference`, the target has no duplicate relation metadata, and no
      `bword://` value remains.
- [x] The minimum renderer change applies the rule to all matching source
      pointers without a word-specific or row-specific branch.
- [x] A real selected-word build for `abstract` proves that `abridgment` and
      `detach` are separate cross-reference targets inside separate
      synonym-discussion references.
- [x] The real selected-word result contains no serialized `bword://`
      navigation value.
- [x] The Related to disclosure remains a non-interactive `related-item`, and
      no new CSS rule, planner change, assembler change, or compatibility path
      is added.

## Verification

- Focused conversion and Yomitan-generated HTML contract: 57 passed, 0 failed.
- Real selected-word pipeline against `MWU.db`: 3 passed, 0 failed.
- Focused Biome gate on the three implementation files: passed.
- Real source-shape audit: 6,336 synonym-discussion pointer sections; maximum
  one pointer per section; no section mixed a pointer with a full discussion.
- Two-axis review: 3 Standards findings and 0 Spec findings. The generated-HTML
  assertion and explicit callback return types were added. The isolated
  review's line-height finding was superseded by the checkout's pre-existing
  staged stylesheet, which had already removed that rule; this ticket did not
  reintroduce it.
- Real Yomitan headless inspection built 433 records and passed `abstract`
  before stopping on pre-existing `what` presentation failures from unrelated
  staged UI work.
- TDD note: the focused conversion test produced the valid product red state.
  The first real-source test red state selected only one `abstract` record and
  was a test-authoring error; correcting record selection made the real test
  green without another production change.
