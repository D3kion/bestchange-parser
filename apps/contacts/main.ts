import "dotenv/config";
import fs from "fs/promises";
import { retryAsync } from "ts-retry";
import puppeteer from "puppeteer";

import { readExchangers } from "../../lib/db/exchangers";
import { findLinksByRegex, parseContactLinks, visitDeeplink } from "./handlers";
import { CONTACT_PAGE_PATTERNS } from "./patterns";

async function main() {
  const file = process.env.REPORT_FILE;
  if (!file) return console.error("File must be specified");
  const exchangers = await readExchangers(file);
  console.log(`Found ${exchangers.length} exchangers`);

  console.log("Opening browser");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 768 });

  for (const item of exchangers) {
    if (
      item.url
      // && (item.tgContacts?.length || item.emailContacts?.length)
    ) {
      console.log(`Skiping "${item.name}" exchanger`);
      continue;
    }

    console.log("Entering deeplink for exchanger", item.name, item.deepLink);
    const url = await retryAsync(
      async () => visitDeeplink(page, item.deepLink),
      {
        delay: 10_000,
        onError(err) {
          console.error(
            "Something went wrong:",
            err,
            "\nRetrying to visit deeplink afters 10sec..."
          );
        },
      }
    );
    item.url = url;

    const [tgLinks, emailLinks] = await parseContactLinks(page);
    if (!tgLinks.length && !emailLinks.length) {
      console.log("Contacts not found, trying to find contact pages");
      // Find contact pages
      const rawLinks: string[] = [];
      for (const pattern of CONTACT_PAGE_PATTERNS) {
        const links = (await findLinksByRegex(page, pattern, true)).filter(
          (l) => new URL(l).hostname === new URL(url).hostname
        );
        rawLinks.push(...links);
      }
      const links = Array.from(new Set(rawLinks));
      console.log(`Found ${links.length} contact pages`);

      // Iterate over pages and try to find contacts
      for (const link of links) {
        console.log("Visiting", link);
        const found = await retryAsync(
          async () => {
            await page.goto(link, {
              timeout: 10_000,
              waitUntil: "domcontentloaded",
            });
            const [tgLinks, emailLinks] = await parseContactLinks(page);
            if (tgLinks.length || emailLinks.length) {
              item.tgContacts = tgLinks;
              item.emailContacts = emailLinks;
              return true;
            }
            return false;
          },
          {
            maxTry: 3,
            onError() {
              console.error("Retrying to visit", link);
            },
          }
        );
        if (found) break;
      }
    } else {
      item.tgContacts = tgLinks;
      item.emailContacts = emailLinks;
    }

    console.log("Found", item.url, item.tgContacts, item.emailContacts);
    fs.writeFile(file, JSON.stringify(exchangers), "utf-8");
  }

  await browser.close();
}

main();
