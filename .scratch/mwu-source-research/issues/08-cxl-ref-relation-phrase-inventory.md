# 08 — cxl-ref relation-phrase inventory

Status: resolved 2026-08-13 (research only; the approval decision is open).

## Question

The `.cxl-ref` cross-reference can carry relation phrases other than `plural of`.
What phrases exist in the source data, and how many references use them?

## Source

- Database: `packages/merriam_webster_unabridged/assets/MWU.db`, table `word(id, w, m)` (470,444 rows).
- Scan script: `.scratch/mwu-source-research/research-cxl-inventory.ts` (`bun run` it; ~35 s).
- Every `.cxl-ref` paragraph has exactly one `.cxl` span. All 21,004 `.cxt` hrefs are `bword://`; none is `gdlookup://` (that form is the Yomitan-rendered output, not the source).
- No `.cxl` span exists outside a `.cxl-ref` container.

## Counts

| Measure | Value |
|---|---|
| Rows containing `.cxl-ref` | 17,861 |
| `.cxl-ref` paragraphs | 20,495 |
| Distinct relation phrases | 191 |
| References with more than one `.cxt` anchor | 336 |
| References whose relation is only a continuation (`or of`, `or`, `and of`, `and`) | 132 |

## Families

| Family | Phrases | References | Share |
|---|---|---|---|
| spelling/variant | 68 | 9004 | 43.9% |
| inflection | 117 | 9740 | 47.5% |
| synonym | 2 | 1619 | 7.9% |
| continuation | 4 | 132 | 0.6% |

## Current behavior (docs cross-check)

- `src/level1/planLinks.ts` `VARIANT_RELATION_PHRASES` approves exactly 8 phrases (case-insensitive):
  `variant spelling of`, `variant of`, `archaic variant of`, `obsolete variant of`, `dialectal variant of`, `Scottish variant of`, `chiefly Scottish variant of`, `chiefly British spelling of`.
- That set covers 7415 of 20,495 references (36.2%). Everything else becomes a `cxl-ref-not-emitted` finding (reason `unapproved-relation`).
- `openspec/specs/mwu-level-1-entry-generation/spec.md`, Requirement "Extract cxl-ref targets and rules conservatively": the same 8 phrases; `plural of`, `synonym of`, `taxonomic synonym of`, and `and of` continuations are the documented negative cases.
- `.scratch/mwu-implementation/issues/01-cxl-ref-variant-reference-soft-link.md`: implementation notes, same family.
- `docs/archive/2026-08-06-mwu-level-1-entry-generation.md`: same family; catalog `docs/mwu-html-information-unit-catlog/README.md` classifies `.cxl-ref`/`.cxl`/`.cxt` as the `variant-reference` information unit (Level 1).

## Findings that matter for the approval decision

1. `plural of` is the most common phrase of all: 4,172 references (20.4%), ahead of `variant spelling of` (3,319). The current build drops all of them.
2. The inflection family is the largest: `present tense third person singular of` (2,057), `taxonomic synonym of` (1,609), `present participle of` (892), `past tense of` (875), `superlative of` (463), `comparative of` (457), `past tense and past participle of` (179), plus `singular of`, `objective case of`, `possessive of`, and the count-1 tail.
3. The approved list is exact-match, so it also drops variant-family phrases outside the 8: `dialectal British variant of` (131), `less common variant of` (107), `chiefly British variant of` (65), `British variant of` (9), `now dialectal variant of` (17), `substandard variant of` (10), `variant spellings of` (22), `variants of` (5), `chiefly British spellings of` (65), `British spellings of` (63), `less common spellings of` (66).
   Variant-family but currently unapproved: 1589 references (7.8%).
4. Continuations: all 132 (`or of` 113, `or` 16, `and of` 1, `and` 2) directly follow a sibling `.cxl-ref` in the same parent element — the relation text continues from the previous paragraph. Approving `plural of` without joining continuations still leaves `or of` paragraphs as findings.
5. 336 references carry two or more `.cxt` anchors for one relation (example: `variant of aquacultural, aquaculture`). The current planner reads only the first anchor.
6. The data has legacy shorthand and typos: `present 3d singular of`, `pres part of`, `past part of`, `past and past part of`, `past particple of` (sic). The matcher needs tolerance or normalization.
7. The count-1 tail is combinatorial (person/number/mood qualifiers): exact-list matching does not scale; a structured matcher (family + qualifier tokens) is the long-term shape.

## Appendix — full inventory (191 phrases)

