import type { ElementHandle, Page } from "puppeteer";
import type { Exchanger } from "../../lib/domain";

export async function clickOriginCurrency(
  page: Page,
  currency: string
): Promise<string> {
  const [btn] = await page.$x(
    `//td[@class="lc"]/a[contains(., "${currency}")]`
  );
  if (!btn) throw new Error("Couldn't find origin currency button");
  const currencyName = await btn.evaluate((el) => el.textContent);
  if (!currencyName) throw new Error("Couldn't evaluate origin currency name");
  await (btn as ElementHandle<Element>).click();
  return currencyName;
}

export async function getTargetCurrency(
  page: Page,
  currencyId: string
): Promise<[ElementHandle, string]> {
  const btn = await page.waitForSelector(`#${currencyId}`);
  if (!btn) throw new Error("Couldn't evaluate target currency button");
  const currencyName = await btn.evaluate((el) => el.textContent);
  if (!currencyName) throw new Error("Couldn't evaluate target currency name");
  return [btn, currencyName];
}

export async function getExchangersForPair(
  page: Page,
  originName: string,
  targetName: string
): Promise<Exchanger[]> {
  const exchangers = new Map<string, Exchanger>();
  // Iterate over exchangers and save them
  const content = await page.$$(`#content_table tbody tr`);
  for (const row of content) {
    const name = await row.$eval(".ca", (el) => el.textContent);
    if (!name) throw new Error("Couldn't find exchanger name");

    // Add pairs if already exists
    if (exchangers.has(name)) {
      const exchanger = exchangers.get(name)!;
      exchangers.set(name, {
        ...exchanger,
        pairs: [...exchanger.pairs, [originName, targetName]],
      });
      continue;
    }

    // Create exchanger if not exists
    exchangers.set(name, {
      name,
      deepLink: await row.$eval("a", (el) => el.href),
      pairs: [[originName, targetName]],
    });
  }
  return Array.from(exchangers).map(([, data]) => data);
}
