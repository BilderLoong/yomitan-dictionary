import { expect, test } from "bun:test";
import * as cheerio from "cheerio";

import { renderToHtml } from "../helpers/renderToHtml";
import { becauseConverted } from "./fixtures";

const $ = cheerio.load(renderToHtml(becauseConverted.content));

test("renders the real because usage discussion as Yomitan HTML", () => {
  const disclosure = $('details[data-sc-content="usage-note"]').first();
  expect(disclosure.length).toBe(1);
  expect(disclosure.attr("open")).toBeUndefined();
  expect(disclosure.children("summary").text()).toBe("Usage of BECAUSE");

  const discussion = disclosure
    .children('div[data-sc-content="usage-note-text"]')
    .first();
  expect(discussion.length).toBe(1);
  expect(discussion.find('[data-sc-content="usage-explanation"]').length).toBe(
    1,
  );
  expect(
    discussion.find('[data-sc-content="emphasis"]').length,
  ).toBeGreaterThan(0);
  expect(
    discussion.find('[data-sc-content="target-highlight"]').length,
  ).toBeGreaterThan(0);

  const exampleGroup = discussion
    .find('[data-sc-content="example-group"]')
    .first();
  expect(exampleGroup.length).toBe(1);
  const examples = exampleGroup.find('[data-sc-content="example-sentence"]');
  expect(examples.length).toBe(4);
  expect(
    examples.not(
      'details[data-sc-content="extra-examples"] [data-sc-content="example-sentence"]',
    ).length,
  ).toBe(1);
  const extraExamples = exampleGroup.children(
    'details[data-sc-content="extra-examples"]',
  );
  expect(extraExamples.length).toBe(1);
  expect(extraExamples.attr("open")).toBeUndefined();
  expect(extraExamples.children("summary").text()).toBe("3 more examples");

  expect(examples.map((_, element) => $(element).text()).get()).toEqual([
    "Because the detail being removed was such a telling illustration of his meticulousness, I put up a small brief argument for keeping it … — George F. Will, Sports Illustrated, 12 Mar. 1990",
    "Because of their quantum nature, atoms (like the particles they are made of) act like waves. — George Johnson, New York Times, 16 Oct. 2001",
    'Because of the wood\'s value and popularity, lumber brokers in other parts of the world have bestowed the name "mahogany" on other species of reddish wood as a way to burnish their appeal. — Jeanne Huber, This Old House, January/February 2002',
    "Because their audience works during the week, they tour less in the manner of rock and pop musicians, who are often on the road for weeks and months at a time, playing night after night, and more in the manner of drag racers, who race on the weekends and go home. — Alec Wilkinson, New Yorker, 24 May 2010",
  ]);

  const pointer = discussion.find('[data-sc-content="see-in-addition"]');
  expect(pointer.length).toBe(1);
  expect(pointer.text()).toBe("usages see in addition account");
  expect(pointer.closest("a").length).toBe(0);
  expect(discussion.text().indexOf(pointer.text())).toBeGreaterThan(
    discussion.text().indexOf("24 May 2010"),
  );
});
