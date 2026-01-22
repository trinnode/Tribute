#!/usr/bin/env node
/**
 * Tribute Protocol CLI
 * Command-line interface for interacting with Tribute contracts on Stacks
 */

import { Command } from 'commander';
import {
  fetchCallReadOnlyFunction,
  makeContractCall,
  broadcastTransaction,
  cvToValue,
  uintCV,
  principalCV,
  bufferCV,
  stringAsciiCV,
  someCV,
  noneCV,
  AnchorMode,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET, STACKS_DEVNET } from '@stacks/network';
import * as readline from 'readline';
import { createHash } from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const NETWORKS = {
  mainnet: STACKS_MAINNET,
  testnet: STACKS_TESTNET,
  devnet: STACKS_DEVNET,
};

const DEPLOYERS: Record<string, string> = {
  mainnet: '', // Not deployed yet
  testnet: 'STX9BA8A6BQBWTZJ62DWZ6G1QQAAHZKKC7R46JE8',
  devnet: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
};

const CONTRACTS = ['registry', 'splitter', 'badge-nft'] as const;

// ============================================
// HELPERS
// ============================================

function getNetwork(networkName: string) {
  const network = NETWORKS[networkName as keyof typeof NETWORKS];
  if (!network) {
    console.error(`❌ Invalid network: ${networkName}. Use: mainnet, testnet, or devnet`);
    process.exit(1);
  }
  return network;
}

function getDeployer(networkName: string) {
  const deployer = DEPLOYERS[networkName as keyof typeof DEPLOYERS];
  if (!deployer) {
    console.error(`❌ Contracts not deployed on ${networkName}`);
    process.exit(1);
  }
  return deployer;
}

function getContractId(networkName: string, contractName: string) {
  return `${getDeployer(networkName)}.${contractName}`;
}

async function callReadOnly(
  networkName: string,
  contractName: string,
  functionName: string,
  args: any[] = []
) {
  const network = getNetwork(networkName);
  const deployer = getDeployer(networkName);
  
  const result = await fetchCallReadOnlyFunction({
    contractAddress: deployer,
    contractName,
    functionName,
    functionArgs: args,
    senderAddress: deployer,
    network,
  });

  return cvToValue(result);
}

function hashSocialHandle(handle: string, platform: string): Buffer {
  const input = `${platform}:${handle.toLowerCase()}`;
  return createHash('sha256').update(input).digest();
}

function formatStx(microStx: number | bigint | string): string {
  const value = typeof microStx === 'string' ? parseInt(microStx) : Number(microStx);
  return (value / 1_000_000).toFixed(6);
}

