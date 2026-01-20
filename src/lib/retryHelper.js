/**
 * Retry helper for API calls with exponential backoff
 */

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.factor - Exponential backoff factor (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if error should trigger retry
 * @returns {Promise} Result of successful function call
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    shouldRetry = (error) => {
      // Default: retry on network errors and 5xx status codes
      if (!error.status) return true; // Network error
      return error.status >= 500 && error.status < 600;
    }
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Log retry attempt
      console.warn(`[RetryHelper] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
        error: error.message,
        status: error.status
      });

      // Wait before retrying
      await sleep(delay);

      // Exponential backoff with max delay cap
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  // All retries exhausted
  console.error('[RetryHelper] All retry attempts exhausted', {
    maxRetries,
    lastError: lastError?.message
  });
  throw lastError;
}

/**
 * Retry specifically for AI API calls
 * @param {Function} fn - Async function to retry
 * @param {string} provider - AI provider name for logging
 * @returns {Promise} Result of successful API call
 */
export async function retryAICall(fn, provider = 'AI') {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    factor: 2,
    shouldRetry: (error) => {
      // Retry on rate limits (429) and server errors (5xx)
      if (!error.status) return true; // Network error
      if (error.status === 429) return true; // Rate limit
      if (error.status >= 500 && error.status < 600) return true; // Server error
      
      // Don't retry on client errors (4xx except 429)
      if (error.status >= 400 && error.status < 500) {
        console.warn(`[${provider}] Client error, not retrying:`, error.message);
        return false;
      }
      
      return false;
    }
  });
}

/**
 * Create a rate-limited function
 * @param {Function} fn - Function to rate limit
 * @param {number} minInterval - Minimum time between calls in ms
 * @returns {Function} Rate-limited function
 */
export function rateLimit(fn, minInterval = 1000) {
  let lastCallTime = 0;
  let pending = null;

  return async (...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall < minInterval) {
      // Wait for remaining time
      const waitTime = minInterval - timeSinceLastCall;
      await sleep(waitTime);
    }

    // If there's already a pending call, wait for it
    if (pending) {
      await pending;
    }

    lastCallTime = Date.now();
    pending = fn(...args);
    
    try {
      const result = await pending;
      pending = null;
      return result;
    } catch (error) {
      pending = null;
      throw error;
    }
  };
}
