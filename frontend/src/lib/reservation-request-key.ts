// Keep only opaque hashes and retry keys, never customer fields or receipt bytes.
const attempts = new Map<string, string>();
// A changed review or payment selection must not turn an unconfirmed purchase
// into another purchase. The API still checks all payment fields and proof bytes.
const reviewFields = new Set(["expected_revision", "quoted_amount", "quoted_payment_amount", "quoted_refund_amount", "refund_settled", "payment_channel", "payment_method_id", "payment_reference_number", "payment_proof"]);

async function digest(value: BufferSource): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", value));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function canonical(value: unknown): Promise<unknown> {
  if (value instanceof FormData) {
    const entries = await Promise.all(Array.from(value.entries()).filter(([key]) => !reviewFields.has(key)).map(async ([key, item]) => [key, await canonical(item)] as const));
    return entries.sort(([left], [right]) => left.localeCompare(right));
  }
  if (Array.isArray(value)) return Promise.all(value.map(canonical));
  if (value && typeof value === "object") {
    const entries = await Promise.all(Object.entries(value).filter(([key, item]) => item !== undefined && !reviewFields.has(key)).sort(([left], [right]) => left.localeCompare(right)).map(async ([key, item]) => [key, await canonical(item)]));
    return Object.fromEntries(entries);
  }
  return value;
}

export async function reservationRequestKey(scope: string, actor: number | undefined, input: unknown) {
  const fingerprint = await digest(new TextEncoder().encode(JSON.stringify(await canonical(input))));
  const storageKey = `dinks-on-us:staff-request:${actor ?? "current"}:${scope}:${fingerprint}`;
  let key = attempts.get(storageKey);
  try { key ??= sessionStorage.getItem(storageKey) ?? undefined; } catch {}
  if (!key || !/^[A-Za-z0-9._~-]{16,100}$/.test(key)) key = crypto.randomUUID();
  attempts.set(storageKey, key);
  try { sessionStorage.setItem(storageKey, key); } catch {}
  return {
    key,
    release: () => {
      attempts.delete(storageKey);
      try { sessionStorage.removeItem(storageKey); } catch {}
    },
  };
}
