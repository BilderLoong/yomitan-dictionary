# Merriam-Webster Unabridged — User Manual

This manual explains how to read the dictionary entries. The dictionary is a
Yomitan-format dictionary built from the Merriam-Webster Unabridged 2024
source. Import the ZIP into Yomitan, then look up any word.

The dictionary keeps the text of the printed dictionary. Every entry follows
the printed layout, including its punctuation. This manual explains the two
punctuation marks you will see most often: the **colon** (`:`) and the
**em dash** (`—`).

## How to read an entry

An entry shows, in order:

1. the headword, with syllable dots (`pro·cess`) and a small homograph
   number when the same spelling has several entries (`1 set`, `2 set`);
2. the pronunciation, between slashes (`/ˈ(h)wät/`);
3. the part of speech (`pronoun`, `verb`, `noun`);
4. the inflected forms (`plural -s`);
5. the definitions, grouped by sense number, sense letter, and definition
   number (`1`, `a`, `(1)`);
6. examples, with the source named after them (`— Christian Science Monitor`);
7. phrases and the origin section, each in a collapsed block that opens when
   you click it.

## Tags

The gray tags beside the dictionary source describe the current definition
record. For example, `n` means that the record is a noun, and `v transitive`
means that it is a verb that normally takes a direct object. The tag bank
provides the full explanation when you hover over a tag.

The dictionary always includes its reviewed fixed functional tags. If the
source contains a functional label that is not yet reviewed, the tag starts
with `?` and has an amber dashed outline. For example, `?future_label` means
that the source label was `future label`, but the label is not in the fixed
catalog yet. This tag is source evidence, not a final classification.

Labels such as `archaic`, `slang`, or `chiefly British` are local labels. They
stay inside the definition content because they apply only to the nearby
sense, not to the whole headword.

## The colon — why definitions start with `:`

In the printed Merriam-Webster dictionary, every run-in definition starts
with a bold colon. The colon ties the definition to its sense number or to
the label before it. The digital dictionary keeps this convention; only the
bold weight is dropped.

Read the colon as **"means"**. Examples from the `what` entry:

- `: a person or thing of how much value or consequence`
- `: how much what do people generally tip`
- `: one or ones of what sort`

### One definition after another — each with its own colon

When one block holds several alternative definitions, each definition gets
its own colon, exactly as in print:

- `: that which : those which : those things that : those who or whom : the
  one or ones that`

Read it as: "that which" means, "those which" means, "those things that"
means, and so on.

### A colon after a label

A label (such as `archaic`, `slang`, `chiefly British`) applies to the
definition that follows it. The colon separates the label from the
definition:

- `slang : what is the reason for : what is wrong with`
- `archaic : 1who 1 — used predicatively in direct or indirect questions`

### Not every colon is a definition separator

Three other uses look similar but mean something else:

- **Label-value lines**: `First Known Use: before 12th century (sense 1a(1))`
  — the colon introduces the value of the label, not a definition.
- **Bible references** in example sources: `— Psalms 8:4 (Authorized
  Version)` — the colon separates chapter and verse.
- **Internal addresses** such as `bword://what` — these are machine
  addresses inside the source, never shown as text.

## The em dash — where it comes from

The em dash (`—`) is the second print convention you will see. It has three
roles:

1. **Definitions of the "used ..." style** start with an em dash instead of a
   colon. This is Merriam-Webster's own typographic rule for definitions
   that describe how a word is used:

   - `— used in direct or indirect questions as an interrogative pronoun
     expressing inquiry about the identity of an object or matter`
   - `— used predicatively in direct or indirect questions`

2. **Cross-references** inside the origin section are introduced by `— more
   at`:

   - `Middle English, from Old English hwæt ... — more at who`

3. **Example sources** are introduced by an em dash after the example:

   - `what is this — ... — Christian Science Monitor`

## The origin section

Every main entry has a collapsed section titled `Origin of WHAT` (or the
entry's own headword). It opens on click and contains:

- the etymology — where the word came from (`Middle English, from Old
  English hwæt, neuter of hwā who ...`);
- the First Known Use dateline, verbatim (`First Known Use: before 12th
  century (sense 1a(1))`).

Not every entry has a First Known Use line. The dictionary shows it only
when the source carries it.

## What this dictionary does not show

By policy, the build omits:

- pronunciation audio;
- illustrations and tables;
- the internal link targets of cross-references (the visible text stays, so
  `— more at who` remains readable);
- unused markup such as the `[+]` accordion toggles.

Everything else in the source appears in the entry, in source order.
