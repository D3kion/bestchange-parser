import type { Page } from "puppeteer";
import { EMAIL_REGEX, TG_REGEX } from "./patterns";

export async function visitDeeplink(page: Page, link: string): Promise<string> {
  const res = await page.goto(link, { waitUntil: "domcontentloaded" });
  const fullUrl = res?.url();
  if (!fullUrl) throw new Error("Couldn't retrieve exchanger url");
  const url = new URL(fullUrl);
  return url.protocol + "//" + url.hostname;
}

export async function parseContactLinks(
  page: Page
): Promise<[string[], string[]]> {
  let emailLinks: Set<string> = new Set();
  const tgLinks = new Set(await findLinksByRegex(page, TG_REGEX));
  // TODO: find tg deeplinks?
  if (!tgLinks.size) {
    emailLinks = new Set(await findLinksByRegex(page, EMAIL_REGEX));
  }

  return [
    Array.from(tgLinks),
    Array.from(emailLinks).map((l) => l.replace("mailto:", "")),
  ];
}

export async function findLinksByRegex(
  page: Page,
  regex: RegExp,
  mustReturnHref = false
): Promise<string[]> {
  const nodes = await page.$$("a");
  return (
    await Promise.all(
      nodes.map(async (n) => {
        const link = (await page.evaluate((el) => el.href, n)) || "";
        if (regex.test(link)) return link;
        const text = (await page.evaluate((el) => el.textContent, n)) || "";
        if (regex.test(text)) return mustReturnHref ? link : text.trim();
        return null;
      })
    )
  ).filter(Boolean) as string[];
}
