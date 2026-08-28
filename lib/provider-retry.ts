export type ProviderErrorCategory =
  | "authentication_failed"
  | "invalid_request"
  | "model_unavailable"
  | "rate_limited"
  | "temporarily_unavailable"
  | "provider_error";

type ErrorWithStatus = { status?: unknown; code?: unknown };

export function providerHttpStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const { status, code } = error as ErrorWithStatus;
  if (typeof status === "number") return status;
  if (typeof code === "number") return code;
  return null;
}

export function classifyProviderError(error: unknown): ProviderErrorCategory {
  const status = providerHttpStatus(error);
  if (status === 401 || status === 403) return "authentication_failed";
  if (status === 400 || status === 422) return "invalid_request";
  if (status === 404) return "model_unavailable";
  if (status === 429) return "rate_limited";
  if (status === 503) return "temporarily_unavailable";
  return "provider_error";
}

export function isRetryableProviderError(error: unknown): boolean {
  const status = providerHttpStatus(error);
  return status === 429 || status === 503;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function withOneProviderRetry<T>(
  operation: () => Promise<T>,
  onFailure: (error: unknown) => void,
  sleep: (milliseconds: number) => Promise<void> = wait,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    onFailure(error);
    if (!isRetryableProviderError(error)) throw error;
  }

  await sleep(750);

  try {
    return await operation();
  } catch (error) {
    onFailure(error);
    throw error;
  }
}
