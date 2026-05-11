// Stellar / Freighter helpers
import {
  isConnected as fIsConnected,
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

export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function freighterAvailable(): Promise<boolean> {
  try {
    for (let i = 0; i < 20; i++) {
      const res: any = await fIsConnected();
      if (res && (res.isConnected === true || res.isConnected === false)) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
  } catch {
    // ignore
  }
  return false;
}

export async function connectFreighter(): Promise<string> {
  // The Freighter docs recommend calling requestAccess directly on a user
  // gesture. It triggers the consent popup and returns the address.
  const access: any = await fRequestAccess();
  if (access?.error) {
    const msg = String(access.error?.message || access.error);
    throw new Error(msg);
  }
  if (access?.address) return access.address;

  const got: any = await fGetAddress();
  if (got?.error) throw new Error(String(got.error?.message || got.error));
  if (!got?.address) throw new Error("No address returned from Freighter");
  return got.address;
}

export async function getFreighterNetwork(): Promise<string | null> {
  try {
    const n: any = await fGetNetwork();
    if (n?.error) return null;
    return n?.network ?? null;
  } catch {
    return null;
  }
}
