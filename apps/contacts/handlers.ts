import type { Page } from "puppeteer";

export async function visitDeeplink(page: Page, link: string): Promise<string> {
  const res = await page.goto(link, { waitUntil: "domcontentloaded" });
  const url = res?.url();
  if (!url) throw new Error("Couldn't retrieve exchanger url");
  return url;
}

export async function findLinksByRegex(
  page: Page,
  regex: RegExp
): Promise<string[]> {
  const nodes = await page.$$("a");
  return (
    await Promise.all(
      nodes.map(async (n) => {
        const text = (await page.evaluate((el) => el.textContent, n)) || "";
        if (regex.test(text)) return text;
        const link = (await page.evaluate((el) => el.href, n)) || "";
        if (regex.test(link)) return link;
        return null;
      })
    )
  ).filter(Boolean) as string[];
}
