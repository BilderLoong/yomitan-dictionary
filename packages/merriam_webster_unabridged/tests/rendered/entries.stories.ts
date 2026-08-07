import { renderToHtml } from "../helpers/renderToHtml";
import {
  inConverted,
  oConverted,
  ohConverted,
  runConverted,
  turnConverted,
} from "./fixtures";
import { assertCollapsedExamples, assertRenderedEntry } from "./storyHelpers";

export default { title: "Entries" };

const renderEntryStory = (html: string, play: (root: HTMLElement) => void) => ({
  render: (): string => html,
  play: async ({
    canvasElement,
  }: {
    readonly canvasElement: HTMLElement;
  }): Promise<void> => {
    play(canvasElement);
  },
});

const assertEntry = (root: HTMLElement): void => {
  assertRenderedEntry(root);
  assertCollapsedExamples(root);
};

export const In = renderEntryStory(
  renderToHtml(inConverted.content),
  assertEntry,
);
export const O = renderEntryStory(
  renderToHtml(oConverted.content),
  assertEntry,
);
export const Oh = renderEntryStory(
  renderToHtml(ohConverted.content),
  assertEntry,
);
export const Turn = renderEntryStory(
  renderToHtml(turnConverted.content),
  assertEntry,
);
export const Run = renderEntryStory(
  renderToHtml(runConverted.content),
  assertEntry,
);
