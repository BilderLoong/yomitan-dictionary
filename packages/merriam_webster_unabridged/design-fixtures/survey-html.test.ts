import { describe, expect, test } from "bun:test";
import {
  buildBroadSurveyFindings,
  buildSurveyFindings,
  extractHtmlEvidence,
} from "./survey-html";

describe("MWU HTML evidence extractor", () => {
  test("records scoped grammar labels and their nearest sense", () => {
    const evidence = extractHtmlEvidence(`
      <mwu>
        <mean>
          <div class="sense has-num-only">
            <span class="sn"><span class="num">1</span></span>
            <span class="sgram"><a href="bword:///v">transitive</a></span>
            <span class="dt">to move</span>
          </div>
        </mean>
      </mwu>
    `);

    expect(evidence.sgram).toEqual([
      expect.objectContaining({
        text: "transitive",
        ownerClass: "sense has-num-only",
        sourceMarker: "1",
      }),
    ]);
  });

  test("distinguishes synonym-discussion see-in-addition from other ownership", () => {
    const evidence = extractHtmlEvidence(`
      <mwu>
        <div class="synonym-discussion">
          <span class="see-in-addition">synonyms <a class="sa-link">see in addition</a> depend</span>
        </div>
        <div id="usage-notes" class="section-content usage-notes">
          <span class="see-in-addition">usages see in addition outside</span>
        </div>
        <div class="sense"><span class="usage"><span class="see-in-addition">usage-local</span></span></div>
      </mwu>
    `);

    expect(evidence.seeInAddition).toEqual([
      expect.objectContaining({
        insideSynonymDiscussion: true,
        ownerClass: "synonym-discussion",
      }),
      expect.objectContaining({
        insideSynonymDiscussion: false,
        ownerClass: "section-content usage-notes",
      }),
      expect.objectContaining({
        insideSynonymDiscussion: false,
        ownerClass: "usage",
      }),
    ]);
  });

  test("reports superscripts, line-break markers, and phrase alternatives", () => {
    const evidence = extractHtmlEvidence(`
      <mean>
        <h1 class="hword"><sup>1</sup> take</h1>
        <span class="breakpoint">take</span><br><span class="breakpoint">apart</span>
        <span class="drp">take stage</span><span class="vr"><span class="vl">or</span><span class="va">take the stage</span></span>
      </mean>
    `);

    expect(evidence.superscripts).toEqual([
      expect.objectContaining({ text: "1", ownerClass: "hword" }),
    ]);
    expect(evidence.lineBreakMarkers.map(({ kind }) => kind)).toEqual([
      "breakpoint",
      "br",
      "breakpoint",
    ]);
    expect(evidence.phraseAlternatives).toEqual([
      expect.objectContaining({
        kind: "defined-phrase",
        term: "take stage",
        ownerClass: "drp",
      }),
      expect.objectContaining({
        kind: "phrase-alternative",
        term: "take the stage",
        qualifier: "or",
        text: "or take the stage",
        ownerClass: "vr",
      }),
    ]);
  });

  test("separates interesting, not-needed, and not-yet-noticed findings", () => {
    const evidence = extractHtmlEvidence(`
      <mean>
        <div class="sense">
          <span class="vd">transitive verb</span>
          <span class="sgram">chiefly dialectal</span>
          <span class="entry-status">status artwork</span>
          <span class="mystery-unit">unclassified source data</span>
        </div>
      </mean>
    `);

    const findings = buildSurveyFindings([
      {
        id: 7,
        lookup: "sample",
        sourceKey: "sample",
        htmlLength: 0,
        ...evidence,
      },
    ]);

    expect(Object.keys(findings)).toEqual([
      "interesting",
      "notNeeded",
      "notYetNoticed",
    ]);
    expect(
      findings.interesting.map(({ informationName }) => informationName),
    ).toEqual(["grammar-label", "verb-subtype"]);
    expect(
      findings.notNeeded.map(({ informationName }) => informationName),
    ).toEqual(["entry-status-image"]);
    expect(
      findings.notYetNoticed.map(({ informationName }) => informationName),
    ).toEqual(["unrecognized-html-class"]);
  });

  test("keeps broad findings actionable instead of limiting them to selected words", () => {
    const findings = buildBroadSurveyFindings([
      {
        name: "entry-status",
        rowCount: 2,
        sampleLookupWords: ["alpha", "beta"],
      },
      {
        name: "mystery-unit",
        rowCount: 3,
        sampleLookupWords: ["gamma", "delta"],
      },
    ]);

    expect(findings.notNeeded).toEqual([
      expect.objectContaining({
        informationName: "entry-status-image",
        word: "alpha",
        ownerPath: expect.stringContaining("2 source rows"),
      }),
    ]);
    expect(findings.notYetNoticed).toEqual([
      expect.objectContaining({
        informationName: "unrecognized-html-class",
        sourceSelectorOrTag: ".mystery-unit",
        notes: expect.stringContaining("gamma"),
      }),
    ]);
  });

  test("includes broad non-class markers in the interesting findings", () => {
    const findings = buildBroadSurveyFindings([], {
      superscripts: {
        rowCount: 2,
        lookupWords: ["alpha", "beta"],
        values: ["1", "2"],
        samples: [],
      },
      lineBreakMarkers: {
        rowCount: 3,
        lookupWords: ["gamma", "delta", "epsilon"],
        values: ["br", "breakpoint"],
        samples: [],
      },
    });

    expect(
      findings.interesting.map(({ informationName }) => informationName),
    ).toEqual(["superscript", "source-block-boundary"]);
  });
});
