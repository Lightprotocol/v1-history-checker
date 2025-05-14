import { PublicKey, Connection } from "@solana/web3.js";
import { USER_ACCOUNT_PUBLICKEY_OFFSET } from "./constants";
import { PROGRAM_ID } from "./constants";

export async function getUserAccount(
  connection: Connection,
  publicKey: PublicKey
) {
  let userAccount = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: USER_ACCOUNT_PUBLICKEY_OFFSET,
          bytes: publicKey.toBase58(),
        },
      },
    ],
    commitment: "confirmed",
  });

  if (userAccount.length === 0) {
    throw new Error(
      `Wallet ${publicKey.toBase58()} does not have a user account for Light Shield V1`
    );
  }

  return userAccount[0].account.data;
}
