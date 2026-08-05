import { readFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

async function main() {
  const xmlString = await readFile(
    path.resolve(__dirname, "./examples/word.xml"),
    "utf-8",
  );
  const $ = cheerio.load(xmlString);
  $($(".dt").get(0))
    .contents()
    .each((_, elem) => {
      console.log($(elem));
    });
}

main();
