import * as cheerio from "cheerio";
import type { Element } from "domhandler";

export type FunctionalTagCategory = "partOfSpeech" | "unmappedPartOfSpeech";

export interface FunctionalTagDefinition {
  readonly name: string;
  readonly category: FunctionalTagCategory;
  readonly order: number;
  readonly note: string;
  readonly score: 0;
}

export interface UnmappedFunctionalLabelFinding {
  readonly kind: "unmapped-functional-label";
  readonly rowId: number;
  readonly term: string;
  readonly rawLabel: string;
  readonly normalizedLabel: string;
  readonly tag: string;
}

export interface FunctionalLabelSample {
  readonly rowId: number;
  readonly term: string;
}

export interface DynamicFunctionalLabelSummary {
  readonly tag: string;
  readonly normalizedLabel: string;
  readonly count: number;
  readonly samples: readonly FunctionalLabelSample[];
}

export type FunctionalLabelResolution =
  | {
      readonly kind: "absent";
      readonly rawLabel: null;
      readonly normalizedLabel: null;
      readonly tags: readonly string[];
      readonly dynamicTag: null;
    }
  | {
      readonly kind: "fixed";
      readonly rawLabel: string;
      readonly normalizedLabel: string;
      readonly tags: readonly string[];
      readonly dynamicTag: null;
    }
  | {
      readonly kind: "dynamic";
      readonly rawLabel: string;
      readonly normalizedLabel: string;
      readonly tags: readonly [string];
      readonly dynamicTag: FunctionalTagDefinition;
    };

const fixedTag = (
  name: string,
  order: number,
  note: string,
): FunctionalTagDefinition => ({
  name,
  category: "partOfSpeech",
  order,
  note,
  score: 0,
});

