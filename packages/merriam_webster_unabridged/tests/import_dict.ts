import path from "path";
import { chromium, Page } from "playwright";
import fs from "fs";

async function main() {
  // Get zip path from command line arguments
  const zipPath = process.argv[2];
  if (!zipPath) {
    console.error('Please provide path to dictionary zip file');
    process.exit(1);
  }

  // Validate file exists
  if (!fs.existsSync(zipPath)) {
    console.error(`File not found: ${zipPath}`);
    process.exit(1);
  }

  console.log(`Importing dictionary from: ${zipPath}`);
  const dictionaryPath = path.resolve(zipPath);
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
  const page = await browserContext.newPage(); // Open a new page
  await page.goto(
    welcomePageURL
  );

  const searchPage = await browserContext.newPage();
  await searchPage.goto(searchPageURL + "?query=hello");


  // Close the auto started welcome page.
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

  await Promise.all([
    setLanguage(page, "en"),
    importDictionary(page, dictionaryPath),
  ]);

}

main();

async function importDictionary(page: Page, dictionaryPath: string) {
  await page.setInputFiles(
    "#dictionary-import-file-input",
    dictionaryPath
  );

  // Wait for the file input to appear
  // await page.waitForSelector("#dictionary-drop-file-zone");
  // await page.click("#dictionary-drop-file-zone");
  // Set the file input value to our dictionary path
  // await page.setInputFiles("#dictionary-import-file-input", dictionaryPath);

  // Wait for import to complete
  await page.waitForSelector(".dictionary-import-progress", {
    state: "hidden",
    timeout: 60000,
  });
}

async function setLanguage(page: Page, languageCode: string) {
  await page.waitForSelector("#language-select", { timeout: 10000 });
  await page.selectOption("#language-select", languageCode);
  await page.waitForSelector("#recommended-settings-apply-button", { timeout: 10000 });
  await page.click("#recommended-settings-apply-button");
}