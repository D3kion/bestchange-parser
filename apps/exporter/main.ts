import "dotenv/config";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { readExchangers } from "../../lib/db";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

async function main() {
  if (
    !process.env.REPORT_FILE ||
    !process.env.SPREADSHEET_ID ||
    !process.env.GOOGLE_SERVICE_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  )
    return console.error("GOOGLE_API_KEY and SPREADSHEET_ID must be specified");

  const authToken = new JWT({
    email: process.env.GOOGLE_SERVICE_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY,
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, authToken);
  await doc.loadInfo();

  const sheetTg = doc.sheetsByIndex[0];
  sheetTg.setHeaderRow(["Exchanger", "Pairs", "Site", "Contacts"]);
  sheetTg.clearRows();

  const exchangers = await readExchangers(process.env.REPORT_FILE);
  const tgExchangers = exchangers.filter((e) => !!e.tgContacts?.length);
  for (let i = 0; i < tgExchangers.length; i += 1000) {
    sheetTg.addRows(
      tgExchangers
        .slice(i, i + 1000)
        .map((e) => [
          e.name,
          e.pairs.map((p) => `${p[0]} - ${p[1]}`).join(", "),
          e.url || "",
          e.tgContacts?.join("\n") || "",
        ])
    );
  }

  const sheetEmail = doc.sheetsByIndex[1];
  sheetEmail.setHeaderRow(["Exchanger", "Pairs", "Site", "Contacts"]);
  sheetEmail.clearRows();

  const emailExchangers = exchangers.filter((e) => !!e.emailContacts?.length);
  for (let i = 0; i < emailExchangers.length; i += 1000) {
    sheetEmail.addRows(
      emailExchangers
        .slice(i, i + 1000)
        .map((e) => [
          e.name,
          e.pairs.map((p) => `${p[0]} - ${p[1]}`).join(", "),
          e.url || "",
          e.emailContacts?.join("\n") || "",
        ])
    );
  }
}

main();
