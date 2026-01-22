# TRIBUTE: The Yellow Paper

Version 2.0 | Stacks Ascent

Title: Programmable Patronage on Bitcoin

Status: Draft / Active Development

**Tagline:** "While Lightning handles payments, Tribute handles relationships."

## 1\. Abstract

We are entering a new era of the internet where value moves as freely as information. However, the current tools available to creators force a painful trade-off: choose **convenience** (Web2 platforms like Patreon that take 10-20% fees and control your audience) or choose **sovereignty** (Bitcoin Lightning payments that are fast but technically limited).

**Tribute** is the bridge between these two worlds. It is a browser extension that enables "Programmable Patronage." By leveraging **sBTC on Stacks**, Tribute upgrades Bitcoin tips from simple A-to-B transactions into smart contracts capable of automatic revenue splitting, yield generation, and on-chain reputation. We are not just building a tipping tool; we are building the financial layer for the sovereign creator economy.

## 2\. The Problem: "Dumb" Money vs. "Rent-Seeking" Money

### 2.1 The Web2 Trap

Creators today rely on platforms like Patreon, BuyMeACoffee, and Substack. These tools offer great business logic (subscriptions, tiers, analytics), but they come at a steep cost:

- **High Fees:** Platforms take 5% to 15% of gross revenue.
- **Fiat Settlement:** Creators are paid in depreciating fiat currency, with payout delays of 30-60 days.
- **De-platforming Risk:** Your income stream exists at the mercy of a centralized moderator.

### 2.2 The Lightning Limitation

The Bitcoin Lightning Network solved the speed and cost issue. It is instant and nearly free. However, Lightning payments are "dumb" pipes. They are purely transactional.

- **No Logic:** You cannot program a Lightning payment to "split 50% to my editor" automatically.
- **No Yield:** The Bitcoin sits idle in a channel; it does not grow.
- **No Memory:** A Lightning tip leaves no permanent on-chain record of support, meaning no way to prove you were an "early backer."

**The Gap:** Creators want the _hardness_ of Bitcoin with the _smart features_ of Patreon.

## 3\. The Solution: Tribute

Tribute is a browser extension that injects a "Smart Tip" interface directly into the platforms creators already use (X/Twitter, YouTube, GitHub). Under the hood, it utilizes the Stacks blockchain and sBTC to execute **logic** alongside the **payment**.

### 3.1 Core Philosophy: Programmable Patronage

We believe that payments should do more than just move money; they should execute agreements. When a fan sends money, that action should automatically trigger the business rules the creator has defined.

## 4\. Product Features (The "Smart" Layer)

### 4.1 Auto-Splits (The Collaboration Engine)

Content creation is rarely a solo act anymore. Writers have editors; YouTubers have thumbnail artists; Podcasts have audio engineers.

- **Current State:** The creator receives the full payment and must manually calculate, track, and send the share to their team at the end of the month. It is tedious and prone to error.
- **The Tribute Way:** A creator defines a "Split" in the smart contract (e.g., User_A: 70%, User_B: 30%). When a fan tips 100 sBTC, the contract **atomically** routes 70 sBTC to the Creator and 30 sBTC to the collaborator in the same block. No spreadsheets. No "trust me, bro."

### 4.2 Auto-Stacking (Yield Generation)

Bitcoin is the best savings technology, but it usually yields 0%.

- **The Tribute Way:** Creators can toggle an "Auto-Stack" feature. When tips accumulate to a certain threshold, the smart contract interacts with the Stacks PoX (Proof of Transfer) mechanism to lock those funds and earn native BTC yield.
- **The Result:** A creator's treasury isn't just a pile of cash; it's an active investment fund growing automatically.
- **Stacks Ecosystem Integration:** We integrate with existing liquid stacking protocols:
  - **StackingDAO (stSTX):** Liquid stacking derivative that allows creators to stack while maintaining liquidity.
  - **Lisa (LiSTX):** Alternative liquid stacking protocol for diversification.
  - **Arkadiko:** DeFi protocol for additional yield strategies using stacked assets as collateral.

### 4.3 Proof of Patronage (NFTs)

Fans want recognition. In the Web2 world, they get a "Top Fan" badge next to their name.

- **The Tribute Way:** Tipping is no longer ephemeral. We use the **SIP-009** standard (NFTs on Stacks) to mint "Badges" based on tipping tiers.
  - _Tip > 0.01 sBTC:_ Mint "Early Believer" Badge.
  - Tip > 0.1 sBTC: Mint "Whale Supporter" Badge.  
        These assets live in the fan's wallet forever, creating an on-chain reputation graph that other apps can read.

### 4.4 Token-Gated Access (Proof of Patronage Utility)

