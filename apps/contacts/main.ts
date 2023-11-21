import puppeteer from "puppeteer";
import { findLinksByRegex, visitDeeplink } from "./handlers";

const target =
  "https://www.bestchange.ru/click.php?id=1177&from=10&to=42&city=0";
const TG_REGEX = new RegExp(/t\.me\/[-a-zA-Z0-9.]+(\/\S*)?/, "g");
const EMAIL_REGEX = new RegExp(/[\w-.]+@([\w-]+\.)+[\w-]{2,4}/, "g");

async function main() {
  console.log("Opening browser");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 768 });

  console.log("Entering deeplink for exchanger", target);
  const url = await visitDeeplink(page, target);

  let emailLinks: string[] = [];
  const tgLinks = await findLinksByRegex(page, TG_REGEX);
  if (!tgLinks) {
    emailLinks = await findLinksByRegex(page, EMAIL_REGEX);
  }
  if (!tgLinks.length && !emailLinks.length) {
    // try to find contacts page and find links on that
  }

  console.log("Found", url, tgLinks, emailLinks);
  await browser.close();
}

main();
