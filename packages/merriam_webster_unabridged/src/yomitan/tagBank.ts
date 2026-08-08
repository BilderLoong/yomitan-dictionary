export interface MwuTagDefinition {
  readonly name: string;
  readonly category: "partOfSpeech";
  readonly sortingOrder: number;
  readonly notes: string;
  readonly popularityScore: number;
}

const tag = (
  name: string,
  notes: string,
  sortingOrder = -2,
): MwuTagDefinition => ({
  name,
  category: "partOfSpeech",
  sortingOrder,
  notes,
  popularityScore: 2,
});

/**
 * These are the atomic definition-tag names emitted by the MWU `.fl` mapper.
 * Sense-local labels such as `archaic` and `slang` intentionally do not live
 * here; they remain structured content beside the sense that owns them.
 */
export const MWU_TAGS: readonly MwuTagDefinition[] = [
  tag("abbr", "abbreviation", -3),
  tag("adj", "adjective"),
  tag("adv", "adverb"),
  tag("affix", "affix", -3),
  tag("annotation", "script annotation", -3),
  tag("art", "article"),
  tag("aux", "auxiliary verb", -3),
  tag("bio", "biographical name", -3),
  tag("comb", "combining form", -3),
  tag("conj", "conjunction"),
  tag("contraction", "contraction", -3),
  tag("geo", "geographical name", -3),
  tag("interj", "interjection", -3),
  tag("n", "noun"),
  tag("phrase", "phrase"),
  tag("pl", "plural", -3),
  tag("prep", "preposition", -3),
  tag("prefix", "prefix", -3),
  tag("pron", "pronoun"),
  tag("prop", "proper noun", -3),
  tag("spelling", "pronunciation spelling", -3),
  tag("suffix", "suffix", -3),
  tag("symbol", "symbol", -3),
  tag("title", "honorific title", -3),
  tag("trademark", "trademark or service mark", -3),
  tag("v", "verb"),
];
