import { ethers } from "hardhat";

async function main() {
  const [
      owner
  ] = await ethers.getSigners();

  const name = "TestMyNFT";
  const symbol = "TMN";
  const nftToken = await ethers.deployContract("MyNftToken", [
      name, symbol, owner.address
  ]);

  await nftToken.waitForDeployment();
  console.log(`Nft token 
    name: ${name}, symbol: ${symbol}, owner: ${owner.address} deployed!`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
