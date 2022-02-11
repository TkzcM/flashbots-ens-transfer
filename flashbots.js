import pkg from "ethers";
const { BigNumber, providers, Wallet } = pkg;
import {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
} from "@flashbots/ethers-provider-bundle";

const GWEI = BigNumber.from(10).pow(9);
const PRIORITY_FEE = GWEI.mul(50);
const BLOCKS_IN_THE_FUTURE = 2;

const ETHEREUM_RPC_URL = "https://mainnet.infura.io/v3/INFURA_ENDPOINT_TOKEN";
const provider = new providers.JsonRpcProvider({ url: ETHEREUM_RPC_URL });
// Standard json rpc provider directly from ethers.js. For example you can use Infura, Alchemy, or your own node.
const myWallet = new Wallet(""); // private key
const hackedWallet = new Wallet("");
const block = await provider.getBlock(await provider.getBlockNumber());
const authSigner = new Wallet("");
// `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
// This is an identifying key for signing payloads to establish reputation and whitelisting

const flashbotsProvider = await FlashbotsBundleProvider.create(
  provider,
  authSigner
);
// Flashbots provider requires passing in a standard provider and an auth signer
const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
  block.baseFeePerGas,
  BLOCKS_IN_THE_FUTURE
);
const signedBundle = await flashbotsProvider.signBundle([
  {
    signer: myWallet,
    transaction: {
      to: hackedWallet.address,
      type: 2,
      maxFeePerGas: PRIORITY_FEE.add(maxBaseFeeInFutureBlock),
      maxPriorityFeePerGas: PRIORITY_FEE,
      gasLimit: 21000,
      data: "0x",
      value: "0x2386f26fC10000",
      chainId: 1,
    },
  },
  {
    signer: hackedWallet,
    transaction: {
      to: "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85", // ens contract
      type: 2,
      maxFeePerGas: PRIORITY_FEE.add(maxBaseFeeInFutureBlock),
      maxPriorityFeePerGas: PRIORITY_FEE,
      gasLimit: 50000,
      data:
        "0x42842e0e00000000000000000000000000000003cd3aa7e760877f03275621d2692f58410000000000000000000000004e6fec28f5316c2829d41bc2187202c70ec75bc71d82c6d686cc910078ccb531195027bbe430e06d6c914567f5192bbfab4d3efd",
      value: "0x0",
      chainId: 1,
      nonce: 831,
    },
  },
]);
const targetBlock = block.number + BLOCKS_IN_THE_FUTURE;
const bundleReceipt = await flashbotsProvider.simulate(
  signedBundle,
  targetBlock
);
if ("error" in bundleReceipt) {
  console.warn(`Simulation Error: ${bundleReceipt.error.message}`);
  process.exit(1);
} else {
  console.log(`Simulation Success: ${JSON.stringify(bundleReceipt, null, 2)}`);
}
const bundleSubmission = await flashbotsProvider.sendRawBundle(
  signedBundle,
  targetBlock
);
console.log("bundle submitted, waiting");
if ("error" in bundleSubmission) {
  throw new Error(bundleSubmission.error.message);
}
const waitResponse = await bundleSubmission.wait();
console.log(`Wait Response: ${FlashbotsBundleResolution[waitResponse]}`);
if (
  waitResponse === FlashbotsBundleResolution.BundleIncluded ||
  waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh
) {
  process.exit(0);
} else {
  console.log({
    bundleStats: await flashbotsProvider.getBundleStats(
      bundleReceipt.bundleHash,
      targetBlock
    ),
    userStats: await flashbotsProvider.getUserStats(),
  });
}
