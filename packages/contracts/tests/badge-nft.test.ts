import { describe, it, expect } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

// Badge type constants matching contract
const BADGE_SUPPORTER = Cl.uint(1);
const BADGE_EARLY_BELIEVER = Cl.uint(2);
const BADGE_CHAMPION = Cl.uint(3);
const BADGE_WHALE = Cl.uint(4);
const BADGE_LEGEND = Cl.uint(5);

describe("badge-nft.clar", () => {
  describe("SIP-009 compliance", () => {
    it("should return the last token ID", () => {
      const response = simnet.callReadOnlyFn(
        "badge-nft",
        "get-last-token-id",
        [],
        deployer
      );

      expect(response.result).toBeOk(Cl.uint(0));
    });

    it("should return none for non-existent token owner", () => {
      const response = simnet.callReadOnlyFn(
        "badge-nft",
        "get-owner",
        [Cl.uint(1)],
        deployer
      );

      expect(response.result).toBeOk(Cl.none());
    });

    it("should return token URI", () => {
      const response = simnet.callReadOnlyFn(
        "badge-nft",
        "get-token-uri",
        [Cl.uint(1)],
        deployer
      );

      // Just check it returns ok with some string
      expect(response.result.type).toBe("ok");
    });
  });

  describe("minting", () => {
    it("should allow authorized minter to mint badge", () => {
      // First set authorized minter
      simnet.callPublicFn(
        "badge-nft",
        "set-authorized-minter",
        [Cl.principal(deployer)],
        deployer
      );

      // Mint a badge (patron, creator, badge-type, total-contributed)
      const response = simnet.callPublicFn(
        "badge-nft",
        "mint-badge",
        [
          Cl.principal(wallet1), // patron
          Cl.principal(wallet2), // creator
          BADGE_CHAMPION,        // badge-type (tier 3)
          Cl.uint(1000000),      // total-contributed
        ],
        deployer
      );

      expect(response.result).toBeOk(Cl.uint(1)); // Returns token ID
    });

    it("should prevent unauthorized minting", () => {
      const response = simnet.callPublicFn(
        "badge-nft",
        "mint-badge",
        [
          Cl.principal(wallet1),
          Cl.principal(wallet2),
          BADGE_SUPPORTER,
          Cl.uint(1000000),
        ],
        wallet1 // Not authorized
      );

      expect(response.result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });

    it("should determine correct badge type based on contribution", () => {
      // Test determine-badge-type function
      const nonadge = simnet.callReadOnlyFn(
        "badge-nft",
        "determine-badge-type",
        [Cl.uint(50000)], // Below SUPPORTER threshold (100k)
        deployer
      );
      expect(nonadge.result).toStrictEqual(Cl.uint(0)); // No badge

      const supporter = simnet.callReadOnlyFn(
        "badge-nft",
        "determine-badge-type",
        [Cl.uint(100000)], // 100k = SUPPORTER threshold
        deployer
      );
      expect(supporter.result).toStrictEqual(BADGE_SUPPORTER);

      const earlyBeliever = simnet.callReadOnlyFn(
        "badge-nft",
        "determine-badge-type",
        [Cl.uint(500000)], // 500k = EARLY_BELIEVER threshold
        deployer
      );
      expect(earlyBeliever.result).toStrictEqual(BADGE_EARLY_BELIEVER);

      const champion = simnet.callReadOnlyFn(
        "badge-nft",
        "determine-badge-type",
        [Cl.uint(1000000)], // 1M = CHAMPION threshold
        deployer
      );
      expect(champion.result).toStrictEqual(BADGE_CHAMPION);

      const whale = simnet.callReadOnlyFn(
        "badge-nft",
        "determine-badge-type",
        [Cl.uint(10000000)], // 10M = WHALE threshold
        deployer
      );
      expect(whale.result).toStrictEqual(BADGE_WHALE);

      const legend = simnet.callReadOnlyFn(
        "badge-nft",
        "determine-badge-type",
        [Cl.uint(100000000)], // 100M = LEGEND threshold
        deployer
      );
      expect(legend.result).toStrictEqual(BADGE_LEGEND);
    });
  });

  describe("badge metadata", () => {
    it("should store and retrieve badge metadata", () => {
      // Set minter and mint
      simnet.callPublicFn(
        "badge-nft",
        "set-authorized-minter",
        [Cl.principal(deployer)],
        deployer
      );

      simnet.callPublicFn(
        "badge-nft",
        "mint-badge",
        [Cl.principal(wallet1), Cl.principal(wallet2), BADGE_CHAMPION, Cl.uint(1000000)],
        deployer
      );

      const metadata = simnet.callReadOnlyFn(
        "badge-nft",
        "get-badge-metadata",
        [Cl.uint(1)],
        deployer
      );

      expect(metadata.result).toBeSome(expect.anything());
    });

    it("should track badge counts per creator-type", () => {
      simnet.callPublicFn(
        "badge-nft",
        "set-authorized-minter",
        [Cl.principal(deployer)],
        deployer
      );

      // Mint supporter badge
      simnet.callPublicFn(
        "badge-nft",
        "mint-badge",
        [Cl.principal(wallet1), Cl.principal(wallet2), BADGE_SUPPORTER, Cl.uint(100000)],
        deployer
      );

      const count = simnet.callReadOnlyFn(
        "badge-nft",
        "get-badge-count",
        [Cl.principal(wallet2), BADGE_SUPPORTER],
        deployer
      );

      expect(count.result).toStrictEqual(Cl.uint(1));
    });
  });

  describe("transfers", () => {
    it("should allow owner to transfer badge", () => {
      // Setup: mint a badge
      simnet.callPublicFn(
        "badge-nft",
        "set-authorized-minter",
        [Cl.principal(deployer)],
        deployer
      );

      simnet.callPublicFn(
        "badge-nft",
        "mint-badge",
        [Cl.principal(wallet1), Cl.principal(wallet2), BADGE_CHAMPION, Cl.uint(1000000)],
        deployer
      );

      // Transfer from wallet1 to wallet2
      const response = simnet.callPublicFn(
        "badge-nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );

      expect(response.result).toBeOk(Cl.bool(true));

      // Verify new owner
      const owner = simnet.callReadOnlyFn(
        "badge-nft",
        "get-owner",
        [Cl.uint(1)],
        deployer
      );

      expect(owner.result).toBeOk(Cl.some(Cl.principal(wallet2)));
    });

    it("should prevent non-owner from transferring", () => {
      // Setup: mint a badge to wallet1
      simnet.callPublicFn(
        "badge-nft",
        "set-authorized-minter",
        [Cl.principal(deployer)],
        deployer
      );

      simnet.callPublicFn(
        "badge-nft",
        "mint-badge",
        [Cl.principal(wallet1), Cl.principal(wallet2), BADGE_CHAMPION, Cl.uint(1000000)],
        deployer
      );

      // wallet2 tries to transfer wallet1's badge
      const response = simnet.callPublicFn(
        "badge-nft",
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet2
      );

      expect(response.result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("patron queries", () => {
    it("should check if patron has badge", () => {
      simnet.callPublicFn(
        "badge-nft",
        "set-authorized-minter",
        [Cl.principal(deployer)],
        deployer
      );

      // Mint badge
      simnet.callPublicFn(
        "badge-nft",
        "mint-badge",
        [Cl.principal(wallet1), Cl.principal(wallet2), BADGE_CHAMPION, Cl.uint(1000000)],
        deployer
      );

      const hasBadge = simnet.callReadOnlyFn(
        "badge-nft",
        "has-badge",
        [Cl.principal(wallet1), Cl.principal(wallet2), BADGE_CHAMPION],
        deployer
      );

      expect(hasBadge.result).toStrictEqual(Cl.bool(true));

      const noBadge = simnet.callReadOnlyFn(
        "badge-nft",
        "has-badge",
        [Cl.principal(wallet1), Cl.principal(wallet2), BADGE_LEGEND],
        deployer
      );

      expect(noBadge.result).toStrictEqual(Cl.bool(false));
    });
  });

  describe("admin functions", () => {
    it("should allow owner to set base URI", () => {
      const response = simnet.callPublicFn(
        "badge-nft",
        "set-base-uri",
        [Cl.stringAscii("https://newuri.com/badge/")],
        deployer
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });

    it("should prevent non-owner from setting base URI", () => {
      const response = simnet.callPublicFn(
        "badge-nft",
        "set-base-uri",
        [Cl.stringAscii("https://hacker.com/")],
        wallet1
      );

      expect(response.result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });

    it("should allow owner to set authorized minter", () => {
      const response = simnet.callPublicFn(
        "badge-nft",
        "set-authorized-minter",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });
  });
});
