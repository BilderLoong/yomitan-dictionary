import path from "path";
import { chromium, Page } from "playwright";
import fs from "fs";

async function main() {
  console.log(path.resolve(__dirname, "./fixture/yomitan-chrome-playwright"));
  const dictionaryPath = path.resolve(
    __dirname,
    "../build/Merriam Webster Unabridged.zip"
  );
  const userDataDir = "/tmp/test-user-data-dir";

  // Empty the user data directory before each run
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
  fs.mkdirSync(userDataDir, { recursive: true });

  const pathToExtension = path.resolve(
    __dirname,
    "./fixture/yomitan-chrome-playwright"
  );
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chromium",
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  const extensionURLPrefix = "chrome-extension://mlbjoknafgaddicpadejdmfnimmacble";
  const searchPageURL = extensionURLPrefix + "/search.html"
  const welcomePageURL = extensionURLPrefix + "/welcome.html"

  // Close all existing pages/tabs
  // const pages = browserContext.pages();
  // await Promise.all(pages.map(async (page) => await page.close()));
  //
  const welcomePage = await browserContext.newPage(); // Open a new page
  await welcomePage.goto(
    welcomePageURL
  );

  const searchPage = await browserContext.newPage();
  await searchPage.goto(searchPageURL + "?query=hello");


  // Close the autostarted welcome page.
  function closeWelcomePage(page: Page) {
    const url = page.url();
    if (url === welcomePageURL) {
      page.close();
      return true;
    }
    return false;
  }

  browserContext.on("page", async (page) => {
    if (closeWelcomePage(page)) {
      browserContext.removeAllListeners();
    }
  });
  // Wait for dictionaries panel to be ready
  // await welcomePage.click('div[data-modal-action="show,dictionaries"]');

  // Find and click import button
  // await welcomePage.waitForSelector("#dictionary-import-button");
  // await welcomePage.click("#dictionary-import-button");

  await welcomePage.setInputFiles(
    "#dictionary-import-file-input",
    dictionaryPath
  );

  // Wait for the file input to appear
  // await page.waitForSelector("#dictionary-drop-file-zone");
  // await page.click("#dictionary-drop-file-zone");
  // Set the file input value to our dictionary path
  // await page.setInputFiles("#dictionary-import-file-input", dictionaryPath);

  // Wait for import to complete
  await welcomePage.waitForSelector(".dictionary-import-progress", {
    state: "hidden",
    timeout: 60000,
  });

  // console.log("Dictionary import completed");
}

main();
