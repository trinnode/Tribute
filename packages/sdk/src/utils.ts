/**
 * Utility functions for Tribute SDK
 */

/**
 * Simple SHA-256 hash using Web Crypto API
 * For browser/node environments that support SubtleCrypto
 */
async function sha256Async(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return new Uint8Array(hashBuffer);
}

/**
 * Hash a social handle for on-chain storage
 * @param handle - The social media handle (e.g., "@username")
 * @param platform - The platform identifier
 */
export async function hashSocialHandle(handle: string, platform: string): Promise<Uint8Array> {
  const normalized = `${platform.toLowerCase()}:${handle.toLowerCase().replace(/^@/, '')}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  return sha256Async(data);
}

/**
 * Convert basis points to percentage
 */
export function basisPointsToPercent(bps: number): number {
  return bps / 100;
}

/**
 * Convert percentage to basis points
 */
export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}

/**
 * Format STX amount (micro-STX to STX)
 */
export function formatStx(microStx: bigint | number): string {
  const stx = Number(microStx) / 1_000_000;
  return stx.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Parse STX amount (STX to micro-STX)
 */
export function parseStx(stx: number | string): bigint {
  const num = typeof stx === 'string' ? parseFloat(stx) : stx;
  return BigInt(Math.round(num * 1_000_000));
}

/**
 * Validate a Stacks address
 */
export function isValidStacksAddress(address: string): boolean {
  // Simple validation - starts with SP or ST, 39-41 chars
  const pattern = /^S[PT][A-Z0-9]{38,40}$/;
  return pattern.test(address);
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Get badge tier name
 */
export function getBadgeTierName(tier: number): string {
  const names: Record<number, string> = {
    1: 'Supporter',
    2: 'Early Believer',
    3: 'Champion',
    4: 'Whale',
    5: 'Legend',
  };
  return names[tier] || 'Unknown';
}

/**
 * Get badge tier threshold (in micro-STX)
 */
export function getBadgeTierThreshold(tier: number): bigint {
  const thresholds: Record<number, bigint> = {
    1: BigInt(100_000),      // 0.1 STX
    2: BigInt(500_000),      // 0.5 STX
    3: BigInt(1_000_000),    // 1 STX
    4: BigInt(10_000_000),   // 10 STX
    5: BigInt(100_000_000),  // 100 STX
  };
  return thresholds[tier] || BigInt(0);
}

/**
 * Determine badge tier for a given contribution amount
 */
export function determineBadgeTier(contributionMicroStx: bigint): number {
  if (contributionMicroStx >= BigInt(100_000_000)) return 5; // Legend
  if (contributionMicroStx >= BigInt(10_000_000)) return 4;  // Whale
  if (contributionMicroStx >= BigInt(1_000_000)) return 3;   // Champion
  if (contributionMicroStx >= BigInt(500_000)) return 2;     // Early Believer
  if (contributionMicroStx >= BigInt(100_000)) return 1;     // Supporter
  return 0; // No badge
}
