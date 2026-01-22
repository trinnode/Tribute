// Popup script for Tribute extension
// Manages the extension popup UI and interactions

interface WalletInfo {
  address: string;
  connected: boolean;
}

interface TransactionData {
  id: string;
  recipient: string;
  amount: number;
  timestamp: number;
  status: string;
}

interface ReputationData {
  address: string;
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
  score: number;
}

class TributePopup {
  private walletInfo: WalletInfo | null = null;
  private transactions: TransactionData[] = [];
  private reputation: ReputationData | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load saved data
    await this.loadWalletInfo();
    await this.loadTransactions();
    await this.loadReputation();

    // Setup event listeners
    this.setupEventListeners();

    // Update UI
    this.updateUI();
  }

  private setupEventListeners(): void {
    // Connect wallet button
    const connectBtn = document.getElementById('connect-wallet-btn');
    connectBtn?.addEventListener('click', () => this.connectWallet());

    // Disconnect wallet button
    const disconnectBtn = document.getElementById('disconnect-wallet-btn');
    disconnectBtn?.addEventListener('click', () => this.disconnectWallet());

    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn?.addEventListener('click', () => this.openSettings());

    // Help and about links
    document.getElementById('help-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });

    document.getElementById('about-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openAbout();
    });
  }

  private async loadWalletInfo(): Promise<void> {
    const stored = await chrome.storage.local.get('walletInfo');
    if (stored.walletInfo) {
      this.walletInfo = stored.walletInfo;
    }
  }

  private async loadTransactions(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TRANSACTION_HISTORY'
      });

      if (response.transactions) {
        this.transactions = response.transactions;
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  private async loadReputation(): Promise<void> {
    if (!this.walletInfo?.address) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_REPUTATION',
        data: { address: this.walletInfo.address }
      });

      if (response.reputation) {
        this.reputation = response.reputation;
      }
    } catch (error) {
      console.error('Error loading reputation:', error);
    }
  }

  private async connectWallet(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CONNECT_WALLET'
      });

      if (response.success) {
        this.walletInfo = {
          address: response.address,
          connected: true
        };

        // Save wallet info
        await chrome.storage.local.set({ walletInfo: this.walletInfo });

        // Reload data
        await this.loadReputation();

        // Update UI
        this.updateUI();
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  }

  private async disconnectWallet(): Promise<void> {
    this.walletInfo = null;
    await chrome.storage.local.remove('walletInfo');
    this.updateUI();
  }

  private updateUI(): void {
    // Update wallet status
    const disconnected = document.getElementById('wallet-disconnected');
    const connected = document.getElementById('wallet-connected');
    const statsSection = document.getElementById('stats-section');
    const recentSection = document.getElementById('recent-section');

    if (this.walletInfo?.connected) {
      disconnected!.style.display = 'none';
      connected!.style.display = 'flex';
      statsSection!.style.display = 'block';
      recentSection!.style.display = 'block';

      // Update wallet address display
      const addressEl = document.getElementById('wallet-address');
      if (addressEl && this.walletInfo.address) {
        addressEl.textContent = this.formatAddress(this.walletInfo.address);
      }

      // Update stats
      this.updateStats();

      // Update transactions list
      this.updateTransactionsList();
    } else {
      disconnected!.style.display = 'block';
      connected!.style.display = 'none';
      statsSection!.style.display = 'none';
      recentSection!.style.display = 'none';
    }
  }

  private updateStats(): void {
    if (!this.reputation) return;

    const totalSentEl = document.getElementById('total-sent');
    const totalReceivedEl = document.getElementById('total-received');
    const reputationScoreEl = document.getElementById('reputation-score');

    if (totalSentEl) {
      totalSentEl.textContent = this.formatNumber(this.reputation.totalSent);
    }

    if (totalReceivedEl) {
      totalReceivedEl.textContent = this.formatNumber(this.reputation.totalReceived);
    }

    if (reputationScoreEl) {
      reputationScoreEl.textContent = Math.floor(this.reputation.score).toString();
    }
  }

  private updateTransactionsList(): void {
    const listEl = document.getElementById('transactions-list');
    if (!listEl) return;

    if (this.transactions.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No transactions yet</p>
          <p class="empty-state-hint">Start tipping to see your history here</p>
        </div>
      `;
      return;
    }

    // Show only the 5 most recent transactions
    const recentTxs = this.transactions.slice(0, 5);

    listEl.innerHTML = recentTxs.map(tx => `
      <div class="transaction-item">
        <div class="transaction-info">
          <div class="transaction-address">${this.formatAddress(tx.recipient)}</div>
          <div class="transaction-time">${this.formatTimestamp(tx.timestamp)}</div>
        </div>
        <div>
          <div class="transaction-amount">${this.formatNumber(tx.amount)} sats</div>
          <span class="transaction-status ${tx.status}">${tx.status}</span>
        </div>
      </div>
    `).join('');
  }

  private formatAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  private openSettings(): void {
    // Open settings page (could be a new tab or modal)
    console.log('Opening settings...');
    alert('Settings feature coming soon!');
  }

  private openHelp(): void {
    // Open help documentation
    chrome.tabs.create({
      url: 'https://github.com/trinnode/Tribute#readme'
    });
  }

  private openAbout(): void {
    alert(
      'Tribute v1.0.0\n\n' +
      'Programmable Patronage for the Sovereign Creator Economy\n\n' +
      'Powered by sBTC on Stacks\n\n' +
      'Learn more at github.com/trinnode/Tribute'
    );
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TributePopup();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TributePopup };
}
