import { describe, expect, test } from "bun:test";
import type { DictionaryTermBankV3 } from "yomichan-dict-builder/dist/types/yomitan/termbank";

type JsonObject = Record<string, unknown>;

const termBankPath = new URL("./what/term_bank_1.json", import.meta.url);
const termBank = JSON.parse(
  await Bun.file(termBankPath).text(),
) as DictionaryTermBankV3;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nodeChildren = (value: unknown): readonly unknown[] => {
  if (Array.isArray(value)) return value;
  if (!isObject(value)) return [];
  const content = value.content;
  if (Array.isArray(content)) return content;
  return content === undefined ? [] : [content];
};

const textContent = (value: unknown): string => {
  if (typeof value === "string") return value;
  return nodeChildren(value).map(textContent).join("");
};

const allNodes = (value: unknown): JsonObject[] => {
  if (Array.isArray(value)) return value.flatMap(allNodes);
  if (!isObject(value)) return [];
  return [value, ...nodeChildren(value).flatMap(allNodes)];
};

const unitOf = (node: JsonObject): string | undefined => {
  const data = node.data;
  return isObject(data) && typeof data.content === "string"
    ? data.content
    : undefined;
};

const structuredRoots = (entry: (typeof termBank)[number]): JsonObject[] =>
  entry[5].flatMap((definition) => {
    if (!isObject(definition) || definition.type !== "structured-content") {
      return [];
    }
    return isObject(definition.content) ? [definition.content] : [];
  });

const entryNodes = (entry: (typeof termBank)[number]): JsonObject[] =>
  structuredRoots(entry).flatMap(allNodes);

const nodesFor = (
  entry: (typeof termBank)[number],
  unit: string,
): JsonObject[] => entryNodes(entry).filter((node) => unitOf(node) === unit);

const entriesForTerm = (term: string): (typeof termBank)[number][] =>
  termBank.filter(([entryTerm]) => entryTerm === term);

const firstOf = (
  entries: (typeof termBank)[number][],
): (typeof termBank)[number] => {
  const entry = entries[0];
  if (entry === undefined) {
    throw new Error("expected at least one entry in the fixture");
  }
  return entry;
};

const visibleExampleCount = (node: JsonObject): number =>
  nodeChildren(node).filter(
    (child) => isObject(child) && unitOf(child) === "example-sentence",
  ).length;

const allDirectExampleCounts = (value: unknown): number[] => {
  if (Array.isArray(value)) return value.flatMap(allDirectExampleCounts);
  if (!isObject(value)) return [];
  if (unitOf(value) === "extra-examples") return [];
  return [
    visibleExampleCount(value),
    ...nodeChildren(value).flatMap(allDirectExampleCounts),
  ];
};

