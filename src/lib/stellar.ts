// Stellar / Freighter helpers
export const STELLAR_NETWORK = "TESTNET" as const;
export const STELLAR_CONTRACT_ID =
  "CA2CPSF57SRXTKGSS2ZBR2FQ2X64O5VMJF6JRFT4PAAN5EDPVYLPX4XN";

export function stellarExpertTx(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function stellarExpertAccount(addr: string) {
  return `https://stellar.expert/explorer/testnet/account/${addr}`;
}

export function stellarExpertContract(id: string) {
  return `https://stellar.expert/explorer/testnet/contract/${id}`;
}

export function shortAddr(addr: string | null | undefined, n = 5) {
  if (!addr) return "";
  if (addr.length <= n * 2 + 3) return addr;
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

// Freighter detection — Freighter injects window.freighterApi
declare global {
  interface Window {
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      getNetwork: () => Promise<string>;
      requestAccess?: () => Promise<{ address: string }>;
      signTransaction?: (xdr: string, opts?: { network?: string; accountToSign?: string }) => Promise<string>;
    };
  }
}

export async function freighterAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  // Freighter injects asynchronously; wait briefly
  for (let i = 0; i < 10; i++) {
    if (window.freighterApi) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return !!window.freighterApi;
}

export async function connectFreighter(): Promise<string> {
  if (!(await freighterAvailable())) {
    throw new Error("Freighter not detected. Install it from freighter.app");
  }
  const api = window.freighterApi!;
  if (api.requestAccess) {
    const { address } = await api.requestAccess();
    return address;
  }
  return await api.getPublicKey();
}

export async function getFreighterNetwork(): Promise<string | null> {
  if (!(await freighterAvailable())) return null;
  try { return await window.freighterApi!.getNetwork(); } catch { return null; }
}
