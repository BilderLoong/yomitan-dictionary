import { convertCanonical } from "../../src/conversion/convertCanonical";
import type { ConvertedCanonical } from "../../src/conversion/types";
import type { Result } from "../../src/shared/result";
import { mainCanonicalEntryPlan } from "../helpers/level1Factories";
import becauseHtml from "./fixtures/because.html?raw";
import downHtml from "./fixtures/down.html?raw";
import giveHtml from "./fixtures/give.html?raw";
import inHtml from "./fixtures/in.html?raw";
import oHtml from "./fixtures/o.html?raw";
import ohHtml from "./fixtures/oh.html?raw";
import putHtml from "./fixtures/put.html?raw";
import runHtml from "./fixtures/run.html?raw";
import sumHtml from "./fixtures/sum.html?raw";
import turnHtml from "./fixtures/turn.html?raw";
import whatHtml from "./fixtures/what.html?raw";

/**
 * The real pipeline output for the test-word source articles. Stories and
 * render-contract tests share these converted entries, so the displayed
 * HTML is exactly the HTML the tests assert on.
 *
 * The source articles in ./fixtures/ are generated data (extracted from
 * assets/MWU.db) and are gitignored — regenerate them on a fresh checkout
 * with `bun run update:render-fixtures` (requires the source DB).
 */

const unwrap = (
  result: Result<ConvertedCanonical, unknown>,
): ConvertedCanonical => {
  if (!result.ok)
    throw new Error(
      `fixture conversion failed: ${JSON.stringify(result.error)}`,
    );
  return result.value;
};

export const whatConverted = unwrap(
  convertCanonical(
    mainCanonicalEntryPlan({ term: "what", ownerHtml: whatHtml }),
  ),
);

export const becauseConverted = unwrap(
  convertCanonical(
    mainCanonicalEntryPlan({ term: "because", ownerHtml: becauseHtml }),
  ),
);

export const inConverted = unwrap(
  convertCanonical(mainCanonicalEntryPlan({ term: "in", ownerHtml: inHtml })),
);

export const downConverted = unwrap(
  convertCanonical(
    mainCanonicalEntryPlan({ term: "down", ownerHtml: downHtml }),
  ),
);

export const giveConverted = unwrap(
  convertCanonical(
    mainCanonicalEntryPlan({ term: "give", ownerHtml: giveHtml }),
  ),
);

export const oConverted = unwrap(
  convertCanonical(mainCanonicalEntryPlan({ term: "o", ownerHtml: oHtml })),
);

export const ohConverted = unwrap(
  convertCanonical(mainCanonicalEntryPlan({ term: "oh", ownerHtml: ohHtml })),
);

export const putConverted = unwrap(
  convertCanonical(mainCanonicalEntryPlan({ term: "put", ownerHtml: putHtml })),
);

export const turnConverted = unwrap(
  convertCanonical(
    mainCanonicalEntryPlan({ term: "turn", ownerHtml: turnHtml }),
  ),
);

export const runConverted = unwrap(
  convertCanonical(mainCanonicalEntryPlan({ term: "run", ownerHtml: runHtml })),
);

export const sumConverted = unwrap(
  convertCanonical(mainCanonicalEntryPlan({ term: "sum", ownerHtml: sumHtml })),
);

export const allConverted: readonly ConvertedCanonical[] = [
  whatConverted,
  inConverted,
  downConverted,
  giveConverted,
  oConverted,
  ohConverted,
  putConverted,
  turnConverted,
  runConverted,
  sumConverted,
];
