script to traverse ~20k transactions and ~40k utxos and try to decrypt all of
them for a given wallet.

steps:

1. install dependencies

```bash
npm i --legacy-peer-deps
```

2. set the .env file with your wallet's public key and rpc url

```bash
RPC_API_URL="https://mainnet.helius-rpc.com/?api-key=<YOUR_API_KEY>"
BASE58_KEYPAIR="<YOUR_WALLET_PRIVATE_KEY>" # as base58 string
```

3. run the script

```bash
npm run dev
```

the process may take up to 30 minutes to complete.

when finished, you can find the all found user transactions inside
`transactions.json` file and the enriched utxo data in the `enrichedUtxos.json`
file.
