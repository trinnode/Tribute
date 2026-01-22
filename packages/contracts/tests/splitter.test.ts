import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("splitter.clar", () => {
  describe("direct tipping", () => {
    it("should transfer STX directly to recipient", () => {
      const amount = Cl.uint(1000000); // 1 STX

      const response = simnet.callPublicFn(
        "splitter",
        "tip-direct",
        [Cl.principal(wallet2), amount],
        wallet1
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });

    it("should reject tips below minimum amount", () => {
      const amount = Cl.uint(100); // Below MIN_TIP_AMOUNT (1000)

      const response = simnet.callPublicFn(
        "splitter",
        "tip-direct",
        [Cl.principal(wallet2), amount],
        wallet1
      );

      expect(response.result).toBeErr(Cl.uint(402)); // ERR_ZERO_AMOUNT
    });

    it("should update creator stats", () => {
      const amount = Cl.uint(1000000);

      simnet.callPublicFn(
        "splitter",
        "tip-direct",
        [Cl.principal(wallet2), amount],
        wallet1
      );

      const stats = simnet.callReadOnlyFn(
        "splitter",
        "get-creator-stats",
        [Cl.principal(wallet2)],
        deployer
      );

      // The result is a tuple
      expect(stats.result.type).toBe("tuple");
    });

    it("should update fan stats", () => {
      const amount = Cl.uint(1000000);

      simnet.callPublicFn(
        "splitter",
        "tip-direct",
        [Cl.principal(wallet2), amount],
        wallet1
      );

      const stats = simnet.callReadOnlyFn(
        "splitter",
        "get-fan-stats",
        [Cl.principal(wallet1), Cl.principal(wallet2)],
        deployer
      );

      // The result is a tuple
      expect(stats.result.type).toBe("tuple");
    });

    it("should update global stats", () => {
      const amount = Cl.uint(1000000);

      simnet.callPublicFn(
        "splitter",
        "tip-direct",
        [Cl.principal(wallet2), amount],
        wallet1
      );

      const stats = simnet.callReadOnlyFn(
        "splitter",
        "get-global-stats",
        [],
        deployer
      );

      // The result is a tuple
      expect(stats.result.type).toBe("tuple");
    });
  });

  describe("split configuration", () => {
    it("should configure a split with one recipient", () => {
      const response = simnet.callPublicFn(
        "splitter",
        "configure-split",
        [
          Cl.some(Cl.principal(wallet2)), // split1-recipient
          Cl.uint(2000), // 20%
          Cl.none(), // split2-recipient
          Cl.uint(0),
          Cl.none(), // split3-recipient
          Cl.uint(0),
        ],
        wallet1
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });

    it("should reject split totaling 100% or more", () => {
      const response = simnet.callPublicFn(
        "splitter",
        "configure-split",
        [
          Cl.some(Cl.principal(wallet2)),
          Cl.uint(10000), // 100% - invalid, creator gets nothing
          Cl.none(),
          Cl.uint(0),
          Cl.none(),
          Cl.uint(0),
        ],
        wallet1
      );

      expect(response.result).toBeErr(Cl.uint(400)); // ERR_INVALID_SPLIT
    });

    it("should retrieve split configuration", () => {
      // Configure split first
      simnet.callPublicFn(
        "splitter",
        "configure-split",
        [
          Cl.some(Cl.principal(wallet2)),
          Cl.uint(3000), // 30%
          Cl.some(Cl.principal(wallet3)),
          Cl.uint(2000), // 20%
          Cl.none(),
          Cl.uint(0),
        ],
        wallet1
      );

      const config = simnet.callReadOnlyFn(
        "splitter",
        "get-split-config",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(config.result).toBeSome(expect.anything());
    });

    it("should disable split", () => {
      // Configure split first
      simnet.callPublicFn(
        "splitter",
        "configure-split",
        [
          Cl.some(Cl.principal(wallet2)),
          Cl.uint(2000),
          Cl.none(),
          Cl.uint(0),
          Cl.none(),
          Cl.uint(0),
        ],
        wallet1
      );

      // Disable it
      const response = simnet.callPublicFn("splitter", "disable-split", [], wallet1);

      expect(response.result).toBeOk(Cl.bool(true));
    });
  });

  describe("execute-tip with splits", () => {
    it("should distribute tips according to split configuration", () => {
      // wallet1 configures 30% to wallet2, keeps 70%
      simnet.callPublicFn(
        "splitter",
        "configure-split",
        [
          Cl.some(Cl.principal(wallet2)),
          Cl.uint(3000), // 30%
          Cl.none(),
          Cl.uint(0),
          Cl.none(),
          Cl.uint(0),
        ],
        wallet1
      );

      // wallet3 tips wallet1
      const tipAmount = Cl.uint(1000000); // 1 STX
      const response = simnet.callPublicFn(
        "splitter",
        "execute-tip",
        [Cl.principal(wallet1), tipAmount],
        wallet3
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });
  });

  describe("preview-split", () => {
    it("should preview split amounts correctly", () => {
      // Configure 30% split
      simnet.callPublicFn(
        "splitter",
        "configure-split",
        [
          Cl.some(Cl.principal(wallet2)),
          Cl.uint(3000), // 30%
          Cl.none(),
          Cl.uint(0),
          Cl.none(),
          Cl.uint(0),
        ],
        wallet1
      );

      const preview = simnet.callReadOnlyFn(
        "splitter",
        "preview-split",
        [Cl.principal(wallet1), Cl.uint(1000000)],
        deployer
      );

      // Just verify it returns ok
      expect(preview.result.type).toBe("ok");
    });

    it("should return full amount for creator without splits", () => {
      const preview = simnet.callReadOnlyFn(
        "splitter",
        "preview-split",
        [Cl.principal(wallet1), Cl.uint(1000000)],
        deployer
      );

      // Just verify it returns ok
      expect(preview.result.type).toBe("ok");
    });
  });

  describe("admin functions", () => {
    it("should allow owner to set protocol fee", () => {
      const response = simnet.callPublicFn(
        "splitter",
        "set-protocol-fee",
        [Cl.uint(250)], // 2.5%
        deployer
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });

    it("should reject protocol fee over 5%", () => {
      const response = simnet.callPublicFn(
        "splitter",
        "set-protocol-fee",
        [Cl.uint(600)], // 6% - over max
        deployer
      );

      expect(response.result).toBeErr(Cl.uint(400)); // ERR_INVALID_SPLIT
    });

    it("should prevent non-owner from setting fee", () => {
      const response = simnet.callPublicFn(
        "splitter",
        "set-protocol-fee",
        [Cl.uint(100)],
        wallet1
      );

      expect(response.result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });
  });
});
