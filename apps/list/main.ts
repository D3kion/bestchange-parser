import fs from "fs/promises";
import puppeteer from "puppeteer";

import type { Exchanger } from "../../lib/domain";
import {
  clickOriginCurrency,
  getExchangersForPair,
  getTargetCurrency,
} from "./handlers";

const SOURCE_SITE = "https://bestchange.ru/";
const ORIGIN_CURRENCIES = ["Tether TRC20"];

async function main() {
  const exchangers: Exchanger[] = [];

  console.log("Opening browser");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 768 });

  console.log("Entering source site", SOURCE_SITE);
  await page.goto(SOURCE_SITE, { waitUntil: "networkidle0" });

  const targetIds = await page.$$eval("td.rc > a", (nodes) =>
    nodes.map((node) => node.id)
  );
  console.log(`Found ${targetIds.length} target currencies`);
  const originName = await clickOriginCurrency(page, ORIGIN_CURRENCIES[0]);

  // Enter in each pair and get exchangers list
  for (const id of targetIds) {
    const [btn, targetName] = await getTargetCurrency(page, id);
    if (targetName === originName) continue;

    await btn.evaluate((b) => (b as HTMLAnchorElement).click());
    await page.waitForNavigation();

    const exchangers_ = await getExchangersForPair(
      page,
      originName,
      targetName
    );
    exchangers.push(...exchangers_);
    console.log(
      `Found ${exchangers_.length} exchangers for pair "${originName}" - "${targetName}"`
    );
  }

  const date = new Date()
    .toJSON()
    .split(".")[0]
    .replace("T", "_")
    .replace(/:/g, "-");
  await fs.writeFile(
    `./reports/exchangers_${date}.json`,
    JSON.stringify(exchangers),
    "utf-8"
  );
  await browser.close();
}

main();
