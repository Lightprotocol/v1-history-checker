import { Utxo } from "../utxo";
import { Token } from "../constants";

export interface ProcessedUtxo {
  token: Token;
  utxo: Utxo;
  utxoLegacy: Utxo;
  spent: boolean;
  spentLegacy: boolean;
}

export interface LeafAccounts {
  solLegacy: any[];
  usdcLegacy: any;
  sol: any[];
  usdc: any;
}

export interface DecryptedLeaves {
  decryptedUtxoBytes: {
    sol: any[];
    usdc: any[];
  };
}

export interface Keypairs {
  viewingKeypair: any;
  viewingKeypairLegacy: any;
  spendingKeypairLegacy: any;
}
