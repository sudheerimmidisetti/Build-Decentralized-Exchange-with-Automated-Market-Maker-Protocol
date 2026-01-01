const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));
  });

  // -------------------- Liquidity Tests --------------------
  describe("Liquidity Management", function () {

    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("100"));
      expect(reserves[1]).to.equal(ethers.utils.parseEther("200"));
    });

    it("should mint correct LP tokens for first provider", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const lp = await dex.liquidity(owner.address);
      expect(lp).to.be.gt(0);
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(dex.addLiquidity(0, 0))
        .to.be.revertedWith("Zero amount");
    });

    it("should allow subsequent liquidity additions", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await dex.addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("150"));
      expect(reserves[1]).to.equal(ethers.utils.parseEther("300"));
    });

    it("should revert if liquidity added with wrong ratio", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("50"),
          ethers.utils.parseEther("50")
        )
      ).to.be.revertedWith("Ratio mismatch");
    });

    it("should allow partial liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp.div(2));

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("50"));
      expect(reserves[1]).to.equal(ethers.utils.parseEther("100"));
    });

    it("should revert when removing more liquidity than owned", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const lp = await dex.liquidity(owner.address);

      await expect(
        dex.removeLiquidity(lp.add(1))
      ).to.be.revertedWith("Not enough LP");
    });
  });

  // -------------------- Swap Tests --------------------
  describe("Token Swaps", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      await dex.swapAForB(ethers.utils.parseEther("10"));

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("110"));
      expect(reserves[1]).to.be.lt(ethers.utils.parseEther("200"));
    });

    it("should swap token B for token A", async function () {
      await dex.swapBForA(ethers.utils.parseEther("20"));

      const reserves = await dex.getReserves();
      expect(reserves[1]).to.equal(ethers.utils.parseEther("220"));
      expect(reserves[0]).to.be.lt(ethers.utils.parseEther("100"));
    });

    it("should calculate output with fee applied", async function () {
      const amountIn = ethers.utils.parseEther("10");

      const expectedOut = await dex.getAmountOut(
        amountIn,
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const before = await tokenB.balanceOf(owner.address);
      await dex.swapAForB(amountIn);
      const after = await tokenB.balanceOf(owner.address);

      expect(after.sub(before)).to.equal(expectedOut);
    });

    it("should update reserves after swap", async function () {
      const before = await dex.getReserves();
      await dex.swapAForB(ethers.utils.parseEther("5"));
      const after = await dex.getReserves();

      expect(after[0]).to.equal(before[0].add(ethers.utils.parseEther("5")));
      expect(after[1]).to.be.lt(before[1]);
    });

    it("should revert on zero swap amount", async function () {
      await expect(dex.swapAForB(0))
        .to.be.revertedWith("Zero input");
    });
  });

  // -------------------- Price & Invariant Tests --------------------
  describe("Price & Invariant Behavior", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should increase k after swap due to fees", async function () {
      const before = await dex.getReserves();
      const kBefore = before[0].mul(before[1]);

      await dex.swapAForB(ethers.utils.parseEther("10"));

      const after = await dex.getReserves();
      const kAfter = after[0].mul(after[1]);

      expect(kAfter).to.be.gt(kBefore);
    });

    it("should update price after swap", async function () {
      const priceBefore = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const priceAfter = await dex.getPrice();

      expect(priceAfter).to.not.equal(priceBefore);
    });

    it("should handle multiple consecutive swaps", async function () {
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));

      const reserves = await dex.getReserves();
      expect(reserves[0]).to.equal(ethers.utils.parseEther("115"));
      expect(reserves[1]).to.be.lt(ethers.utils.parseEther("200"));
    });

    it("should handle large swaps with high price impact", async function () {
      const before = await dex.getReserves();

      await dex.swapAForB(ethers.utils.parseEther("80"));

      const after = await dex.getReserves();
      expect(after[0]).to.equal(before[0].add(ethers.utils.parseEther("80")));
      expect(after[1]).to.be.lt(before[1]);
      expect(after[1]).to.be.gt(ethers.utils.parseEther("100"));
    });

    it("should return zero price when no liquidity", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const tA = await MockERC20.deploy("A", "A");
      const tB = await MockERC20.deploy("B", "B");

      const DEX = await ethers.getContractFactory("DEX");
      const emptyDex = await DEX.deploy(tA.address, tB.address);

      const price = await emptyDex.getPrice();
      expect(price).to.equal(0);
    });

    it("should allow swaps from a different user", async function () {
      await tokenA.mint(addr1.address, ethers.utils.parseEther("50"));
      await tokenA.connect(addr1).approve(
        dex.address,
        ethers.utils.parseEther("50")
      );

      await dex.connect(addr1).swapAForB(
        ethers.utils.parseEther("10")
      );

      const balance = await tokenB.balanceOf(addr1.address);
      expect(balance).to.be.gt(0);
    });
  });

  // -------------------- Events --------------------
  describe("Events", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should emit LiquidityAdded event", async function () {
      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("10"),
          ethers.utils.parseEther("20")
        )
      ).to.emit(dex, "LiquidityAdded");
    });

    it("should emit LiquidityRemoved event", async function () {
      const lp = await dex.liquidity(owner.address);

      await expect(
        dex.removeLiquidity(lp.div(2))
      ).to.emit(dex, "LiquidityRemoved");
    });

    it("should emit Swap event", async function () {
      await expect(
        dex.swapAForB(ethers.utils.parseEther("5"))
      ).to.emit(dex, "Swap");
    });
  });

  // -------------------- Fee Distribution --------------------
  describe("Fee Distribution", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should accumulate fees for liquidity providers", async function () {
      const lpBefore = await dex.liquidity(owner.address);

      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.swapAForB(ethers.utils.parseEther("10"));

      const lpAfter = await dex.liquidity(owner.address);
      expect(lpAfter).to.equal(lpBefore);
    });

    it("should distribute fees on liquidity removal", async function () {
      const lp = await dex.liquidity(owner.address);

      await dex.swapAForB(ethers.utils.parseEther("20"));

      const balABefore = await tokenA.balanceOf(owner.address);
      const balBBefore = await tokenB.balanceOf(owner.address);

      await dex.removeLiquidity(lp);

      const balAAfter = await tokenA.balanceOf(owner.address);
      const balBAfter = await tokenB.balanceOf(owner.address);

      expect(balAAfter).to.be.gt(balABefore);
      expect(balBAfter).to.be.gt(balBBefore);
    });
  });

  // -------------------- View Functions --------------------
  describe("View Functions", function () {

    it("getReserves should return correct values", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );

      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("50"));
      expect(b).to.equal(ethers.utils.parseEther("100"));
    });

    it("getPrice should return correct price", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const price = await dex.getPrice();
      expect(price).to.equal(2);
    });
  });

});
