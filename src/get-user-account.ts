import { PublicKey, Connection, AccountInfo } from "@solana/web3.js";
import { USER_ACCOUNT_PUBLICKEY_OFFSET } from "./constants";
import { PROGRAM_ID } from "./constants";

export async function getUserAccount(
  connection: Connection,
  publicKey: PublicKey
): Promise<
  Readonly<{
    account: AccountInfo<Buffer>;
    pubkey: PublicKey;
    parsed: {
      skp: PublicKey;
      ekp: PublicKey;
    };
  }>
> {
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
  const userAccountData = parseUserAccountData(userAccount[0].account.data);

  return {
    ...userAccount[0],
    parsed: userAccountData,
  };
}
export function parseUserAccountData(accountData: Buffer) {
  // Skip the first 34 bytes of initial space
  const skpBytes = accountData.slice(9, 41); // 32 bytes for SKP starting at index 9
  const ekpBytes = accountData.slice(41, 73); // 32 bytes for EKP starting at index 9 + 32

  if (accountData.length != 98) {
    throw new Error("User account data length is not valid");
  }

  // Check that remaining bytes after EKP are all zeros
  const remainingBytes = accountData.slice(41);
  if (!remainingBytes.every((byte) => byte === 0)) {
    throw new Error(
      "Invalid user account data - non-zero bytes found after EKP"
    );
  }
  return {
    skp: new PublicKey(skpBytes),
    ekp: new PublicKey(ekpBytes),
  };
}
