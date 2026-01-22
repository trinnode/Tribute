/**
 * Tribute Protocol SDK Client
 * Main interface for interacting with Tribute contracts
 */

import {
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  principalCV,
  bufferCV,
  stringAsciiCV,
  someCV,
  noneCV,
  cvToValue,
  type ClarityValue,
} from '@stacks/transactions';
import {
  STACKS_MAINNET,
  STACKS_TESTNET,
  STACKS_DEVNET,
  type StacksNetwork,
} from '@stacks/network';

import { getContractId, parseContractId } from './contracts';
import { hashSocialHandle, parseStx } from './utils';
import type {
  NetworkType,
  TributeConfig,
  SocialPlatform,
  SplitRecipient,
  SplitConfig,
  CreatorStats,
  FanStats,
  GlobalStats,
  BadgeMetadata,
  TxOptions,
} from './types';

/**
 * Main Tribute SDK Client
 */
export class TributeClient {
  private network: StacksNetwork;
  private networkType: NetworkType;
  private senderAddress: string;

  constructor(config: TributeConfig) {
    this.networkType = config.network;
    this.senderAddress = config.senderAddress || '';
    
    switch (config.network) {
      case 'mainnet':
        this.network = STACKS_MAINNET;
        break;
      case 'testnet':
        this.network = STACKS_TESTNET;
        break;
      case 'devnet':
      default:
        this.network = STACKS_DEVNET;
        break;
    }
  }

  // ============================================
  // REGISTRY FUNCTIONS
  // ============================================

  /**
   * Register a social handle on-chain
   */
  async register(
    handle: string,
    platform: SocialPlatform,
    senderKey: string,
    options?: TxOptions
  ): Promise<string> {
    const contractId = getContractId('registry', this.networkType);
    const { address, name } = parseContractId(contractId);
    
    const socialHash = await hashSocialHandle(handle, platform);

    const txOptions = {
      contractAddress: address,
      contractName: name,
      functionName: 'register',
      functionArgs: [
        bufferCV(socialHash),
        stringAsciiCV(platform),
      ],
      senderKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network: this.network });
    
    if ('error' in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
    }