NFT badges are not just reputation tokens—they are **access keys**.

- **The Feature:** Creators can gate exclusive content, Discord channels, or perks based on badge ownership.
- **How It Works:**
  - Creator sets a rule: "Only 'Whale Supporter' badge holders can access my private Discord."
  - Fan connects wallet to Discord bot (using existing Stacks verification tools like **Stacks Auth**).
  - Bot queries the fan's wallet for the required SIP-009 NFT.
  - Access granted or denied automatically.
- **Why This Matters:** This creates a Web3-native Patreon tier system where the fan _owns_ their membership status. No platform can revoke it.
- **Stacks Ecosystem Support:** SIP-009 NFTs are fully supported. Verification can use **Stacks.js** `callReadOnlyFunction` to check NFT ownership on-chain.

### 4.5 Recurring Tips (Subscriptions)

The creator economy runs on Monthly Recurring Revenue (MRR), not one-time tips.

- **The Feature:** Fans can subscribe to creators with automated monthly sBTC transfers.
- **Technical Implementation (Stacks-Compatible):**
  - **Option A - Pre-Authorization Model:** Fan pre-deposits sBTC into a personal "Subscription Vault" contract. The contract holds a time-locked allowance that releases monthly to the creator.
  - **Option B - Keeper Network:** Use a decentralized keeper network (similar to Chainlink Keepers, implementable via **Hiro's Chainhook** event triggers) to execute scheduled transactions.
  - **Option C - Stacks Subnets (Future):** When Stacks subnets mature, leverage faster finality for micro-subscription processing.
- **User Experience:** 
  - Fan clicks "Subscribe" → Selects amount (e.g., 0.001 sBTC/month) → Deposits 3-month buffer into vault.
  - Contract releases funds monthly. Fan receives notification to top-up when balance is low.
- **Cancellation:** Fan can withdraw remaining balance at any time (non-custodial).

### 4.6 Claimable Tip Pools (Viral Onboarding Mechanism)

Solve the cold-start problem by letting fans tip creators who haven't registered yet.

- **The Feature:** Fans can tip _any_ social handle, even if the creator hasn't joined Tribute.
- **How It Works:**
  - Fan tips @unregistered_creator.
  - Funds are held in a **claimable vault** mapped to the hashed social handle.
  - Creator sees notification: _"You have $500 in sBTC waiting for you on Tribute!"_
  - Creator registers → Verifies identity → Claims funds.
- **Why This Matters:** 
  - Creates **pull demand**. Creators join because money is waiting, not because of marketing.
  - Fans become evangelists: "I tipped you on Tribute, go claim it!"
- **Security:** Funds are time-locked. If unclaimed after 12 months, funds return to the original sender (configurable).
- **Clarity Implementation:**
  ```clarity
  (define-map claimable-pools 
    { social-hash: (buff 32) } 
    { total: uint, contributors: (list 100 principal), expiry: uint })
  ```

### 4.7 Creator Analytics Dashboard

Creators are data-obsessed. Provide insights without centralized tracking.

- **The Feature:** A lightweight analytics dashboard accessible via extension popup or web interface.
- **Metrics Displayed:**
  - Total tips received (all-time, monthly, weekly)
  - Top supporters (leaderboard)
  - Tip velocity (tips per day/week trend)
  - Split distribution breakdown
  - Badge mint statistics
  - Subscription MRR and churn
- **Data Source:** All data is derived from on-chain events. No centralized database required.
- **Stacks Ecosystem Support:**
  - **Hiro API:** Query historical transactions and contract events.
  - **Chainhook:** Set up event listeners for real-time updates.
  - **Custom Indexer:** For production scale, run a lightweight indexer using **Stacks Blockchain API** self-hosted node.
- **Privacy:** Analytics are visible only to the creator (wallet-authenticated).

## 5\. Technical Architecture

### 5.1 The Frontend: Browser Extension

We chose a browser extension (Chrome/Brave/Firefox) to meet users where they are. We are not asking them to join a new social network.

- **Content Scripts:** The extension detects the DOM of supported sites (e.g., twitter.com/user_profile). It identifies the user's handle and queries the Tribute Registry to see if they have a wallet connected.
- **Injection:** If the user is registered, we inject a "Tip with sBTC" button natively into the UI.
- **Wallet Connection:** We utilize the Stacks Connect library (Hiro Wallet / Xverse) to initiate transactions. We do _not_ hold user private keys.

#### 5.1.1 DOM Selector Abstraction Layer

Platform DOM structures change frequently (especially X/Twitter). To mitigate maintenance burden:

- **Selector Configuration Service:** DOM selectors are stored in a remote configuration file (hosted on IPFS or a simple CDN).
- **Hot-Update Capability:** Selectors can be updated without releasing a new extension version.
- **Fallback Strategy:** If primary selectors fail, the extension gracefully degrades to toolbar-only mode.
- **Implementation:**
  ```typescript
  interface PlatformSelectors {
    twitter: {
      tweetActionBar: string[];  // Multiple fallback selectors
      profileHeader: string[];
      userHandle: string[];
    };
    youtube: { ... };
  }
  ```

### 5.2 The Backend: Smart Contracts (Clarity)

The heart of Tribute is a set of Clarity contracts deployed on Stacks. Clarity is a decidable language, meaning we can know with certainty what the program will do before running it-crucial for financial software.

**Contract Modules:**

- **registry.clar:** Maps social identities (hashed Twitter handles) to Stacks wallet addresses.
- **splitter.clar:** Stores the logic for revenue sharing.
  - _Map:_ (define-map split-rules { owner: principal } { recipients: (list 5 principal), shares: (list 5 uint) })
- **vault.clar:** An optional pooling contract for users who want to "Auto-Stack" small amounts by pooling them with others to meet the minimum for PoX.
- **subscription.clar:** Manages recurring payment logic and subscription vaults.
- **claimable.clar:** Handles tip pools for unregistered creators.
- **badge-nft.clar:** SIP-009 compliant NFT contract for Proof of Patronage badges.

#### 5.2.1 Contract Event Emissions

All contracts emit structured events for indexing and analytics:

```clarity
(print { 
  event: "tip-sent", 
  from: tx-sender, 
  to: recipient, 
  amount: amount,
  split-executed: true,
  badge-minted: badge-id 
})
```

These events are captured by **Chainhook** for real-time processing.

### 5.3 The Asset: sBTC

We rely on **sBTC** (1:1 Bitcoin-backed asset on Stacks) for the payment rail.

- **Why sBTC?** It allows us to write logic. Native Bitcoin (L1) does not support the complex state needed for splits and registries. sBTC gives us the speed of a customized L2 (Nakamoto Release) while keeping the money denominated in Bitcoin.

#### 5.3.1 sBTC Bridge Assistant

To reduce friction for users who hold BTC but not sBTC:

- **In-Extension Bridge UI:** Guide users through BTC → sBTC conversion directly within the extension.
- **Integration Options:**
  - **Native sBTC Peg:** Direct integration with the sBTC deposit mechanism.
  - **DEX Routing:** For instant swaps, route through **Velar** or **Alex** DEX for STX → sBTC.
- **Balance Detection:** Extension detects if user has insufficient sBTC and prompts bridge flow.

### 5.4 Identity Verification System

Preventing impersonation is critical. Anyone could claim to be @elonmusk.

#### 5.4.1 Verification Methods

**Method A: Signed Message Proof (Primary)**
- Creator posts a specific message containing their Stacks address to their social profile.
- Tribute extension scrapes and verifies the message.
- One-time verification; record stored on-chain.

**Method B: DNS-TXT Style Verification**
- Creator adds a TXT record to their website's DNS (for creators with custom domains).
- Provides additional trust signal.

**Method C: OAuth Challenge (Future)**
- Direct OAuth integration with platforms (requires partnership).

#### 5.4.2 Verification Contract

```clarity
(define-map verified-identities 
  { social-hash: (buff 32) } 
  { 
    principal: principal, 
    verified-at: uint, 
    verification-method: (string-ascii 20),
    verification-proof: (buff 256) 
  })

(define-public (verify-identity (social-hash (buff 32)) (proof (buff 256)))
  ;; Verification logic
)
```

### 5.5 Indexing & Data Layer

For production-grade performance, we need efficient data access beyond direct chain queries.

- **Chainhook Integration:** Real-time event streaming for tips, registrations, and badge mints.
- **Custom Indexer:** Lightweight PostgreSQL indexer for complex queries (leaderboards, analytics).
- **Hiro API:** Fallback for standard queries; used in MVP phase.
- **Caching Layer:** Redis cache for frequently accessed data (creator profiles, split configurations).

## 6\. User Experience Walkthrough

### 6.1 For the Creator (Setup)

- Install Tribute Extension.
- Connect Xverse/Leather Wallet.
- Click "Register Profile" -> Signs a message linking their Twitter handle to their Stacks Address.
- **Complete Verification:** Post verification message to social profile.
- (Optional) Configure Splits: "Send 20% of all tips to @MyEditor."
- (Optional) Set up Subscription Tiers: "Bronze: 0.0005 sBTC/month, Gold: 0.002 sBTC/month."
- (Optional) Configure Token-Gated Perks: Link Discord, set badge requirements.

### 6.2 For the Fan (Tipping)

- Browsing Twitter, they see a thread they love.
- They click the "Tip sBTC" button (injected by Tribute) on the tweet.
- A popup appears: "Send 0.001 sBTC?"
- **Split Visualization:** Popup shows pie chart: "70% to @Creator, 30% to @Editor."
- Click "Confirm."
- **Behind the scenes:** The extension calls the splitter.clar contract. The funds move from the Fan -> Contract -> Split -> Creator/Editor Wallets.
- **Optimistic UI:** Instant "Success!" animation with confetti. Notification: _"Tip broadcasted! Settlement pending..."_
- Fan receives a notification: "Tip Sent! 'Supporter Badge' minted."

### 6.3 For the Fan (Subscribing)

- Fan clicks "Subscribe" on creator's profile.
- Selects tier: "Gold Supporter - 0.002 sBTC/month."
- Deposits buffer amount (e.g., 3 months upfront) into personal subscription vault.
- Monthly releases are automatic.
- Fan can view subscription status, top-up, or cancel anytime via extension dashboard.

### 6.4 For Unregistered Creators (Claimable Pools)

- Fan tips @unregistered_creator → Funds go to claimable pool.
- Creator receives notification (via Twitter DM bot, email if available, or sees banner when visiting Tribute-enabled content).
- Creator installs extension → Registers → Verifies identity.
- Claims funds in one transaction.

### 6.5 Progressive Disclosure (Simplicity by Default)

To avoid overwhelming new users:

- **Simple Mode (Default):**
  - One-click tipping.
  - Basic profile registration.
  - Automatic badge minting.
  
- **Pro Mode (Opt-in):**
  - Split configuration.
  - Subscription setup.
  - Auto-stacking settings.
  - Advanced analytics.
  - Token-gated access management.

Users can toggle between modes in settings.

## 7\. Security & Trust

- **Non-Custodial:** Tribute never holds user funds. The smart contract acts as a router, not a bank. Funds move in a single atomic transaction.
- **Open Source:** All Clarity contracts are verified and published on the explorer. Anyone can audit the "Split" logic to ensure no hidden fees are taken.
- **Permissionless:** No one can ban a creator from receiving tips. As long as the Stacks blockchain is running, the Tribute contract is active.

### 7.1 Smart Contract Security

- **Formal Verification:** Clarity's decidability allows static analysis of all execution paths.
- **Audit Requirement:** Before mainnet launch, all contracts undergo third-party security audit (recommended: CoinFabrik, Least Authority, or Stacks-specialized auditors).
- **Upgrade Strategy:** Contracts are designed with versioning. New versions are deployed alongside old; users migrate at their own pace. No admin keys can freeze funds.
- **Reentrancy Protection:** Clarity natively prevents reentrancy by design.

### 7.2 Identity Security

- **Impersonation Prevention:** Multi-factor verification (signed message + social proof).
- **Dispute Resolution:** Community-driven flagging system for suspicious registrations.
- **Rate Limiting:** New registrations subject to cooldown periods to prevent spam attacks.

### 7.3 Extension Security

- **No Private Key Access:** Extension uses Stacks Connect; keys never leave the wallet.
- **Content Security Policy:** Strict CSP prevents XSS attacks.
- **Minimal Permissions:** Extension requests only necessary permissions (active tab, storage).
- **Code Signing:** All releases are signed and published via official browser extension stores.

### 7.4 Data Privacy

- **On-Chain Data:** Only essential data stored on-chain (wallet addresses, splits, tips).
- **Social Handles:** Stored as SHA-256 hashes; raw handles not exposed.
- **Analytics:** Processed client-side or via self-hosted indexer; no third-party tracking.

## 8\. Roadmap

### Phase 1: The MVP (Ascent Goal) - Q1 2026

- **Core Feature:** Browser extension working on X (Twitter).
- **Logic:** Simple 1-to-1 tipping and 1-to-Many splits.
- **Asset:** Testnet sBTC.
- **Identity:** Basic signed-message verification.
- **Badges:** SIP-009 NFT minting for tip tiers.
- **UX:** Optimistic UI, split visualization.
- **Deliverables:**
  - Chrome extension published to Web Store (beta).
  - 3 core Clarity contracts deployed to testnet (registry, splitter, badge-nft).
  - Documentation and onboarding guide.

### Phase 2: The Yield Layer - Q2 2026

- **Integration:** Connect to PoX pooling protocols (StackingDAO, Lisa) to enable "Auto-Stacking" for small balances.
- **Expansion:** Support for YouTube and GitHub.
- **Claimable Pools:** Enable tipping to unregistered creators.
- **sBTC Bridge:** In-extension BTC → sBTC conversion flow.
- **Analytics v1:** Basic creator dashboard with tip history and totals.
- **Deliverables:**
  - vault.clar with stacking integration.
  - claimable.clar for viral onboarding.
  - YouTube/GitHub content script injection.
  - Mainnet sBTC deployment (pending sBTC mainnet launch).

### Phase 3: The Subscription Engine - Q3 2026

- **Recurring Payments:** Subscription vault system with monthly releases.
- **Token-Gating:** Badge-based access control for Discord, Telegram, exclusive content.
- **Analytics v2:** Advanced metrics, leaderboards, churn analysis.
- **Mobile Companion:** React Native app for creators to manage dashboard on mobile.
- **Deliverables:**
  - subscription.clar contract.
  - Discord verification bot (open-source).
  - Mobile app (iOS/Android) beta.

### Phase 4: The Ecosystem - Q4 2026

- **API/SDK:** Allow other creator tools to plug into the Tribute Registry.
- **Chainhook Integration:** Real-time event streaming for third-party integrations.
- **Multi-Platform Expansion:** Support for Twitch, Substack, Medium, LinkedIn.
- **White-Label Solution:** Allow platforms to embed Tribute directly.
- **Deliverables:**
  - Tribute SDK (npm package).
  - API documentation and developer portal.
  - Partner integration playbook.

### Phase 5: Decentralized Governance - 2027

- **DAO Governance:** Allow token holders to vote on protocol fees or new platform integrations.
- **Protocol Token (Optional):** If warranted, introduce governance token with fair launch.
- **Fee Model:** Minimal protocol fee (0.5-1%) directed to DAO treasury.
- **Grant Program:** Fund ecosystem development from treasury.
- **Deliverables:**
  - Governance contract.
  - Voting interface.
  - Community proposals system.

## 9\. Stacks Ecosystem Compatibility Matrix

This section confirms that all proposed features are implementable with existing or planned Stacks infrastructure.

| Feature | Stacks Technology | Status | Notes |
|---------|------------------|--------|-------|
| Smart Tips | sBTC + Clarity | ✅ Ready | sBTC mainnet launched; Clarity fully supported |
| Auto-Splits | Clarity atomic transfers | ✅ Ready | Native multi-send in single tx |
| NFT Badges | SIP-009 | ✅ Ready | Standard NFT interface |
| Identity Registry | Clarity maps | ✅ Ready | On-chain key-value storage |
| Auto-Stacking | PoX + stSTX/LiSTX | ✅ Ready | Liquid stacking protocols live |
| Subscriptions | Clarity + time-locks | ✅ Ready | Block-height based time-locks |
| Token-Gating | SIP-009 + callReadOnlyFunction | ✅ Ready | Read NFT ownership from any app |
| Analytics | Hiro API + Chainhook | ✅ Ready | Event indexing and streaming |
| Bridge Assistant | sBTC peg mechanism | ✅ Ready | Native BTC → sBTC bridge |
| Recurring Payments | Keeper pattern | 🟡 Possible | Requires off-chain trigger or user action |
| Real-time Updates | Chainhook webhooks | ✅ Ready | Sub-second event streaming |
| Mobile Wallet | Xverse Mobile SDK | ✅ Ready | Full WalletConnect support |

### 9.1 Key Stacks Dependencies

- **sBTC:** Core payment rail. Mainnet availability is critical path.
- **Nakamoto Release:** Fast blocks (~5 seconds) enable better UX for tip confirmations.
- **Stacks.js v7+:** Required for sBTC transfers and modern wallet integration.
- **Chainhook:** Essential for analytics and real-time notifications.
- **Hiro API:** Provides blockchain data access for extension queries.

### 9.2 External Protocol Integrations

| Protocol | Purpose | Integration Method |
|----------|---------|-------------------|
| StackingDAO | Liquid stacking | Contract call to deposit/stake |
| Lisa | Liquid stacking (alternative) | Contract call to deposit/stake |
| Alex DEX | sBTC swaps | Contract call for swap routing |
| Velar | sBTC swaps (alternative) | Contract call for swap routing |
| Arkadiko | DeFi yield | Future: collateralized lending |

## 10\. Risk Analysis & Mitigation

### 10.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| sBTC mainnet delay | High | Build with testnet; design for STX fallback |
| Platform DOM changes | Medium | Selector abstraction layer; hot-update capability |
| Smart contract vulnerability | High | Third-party audit; formal verification; bug bounty |
| Wallet integration issues | Medium | Support multiple wallets; graceful degradation |
| Stacks network congestion | Low | Nakamoto release solves; implement fee estimation |

### 10.2 Product Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Cold-start (no users) | High | Claimable pools create pull; target micro-influencers first |
| Creator onboarding friction | Medium | Progressive disclosure; "Simple Mode" default |
| sBTC liquidity | Medium | Bridge assistant; DEX integration |
| Impersonation attacks | Medium | Multi-factor verification; community flagging |
| Platform ToS violation | Low | Extension doesn't scrape data; only enhances UI |

### 10.3 Market Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Competition (existing tip tools) | Medium | Differentiate on programmability (splits, stacking) |
| Bitcoin price volatility | Low | sBTC is 1:1; users accept BTC exposure |
| Regulatory uncertainty | Medium | Non-custodial design; no money transmission |

## 11\. Success Metrics

### 11.1 Phase 1 KPIs (MVP)

- **Registered Creators:** 100+ verified profiles
- **Tips Sent:** 500+ transactions
- **Total Value Transferred:** 1 BTC equivalent
- **Extension Installs:** 1,000+
- **Split Utilization:** 20% of creators configure splits

### 11.2 Phase 2 KPIs

- **Claimable Pools Created:** 200+ (viral indicator)
- **Claim Rate:** >50% of pools claimed within 30 days
- **Auto-Stack Enabled:** 30% of active creators
- **Platform Expansion:** YouTube + GitHub live

### 11.3 Long-Term North Star Metrics

- **Monthly Active Tippers:** 10,000+
- **Creator MRR (aggregate):** 100 BTC/month
- **Subscription Retention:** >80% month-over-month
- **Ecosystem Integrations:** 10+ third-party apps using Tribute API

## 12\. Conclusion

We are not trying to reinvent the wheel; we are trying to put an engine on it. Bitcoin is the money of the future, but it needs better velocity and utility to serve the creator economy. Tribute provides the tooling to make Bitcoin work for creators, not just sit in cold storage.

**Our thesis is simple:**
- Lightning handles payments. Tribute handles relationships.
- Tips should execute agreements, not just move money.
- Fans should own their reputation, not rent it from platforms.
- Creators should earn yield on their treasury, not let it sit idle.

We are building for a future where every creator is their own platform, every fan is an investor, and value flows as freely as a retweet.

**Tribute: Programmable Patronage on Bitcoin.**

# TECH STACKS

### 1\. The "Powerhouse" Tech Stack

Don't build from scratch. Use frameworks that handle the boring stuff (manifest files, cross-browser compatibility) so you can focus on the logic.

#### A. The Frontend (Browser Extension)

- **Framework:** **Plasmo** (with React).<sup>1</sup>
  - _Why:_ Plasmo is known as "The Next.js for Browser Extensions." It handles hot-reloading, React integration, and automatically bundles your app for Chrome, Firefox, and Brave simultaneously. Do not try to write raw manifest.json files; Plasmo saves you 50+ hours of headache.
- **Language:** **TypeScript**.
  - _Why:_ You are dealing with financial data (money). You cannot afford "undefined is not a function" errors. TypeScript ensures strict typing for transactions.
- **Styling:** **Tailwind CSS**.
  - _Why:_ Fast, responsive, and allows you to build "Dark Mode" easily (crucial for Twitter integration).<sup>2</sup>

#### B. The Stacks Integration (The "Bridge")

- **Library:** **Stacks.js** (@stacks/connect and @stacks/network).<sup>3</sup>
  - _Why:_ The official library. You need @stacks/connect to trigger the popup that asks the user to sign the transaction via their wallet (Leather or Xverse).<sup>4</sup>
- **Wallet Support:** **Leather** (formerly Hiro Wallet) & **Xverse**.
  - _Why:_ You must support both. Xverse is mobile-dominant; Leather is desktop-dominant.
- **State Management:** **TanStack Query (React Query)**.<sup>5</sup>
  - _Why:_ Blockchain data is async (it takes time to load). React Query handles caching, loading states, and auto-refetching balances without freezing the UI.<sup>6</sup>

#### C. The Smart Contracts (The "Brain")

- **Language:** **Clarity**.
  - _Why:_ Required for Stacks. It is "decidable," meaning no infinite loops or re-entrancy attacks (safer for money).
- **Dev Environment:** **Clarinet**.
  - _Why:_ The standard local development environment. It lets you simulate the Stacks blockchain on your laptop to test your "Splitter" logic before deploying to testnet.<sup>7</sup>

### 2\. The Design System: "Invisible UI"

Your UI should not look like a separate app. It should look like it **belongs** inside Twitter/X.

#### Visual Strategy

- **Component Library:** **shadcn/ui**.
  - _Why:_ It provides beautifully designed, accessible components (Popovers, Toasts, Cards) that you can copy/paste into your project. It looks professional out of the box.
- **Color Palette:**
  - **Primary:** Stacks Purple (#5546FF) for the "Action" buttons.
  - **Background:** Dynamic. If the user is on Twitter Dark Mode, your extension must be Dark Mode. If Light, yours is Light.
- **Typography:** San Francisco (Mac) or Inter (Windows). Match the host platform's font so the "Tip" button doesn't look like a scam/ad.

### 3\. The User Experience (UX) "Secret Sauce"

This is where you win the "Product" score.

#### A. The "Injection" Experience

Don't make users open the extension popup every time.

- **Technique:** **DOM Injection**.
- **How:** Use a Content Script to find the "Retweet/Like" bar on a tweet. Inject a small, subtle Tip icon right next to them.
- **Result:** It feels native. The user clicks it _inside_ the tweet, not up in the browser toolbar.

#### B. The "One-Click" Illusion

Blockchains are slow. Users are impatient.

- **Problem:** Stacks transactions take time to confirm (seconds to minutes).<sup>8</sup>
- **The Fix:** **Optimistic UI**.
- **Flow:**
  - User clicks "Confirm Tip."
  - **Instantly** show a "Success!" animation (Confetti).
  - Show a notification: _"Tip broadcasted! Settlement pending..."_
  - Don't make them wait for the block confirmation to close the window.

#### C. The "Split" Visualization

When a user is about to tip, show them the magic.

- **The UI:** A small pie chart or progress bar in the confirmation popup.
- **Text:** _"You are sending 100 sats. 50 sats will go to @Writer, 50 sats will go to @Artist."_
- **Why:** This visual proves the value proposition immediately.

### 4\. Credentials & Skills Checklist

You (or your team) need to cover these bases. If you are doing it alone, this is your learning path:

- **React/TypeScript Mastery:** You need to be comfortable with Hooks (useEffect, useState) and Context API.
- **Chrome Extension Architecture:** Understand the difference between background scripts (logic that runs unseen) and content scripts (logic that touches the webpage).
- **Clarity Basics:** You don't need to be a wizard, but you need to know how to write a public function that transfers tokens.
- **UI/UX Eye:** You need the ability to spot "pixel perfection." If the button is 2 pixels misaligned, it looks like malware.

### 5\. Summary: Your "Starter Pack"

If you open your terminal right now, this is what you should run to start the project (using Plasmo):

Bash

\# Initialize the browser extension with React and Tailwind

pnpm create plasmo -- --with-tailwindcss

\# Install the Stacks libraries

pnpm install @stacks/connect @stacks/network @stacks/transactions

## 13\. Appendix A: Contract Architecture Diagrams

### A.1 Core Contract Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRIBUTE PROTOCOL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │  registry    │────▶│   splitter   │────▶│  badge-nft   │   │
│  │    .clar     │     │    .clar     │     │    .clar     │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                    │                    │            │
│         │                    │                    │            │
│         ▼                    ▼                    ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │  claimable   │     │    vault     │     │ subscription │   │
│  │    .clar     │     │    .clar     │     │    .clar     │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│                              │                                 │
│                              ▼                                 │
│                    ┌──────────────────┐                       │
│                    │  External DeFi   │                       │
│                    │ (StackingDAO,    │                       │
│                    │  Lisa, Alex)     │                       │
│                    └──────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### A.2 Tip Flow Sequence

```
Fan                Extension           Splitter           Creator/Collaborators
 │                     │                  │                       │
 │  Click "Tip"        │                  │                       │
 │────────────────────▶│                  │                       │
 │                     │                  │                       │
 │                     │  Query splits    │                       │
 │                     │─────────────────▶│                       │
 │                     │◀─────────────────│                       │
 │                     │  Return config   │                       │
 │                     │                  │                       │
 │  Show split preview │                  │                       │
 │◀────────────────────│                  │                       │
 │                     │                  │                       │
 │  Confirm            │                  │                       │
 │────────────────────▶│                  │                       │
 │                     │                  │                       │
 │                     │  execute-tip()   │                       │
 │                     │─────────────────▶│                       │
 │                     │                  │                       │
 │                     │                  │  Atomic transfers     │
 │                     │                  │──────────────────────▶│
 │                     │                  │                       │
 │                     │                  │  Mint badge           │
 │                     │                  │─────────┐             │
 │                     │                  │◀────────┘             │
 │                     │                  │                       │
 │                     │  tx-confirmed    │                       │
 │                     │◀─────────────────│                       │
 │                     │                  │                       │
 │  Success + Badge    │                  │                       │
 │◀────────────────────│                  │                       │
 │                     │                  │                       │
```

### A.3 Subscription Vault Flow

```
Fan                  Subscription.clar       Creator         Keeper/User
 │                         │                    │                 │
 │  deposit(3 months)      │                    │                 │
 │────────────────────────▶│                    │                 │
 │                         │                    │                 │
 │                         │  Store funds +     │                 │
 │                         │  set release       │                 │
 │                         │  schedule          │                 │
 │                         │                    │                 │
 │                         │     [Month 1]      │                 │
 │                         │                    │                 │
 │                         │  trigger-release() │                 │
 │                         │◀───────────────────│─────────────────│
 │                         │                    │                 │
 │                         │  Transfer month 1  │                 │
 │                         │───────────────────▶│                 │
 │                         │                    │                 │
 │  [Repeat monthly...]    │                    │                 │
 │                         │                    │                 │
 │  cancel()               │                    │                 │
 │────────────────────────▶│                    │                 │
 │                         │                    │                 │
 │◀────────────────────────│                    │                 │
 │  Refund remaining       │                    │                 │
 │                         │                    │                 │
```

## 14\. Appendix B: API & SDK Specification (Phase 4)

### B.1 Tribute Registry API

```typescript
// Query creator by social handle
GET /api/v1/creator/{platform}/{handle}
Response: {
  principal: string;
  verified: boolean;
  verifiedAt: number;
  splits: SplitConfig[];
  totalReceived: string;
  badgeTypes: string[];
}

// Query tips for a creator
GET /api/v1/tips/{principal}?limit=100&offset=0
Response: {
  tips: Tip[];
  total: number;
  volume: string;
}

// Query fan's patronage history
GET /api/v1/fan/{principal}/history
Response: {
  tipsGiven: Tip[];
  subscriptions: Subscription[];
  badges: Badge[];
}
```

### B.2 Tribute SDK (npm)

```typescript
import { TributeSDK } from '@tribute-protocol/sdk';

const tribute = new TributeSDK({
  network: 'mainnet',
  apiKey: 'optional-for-higher-limits'
});

// Check if creator is registered
const creator = await tribute.getCreator('twitter', 'elonmusk');

// Execute a tip (returns unsigned tx for wallet signing)
const tipTx = await tribute.createTip({
  to: creator.principal,
  amount: 100000, // in satoshis
  message: 'Great thread!'
});

// Verify badge ownership
const hasBadge = await tribute.verifyBadge({
  holder: 'SP2...',
  creator: 'SP3...',
  badgeType: 'whale-supporter'
});
```

## 15\. Appendix C: Competitive Analysis

| Feature | Tribute | Patreon | Buy Me A Coffee | Lightning Tips | Geyser Fund |
|---------|---------|---------|-----------------|----------------|-------------|
| Non-custodial | ✅ | ❌ | ❌ | ✅ | Partial |
| Auto-splits | ✅ | ❌ | ❌ | ❌ | ❌ |
| Yield generation | ✅ | ❌ | ❌ | ❌ | ❌ |
| NFT badges | ✅ | ❌ | ❌ | ❌ | ❌ |
| Subscriptions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Token-gating | ✅ | ✅ | ❌ | ❌ | ❌ |
| Platform fee | 0-1% | 5-12% | 5% | 0% | 0% |
| Bitcoin-native | ✅ | ❌ | ❌ | ✅ | ✅ |
| Programmable | ✅ | ❌ | ❌ | ❌ | ❌ |
| On-chain reputation | ✅ | ❌ | ❌ | ❌ | ❌ |

**Tribute's Unique Position:** The only solution combining Bitcoin's monetary properties with smart contract programmability for creator economy use cases.

## 16\. Appendix D: Glossary

| Term | Definition |
|------|------------|
| **sBTC** | Synthetic Bitcoin on Stacks; 1:1 BTC-backed programmable asset |
| **Clarity** | Smart contract language for Stacks; decidable and non-Turing complete |
| **SIP-009** | Stacks Improvement Proposal for NFT standard |
| **PoX** | Proof of Transfer; Stacks consensus mechanism that yields BTC |
| **Stacking** | Locking STX/sBTC to secure network and earn BTC yield |
| **Chainhook** | Stacks event streaming and indexing service |
| **Nakamoto Release** | Stacks upgrade enabling fast blocks (~5 sec) |
| **Atomic Transfer** | Multiple transfers executed in single transaction; all-or-nothing |
| **Principal** | Stacks address format (SP... for mainnet, ST... for testnet) |
| **Liquid Stacking** | Stacking while maintaining liquidity via derivative tokens (stSTX, LiSTX) |