const FIXED_TAGS: readonly FunctionalTagDefinition[] = [
  fixedTag("n", 100, "Noun"),
  fixedTag("v", 110, "Verb: a word that expresses an action, event, or state."),
  fixedTag("adj", 120, "Adjective: a word that describes a noun or pronoun."),
  fixedTag("adv", 130, "Adverb"),
  fixedTag("pron", 140, "Pronoun"),
  fixedTag("prep", 150, "Preposition"),
  fixedTag(
    "conj",
    160,
    "Conjunction: a word that joins words, phrases, or clauses.",
  ),
  fixedTag(
    "interj",
    170,
    "Interjection: a word or short expression that shows feeling or a sudden reaction.",
  ),
  fixedTag("abbr", 180, "Abbreviation: a shortened form of a word or phrase."),
  fixedTag(
    "symbol",
    190,
    "Symbol: a character or mark used to represent something.",
  ),
  fixedTag("phrase", 200, "Phrase"),
  fixedTag(
    "article",
    210,
    "Article: a word such as the or a that introduces a noun.",
  ),
  fixedTag(
    "definite",
    220,
    "Definite article: identifies a specific person, thing, or group; for example, the.",
  ),
  fixedTag(
    "indefinite",
    230,
    "Indefinite article: identifies a non-specific person or thing; for example, a or an.",
  ),
  fixedTag(
    "transitive",
    240,
    "Transitive verb: normally takes a direct object; the action passes to something.",
  ),
  fixedTag(
    "intransitive",
    241,
    "Intransitive verb: normally does not take a direct object.",
  ),
  fixedTag(
    "imperative",
    242,
    "Imperative verb: a verb form used for a command or request.",
  ),
  fixedTag(
    "impersonal",
    243,
    "Impersonal verb: a verb used without a normal personal subject.",
  ),
  fixedTag(
    "past",
    244,
    "Past verb: a verb form that refers to an earlier time.",
  ),
  fixedTag(
    "past-participle",
    245,
    "Past participle: a verb form used in perfect or passive constructions and sometimes as an adjective.",
  ),
  fixedTag(
    "aux",
    246,
    "Auxiliary verb: a helping verb used with another verb.",
  ),
  fixedTag(
    "prefix",
    300,
    "Prefix: a word element placed at the beginning of another word or element.",
  ),
  fixedTag(
    "suffix",
    310,
    "Suffix: a word element placed at the end of another word or element.",
  ),
  fixedTag(
    "comb",
    320,
    "Combining form: a word element that joins with another element to make a word.",
  ),
  fixedTag(
    "noun-forming",
    330,
    "Noun-forming element: an element that helps form a noun.",
  ),
  fixedTag(
    "plural-noun-forming",
    331,
    "Plural-noun-forming element: an element that helps form a plural noun.",
  ),
  fixedTag(
    "verb-forming",
    332,
    "Verb-forming element: an element that helps form a verb.",
  ),
  fixedTag(
    "adjective-forming",
    333,
    "Adjective-forming element: an element that helps form an adjective.",
  ),
  fixedTag(
    "adverb-forming",
    334,
    "Adverb-forming element: an element that helps form an adverb.",
  ),
  fixedTag(
    "pronoun-forming",
    335,
    "Pronoun-forming element: an element that helps form a pronoun.",
  ),
  fixedTag(
    "interjection-forming",
    336,
    "Interjection-forming element: an element that helps form an interjection.",
  ),
  fixedTag(
    "singular-form",
    500,
    "Singular form: the form used for one person, thing, or group.",
  ),
  fixedTag(
    "plural-form",
    501,
    "Plural form: the form used for more than one person, thing, or group.",
  ),
  fixedTag(
    "takes-singular-verb",
    510,
    "Takes a singular verb in the source's stated construction.",
  ),
  fixedTag(
    "takes-plural-verb",
    511,
    "Takes a plural verb in the source's stated construction.",
  ),
  fixedTag(
    "takes-singular-or-plural-verb",
    512,
    "Can take either a singular or a plural verb, depending on use.",
  ),
  fixedTag(
    "often-takes-singular-verb",
    513,
    "Often takes a singular verb, but other usage is also found.",
  ),
  fixedTag(
    "sometimes-takes-singular-verb",
    514,
    "Sometimes takes a singular verb, but other usage is also found.",
  ),
  fixedTag(
    "usually-takes-singular-verb",
    515,
    "Usually takes a singular verb, although exceptions occur.",
  ),
  fixedTag(
    "usually-takes-plural-verb",
    516,
    "Usually takes a plural verb, although exceptions occur.",
  ),
  fixedTag(
    "sometimes-takes-plural-verb",
    517,
    "Sometimes takes a plural verb, but other usage is also found.",
  ),
  fixedTag(
    "geographical-name",
    600,
    "Geographical name: the name of a place or geographic feature.",
  ),
  fixedTag(
    "trademark",
    610,
    "Trademark: a protected name, word, or symbol used for a product or service.",
  ),
  fixedTag(
    "service-mark",
    611,
    "Service mark: a protected name, word, or symbol used for a service.",
  ),
  fixedTag(
    "certification-mark",
    612,
    "Certification mark: a protected mark showing that a product or service meets a stated standard.",
  ),
  fixedTag(
    "collective-mark",
    613,
    "Collective mark: a protected mark used by members of an organization or group.",
  ),
];

