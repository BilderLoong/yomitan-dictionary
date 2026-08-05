# MWU Term-Bank Entry Contract Test Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the real-database `what` term-bank test so it specifies the complete level-1 output, verifies canonical and soft-link records with all fields, and checks that same-spelling canonical entries share a sequence number without hard-coding that number.

**Architecture:** Keep the test as an archive-level integration test against the original `MWU.db`. Use small matcher factories for canonical and soft-link record shapes, then assert the generated array as an order-independent collection. Test the cross-record sequence invariant with a separate derived collection, because that relationship cannot be expressed by independent `arrayContaining` records alone.

**Tech Stack:** TypeScript, Bun test, Yomitan `TermInformation` tuples, SQLite-backed MWU archive builder, Biome.

## Global Constraints

- Use the original database and the existing archive build path; do not create a synthetic test database.
- Keep core test helpers pure and avoid mutating generated term-bank data.
- Match every record field: term, reading, definition tags, deinflectors, popularity, definitions/soft-link payload, sequence, and term tags.
- Use `expect.any(...)` only in direct Jest/Bun matcher expectations; do not serialize asymmetric matchers into JSON or a `Set`.
- Do not assert an absolute sequence number. Assert only the required relationship between records.
- Keep the `in` test commented out for this focused change unless it is explicitly requested; its current fixture is unrelated to the `what` contract.
- Make no production-code changes.

---

## Task 1: Establish precise record matchers

**Files:**
- Modify: `packages/merriam_webster_unabridged/tests/archive/termBankContent.test.ts`

- [ ] Confirm the existing matcher type is separate from the runtime `TermInformation` type, because `expect.any(...)` values are matcher patterns rather than actual tuple values.
- [ ] Keep or extract a pure `canonicalEntry(term)` factory that matches all eight tuple fields while leaving generated reading, payload, and sequence values unconstrained where the contract does not specify them.
- [ ] Keep or extract a pure `softLinkEntry(lookup, target, rules)` factory that matches all eight fields, including popularity `-100`, the exact target and rule payload, and unconstrained generated sequence.
- [ ] Ensure the factories return fresh nested arrays so the expected patterns do not share mutable payloads.

**Verification:** The test file type-checks through the focused Bun test invocation, and no matcher is passed through `JSON.stringify` or `toSerializedSet`.

## Task 2: Specify the complete `what` record set

**Files:**
- Modify: `packages/merriam_webster_unabridged/tests/archive/termBankContent.test.ts`

- [ ] Build one `TARGET_TERMS` collection containing all 25 expected records: 22 canonical records and 3 soft-link records.
- [ ] Represent repeated canonical `what` records as separate expected records so the test checks their multiplicity, while allowing their generated fields to vary where appropriate.
- [ ] Represent the three soft links exactly:
  - `what and if` → `what an if` with `alternative`.
  - `what is what` → `what's what` with `alternative`.
  - `what was what` → `what's what` with `alternative`.
- [ ] Assert `termBank` has exactly `TARGET_TERMS.length` records.
- [ ] Assert `termBank` contains `TARGET_TERMS` with `expect.arrayContaining`, so output order is not part of the specification.
- [ ] Add explicit derived-count assertions for 22 canonical records and 3 soft-link records, making the intended complete fixture size visible and preventing an accidental matcher duplication from hiding a missing record.

**Verification:** A deliberately missing expected record fails the test; restoring all 25 records passes against the real archive output.

## Task 3: Assert the same-spelling sequence relationship

**Files:**
- Modify: `packages/merriam_webster_unabridged/tests/archive/termBankContent.test.ts`

- [ ] Derive canonical `what` records from the actual `termBank` by filtering for the exact spelling `what` and canonical popularity `0`.
- [ ] Assert that exactly five canonical records have the spelling `what`.
- [ ] Map those records to their sequence fields and assert `new Set(sequenceNumbers).size === 1`.
- [ ] Keep soft links out of this Set assertion; they have different records and sequence allocation semantics.
- [ ] Do not assert the numeric sequence value itself, and do not rely on output ordering.

**Verification:** The test fails if one same-spelling canonical record receives a different sequence and passes when all five share any common generated sequence.

## Task 4: Run focused verification and review the diff

**Files:**
- Verify: `packages/merriam_webster_unabridged/tests/archive/termBankContent.test.ts`

- [ ] Run the archive contract test:
  `bun test packages/merriam_webster_unabridged/tests/archive/termBankContent.test.ts`
- [ ] Run formatting and lint checks for the changed test:
  `bunx biome check packages/merriam_webster_unabridged/tests/archive/termBankContent.test.ts`
- [ ] Run the focused suite serially to avoid competing real-database/archive resources:
  `bun test --max-concurrency 1 packages/merriam_webster_unabridged/tests/import_options.test.ts packages/merriam_webster_unabridged/tests/build packages/merriam_webster_unabridged/tests/source packages/merriam_webster_unabridged/tests/level1 packages/merriam_webster_unabridged/tests/conversion packages/merriam_webster_unabridged/tests/yomitan packages/merriam_webster_unabridged/tests/archive`
- [ ] Run `git diff --check`.
- [ ] Review the final diff to confirm only the requested test contract changed and no absolute sequence value or synthetic database fixture was introduced.

**Verification:** Report each gate independently: archive test, Biome, serial focused suite, and whitespace/diff check.

## Self-review checklist

- [ ] Every expected output record is covered once through the 25-record target set.
- [ ] Canonical and soft-link matchers specify all tuple fields.
- [ ] Record order is intentionally ignored, while record count and multiplicity remain enforced.
- [ ] The same-spelling relationship is tested through a Set of actual sequence numbers.
- [ ] No production files are changed.
