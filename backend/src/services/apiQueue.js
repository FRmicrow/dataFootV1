/**
 * API Queue Service
 * 
 * Manages API request rate limiting and retry logic.
 * - Maximum 10 requests per minute
 * - Automatic retry after 60 seconds for rate limit errors
 * - Request deduplication
 * - Promise-based API
 */

class ApiQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.requestsInLastMinute = [];
        // API-Football Pro Limit: ~450/min. We set 440 to be safe.
        this.MAX_REQUESTS_PER_MINUTE = 440;
        this.MINUTE_MS = 60 * 1000;
    }

    /**
     * Add a request to the queue
     * @param {Function} requestFn - Async function that makes the API call
     * @param {string} requestId - Unique identifier for deduplication
     * @returns {Promise} Resolves with API response or rejects with error
     */
    async enqueue(requestFn, requestId) {
        return new Promise((resolve, reject) => {
            // Check if request already in queue
            const existing = this.queue.find(item => item.id === requestId);
            if (existing) {
                // Attach to existing promise
                existing.callbacks.push({ resolve, reject });
                return;
            }

            // Add to queue
            const queueItem = {
                id: requestId,
                requestFn,
                callbacks: [{ resolve, reject }],
                retryCount: 0,
                addedAt: Date.now()
            };

            this.queue.push(queueItem);

            // Start processing if not already running
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process the queue with rate limiting
     */
    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            // Check rate limit
            const now = Date.now();

            // Remove requests older than 1 minute from tracking
            this.requestsInLastMinute = this.requestsInLastMinute.filter(
                timestamp => now - timestamp < this.MINUTE_MS
            );

            // If we hit the limit, wait until a slot opens up
            if (this.requestsInLastMinute.length >= this.MAX_REQUESTS_PER_MINUTE) {
                const oldestRequest = this.requestsInLastMinute[0];
                const waitTime = this.MINUTE_MS - (now - oldestRequest) + 100; // +100ms buffer
                if (waitTime > 0) {
                    console.log(`⏳ Rate limit reached (${this.requestsInLastMinute.length}/min). Waiting ${waitTime}ms...`);
                    await this.sleep(waitTime);
                    continue; // Re-evaluate logic
                }
            }

            // Get next item from queue
            const item = this.queue[0];

            try {
                // Execute the request
                this.requestsInLastMinute.push(Date.now());
                const result = await item.requestFn();

                // Success - resolve all waiting callbacks
                item.callbacks.forEach(cb => cb.resolve(result));

                // Remove from queue
                this.queue.shift();

            } catch (error) {
                // Check if it's a rate limit error
                const isRateLimitError = error.response?.status === 429 ||
                    error.message?.includes('rate limit') ||
                    error.message?.includes('too many requests');

                if (isRateLimitError && item.retryCount < 3) {
                    // Rate limit error - retry after 60 seconds
                    item.retryCount++;
                    console.log(`⚠️  Rate limit error for ${item.id}. Retrying... (Retry ${item.retryCount}/3)`);

                    // Keep in queue but move to end? No, keep at front and wait.
                    // Actually, if we hit 429, we must wait.
                    await this.sleep(60000);
                } else {
                    // Permanent failure or max retries reached
                    console.error(`❌ Failed: ${item.id}`, error.message);
                    item.callbacks.forEach(cb => cb.reject(error));
                    this.queue.shift();
                }
            }

            // Minimal delay between requests to prevent immediate burst issues
            // 75ms ~= 13 requests/second max burst speed
            await this.sleep(75);
        }

        this.processing = false;
    }

    /**
     * Helper function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current queue status
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            processing: this.processing,
            requestsInLastMinute: this.requestsInLastMinute.length,
            maxRequestsPerMinute: this.MAX_REQUESTS_PER_MINUTE
        };
    }
}

// Singleton instance
const apiQueue = new ApiQueue();

export default apiQueue;
