// Content script for Tribute extension
// Injects tipping buttons and interfaces into web pages

interface PageMetadata {
  url: string;
  title: string;
  author?: string;
  contentType?: string;
}

class TributeContentScript {
  private tributeButton: HTMLElement | null = null;
  private pageMetadata: PageMetadata;

  constructor() {
    this.pageMetadata = this.extractPageMetadata();
    this.initialize();
  }

  private initialize(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.injectTributeUI());
    } else {
      this.injectTributeUI();
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });
  }

  private extractPageMetadata(): PageMetadata {
    const metadata: PageMetadata = {
      url: window.location.href,
      title: document.title
    };

    // Try to extract author information
    const authorMeta = document.querySelector('meta[name="author"]');
    if (authorMeta) {
      metadata.author = authorMeta.getAttribute('content') || undefined;
    }

    // Try to extract content type
    const contentType = document.querySelector('meta[property="og:type"]');
    if (contentType) {
      metadata.contentType = contentType.getAttribute('content') || undefined;
    }

    return metadata;
  }

  private injectTributeUI(): void {
    // Create floating tribute button
    this.tributeButton = this.createTributeButton();
    document.body.appendChild(this.tributeButton);

    // Inject tribute buttons near content (e.g., articles, videos)
    this.injectInlineButtons();
  }

  private createTributeButton(): HTMLElement {
    const button = document.createElement('div');
    button.id = 'tribute-floating-button';
    button.className = 'tribute-button tribute-floating';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      <span>Tip with Tribute</span>
    `;

    button.addEventListener('click', () => this.openTributeModal());

    return button;
  }

  private injectInlineButtons(): void {
    // Look for common content containers
    const selectors = [
      'article',
      '.post',
      '.content',
      '[role="article"]',
      '.video-container'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        // Only inject on first few items to avoid cluttering
        if (index < 3 && element instanceof HTMLElement) {
          this.injectButtonIntoElement(element);
        }
      });
    });
  }

  private injectButtonIntoElement(element: HTMLElement): void {
    // Check if button already exists
    if (element.querySelector('.tribute-inline-button')) {
      return;
    }

    const button = document.createElement('button');
    button.className = 'tribute-inline-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
      Tip
    `;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openTributeModal(element);
    });

    // Try to insert at a good location
    const insertLocation = element.querySelector('header, .header, h1, h2');
    if (insertLocation) {
      insertLocation.parentNode?.insertBefore(button, insertLocation.nextSibling);
    } else {
      element.insertBefore(button, element.firstChild);
    }
  }

  private openTributeModal(context?: HTMLElement): void {
    // Check if modal already exists
    let modal = document.getElementById('tribute-modal');
    
    if (!modal) {
      modal = this.createTributeModal();
      document.body.appendChild(modal);
    }

    // Show modal
    modal.style.display = 'flex';

    // Extract context-specific information
    if (context) {
      const contextAuthor = context.getAttribute('data-author');
      if (contextAuthor) {
        const authorInput = modal.querySelector('#tribute-recipient') as HTMLInputElement;
        if (authorInput) {
          authorInput.value = contextAuthor;
        }
      }
    }
  }

  private createTributeModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.id = 'tribute-modal';
    modal.className = 'tribute-modal';
    modal.innerHTML = `
      <div class="tribute-modal-content">
        <div class="tribute-modal-header">
          <h2>Send Tribute</h2>
          <button class="tribute-close">&times;</button>
        </div>
        <div class="tribute-modal-body">
          <div class="tribute-field">
            <label for="tribute-recipient">Recipient Address</label>
            <input type="text" id="tribute-recipient" placeholder="SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7" />
          </div>
          <div class="tribute-field">
            <label for="tribute-amount">Amount (sats)</label>
            <input type="number" id="tribute-amount" value="10000" min="1000" />
          </div>
          <div class="tribute-field">
            <label>
              <input type="checkbox" id="tribute-split-revenue" />
              Enable Revenue Splitting
            </label>
          </div>
          <div id="tribute-split-config" style="display: none;">
            <div class="tribute-split-info">
              Configure how tips are automatically split among contributors
            </div>
            <button id="tribute-add-split" class="tribute-secondary-button">+ Add Split</button>
            <div id="tribute-splits-container"></div>
          </div>
          <div class="tribute-field">
            <label>
              <input type="checkbox" id="tribute-enable-yield" checked />
              Enable Yield Generation
            </label>
            <small>Automatically stake a portion for passive income</small>
          </div>
        </div>
        <div class="tribute-modal-footer">
          <button id="tribute-send" class="tribute-primary-button">Send Tribute</button>
          <button class="tribute-cancel-button">Cancel</button>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = modal.querySelector('.tribute-close');
    const cancelBtn = modal.querySelector('.tribute-cancel-button');
    const sendBtn = modal.querySelector('#tribute-send');
    const splitCheckbox = modal.querySelector('#tribute-split-revenue') as HTMLInputElement;
    const addSplitBtn = modal.querySelector('#tribute-add-split');

    closeBtn?.addEventListener('click', () => this.closeModal(modal));
    cancelBtn?.addEventListener('click', () => this.closeModal(modal));
    sendBtn?.addEventListener('click', () => this.sendTribute(modal));
    
    splitCheckbox?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const config = modal.querySelector('#tribute-split-config') as HTMLElement;
      config.style.display = target.checked ? 'block' : 'none';
    });

    addSplitBtn?.addEventListener('click', () => this.addSplitField(modal));

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    });

    return modal;
  }

  private addSplitField(modal: HTMLElement): void {
    const container = modal.querySelector('#tribute-splits-container');
    if (!container) return;

    const splitField = document.createElement('div');
    splitField.className = 'tribute-split-field';
    splitField.innerHTML = `
      <input type="text" placeholder="Address" class="split-address" />
      <input type="number" placeholder="%" class="split-percentage" min="1" max="100" />
      <button class="tribute-remove-split">×</button>
    `;

    const removeBtn = splitField.querySelector('.tribute-remove-split');
    removeBtn?.addEventListener('click', () => splitField.remove());

    container.appendChild(splitField);
  }

  private async sendTribute(modal: HTMLElement): Promise<void> {
    const recipientInput = modal.querySelector('#tribute-recipient') as HTMLInputElement;
    const amountInput = modal.querySelector('#tribute-amount') as HTMLInputElement;
    const splitCheckbox = modal.querySelector('#tribute-split-revenue') as HTMLInputElement;
    const yieldCheckbox = modal.querySelector('#tribute-enable-yield') as HTMLInputElement;

    const recipient = recipientInput.value.trim();
    const amount = parseInt(amountInput.value);

    if (!recipient) {
      alert('Please enter a recipient address');
      return;
    }

    if (!amount || amount < 1000) {
      alert('Please enter a valid amount (minimum 1000 sats)');
      return;
    }

    // Collect revenue splits if enabled
    let splits = undefined;
    if (splitCheckbox.checked) {
      splits = this.collectSplits(modal);
      if (!splits) {
        alert('Please configure valid revenue splits');
        return;
      }
    }

    // Send message to background script
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEND_TIP',
        data: {
          recipient,
          amount,
          splits,
          enableYield: yieldCheckbox.checked,
          metadata: this.pageMetadata
        }
      });

      if (response.error) {
        alert(`Error: ${response.error}`);
      } else {
        alert('Tribute sent successfully!');
        this.closeModal(modal);
      }
    } catch (error) {
      console.error('Error sending tribute:', error);
      alert('Failed to send tribute. Please try again.');
    }
  }

  private collectSplits(modal: HTMLElement): any[] | null {
    const splitFields = modal.querySelectorAll('.tribute-split-field');
    const splits: any[] = [];
    let totalPercentage = 0;

    splitFields.forEach(field => {
      const addressInput = field.querySelector('.split-address') as HTMLInputElement;
      const percentageInput = field.querySelector('.split-percentage') as HTMLInputElement;

      if (addressInput.value && percentageInput.value) {
        const percentage = parseFloat(percentageInput.value);
        splits.push({
          address: addressInput.value,
          percentage
        });
        totalPercentage += percentage;
      }
    });

    // Validate total percentage
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return null;
    }

    return splits.length > 0 ? splits : null;
  }

  private closeModal(modal: HTMLElement): void {
    modal.style.display = 'none';
  }

  private handleMessage(message: any, sendResponse: (response?: any) => void): void {
    // Handle messages from background script if needed
    sendResponse({ received: true });
  }
}

// Initialize content script
const tributeContent = new TributeContentScript();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TributeContentScript };
}
