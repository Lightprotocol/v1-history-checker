import { ethers } from "ethers";
import { poseidonHash } from "./utils";
import { utils } from "@coral-xyz/anchor";
import nacl from "tweetnacl";
const decode = utils.bytes.hex.decode;

const getEncryptionPublicKey = (privateKey: any) => {
  const privateKeyUint8Array = Uint8Array.from(decode(privateKey));
  const encryptionPublicKey =
    nacl.box.keyPair.fromSecretKey(privateKeyUint8Array).publicKey;
  return utils.bytes.base64.encode(Buffer.from(encryptionPublicKey));
};

class Keypair {
  /**
   * Initialize a new keypair. Generates a random private key if not defined
   *
   * @param {string} privkey
   */
  privkey: any;
  pubkey: any;
  encryptionKey: any;

  constructor(privkey = ethers.Wallet.createRandom().privateKey) {
    this.privkey = privkey;
    this.pubkey = poseidonHash([this.privkey]);
    this.encryptionKey = getEncryptionPublicKey(this.privkey.slice(2)); // slice to remove 0x
  }

  /**
   * Sign a message using keypair private key
   *
   * @param {string|number|BigNumber} commitment a hex string with commitment
   * @param {string|number|BigNumber} merklePath a hex string with merkle path
   * @returns {BigNumber} a hex string with signature
   */
  sign(commitment: string, merklePath: string) {
    return poseidonHash([this.privkey, commitment, merklePath]);
  }
}

class KeypairLegacy {
  /**
   * Initialize a new keypair. Generates a random private key if not defined
   *
   * @param {string} privkey
   */
  privkey: any;
  pubkey: any;
  encryptionKey: any;
  constructor(privkey = ethers.Wallet.createRandom().privateKey) {
    this.privkey = privkey;
    this.pubkey = poseidonHash([this.privkey]);
    this.encryptionKey = getEncryptionPublicKey(privkey.slice(2)); // legacy
  }

  /**
   * Sign a message using keypair private key
   *
   * @param {string|number|BigNumber} commitment a hex string with commitment
   * @param {string|number|BigNumber} merklePath a hex string with merkle path
   * @returns {BigNumber} a hex string with signature
   */
  sign(commitment: any, merklePath: any) {
    return poseidonHash([this.privkey, commitment, merklePath]);
  }
}

export { Keypair, KeypairLegacy, getEncryptionPublicKey };
