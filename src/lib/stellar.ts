// Stellar / Freighter helpers
import {
  isConnected as fIsConnected,
  isAllowed as fIsAllowed,
  setAllowed as fSetAllowed,
  requestAccess as fRequestAccess,
  getAddress as fGetAddress,
  getNetwork as fGetNetwork,
} from "@stellar/freighter-api";

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

export async function freighterAvailable(): Promise<boolean> {
  try {
    // Poll briefly — Freighter injects asynchronously
    for (let i = 0; i < 15; i++) {
      const res = await fIsConnected();
      if (res && (res as any).isConnected) return true;
      // Even if not connected, the extension may be present
      if (res && !(res as any).error) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
  } catch {
    // ignore
  }
  return false;
}

export async function connectFreighter(): Promise<string> {
  // Ensure permission
  const allowed = await fIsAllowed();
  if (!(allowed as any)?.isAllowed) {
    await fSetAllowed();
  }
  const access = await fRequestAccess();
  if ((access as any)?.error) throw new Error((access as any).error);
  const addr = (access as any)?.address;
  if (addr) return addr;
  const got = await fGetAddress();
  if ((got as any)?.error) throw new Error((got as any).error);
  return (got as any).address;
}

export async function getFreighterNetwork(): Promise<string | null> {
  try {
    const n = await fGetNetwork();
    if ((n as any)?.error) return null;
    return (n as any)?.network ?? null;
  } catch {
    return null;
  }
}
