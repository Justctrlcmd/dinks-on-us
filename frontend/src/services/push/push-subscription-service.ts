import { authFetch } from "@/lib/api";

export function savePushSubscription(subscription: PushSubscription) {
  const serialized = subscription.toJSON();
  return authFetch<null>("/api/v1/management/push-subscriptions", {
    method: "POST",
    csrf: true,
    body: JSON.stringify({
      endpoint: serialized.endpoint,
      keys: serialized.keys,
      content_encoding: "aes128gcm",
      expiration_time: serialized.expirationTime,
    }),
  });
}

export function removePushSubscription(endpoint: string) {
  return authFetch<null>("/api/v1/management/push-subscriptions", {
    method: "DELETE",
    csrf: true,
    body: JSON.stringify({ endpoint }),
  });
}
