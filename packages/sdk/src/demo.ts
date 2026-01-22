/**
 * Tribute Protocol - Testnet Demo Script
 * 
 * This script demonstrates how to interact with the deployed
 * Tribute Protocol contracts on Stacks testnet.
 * 
 * Run with: npx ts-node src/demo.ts
 */

import {
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
} from '@stacks/transactions';
import { STACKS_TESTNET } from '@stacks/network';

// Contract addresses on testnet
const DEPLOYER = 'STX9BA8A6BQBWTZJ62DWZ6G1QQAAHZKKC7R46JE8';
const CONTRACTS = {
  registry: `${DEPLOYER}.registry`,
  splitter: `${DEPLOYER}.splitter`,
  badgeNft: `${DEPLOYER}.badge-nft`,
  sip009Trait: `${DEPLOYER}.sip-009-trait`,
};

const network = STACKS_TESTNET;

// Helper to call read-only functions
async function callReadOnly(
  contractId: string,
  functionName: string,
  args: any[] = []
) {
  const [address, name] = contractId.split('.');
  
  const result = await fetchCallReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName,
    functionArgs: args,
    senderAddress: DEPLOYER,
    network,
  });

  return cvToValue(result);
}

// ============================================
// DEMO FUNCTIONS
// ============================================

async function getRegistryStats() {
  console.log('\n📋 REGISTRY CONTRACT');
  console.log('─'.repeat(50));
  
  try {
    // Get total registrations
    const totalRegs = await callReadOnly(CONTRACTS.registry, 'get-total-registrations');
    console.log(`Total Registrations: ${totalRegs}`);
    
    // Check if our deployer has a social hash registered
    const socialHash = await callReadOnly(CONTRACTS.registry, 'get-social-hash', [
      principalCV(DEPLOYER)
    ]);
    
    if (socialHash?.value) {
      console.log(`Deployer Social Hash: ${socialHash.value}`);
    } else {
      console.log(`Deployer: No social identity registered yet`);
    }
  } catch (err: any) {
    console.log(`Error: ${err.message}`);
  }
}

async function getSplitterStats() {
  console.log('\n💸 SPLITTER CONTRACT');
  console.log('─'.repeat(50));
  
  try {
    // Get global stats
    const globalStats = await callReadOnly(CONTRACTS.splitter, 'get-global-stats');
    const totalTips = globalStats['total-tips']?.value ?? globalStats['total-tips'] ?? 0;
    const totalVolume = globalStats['total-volume']?.value ?? globalStats['total-volume'] ?? 0;
    const protocolFee = globalStats['protocol-fee']?.value ?? globalStats['protocol-fee'] ?? 0;
    
    console.log(`Total Tips: ${totalTips}`);
    console.log(`Total Volume: ${Number(totalVolume) / 1_000_000} STX`);
    console.log(`Protocol Fee: ${Number(protocolFee) / 100}%`);
    
    // Get creator stats for deployer
    const creatorStats = await callReadOnly(CONTRACTS.splitter, 'get-creator-stats', [
      principalCV(DEPLOYER)
    ]);
    const totalReceived = creatorStats['total-received']?.value ?? creatorStats['total-received'] ?? 0;
    const tipCount = creatorStats['tip-count']?.value ?? creatorStats['tip-count'] ?? 0;
    const lastTipAt = creatorStats['last-tip-at']?.value ?? creatorStats['last-tip-at'] ?? 0;
    
    console.log(`\nDeployer as Creator:`);
    console.log(`  Total Received: ${Number(totalReceived) / 1_000_000} STX`);
    console.log(`  Tip Count: ${tipCount}`);
    console.log(`  Last Tip At: Block ${lastTipAt}`);
    
    // Get split config
    const splitConfig = await callReadOnly(CONTRACTS.splitter, 'get-split-config', [
      principalCV(DEPLOYER)
    ]);
    if (splitConfig?.value) {
      console.log(`\nSplit Configuration:`);
      console.log(`  Active: ${splitConfig.value.active}`);
    } else {
      console.log(`\nNo split configuration set`);
    }
  } catch (err: any) {
    console.log(`Error: ${err.message}`);
  }
}

