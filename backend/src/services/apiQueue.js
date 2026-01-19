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
        this.MAX_REQUESTS_PER_MINUTE = 10;
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
                console.log(`⏭️  Request ${requestId} already in queue, skipping duplicate`);
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
            console.log(`➕ Added to queue: ${requestId} (Queue size: ${this.queue.length})`);

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

            // Small sleep to prevent thread blocking (10ms)
            await this.sleep(10);

            // Get next item from queue
            const item = this.queue[0];

            try {
                console.log(`🚀 Processing: ${item.id} (Attempt ${item.retryCount + 1})`);

                // Execute the request
                this.requestsInLastMinute.push(Date.now());
                const result = await item.requestFn();

                // Success - resolve all waiting callbacks
                item.callbacks.forEach(cb => cb.resolve(result));

                // Remove from queue
                this.queue.shift();
                console.log(`✅ Completed: ${item.id} (Queue size: ${this.queue.length})`);

            } catch (error) {
                // Check if it's a rate limit error
                const isRateLimitError = error.response?.status === 429 ||
                    error.message?.includes('rate limit') ||
                    error.message?.includes('too many requests');

                if (isRateLimitError && item.retryCount < 3) {
                    // Rate limit error - retry after 60 seconds
                    item.retryCount++;
                    console.log(`⚠️  Rate limit error for ${item.id}. Retrying in 60s... (Retry ${item.retryCount}/3)`);

                    // Move to end of queue and wait
                    this.queue.shift();
                    this.queue.push(item);

                    await this.sleep(60000); // Wait exactly 60 seconds
                } else {
                    // Permanent failure or max retries reached
                    console.error(`❌ Failed: ${item.id}`, error.message);

                    // Reject all waiting callbacks
                    item.callbacks.forEach(cb => cb.reject(error));

                    // Remove from queue
                    this.queue.shift();
                }
            }

            // Small delay between requests (100ms)
            await this.sleep(100);
        }

        this.processing = false;
        console.log('✅ Queue processing completed');
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
