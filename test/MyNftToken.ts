import {ethers} from "hardhat";
import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {expect} from "chai";

import { MerkleTree } from "merkletreejs";

describe("MyNftToken usecase test", function (){
    async function deployMyNftToken() {
        const name = "MyNftTest";
        const symbol = "MNT";
        const baseURI = "ipfs://asdasdasdsadasdasd";
        const [
            owner, user1, user2, user3
        ] = await ethers.getSigners();

        const nftToken = await ethers.deployContract("MyNftToken", [
            name, symbol, owner.address, baseURI
        ]);

        await nftToken.waitForDeployment();

        return {nftToken, name, symbol, owner, user1, user2, user3}
    }

    describe("Deployment", function(){
        it("Should be correct params deployment without merkle", async function() {
            const {
                nftToken,
                name, symbol,
                owner
            } = await loadFixture(deployMyNftToken);

            expect(await nftToken.name()).to.be.eq(name);
            expect(await nftToken.symbol()).to.be.eq(symbol);
            expect((await nftToken.owner()).toString()).to.be.eq(owner.address.toString());
            expect(await nftToken.paused()).to.be.true;
            expect(await nftToken.merkleRoot()).to.be.eq(ethers.ZeroHash);
        });
    });
    describe("Test common functional", function (){
        it("Owner functionality", async function() {
            const {
                nftToken,
                name, symbol,
                owner,
                user1, user2
            } = await loadFixture(deployMyNftToken);

            let whitelistAddress = [
                user1.address,
                user2.address
            ];

            const leaves = whitelistAddress.map(address => ethers.keccak256(address));
            const merkleTree = new MerkleTree(leaves, ethers.keccak256, {sortPairs: true});
            await nftToken.setMerkleRoot(merkleTree.getHexRoot());
            await nftToken.setPaused();

            expect(await nftToken.merkleRoot()).to.be.eq(merkleTree.getHexRoot());
            expect(await nftToken.paused()).to.be.false;

            await nftToken.transferOwnership(user1.address);
            expect((await nftToken.owner()).toString()).to.be.eq(user1.address.toString());
        });
        it("Mint", async function() {
            const {
                nftToken,
                name, symbol,
                owner,
                user1, user2, user3
            } = await loadFixture(deployMyNftToken);

            expect(await nftToken.totalSupply()).to.be.eq(0);
            expect(await nftToken.balanceOf(owner.address)).to.be.eq(0);

            await expect(nftToken.mint(5)).to.be.revertedWith('Mint unavailable');
            await nftToken.setPaused();

            await nftToken.mint(5);

            expect(await nftToken.totalSupply()).to.be.eq(5);
            expect(await nftToken.balanceOf(owner.address)).to.be.eq(5);
            expect(await nftToken.ownerOf(0)).to.be.eq(owner.address);
            expect(await nftToken.ownerOf(1)).to.be.eq(owner.address);
            expect(await nftToken.ownerOf(2)).to.be.eq(owner.address);
            expect(await nftToken.ownerOf(3)).to.be.eq(owner.address);
            expect(await nftToken.ownerOf(4)).to.be.eq(owner.address);

            expect(await nftToken.balanceOf(user3)).to.be.eq(0);
            await expect(nftToken.connect(user3).mint(3)).to.be.revertedWith('Value too low');
            await expect(nftToken.connect(user3).mint(3, {value:ethers.parseEther("0.02")})).to.be.revertedWith('Value too low');

            await nftToken.connect(user3).mint(3, {value: ethers.parseEther("0.03")})
            expect(await nftToken.totalSupply()).to.be.eq(8);
            expect(await nftToken.balanceOf(user3.address)).to.be.eq(3);
            expect(await nftToken.ownerOf(5)).to.be.eq(user3.address);
            expect(await nftToken.ownerOf(6)).to.be.eq(user3.address);
            expect(await nftToken.ownerOf(7)).to.be.eq(user3.address);

            let whitelistAddress = [
                user1.address,
                user2.address
            ];

            const leaves = whitelistAddress.map(address => ethers.keccak256(address));
            const merkleTree = new MerkleTree(leaves, ethers.keccak256, {sortPairs: true});
            await nftToken.setMerkleRoot(merkleTree.getHexRoot());

            await expect(nftToken.connect(user3).whitelistMint(leaves)).to.be.revertedWith('Invalid proof');
            expect(await nftToken.totalSupply()).to.be.eq(8);
            expect(await nftToken.balanceOf(user3.address)).to.be.eq(3);

            expect(await nftToken.balanceOf(user1.address)).to.be.eq(0);
            await nftToken.connect(user1).whitelistMint(merkleTree.getHexProof(ethers.keccak256(user1.address)));
            expect(await nftToken.totalSupply()).to.be.eq(9);
            expect(await nftToken.ownerOf(8)).to.be.eq(user1.address);
            await expect(nftToken.connect(user1).whitelistMint(leaves)).to.be.revertedWith('Address has already claimed');
            expect(await nftToken.balanceOf(user1.address)).to.be.eq(1);

            expect(await nftToken.balanceOf(user2.address)).to.be.eq(0);
            await nftToken.connect(user2).whitelistMint(merkleTree.getHexProof(ethers.keccak256(user2.address)));
            expect(await nftToken.totalSupply()).to.be.eq(10);
            expect(await nftToken.ownerOf(9)).to.be.eq(user2.address);
            await expect(nftToken.connect(user2).whitelistMint(leaves)).to.be.revertedWith('Address has already claimed');
            expect(await nftToken.balanceOf(user2.address)).to.be.eq(1);
        });
        it("Owner transfer nft", async function() {
            const {
                nftToken,
                name, symbol,
                owner,
                user1, user2,
            } = await loadFixture(deployMyNftToken);

            await nftToken.setPaused();

            expect(await nftToken.totalSupply()).to.be.eq(0);
            expect(await nftToken.balanceOf(user1.address)).to.be.eq(0);
            await nftToken.connect(user1).mint(3, {value: ethers.parseEther("0.03")})

            expect(await nftToken.totalSupply()).to.be.eq(3);
            expect(await nftToken.balanceOf(user1.address)).to.be.eq(3);
            expect(await nftToken.ownerOf(0)).to.be.eq(user1.address);
            expect(await nftToken.ownerOf(1)).to.be.eq(user1.address);
            expect(await nftToken.ownerOf(2)).to.be.eq(user1.address);

            expect(await nftToken.balanceOf(user2.address)).to.be.eq(0);

            await nftToken.transferFrom(user1.address, user2.address, 1);
            expect(await nftToken.balanceOf(user1.address)).to.be.eq(2);
            expect(await nftToken.balanceOf(user2.address)).to.be.eq(1);
            expect(await nftToken.ownerOf(0)).to.be.eq(user1.address);
            expect(await nftToken.ownerOf(1)).to.be.eq(user2.address);
            expect(await nftToken.ownerOf(2)).to.be.eq(user1.address);
            expect(await nftToken.totalSupply()).to.be.eq(3);
        });
        it("Owner withdraw", async function() {
            const {
                nftToken,
                name, symbol,
                owner,
                user1, user2,
            } = await loadFixture(deployMyNftToken);

            await nftToken.setPaused();

            expect(await nftToken.totalSupply()).to.be.eq(0);
            expect(await ethers.provider.getBalance(nftToken.getAddress())).to.be.eq(0);
            await nftToken.connect(user1).mint(3, {value: ethers.parseEther("0.03")})
            await nftToken.connect(user2).mint(2, {value: ethers.parseEther("0.02")})

            expect(await ethers.provider.getBalance(nftToken.getAddress())).to.be.eq(ethers.parseEther("0.05"));
            expect(await nftToken.totalSupply()).to.be.eq(5);

            await nftToken.withdraw(ethers.parseEther("0.02"));
            expect(await ethers.provider.getBalance(nftToken.getAddress())).to.be.eq(ethers.parseEther("0.03"));

            await expect(nftToken.withdraw(ethers.parseEther("1"))).to.be.revertedWith('Balance too low');
        });
    });
});