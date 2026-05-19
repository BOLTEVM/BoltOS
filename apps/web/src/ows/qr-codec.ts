/**
 * QR Codec — QR code generation, scanning payload parsing, and IPFS CID encoding
 * for the Bolt Wallet.
 *
 * Supports:
 * - Wallet address QR generation (EIP-681 compatible)
 * - Smart contract data encoding via boltxr:// URI scheme with IPFS CID
 * - Payload parsing for both address and contract QR codes
 */

// ── URI Scheme Constants ─────────────────────────────────────────

const BOLTXR_SCHEME = 'boltxr://';
const BOLTXR_CONTRACT_PREFIX = 'boltxr://contract';
const ETHEREUM_SCHEME = 'ethereum:';

// ── Types ────────────────────────────────────────────────────────

export interface QRAddressPayload {
  type: 'address';
  address: string;
  chainId?: string;
}

export interface QRContractPayload {
  type: 'contract';
  address: string;
  name: string;
  decimals: number;
  chainId: string;
  /** IPFS CID pointing to the full ABI JSON */
  abiCid: string;
  /** Optional inline ABI for small contracts (fallback if IPFS unavailable) */
  abiInline?: string;
}

export type QRPayload = QRAddressPayload | QRContractPayload;

// ── IPFS Utilities ───────────────────────────────────────────────

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

/**
 * Upload JSON data to IPFS via Pinata pinning service.
 * Requires VITE_PINATA_API_KEY env variable for authenticated uploads.
 * Falls back to a deterministic CID generation for offline/testing.
 */
export async function uploadToIPFS(data: string): Promise<string> {
  // Try Pinata with API key from environment
  const apiKey = (typeof (import.meta as any).env !== 'undefined')
    ? (import.meta as any).env.VITE_PINATA_API_KEY
    : '';

  if (apiKey) {
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          pinataContent: JSON.parse(data),
          pinataMetadata: {
            name: `boltwallet-contract-${Date.now()}`,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.IpfsHash;
      }
    } catch {
      // Fall through to local CID generation
    }
  }

  // Fallback: Generate a deterministic hash-based pseudo-CID for offline use.
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = new Uint8Array(hashBuffer);
  let hex = '';
  for (let i = 0; i < hashArray.length; i++) {
    hex += hashArray[i].toString(16).padStart(2, '0');
  }
  return `QmLocal${hex.substring(0, 40)}`;
}

/**
 * Fetch JSON content from IPFS using multiple gateway fallbacks.
 */
export async function fetchFromIPFS(cid: string): Promise<string | null> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        return await response.text();
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ── QR Code Generation (using qrcode.react in the UI layer) ─────

/**
 * Build an EIP-681 compatible address URI for QR encoding.
 */
export function buildAddressURI(
  address: string,
  options?: { eip681?: boolean; chainId?: string }
): string {
  const { eip681 = false, chainId } = options || {};
  let payload = address;
  if (eip681 && address.startsWith('0x')) {
    payload = `${ETHEREUM_SCHEME}${address}`;
    if (chainId) {
      payload += `@${chainId}`;
    }
  }
  return payload;
}

/**
 * Build a compact boltxr:// contract URI for QR encoding.
 * The ABI should be uploaded to IPFS first; the CID is embedded in the URI.
 */
export function buildContractURI(
  address: string,
  name: string,
  decimals: number,
  chainId: string,
  cid: string
): string {
  const params = new URLSearchParams({
    addr: address,
    name: name,
    dec: decimals.toString(),
    chain: chainId,
    cid: cid,
  });
  return `${BOLTXR_CONTRACT_PREFIX}?${params.toString()}`;
}

// ── QR Payload Parsing ──────────────────────────────────────────

/**
 * Parse a scanned QR code string into a typed payload.
 * Handles:
 * - boltxr://contract?... URIs
 * - ethereum:0x... EIP-681 URIs
 * - Plain hex addresses (0x...)
 * - Bitcoin addresses (bc1..., 1..., 3...)
 * - Sui addresses (0x + 64 hex chars)
 */
export function parseQRPayload(raw: string): QRPayload | null {
  const trimmed = raw.trim();

  // 1. boltxr://contract URI
  if (trimmed.startsWith(BOLTXR_CONTRACT_PREFIX)) {
    try {
      const url = new URL(trimmed.replace('boltxr://', 'https://boltxr.local/'));
      const addr = url.searchParams.get('addr');
      const name = url.searchParams.get('name');
      const dec = url.searchParams.get('dec');
      const chain = url.searchParams.get('chain');
      const cid = url.searchParams.get('cid');

      if (!addr || !name || !chain || !cid) return null;

      return {
        type: 'contract',
        address: addr,
        name: name,
        decimals: parseInt(dec || '18', 10),
        chainId: chain,
        abiCid: cid,
      };
    } catch {
      return null;
    }
  }

  // 2. EIP-681 ethereum: URI
  if (trimmed.startsWith(ETHEREUM_SCHEME)) {
    const addressPart = trimmed.replace(ETHEREUM_SCHEME, '').split(/[@?/]/)[0];
    const chainMatch = trimmed.match(/@(\d+)/);
    return {
      type: 'address',
      address: addressPart,
      chainId: chainMatch ? chainMatch[1] : undefined,
    };
  }

  // 3. Plain EVM address
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { type: 'address', address: trimmed };
  }

  // 4. Bitcoin address (bech32, P2PKH, P2SH)
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmed)) {
    return { type: 'address', address: trimmed, chainId: 'bitcoin' };
  }

  // 5. Sui address (0x + 64 hex chars)
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return { type: 'address', address: trimmed, chainId: 'sui' };
  }

  // 6. Unknown — try as generic address if it looks plausible
  if (trimmed.length >= 26 && trimmed.length <= 128 && /^[a-zA-Z0-9]+$/.test(trimmed)) {
    return { type: 'address', address: trimmed };
  }

  return null;
}