function parseStx(stx: number): number {
  return Math.floor(stx * 1_000_000);
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ============================================
// CLI PROGRAM
// ============================================

const program = new Command();

program
  .name('tribute')
  .description('CLI for Tribute Protocol - Creator tipping on Stacks')
  .version('0.1.0')
  .option('-n, --network <network>', 'Network to use (mainnet, testnet, devnet)', 'testnet');

// ============================================
// STATUS COMMAND
// ============================================

program
  .command('status')
  .description('Show protocol status and statistics')
  .action(async () => {
    const network = program.opts().network;
    const deployer = getDeployer(network);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('         TRIBUTE PROTOCOL STATUS');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`Network:  ${network}`);
    console.log(`Deployer: ${deployer}\n`);

    try {
      // Registry stats
      console.log('📋 REGISTRY');
      console.log('─'.repeat(50));
      const totalRegs = await callReadOnly(network, 'registry', 'get-total-registrations');
      console.log(`  Total Registrations: ${totalRegs}`);

      // Splitter stats
      console.log('\n💸 SPLITTER');
      console.log('─'.repeat(50));
      const globalStats = await callReadOnly(network, 'splitter', 'get-global-stats');
      const totalTips = globalStats['total-tips']?.value ?? globalStats['total-tips'] ?? 0;
      const totalVolume = globalStats['total-volume']?.value ?? globalStats['total-volume'] ?? 0;
      const protocolFee = globalStats['protocol-fee']?.value ?? globalStats['protocol-fee'] ?? 0;
      console.log(`  Total Tips:    ${totalTips}`);
      console.log(`  Total Volume:  ${formatStx(totalVolume)} STX`);
      console.log(`  Protocol Fee:  ${Number(protocolFee) / 100}%`);

      // Badge stats
      console.log('\n🏆 BADGES');
      console.log('─'.repeat(50));
      const lastTokenId = await callReadOnly(network, 'badge-nft', 'get-last-token-id');
      console.log(`  Total Minted: ${lastTokenId?.value ?? 0}`);

      console.log('\n═══════════════════════════════════════════════════\n');
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

// ============================================
// REGISTRY COMMANDS
// ============================================

const registry = program.command('registry').description('Identity registry commands');

registry
  .command('lookup <address>')
  .description('Look up social identity for a Stacks address')
  .action(async (address: string) => {
    const network = program.opts().network;
    
    try {
      const socialHash = await callReadOnly(network, 'registry', 'get-social-hash', [
        principalCV(address)
      ]);

      if (socialHash?.value) {
        console.log(`\n✅ Address: ${address}`);
        console.log(`   Social Hash: 0x${Buffer.from(socialHash.value).toString('hex')}`);
        
        // Get full registration
        const reg = await callReadOnly(network, 'registry', 'get-registration', [
          bufferCV(Buffer.from(socialHash.value))
        ]);
        
        if (reg?.value) {
          console.log(`   Platform: ${reg.value.platform}`);
          console.log(`   Verified: ${reg.value.verified}`);
          console.log(`   Registered At: Block ${reg.value['registered-at']?.value ?? reg.value['registered-at']}`);
        }
      } else {
        console.log(`\n❌ No social identity registered for ${address}`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

registry
  .command('resolve <platform> <handle>')
  .description('Resolve a social handle to Stacks address')
  .action(async (platform: string, handle: string) => {
    const network = program.opts().network;
    
    try {
      const socialHash = hashSocialHandle(handle, platform);
      console.log(`\n🔍 Looking up ${platform}:${handle}`);
      console.log(`   Hash: 0x${socialHash.toString('hex')}`);
      
      const principal = await callReadOnly(network, 'registry', 'get-principal', [
        bufferCV(socialHash)
      ]);

      if (principal?.value) {
        console.log(`\n✅ Found: ${principal.value}`);
        
        // Check verification
        const isVerified = await callReadOnly(network, 'registry', 'is-verified', [
          bufferCV(socialHash)
        ]);
        console.log(`   Verified: ${isVerified}`);
      } else {
        console.log(`\n❌ Handle not registered`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

registry
  .command('register <platform> <handle>')
  .description('Register your social identity (requires private key)')
  .option('-k, --key <privateKey>', 'Your private key (hex)')
  .action(async (platform: string, handle: string, options: { key?: string }) => {
    const network = program.opts().network;
    
    if (!options.key) {
      console.log('\n⚠️  Private key required for transactions');
      console.log('   Use: tribute registry register <platform> <handle> -k <privateKey>');
      console.log('\n   Supported platforms: twitter, youtube, github');
      return;
    }

    const validPlatforms = ['twitter', 'youtube', 'github'];
    if (!validPlatforms.includes(platform)) {
      console.error(`❌ Invalid platform. Use: ${validPlatforms.join(', ')}`);
      return;
    }

    try {
      const socialHash = hashSocialHandle(handle, platform);
      const deployer = getDeployer(network);
      const networkObj = getNetwork(network);

      console.log(`\n📝 Registering ${platform}:${handle}`);
      console.log(`   Hash: 0x${socialHash.toString('hex')}`);

      const txOptions = {
        contractAddress: deployer,
        contractName: 'registry',
        functionName: 'register',
        functionArgs: [
          bufferCV(socialHash),
          stringAsciiCV(platform),
        ],
        senderKey: options.key,
        network: networkObj,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        fee: 10000n,
      };

      const transaction = await makeContractCall(txOptions);
      const response = await broadcastTransaction({ transaction, network: networkObj });

      if ('error' in response) {
        console.error(`❌ Broadcast failed: ${response.error}`);
        return;
      }

      console.log(`\n✅ Transaction broadcast!`);
      console.log(`   TX ID: ${response.txid}`);
      console.log(`   Explorer: https://explorer.hiro.so/txid/${response.txid}?chain=${network}`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

// ============================================
// TIP COMMANDS
// ============================================

const tip = program.command('tip').description('Tipping commands');

tip
  .command('send <recipient> <amount>')
  .description('Send a direct tip (amount in STX)')
  .option('-k, --key <privateKey>', 'Your private key (hex)')
  .action(async (recipient: string, amount: string, options: { key?: string }) => {
    const network = program.opts().network;
    const amountStx = parseFloat(amount);
    
    if (isNaN(amountStx) || amountStx <= 0) {
      console.error('❌ Invalid amount');
      return;
    }

    if (!options.key) {
      console.log('\n⚠️  Private key required for transactions');
      console.log('   Use: tribute tip send <recipient> <amount> -k <privateKey>');
      return;
    }

    try {
      const deployer = getDeployer(network);
      const networkObj = getNetwork(network);
      const microStx = parseStx(amountStx);

      console.log(`\n💸 Sending tip`);
      console.log(`   To: ${recipient}`);
      console.log(`   Amount: ${amountStx} STX (${microStx} µSTX)`);

      const txOptions = {
        contractAddress: deployer,
        contractName: 'splitter',
        functionName: 'tip-direct',
        functionArgs: [
          principalCV(recipient),
          uintCV(microStx),
        ],
        senderKey: options.key,
        network: networkObj,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        fee: 10000n,
      };

      const transaction = await makeContractCall(txOptions);
      const response = await broadcastTransaction({ transaction, network: networkObj });

      if ('error' in response) {
        console.error(`❌ Broadcast failed: ${response.error}`);
        return;
      }

      console.log(`\n✅ Tip sent!`);
      console.log(`   TX ID: ${response.txid}`);
      console.log(`   Explorer: https://explorer.hiro.so/txid/${response.txid}?chain=${network}`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

tip
  .command('preview <recipient> <amount>')
  .description('Preview how a tip would be split')
  .action(async (recipient: string, amount: string) => {
    const network = program.opts().network;
    const amountStx = parseFloat(amount);
    
    if (isNaN(amountStx) || amountStx <= 0) {
      console.error('❌ Invalid amount');
      return;
    }

    try {
      const microStx = parseStx(amountStx);
      
      console.log(`\n🔍 Previewing split for ${amountStx} STX to ${recipient}`);

      const preview = await callReadOnly(network, 'splitter', 'preview-split', [
        principalCV(recipient),
        uintCV(microStx),
      ]);

      // preview-split returns (response { creator-receives, split1-receives, split2-receives, split3-receives } none)
      const data = preview?.value ?? preview;
      const creatorReceives = data['creator-receives']?.value ?? data['creator-receives'] ?? microStx;
      const split1 = data['split1-receives']?.value ?? data['split1-receives'] ?? 0;
      const split2 = data['split2-receives']?.value ?? data['split2-receives'] ?? 0;
      const split3 = data['split3-receives']?.value ?? data['split3-receives'] ?? 0;

      console.log(`\n   Creator receives: ${formatStx(creatorReceives)} STX`);
      if (Number(split1) > 0) console.log(`   Split 1 receives: ${formatStx(split1)} STX`);
      if (Number(split2) > 0) console.log(`   Split 2 receives: ${formatStx(split2)} STX`);
      if (Number(split3) > 0) console.log(`   Split 3 receives: ${formatStx(split3)} STX`);
      
      // Check for splits
      const splitConfig = await callReadOnly(network, 'splitter', 'get-split-config', [
        principalCV(recipient),
      ]);
      
      if (splitConfig?.value?.active) {
        console.log(`\n   ✅ Split configuration active`);
      } else {
        console.log(`\n   ℹ️  No split configuration (100% to creator)`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

// ============================================
// CREATOR COMMANDS
// ============================================

const creator = program.command('creator').description('Creator management commands');

creator
  .command('stats <address>')
  .description('View creator statistics')
  .action(async (address: string) => {
    const network = program.opts().network;
    
    try {
      console.log(`\n📊 Creator Stats: ${address}`);
      console.log('─'.repeat(50));
      
      const stats = await callReadOnly(network, 'splitter', 'get-creator-stats', [
        principalCV(address),
      ]);

      const totalReceived = stats['total-received']?.value ?? stats['total-received'] ?? 0;
      const tipCount = stats['tip-count']?.value ?? stats['tip-count'] ?? 0;
      const lastTipAt = stats['last-tip-at']?.value ?? stats['last-tip-at'] ?? 0;

      console.log(`   Total Received: ${formatStx(totalReceived)} STX`);
      console.log(`   Tip Count:      ${tipCount}`);
      console.log(`   Last Tip At:    Block ${lastTipAt}`);

      // Badge summary
      const badges = await callReadOnly(network, 'badge-nft', 'get-creator-badge-summary', [
        principalCV(address),
      ]);

      console.log(`\n🏆 Patron Badges:`);
      console.log(`   Supporters:     ${badges.supporters?.value ?? badges.supporters ?? 0}`);
      console.log(`   Early Believers: ${badges['early-believers']?.value ?? badges['early-believers'] ?? 0}`);
      console.log(`   Champions:      ${badges.champions?.value ?? badges.champions ?? 0}`);
      console.log(`   Whales:         ${badges.whales?.value ?? badges.whales ?? 0}`);
      console.log(`   Legends:        ${badges.legends?.value ?? badges.legends ?? 0}`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

creator
  .command('splits <address>')
  .description('View split configuration for a creator')
  .action(async (address: string) => {
    const network = program.opts().network;
    
    try {
      console.log(`\n⚙️  Split Config: ${address}`);
      console.log('─'.repeat(50));
      
      const config = await callReadOnly(network, 'splitter', 'get-split-config', [
        principalCV(address),
      ]);

      if (config?.value) {
        const data = config.value;
        console.log(`   Active: ${data.active}`);
        
        for (let i = 1; i <= 3; i++) {
          const recipient = data[`split${i}-recipient`];
          const share = data[`split${i}-share`];
          if (recipient?.value) {
            console.log(`\n   Split ${i}:`);
            console.log(`     Recipient: ${recipient.value}`);
            console.log(`     Share: ${Number(share?.value ?? share) / 100}%`);
          }
        }
      } else {
        console.log(`   No split configuration set`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

creator
  .command('configure-split')
  .description('Configure your tip splits')
  .option('-k, --key <privateKey>', 'Your private key (hex)')
  .option('-r1, --recipient1 <address>', 'First split recipient')
  .option('-s1, --share1 <percent>', 'First split share (percent, e.g., 10 = 10%)')
  .option('-r2, --recipient2 <address>', 'Second split recipient')
  .option('-s2, --share2 <percent>', 'Second split share')
  .option('-r3, --recipient3 <address>', 'Third split recipient')
  .option('-s3, --share3 <percent>', 'Third split share')
  .action(async (options: any) => {
    const network = program.opts().network;
    
    if (!options.key) {
      console.log('\n⚠️  Private key required for transactions');
      console.log('   Use: tribute creator configure-split -k <key> -r1 <addr> -s1 <percent>');
      return;
    }

    try {
      const deployer = getDeployer(network);
      const networkObj = getNetwork(network);

      // Build args
      const args: any[] = [];
      
      for (let i = 1; i <= 3; i++) {
        const recipient = options[`recipient${i}`];
        const share = options[`share${i}`];
        
        if (recipient && share) {
          args.push(someCV(principalCV(recipient)));
          args.push(uintCV(Math.floor(parseFloat(share) * 100))); // Convert percent to basis points
        } else {
          args.push(noneCV());
          args.push(uintCV(0));
        }
      }

      console.log(`\n⚙️  Configuring splits...`);

      const txOptions = {
        contractAddress: deployer,
        contractName: 'splitter',
        functionName: 'configure-split',
        functionArgs: args,
        senderKey: options.key,
        network: networkObj,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        fee: 10000n,
      };

      const transaction = await makeContractCall(txOptions);
      const response = await broadcastTransaction({ transaction, network: networkObj });

      if ('error' in response) {
        console.error(`❌ Broadcast failed: ${response.error}`);
        return;
      }

      console.log(`\n✅ Split configuration updated!`);
      console.log(`   TX ID: ${response.txid}`);
      console.log(`   Explorer: https://explorer.hiro.so/txid/${response.txid}?chain=${network}`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

// ============================================
// BADGE COMMANDS
// ============================================

const badge = program.command('badge').description('Badge NFT commands');

badge
  .command('info <tokenId>')
  .description('Get badge metadata by token ID')
  .action(async (tokenId: string) => {
    const network = program.opts().network;
    
    try {
      const id = parseInt(tokenId);
      if (isNaN(id)) {
        console.error('❌ Invalid token ID');
        return;
      }

      console.log(`\n🏆 Badge #${id}`);
      console.log('─'.repeat(50));
      
      const metadata = await callReadOnly(network, 'badge-nft', 'get-badge-metadata', [
        uintCV(id),
      ]);

      if (metadata?.value) {
        const data = metadata.value;
        const badgeType = data['badge-type']?.value ?? data['badge-type'];
        
        // Get badge name
        const badgeName = await callReadOnly(network, 'badge-nft', 'get-badge-type-name', [
          uintCV(badgeType),
        ]);
        
        console.log(`   Type:       ${badgeName} (Tier ${badgeType})`);
        console.log(`   Creator:    ${data.creator}`);
        console.log(`   Patron:     ${data.patron}`);
        console.log(`   Contributed: ${formatStx(data['total-contributed']?.value ?? data['total-contributed'])} STX`);
        console.log(`   Minted At:  Block ${data['minted-at']?.value ?? data['minted-at']}`);
        
        // Get owner
        const owner = await callReadOnly(network, 'badge-nft', 'get-owner', [
          uintCV(id),
        ]);
        console.log(`   Owner:      ${owner?.value?.value ?? owner?.value ?? 'Unknown'}`);
      } else {
        console.log(`   Badge not found`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

badge
  .command('check <patron> <creator> <tier>')
  .description('Check if patron has a badge tier for creator')
  .action(async (patron: string, creator: string, tier: string) => {
    const network = program.opts().network;
    
    try {
      const tierNum = parseInt(tier);
      if (isNaN(tierNum) || tierNum < 1 || tierNum > 5) {
        console.error('❌ Invalid tier (1-5)');
        return;
      }

      const tierNames = ['', 'Supporter', 'Early Believer', 'Champion', 'Whale', 'Legend'];
      
      console.log(`\n🔍 Checking badge`);
      console.log(`   Patron:  ${patron}`);
      console.log(`   Creator: ${creator}`);
      console.log(`   Tier:    ${tierNames[tierNum]} (${tierNum})`);
      
      const hasBadge = await callReadOnly(network, 'badge-nft', 'has-badge', [
        principalCV(patron),
        principalCV(creator),
        uintCV(tierNum),
      ]);

      if (hasBadge) {
        const badgeData = await callReadOnly(network, 'badge-nft', 'get-patron-badge', [
          principalCV(patron),
          principalCV(creator),
          uintCV(tierNum),
        ]);
        console.log(`\n✅ Has badge! Token ID: ${badgeData?.value?.['token-id']?.value ?? badgeData?.value?.['token-id'] ?? 'Unknown'}`);
      } else {
        console.log(`\n❌ No badge found`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

badge
  .command('thresholds')
  .description('Show badge tier thresholds')
  .action(async () => {
    const network = program.opts().network;
    
    try {
      console.log(`\n🏆 Badge Thresholds`);
      console.log('─'.repeat(50));
      
      const tiers = [
        { name: 'Supporter', tier: 1 },
        { name: 'Early Believer', tier: 2 },
        { name: 'Champion', tier: 3 },
        { name: 'Whale', tier: 4 },
        { name: 'Legend', tier: 5 },
      ];

      for (const { name, tier } of tiers) {
        const threshold = await callReadOnly(network, 'badge-nft', 'get-badge-threshold', [
          uintCV(tier),
        ]);
        console.log(`   ${name.padEnd(14)} (Tier ${tier}): ${formatStx(threshold)} STX`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

badge
  .command('calculate <amount>')
  .description('Calculate what badge tier an amount qualifies for')
  .action(async (amount: string) => {
    const network = program.opts().network;
    const amountStx = parseFloat(amount);
    
    if (isNaN(amountStx)) {
      console.error('❌ Invalid amount');
      return;
    }

    try {
      const microStx = parseStx(amountStx);
      
      const badgeType = await callReadOnly(network, 'badge-nft', 'determine-badge-type', [
        uintCV(microStx),
      ]);

      if (badgeType > 0) {
        const badgeName = await callReadOnly(network, 'badge-nft', 'get-badge-type-name', [
          uintCV(badgeType),
        ]);
        console.log(`\n✅ ${amountStx} STX qualifies for: ${badgeName} (Tier ${badgeType})`);
      } else {
        console.log(`\n❌ ${amountStx} STX does not qualify for any badge`);
        console.log(`   Minimum required: 0.1 STX (Supporter)`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

// ============================================
// FAN COMMANDS
// ============================================

const fan = program.command('fan').description('Fan/patron commands');

fan
  .command('stats <fan> <creator>')
  .description('View fan contribution stats for a creator')
  .action(async (fanAddress: string, creator: string) => {
    const network = program.opts().network;
    
    try {
      console.log(`\n📊 Fan Stats`);
      console.log('─'.repeat(50));
      console.log(`   Fan:     ${fanAddress}`);
      console.log(`   Creator: ${creator}`);
      
      const stats = await callReadOnly(network, 'splitter', 'get-fan-stats', [
        principalCV(fanAddress),
        principalCV(creator),
      ]);

      const totalSent = stats['total-sent']?.value ?? stats['total-sent'] ?? 0;
      const tipCount = stats['tip-count']?.value ?? stats['tip-count'] ?? 0;
      const lastTipAt = stats['last-tip-at']?.value ?? stats['last-tip-at'] ?? 0;

      console.log(`\n   Total Sent:  ${formatStx(totalSent)} STX`);
      console.log(`   Tip Count:   ${tipCount}`);
      console.log(`   Last Tip At: Block ${lastTipAt}`);

      // Check badges
      console.log(`\n🏆 Badges Earned:`);
      const tiers = ['Supporter', 'Early Believer', 'Champion', 'Whale', 'Legend'];
      
      for (let i = 1; i <= 5; i++) {
        const hasBadge = await callReadOnly(network, 'badge-nft', 'has-badge', [
          principalCV(fanAddress),
          principalCV(creator),
          uintCV(i),
        ]);
        const status = hasBadge ? '✅' : '❌';
        console.log(`   ${status} ${tiers[i - 1]}`);
      }
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  });

// ============================================
// CONTRACTS COMMAND
// ============================================

program
  .command('contracts')
  .description('Show deployed contract addresses')
  .action(() => {
    const network = program.opts().network;
    const deployer = getDeployer(network);
    
    console.log(`\n📜 Contract Addresses (${network})`);
    console.log('─'.repeat(50));
    
    for (const contract of CONTRACTS) {
      console.log(`   ${contract}: ${deployer}.${contract}`);
    }
    
    console.log(`\n🔗 Explorer:`);
    for (const contract of CONTRACTS) {
      console.log(`   ${contract}: https://explorer.hiro.so/txid/${deployer}.${contract}?chain=${network}`);
    }
  });

// Parse and run
program.parse();
