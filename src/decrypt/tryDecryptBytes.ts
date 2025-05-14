// //@ts-check
// const {
//   MERKLE_TREE_PDA_PUBKEY,
//   MERKLE_TREE_PDA_PUBKEY_USDC,
// } = require("../../constants");
// const nacl = require("tweetnacl");
// const solana = require("@solana/web3.js");

// // const MERKLE_TREE_PDA_PUBKEY = new solana.PublicKey(
// //   "7hR6XJMP9sfRWCzF3SrDVjNkjzNX7auRfQvFqVFtUq4A",
// // );
// // const MERKLE_TREE_PDA_PUBKEY_USDC = new solana.PublicKey(
// //   "G2oWBhndTdg3ZbVANcSBTNWsVunkkLRDEThyAoaw88Kk",
// // );
// // MAINNET:

// // const MERKLE_TREE_PDA_PUBKEY = new solana.PublicKey(
// //   "8PEM1idiDmUJc3efD3Qm1sfHMDs1BPgWHCbNc2bvXdeR",
// // );
// // const MERKLE_TREE_PDA_PUBKEY_USDC = new solana.PublicKey(
// //   "DTQURsWrgs3ysUPYAcZ87sEuUb5WS1DA2nnTmYdATnza",
// // );
// const Token = {
//   SOL: "SOL",
//   USDC: "USDC",
// };
// const tryDecryptBytes = (
//   sortedLeafAccounts,
//   recipientEncryptionKeypair,
//   recipientEncryptionKeypairLegacy,
// ) => {
//   let userUtxos = [];
//   let userIndices = [];

//   sortedLeafAccounts.map((acc) => {
//     let {
//       encryptedUtxos,
//       merkletreePubkey: { bytes },
//     } = acc;
//     const publicKey = new solana.PublicKey(bytes);
//     let token =
//       publicKey.toBase58() === MERKLE_TREE_PDA_PUBKEY?.toBase58()
//         ? Token.SOL
//         : publicKey.toBase58() === MERKLE_TREE_PDA_PUBKEY_USDC?.toBase58()
//         ? Token.USDC
//         : null;
//     let decrypted = [];
//     let utxoPair = [encryptedUtxos.utxo0, encryptedUtxos.utxo1];
//     let nonces = [encryptedUtxos.nonce0, encryptedUtxos.nonce1];
//     let senderThrowAwayPubkeys = [
//       encryptedUtxos.senderThrowAwayPubkey0,
//       encryptedUtxos.senderThrowAwayPubkey1,
//     ];
//     // Try decrypt utxos (legacy)
//     utxoPair.map((encryptedUtxo, i) => {
//       let [success, utxoBytes] = decryptIntoBytes(
//         encryptedUtxo,
//         nonces[i],
//         senderThrowAwayPubkeys[i],
//         recipientEncryptionKeypair,
//         acc.index.u64,
//       );

//       if (success) {
//         let utxo = utxoBytes;
//         decrypted.push({ token, utxo, legacy: false });
//         if (!userIndices.includes(acc.index.u64 / 2)) {
//           userIndices.push(acc.index.u64 / 2);
//         }
//       } else if (!success) {
//         let [successLegacy, utxoBytesLegacy] = decryptIntoBytes(
//           encryptedUtxo,
//           nonces[i],
//           senderThrowAwayPubkeys[i],
//           recipientEncryptionKeypairLegacy,
//           acc.index.u64,
//         );
//         if (successLegacy) {
//           let utxo = utxoBytesLegacy;
//           decrypted.push({ token, utxo, legacy: true });
//           if (!userIndices.includes(acc.index.u64 / 2)) {
//             userIndices.push(acc.index.u64 / 2);
//           }
//         }
//       }
//     });
//     userUtxos.push(...decrypted);
//   });

//   return { userUtxos, userIndices };
// };

// function decryptIntoBytes(
//   encryptedUtxo,
//   nonce,
//   senderThrowAwayPubkey,
//   recipientEncryptionKeypair,
//   index,
// ) {
//   var cleartext = nacl.box.open(
//     encryptedUtxo,
//     nonce,
//     senderThrowAwayPubkey,
//     recipientEncryptionKeypair.secretKey,
//   );

//   if (!cleartext) {
//     return [false, null];
//   }
//   var buf = Buffer.from(cleartext);
//   return [true, { buf, index }];
// }

// module.exports = {
//   tryDecryptBytes,
// };
