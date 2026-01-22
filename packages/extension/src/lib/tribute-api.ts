/**
 * Tribute API - Helper functions to interact with Tribute contracts
 */

import { STACKS_TESTNET } from "@stacks/network"
import {
  AnchorMode,
  broadcastTransaction,
  bufferCV,
  cvToValue,
  fetchCallReadOnlyFunction,
  makeContractCall,
  PostConditionMode,
  principalCV,
  stringAsciiCV,
  uintCV
} from "@stacks/transactions"

// Contract configuration
const DEPLOYER = "STX9BA8A6BQBWTZJ62DWZ6G1QQAAHZKKC7R46JE8"
const CONTRACTS = {
  registry: `${DEPLOYER}.registry`,
  splitter: `${DEPLOYER}.splitter`,
  badgeNft: `${DEPLOYER}.badge-nft`
}

const network = STACKS_TESTNET

/**
 * Async hash function using Web Crypto API (browser compatible)
 */
export async function hashSocialHandleAsync(
  handle: string,
  platform: string
): Promise<Uint8Array> {
  const input = `${platform}:${handle.toLowerCase()}`
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hashBuffer)
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g)
  return new Uint8Array(
    matches ? matches.map((byte) => parseInt(byte, 16)) : []
  )
}

/**
 * Call a read-only contract function
 */
async function callReadOnly(
  contractId: string,
  functionName: string,
  args: any[] = []
) {
  const [address, name] = contractId.split(".")

  const result = await fetchCallReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName,
    functionArgs: args,
    senderAddress: DEPLOYER,
    network
  })

  return cvToValue(result)
}

// ============================================
// REGISTRY FUNCTIONS
// ============================================

/**
 * Resolve a social handle to a Stacks address
 */
export async function resolveSocialHandle(
  handle: string,
  platform: string
): Promise<{ address: string; verified: boolean } | null> {
  try {
    const socialHash = await hashSocialHandleAsync(handle, platform)

    const principal = await callReadOnly(CONTRACTS.registry, "get-principal", [
      bufferCV(socialHash)
    ])

    if (!principal?.value) return null

    const isVerified = await callReadOnly(CONTRACTS.registry, "is-verified", [
      bufferCV(socialHash)
    ])

    return {
      address: principal.value,
      verified: isVerified === true
    }
  } catch (err) {
    console.error("Error resolving handle:", err)
    return null
  }
}

/**
 * Check if an address has a registered social identity
 */
export async function getRegisteredIdentity(
  address: string
): Promise<{ platform: string; verified: boolean } | null> {
  try {
    const socialHash = await callReadOnly(
      CONTRACTS.registry,
      "get-social-hash",
      [principalCV(address)]
    )

    if (!socialHash?.value) return null

    // Convert hex string to Uint8Array for bufferCV
    const hashBytes =
      typeof socialHash.value === "string"
        ? hexToUint8Array(socialHash.value)
        : socialHash.value

    const registration = await callReadOnly(
      CONTRACTS.registry,
      "get-registration",
      [bufferCV(hashBytes)]
    )

    if (!registration?.value) return null

    return {
      platform: registration.value.platform,
      verified: registration.value.verified
    }
  } catch (err) {
    console.error("Error getting identity:", err)
    return null
  }
}

// ============================================
// SPLITTER FUNCTIONS
// ============================================

/**
 * Get global protocol statistics
 */
export async function getGlobalStats(): Promise<{
  totalTips: number
  totalVolume: number
  protocolFee: number
}> {
  try {
    const stats = await callReadOnly(CONTRACTS.splitter, "get-global-stats")

    return {
      totalTips: Number(stats["total-tips"]?.value ?? stats["total-tips"] ?? 0),
      totalVolume: Number(
        stats["total-volume"]?.value ?? stats["total-volume"] ?? 0
      ),
      protocolFee: Number(
        stats["protocol-fee"]?.value ?? stats["protocol-fee"] ?? 0
      )
    }
  } catch (err) {
    console.error("Error getting global stats:", err)
    return { totalTips: 0, totalVolume: 0, protocolFee: 0 }
  }
}

/**
 * Get creator statistics
 */
export async function getCreatorStats(address: string): Promise<{
  totalReceived: number
  tipCount: number
  lastTipAt: number
}> {
  try {
    const stats = await callReadOnly(CONTRACTS.splitter, "get-creator-stats", [
      principalCV(address)
    ])

    return {
      totalReceived: Number(
        stats["total-received"]?.value ?? stats["total-received"] ?? 0
      ),
      tipCount: Number(stats["tip-count"]?.value ?? stats["tip-count"] ?? 0),
      lastTipAt: Number(
        stats["last-tip-at"]?.value ?? stats["last-tip-at"] ?? 0
      )
    }
  } catch (err) {
    console.error("Error getting creator stats:", err)
    return { totalReceived: 0, tipCount: 0, lastTipAt: 0 }
  }
}

/**
 * Get fan statistics for a specific creator
 */
