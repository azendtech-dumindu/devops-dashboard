/**
 * Helper function for retrying API calls with exponential backoff
 * Useful for handling Azure rate limiting (429 Too Many Requests)
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const isRateLimit =
                error.message?.includes("Too many requests") ||
                error.statusCode === 429;

            if (isRateLimit && i < retries - 1) {
                // Exponential backoff: 1s, 2s, 4s
                await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Retry limit exceeded");
}

/**
 * Get Azure subscription ID from environment
 */
export function getSubscriptionId(): string {
    const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
    if (!subscriptionId) {
        throw new Error("AZURE_SUBSCRIPTION_ID environment variable is not set");
    }
    return subscriptionId;
}
