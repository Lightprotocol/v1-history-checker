import { PublicKey, SystemProgram } from "@solana/web3.js";

import dotenv from "dotenv";
import { Connection } from "@solana/web3.js";

dotenv.config();

const RPC_API_URL = process.env.RPC_API_URL!;
const BASE58_KEYPAIR = process.env.BASE58_KEYPAIR!;

if (!RPC_API_URL || !BASE58_KEYPAIR) {
  throw new Error("RPC_API_URL and BASE58_KEYPAIR must be set in .env");
}

export const config = {
  connection: new Connection(RPC_API_URL),
  base58Keypair: BASE58_KEYPAIR,
} as const;

export const USER_ACCOUNT_PUBLICKEY_OFFSET = 2;
export const LEAVES_ACCOUNT_SIZE = 106 + 222;
export const NULLIFIER_NONCE = [110, 102];
export const NULLIFIER_ACCOUNT_SIZE = 2;

export const CURRENT_ENCRYPTION_VERSION = "2";
export const SIGN_MESSAGE =
  "IMPORTANT:\nThe application will be able to spend \nyour shielded assets. \n\nOnly sign the message if you trust this\n application.\n\n View all verified integrations here: \n'https://docs.lightprotocol.com/partners'";

export const PROGRAM_ID = new PublicKey(
  "2c54pLrGpQdGxJWUAoME6CReBrtDbsx5Tqx4nLZZo6av"
);

export const MERKLE_TREE_PDA_PUBKEY = new PublicKey(
  "8PEM1idiDmUJc3efD3Qm1sfHMDs1BPgWHCbNc2bvXdeR"
);

export const TOKEN_POOL_PUBKEY = new PublicKey(
  "HXYi9vKocJKJr4nAi9Csuc3isuFz1LQQ3mjeqKU1iiu6"
);

export const MERKLE_TREE_PDA_PUBKEY_USDC = new PublicKey(
  "DTQURsWrgs3ysUPYAcZ87sEuUb5WS1DA2nnTmYdATnza"
);

export const TOKEN_POOL_PUBKEY_USDC = new PublicKey(
  "MGdrLRQkDPmevuWGy3oVfhZi82YKtBTt4bWxCY6GiPw"
);

export const AUTHORITY = new PublicKey(
  "76zhGJn8HfX11uYEugf2kD735Vs491n1mSbmxukcQyRU"
);

export const MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

export const MINT_USDC = new PublicKey(
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);

export enum Token {
  SOL = "SOL",
  USDC = "USDC",
}
export const TOKEN_REGISTRY = [
  {
    symbol: Token.SOL,
    decimals: 9,
    isSol: true,
    tokenAccount: SystemProgram.programId,
  },
  {
    symbol: Token.USDC,
    decimals: 6,
    isSol: false,
    tokenAccount: MINT,
  },
];

export const RELAYER_ADDRESS = new PublicKey(
  "CZBQHCfGQwUqMQTCk7oeMBtsKcm4KS5g8KuaAwmNriie"
);
export const RELAYER_TOKEN_PUBKEY = new PublicKey(
  "6nuVfp963VPE2BzMi7PuTxDmoCzRnGiGLHRcnFfN1E95"
);

export const relayerTokenPubkey = RELAYER_TOKEN_PUBKEY;

export const INDEXER_FEE = 5000000;
export const INDEXER_FEE_OLD = 256923;

export const INDEXER_FEE_USDC = 290000; // in cents
export const INDEXER_FEE_USDC_OLD_2 = 5000000; // 13dec
export const INDEXER_FEE_USDC_OLD = 2e1;

export const PLUS_FEE_ATA = 150000; // rent
export const PLUS_FEE_ATA_OLD_2 = 2039280; // rent // 13dec
export const PLUS_FEE_ATA_OLD = 1e1; // before 11dec
export const TxType = {
  SHIELD: "shield",
  UNSHIELD: "unshield",
};
export const NULLIFIER_PDA_RENT = 0.0009048 * 1e9;

export const LEAVES_PDA_RENT = 3173760;
export const DB_VERSION = 9;
export const DB_VERSION_USDC = 39;
export const TX_REPLAY_BATCH_SIZE = 100; // 500 old
