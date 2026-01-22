import {
  connect,
  disconnect,
  getLocalStorage,
  getSelectedProviderId,
  isConnected,
  request
} from "@stacks/connect"
import { Cl } from "@stacks/transactions"
import { useCallback, useEffect, useState } from "react"

import {
  formatStx,
  getCreatorStats,
  getRegisteredIdentity,
  hashSocialHandleAsync
} from "~lib/tribute-api"

import "~style.css"

// Contract configuration
const DEPLOYER = "STX9BA8A6BQBWTZJ62DWZ6G1QQAAHZKKC7R46JE8"

interface WalletState {
  connected: boolean
  address: string | null
  publicKey: string | null
}

interface UserStats {
  tipsSent: number
  tipsReceived: number
  badgesEarned: number
  isRegistered: boolean
  registeredPlatform: string | null
  isVerified: boolean
}

type View = "main" | "register" | "badges" | "history"

function TributeDashboard() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    publicKey: null
  })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats>({
    tipsSent: 0,
    tipsReceived: 0,
    badgesEarned: 0,
    isRegistered: false,
    registeredPlatform: null,
    isVerified: false
  })
  const [view, setView] = useState<View>("main")
  const [registerHandle, setRegisterHandle] = useState("")
  const [registerPlatform, setRegisterPlatform] = useState<string>("twitter")
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)
  const [detectedProviders, setDetectedProviders] = useState<string[]>([])

  // Load wallet state on mount
  useEffect(() => {
    // Detect providers on page load
    const checkProviders = () => {
      const providers: string[] = []
      if ((window as any).wbip_providers?.length > 0) {
        providers.push(`wbip(${(window as any).wbip_providers.length})`)
      }
      if ((window as any).XverseProviders) providers.push("Xverse")
      if ((window as any).BitcoinProvider) providers.push("Bitcoin")
      if ((window as any).StacksProvider) providers.push("Stacks")
      if ((window as any).LeatherProvider) providers.push("Leather")
      if ((window as any).HiroWalletProvider) providers.push("Hiro")
      if ((window as any).btc) providers.push("btc")
      setDetectedProviders(providers)
      console.log("Providers detected on load:", providers)
    }

    // Check immediately and after a delay (wallets might inject late)
    checkProviders()
    const timer = setTimeout(checkProviders, 1000)

    const checkConnection = async () => {
      try {
        // Check if already connected using new API
        if (isConnected()) {
          const localStorage = getLocalStorage()
          const stxAddress = localStorage?.addresses?.stx?.[0]?.address
          // Note: publicKey may not be available in the stored data type
          const stxEntry = localStorage?.addresses?.stx?.[0] as any
          const publicKey = stxEntry?.publicKey

          if (stxAddress) {
            chrome.storage.local.set({
              walletAddress: stxAddress,
              walletPublicKey: publicKey
            })

            setWallet({
              connected: true,
              address: stxAddress,
              publicKey: publicKey || null
            })
          }
        } else {
          // Fall back to checking chrome storage
          chrome.storage.local.get(
            ["walletAddress", "walletPublicKey"],
            (result) => {
              if (result.walletAddress) {
                setWallet({
                  connected: true,
                  address: result.walletAddress,
                  publicKey: result.walletPublicKey
                })
              }
            }
          )
        }
      } catch (err) {
        console.error("Error checking connection:", err)
      }
      setLoading(false)
    }

    checkConnection()

    return () => clearTimeout(timer)
  }, [])

  // Fetch user stats when wallet is connected
  useEffect(() => {
    if (wallet.connected && wallet.address) {
      fetchUserStats(wallet.address)
    }
  }, [wallet.connected, wallet.address])

  const fetchUserStats = async (address: string) => {
    try {
      const creatorStats = await getCreatorStats(address)
      const identity = await getRegisteredIdentity(address)

      setStats({
        tipsSent: 0,
        tipsReceived: creatorStats.totalReceived,
        badgesEarned: 0,
        isRegistered: !!identity,
        registeredPlatform: identity?.platform || null,
        isVerified: identity?.verified || false
      })
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }

  // Check what wallet providers are available
  const detectWalletProviders = () => {
    const providers: string[] = []

    // Check for WBIP providers (standard)
    if ((window as any).wbip_providers?.length > 0) {
      providers.push(`wbip_providers: ${(window as any).wbip_providers.length}`)
    }

    // Check for Xverse
    if ((window as any).XverseProviders) {
      providers.push("XverseProviders")
    }
    if ((window as any).BitcoinProvider) {
      providers.push("BitcoinProvider")
    }

    // Check for Leather/Hiro
    if ((window as any).StacksProvider) {
      providers.push("StacksProvider")
    }
    if ((window as any).LeatherProvider) {
      providers.push("LeatherProvider")
    }
    if ((window as any).HiroWalletProvider) {
      providers.push("HiroWalletProvider")
    }

    // Check btc providers
    if ((window as any).btc) {
      providers.push("window.btc")
    }

    console.log("Detected wallet providers:", providers)
    return providers
  }

  // Manual address entry for extension context where wallets can't inject
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualAddress, setManualAddress] = useState("")

  const connectWallet = async () => {
    setIsProcessing(true)
    setStatusMessage({ type: "info", text: "Attempting to connect wallet..." })

    try {
      // Debug: Check available providers
      const providers = detectWalletProviders()
      console.log("Available providers before connect:", providers)
      console.log("Current URL:", window.location.href)
      console.log(
        "Is extension context:",
        window.location.protocol === "chrome-extension:"
      )

      // Try to connect using @stacks/connect
      // The library should show a modal with available wallets
      setStatusMessage({ type: "info", text: "Opening wallet selector..." })

      // Use new connect() API from @stacks/connect v8
      const response = await connect()

      console.log("Connect response:", response)

      // Get the STX address from the response
      const stxAddress = response?.addresses?.find((addr: any) =>
        addr.address?.startsWith("S")
      )

      if (stxAddress) {
        chrome.storage.local.set({
          walletAddress: stxAddress.address,
          walletPublicKey: stxAddress.publicKey
        })

        setWallet({
          connected: true,
          address: stxAddress.address,
          publicKey: stxAddress.publicKey || null
        })

        setStatusMessage({
          type: "success",
          text: "Wallet connected successfully!"
        })
        setTimeout(() => setStatusMessage(null), 3000)
      } else {
        throw new Error("No STX address found in wallet response")
      }
    } catch (err: any) {
      console.error("Connection error:", err)
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to connect wallet"
      })
    }
    setIsProcessing(false)
  }

  const disconnectWallet = () => {
    disconnect()
    chrome.storage.local.remove(["walletAddress", "walletPublicKey"])
    setWallet({
      connected: false,
      address: null,
      publicKey: null
    })
    setStats({
      tipsSent: 0,
      tipsReceived: 0,
      badgesEarned: 0,
      isRegistered: false,
      registeredPlatform: null,
      isVerified: false
    })
    setView("main")
  }

  const handleRegister = async () => {
    if (!registerHandle.trim()) {
      setStatusMessage({ type: "error", text: "Please enter your handle" })
      return
    }

    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const handle = registerHandle.replace("@", "").toLowerCase()
      const socialHash = await hashSocialHandleAsync(handle, registerPlatform)

      // Convert Uint8Array to hex for the contract call
      const hashHex = Array.from(socialHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      // Use new request() API for contract calls
      const response = await request("stx_callContract", {
        contract: `${DEPLOYER}.registry`,
        functionName: "register",
        functionArgs: [
          Cl.bufferFromHex(hashHex),
          Cl.stringAscii(registerPlatform)
        ],
        network: "testnet"
      })

      setStatusMessage({
        type: "success",
        text: `Registration submitted! TX: ${response.txid?.slice(0, 8)}...`
      })
      setIsProcessing(false)

      // Refresh stats after a delay
      setTimeout(() => {
        if (wallet.address) fetchUserStats(wallet.address)
      }, 3000)
    } catch (err: any) {
      console.error("Registration error:", err)
      setStatusMessage({
        type: "error",
        text: err.message || "Registration failed"
      })
      setIsProcessing(false)
    }
  }

  const truncateAddress = (addr: string) => {
    if (!addr) return ""
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Get the logo URL from extension assets
  const logoUrl = chrome.runtime.getURL("assets/icon.png")

  // Logo component using the actual image
  const LogoIcon = ({ size = "small" }: { size?: "small" | "large" }) => {
    const [imgError, setImgError] = useState(false)
    const sizeClasses =
      size === "large" ? "w-24 h-24 rounded-2xl" : "w-10 h-10 rounded-xl"

    if (imgError) {
      // Fallback to styled text if image fails
      return (
        <div
          className={`${sizeClasses} bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg ${size === "large" ? "text-5xl shadow-orange-500/20" : "text-xl"}`}>
          T
        </div>
      )
    }

    return (
      <img
        src={logoUrl}
        alt="Tribute"
        className={`${sizeClasses} object-cover shadow-lg ${size === "large" ? "shadow-orange-500/20" : ""}`}
        onError={() => setImgError(true)}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <LogoIcon />
              <div>
                <h1 className="text-xl font-bold">Tribute</h1>
                <p className="text-xs text-slate-400">
                  Bitcoin Tipping for Creators
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/50">
                Testnet
              </span>
              {wallet.connected && (
                <div className="flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-mono">
                    {truncateAddress(wallet.address!)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm ${
              statusMessage.type === "success"
                ? "bg-green-500/20 text-green-400 border border-green-500/50"
                : statusMessage.type === "error"
                  ? "bg-red-500/20 text-red-400 border border-red-500/50"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/50"
            }`}>
            {statusMessage.text}
          </div>
        )}

        {!wallet.connected ? (
          /* Not Connected View */
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="mx-auto mb-6 flex justify-center">
                <LogoIcon size="large" />
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Support Your Favorite Creators
              </h2>
              <p className="text-slate-400 mb-8">
                Send Bitcoin tips directly to creators on Twitter, YouTube,
                GitHub, and Twitch. Powered by Stacks.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-2xl mb-2">1️⃣</div>
                  <p className="text-sm text-slate-300">Connect Wallet</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-2xl mb-2">2️⃣</div>
                  <p className="text-sm text-slate-300">Visit a Profile</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-2xl mb-2">3️⃣</div>
                  <p className="text-sm text-slate-300">Click Tip Button</p>
                </div>
              </div>

              <button
                onClick={connectWallet}
                disabled={isProcessing}
                className="px-8 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg shadow-orange-500/25">
                {isProcessing ? "Connecting..." : "Connect Stacks Wallet"}
              </button>

              <p className="text-xs text-slate-500 mt-4">
                Works with Xverse, Leather, and other Stacks wallets
              </p>

              {/* Manual entry fallback for extension context */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <button
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="text-xs text-slate-400 hover:text-slate-300 underline">
                  {showManualEntry
                    ? "Hide manual entry"
                    : "Wallet not detected? Enter address manually"}
                </button>

                {showManualEntry && (
                  <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-400 mb-3">
                      Extension pages can't detect wallet extensions. Enter your
                      STX address manually:
                    </p>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="SP... or ST... address"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm mb-3 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={() => {
                        if (manualAddress.match(/^S[PT][A-Z0-9]{38,40}$/)) {
                          chrome.storage.local.set({
                            walletAddress: manualAddress
                          })
                          setWallet({
                            connected: true,
                            address: manualAddress,
                            publicKey: null
                          })
                          setShowManualEntry(false)
                          setStatusMessage({
                            type: "success",
                            text: "Address saved! Note: You'll need wallet access for transactions."
                          })
                        } else {
                          setStatusMessage({
                            type: "error",
                            text: "Invalid STX address format"
                          })
                        }
                      }}
                      disabled={!manualAddress}
                      className="w-full py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm transition-colors">
                      Save Address (View Only)
                    </button>
                    <p className="text-xs text-yellow-500/70 mt-2">
                      ⚠️ This only saves your address for viewing. To send tips,
                      use the Tribute button on Twitter/YouTube.
                    </p>
                  </div>
                )}
              </div>

              {/* Debug: Show detected providers */}
              <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-500">
                  Detected wallets:{" "}
                  {detectedProviders.length > 0
                    ? detectedProviders.join(", ")
                    : "None (normal in extension context)"}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Tip: Wallets inject on web pages, not extension pages. Use
                  Tribute buttons on Twitter/YouTube for full functionality.
                </p>
              </div>
            </div>
          </div>
        ) : view === "main" ? (
          /* Connected - Dashboard View */
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Tips Received</div>
                <div className="text-2xl font-bold">
                  {formatStx(stats.tipsReceived)} STX
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Badges Earned</div>
                <div className="text-2xl font-bold">{stats.badgesEarned}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Status</div>
                <div className="text-2xl font-bold">
                  {stats.isRegistered ? (
                    <span className="text-green-400">Registered</span>
                  ) : (
                    <span className="text-slate-400">Not Registered</span>
                  )}
                </div>
              </div>
            </div>

            {/* Registration Card */}
            {!stats.isRegistered && (
              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/10 rounded-xl p-6 border border-orange-500/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-400">
                      Register as a Creator
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Link your social identity to start receiving tips
                    </p>
                  </div>
                  <button
                    onClick={() => setView("register")}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors">
                    Register Now
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setView("badges")}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-left hover:bg-slate-700/50 transition-colors">
                <div className="text-2xl mb-2">🏆</div>
                <h3 className="font-semibold">View Badges</h3>
                <p className="text-sm text-slate-400">
                  See your Proof of Patronage badges
                </p>
              </button>
              <button
                onClick={() => setView("history")}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-left hover:bg-slate-700/50 transition-colors">
                <div className="text-2xl mb-2">📜</div>
                <h3 className="font-semibold">Tip History</h3>
                <p className="text-sm text-slate-400">
                  View your recent transactions
                </p>
              </button>
              <a
                href={`https://explorer.hiro.so/address/${wallet.address}?chain=testnet`}
                target="_blank"
                rel="noopener"
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-left hover:bg-slate-700/50 transition-colors">
                <div className="text-2xl mb-2">🔍</div>
                <h3 className="font-semibold">View on Explorer</h3>
                <p className="text-sm text-slate-400">
                  See all on-chain activity
                </p>
              </a>
              <button
                onClick={disconnectWallet}
                className="bg-slate-800/50 rounded-xl p-6 border border-red-500/30 text-left hover:bg-red-500/10 transition-colors">
                <div className="text-2xl mb-2">🔌</div>
                <h3 className="font-semibold text-red-400">Disconnect</h3>
                <p className="text-sm text-slate-400">Disconnect your wallet</p>
              </button>
            </div>
          </div>
        ) : view === "register" ? (
          /* Register View */
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setView("main")}
              className="text-slate-400 hover:text-white mb-6 flex items-center space-x-2">
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-2">
                Register as Creator
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Link your social identity to receive tips from fans
              </p>

              {/* Platform Selection */}
              <div className="mb-4">
                <label className="text-sm text-slate-400 mb-2 block">
                  Select Platform
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["twitter", "youtube", "github", "twitch"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setRegisterPlatform(p)}
                      className={`py-3 px-3 rounded-lg text-sm capitalize transition-colors ${
                        registerPlatform === p
                          ? "bg-orange-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Handle Input */}
              <div className="mb-6">
                <label className="text-sm text-slate-400 mb-2 block">
                  Your {registerPlatform} handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={registerHandle}
                    onChange={(e) => setRegisterHandle(e.target.value)}
                    placeholder="username"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Register Button */}
              <button
                onClick={handleRegister}
                disabled={isProcessing || !registerHandle.trim()}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-semibold transition-colors">
                {isProcessing ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </span>
                ) : (
                  "Register Identity"
                )}
              </button>

              <p className="text-xs text-slate-500 text-center mt-4">
                After registering, verify ownership by posting a tweet with your
                wallet address
              </p>
            </div>
          </div>
        ) : view === "badges" ? (
          /* Badges View */
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setView("main")}
              className="text-slate-400 hover:text-white mb-6 flex items-center space-x-2">
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-2">My Badges</h2>
              <p className="text-sm text-slate-400 mb-6">
                Proof of Patronage badges earned
              </p>

              <div className="text-center py-8 text-slate-400">
                <div className="text-6xl mb-4">🏆</div>
                <p className="text-lg">No badges earned yet</p>
                <p className="text-sm mt-2">
                  Tip creators to earn Proof of Patronage badges!
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <h4 className="text-sm font-semibold mb-4">Badge Tiers</h4>
                <div className="space-y-2">
                  {[
                    { icon: "🥉", name: "Supporter", amount: "0.1+ STX" },
                    { icon: "🥈", name: "Early Believer", amount: "0.5+ STX" },
                    { icon: "🥇", name: "Champion", amount: "1+ STX" },
                    { icon: "💎", name: "Whale", amount: "10+ STX" },
                    { icon: "👑", name: "Legend", amount: "100+ STX" }
                  ].map((tier) => (
                    <div
                      key={tier.name}
                      className="flex items-center justify-between py-2 px-3 bg-slate-700/50 rounded-lg">
                      <span>
                        {tier.icon} {tier.name}
                      </span>
                      <span className="text-slate-400">{tier.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : view === "history" ? (
          /* History View */
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setView("main")}
              className="text-slate-400 hover:text-white mb-6 flex items-center space-x-2">
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>

            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-2">Tip History</h2>
              <p className="text-sm text-slate-400 mb-6">
                Your recent tips and transactions
              </p>

              <div className="text-center py-8 text-slate-400">
                <div className="text-6xl mb-4">📜</div>
                <p className="text-lg">No tips yet</p>
                <p className="text-sm mt-2">
                  Visit a creator's profile and click the Tribute button!
                </p>
              </div>

              <a
                href={`https://explorer.hiro.so/address/${wallet.address}?chain=testnet`}
                target="_blank"
                rel="noopener"
                className="block w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-center transition-colors mt-4">
                View all transactions on Explorer ↗
              </a>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Tribute v0.1.0 • Testnet</span>
            <div className="flex items-center space-x-4">
              <a href="#" className="hover:text-slate-400">
                Documentation
              </a>
              <a href="#" className="hover:text-slate-400">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default TributeDashboard
