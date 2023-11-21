import puppeteer, { ElementHandle } from "puppeteer";
// import * as cheerio from "cheerio";

const SOURCE_SITE = "https://bestchange.ru/";
const ORIGIN_CURRENCY = "Tether TRC20";

type ExchangerData = {
  name: string;
  link: string;
  pairs: [string, string][];
  emailContacts: string[];
  tgContacts: string[];
};

async function main() {
  console.log("Opening browser");
  const browser = await puppeteer.launch({ headless: "new" });
  const sourcePage = await browser.newPage();

  console.log("Entering source site", SOURCE_SITE);
  await sourcePage.goto(SOURCE_SITE, { waitUntil: "networkidle0" });
  await sourcePage.setViewport({ width: 1360, height: 768 });

  console.log("Fetching target currencies");
  const targetsIds = await sourcePage.$$eval("td.rc > a", (nodes) =>
    nodes.map((node) => node.id)
  );
  console.log(`Found ${targetsIds.length} target currencies`);

  // Get origin currency button and click it
  const [originBtn] = await sourcePage.$x(
    `//td[@class="lc"]/a[contains(., "${ORIGIN_CURRENCY}")]`
  );
  const originCurrencyName = await originBtn.evaluate((el) => el.textContent);
  await (originBtn as ElementHandle<Element>).click();

  const exchangers = new Map<string, ExchangerData>();
  // Enter in each pair and get exchangers list
  for (const id of targetsIds.slice(0, 3)) {
    const idx = targetsIds.indexOf(id);
    const target = await sourcePage.waitForSelector(`#${id}`);
    const currencyName = await target.evaluate((el) => el.textContent);
    if (currencyName === originCurrencyName) continue;

    // Skip hidden targets or TODO: expand and fetch all
    try {
      await target.click();
      await sourcePage.waitForNavigation();
    } catch (err) {
      continue;
    }
    console.log(
      `Fetching exchangers for pair #${idx}: "${originCurrencyName}" - "${currencyName}"`
    );

    // Iterate over exchangers and save them
    const content = await sourcePage.$$(`#content_table tbody tr`);
    console.log(`Found ${content.length} exchangers for pair #${idx}`);

    for (const row of content) {
      const name = await row.$eval(".ca", (el) => el.textContent);

      // Add pairs if already exists
      if (exchangers.has(name)) {
        const exchanger = exchangers.get(name);
        exchangers.set(name, {
          ...exchanger,
          pairs: [...exchanger.pairs, [originCurrencyName, currencyName]],
        });
        continue;
      }

      // Get original link
      const deepLink = await row.$eval("a", (el) => el.href);
      console.log(`Crawling site "${name}" from pair #${idx} (${deepLink})`);
      const crawlerPage = await browser.newPage();
      const res = await crawlerPage.goto(deepLink, {
        waitUntil: "domcontentloaded",
      });
      const link = new URL(res.url());

      // Create exchanger if not exists
      exchangers.set(name, {
        name,
        link: link.protocol + "//" + link.hostname,
        pairs: [[originCurrencyName, currencyName]],
        emailContacts: [],
        tgContacts: [],
      });
      crawlerPage.close();
    }
  }

  console.table(
    Array.from(exchangers.values()).map((ex) => ({
      ...ex,
      pairs: ex.pairs.map((p) => `${p[0]} - ${p[1]}`),
    }))
  );

  await browser.close();
}

main();
