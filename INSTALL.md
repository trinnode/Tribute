# Tribute Extension - Installation & Testing Guide

## Quick Start for Developers

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- Chrome, Brave, or Edge browser

### Installation Steps

1. **Clone and Setup**
```bash
git clone https://github.com/trinnode/Tribute.git
cd Tribute
npm install
```

2. **Build the Extension**
```bash
npm run build
```

This will create a `dist` folder with the compiled extension.

3. **Load in Browser**

**Chrome/Brave:**
1. Open `chrome://extensions/` (or `brave://extensions/`)
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist` folder from the Tribute directory

**Edge:**
1. Open `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### Testing the Extension

1. **Test with Demo Page**
   - Open `demo.html` in your browser (or any web page)
   - You should see a floating "Tip with Tribute" button in the bottom-right corner
   - Inline tip buttons should appear near article content

2. **Test Popup**
   - Click the Tribute extension icon in your browser toolbar
   - The popup should display with wallet connection options

3. **Test Tipping Flow**
   - Click any "Tip with Tribute" button
   - A modal should appear with tipping options
   - Test the revenue splitting feature
   - Test the yield generation toggle

### Development Mode

For active development with auto-rebuild:

```bash
npm run dev
```

This watches for file changes and rebuilds automatically. After changes, reload the extension in your browser.

### Project Structure

```
dist/                  # Built extension (generated)
├── manifest.json
├── background/
├── content/
├── popup/
└── icons/

src/                   # Source code
├── background/        # Service worker
├── content/          # Content scripts
├── popup/            # Extension popup
├── contracts/        # Clarity smart contracts
├── utils/            # Utility functions
└── icons/            # Extension icons
```

### Key Features to Test

1. **Wallet Connection**
   - Connect/disconnect wallet flow
   - Address display

2. **Tipping**
   - Simple tips
   - Revenue splitting (percentages must total 100%)
   - Yield generation option

3. **Reputation**
   - View reputation scores
   - Transaction history

4. **UI/UX**
   - Responsive design
   - Button placement
   - Modal interactions

### Troubleshooting

**Extension not loading:**
- Ensure you selected the `dist` folder, not the root folder
- Check browser console for errors
- Try disabling and re-enabling the extension

**Buttons not appearing on pages:**
- Check that the extension is enabled
- Refresh the page after loading the extension
- Check the browser console for errors

**Build errors:**
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Run `npm run build` again

### Next Steps

- Connect a real Stacks wallet (Leather or Xverse)
- Deploy the Clarity contract to testnet
- Test with real sBTC transactions
- Add comprehensive test suite

### Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the CONTRIBUTING.md guide

---

**Note**: This is beta software currently configured for testnet. Always verify transaction details before confirming.
