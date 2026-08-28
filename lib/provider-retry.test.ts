import { describe, expect, it, vi } from "vitest";
import {
  classifyProviderError,
  isRetryableProviderError,
  providerHttpStatus,
  withOneProviderRetry,
} from "./provider-retry";

describe("provider error handling", () => {
  it.each([
    [401, "authentication_failed"],
    [404, "model_unavailable"],
    [429, "rate_limited"],
    [503, "temporarily_unavailable"],
    [500, "provider_error"],
  ] as const)("classifies HTTP %s as %s", (status, category) => {
    const error = { status };
    expect(providerHttpStatus(error)).toBe(status);
    expect(classifyProviderError(error)).toBe(category);
  });

  it("retries once after a temporary provider failure", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce("ok");
    const onFailure = vi.fn();
    const sleep = vi.fn(async () => undefined);

    await expect(withOneProviderRetry(operation, onFailure, sleep)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(750);
  });

  it("stops after the single retry also fails", async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue({ status: 429 });
    const onFailure = vi.fn();

    await expect(withOneProviderRetry(operation, onFailure, async () => undefined)).rejects.toEqual({ status: 429 });
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-temporary errors", async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue({ status: 400 });

    await expect(withOneProviderRetry(operation, vi.fn(), async () => undefined)).rejects.toEqual({ status: 400 });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(isRetryableProviderError({ status: 400 })).toBe(false);
  });
});
