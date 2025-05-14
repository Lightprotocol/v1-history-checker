//@ts-nocheck
const { BN } = require("@coral-xyz/anchor");
const crypto = require("crypto");
const { ethers } = require("ethers");
const BigNumber = ethers.BigNumber;
const { poseidon } = require("circomlib");
var ffjavascript = require("ffjavascript");
const { unstringifyBigInts, leInt2Buff, beInt2Buff } = ffjavascript.utils;

const poseidonHash = (items) => BigNumber.from(poseidon(items).toString());
const anchorPoseidonHash = (items) => new BN(poseidon(items).toString());
const poseidonHash2 = (a, b) => poseidonHash([a, b]);

const FIELD_SIZE = BigNumber.from(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

/** Generate random number of specified byte length */
const randomBN = (nbytes = 31) => BigNumber.from(crypto.randomBytes(nbytes));

const prepareProofData = (
  inputBytes,
  proofBytes,
  extDataBytes,
  print = false
) => {
  var ixData = new Uint8Array(824); //testing, was: +131 + 8 ,, // 936 rn, inputs: 224 bytes, proof: 575 bytes (256 bytes!) including the 8 test bytes ofc. 32mtpda,1index
  inputBytes.map((b, index) => (ixData[index + 9] = b)); // 224
  proofBytes.map((b, index) => (ixData[index + 9 + 224] = b)); // 256

  extDataBytes.map((b, index) => (ixData[index + 9 + 224 + 256] = b)); // 334: 32 recipient + 32 relayer + 8 amount + 32 mtpubkey+ 32 fee + 222

  if (print) {
    let buffer_ixData = Buffer.from(ixData);
    let str = "";
    for (var i = 0; i < 824; i++) {
      str += buffer_ixData[i] + ",";
    }
  }
  return ixData;
};

function publicInputsBytesToObject(inputs) {
  let obj = {
    // 335
    recipient: inputs.slice(0, 32), // 32
    extAmount: inputs.slice(32, 40), // 8
    relayer: inputs.slice(40, 72), // 32
    fee: inputs.slice(72, 80), // 8
    merkleTreePubkeyBytes: inputs.slice(80, 112), // 32
    merkleTreeIndex: inputs.slice(112, 113), // 1
    encryptedOutput1: inputs.slice(113, 168), // 55
    nonce1: inputs.slice(168, 192), // 24
    senderThrowAwayPubkey1: inputs.slice(192, 224), //32
    encryptedOutput2: inputs.slice(224, 279), // 55
    nonce2: inputs.slice(279, 303), // 24
    senderThrowAwayPubkey2: inputs.slice(303, 335), //32
  };
  return obj;
}

function getExtDataHash({
  recipient,
  extAmount,
  relayer,
  fee,
  merkleTreePubkeyBytes,
  encryptedOutput1,
  nonce1,
  senderThrowAwayPubkey1,
  encryptedOutput2,
  nonce2,
  senderThrowAwayPubkey2,
  mt = 0, // 1=usdc
}) {
  let encodedData = new Uint8Array([
    ...recipient, // 32
    ...extAmount, // 8
    ...relayer, // 32
    ...fee, // 8
    ...merkleTreePubkeyBytes, // 32
    mt, // index of merkletreetokenpda : part []
    ...encryptedOutput1, // 216
    ...nonce1,
    ...senderThrowAwayPubkey1,
    ...encryptedOutput2,
    ...nonce2,
    ...senderThrowAwayPubkey2,
  ]);
  const hash = ethers.utils.keccak256(Buffer.from(encodedData));

  return {
    extDataHash: BigNumber.from(hash).mod(FIELD_SIZE),
    extDataBytes: encodedData,
  };
}

//
/** BigNumber to hex string of specified length */
function toFixedHex(number, length = 32) {
  let result =
    "0x" +
    (number instanceof Buffer
      ? number.toString("hex")
      : BigNumber.from(number).toHexString().replace("0x", "")
    ).padStart(length * 2, "0");
  if (result.indexOf("-") > -1) {
    result = "-" + result.replace("-", "");
  }
  return result;
}

const toBytes = (string) => {
  const buffer = Buffer.from(string, "utf8");
  const result = Array(buffer.length);
  for (var i = 0; i < buffer.length; i++) {
    result[i] = buffer[i];
  }
  return result;
};

/** Convert value into buffer of specified byte length */
const toBuffer = (value, length) =>
  Buffer.from(
    BigNumber.from(value)
      .toHexString()
      .slice(2)
      .padStart(length * 2, "0"),
    "hex"
  );

const toPad = (value, length) =>
  Buffer.from(
    BigNumber.from(value)
      .toHexString()
      .slice(2)
      .padStart(length * 2, "0"),
    "hex"
  );
const intToBuffer = (hash, len = 32) =>
  beInt2Buff(unstringifyBigInts(hash), len);

const testest = (data, bytes = 32) =>
  leInt2Buff(unstringifyBigInts(data), bytes);

const leInt2Buffer = (data, bytes = 32) =>
  leInt2Buff(unstringifyBigInts(data), bytes);

function shuffle(array) {
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

async function parseInputsToBytes(data) {
  var mydata = JSON.parse(data.toString());

  for (var i in mydata) {
    mydata[i] = leInt2Buff(unstringifyBigInts(mydata[i]), 32).toString();
  }

  return mydata;
}

async function parseInputsToBytesArray(data) {
  var mydata = JSON.parse(data.toString());

  try {
    for (var i in mydata) {
      mydata[i] = leInt2Buff(unstringifyBigInts(mydata[i]), 32);
    }
  } catch (e) {
    console.log("CAUGHT:", e);
  }

  let x = [];
  mydata.map((array) => {
    array.map((byte) => {
      x.push(byte);
    });
  });

  return x;
}

async function parseProofToBytes(data) {
  var mydata = JSON.parse(data.toString());

  for (var i in mydata) {
    if (i == "pi_a") {
      for (var j in mydata[i]) {
        try {
          mydata[i][j] = leInt2Buff(
            unstringifyBigInts(mydata[i][j]),
            32 // 48
          ).toString();
        } catch (e) {
          console.log("CAUGHT in pi_a:", e);
        }
      }
    } else if (i == "pi_b") {
      for (var j in mydata[i]) {
        for (var z in mydata[i][j]) {
          try {
            mydata[i][j][z] = leInt2Buff(
              unstringifyBigInts(mydata[i][j][z]),
              32 // 48
            ).toString();
          } catch (e) {
            console.log("CAUGHT in pi_b:", e);
          }
        }
      }
    } else if (i == "pi_c") {
      for (var j in mydata[i]) {
        try {
          mydata[i][j] = leInt2Buff(
            unstringifyBigInts(mydata[i][j]),
            32 //48
          ).toString();
        } catch (e) {
          console.log("CAUGHT in pi_c:", e);
        }
      }
    }
  }
  let mydataStripped = {
    pi_a: mydata.pi_a,
    pi_b: mydata.pi_b,
    pi_c: mydata.pi_c,
  };

  return mydataStripped;
}

async function parseProofToBytesArray(data) {
  var mydata = JSON.parse(data.toString());
  let x = [];

  for (var i in mydata) {
    if (i == "pi_a") {
      for (var j in mydata[i]) {
        try {
          mydata[i][j] = leInt2Buff(
            unstringifyBigInts(mydata[i][j]),
            32 // 48
          );
        } catch (e) {
          console.log("CAUGHT in pi_a:", e);
        }
      }
    } else if (i == "pi_b") {
      for (var j in mydata[i]) {
        for (var z in mydata[i][j]) {
          try {
            mydata[i][j][z] = leInt2Buff(
              unstringifyBigInts(mydata[i][j][z]),
              32 // 48
            );
          } catch (e) {
            console.log("CAUGHT in pi_b:", e);
          }
        }
      }
    } else if (i == "pi_c") {
      for (var j in mydata[i]) {
        try {
          mydata[i][j] = leInt2Buff(
            unstringifyBigInts(mydata[i][j]),
            32 //48
          );
        } catch (e) {
          console.log("CAUGHT in pi_c:", e);
        }
      }
    }
  }
  // console.log("after loops", mydata);
  let mydataStripped = [
    mydata.pi_a[0],
    mydata.pi_a[1],
    mydata.pi_b[0],
    mydata.pi_b[1],
    mydata.pi_c[0],
    mydata.pi_c[1],
  ];
  var merged = [].concat.apply([], mydataStripped);

  merged.map((array) => {
    array.map((byte) => {
      x.push(byte);
    });
  });

  return x;
}

export {
  FIELD_SIZE,
  randomBN,
  toFixedHex,
  toBuffer,
  intToBuffer,
  poseidonHash,
  poseidonHash2,
  getExtDataHash,
  shuffle,
  toBytes,
  parseInputsToBytes,
  parseProofToBytes,
  parseProofToBytesArray,
  parseInputsToBytesArray,
  testest,
  leInt2Buffer,
  prepareProofData,
  publicInputsBytesToObject,
  anchorPoseidonHash,
};
