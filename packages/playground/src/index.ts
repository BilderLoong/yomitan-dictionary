import {
  Dictionary,
  DictionaryIndex,
  TermEntry,
  KanjiEntry,
} from "yomichan-dict-builder";
import {
  DetailedDefinition,
  StructuredContent,
} from "yomichan-dict-builder/dist/types/yomitan/termbank";

(async () => {
  const dictionary = new Dictionary({
    fileName: `test.zip`,
  });

  // index
  const index = new DictionaryIndex()
    .setTitle("Test Dictionary" + Math.floor(Math.random() * 1000))
    .setRevision("1.0")
    .setAuthor("Marv")
    .setDescription("Test dictionary for yomichan-dict-builder")
    .setAttribution("test")
    .setUrl("https://example.com")
    .build();

  await dictionary.setIndex(index);

  // term entries
  const entry = new TermEntry("test").setReading("test").build();
  await dictionary.addTerm(entry);

  const sc: StructuredContent = {
    tag: "span",
    content: "string",
    data: {
      "dict-data": "test",
    },
    lang: "ja",
    style: {
      fontSize: "20px",
      fontWeight: "normal",
      textDecorationLine: "overline",
    },
  };

  const detailedDefinition: DetailedDefinition = {
    type: "structured-content",
    content: sc,
  };

  const entry2 = new TermEntry("work")
    .setReading("reading")
    .setTermTags("term tag")
    .setDefinitionTags("def tag")
    .setDeinflectors("n")
    // .addDetailedDefinition(detailedDefinition)
    .addDetailedDefinition("test2 definition")
    .build();
  await dictionary.addTerm(entry2);

  const entry3 = new TermEntry("test3s")
    .setReading("reading")
    .setTermTags("ns")
    .addDetailedDefinition(detailedDefinition)
    .addDetailedDefinition("test3 def")
    .build();
  await dictionary.addTerm(entry3);

  const entry4 = new TermEntry("test4")
    .setReading("reading")
    .setDeinflectors("test2")
    .build();
  await dictionary.addTerm(entry4);

  // test term bank iteration
  // for (let i = 0; i < 20000; i++) {
  //   const entry = new TermEntry(`i`).setReading("").build();
  //   await dictionary.addTerm(entry);
  // }

  // term meta
  // simple frequency
  dictionary.addTermMeta(["term", "freq", 1]);
  dictionary.addTermMeta(["term", "freq", "N1"]);
  dictionary.addTermMeta([
    "term",
    "freq",
    {
      value: 1,
      displayValue: "one",
    },
  ]);
  dictionary.addTermMeta([
    "a",
    "freq",
    {
      reading: "termreading",
      frequency: {
        value: 1,
        displayValue: "one",
      },
    },
  ]);
  // pitch
  dictionary.addTermMeta([
    "亜",
    "pitch",
    {
      reading: "あ",
      pitches: [
        {
          position: 1,
          // devoice: [], // optional
          // nasal: [], // optional
        },
      ],
    },
  ]);

  // tags
  dictionary.addTag({
    name: "jouyou",
    category: "frequent",
    sortingOrder: -5,
    notes: "included in list of regular-use characters",
    popularityScore: 0,
  });

  // add local file
  // await dictionary.addFile("./examples/icon64.png", "img/icon64.png");
  // /**
  //  * @type {import('../dist/types/yomitan/termbank').StructuredContent}
  //  */
  // const imageScNode = {
  //   tag: "img",
  //   path: "img/icon64.png",
  //   data: {
  //     "dict-data": "testImage",
  //   },
  //   title: "test image",
  // };

  // /**
  //  * @type {import('../dist/types/yomitan/termbank').StructuredContent}
  //  */
  // const scDefinition = {
  //   tag: "div",
  //   content: [
  //     {
  //       tag: "div",
  //       content: "test string",
  //       lang: "ja",
  //     },
  //     imageScNode,
  //   ],
  // };
  // /**
  //  * @type {import('../dist/types/yomitan/termbank').DetailedDefinition}
  //  */
  // const imageDetailedDefinition = {
  //   type: "structured-content",
  //   content: scDefinition,
  // };
  // const imgEntry = new TermEntry("img")
  //   .setReading("img")
  //   .addDetailedDefinition(imageDetailedDefinition)
  //   .build();

  // await dictionary.addTerm(imgEntry);

  // export
  const stats = await dictionary.export("./test");
  console.log("Done exporting!");
  console.table(stats);
  /**
┌────────────────┬────────┐
│    (index)     │ Values │
├────────────────┼────────┤
│   termCount    │ 20002  │
│ termMetaCount  │   5    │
│   kanjiCount   │   1    │
│ kanjiMetaCount │   3    │
└────────────────┴────────┘
   */
})();