const NORMALIZED_LABEL_TAGS: Readonly<Record<string, readonly string[]>> = {
  abbreviation: ["abbr"],
  "abbreviation or noun": ["abbr", "n"],
  adjective: ["adj"],
  "adjective (or adverb)": ["adj", "adv"],
  "adjective combining form": ["comb", "adjective-forming"],
  "adjective combining form or noun combining form": [
    "comb",
    "adjective-forming",
    "noun-forming",
  ],
  "adjective or adverb": ["adj", "adv"],
  "adjective or adverb or conjunction or noun": ["adj", "adv", "conj", "n"],
  "adjective or adverb or noun": ["adj", "adv", "n"],
  "adjective or adverb or preposition": ["adj", "adv", "prep"],
  "adjective or noun": ["adj", "n"],
  "adjective or noun or pronoun": ["adj", "n", "pron"],
  "adjective or pronoun": ["adj", "pron"],
  "adjective or pronoun or conjunction": ["adj", "conj", "pron"],
  "adjective suffix": ["suffix", "adjective-forming"],
  "adjective suffix or adverb suffix": [
    "suffix",
    "adjective-forming",
    "adverb-forming",
  ],
  "adjective, adverb, or noun": ["adj", "adv", "n"],
  adverb: ["adv"],
  "adverb (or adjective)": ["adv", "adj"],
  "adverb combining form": ["comb", "adverb-forming"],
  "adverb or adjective": ["adv", "adj"],
  "adverb or adjective or noun": ["adv", "adj", "n"],
  "adverb or conjunction": ["adv", "conj"],
  "adverb or conjunction or preposition": ["adv", "conj", "prep"],
  "adverb or preposition": ["adv", "prep"],
  "adverb suffix": ["suffix", "adverb-forming"],
  "certification mark": ["certification-mark"],
  "collective mark": ["collective-mark"],
  "combining form": ["comb"],
  conjunction: ["conj"],
  "definite article": ["article", "definite"],
  "geographical name": ["geographical-name"],
  "imperative verb": ["v", "imperative"],
  "indefinite article": ["article", "indefinite"],
  interjection: ["interj"],
  "interjection suffix": ["suffix", "interjection-forming"],
  "intransitive verb": ["v", "intransitive"],
  noun: ["n"],
  "noun combining form": ["comb", "noun-forming"],
  "noun combining form or adjective combining form": [
    "comb",
    "noun-forming",
    "adjective-forming",
  ],
  "noun or abbreviation": ["n", "abbr"],
  "noun or adjective": ["n", "adj"],
  "noun or adjective or adverb": ["n", "adj", "adv"],
  "noun or adverb": ["n", "adv"],
  "noun or adverb or intransitive verb": ["n", "adv", "v", "intransitive"],
  "noun or interjection": ["n", "interj"],
  "noun or intransitive verb": ["n", "v", "intransitive"],
  "noun or verb": ["n", "v"],
  "noun plural": ["n", "plural-form", "takes-plural-verb"],
  "noun plural but often singular in construction": [
    "n",
    "plural-form",
    "often-takes-singular-verb",
  ],
  "noun plural but singular in construction": [
    "n",
    "plural-form",
    "takes-singular-verb",
  ],
  "noun plural but singular or plural in construction": [
    "n",
    "plural-form",
    "takes-singular-or-plural-verb",
  ],
  "noun plural but sometimes singular in construction": [
    "n",
    "plural-form",
    "sometimes-takes-singular-verb",
  ],
  "noun plural but usually singular in construction": [
    "n",
    "plural-form",
    "usually-takes-singular-verb",
  ],
  "noun plural combining form": ["comb", "plural-noun-forming"],
  "noun plural combining form, usually singular in construction": [
    "comb",
    "plural-noun-forming",
    "usually-takes-singular-verb",
  ],
  "noun plural in form but usually singular in construction": [
    "n",
    "plural-form",
    "usually-takes-singular-verb",
  ],
  "noun plural suffix": ["suffix", "plural-noun-forming"],
  "noun plural suffix but singular or plural in construction": [
    "suffix",
    "plural-noun-forming",
    "takes-singular-or-plural-verb",
  ],
  "noun singular but singular or plural in construction": [
    "n",
    "singular-form",
    "takes-singular-or-plural-verb",
  ],
  "noun suffix": ["suffix", "noun-forming"],
  "noun suffix or pronoun suffix": [
    "suffix",
    "noun-forming",
    "pronoun-forming",
  ],
  "noun, plural in construction": ["n", "takes-plural-verb"],
  "noun, plural in form but often singular in construction": [
    "n",
    "plural-form",
    "often-takes-singular-verb",
  ],
  "noun, plural in form but singular in construction": [
    "n",
    "plural-form",
    "takes-singular-verb",
  ],
  "noun, plural in form but singular or plural in construction": [
    "n",
    "plural-form",
    "takes-singular-or-plural-verb",
  ],
  "noun, plural in form but sometimes singular in construction": [
    "n",
    "plural-form",
    "sometimes-takes-singular-verb",
  ],
  "noun, plural in form but usually singular in construction": [
    "n",
    "plural-form",
    "usually-takes-singular-verb",
  ],
  "noun, singular or plural in construction": [
    "n",
    "takes-singular-or-plural-verb",
  ],
  "noun, usually plural in construction": ["n", "usually-takes-plural-verb"],
  "past participle": ["v", "past-participle"],
  "plural noun": ["n", "plural-form", "takes-plural-verb"],
  "plural noun but singular or plural in construction": [
    "n",
    "plural-form",
    "takes-singular-or-plural-verb",
  ],
  "plural noun but usually singular in construction": [
    "n",
    "plural-form",
    "usually-takes-singular-verb",
  ],
  "plural noun suffix": ["suffix", "plural-noun-forming"],
  "plural pronoun": ["pron", "plural-form", "takes-plural-verb"],
  prefix: ["prefix"],
  preposition: ["prep"],
  "preposition or adverb": ["prep", "adv"],
  pronoun: ["pron"],
  "pronoun or adjective": ["pron", "adj"],
  "pronoun, plural in construction": ["pron", "takes-plural-verb"],
  "pronoun, singular or plural in construction": [
    "pron",
    "takes-singular-or-plural-verb",
  ],
  "pronoun, sometimes plural in construction": [
    "pron",
    "sometimes-takes-plural-verb",
  ],
  "service mark": ["service-mark"],
  suffix: ["suffix"],
  symbol: ["symbol"],
  trademark: ["trademark"],
  "transitive verb": ["v", "transitive"],
  "transitive verb or adjective": ["v", "transitive", "adj"],
  verb: ["v"],
  "verb combining form": ["comb", "verb-forming"],
  "verb impersonal": ["v", "impersonal"],
  "verb past": ["v", "past"],
  "verb suffix": ["suffix", "verb-forming"],
  "verb suffix or adjective suffix": [
    "suffix",
    "verb-forming",
    "adjective-forming",
  ],
  "verb, transitive + intransitive": ["v", "transitive", "intransitive"],
  "verbal auxiliary": ["v", "aux"],
};

