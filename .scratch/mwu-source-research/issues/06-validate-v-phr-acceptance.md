# 06 — Validate `v_phr` acceptance

**What to build:** An evidence-backed verdict on whether the interposed-object
phrase evidence (`v_phr`) is safe to accept in production — confirmed against
real searches and negative cases, with no false positives from ordinary
emphasis.

**Blocked by:** None — can start immediately (production mapping already
exists via the archived first-slice build)

**Status:** ready-for-agent

**Source:** TODO.md, "Validation after the production mapping exists".

- [x] Interposed-object candidates reviewed on representative searches:
      `give you up`, `take apart`, `take the word`
- [x] Negative cases checked: ordinary emphasis must NOT create `v_phr`
      evidence
- [x] Confirmed the dictionary stores canonical phrases rather than wildcard
      expressions
- [x] Verdict recorded (accept or reject `v_phr`) with the source evidence

## Findings (2026-08-07)

DB: `word(id, w, m)`; all queries read-only against
`packages/merriam_webster_unabridged/assets/MWU.db`.

### 1. Candidate inventory per representative search

**`take apart` — candidate CONFIRMED (7 unique paired-`.mw_t_wi` examples).**

Row: `id = 362180`, `w = take` (decoded). Owner path:
`.dro > .drp#take-apart-anchor` → its `.vg` sense tree → `.sense/.dt` →
`.ex-sent-group > .ex-sent`, some spans wrapped in `.mw_t_sp`.

Every candidate is two `.mw_t_wi` spans with retained object text between
them; the second span is the particle `apart`:

| Example (ex-sent text) | Highlight 1 | Retained between | Highlight 2 |
| --- | --- | --- | --- |
| take a town apart | take | a town | apart |
| …he takes it apart skillfully… (G. W. Johnson) | takes | it | apart |
| …take the various games and sponsors apart… (Phoenix Flame) | take | the various games and sponsors | apart, |
| takes the ordinary American citizen apart (G. W. Johnson) | takes | the ordinary American citizen | apart |
| …take the witness apart (J. R. Fitzpatrick) | take | the witness | apart |
| …take your opponent apart (Time) | take | your opponent | apart |
| took wives apart (T. S. Geisel) | took | wives | apart |

These genuinely prove verb + particle separated by an object. The archive
note `take [a town] apart` from take.md is reproduced exactly
(`<span class="mw_t_sp"><span class="mw_t_wi">take</span> a town
<span class="mw_t_wi">apart</span></span>`). All seven live inside the
`take apart` `.drp` scope; the canonical owner is the Level 1
`drp-phrase-canonical-entry` for `take apart`.

**`give you up` — NO paired-`.mw_t_wi` candidate in the DB; semantically real
example exists but is emphasized, not highlighted.**

The `give` row (`id = 194504`) hosts 18 `.drp` phrases, none `give up`, and
no paired `give … up` highlight. The canonical `give up` verb entry is its
own row `id = 194513`, `w = give%20up` (decoded `give up`); its second
`<mean>` has `.hword give up`, `.fl verb`. The example
`it's so late we gave you up` (Charles Dickens) is marked
`<em class="mw_t_it">gave</em> you <em class="mw_t_it">up</em>` — `.mw_t_it`
(emphasis), NOT `.mw_t_wi`. The only `.mw_t_wi` in the whole row is a
contiguous `gave up` (Kershaw baseball example). So the strict rule
(two `.mw_t_wi` spans with retained text between) produces NO candidate for
`give you up`. The separated form is real MWU content, but its components are
emphasis-marked, which the rule intentionally ignores. The v_phr lookup
transform still normalizes `give you up` → `give up` at search time (see
section 4); the DB just does not supply highlight evidence for it.

**`take the word` — NO candidate.**

Row `id = 362180`, `.drp#take-the-word-anchor` scope contains only
`.vr or less commonly take up the word` and a single sense
`to begin to speak` — zero examples, zero highlight spans. Correct: `take
the word` is verb + object, not a separable verb + particle.

### 2. Negative-case check: ordinary emphasis never creates v_phr evidence

- `.mw_t_it` is used broadly for presentation emphasis, not phrasal-verb
  separation. In the `take` row: 80 `.mw_t_it` spans; 35 sit inside
  attributions (`.aq/.source/.auth`, e.g. `Phoenix Flame`, `Time`,
  `New Yorker`, `Sports Illustrated`) and 45 elsewhere, including
  `used chiefly in the phrase <em class="mw_t_it">take pains</em> or
  <em class="mw_t_it">take the trouble</em>` inside a `.un` and label words
  like `dialectal`, `sometimes`. None of these are target-highlight spans.
