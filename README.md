# Tribute - Programmable Patronage

> Bridge Bitcoin and Stacks for smart contract-enabled tipping with automatic revenue splitting, yield generation, and on-chain reputation.

## 🌟 Overview

Tribute is the bridge between Bitcoin and the sovereign creator economy. It's a browser extension that enables "Programmable Patronage" by leveraging sBTC on Stacks. Tribute upgrades Bitcoin tips from simple A-to-B transactions into smart contracts capable of:

- 💰 **Smart Contract Tips** - Send Bitcoin tips with programmable smart contracts
- 🔄 **Automatic Revenue Splitting** - Distribute payments among multiple recipients automatically
- 📈 **Yield Generation** - Earn passive income on tips through staking
- ⭐ **On-Chain Reputation** - Build verifiable reputation as a patron or creator

We're not just building a tipping tool; we're building the financial layer for the sovereign creator economy.

## 🚀 Features

### Programmable Patronage
Transform simple tips into sophisticated financial instruments. Set up automatic revenue splits, enable yield generation, and build your on-chain reputation—all with a few clicks.

### sBTC Integration
Leverage the power of Bitcoin with the flexibility of smart contracts through sBTC on the Stacks blockchain.

### Revenue Splitting
Automatically distribute tips among multiple recipients. Perfect for collaborations, teams, and supporting multiple creators.

### Yield Generation
Stake a portion of your tips to earn passive income while supporting your favorite creators.

### On-Chain Reputation
Every tip builds your verifiable reputation on the blockchain, creating a trust score that follows you across the ecosystem.

## 📦 Installation

### From Source

1. Clone the repository:
```bash
git clone https://github.com/trinnode/Tribute.git
cd Tribute
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in your browser:
   - Chrome/Brave: Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 🎯 Usage

### Quick Start

1. **Install the Extension**: Follow the installation instructions above
2. **Connect Your Wallet**: Click the Tribute icon and connect your Stacks wallet (Leather or Xverse)
3. **Start Tipping**: Browse the web and click the Tribute button on any page to send a tip

### Sending a Simple Tip

1. Click the Tribute button (floating or inline)
2. Enter the recipient's Stacks address
3. Enter the amount in satoshis
4. Click "Send Tribute"

### Setting Up Revenue Splits

1. Open the tip modal
2. Check "Enable Revenue Splitting"
3. Add recipient addresses and percentages (must total 100%)
4. Send the tribute

The smart contract will automatically distribute the funds according to your split configuration.

### Enabling Yield Generation

1. Check "Enable Yield Generation" when sending a tribute
2. A portion of your tip will be automatically staked
3. Earn passive income on your contribution

## 🛠 Development

### Prerequisites

- Node.js 16+
- npm or yarn
- A Stacks wallet (Leather or Xverse) for testing

### Project Structure

```
Tribute/
├── src/
│   ├── background/      # Background service worker
│   ├── content/         # Content scripts injected into pages
│   ├── popup/           # Extension popup UI
│   ├── contracts/       # Clarity smart contracts
│   ├── utils/           # Utility functions
│   └── icons/           # Extension icons
├── manifest.json        # Extension manifest
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── webpack.config.js    # Build configuration
```

### Building

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## 🔒 Security

Tribute takes security seriously:

- All private keys remain in your wallet—we never have access
- Transactions are signed locally
- Open-source code for full transparency
- Regular security audits

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🔗 Links

- [Website](https://tribute.example.com) (Coming soon)
- [Documentation](https://docs.tribute.example.com) (Coming soon)
- [Discord Community](https://discord.gg/tribute) (Coming soon)
- [Twitter](https://twitter.com/tributeapp) (Coming soon)

## 💡 Powered By

- [Stacks](https://www.stacks.co/) - Bitcoin L2 for smart contracts
- [sBTC](https://sbtc.tech/) - Bitcoin-backed asset on Stacks
- [Clarity](https://clarity-lang.org/) - Smart contract language

## 🙏 Acknowledgments

Built with ❤️ for the sovereign creator economy.

---

**Note**: This is beta software. Use at your own risk. Always verify transaction details before confirming.