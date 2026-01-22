// Background service worker for Tribute extension

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "OPEN_POPUP":
      // Open the extension popup
      chrome.action.openPopup?.() ||
        chrome.action.setPopup({ popup: "popup.html" })
      break

    case "GET_WALLET_STATE":
      chrome.storage.local.get(
        ["walletAddress", "walletPublicKey"],
        (result) => {
          sendResponse({
            connected: !!result.walletAddress,
            address: result.walletAddress,
            publicKey: result.walletPublicKey
          })
        }
      )
      return true // Keep channel open for async response

    case "TIP_SENT":
      // Handle tip confirmation - store in history
      console.log("Tip sent:", message.data)
      storeTipInHistory(message.data)
      break

    case "GET_TIP_HISTORY":
      chrome.storage.local.get(["tipHistory"], (result) => {
        sendResponse({ history: result.tipHistory || [] })
      })
      return true
  }
})

// Store tip in history
function storeTipInHistory(tipData: {
  recipient: string
  amount: number
  username: string
  platform: string
  txId: string
}) {
  chrome.storage.local.get(["tipHistory"], (result) => {
    const history = result.tipHistory || []
    history.unshift({
      ...tipData,
      timestamp: Date.now()
    })
    // Keep only last 50 tips
    if (history.length > 50) {
      history.pop()
    }
    chrome.storage.local.set({ tipHistory: history })
  })
}

// Handle extension icon click
chrome.action.onClicked?.addListener((tab) => {
  // Default behavior is to open popup, which is handled by manifest
})

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("Tribute extension installed")

  // Set default settings
  chrome.storage.local.set({
    network: "testnet",
    defaultTipAmount: 1,
    tipHistory: []
  })
})

// Listen for storage changes to detect wallet connection
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.walletAddress) {
    // Notify all tabs about wallet connection change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              type: "WALLET_STATE_CHANGED",
              connected: !!changes.walletAddress.newValue,
              address: changes.walletAddress.newValue
            })
            .catch(() => {
              // Tab might not have content script, ignore error
            })
        }
      })
    })
  }
})

export {}
