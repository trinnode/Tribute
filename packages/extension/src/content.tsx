import { openContractCall } from "@stacks/connect"
import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import {
  buildTipTransaction,
  determineBadgeTier,
  formatStx,
  parseStx,
  previewTip,
  resolveSocialHandle
} from "~lib/tribute-api"

// Only run on supported platforms
export const config: PlasmoCSConfig = {
  matches: [
    "https://twitter.com/*",
    "https://x.com/*",
    "https://www.youtube.com/*",
    "https://github.com/*",
    "https://www.twitch.tv/*",
    "https://linkedin.com/*"
  ],
  css: ["font.css"]
}

// Style injection for shadow DOM
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16
  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })
  const style = document.createElement("style")
  style.textContent = updatedCssText
  return style
}

// Detect current platform
function detectPlatform(): string | null {
  const hostname = window.location.hostname
  if (hostname.includes("twitter.com") || hostname.includes("x.com"))
    return "twitter"
  if (hostname.includes("youtube.com")) return "youtube"
  if (hostname.includes("github.com")) return "github"
  if (hostname.includes("twitch.tv")) return "twitch"
  if (hostname.includes("linkedin.com")) return "linkedin"
  return null
}

// Extract username from URL based on platform
function extractUsername(): string | null {
  const platform = detectPlatform()
  const pathname = window.location.pathname

  switch (platform) {
    case "twitter":
      // twitter.com/@username or twitter.com/username
      const twitterMatch = pathname.match(/^\/(@?[\w_]+)(?:\/|$)/)
      if (
        twitterMatch &&
        ![
          "home",
          "explore",
          "search",
          "notifications",
          "messages",
          "settings",
          "i",
          "compose"
        ].includes(twitterMatch[1])
      ) {
        return twitterMatch[1].replace("@", "")
      }
      break
    case "youtube":
      // youtube.com/@channelname or youtube.com/channel/...
      const ytMatch =
        pathname.match(/^\/@([\w_-]+)/) ||
        pathname.match(/^\/channel\/([\w_-]+)/)
      if (ytMatch) return ytMatch[1]
      break
    case "github":
      // github.com/username
      const ghMatch = pathname.match(/^\/([\w-]+)(?:\/|$)/)
      if (
        ghMatch &&
        ![
          "features",
          "enterprise",
          "pricing",
          "security",
          "explore",
          "settings",
          "notifications",
          "pulls",
          "issues",
          "marketplace",
          "sponsors",
          "orgs",
          "login",
          "signup",
          "new",
          "codespaces"
        ].includes(ghMatch[1])
      ) {
        return ghMatch[1]
      }
      break
    case "twitch":
      // twitch.tv/channelname
      const twitchMatch = pathname.match(/^\/([\w_]+)(?:\/|$)/)
      if (
        twitchMatch &&
        ![
          "directory",
          "videos",
          "settings",
          "search",
          "downloads",
          "wallet"
        ].includes(twitchMatch[1])
      ) {
        return twitchMatch[1]
      }
      break
    case "linkedin":
      // linkedin.com/in/username
      const liMatch = pathname.match(/^\/in\/([\w-]+)(?:\/|$)/)
      {
        // Filter out common LinkedIn routes that aren't user profiles
        const username = liMatch[1]
        if (
          ![
            "feed",
            "jobs",
            "messaging",
            "notifications",
            "mynetwork",
            "search",
            "learning",
            "settings",
            "premium",
            "company",
            "school",
            "groups",
            "events",
            "ads",
            "sales",
            "talent",
            "post",
            "pulse"
          ].includes(username)
        ) {
          return username
        }
            }
      break
  }
  return null
}

interface CreatorInfo {
  username: string
  platform: string
  address: string | null
  verified: boolean
  isRegistered: boolean
}

interface TributeButtonProps {
  creatorInfo: CreatorInfo
}

