import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NormalizedApiError } from "@/lib/api";
import { isMutationRateLimited, mutationButtonLabel } from "@/lib/mutation-rate-limit";
import { useRateLimitedMutation } from "./use-rate-limited-mutation";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.useRealTimers();
});

function RateLimitedAction({ retryAfterSeconds, onAttempt }: { retryAfterSeconds?: number; onAttempt: () => void }) {
  const mutation = useRateLimitedMutation("rate-limit-button-test", {
    mutationFn: async () => {
      onAttempt();
      throw new NormalizedApiError({
        status: 429,
        message: "You've made several requests in a short time. Please try again shortly.",
        code: "TOO_MANY_REQUESTS",
        retryAfterSeconds,
      });
    },
  });

  return (
    <button
      type="button"
      disabled={mutation.isPending || isMutationRateLimited(mutation)}
      onClick={() => mutation.mutate()}
    >
      {mutationButtonLabel("Submitting…", "Submit reservation", mutation)}
    </button>
  );
}

function renderAction(retryAfterSeconds?: number) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onAttempt = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <RateLimitedAction retryAfterSeconds={retryAfterSeconds} onAttempt={onAttempt} />
    </QueryClientProvider>,
  );
  return onAttempt;
}

describe("useRateLimitedMutation", () => {
  it("disables the affected button and shows the server retry countdown after a 429", async () => {
    const onAttempt = renderAction(1);

    fireEvent.click(screen.getByRole("button", { name: "Submit reservation" }));

    expect(await screen.findByRole("button", { name: "Try again in 0:01" })).toBeDisabled();
    expect(onAttempt).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Try again in 0:01" }));
    expect(onAttempt).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit reservation" })).toBeEnabled();
    }, { timeout: 2_000 });
  });

  it("uses a two-minute cooldown when a 429 response has no Retry-After header", async () => {
    renderAction();

    fireEvent.click(screen.getByRole("button", { name: "Submit reservation" }));

    expect(await screen.findByRole("button", { name: "Try again in 2:00" })).toBeDisabled();
  });
});