- The `give up` row's separated examples (`gave the idea up`,
  `gave himself up`, `gave you up`) all use `.mw_t_it` + `.mw_t_sp`, never
  `.mw_t_wi`. If emphasis were treated as evidence, `give you up` would
  wrongly become a candidate — the rule correctly requires two `.mw_t_wi`
  spans.
- **Counter-case that motivated "paired spans are evidence, not conclusive
  proof":** the `give` row contains paired `.mw_t_wi` spans that are NOT
  phrasal-verb separation — `give me liberty or give me death`
  (`.mw_t_wi` = `give`, retained `me liberty or`, `.mw_t_wi` = `give`) and
  `he doesn't give a damn` (highlight = `give` … `give`). Two spans with
  retained text exist, but the components are the same verb repeated, not
  verb + particle. The production regex (section 4) rejects both because the
  second span is not in the particle/preposition list — this check must
  remain part of the mapping; "two spans with text between" alone is
  necessary but not sufficient.

### 3. Canonical phrases, not wildcard expressions

- The `take` row (id 362180) has 84 `.drp` phrase labels; `take apart`,
  `take the word`, `take a bath` are canonical `.drp` phrases each owning a
  `.vg` definition tree. `take up the word` is a `.va` alternate of
  `take the word` (phrase-alternate soft link), not a separate wildcard.
- The `give up` row (id 194513, `w = give%20up` decoded `give up`) hosts
  both the `give–up` noun mean and the `give up` verb mean as full headwords.
  No wildcard shape such as `give XXX up` exists anywhere.
- alt table rows (`take apart`, `take the word`, `take up the word` → id
  362180) point at the parent row; the canonical phrase is the `.drp` term.
  The builder must emit the canonical term, never a wildcard — confirmed by
  the archived note "should not create a wildcard term such as take XXX
  apart" (docs/archive/2026-08-06-project-notes.md).

### 4. Production mapping state

`git log -S v_phr --oneline` → the mapping lives in the archived first-slice
build (`src/prompts.md` at 121a6e4/9378960, `englishTransforms`):
`phrasalVerbInterposedObjectRule` with
`isInflected: ^\w* (?:(?!\b(phrasalVerbWordDisjunction)\b).)+ (?:particlesDisjunction)`
and a deinflect that strips the interposed object; condition `v_phr`
(`Phrasal verb`, `isDictionaryForm: true`, subcondition of `v`); transform
name `interposed object`. Verified against real searches: `give you up` →
`give up`, `takes it apart` → `takes apart`, `take a town apart` → `take
apart`, `take the various games and sponsors apart` → `take apart`, `took
wives apart` → `took apart`; `take apart` (canonical) and `take the word`
correctly do NOT match; the false-positive shapes `give me liberty or give me
death` / `give a damn` do NOT match.

Current `src/` (worktree-1) has NO v_phr emission: `assembleCanonicalRecord`
writes an empty rules string, and rules are only attached to soft-link
records. So "production mapping exists" = the archived regex transform; the
current builder has not yet wired `v_phr` into canonical records.

### 5. Verdict: ACCEPT `v_phr`

Accept the archived v_phr production mapping, subject to these
evidence-backed conditions:

1. v_phr evidence requires TWO `.mw_t_wi` spans with retained text between
   them (the `take apart` family satisfies this: 7 unique examples).
   `.mw_t_it`/`em` emphasis NEVER creates evidence — confirmed by the
   attribution and usage-note spans in the take row and the emphasis-marked
   `gave you up` example in the give-up row.
2. The deinflection regex's particle-list check is REQUIRED and must stay in
   the mapping: it rejects the only false-positive shape found in the DB
   (repeated-verb `give … give` paired highlights in the give row).
3. `give you up` works at lookup time via the transform, but the DB provides
   no highlight evidence for it; do not claim DB evidence for that search.
   `take the word` correctly yields no candidate.
4. Emit the canonical `.drp` term (e.g. `take apart`, `give up`) with the
   `v_phr` rule on the Level 1 phrase entry; never a wildcard.

Open question for the coordinator: whether the current builder should begin
attaching `v_phr` to `drp-phrase-canonical-entry` records now (accepting the
mapping) or keep it deferred until the regex lives in a tracked transform
module rather than the archived prompts file. The evidence supports
acceptance either way.