| Count | Phrase | Family |
|---|---|---|
| 4172 | plural of | inflection |
| 3319 | variant spelling of | spelling/variant |
| 2387 | variant of | spelling/variant |
| 2057 | present tense third person singular of | inflection |
| 1609 | taxonomic synonym of | synonym |
| 892 | present participle of | inflection |
| 875 | past tense of | inflection |
| 463 | superlative of | inflection |
| 459 | less common spelling of | spelling/variant |
| 457 | comparative of | inflection |
| 385 | Scottish variant of | spelling/variant |
| 322 | dialectal variant of | spelling/variant |
| 290 | archaic variant of | spelling/variant |
| 279 | chiefly British spelling of | spelling/variant |
| 227 | British spelling of | spelling/variant |
| 219 | chiefly Scottish variant of | spelling/variant |
| 214 | obsolete variant of | spelling/variant |
| 179 | past tense and past participle of | inflection |
| 131 | dialectal British variant of | spelling/variant |
| 113 | or of | continuation |
| 107 | less common variant of | spelling/variant |
| 105 | past participle of | inflection |
| 102 | dialectal English variant of | spelling/variant |
| 79 | chiefly dialectal variant of | spelling/variant |
| 66 | less common spellings of | spelling/variant |
| 65 | chiefly British spellings of | spelling/variant |
| 65 | chiefly British variant of | spelling/variant |
| 63 | British spellings of | spelling/variant |
| 49 | archaic past tense of | inflection |
| 43 | dialectal past tense of | inflection |
| 34 | objective case of | inflection |
| 27 | past of | inflection |
| 25 | archaic spelling of | spelling/variant |
| 25 | present tense third-person singular of | inflection |
| 23 | archaic past tense second-person singular of | inflection |
| 22 | variant spellings of | spelling/variant |
| 20 | archaic present tense second-person singular of | inflection |
| 18 | Scottish and dialectal English variant of | spelling/variant |
| 17 | now dialectal variant of | spelling/variant |
| 17 | past and past part of | inflection |
| 16 | less common variants of | spelling/variant |
| 16 | or | continuation |
| 14 | archaic past participle of | inflection |
| 13 | chiefly dialectal past tense of | inflection |
| 12 | archaic plural of | inflection |
| 11 | Scottish past tense of | inflection |
| 11 | past part of | inflection |
| 10 | archaic present tense second person singular of | inflection |
| 10 | singular of | inflection |
| 10 | substandard variant of | spelling/variant |
| 10 | synonym of | synonym |
| 9 | British variant of | spelling/variant |
| 8 | Scottish and Irish variant of | spelling/variant |
| 8 | archaic past tense second person singular of | inflection |
| 8 | archaic present tense third-person singular of | inflection |
| 8 | chiefly British past tense of | inflection |
| 8 | chiefly dialectal plural of | inflection |
| 8 | dialectal chiefly British variant of | spelling/variant |
| 8 | dialectal past tense and past participle of | inflection |
| 8 | obsolete possessive form of | inflection |
| 7 | substandard past tense of | inflection |
| 6 | archaic Scottish variant of | spelling/variant |
| 6 | chiefly British variants of | spelling/variant |
| 6 | dialectal British past tense of | inflection |
| 6 | past tense & dialectal past participle of | inflection |
| 6 | past tense and chiefly dialectal past participle of | inflection |
| 5 | archaic present tense third person singular of | inflection |
| 5 | chiefly Midland variant of | spelling/variant |
| 5 | chiefly Scottish past tense of | inflection |
| 5 | disputed spelling variant of | spelling/variant |
| 5 | past tense & substandard past participle of | inflection |
| 5 | variants of | spelling/variant |
| 4 | archaic or dialectal variant of | spelling/variant |
| 4 | chiefly British past tense and past participle of | inflection |
| 4 | dialectal past participle of | inflection |
| 4 | dialectal present tense first-person and third-person singular of | inflection |
| 4 | dialectal present tense plural of | inflection |
| 4 | now chiefly Scottish variant of | spelling/variant |
| 4 | now chiefly dialectal past tense of | inflection |
| 4 | past tense & chiefly dialectal past participle of | inflection |
| 4 | pres part of | inflection |
| 3 | Irish variant of | spelling/variant |
| 3 | Southern and Midland variant of | spelling/variant |
| 3 | chiefly Irish variant of | spelling/variant |
| 3 | comparative form of the adjective | inflection |
| 3 | dialectal chiefly English variant of | spelling/variant |
| 3 | nonstandard spelling of | spelling/variant |
| 3 | nonstandard variant of | spelling/variant |
| 3 | now chiefly dialectal variant of | spelling/variant |
| 3 | now dialectal past tense of | inflection |
| 3 | past and past participle of | inflection |
| 3 | past tense first- and third-person singular of | inflection |
| 3 | past tense second-person singular, past tense plural, and past subjunctive of | inflection |
| 3 | present tense first-person singular of | inflection |
| 3 | present tense second-person singular and present tense plural of | inflection |
| 2 | Australian variant of | spelling/variant |
| 2 | Irish and Scottish variant of | spelling/variant |
| 2 | Scottish or dialectal variant of | spelling/variant |
| 2 | Scottish past participle of | inflection |
| 2 | and | continuation |
| 2 | and less common spelling of | spelling/variant |
| 2 | archaic and dialectal past tense of | inflection |
| 2 | archaic objective case of | inflection |
| 2 | archaic second person singular of | inflection |
| 2 | chiefly Scottish past participle of | inflection |
| 2 | chiefly Southern and Midland variant of | spelling/variant |
| 2 | chiefly dialectal British variant of | spelling/variant |
| 2 | chiefly dialectal past participle of | inflection |
| 2 | chiefly dialectal past tense and past participle of | inflection |
| 2 | dialectal British present tense second person singular of | inflection |
| 2 | dialectal chiefly British past participle of | inflection |
| 2 | dialectal chiefly British past tense of | inflection |
| 2 | dialectal variant in England of | spelling/variant |
| 2 | former variant spelling of | spelling/variant |
| 2 | now dialectal British variant of | spelling/variant |
| 2 | past participle & substandard past tense of | inflection |
| 2 | past tense & archaic past participle of | inflection |
| 2 | past tense & chiefly dialectal past particple of | inflection |
| 2 | past tense & obsolete past participle of | inflection |
| 2 | past tense and archaic past participle of | inflection |
| 2 | past tense and dialectal past participle of | inflection |
| 2 | present tense first- and third-person singular of | inflection |
| 1 | Midland variant of | spelling/variant |
| 1 | New England variant of | spelling/variant |
| 1 | Northern variant of | spelling/variant |
| 1 | Scottish plural of | inflection |
| 1 | Scottish present participle of | inflection |
| 1 | Scottish present tense third person singular of | inflection |
| 1 | Southern and Midland US spelling of | spelling/variant |
| 1 | Southern variant of | spelling/variant |
| 1 | and of | continuation |
| 1 | archaic comparative of | inflection |
| 1 | archaic or dialectal past participle of | inflection |
| 1 | archaic or dialectal past tense of | inflection |
| 1 | archaic or nonstandard past tense of | inflection |
| 1 | archaic past tense second person singular & archaic past subjunctive second person singular of | inflection |
| 1 | archaic superlative of | inflection |
| 1 | archaic third person singular of | inflection |
| 1 | archaic variant spelling of | spelling/variant |
| 1 | archaic variants of | spelling/variant |
| 1 | chiefly Australian variant of | spelling/variant |
| 1 | chiefly British past participle of | inflection |
| 1 | chiefly British plural of | inflection |
| 1 | chiefly British variant spelling of | spelling/variant |
| 1 | chiefly British variant spellings of | spelling/variant |
| 1 | chiefly Midland past tense of | inflection |
| 1 | chiefly Scottish and Irish variant of | spelling/variant |
| 1 | chiefly Scottish present tense plural and first person singular & Scottish present tense second person singular of | inflection |
| 1 | chiefly dialectal comparative of | inflection |
| 1 | dialectal British or archaic present tense plural of | inflection |
| 1 | dialectal British present participle of | inflection |
| 1 | dialectal British present tense first and second person singular & present tense plural of | inflection |
| 1 | dialectal British present tense plural of | inflection |
| 1 | dialectal English and Scottish variant of | spelling/variant |
| 1 | dialectal Scottish variant of | spelling/variant |
| 1 | dialectal chiefly British plural of | inflection |
| 1 | dialectal or archaic past tense second person singular of | inflection |
| 1 | dialectal or archaic variant of | spelling/variant |
| 1 | dialectal plural of | inflection |
| 1 | dialectal present participle of | inflection |
| 1 | dialectal present tense first and second person singular of | inflection |
| 1 | formerly common but now old-fashioned, increasingly rare, and sometimes offensive variant of | spelling/variant |
| 1 | now chiefly dialectal past participle of | inflection |
| 1 | now dialectal past participle of | inflection |
| 1 | now dialectal plural of | inflection |
| 1 | obsolete present subjunctive second person singular of | inflection |
| 1 | obsolete spelling variant of | spelling/variant |
| 1 | often vulgar, less common spelling of | spelling/variant |
| 1 | or dialectal past participle of | inflection |
| 1 | or obsolete plural of | inflection |
| 1 | or present tense third person singular of | inflection |
| 1 | past participle & Southern past tense of | inflection |
| 1 | past participle & chiefly dialectal past tense of | inflection |
| 1 | past participle & dialectal past tense of | inflection |
| 1 | past participle and past tense of | inflection |
| 1 | past tense first and third person singular of | inflection |
| 1 | past tense second person singular, past tense plural, and past subjunctive, & dialectal past tense first and third person singular of | inflection |
| 1 | past tense third person singular of | inflection |
| 1 | possessive of | inflection |
| 1 | present 3d singular of | inflection |
| 1 | present tense first and third person singular of | inflection |
| 1 | present tense first person singular of | inflection |
| 1 | present tense second person singular & present tense plural of | inflection |
| 1 | present tense third person singular & chiefly dialectal present tense first person singular of | inflection |
| 1 | spelling variant of | spelling/variant |
| 1 | substandard comparative of | inflection |
| 1 | substandard or archaic past subjunctive of | inflection |
| 1 | substandard or archaic past tense plural of | inflection |
| 1 | substandard present tense plural of | inflection |
| 1 | substandard present tense singular and plural of | inflection |
| 1 | third person present singular of | inflection |
