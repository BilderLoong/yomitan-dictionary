import { renderToHtml } from "../helpers/renderToHtml";
import {
  inConverted,
  oConverted,
  ohConverted,
  runConverted,
  turnConverted,
} from "./fixtures";

export default { title: "Entries" };

const renderEntryStory = (html: string): { readonly render: () => string } => ({
  render: (): string => html,
});

export const In = renderEntryStory(renderToHtml(inConverted.content));
export const O = renderEntryStory(renderToHtml(oConverted.content));
export const Oh = renderEntryStory(renderToHtml(ohConverted.content));
export const Turn = renderEntryStory(renderToHtml(turnConverted.content));
export const Run = renderEntryStory(renderToHtml(runConverted.content));
