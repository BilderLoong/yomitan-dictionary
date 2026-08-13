# 06 — Verify rendered tags and synchronize project decisions

**What to build:** Prove the completed functional-label model in the real
Yomitan interface, refine unclear presentation, and make every current project
document describe the verified behavior.

**Blocked by:** 05 — Aggregate and stabilize functional-label build output.

**Status:** resolved 2026-08-13

- [x] A real selected dictionary is built and imported into the repository's
      Yomitan inspection browser.
- [x] Rendered checks cover common fixed tags, detailed verb tags, long
      agreement tags, word-element result tags, defined phrase combinations,
      descriptions, and semantic tag order.
- [x] A controlled dynamic-label dictionary proves the question-mark name,
      clear description, final ordering, and amber dashed treatment in the
      real interface.
- [x] Tag wording and descriptions are refined when the rendered result is
      difficult to understand, without changing the accepted semantic model.
- [x] The real-database inventory audit reports 98 mapped labels and zero
      unmapped labels.
- [x] Targeted tests, archive schema tests, repeated-build checks, the package
      test suite, and the relevant repository gates are run and reported
      separately.
- [x] The domain glossary records fixed functional tag, dynamic functional
      tag, functional-label inventory, fixed tag catalog, and functional-label
      mapping with the accepted ownership rules.
- [x] The tag-generation architecture decision supersedes the obsolete
      no-tag-bank decision and the incorrect claim about tag-bank score and
      lookup popularity.
- [x] Current entry-conversion and dictionary-build specifications describe
      the fixed catalog, dynamic fallback, inventory audit, reporting,
      deterministic export, and test behavior.
- [x] Package documentation explains the emitted tag bank, inventory command,
      dynamic findings, expected current counts, and visual inspection flow.
- [x] Final verification names any unrelated baseline failure and does not
      claim that an unrun gate passed.

## Verification — 2026-08-13

- A real selected archive imported successfully in headless Yomitan.
- Fixed rendered checks confirmed `sum` (`n` with its note), `Acts of the
  Apostles` (`n`, `plural-form`, `takes-singular-verb`), `Abranchia` (`n`,
  `plural-form`, `takes-plural-verb`), `-iatrics` (`comb`,
  `plural-noun-forming`, `usually-takes-singular-verb`), `radial glia` (`n`,
  `usually-takes-plural-verb`), `in` verb and word-element cases, and `at a
  word` (`adv`, `phrase`).
- A controlled dynamic archive showed `?future_label`, its exact source-label
  note, category `unmappedPartOfSpeech`, final tag order, and an amber `1px`
  dashed border.
- The real inventory scanned 260,934 rows and 284,168 canonical entries. It
  reported 98 labels, zero unmapped labels, zero scan errors, and no false
  `noun,` label.
- Focused gates passed: root suite 87 tests / 0 failures / 393 expectations;
  broader focused suite 95 / 0 / 401; Biome checked 70 files; OpenSpec strict
  validation passed 3 of 3 specs; and `git diff --check` passed.
- The full `bun test` result was 155 passing tests and 5 unrelated baseline
  failures because `tests/rendered/fixtures/run.html` is missing. TypeScript
  remains red for unrelated scripts, fixtures, and existing tests. Neither
  baseline result is reported as green.
