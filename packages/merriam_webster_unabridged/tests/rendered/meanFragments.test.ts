import { describe, expect, it } from "bun:test";
import { turnConverted, whatConverted } from "./fixtures";
import { meanFragments } from "./meanFragments";

describe("meanFragments", () => {
  it("extracts the four numbered means of what", () => {
    const fragments = meanFragments(whatConverted.content);
    expect(fragments.map(({ label }): string => label)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    for (const fragment of fragments) {
      expect(fragment.node).toMatchObject({
        tag: "li",
        data: { content: "sense-number" },
      });
    }
  });

  it("extracts all twenty-one means of turn grouped by verb subtype", () => {
    const fragments = meanFragments(turnConverted.content);
    expect(fragments).toHaveLength(21);
    const labels = fragments.map(({ label }): string => label);
    expect(labels.slice(0, 10)).toEqual([
      "transitive verb · 1",
      "transitive verb · 2",
      "transitive verb · 3",
      "transitive verb · 4",
      "transitive verb · 5",
      "transitive verb · 6",
      "transitive verb · 7",
      "transitive verb · 8",
      "transitive verb · 9",
      "transitive verb · 12",
    ]);
    expect(labels.slice(10)).toEqual([
      "intransitive verb · 1",
      "intransitive verb · 2",
      "intransitive verb · 3",
      "intransitive verb · 4",
      "intransitive verb · 5",
      "intransitive verb · 6",
      "intransitive verb · 7",
      "intransitive verb · 8",
      "intransitive verb · 9",
      "intransitive verb · 10",
      "intransitive verb · 11",
    ]);
    for (const fragment of fragments) {
      expect(fragment.node).toMatchObject({
        tag: "li",
        data: { content: "sense-number" },
      });
    }
  });

  it("does not include the header, origin, or phrase sections", () => {
    const fragments = meanFragments(whatConverted.content);
    const text = fragments.map(({ label }): string => label).join(" ");
    expect(text).not.toContain("phrase");
  });
});
