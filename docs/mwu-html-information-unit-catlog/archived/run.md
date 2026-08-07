# MWU HTML Survey: run

This is an evidence report for the exact lookup word run. It records a
phrase-local part-of-speech shape that is easy to mis-bind to the parent
headword.

## Source row and coverage

- Exact lookup word: run
- MWU word row: id = 330483
- Source HTML length: 115121
- Top-level <mean> blocks: 3
- .dro containers: 2
- .drp phrase labels: 31
- alt rows for the word row: 34

## Level 1 — Parent lexical entry

by the run occurs inside the run entry, under a parent noun mean. The parent
part of speech and the phrase part of speech are therefore different owners.

## .dro phrase evidence

The reduced source shape is:

    .dro
      .drp by the run
      .fl adverb
      .vg
        .sense 1
          .dt : so as to run freely
            .un — used of letting go ...
              .ex-sent → lower sail by the run
        .sense 2
          .dt : according to a measure of work ...
            .un — sometimes used in estimating ...

The .fl is immediately after the .drp, before the phrase's .vg. DOM
proximity and the phrase container show that adverb belongs to by the run,
not to the parent noun entry run.

## Level 3–6 ownership

- 1 and 2 are phrase-local numbered senses.
- The .un blocks are Level 6 usage notes attached to the corresponding
  definitions.
- lower sail by the run is an example attached to the first usage note.

## Survey conclusion

by the run must be independently searchable as a phrase with its own
phrase-level part-of-speech label. The parent run entry should retain its
.dro section, but the parent noun label must not be copied over the local
adverb label.