    options?.onFinish?.({ txId: broadcastResponse.txid });
    return broadcastResponse.txid;
  }

  /**
   * Resolve a social hash to a principal
   */
  async resolve(handle: string, platform: string): Promise<string | null> {
    const contractId = getContractId('registry', this.networkType);
    const { address, name } = parseContractId(contractId);
    
    const socialHash = await hashSocialHandle(handle, platform);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'get-principal',
      functionArgs: [bufferCV(socialHash)],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    const value = cvToValue(result);
    return value?.value || null;
  }

  // ============================================
  // SPLITTER FUNCTIONS
  // ============================================

  /**
   * Send a direct tip (no splits)
   */
  async tipDirect(
    recipient: string,
    amountStx: number,
    senderKey: string,
    options?: TxOptions
  ): Promise<string> {
    const contractId = getContractId('splitter', this.networkType);
    const { address, name } = parseContractId(contractId);
    
    const amountMicroStx = parseStx(amountStx);

    const txOptions = {
      contractAddress: address,
      contractName: name,
      functionName: 'tip-direct',
      functionArgs: [
        principalCV(recipient),
        uintCV(amountMicroStx),
      ],
      senderKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow, // Allow STX transfer
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network: this.network });
    
    if ('error' in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
    }

    options?.onFinish?.({ txId: broadcastResponse.txid });
    return broadcastResponse.txid;
  }

  /**
   * Send a tip with automatic split distribution
   */
  async executeTip(
    recipient: string,
    amountStx: number,
    senderKey: string,
    options?: TxOptions
  ): Promise<string> {
    const contractId = getContractId('splitter', this.networkType);
    const { address, name } = parseContractId(contractId);
    
    const amountMicroStx = parseStx(amountStx);

    const txOptions = {
      contractAddress: address,
      contractName: name,
      functionName: 'execute-tip',
      functionArgs: [
        principalCV(recipient),
        uintCV(amountMicroStx),
      ],
      senderKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network: this.network });
    
    if ('error' in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
    }

    options?.onFinish?.({ txId: broadcastResponse.txid });
    return broadcastResponse.txid;
  }

  /**
   * Configure split recipients
   */
  async configureSplit(
    recipients: SplitRecipient[],
    senderKey: string,
    options?: TxOptions
  ): Promise<string> {
    const contractId = getContractId('splitter', this.networkType);
    const { address, name } = parseContractId(contractId);
    
    // Build args for up to 3 split recipients
    const args: ClarityValue[] = [];
    for (let i = 0; i < 3; i++) {
      if (recipients[i]) {
        args.push(someCV(principalCV(recipients[i].address)));
        args.push(uintCV(recipients[i].share));
      } else {
        args.push(noneCV());
        args.push(uintCV(0));
      }
    }

    const txOptions = {
      contractAddress: address,
      contractName: name,
      functionName: 'configure-split',
      functionArgs: args,
      senderKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network: this.network });
    
    if ('error' in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
    }

    options?.onFinish?.({ txId: broadcastResponse.txid });
    return broadcastResponse.txid;
  }

  /**
   * Get split configuration for a creator
   */
  async getSplitConfig(owner: string): Promise<SplitConfig | null> {
    const contractId = getContractId('splitter', this.networkType);
    const { address, name } = parseContractId(contractId);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'get-split-config',
      functionArgs: [principalCV(owner)],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    const value = cvToValue(result);
    if (!value?.value) return null;

    const data = value.value;
    const recipients: SplitRecipient[] = [];

    for (let i = 1; i <= 3; i++) {
      const recipientKey = `split${i}-recipient`;
      const shareKey = `split${i}-share`;
      if (data[recipientKey]?.value) {
        recipients.push({
          address: data[recipientKey].value,
          share: Number(data[shareKey]),
        });
      }
    }

    return {
      recipients,
      active: data.active,
    };
  }

  /**
   * Get creator statistics
   */
  async getCreatorStats(creator: string): Promise<CreatorStats> {
    const contractId = getContractId('splitter', this.networkType);
    const { address, name } = parseContractId(contractId);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'get-creator-stats',
      functionArgs: [principalCV(creator)],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    const value = cvToValue(result);
    return {
      totalReceived: BigInt(value['total-received'] || 0),
      tipCount: Number(value['tip-count'] || 0),
      lastTipAt: Number(value['last-tip-at'] || 0),
    };
  }

  /**
   * Get fan statistics for a creator
   */
  async getFanStats(fan: string, creator: string): Promise<FanStats> {
    const contractId = getContractId('splitter', this.networkType);
    const { address, name } = parseContractId(contractId);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'get-fan-stats',
      functionArgs: [principalCV(fan), principalCV(creator)],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    const value = cvToValue(result);
    return {
      totalSent: BigInt(value['total-sent'] || 0),
      tipCount: Number(value['tip-count'] || 0),
      lastTipAt: Number(value['last-tip-at'] || 0),
    };
  }

  /**
   * Get global protocol statistics
   */
  async getGlobalStats(): Promise<GlobalStats> {
    const contractId = getContractId('splitter', this.networkType);
    const { address, name } = parseContractId(contractId);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'get-global-stats',
      functionArgs: [],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    const value = cvToValue(result);
    return {
      totalTips: Number(value['total-tips'] || 0),
      totalVolume: BigInt(value['total-volume'] || 0),
      protocolFee: Number(value['protocol-fee'] || 0),
    };
  }

  // ============================================
  // BADGE NFT FUNCTIONS
  // ============================================

  /**
   * Get badge metadata by token ID
   */
  async getBadgeMetadata(tokenId: number): Promise<BadgeMetadata | null> {
    const contractId = getContractId('badge-nft', this.networkType);
    const { address, name } = parseContractId(contractId);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'get-badge-metadata',
      functionArgs: [uintCV(tokenId)],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    const value = cvToValue(result);
    if (!value?.value) return null;

    const data = value.value;
    return {
      tokenId,
      badgeType: Number(data['badge-type']),
      creator: data.creator,
      patron: data.patron,
      totalContributed: BigInt(data['total-contributed'] || 0),
      mintedAt: Number(data['minted-at'] || 0),
    };
  }

  /**
   * Check if a patron has a specific badge tier for a creator
   */
  async hasBadge(patron: string, creator: string, badgeTier: number): Promise<boolean> {
    const contractId = getContractId('badge-nft', this.networkType);
    const { address, name } = parseContractId(contractId);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'has-badge',
      functionArgs: [principalCV(patron), principalCV(creator), uintCV(badgeTier)],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    return cvToValue(result) === true;
  }

  /**
   * Get badge count for a creator by tier
   */
  async getBadgeCount(creator: string, badgeTier: number): Promise<number> {
    const contractId = getContractId('badge-nft', this.networkType);
    const { address, name } = parseContractId(contractId);

    const result = await fetchCallReadOnlyFunction({
      contractAddress: address,
      contractName: name,
      functionName: 'get-badge-count',
      functionArgs: [principalCV(creator), uintCV(badgeTier)],
      senderAddress: this.senderAddress || address,
      network: this.network,
    });

    return Number(cvToValue(result) || 0);
  }
}

/**
 * Create a new Tribute client instance
 */
export function createTributeClient(config: TributeConfig): TributeClient {
  return new TributeClient(config);
}
