import { BigNumber } from "ethers";
import { box } from "tweetnacl";
import { randomBN, poseidonHash, toBuffer } from "./utils";
import { KeypairLegacy, Keypair } from "./keypair";

class Utxo {
  amount: BigNumber;
  blinding: BigNumber;
  keypair: KeypairLegacy;
  index: number | null;
  _commitment: BigNumber | null;
  _nullifier: BigNumber | null;
  /** Initialize a new UTXO - unspent transaction output or input. Note, a full TX consists of 2 inputs and 2 outputs
   *
   * @param {BigNumber | BigInt | number | string} amount UTXO amount
   * @param {BigNumber | BigInt | number | string} blinding Blinding factor
   * @param {number|null} index UTXO index in the merkle tree
   */
  constructor({
    amount = BigNumber.from(0),
    keypair = new Keypair(), // shielded pool keypair that is derived from seedphrase. OutUtxo: supply pubkey
    blinding = randomBN(),
    index = null,
  }: {
    amount?: BigNumber | BigInt | number | string;
    keypair?: KeypairLegacy;
    blinding?: BigNumber | BigInt | number | string;
    index?: number | null;
  } = {}) {
    this.amount = BigNumber.from(amount);
    this.blinding = BigNumber.from(blinding);
    this.keypair = keypair;
    this.index = index;
    this._commitment = null;
    this._nullifier = null;
  }
  /**
   * Returns commitment for this UTXO
   *
   * @returns {BigNumber}
   */
  getCommitment() {
    if (!this._commitment) {
      this._commitment = poseidonHash([
        this.amount,
        this.keypair.pubkey,
        this.blinding,
      ]);
    }
    return this._commitment;
  }

  /**
   * Returns nullifier for this UTXO
   *
   * @returns {BigNumber}
   */
  getNullifier() {
    if (!this._nullifier) {
      if (
        Number(this.amount) > 0 &&
        (this.index === undefined ||
          this.index === null ||
          this.keypair.privkey === undefined ||
          this.keypair.privkey === null)
      ) {
        throw new Error(
          "Can not compute nullifier without utxo index or private key"
        );
      }
      const signature = this.keypair.privkey
        ? this.keypair.sign(this.getCommitment(), this.index || 0)
        : 0;
      this._nullifier = poseidonHash([
        this.getCommitment(),
        this.index || 0,
        signature,
      ]);
    }
    return this._nullifier!;
  }

  /**
   * Encrypt UTXO to recipient pubkey
   *
   */
  encrypt(
    nonce: Uint8Array,
    recipientEncryptionPubkey: Uint8Array,
    senderThrowAwayKeypair: { publicKey: Uint8Array; secretKey: Uint8Array }
  ): Uint8Array {
    const bytes: Buffer = Buffer.concat([
      toBuffer(this.blinding, 31),
      toBuffer(this.amount, 8),
    ]);

    var ciphertext: Uint8Array = box(
      bytes,
      nonce,
      recipientEncryptionPubkey,
      senderThrowAwayKeypair.secretKey
    );
    return ciphertext;
  }

  static bytesToUtxo(
    buf: Buffer,
    spendingKeypair: Keypair | KeypairLegacy,
    index: number | null
  ) {
    let duf = Buffer.from(buf);
    return new Utxo({
      blinding: BigNumber.from("0x" + duf.slice(0, 31).toString("hex")),
      amount: BigNumber.from("0x" + duf.slice(31, 39).toString("hex")),
      keypair: spendingKeypair, // only recipient can decrypt, has full keypair
      index: index || null,
    });
  }
}
export { Utxo };
