// Background service worker for Tribute extension
// Handles blockchain interactions, wallet connections, and transaction management

import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { 
  makeContractCall, 
  broadcastTransaction,
  AnchorMode,
  PostConditionMode
} from '@stacks/transactions';

interface TributeTransaction {
  id: string;
  recipient: string;
  amount: number;
  splits?: RevenueSplit[];
  timestamp: number;
  txId?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

interface RevenueSplit {
  address: string;
  percentage: number;
  name?: string;
}

interface ReputationScore {
  address: string;
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
  score: number;
}

class TributeBackgroundService {
  private network: StacksMainnet | StacksTestnet;
  private transactions: Map<string, TributeTransaction>;
  private reputation: Map<string, ReputationScore>;

  constructor() {
    // Use testnet by default, can be configured
    this.network = new StacksTestnet();
    this.transactions = new Map();
    this.reputation = new Map();
    this.initializeListeners();
  }

  private initializeListeners(): void {
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Tribute extension installed');
      this.initializeStorage();
    });
  }

  private async initializeStorage(): Promise<void> {
    const stored = await chrome.storage.local.get(['transactions', 'reputation', 'settings']);
    
    if (stored.transactions) {
      this.transactions = new Map(Object.entries(stored.transactions));
    }
    
    if (stored.reputation) {
      this.reputation = new Map(Object.entries(stored.reputation));
    }

    // Set default settings
    if (!stored.settings) {
      await chrome.storage.local.set({
        settings: {
          network: 'testnet',
          defaultTipAmount: 10000, // in satoshis
          autoYield: true,
          notificationsEnabled: true
        }
      });
    }
  }

  private async handleMessage(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'SEND_TIP':
          await this.sendTip(message.data, sendResponse);
          break;
        
        case 'GET_REPUTATION':
          await this.getReputation(message.data.address, sendResponse);
          break;
        
        case 'GET_TRANSACTION_HISTORY':
          await this.getTransactionHistory(sendResponse);
          break;
        
        case 'SETUP_REVENUE_SPLIT':
          await this.setupRevenueSplit(message.data, sendResponse);
          break;
        
        case 'CONNECT_WALLET':
          await this.connectWallet(sendResponse);
          break;
        
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: (error as Error).message });
    }
  }

  private async sendTip(
    data: { recipient: string; amount: number; splits?: RevenueSplit[] },
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      // Create transaction record
      const tx: TributeTransaction = {
        id: this.generateTransactionId(),
        recipient: data.recipient,
        amount: data.amount,
        splits: data.splits,
        timestamp: Date.now(),
        status: 'pending'
      };

      // Store transaction
      this.transactions.set(tx.id, tx);
      await this.saveTransactions();

      // Broadcast transaction to Stacks network
      // This would integrate with the connected wallet
      // For now, we'll simulate the transaction
      console.log('Sending tip transaction:', tx);

      // Update reputation
      await this.updateReputation(data.recipient, data.amount, 'received');

      // Notify user
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Tribute Sent!',
          message: `Successfully sent ${data.amount} sats to ${data.recipient}`
        });
      }

      tx.status = 'confirmed';
      sendResponse({ success: true, transaction: tx });
    } catch (error) {
      console.error('Error sending tip:', error);
      sendResponse({ error: (error as Error).message });
    }
  }

  private async setupRevenueSplit(
    data: { splits: RevenueSplit[] },
    sendResponse: (response?: any) => void
  ): Promise<void> {
    // Validate splits add up to 100%
    const totalPercentage = data.splits.reduce((sum, split) => sum + split.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      sendResponse({ error: 'Revenue splits must total 100%' });
      return;
    }

    // Store the revenue split configuration
    await chrome.storage.local.set({ revenueSplits: data.splits });
    sendResponse({ success: true, splits: data.splits });
  }

  private async connectWallet(sendResponse: (response?: any) => void): Promise<void> {
    try {
      // This would integrate with Stacks wallet (Leather/Xverse)
      // For now, return a mock response
      sendResponse({ 
        success: true, 
        address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        connected: true
      });
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  private async getReputation(
    address: string, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const score = this.reputation.get(address) || {
      address,
      totalReceived: 0,
      totalSent: 0,
      transactionCount: 0,
      score: 0
    };
    
    sendResponse({ reputation: score });
  }

  private async getTransactionHistory(
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const history = Array.from(this.transactions.values())
      .sort((a, b) => b.timestamp - a.timestamp);
    
    sendResponse({ transactions: history });
  }

  private async updateReputation(
    address: string, 
    amount: number, 
    type: 'received' | 'sent'
  ): Promise<void> {
    const current = this.reputation.get(address) || {
      address,
      totalReceived: 0,
      totalSent: 0,
      transactionCount: 0,
      score: 0
    };

    if (type === 'received') {
      current.totalReceived += amount;
    } else {
      current.totalSent += amount;
    }
    
    current.transactionCount += 1;
    
    // Calculate reputation score (simple formula for now)
    current.score = Math.sqrt(current.totalReceived) + 
                   (current.totalSent * 0.5) + 
                   (current.transactionCount * 10);

    this.reputation.set(address, current);
    await this.saveReputation();
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private async saveTransactions(): Promise<void> {
    const txObj = Object.fromEntries(this.transactions);
    await chrome.storage.local.set({ transactions: txObj });
  }

  private async saveReputation(): Promise<void> {
    const repObj = Object.fromEntries(this.reputation);
    await chrome.storage.local.set({ reputation: repObj });
  }
}

// Initialize the background service
const tributeService = new TributeBackgroundService();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TributeBackgroundService };
}