describe("hand-authored MWU Yomitan design fixture", () => {
  test("keeps the five Level 1 what entries and WTY-style POS tags", () => {
    const entries = entriesForTerm("what");

    expect(entries).toHaveLength(5);
    expect(entries.map((entry) => entry[2])).toEqual([
      "pron",
      "adv",
      "adj",
      "n",
      "conj",
    ]);
    expect(entries.every((entry) => entry[1] === "")).toBe(true);
    expect(entries.every((entry) => entry[6] === 1001)).toBe(true);
  });

  test("contains the real text units needed by the design", () => {
    const text = termBank.map((entry) => textContent(entry)).join(" ");

    expect(text).toContain("used principally before phrases beginning with");
    expect(text).toContain("used especially after than as a function word");
    expect(text).toContain("what is the reason for");
    expect(text).toContain("what is wrong with");
    expect(text).toContain("substandard");
    expect(text).toContain("slang");
    expect(text).toContain("Origin of WHAT");
    expect(text).toContain(
      "what with the drought and a strike in the mine, life is hard",
    );
  });

  test("stores both IPA readings in one visible pronunciation unit", () => {
    for (const entry of entriesForTerm("what")) {
      const pronunciations = nodesFor(entry, "pronunciation");

      expect(pronunciations).toHaveLength(1);
      expect(textContent(pronunciations[0])).toContain("/ˈ(h)wät/");
      expect(textContent(pronunciations[0])).toContain("/ˈ(h)wət/");
    }
  });

  test("keeps inflection metadata in one inline group", () => {
    const noun = entriesForTerm("what").find((entry) => entry[2] === "n");
    expect(noun).toBeDefined();

    if (!noun) return;

    const inflection = nodesFor(noun, "inflection-group");
    expect(inflection).toHaveLength(1);
    expect(textContent(inflection[0])).toContain(
      "inflected form(s): plural -s",
    );
    expect(inflection[0]?.content).toEqual(
      expect.arrayContaining([expect.objectContaining({ tag: "span" })]),
    );
  });

  test("uses titled collapsed origin and phrase sections", () => {
    for (const entry of termBank.filter(
      (candidate) => candidate[5][0] && !Array.isArray(candidate[5][0]),
    )) {
      for (const node of [
        ...nodesFor(entry, "origin"),
        ...nodesFor(entry, "phrase"),
      ]) {
        expect(node).toMatchObject({ tag: "details", open: false });
      }
    }

    const whatOrigin = nodesFor(firstOf(entriesForTerm("what")), "origin")[0];
    expect(textContent(whatOrigin)).toContain("Origin of WHAT");
    expect(
      nodesFor(firstOf(entriesForTerm("what")), "origin-section-title"),
    ).toHaveLength(1);
  });

  test("shows one example by default and collapses the rest", () => {
    for (const entry of termBank) {
      for (const count of structuredRoots(entry).flatMap(
        allDirectExampleCounts,
      )) {
        expect(count).toBeLessThanOrEqual(1);
      }
    }

    const extraExamples = termBank.flatMap((entry) =>
      nodesFor(entry, "extra-examples"),
    );
    expect(extraExamples.length).toBeGreaterThan(0);
    expect(
      extraExamples.every(
        (node) => node.tag === "details" && node.open === false,
      ),
    ).toBe(true);
  });

  test("keeps the what an if canonical entry and what and if soft link", () => {
    const canonical = entriesForTerm("what an if");
    const softLink = entriesForTerm("what and if");

    expect(canonical).toHaveLength(1);
    expect(textContent(canonical[0])).toContain("archaic");
    expect(textContent(canonical[0])).toContain("what if");
    expect(textContent(canonical[0])).toContain("or what and if");
    expect(softLink).toHaveLength(1);
    expect(softLink[0]?.[5]).toEqual([["what an if", ["alternative"]]]);
  });

  test("covers ten additional high-coverage source lookup words", () => {
    const additionalWords = [
      "turn",
      "take",
      "run",
      "process",
      "have",
      "set",
      "hand",
      "give",
      "in",
      "o",
    ];

    expect(
      additionalWords.every((word) => entriesForTerm(word).length > 0),
    ).toBe(true);
  });

  test("keeps the dense source structures in the fixture", () => {
    const processText = textContent(
      entriesForTerm("process").flatMap((entry) => entry[5]),
    );
    expect(entriesForTerm("process")).toHaveLength(4);
    expect(processText).toContain("pro·cess");
    expect(
      nodesFor(firstOf(entriesForTerm("process")), "pronunciation"),
    ).toHaveLength(1);
    expect(processText).toContain("ˈprä-ˌses");

    const inTerms = ["in-", "-in", "In", "IN"];
    expect(inTerms.every((term) => entriesForTerm(term).length > 0)).toBe(true);
    expect(entriesForTerm("o-").length).toBeGreaterThan(0);
    expect(entriesForTerm("-o").length).toBeGreaterThan(0);
    expect(entriesForTerm("o'").length).toBeGreaterThan(0);
    expect(entriesForTerm("oh")).toHaveLength(2);
  });

  test("keeps source whitespace around highlighted example targets", () => {
    const text = textContent(termBank);

    expect(text).toContain("I don't know what");
    expect(text).toContain("who advocated what");
    expect(text).toContain("I'll tell you what");
    expect(text).toContain("is it a freak, or what");
    expect(text).toContain("and what else");
    expect(text).toContain("what did you do that for");
    expect(text).toContain("gives him what for");
    expect(text).toContain("and what have you");
    expect(text).toContain("take the book from the table");
  });

  test("keeps definition-bearing dedicated rows and their source links", () => {
    expect(entriesForTerm("give up")).toHaveLength(2);
    expect(entriesForTerm("give up").map((entry) => entry[2])).toEqual(
      expect.arrayContaining(["n", "v"]),
    );
    expect(entriesForTerm("sett")).toHaveLength(1);

    const softLinksFrom = (term: string): unknown[] =>
      termBank
        .filter((entry) => entry[0] === term && Array.isArray(entry[5][0]))
        .map((entry) => entry[5][0]);

    expect(softLinksFrom("set")).toEqual(
      expect.arrayContaining([
        ["seth", []],
        ["sett", []],
      ]),
    );

    const canonicalSetScores = entriesForTerm("set")
      .filter((entry) => entry[2] !== "")
      .map((entry) => entry[4]);
    const setSoftLinkScores = termBank
      .filter((entry) => entry[0] === "set" && Array.isArray(entry[5][0]))
      .map((entry) => entry[4]);
    expect(Math.min(...canonicalSetScores)).toBeGreaterThan(
      Math.max(...setSoftLinkScores),
    );
  });

  test("freezes the complete recognized set article slice", () => {
    const setText = textContent(
      entriesForTerm("set").filter((entry) => entry[2] !== ""),
    );
    const definedPhrases = [
      "set about",
      "set abroad",
      "set apart",
      "set aside",
      "set a sponge",
      "set at",
      "set at defiance",
      "set at naught",
      "set by the ears",
      "set cock a hoop",
      "set eyes on",
      "set flying",
      "set foot in",
      "set forth",
      "set forward",
      "set home",
      "set light by",
      "set naught by",
      "set on",
      "set one back",
      "set one's cap for",
      "set one's face against",
      "set one's hand to",
      "set on foot",
      "set sail",
      "set store by",
      "set taut",
      "set the palette",
      "set the temperament",
    ];

    expect(
      textContent(entriesForTerm("set").find((entry) => entry[2] === "v")),
    ).toContain("to cause to sit");
    expect(
      textContent(entriesForTerm("set").find((entry) => entry[2] === "adj")),
    ).toContain("determined");
    expect(
      textContent(entriesForTerm("set").find((entry) => entry[2] === "n")),
    ).toContain("the artificially constructed setting");
    expect(setText).toContain(
      "to tune a single octave of a keyboard instrument",
    );
    expect(setText).toContain("or less commonly sett");
    expect(
      definedPhrases.every((phrase) => entriesForTerm(phrase).length === 1),
    ).toBe(true);
    expect(entriesForTerm("set upon")[0]?.[5]).toEqual([
      ["set on", ["alternative"]],
    ]);
  });

  test("does not repeat a form pronunciation already shown in its form group", () => {
    const processNoun = entriesForTerm("process").find(
      (entry) => entry[2] === "n",
    );
    expect(processNoun).toBeDefined();

    if (!processNoun) return;

    expect(textContent(nodesFor(processNoun, "inflection-group")[0])).toBe(
      "inflected form(s): plural pro·cess·es /ˈprä-ˌse-səz, ˈprō-, -sə-, -ˌsēz/",
    );
  });

  test("keeps phrase ownership and main-to-alternative-spelling soft links explicit", () => {
    const softLinksFrom = (term: string): unknown[] =>
      termBank
        .filter((entry) => entry[0] === term && Array.isArray(entry[5][0]))
        .map((entry) => entry[5][0]);

    expect(entriesForTerm("take a bath")).toHaveLength(1);
    expect(entriesForTerm("take stage")).toHaveLength(1);
    expect(entriesForTerm("take the word")).toHaveLength(1);
    expect(entriesForTerm("take apart")).toHaveLength(1);
    expect(softLinksFrom("take the stage")).toContainEqual([
      "take stage",
      ["alternative"],
    ]);
    expect(softLinksFrom("take up the word")).toContainEqual([
      "take the word",
      ["alternative"],
    ]);
    expect(softLinksFrom("in")).toEqual(
      expect.arrayContaining([
        ["in-", []],
        ["-in", []],
      ]),
    );
    expect(softLinksFrom("o")).toEqual(
      expect.arrayContaining([
        ["O", []],
        ["o-", []],
        ["-o", []],
        ["-o-", []],
        ["o'", []],
        ["oh", []],
      ]),
    );

    for (const alternateForm of ["il-", "im-", "ir-", "ino-"]) {
      expect(entriesForTerm(alternateForm)).toHaveLength(1);
      expect(softLinksFrom(alternateForm)).toContainEqual(["in-", []]);
    }

    for (const bareForm of ["il", "im", "ir", "ino"]) {
      expect(entriesForTerm(bareForm)).toHaveLength(1);
      expect(softLinksFrom(bareForm)).toContainEqual(["in-", ["alternative"]]);
    }
  });

  test("keeps source block boundaries for a phrase-owned label", () => {
    const entry = entriesForTerm("what's with")[0];
    expect(entry).toBeDefined();
    if (!entry) return;

    const flow = nodesFor(entry, "definition-flow")[0];
    expect(flow).toBeDefined();
    if (!flow) return;

    expect(
      nodeChildren(flow).some(
        (child) =>
          isObject(child) &&
          child.tag === "div" &&
          unitOf(child) === "definition",
      ),
    ).toBe(true);
  });

  test("keeps newly observed information units bound to their owners", () => {
    const allFixtureNodes = termBank.flatMap(entryNodes);
    const units = new Set(allFixtureNodes.map(unitOf));

    expect(units.has("headword-display")).toBe(true);
    expect(units.has("form-pronunciation")).toBe(true);
    expect(units.has("verb-subtype")).toBe(true);
    expect(units.has("called-also")).toBe(true);
    expect(units.has("interposed-object-candidate")).toBe(true);
    expect(units.has("related-item")).toBe(true);
    expect(units.has("grammar-label")).toBe(true);
    expect(units.has("see-in-addition")).toBe(true);
    expect(textContent(termBank)).toContain("used of letting go");
    expect(textContent(termBank)).toContain("hand it to");
    expect(textContent(termBank)).toContain("transitive + intransitive");
    expect(textContent(termBank)).toContain("synonyms see in addition depend");
    expect(textContent(termBank)).toContain("by the run");
  });

  test("keeps the superscript reference attached to whoever", () => {
    const nodes = termBank.flatMap((entry) =>
      nodesFor(entry, "superscript-reference"),
    );

    expect(nodes).toHaveLength(9);
    expect(nodes.map(textContent)).toEqual([
      "1",
      "1",
      "2",
      "1",
      "1",
      "3",
      "3",
      "21",
      "17",
    ]);
    expect(
      nodes.every(
        (node) =>
          node.style &&
          isObject(node.style) &&
          node.style.verticalAlign === "super",
      ),
    ).toBe(true);
    expect(textContent(termBank[0])).toContain("whoever");
  });

  test("keeps source homograph numbers separate from cross-reference superscripts", () => {
    const homographNumbersFor = (term: string): string[] =>
      entriesForTerm(term)
        .flatMap((entry) => nodesFor(entry, "homograph-number"))
        .map(textContent);

    expect(homographNumbersFor("what")).toEqual(["1", "2", "3", "4", "5"]);
    expect(homographNumbersFor("set")).toEqual(["1", "2", "3"]);
    expect(homographNumbersFor("sett")).toEqual(["3"]);

    const homographNumbers = termBank.flatMap((entry) =>
      nodesFor(entry, "homograph-number"),
    );
    expect(
      homographNumbers.every(
        (node) =>
          node.style &&
          isObject(node.style) &&
          node.style.verticalAlign === "super",
      ),
    ).toBe(true);
  });

  test("keeps pronunciation inline with the source homograph line", () => {
    const pronunciations = termBank.flatMap((entry) =>
      nodesFor(entry, "pronunciation"),
    );

    expect(pronunciations.length).toBeGreaterThan(0);
    expect(pronunciations.every((node) => node.tag === "span")).toBe(true);
  });

  test("keeps embedded hand meanings and the O variant as canonical entries", () => {
    expect(entriesForTerm("hand cheese")).toHaveLength(1);
    expect(firstOf(entriesForTerm("hand cheese"))[2]).toBe("n");
    expect(textContent(entriesForTerm("hand cheese")[0])).toContain("hand21");

    expect(entriesForTerm("hand game")).toHaveLength(1);
    expect(firstOf(entriesForTerm("hand game"))[2]).toBe("n");
    expect(textContent(entriesForTerm("hand game")[0])).toContain("hand17");

    const oEntries = entriesForTerm("O").filter(
      (entry) => !Array.isArray(entry[5][0]),
    );
    expect(oEntries).toHaveLength(3);
    expect(firstOf(oEntries)[2]).toBe("");
    expect(textContent(oEntries[0])).toContain("variant spelling of oh");
    expect(
      nodesFor(firstOf(oEntries), "homograph-number").map(textContent),
    ).toEqual(["1"]);
    expect(nodesFor(firstOf(oEntries), "variant-reference")).toHaveLength(1);
  });

  test("keeps source header metadata in MWU order", () => {
    const handHeader = nodesFor(
      firstOf(entriesForTerm("hand")),
      "mwu-header",
    )[0];
    const oHeader = nodesFor(firstOf(entriesForTerm("o")), "mwu-header")[0];

    expect(handHeader).toBeDefined();
    expect(oHeader).toBeDefined();
    if (!handHeader || !oHeader) return;

    const unitsIn = (node: JsonObject): string[] =>
      nodeChildren(node).flatMap((child) => {
        const unit = isObject(child) ? unitOf(child) : undefined;
        return unit === undefined ? [] : [unit];
      });

    const handUnits = unitsIn(handHeader);
    expect(handUnits.indexOf("homograph-number")).toBeGreaterThanOrEqual(0);
    expect(handUnits.indexOf("entry-qualifier")).toBeGreaterThanOrEqual(0);
    expect(handUnits.indexOf("homograph-number")).toBeLessThan(
      handUnits.indexOf("entry-qualifier"),
    );

    expect(unitsIn(oHeader)).toEqual(
      expect.arrayContaining(["entry-qualifier", "pronunciation"]),
    );
  });

  test("is directly consumable as a Yomitan term bank", () => {
    expect(Array.isArray(termBank)).toBe(true);
    expect(termBank.length).toBeGreaterThan(5);

    for (const entry of termBank) {
      expect(entry).toHaveLength(8);
      expect(typeof entry[0]).toBe("string");
      expect(typeof entry[1]).toBe("string");
      expect(typeof entry[2]).toBe("string");
      expect(typeof entry[6]).toBe("number");
    }
  });
});
