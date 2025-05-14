import { toFixedHex } from "../utils";
import {
  PROGRAM_ID,
  MERKLE_TREE_PDA_PUBKEY,
  MERKLE_TREE_PDA_PUBKEY_USDC,
  Token,
} from "../constants";
import { LeafAccount, leafAccountToBytes } from "./util";
import { Connection } from "@solana/web3.js";

export async function fetchAndSortLeavesLegacy({
  token,
  connection,
}: {
  token: string;
  connection: Connection;
}) {
  var leafAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 106 + 222 }],
    commitment: "confirmed",
  });

  var leavesToSort: LeafAccount[] = [];
  leafAccounts.map((acc) => {
    let bytes = leafAccountToBytes(acc, 0); // null
    leavesToSort.push(bytes);
  });
  if (token === Token.USDC) {
    leavesToSort = leavesToSort.filter(
      (leaf) =>
        leaf.merkletreePubkey.publicKey.toBase58() ===
        MERKLE_TREE_PDA_PUBKEY_USDC.toBase58()
    );
  } else if (token === Token.SOL) {
    leavesToSort = leavesToSort.filter(
      (leaf) =>
        leaf.merkletreePubkey.publicKey.toBase58() ===
        MERKLE_TREE_PDA_PUBKEY.toBase58()
    );
  }

  // sort leaves by index
  leavesToSort.sort(
    (a, b) => parseFloat(a.index.u64) - parseFloat(b.index.u64)
  );

  let sortedLeafAccounts = leavesToSort;
  var leaves = [];
  for (var i = 0; i < leavesToSort.length; i++) {
    leaves.push(toFixedHex(leavesToSort[i].leaves.left.reverse()));
    leaves.push(toFixedHex(leavesToSort[i].leaves.right.reverse()));
  }
  return { sortedLeafAccounts, leaves };
}

export async function sortLeaves({
  token,
  connection,
}: {
  token: string;
  connection: Connection;
}) {
  var leafAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 106 + 222 }],
    commitment: "confirmed",
  });

  var leavesToSort: LeafAccount[] = [];
  leafAccounts.map((acc) => {
    let bytes = leafAccountToBytes(acc, 0); // null
    leavesToSort.push(bytes);
  });
  if (token === Token.USDC) {
    leavesToSort = leavesToSort.filter(
      (leaf) =>
        leaf.merkletreePubkey.publicKey.toBase58() ===
        MERKLE_TREE_PDA_PUBKEY_USDC.toBase58()
    );
  } else if (token === Token.SOL) {
    leavesToSort = leavesToSort.filter(
      (leaf) =>
        leaf.merkletreePubkey.publicKey.toBase58() ===
        MERKLE_TREE_PDA_PUBKEY.toBase58()
    );
  }

  // sort leaves by index
  leavesToSort.sort(
    (a, b) => parseFloat(a.index.u64) - parseFloat(b.index.u64)
  );

  let sortedLeafAccounts = leavesToSort;
  var leaves = [];
  for (var i = 0; i < leavesToSort.length; i++) {
    leaves.push(toFixedHex(leavesToSort[i].leaves.left.reverse()));
    leaves.push(toFixedHex(leavesToSort[i].leaves.right.reverse()));
  }
  return { sortedLeafAccounts, leaves };
}