const tagByName = (name: string): FunctionalTagDefinition | undefined =>
  FIXED_TAGS.find((tag: FunctionalTagDefinition): boolean => tag.name === name);

const normalizedTagNames = (tags: readonly string[]): readonly string[] =>
  tags
    .filter(
      (tag: string, index: number, all: readonly string[]): boolean =>
        all.indexOf(tag) === index,
    )
    .toSorted((left: string, right: string): number => {
      const leftTag = tagByName(left);
      const rightTag = tagByName(right);
      const leftOrder = leftTag?.order ?? 9000;
      const rightOrder = rightTag?.order ?? 9000;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.localeCompare(right);
    });

export const sortFunctionalTagNames = (
  tags: readonly string[],
): readonly string[] => normalizedTagNames(tags);

const encodeDynamicTag = (normalizedLabel: string): string =>
  `?${[...normalizedLabel]
    .map((character: string): string => {
      if (character === " ") return "_";
      if (character === "_") return "%5F";
      return /^[A-Za-z0-9-]$/u.test(character)
        ? character
        : encodeURIComponent(character);
    })
    .join("")}`;

export const decodeDynamicTag = (
  tagName: string,
):
  | { readonly kind: "decoded"; readonly value: string }
  | { readonly kind: "invalid"; readonly value: string } => {
  if (!tagName.startsWith("?")) {
    return { kind: "invalid", value: tagName };
  }

  try {
    return {
      kind: "decoded",
      value: decodeURIComponent(tagName.slice(1).replaceAll("_", " ")),
    };
  } catch (_error: unknown) {
    return { kind: "invalid", value: tagName };
  }
};

export const normalizeFunctionalLabel = (rawLabel: string): string =>
  rawLabel.replace(/\s+/gu, " ").trim();

export const fixedFunctionalTagDefinitions =
  (): readonly FunctionalTagDefinition[] => [...FIXED_TAGS];

export const mappedFunctionalLabelNames = (): readonly string[] =>
  Object.keys(NORMALIZED_LABEL_TAGS).toSorted(
    (left: string, right: string): number => left.localeCompare(right),
  );

export const resolveFunctionalLabel = (
  rawLabel: string | null,
): FunctionalLabelResolution => {
  if (rawLabel === null) {
    return {
      kind: "absent",
      rawLabel: null,
      normalizedLabel: null,
      tags: [],
      dynamicTag: null,
    };
  }

  const normalizedLabel = normalizeFunctionalLabel(rawLabel);
  if (normalizedLabel.length === 0) {
    return {
      kind: "absent",
      rawLabel: null,
      normalizedLabel: null,
      tags: [],
      dynamicTag: null,
    };
  }

  const fixedTags = NORMALIZED_LABEL_TAGS[normalizedLabel];
  if (fixedTags !== undefined) {
    return {
      kind: "fixed",
      rawLabel,
      normalizedLabel,
      tags: normalizedTagNames(fixedTags),
      dynamicTag: null,
    };
  }

  const dynamicTag = createDynamicFunctionalTagDefinition(normalizedLabel);
  return {
    kind: "dynamic",
    rawLabel,
    normalizedLabel,
    tags: [dynamicTag.name],
    dynamicTag,
  };
};

