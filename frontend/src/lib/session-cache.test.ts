import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { clearExpiredSessionCache, clearSessionCache } from "./session-cache";

describe("session cache boundaries", () => {
  it("removes every user's queries and prevents a late response from repopulating them", async () => {
    const client = new QueryClient();
    client.setQueryData(["reservations", "detail", 1], { customer: "private" });
    client.setQueryData(["reports"], { revenue: 100 });
    client.setQueryData(["auth", "current-user"], { id: 1 });
    let complete!: (data: string) => void;
    const pending = client.fetchQuery({ queryKey: ["history"], queryFn: () => new Promise<string>((resolve) => { complete = resolve; }) }).catch(() => undefined);

    await clearSessionCache(client);
    complete("private late response");
    await pending;

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it("clears private data on expiry while preserving the auth error for the boundary", async () => {
    const client = new QueryClient();
    client.setQueryData(["auth", "current-user"], { id: 1 });
    client.setQueryData(["team-access"], { private: true });
    client.setQueryData(["dashboard"], { private: true });
    await clearExpiredSessionCache(client);
    expect(client.getQueryCache().getAll().map((query) => query.queryKey)).toEqual([["auth", "current-user"]]);
  });
});
