import { expect, test, describe, it } from "bun:test";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { SenseData, senseDatasToStructuredContentList } from "../src/parser";
import { queryGivenWordRows, db } from "../src/db";
import { getDefaultAutoSelectFamilyAttemptTimeout } from "net";
import { domEach } from "cheerio/utils";
import { StructuredContent } from "yomichan-dict-builder/dist/types/yomitan/termbank";
import { pbcopy } from "./utils";

describe("senseDatasToStructuredContentList", () => {
  it("should build structured content correctly for one sense data.", () => {
    const sample: SenseData[] = [
      {
        text: "s1",
        examples: ["e1.1", "e1.2"],
      },
      // {
      //   text: "s2",
      //   examples: ["e2.1", "e2.2"],
      // },
      // {
      //   text: "s3",
      //   examples: ["e3.1", "e3.2"],
      // },
    ];

    const result = senseDatasToStructuredContentList(sample);
    // pbcopy(JSON.stringify(result, null, 2));

    expect(result).toEqual([
      {
        tag: "div",
        data: {
          content: "senses",
        },
        content: [
          {
            tag: "div",
            data: {
              content: "sense",
            },
            content: [
              {
                tag: "div",
                data: {
                  content: "sense-text",
                },
                content: "s1",
              },
              {
                tag: "div",
                data: {
                  content: "examples",
                },
                content: [
                  {
                    tag: "div",
                    data: {
                      content: "example",
                    },
                    content: "e1.1",
                  },
                  {
                    tag: "div",
                    data: {
                      content: "example",
                    },
                    content: "e1.2",
                  },
                ],
              },
            ],
          },
          ,
          ,
        ],
      },
    ] as StructuredContent);
  });

  /* it("should build structured content correctly for multiple sense data.", () => {
    const sample: SenseData[] = [
      {
        text: "s1",
        examples: ["e1.1", "e1.2"],
      },
      {
        text: "s2",
        examples: ["e2.1", "e2.2"],
      },
      {
        text: "s3",
        examples: ["e3.1", "e3.2"],
      },
    ];

    const result = senseDatasToStructuredContentList(sample);

    expect(result).toEqual([
      {
        tag: "div",
        data: {
          content: "senses",
        },
        content: [
          {
            tag: "div",
            data: {
              content: "sense",
            },
            content: "s1",
          },
          {
            tag: "div",
            data: {
              content: "examples",
            },
            content: [
              {
                tag: "div",
                data: {
                  content: "example",
                },
                content: "e1.1",
              },
              {
                tag: "div",
                data: {
                  content: "example",
                },
                content: "e1.2",
              },
            ],
          },
          ,
        ],
      },
    ] as StructuredContent);
  }) */
});