export async function getFanStats(
  fanAddress: string,
  creatorAddress: string
): Promise<{
  totalSent: number
  tipCount: number
  lastTipAt: number
}> {
  try {
    const stats = await callReadOnly(CONTRACTS.splitter, "get-fan-stats", [
      principalCV(fanAddress),
      principalCV(creatorAddress)
    ])

    return {
      totalSent: Number(stats["total-sent"]?.value ?? stats["total-sent"] ?? 0),
      tipCount: Number(stats["tip-count"]?.value ?? stats["tip-count"] ?? 0),
      lastTipAt: Number(
        stats["last-tip-at"]?.value ?? stats["last-tip-at"] ?? 0
      )
    }
  } catch (err) {
    console.error("Error getting fan stats:", err)
    return { totalSent: 0, tipCount: 0, lastTipAt: 0 }
  }
}

/**
 * Preview how a tip would be split
 */
export async function previewTip(
  recipientAddress: string,
  amountMicroStx: number
): Promise<{
  creatorReceives: number
  split1Receives: number
  split2Receives: number
  split3Receives: number
}> {
  try {
    const preview = await callReadOnly(CONTRACTS.splitter, "preview-split", [
      principalCV(recipientAddress),
      uintCV(amountMicroStx)
    ])

    const data = preview?.value ?? preview

    return {
      creatorReceives: Number(
        data["creator-receives"]?.value ??
          data["creator-receives"] ??
          amountMicroStx
      ),
      split1Receives: Number(
        data["split1-receives"]?.value ?? data["split1-receives"] ?? 0
      ),
      split2Receives: Number(
        data["split2-receives"]?.value ?? data["split2-receives"] ?? 0
      ),
      split3Receives: Number(
        data["split3-receives"]?.value ?? data["split3-receives"] ?? 0
      )
    }
  } catch (err) {
    console.error("Error previewing tip:", err)
    return {
      creatorReceives: amountMicroStx,
      split1Receives: 0,
      split2Receives: 0,
      split3Receives: 0
    }
  }
}

// ============================================
// BADGE FUNCTIONS
// ============================================

/**
 * Get badge counts for a user (as patron for all creators)
 */
export async function getUserBadgeSummary(address: string): Promise<{
  supporters: number
  earlyBelievers: number
  champions: number
  whales: number
  legends: number
  total: number
}> {
  // Note: This would require indexing all patron-badge relationships
  // For now, return placeholder - in production, use an indexer
  return {
    supporters: 0,
    earlyBelievers: 0,
    champions: 0,
    whales: 0,
    legends: 0,
    total: 0
  }
}

/**
 * Check what badge tier an amount qualifies for
 */
export async function determineBadgeTier(
  amountMicroStx: number
): Promise<{ tier: number; name: string } | null> {
  try {
    const badgeType = await callReadOnly(
      CONTRACTS.badgeNft,
      "determine-badge-type",
      [uintCV(amountMicroStx)]
    )

    if (badgeType === 0) return null

    const tierNames = [
      "",
      "Supporter",
      "Early Believer",
      "Champion",
      "Whale",
      "Legend"
    ]

    return {
      tier: Number(badgeType),
      name: tierNames[Number(badgeType)] || "Unknown"
    }
  } catch (err) {
    console.error("Error determining badge tier:", err)
    return null
  }
}

/**
 * Get badge thresholds
 */
export async function getBadgeThresholds(): Promise<Record<string, number>> {
  const thresholds: Record<string, number> = {}
  const tiers = ["supporter", "earlyBeliever", "champion", "whale", "legend"]

  for (let i = 1; i <= 5; i++) {
    try {
      const threshold = await callReadOnly(
        CONTRACTS.badgeNft,
        "get-badge-threshold",
        [uintCV(i)]
      )
      thresholds[tiers[i - 1]] = Number(threshold)
    } catch {
      thresholds[tiers[i - 1]] = 0
    }
  }

  return thresholds
}

// ============================================
// TRANSACTION HELPERS
// ============================================

/**
 * Build a tip transaction (to be signed by wallet)
 */
export function buildTipTransaction(
  recipientAddress: string,
  amountMicroStx: number
) {
  return {
    contractAddress: DEPLOYER,
    contractName: "splitter",
    functionName: "tip-direct",
    functionArgs: [principalCV(recipientAddress), uintCV(amountMicroStx)],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow
  }
}

/**
 * Build a register transaction
 */
export async function buildRegisterTransaction(
  handle: string,
  platform: string
) {
  const socialHash = await hashSocialHandleAsync(handle, platform)

  return {
    contractAddress: DEPLOYER,
    contractName: "registry",
    functionName: "register",
    functionArgs: [bufferCV(socialHash), stringAsciiCV(platform)],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny
  }
}

// ============================================
// UTILITY
// ============================================

/**
 * Format micro-STX to STX string
 */
export function formatStx(microStx: number): string {
  return (microStx / 1_000_000).toFixed(6)
}

/**
 * Parse STX to micro-STX
 */
export function parseStx(stx: number): number {
  return Math.floor(stx * 1_000_000)
}

/**
 * Get contract addresses
 */
export function getContractAddresses() {
  return CONTRACTS
}

/**
 * Get deployer address
 */
export function getDeployerAddress() {
  return DEPLOYER
}
