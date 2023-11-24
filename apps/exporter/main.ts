import "dotenv/config";
import {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
} from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { Exchanger } from "../../lib/domain";
import { readExchangers } from "../../lib/db";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const COLUMNS = [
  "Exchanger",
  "Exchange pairs",
  "Pairs count",
  "Site",
  "Contacts",
];

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

  const exchangers = await readExchangers(process.env.REPORT_FILE);
  // Write exchangers with telegram
  const sheetTg = doc.sheetsByIndex[0];
  sheetTg.setHeaderRow(COLUMNS);
  sheetTg.clearRows();

  const tgExchangers = exchangers
    .map((e) => ({
      ...e,
      tgContacts: e.tgContacts?.filter((c) => !c.includes("aml")),
    }))
    .filter((e) => !!e.tgContacts?.length);
  for (let i = 0; i < tgExchangers.length; i += 1000) {
    writeChunk(sheetTg, tgExchangers.slice(i, i + 1000));
  }

  // Write exchangers with emails
  const sheetEmail = doc.sheetsByIndex[1];
  sheetEmail.setHeaderRow(COLUMNS);
  sheetEmail.clearRows();

  const emailExchangers = exchangers.filter((e) => !!e.emailContacts?.length);
  for (let i = 0; i < emailExchangers.length; i += 1000) {
    writeChunk(sheetEmail, emailExchangers.slice(i, i + 1000), "email");
  }
}

function writeChunk(
  sheet: GoogleSpreadsheetWorksheet,
  chunk: Exchanger[],
  contactField: "tg" | "email" = "tg"
) {
  sheet.addRows(
    chunk.map((e) => [
      e.name,
      e.pairs.map((p) => p[1]).join(", "),
      e.pairs.length,
      e.url || "",
      (contactField === "tg" ? e.tgContacts : e.emailContacts)?.join("\n") ||
        "",
    ])
  );
}

main();
