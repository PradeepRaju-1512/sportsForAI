import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveAuctionSnapshot } from "../types/auction";

export function useAuctionSync(pollIntervalMs = 2000) {
  const [snapshot, setSnapshot] = useState<LiveAuctionSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const refreshSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/auction/live-state", { cache: "no-store" });
      if (!res.ok) {
        setError(`Auction sync returned ${res.status}`);
        return;
      }
      const data: LiveAuctionSnapshot = await res.json();
      setSnapshot(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync auction");
    }
  }, []);

  const pushOptimisticSnapshot = useCallback((next: LiveAuctionSnapshot) => {
    setSnapshot(next);
    channelRef.current?.postMessage({ type: "AUCTION_SNAPSHOT", payload: next });
  }, []);

  useEffect(() => {
    refreshSnapshot();

    // Same-browser tab instant sync + SSE cross-device sync
    const bc =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("iiitt-prothymos-auction")
        : null;
    channelRef.current = bc;
    if (bc) {
      bc.onmessage = (event) => {
        if (event.data?.type === "AUCTION_SNAPSHOT" && event.data.payload) {
          setSnapshot(event.data.payload);
        } else if (event.data?.type === "REFRESH") {
          refreshSnapshot();
        }
      };
    }

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/auction/stream");
      eventSource.onopen = () => setConnected(true);
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data) as LiveAuctionSnapshot;
          setSnapshot(parsed);
          setConnected(true);
          setError(null);
        } catch {
          refreshSnapshot();
        }
      };
      eventSource.onerror = () => {
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }

    const timer = window.setInterval(refreshSnapshot, pollIntervalMs);
    return () => {
      window.clearInterval(timer);
      eventSource?.close();
      bc?.close();
    };
  }, [pollIntervalMs, refreshSnapshot]);

  return {
    snapshot,
    connected,
    error,
    refreshSnapshot,
    pushOptimisticSnapshot,
  };
}