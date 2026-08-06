export const definition = (text: string): string =>
  `<span class="dt">: ${text}</span>`;

export const mean = (headword: string, body: string): string =>
  '<mean><h1><span class="hword">' +
  headword +
  "</span></h1>" +
  body +
  "</mean>";

export const phrase = (headword: string, body: string): string =>
  '<div class="dro"><span class="drp">' +
  headword +
  "</span>" +
  body +
  "</div>";

export const example = (text: string): string =>
  `<span class="ex-sent-group">${text}</span>`;

export const runOn = (headword: string): string =>
  `<div class="uro"><span class="ure">${headword}</span></div>`;

export const alternate = (
  headword: string,
  qualifier: string | null,
  extraHtml: string,
): string =>
  '<span class="vr"><span class="va">' +
  headword +
  "</span>" +
  (qualifier === null ? "" : `<span class="vl">${qualifier}</span>`) +
  extraHtml +
  "</span>";

export const cxlRef = (
  relation: string,
  visibleTarget: string,
  href?: string,
): string =>
  '<p class="cxl-ref"><span class="cxl">' +
  relation +
  '</span><a rel="prev" href="' +
  (href ?? `bword://${visibleTarget}`) +
  '" class="cxt">' +
  visibleTarget +
  "</a></p>";
