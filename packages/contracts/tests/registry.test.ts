import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("registry.clar", () => {
  describe("registration", () => {
    it("should allow a user to register a social hash", () => {
      // Create a sample social hash (sha256 of "@username")
      const socialHash = Cl.bufferFromHex(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
      const platform = Cl.stringAscii("twitter");

      const response = simnet.callPublicFn(
        "registry",
        "register",
        [socialHash, platform],
        wallet1
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });

    it("should prevent duplicate registration", () => {
      const socialHash = Cl.bufferFromHex(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
      const platform = Cl.stringAscii("twitter");

      // First registration
      simnet.callPublicFn("registry", "register", [socialHash, platform], wallet1);

      // Second registration should fail
      const response = simnet.callPublicFn(
        "registry",
        "register",
        [socialHash, platform],
        wallet2
      );

      expect(response.result).toBeErr(Cl.uint(409)); // ERR_ALREADY_REGISTERED
    });

    it("should correctly resolve principal from social hash", () => {
      const socialHash = Cl.bufferFromHex(
        "a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd"
      );
      const platform = Cl.stringAscii("youtube");

      simnet.callPublicFn("registry", "register", [socialHash, platform], wallet1);

      const response = simnet.callReadOnlyFn(
        "registry",
        "get-principal",
        [socialHash],
        deployer
      );

      expect(response.result).toBeSome(Cl.principal(wallet1));
    });

    it("should return none for unregistered social hash", () => {
      const unknownHash = Cl.bufferFromHex(
        "0000000000000000000000000000000000000000000000000000000000000000"
      );

      const response = simnet.callReadOnlyFn(
        "registry",
        "get-principal",
        [unknownHash],
        deployer
      );

      expect(response.result).toBeNone();
    });
  });

  describe("verification", () => {
    it("should allow owner to verify their registration", () => {
      const socialHash = Cl.bufferFromHex(
        "b1c2d3e4f567890123456789012345678901234567890123456789012345bcde"
      );
      const platform = Cl.stringAscii("github");
      const proofHash = Cl.bufferFromHex(
        "f1e2d3c4b5a69078563412907856341290785634129078563412907856341290"
      );

      // Register first
      simnet.callPublicFn("registry", "register", [socialHash, platform], wallet1);

      // Verify
      const response = simnet.callPublicFn(
        "registry",
        "verify",
        [socialHash, proofHash],
        wallet1
      );

      expect(response.result).toBeOk(Cl.bool(true));
    });

    it("should prevent non-owner from verifying", () => {
      const socialHash = Cl.bufferFromHex(
        "c1d2e3f4567890123456789012345678901234567890123456789012345cdef"
      );
      const platform = Cl.stringAscii("twitter");
      const proofHash = Cl.bufferFromHex(
        "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      );

      // Register as wallet1
      simnet.callPublicFn("registry", "register", [socialHash, platform], wallet1);

      // Try to verify as wallet2
      const response = simnet.callPublicFn(
        "registry",
        "verify",
        [socialHash, proofHash],
        wallet2
      );

      expect(response.result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });
  });
});
