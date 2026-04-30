import { useCallback, useEffect, useState } from "react";
import { connectFreighter, freighterAvailable, getFreighterNetwork, shortAddr } from "@/lib/stellar";

const STORAGE_KEY = "stellapay.wallet";

export function useFreighter() {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean>(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await freighterAvailable();
      if (!mounted) return;
      setAvailable(ok);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAddress(stored);
      const n = await getFreighterNetwork();
      if (mounted) setNetwork(n);
    })();
    return () => { mounted = false; };
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const addr = await connectFreighter();
      setAddress(addr);
      localStorage.setItem(STORAGE_KEY, addr);
      const n = await getFreighterNetwork();
      setNetwork(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    address,
    short: shortAddr(address),
    network,
    available,
    connecting,
    error,
    connect,
    disconnect,
  };
}
