/**
 * Transaction retry utility with exponential backoff
 * Handles known Lazorkit/Solana errors that may succeed on retry
 */

// Errors that should trigger a retry
const RETRYABLE_ERRORS = [
    'Transaction too large',
    'Chunk not found',
    'blockhash not found',
    'Block height exceeded',
    'Transaction simulation failed',
];

interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: string) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    onRetry: () => { },
};

/**
 * Check if an error message indicates a retryable condition
 */
export function isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
            ? error
            : JSON.stringify(error);

    return RETRYABLE_ERRORS.some(retryable =>
        errorMessage.toLowerCase().includes(retryable.toLowerCase())
    );
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, initialDelay: number, maxDelay: number): number {
    // Exponential backoff: initialDelay * 2^attempt
    const exponentialDelay = initialDelay * Math.pow(2, attempt);
    // Add jitter (±20%)
    const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
    // Cap at maxDelay
    return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Execute a function with retry logic and exponential backoff
 * Only retries on specific recoverable errors
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if this error is retryable
            if (!isRetryableError(error)) {
                console.log('[Retry] Non-retryable error, throwing immediately:', error);
                throw error;
            }

            // Check if we have attempts left
            if (attempt >= opts.maxAttempts - 1) {
                console.log('[Retry] Max attempts reached, throwing last error');
                throw error;
            }

            // Calculate backoff delay
            const delay = calculateDelay(attempt, opts.initialDelayMs, opts.maxDelayMs);

            console.log(`[Retry] Attempt ${attempt + 1}/${opts.maxAttempts} failed:`, error);
            console.log(`[Retry] Retrying in ${Math.round(delay)}ms...`);

            // Notify caller
            const errorMessage = error instanceof Error ? error.message : String(error);
            opts.onRetry(attempt + 1, errorMessage);

            // Wait before retry
            await sleep(delay);
        }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError;
}

/**
 * Wrap a transaction function with automatic retry logic
 * Shows user-friendly messages during retries
 */
export function createRetryableTransaction<T>(
    transactionFn: () => Promise<T>,
    setStatus?: (status: string) => void
): Promise<T> {
    return withRetry(transactionFn, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        onRetry: (attempt, error) => {
            if (setStatus) {
                setStatus(`Retry ${attempt}/3: ${error.substring(0, 30)}...`);
            }
        },
    });
}
