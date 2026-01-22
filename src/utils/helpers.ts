// Utility functions for Tribute extension

/**
 * Format a Stacks address for display
 */
export function formatAddress(address: string, start: number = 6, end: number = 4): string {
  if (!address || address.length <= start + end) {
    return address;
  }
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format satoshis to BTC
 */
export function satsToBTC(sats: number): string {
  return (sats / 100000000).toFixed(8);
}

/**
 * Format BTC to satoshis
 */
export function btcToSats(btc: number): number {
  return Math.floor(btc * 100000000);
}

/**
 * Validate Stacks address
 */
export function isValidStacksAddress(address: string): boolean {
  // Basic validation for Stacks addresses
  // Mainnet addresses start with SP, testnet with ST
  return /^(SP|ST)[0-9A-Z]{38,41}$/.test(address);
}

/**
 * Validate Bitcoin address
 */
export function isValidBitcoinAddress(address: string): boolean {
  // Basic validation for Bitcoin addresses
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Generate a unique transaction ID
 */
export function generateTxId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate revenue splits
 */
export function validateRevenueSplits(splits: Array<{ address: string; percentage: number }>): {
  valid: boolean;
  error?: string;
} {
  if (splits.length === 0) {
    return { valid: false, error: 'At least one split is required' };
  }

  if (splits.length > 10) {
    return { valid: false, error: 'Maximum 10 splits allowed' };
  }

  // Check if all addresses are valid
  for (const split of splits) {
    if (!isValidStacksAddress(split.address) && !isValidBitcoinAddress(split.address)) {
      return { valid: false, error: `Invalid address: ${split.address}` };
    }

    if (split.percentage <= 0 || split.percentage > 100) {
      return { valid: false, error: 'Percentage must be between 0 and 100' };
    }
  }

  // Check if percentages sum to 100
  const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return { valid: false, error: `Percentages must sum to 100 (currently ${totalPercentage})` };
  }

  return { valid: true };
}

/**
 * Calculate reputation score
 */
export function calculateReputationScore(
  totalSent: number,
  totalReceived: number,
  transactionCount: number
): number {
  // Score formula: sqrt(received) + (sent * 0.5) + (count * 10)
  return Math.floor(
    Math.sqrt(totalReceived) + (totalSent * 0.5) + (transactionCount * 10)
  );
}

/**
 * Parse query parameters from URL
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url);
  
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return params;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }
  
  throw lastError!;
}
