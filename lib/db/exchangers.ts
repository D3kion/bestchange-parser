import fs from "fs/promises";
import { Exchanger } from "../domain";

export async function readExchangers(path: string): Promise<Exchanger[]> {
  try {
    const dataStr = (await fs.readFile(path, "utf-8")).toString();
    return JSON.parse(dataStr);
  } catch (err) {
    console.error("Couldn't read file:", err);
  }
  return [];
}
