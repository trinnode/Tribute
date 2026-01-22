import "~style.css"

function IndexPopup() {
  const openDashboard = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("tabs/index.html")
    })
    window.close()
  }

  return (
    <div className="w-72 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="text-center">
        <img
          src={chrome.runtime.getURL("assets/icon.png")}
          alt="Tribute"
          className="w-16 h-16 rounded-xl mx-auto mb-4"
        />
        <h1 className="text-xl font-bold mb-1">Tribute</h1>
        <p className="text-sm text-slate-400 mb-6">
          Bitcoin Tipping for Creators
        </p>
        <button
          onClick={openDashboard}
          className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 rounded-lg font-semibold transition-colors mb-3">
          Open Dashboard
        </button>
        <p className="text-xs text-slate-500">
          Click above to connect wallet and manage your account
        </p>
        <div className="border-t border-slate-700 my-4"></div>
        <div className="text-left space-y-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>✓</span>
            <span>Tip creators on Twitter, YouTube, GitHub</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>✓</span>
            <span>Earn Proof of Patronage badges</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>✓</span>
            <span>Powered by Bitcoin via Stacks</span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>v0.1.0</span>
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
              Testnet
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
