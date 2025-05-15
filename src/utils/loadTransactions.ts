import * as fs from "fs";
import * as path from "path";
import { LightTransaction } from "../get-all-transactions";

export async function loadTransactions(): Promise<LightTransaction[]> {
  const filePath = path.join(
    __dirname,
    "../accounts/transactions_sol_2025-05-15T02-17-47-027Z-2.json"
  );
  const fileContent = await fs.promises.readFile(filePath, "utf-8");
  return JSON.parse(fileContent) as LightTransaction[];
}
