import {HardhatUserConfig, task} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

task("listAccounts", "Displays the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  let idx = 0
  for (const account of accounts) {
    console.log(`Account${idx}: ${account.address}`);
    idx++;
  }
});

module.exports = {
  solidity: "0.8.21",

  networks: {
    hardhat: {
      chainId: 1337,
    },
  }
}
