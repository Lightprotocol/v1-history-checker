import { BN } from "@coral-xyz/anchor";
import * as hkdf from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { blake2b } from "@noble/hashes/blake2b";
import { Keypair as _Keypair } from "@solana/web3.js";
import { Keypair, KeypairLegacy } from "./keypair";
import nacl, { box } from "tweetnacl";
import { ethers } from "ethers";
//@ts-ignore
import { AES, enc } from "crypto-js";
import { anchorPoseidonHash } from "./utils";
/**
 * Rn, we're not using a salt. the masterKey is still using blake2b
 *
 *
 */
const dkLen: number = 32;
const b2params = { dkLen: 32 };

export function getViewingKeypair(seed: string) {
  const encInfo = "viewingKey";
  const viewingPrivateKey = hkdf.expand(sha256, seed, encInfo, dkLen);

  return box.keyPair.fromSecretKey(viewingPrivateKey);
}

export function getBurnerKeypair(seed: string) {
  const burnInfo = "burnerKey";
  const burnerPrivateKey = hkdf.expand(sha256, seed, burnInfo, dkLen);

  return _Keypair.fromSeed(burnerPrivateKey);
}

export function getSpendingKeypair(seed: string) {
  const shieldInfo = "shieldedKeypair";
  const se = hkdf.expand(sha256, seed, shieldInfo, dkLen);

  const hse = anchorPoseidonHash([new BN(se)]);
  const spendingPrivatekey = "0x" + hse.toString("hex", 32);
  return new Keypair(spendingPrivatekey);
}

export function getEncryptionKeypairLegacy(seed: string) {
  const encryptionPrivkey = ethers.utils.keccak256(
    Buffer.from(seed),
    //@ts-ignore
    "enc_keypair"
  );
  // To encrypt and decrypt and send to recipient's ekp.pubkey
  const encryptionKeypair = box.keyPair.fromSecretKey(
    Buffer.from(encryptionPrivkey.slice(2), "hex")
  );
  return encryptionKeypair;
}

export function getBurnerKeypairLegacy(seed: string) {
  //@ts-ignore
  const hash = ethers.utils.keccak256(Buffer.from(seed), "burner_wallet");
  const burnerKeypair = _Keypair.fromSeed(Buffer.from(hash.slice(2), "hex"));
  return burnerKeypair;
}

export function getShieldedKeypairLegacy(seed: string) {
  const shieldedPrivkey = ethers.utils.keccak256(
    Buffer.from(seed),
    //@ts-ignore
    "shielded_keypair"
  );
  const shieldedKeypair = new KeypairLegacy(shieldedPrivkey);
  return shieldedKeypair;
}

export function encryptDataAES(data: any, secret: any) {
  return AES.encrypt(JSON.stringify(data), secret).toString();
}
export function decryptDataAES(encryptedData: any, secret: any) {
  const bytes = AES.decrypt(encryptedData, secret);
  const decryptedData = JSON.parse(bytes.toString(enc.Utf8));
  return decryptedData;
}
export function getLocalStorageEncryptionKeypair(seed: string) {
  const localEncInfo = "localStoreEncryptionKeypair";
  const localEncPrivateKey = hkdf.expand(sha256, seed, localEncInfo, dkLen);

  return box.keyPair.fromSecretKey(localEncPrivateKey);
}

/** this is the new version; yet to replace legacy
 * derives legacy too for backward compatibility.
 * add to decr. parts /blockbased decr.
 */
export function encodeSignature(signature: Uint8Array): string {
  return new BN(blake2b.create(b2params).update(signature).digest()).toString(
    "hex"
  );
}
export function deriveKeypairsFromSignature(
  signature: Uint8Array
): AllUserKeypairs {
  const seed = encodeSignature(signature);
  const viewingKeypair = getViewingKeypair(seed);
  const burnerKeypair = getBurnerKeypair(seed);
  const spendingKeypair = getSpendingKeypair(seed);
  const localStorageEncryptionKeypair = getLocalStorageEncryptionKeypair(seed);
  const {
    encryptionKeypairLegacy: viewingKeypairLegacy,
    burnerKeypairLegacy,
    shieldedKeypairLegacy: spendingKeypairLegacy,
  } = deriveKeypairsFromSignatureLegacy(signature);
  return {
    viewingKeypair,
    burnerKeypair,
    spendingKeypair,
    localStorageEncryptionKeypair,
    viewingKeypairLegacy,
    burnerKeypairLegacy,
    spendingKeypairLegacy,
  };
}

export function deriveKeypairsFromSignatureLegacy(signature: any) {
  const encryptionKeypairLegacy = getEncryptionKeypairLegacy(signature);
  const burnerKeypairLegacy = getBurnerKeypairLegacy(signature);
  const shieldedKeypairLegacy = getShieldedKeypairLegacy(signature);
  return {
    encryptionKeypairLegacy,
    burnerKeypairLegacy,
    shieldedKeypairLegacy,
  };
}

export type AllUserKeypairs = {
  spendingKeypair: Keypair | null;
  burnerKeypair: _Keypair | null;
  viewingKeypair: nacl.BoxKeyPair | null;
  // legacy
  spendingKeypairLegacy: KeypairLegacy | null;
  burnerKeypairLegacy: _Keypair | null;
  viewingKeypairLegacy: nacl.BoxKeyPair | null;
  localStorageEncryptionKeypair: nacl.BoxKeyPair | null;
};
