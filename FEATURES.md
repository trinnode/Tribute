# Tribute Features Overview

## 🎯 Core Features

### 1. Smart Contract Tips
Transform simple Bitcoin tips into programmable smart contracts on Stacks blockchain.

**How it works:**
- Click any "Tip with Tribute" button on any webpage
- Enter recipient's Stacks address
- Set amount in satoshis
- Transaction executed through Clarity smart contract
- Automatic on-chain reputation updates

### 2. Revenue Splitting
Automatically distribute tips among multiple recipients with custom percentages.

**Configuration:**
- Support for up to 10 splits per transaction
- Each split requires an address and percentage
- Percentages must total exactly 100%
- Smart contract validates and executes splits automatically

**Use Cases:**
- Content collaborations
- Team projects
- Multi-contributor articles
- Podcast co-hosts
- Open source project maintainers

### 3. Yield Generation
Enable passive income by staking a portion of tips.

**Features:**
- Optional toggle for yield generation
- Automatic staking of specified portion
- Track staked amounts and earned yield
- Query yield positions on-chain

**Benefits:**
- Earn passive income on contributions
- Long-term value creation
- Support sustainable creator economy

### 4. On-Chain Reputation
Build verifiable reputation scores that follow you across the ecosystem.

**Metrics Tracked:**
- Total amount sent (patronage given)
- Total amount received (support received)
- Transaction count (engagement level)
- Calculated reputation score

**Score Formula:**
```
score = sqrt(totalReceived) + (totalSent * 0.5) + (transactionCount * 10)
```

**Benefits:**
- Verifiable trust score
- Blockchain-backed credibility
- Portable across platforms
- Transparent and immutable

## 🎨 User Interface

### Floating Tip Button
- Appears on every webpage
- Bottom-right corner placement
- Beautiful gradient design (purple theme)
- Smooth hover animations
- Minimal intrusion

### Inline Tip Buttons
- Automatically injected near content
- Detects articles, posts, videos
- Context-aware placement
- Compact design

### Tip Modal
**Components:**
- Recipient address input with validation
- Amount selector (satoshis)
- Revenue splitting configuration
  - Add/remove splits dynamically
  - Percentage validation
  - Address validation
- Yield generation toggle
- Send/Cancel actions

**Features:**
- Real-time validation
- Clear error messages
- Responsive design
- Professional appearance

### Extension Popup
**Sections:**

1. **Wallet Status**
   - Connect/disconnect wallet
   - Display connected address
   - Network indicator

2. **Stats Dashboard**
   - Total sent (sats)
   - Total received (sats)
   - Reputation score
   - Visual stats cards

3. **Transaction History**
   - 5 most recent transactions
   - Recipient addresses
   - Amounts
   - Status (pending/confirmed)
   - Timestamps

4. **Settings & Help**
   - Settings configuration
   - Help documentation link
   - About information

## 🔧 Technical Features

### Browser Extension
- **Manifest V3** - Latest Chrome extension standard
- **Cross-browser compatible** - Chrome, Brave, Edge
- **Lightweight** - ~75KB total size
- **Performant** - Optimized webpack build

### Blockchain Integration
- **Stacks SDK** - Native integration
- **sBTC Support** - Bitcoin-backed assets
- **Smart Contracts** - Clarity language
- **Testnet Ready** - Configured for testing

### Security
- **0 Vulnerabilities** - CodeQL verified
- **Secure Storage** - Chrome storage API
- **Input Validation** - All user inputs validated
- **Safe Transactions** - Wallet-signed only

### Development
- **TypeScript** - Full type safety
- **Modern Build** - Webpack 5
- **Code Quality** - ESLint configured
- **Documentation** - Comprehensive guides

## 📝 Smart Contract Features

### Clarity Contract Functions

**Public Functions:**
1. `send-tribute` - Simple tip transaction
2. `send-tribute-with-splits` - Tip with revenue splitting
3. `stake-for-yield` - Stake tips for yield

**Read-Only Functions:**
1. `get-reputation` - Query user reputation
2. `get-tribute` - Get tribute details
3. `get-yield-position` - Check staking position

**Data Structures:**
- Tribute records with sender, recipient, amount
- Revenue split configurations
- Reputation scores
- Yield positions

## 🎓 Use Cases

### For Creators
- Receive tips on your content
- Set up automatic team splits
- Build on-chain reputation
- Earn yield on received tips

### For Patrons
- Support multiple creators
- Distribute contributions fairly
- Build patron reputation
- Earn yield on contributions

### For Teams
- Automatic revenue sharing
- Fair compensation splits
- Track team contributions
- Transparent distributions

### For Projects
- Fund open source development
- Support multiple maintainers
- Build project reputation
- Sustainable funding model

## 🚀 Getting Started

### Installation (3 steps)
```bash
# 1. Install dependencies
npm install

# 2. Build extension
npm run build

# 3. Load in browser (chrome://extensions/)
```

### First Tip (3 steps)
1. Click Tribute button on any page
2. Enter address and amount
3. Confirm transaction

### Revenue Split Setup (4 steps)
1. Enable revenue splitting
2. Add recipient addresses
3. Set percentages (must total 100%)
4. Send tribute

## 🔮 Future Enhancements

### Planned Features
- Real wallet integration (Leather/Xverse)
- Mainnet deployment
- Advanced yield strategies
- Reputation badges/NFTs
- Cross-chain support
- Mobile app
- Creator profiles
- Discovery platform

### Community Requests
- Multi-signature support
- Scheduled/recurring tips
- Tipping goals/milestones
- Social features
- Analytics dashboard
- API for integrations

## 📊 Impact

### For the Creator Economy
- Sustainable funding model
- Fair compensation
- Reduced platform fees
- Direct creator-patron relationships
- Programmable patronage

### For Bitcoin
- Smart contract capabilities
- DeFi features on Bitcoin
- Expanded use cases
- Layer 2 adoption
- Real-world utility

### For Web3
- Mainstream adoption path
- Practical use case
- User-friendly interface
- Cross-platform integration
- Ecosystem growth

---

**Tribute: Building the financial layer for the sovereign creator economy** 🌟