function TributeButton({ creatorInfo }: TributeButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState("1")
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [tipPreview, setTipPreview] = useState<{
    creatorReceives: number
    badgeTier: { tier: number; name: string } | null
  } | null>(null)
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info"
    text: string
  } | null>(null)

  useEffect(() => {
    // Check wallet connection status
    chrome.storage.local.get(["walletAddress"], (result) => {
      setIsConnected(!!result.walletAddress)
      setWalletAddress(result.walletAddress || null)
    })
  }, [])

  // Update preview when amount changes
  useEffect(() => {
    const updatePreview = async () => {
      if (!creatorInfo.address || !tipAmount) return

      const amount = parseFloat(tipAmount)
      if (isNaN(amount) || amount <= 0) return

      const microStx = parseStx(amount)

      try {
        const preview = await previewTip(creatorInfo.address, microStx)
        const badge = await determineBadgeTier(microStx)

        setTipPreview({
          creatorReceives: preview.creatorReceives,
          badgeTier: badge
        })
      } catch (err) {
        console.error("Error updating preview:", err)
      }
    }

    if (showTipModal && creatorInfo.address) {
      updatePreview()
    }
  }, [tipAmount, showTipModal, creatorInfo.address])

  const handleTip = async () => {
    if (!isConnected) {
      // Open popup to connect wallet
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" })
      return
    }

    if (!creatorInfo.address) {
      setStatusMessage({
        type: "error",
        text: "Creator not registered on Tribute"
      })
      return
    }

    const amount = parseFloat(tipAmount)
    if (isNaN(amount) || amount <= 0) {
      setStatusMessage({ type: "error", text: "Invalid amount" })
      return
    }

    setIsProcessing(true)
    setStatusMessage(null)

    try {
      const microStx = parseStx(amount)
      const txData = buildTipTransaction(creatorInfo.address, microStx)

      // Call openContractCall directly from content script context
      openContractCall({
        ...txData,
        onFinish: (data) => {
          setStatusMessage({
            type: "success",
            text: `Tip sent! TX: ${data.txId.slice(0, 8)}...`
          })
          // Store tip in history
          chrome.runtime.sendMessage({
            type: "TIP_SENT",
            data: {
              recipient: creatorInfo.address,
              amount: microStx,
              username: creatorInfo.username,
              platform: creatorInfo.platform,
              txId: data.txId
            }
          })
          // Close modal after success
          setTimeout(() => {
            setShowTipModal(false)
            setStatusMessage(null)
          }, 3000)
          setIsProcessing(false)
        },
        onCancel: () => {
          setStatusMessage({ type: "info", text: "Transaction cancelled" })
          setIsProcessing(false)
        }
      })
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message })
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Floating Tribute Button */}
      <button
        onClick={() => setShowTipModal(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed bottom-6 right-6 z-[9999]
          flex items-center gap-2
          py-3 px-4
          bg-orange-500 hover:bg-orange-600
          text-white font-semibold
          rounded-full shadow-lg
          transition-all duration-300 ease-out
          ${isHovered ? "scale-105" : "scale-100"}
        `}
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        }}>
        <span className="text-lg">₿</span>
        <span
          className={`transition-all duration-300 ${isHovered ? "opacity-100 max-w-40" : "opacity-0 max-w-0"} overflow-hidden whitespace-nowrap`}>
          Tip @{creatorInfo.username}
        </span>
      </button>

      {/* Tip Modal */}
      {showTipModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
          onClick={() => setShowTipModal(false)}>
          <div
            className="bg-slate-900 rounded-2xl p-6 w-80 text-white shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-xl">₿</span>
                </div>
                <span className="font-bold">Tribute</span>
              </div>
              <button
                onClick={() => setShowTipModal(false)}
                className="text-slate-400 hover:text-white text-xl">
                ×
              </button>
            </div>

            {/* Creator Info */}
            <div className="bg-slate-800 rounded-lg p-4 mb-4">
              <div className="text-sm text-slate-400 mb-1">Sending tip to</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">@{creatorInfo.username}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {creatorInfo.platform}
                  </div>
                </div>
                {creatorInfo.isRegistered ? (
                  <div className="flex items-center gap-1">
                    {creatorInfo.verified && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                        ✓ Verified
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                      Registered
                    </span>
                  </div>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                    Not Registered
                  </span>
                )}
              </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div
                className={`p-3 rounded-lg text-sm mb-4 ${
                  statusMessage.type === "success"
                    ? "bg-green-500/20 text-green-400 border border-green-500/50"
                    : statusMessage.type === "error"
                      ? "bg-red-500/20 text-red-400 border border-red-500/50"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                }`}>
                {statusMessage.text}
              </div>
            )}

            {!creatorInfo.isRegistered ? (
              // Not registered state
              <div className="text-center py-4">
                <div className="text-4xl mb-2">😢</div>
                <p className="text-sm text-slate-400 mb-2">
                  @{creatorInfo.username} hasn't registered on Tribute yet
                </p>
                <p className="text-xs text-slate-500">
                  Share Tribute with them so they can receive tips!
                </p>
              </div>
            ) : !isConnected ? (
              // Not connected state
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-4">
                  Connect your wallet to send tips
                </p>
                <button
                  onClick={handleTip}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition-colors">
                  Connect Wallet
                </button>
              </div>
            ) : (
              // Connected state - tip form
              <>
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {["1", "5", "10", "25"].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={`
                        py-2 rounded-lg text-sm font-medium transition-colors
                        ${
                          tipAmount === amount
                            ? "bg-orange-500 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }
                      `}>
                      {amount} STX
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="relative mb-4">
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                    placeholder="Custom amount"
                    min="0.1"
                    step="0.1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    STX
                  </span>
                </div>

                {/* Preview */}
                {tipPreview && (
                  <div className="bg-slate-800/50 rounded-lg p-3 mb-4 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Creator receives:</span>
                      <span className="text-white">
                        {formatStx(tipPreview.creatorReceives)} STX
                      </span>
                    </div>
                    {tipPreview.badgeTier && (
                      <div className="flex justify-between text-slate-400 mt-1">
                        <span>Badge earned:</span>
                        <span className="text-orange-400">
                          🏆 {tipPreview.badgeTier.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleTip}
                  disabled={isProcessing}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-semibold transition-colors">
                  {isProcessing ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </span>
                  ) : (
                    `Send ${tipAmount} STX`
                  )}
                </button>

                {/* Fee Info */}
                <p className="text-xs text-slate-500 text-center mt-3">
                  Powered by Bitcoin via Stacks • Testnet
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Main content component
function TributeContent() {
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const checkForProfile = async () => {
      const currentPlatform = detectPlatform()
      const currentUsername = extractUsername()

      if (currentPlatform && currentUsername) {
        setIsLoading(true)

        // Try to resolve the social handle
        try {
          const resolved = await resolveSocialHandle(
            currentUsername,
            currentPlatform
          )

          setCreatorInfo({
            username: currentUsername,
            platform: currentPlatform,
            address: resolved?.address || null,
            verified: resolved?.verified || false,
            isRegistered: !!resolved
          })
        } catch (err) {
          console.error("Error resolving handle:", err)
          setCreatorInfo({
            username: currentUsername,
            platform: currentPlatform,
            address: null,
            verified: false,
            isRegistered: false
          })
        }

        setIsLoading(false)
      } else {
        setCreatorInfo(null)
      }
    }

    // Check immediately
    checkForProfile()

    // Watch for URL changes (SPA navigation)
    let lastUrl = window.location.href
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href
        checkForProfile()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Also watch for popstate events
    window.addEventListener("popstate", checkForProfile)

    return () => {
      observer.disconnect()
      window.removeEventListener("popstate", checkForProfile)
    }
  }, [])

  // Don't render if not on a profile page or still loading
  if (!creatorInfo || isLoading) {
    return null
  }

  return <TributeButton creatorInfo={creatorInfo} />
}

export default TributeContent