async function getBadgeNftStats() {
  console.log('\n🏆 BADGE NFT CONTRACT');
  console.log('─'.repeat(50));
  
  try {
    // Get last token ID
    const lastTokenId = await callReadOnly(CONTRACTS.badgeNft, 'get-last-token-id');
    console.log(`Total Badges Minted: ${lastTokenId.value || 0}`);
    
    // Get badge thresholds
    console.log(`\nBadge Thresholds:`);
    const tiers = [
      { name: 'Supporter', tier: 1 },
      { name: 'Early Believer', tier: 2 },
      { name: 'Champion', tier: 3 },
      { name: 'Whale', tier: 4 },
      { name: 'Legend', tier: 5 },
    ];
    
    for (const { name, tier } of tiers) {
      const threshold = await callReadOnly(CONTRACTS.badgeNft, 'get-badge-threshold', [
        uintCV(tier)
      ]);
      console.log(`  ${name} (Tier ${tier}): ${Number(threshold) / 1_000_000} STX`);
    }
    
    // Get badge summary for deployer
    const summary = await callReadOnly(CONTRACTS.badgeNft, 'get-creator-badge-summary', [
      principalCV(DEPLOYER)
    ]);
    console.log(`\nDeployer's Badge Summary:`);
    console.log(`  Supporters: ${summary.supporters?.value ?? summary.supporters ?? 0}`);
    console.log(`  Early Believers: ${summary['early-believers']?.value ?? summary['early-believers'] ?? 0}`);
    console.log(`  Champions: ${summary.champions?.value ?? summary.champions ?? 0}`);
    console.log(`  Whales: ${summary.whales?.value ?? summary.whales ?? 0}`);
    console.log(`  Legends: ${summary.legends?.value ?? summary.legends ?? 0}`);
    
    // Check what badge tier an amount would qualify for
    const testAmounts = [0.05, 0.1, 0.5, 1, 10, 100];
    console.log(`\nBadge Tier Calculator:`);
    for (const amount of testAmounts) {
      const microStx = amount * 1_000_000;
      const badgeType = await callReadOnly(CONTRACTS.badgeNft, 'determine-badge-type', [
        uintCV(microStx)
      ]);
      const tierName = badgeType > 0 
        ? await callReadOnly(CONTRACTS.badgeNft, 'get-badge-type-name', [uintCV(badgeType)])
        : 'No Badge';
      console.log(`  ${amount} STX → ${tierName}`);
    }
  } catch (err: any) {
    console.log(`Error: ${err.message}`);
  }
}

async function showUsageExamples() {
  console.log('\n📖 SDK USAGE EXAMPLES');
  console.log('─'.repeat(50));
  
  console.log(`
// Initialize the client
import { createTributeClient } from '@tribute/sdk';

const client = createTributeClient({
  network: 'testnet',
  senderAddress: 'YOUR_ADDRESS_HERE',
});

// Register your social handle
const txId = await client.register(
  'your_handle',
  'twitter',
  'YOUR_PRIVATE_KEY'
);

// Send a direct tip (1 STX)
const tipTxId = await client.tipDirect(
  'RECIPIENT_ADDRESS',
  1.0,
  'YOUR_PRIVATE_KEY'
);

// Configure your splits (70% to you, 30% to collaborator)
await client.configureSplit(
  [
    { address: 'COLLABORATOR_ADDRESS', share: 3000 }  // 30% = 3000 basis points
  ],
  'YOUR_PRIVATE_KEY'
);

// Check if someone has a badge
const hasBadge = await client.hasBadge(
  'PATRON_ADDRESS',
  'CREATOR_ADDRESS',
  1  // Badge tier
);

// Get creator stats
const stats = await client.getCreatorStats('CREATOR_ADDRESS');
console.log(\`Total received: \${stats.totalReceived} micro-STX\`);
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('═'.repeat(50));
  console.log('    TRIBUTE PROTOCOL - TESTNET STATUS');
  console.log('═'.repeat(50));
  console.log(`\nDeployer: ${DEPLOYER}`);
  console.log(`Network: Stacks Testnet`);
  console.log(`Contracts:`);
  console.log(`  • Registry: ${CONTRACTS.registry}`);
  console.log(`  • Splitter: ${CONTRACTS.splitter}`);
  console.log(`  • Badge NFT: ${CONTRACTS.badgeNft}`);
  console.log(`  • SIP-009 Trait: ${CONTRACTS.sip009Trait}`);

  await getRegistryStats();
  await getSplitterStats();
  await getBadgeNftStats();
  await showUsageExamples();

  console.log('\n═'.repeat(50));
  console.log('    READY FOR TESTING!');
  console.log('═'.repeat(50));
  console.log(`
Next Steps:
1. Get testnet STX from faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
2. Register your social handle using the SDK
3. Configure your tip splits  
4. Start receiving tips and earning badges!
`);
}

main().catch(console.error);
