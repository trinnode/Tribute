/**
 * Type definitions for Tribute SDK
 */

// Network configuration
export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

// Social platform types
export type SocialPlatform = 'twitter' | 'youtube' | 'github' | 'twitch' | 'other';

// Badge tiers
export const BADGE_TIERS = {
  SUPPORTER: 1,
  EARLY_BELIEVER: 2,
  CHAMPION: 3,
  WHALE: 4,
  LEGEND: 5,
} as const;

export type BadgeTier = number; // Badge tier number (1-5)

// Split configuration
export interface SplitRecipient {
  address: string;
  share: number; // Basis points (100 = 1%)
}

export interface SplitConfig {
  recipients: SplitRecipient[];
  active: boolean;
}

// Creator registration
export interface Registration {
  principal: string;
  socialHash: string;
  platform: SocialPlatform;
  verified: boolean;
  verifiedAt?: number;
  registeredAt: number;
}

// Tip event
export interface TipEvent {
  from: string;
  to: string;
  amount: bigint;
  netAmount: bigint;
  feeAmount: bigint;
  hasSplit: boolean;
  blockHeight: number;
  txId: string;
}

// Badge metadata
export interface BadgeMetadata {
  tokenId: number;
  badgeType: BadgeTier;
  creator: string;
  patron: string;
  totalContributed: bigint;
  mintedAt: number;
}

// Creator stats
export interface CreatorStats {
  totalReceived: bigint;
  tipCount: number;
  lastTipAt: number;
}

// Fan stats
export interface FanStats {
  totalSent: bigint;
  tipCount: number;
  lastTipAt: number;
}

// Global protocol stats
export interface GlobalStats {
  totalTips: number;
  totalVolume: bigint;
  protocolFee: number;
}

// SDK configuration
export interface TributeConfig {
  network: NetworkType;
  contractAddress?: string;
  senderAddress?: string; // Required for read-only calls
}

// Transaction options
export interface TxOptions {
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}
