const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Market", function () {
  let usdt, market, myNft, account1, account2;
  let baseURI = "https://sameple.com/";

  beforeEach(async () => {
    [account1, account2] = await ethers.getSigners();
    // const MAX_ALLOWANCE = BigNumber.from(2).pow(256).sub(1);
    const USDT = await ethers.getContractFactory("cUSDT");
    usdt = await USDT.deploy();
    const MyNFT = await ethers.getContractFactory("MyNFT");
    myNft = await MyNFT.deploy();
    const Market = await ethers.getContractFactory("Market");
    market = await Market.deploy(usdt.target, myNft.target);

    await myNft.safeMint(account1.address, baseURI + "0");
    await myNft.safeMint(account1.address, baseURI + "1");
    await myNft.approve(market.target, 0);
    await myNft.approve(market.target, 1);
    await usdt.transfer(account2.address, "10000000000000000000000");
    await usdt.connect(account2).approve(market.target, "1000000000000000000000000");
  });

it('its erc20 address should be usdt', async function() {
  expect(await market.erc20()).to.equal(usdt.target);
});

it('its erc721 address should be myNft', async function() {
  expect(await market.erc721()).to.equal(myNft.target);
});

it('account1 should have 2 nfts', async function() {
  expect(await myNft.balanceOf(account1.address)).to.equal(2);
});

it('account2 should have 10000 USDT', async function() {
  expect(await usdt.balanceOf(account2.address)).to.equal("10000000000000000000000");
});

it('account2 should have 0 nfts', async function() {
  expect(await myNft.balanceOf(account2.address)).to.equal(0);
});

it('account1 can list two nfts to market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
  // let price = "0x0100"
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 0, price)).to.emit(market, "NewOrder");
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 1, price)).to.emit(market, "NewOrder");

  expect(await myNft.balanceOf(account1.address)).to.equal(0);
  expect(await myNft.balanceOf(market.target)).to.equal(2);
  expect(await market.isListed(0)).to.equal(true);
  expect(await market.isListed(1)).to.equal(true);

  expect((await market.getAllNFTs())[0][0]).to.equal(account1.address);
  expect((await market.getAllNFTs())[0][1]).to.equal(0);
  expect((await market.getAllNFTs())[0][2]).to.equal(price);
  expect((await market.getAllNFTs())[1][0]).to.equal(account1.address);
  expect((await market.getAllNFTs())[1][1]).to.equal(1);
  expect((await market.getAllNFTs())[1][2]).to.equal(price);
  expect(await market.getOrderLength()).to.equal(2);

  expect((await market.getMyNFTs())[0][0]).to.equal(account1.address);
  expect((await market.getMyNFTs())[0][1]).to.equal(0);
  expect((await market.getMyNFTs())[0][2]).to.equal(price);
})

it('account1 can unlist one nft from market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
  // let price = "0x0100"
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 0, price)).to.emit(market, "NewOrder");
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 1, price)).to.emit(market, "NewOrder");

  expect(await market.cancelOrder(0)).to.emit(market, "CancelOrder");
  expect(await market.getOrderLength()).to.equal(1);
  expect(await market.isListed(0)).to.equal(false);
  expect((await market.getMyNFTs()).length).to.equal(1);
})

it('account1 can change price of nft from market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 0, price)).to.emit(market, "NewOrder");
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 1, price)).to.emit(market, "NewOrder");

  expect(await market.changePrice(1, "10000000000000000000000")).to.emit(market, "ChangePrice");
  expect((await market.getMyNFTs()).length).to.equal(2);
  expect((await market.getMyNFTs())[1][2]).to.equal("10000000000000000000000");
})

it('account2 can buy nft from market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 0, price)).to.emit(market, "NewOrder");
  expect(await myNft['safeTransferFrom(address,address,uint256,bytes)'](account1.address, market.target, 1, price)).to.emit(market, "NewOrder");

  expect(await market.connect(account2).buy(1)).to.emit(market, "Deal");

  expect(await market.getOrderLength()).to.equal(1);
  expect(await usdt.balanceOf(account1.address)).to.equal("99990000000500000000000000");
  expect(await usdt.balanceOf(account2.address)).to.equal("9999999500000000000000");
  expect(await myNft.ownerOf(1)).to.equal(account2.address);
})
})