/**
 * Contract addresses and ABIs for Tribute Protocol
 */

import type { NetworkType } from './types';

// Contract names
export const CONTRACTS = {
  REGISTRY: 'registry',
  SPLITTER: 'splitter',
  BADGE_NFT: 'badge-nft',
} as const;

// Deployed contract addresses per network
export const CONTRACT_ADDRESSES: Record<NetworkType, Record<string, string>> = {
  mainnet: {
    // TODO: Deploy to mainnet
    registry: '',
    splitter: '',
    'badge-nft': '',
  },
  testnet: {
    // Deployed on testnet - January 2026
    registry: 'STX9BA8A6BQBWTZJ62DWZ6G1QQAAHZKKC7R46JE8.registry',
    splitter: 'STX9BA8A6BQBWTZJ62DWZ6G1QQAAHZKKC7R46JE8.splitter',
    'badge-nft': 'STX9BA8A6BQBWTZJ62DWZ6G1QQAAHZKKC7R46JE8.badge-nft',
  },
  devnet: {
    // Local development - deployer address from Clarinet
    registry: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.registry',
    splitter: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.splitter',
    'badge-nft': 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.badge-nft',
  },
};

/**
 * Get contract identifier for a given network
 */
export function getContractId(
  contractName: keyof typeof CONTRACTS | string,
  network: NetworkType
): string {
  const key = contractName.toLowerCase();
  const address = CONTRACT_ADDRESSES[network][key];
  
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on ${network}`);
  }
  
  return address;
}

/**
 * Parse a contract identifier into address and name
 */
export function parseContractId(contractId: string): { address: string; name: string } {
  const [address, name] = contractId.split('.');
  return { address, name };
}