const createDynamicFunctionalTagDefinition = (
  normalizedLabel: string,
): FunctionalTagDefinition => ({
  name: encodeDynamicTag(normalizedLabel),
  category: "unmappedPartOfSpeech",
  order: 9000,
  note: `Source functional label “${normalizedLabel}” is not in the fixed catalog.`,
  score: 0,
});

const compareSamples = (
  left: FunctionalLabelSample,
  right: FunctionalLabelSample,
): number => left.rowId - right.rowId || left.term.localeCompare(right.term);

const sortedUniqueSamples = (
  findings: readonly UnmappedFunctionalLabelFinding[],
): readonly FunctionalLabelSample[] =>
  findings
    .map(
      ({
        rowId,
        term,
      }: UnmappedFunctionalLabelFinding): FunctionalLabelSample => ({
        rowId,
        term,
      }),
    )
    .toSorted(compareSamples)
    .filter(
      (
        sample: FunctionalLabelSample,
        index: number,
        all: readonly FunctionalLabelSample[],
      ): boolean =>
        index === 0 ||
        all[index - 1]?.rowId !== sample.rowId ||
        all[index - 1]?.term !== sample.term,
    )
    .slice(0, 5);

export const summarizeDynamicFunctionalLabels = (
  findings: readonly UnmappedFunctionalLabelFinding[],
): readonly DynamicFunctionalLabelSummary[] =>
  Object.entries(
    Object.groupBy(
      findings,
      ({ normalizedLabel }: UnmappedFunctionalLabelFinding): string =>
        normalizedLabel,
    ),
  )
    .flatMap(
      ([
        normalizedLabel,
        groupedFindings,
      ]): readonly DynamicFunctionalLabelSummary[] =>
        groupedFindings === undefined
          ? []
          : [
              {
                tag: createDynamicFunctionalTagDefinition(normalizedLabel).name,
                normalizedLabel,
                count: groupedFindings.length,
                samples: sortedUniqueSamples(groupedFindings),
              },
            ],
    )
    .toSorted(
      (
        left: DynamicFunctionalLabelSummary,
        right: DynamicFunctionalLabelSummary,
      ): number => left.normalizedLabel.localeCompare(right.normalizedLabel),
    );

export const dynamicFunctionalTagDefinitions = (
  findings: readonly UnmappedFunctionalLabelFinding[],
): readonly FunctionalTagDefinition[] =>
  summarizeDynamicFunctionalLabels(findings).map(
    ({
      normalizedLabel,
    }: DynamicFunctionalLabelSummary): FunctionalTagDefinition =>
      createDynamicFunctionalTagDefinition(normalizedLabel),
  );

export const isUnmappedFunctionalLabelFinding = (finding: {
  readonly kind: string;
}): finding is UnmappedFunctionalLabelFinding =>
  finding.kind === "unmapped-functional-label";

export const validateFunctionalLabelCoverage = (
  labels: readonly string[],
): readonly string[] =>
  labels
    .map(normalizeFunctionalLabel)
    .filter(
      (label: string, index: number, all: readonly string[]): boolean =>
        all.indexOf(label) === index &&
        NORMALIZED_LABEL_TAGS[label] === undefined,
    )
    .toSorted((left: string, right: string): number =>
      left.localeCompare(right),
    );

export const ownedFunctionalLabelFromOwner = (
  root: cheerio.CheerioAPI,
  owner: Element,
): string | null => {
  const label = root(owner)
    .find(".fl")
    .toArray()
    .find(
      (candidate: Element): boolean =>
        root(candidate).closest("mean, .dro, .uro").get(0) === owner,
    );
  return label === undefined ? null : root(label).text();
};

export const ownedFunctionalLabel = (ownerHtml: string): string | null => {
  const root = cheerio.load(ownerHtml, null, false);
  const mean = root("mean").first().get(0);
  const phrase = root(".dro").first().get(0);
  const owner = mean ?? phrase ?? root.root().children().first().get(0);
  return owner === undefined
    ? null
    : ownedFunctionalLabelFromOwner(root, owner);
};
