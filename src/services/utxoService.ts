import { Token } from "../constants";
import { Utxo } from "../utxo";
import { ProcessedUtxo } from "../types";
import { isUtxoNullified } from "../decrypt/util";

export class UtxoService {
  static processUtxos(
    utxos: any[],
    token: Token,
    keypairs: any,
    nullifiers: any,
    leafAccounts: any,
    spentUtxos: ProcessedUtxo[]
  ): void {
    utxos.forEach((utxo) => {
      const processedUtxo: ProcessedUtxo = {
        token,
        utxo: Utxo.bytesToUtxo(
          utxo.utxo.buf,
          keypairs.spendingKeypair!,
          utxo.utxo.index
        ),
        utxoLegacy: Utxo.bytesToUtxo(
          utxo.utxo.buf,
          keypairs.spendingKeypairLegacy!,
          utxo.utxo.index
        ),
        spent: false,
        spentLegacy: false,
      };

      processedUtxo.spent = isUtxoNullified(
        processedUtxo.utxo,
        nullifiers,
        leafAccounts[
          token.toLowerCase() as "sol" | "usdc"
        ].sortedLeafAccounts.map((acc: any) => acc.leaves.left.toString())
      );

      processedUtxo.spentLegacy = isUtxoNullified(
        processedUtxo.utxoLegacy,
        nullifiers,
        leafAccounts[
          token.toLowerCase() as "sol" | "usdc"
        ].sortedLeafAccounts.map((acc: any) => acc.leaves.left.toString())
      );

      spentUtxos.push(processedUtxo);
    });
  }
}
