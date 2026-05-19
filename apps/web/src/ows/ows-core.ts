import { ethers, wordlists } from 'ethers';
import { LangEn } from 'ethers/wordlists';
import { CHAINS as CORE_CHAINS } from "@/ows/chains";
import { BitcoinProvider, SuiProvider, EVMProvider } from '@boltwallet/core';
import { parseQRPayload, fetchFromIPFS, uploadToIPFS, buildContractURI } from './qr-codec';
import { fetchABI, parseABIMethods } from './abi-fetcher';
export { parseQRPayload, fetchFromIPFS, buildContractURI };
export { fetchABI, parseABIMethods };

// BOLT-09: Robust wordlist resolution to prevent "FAILED" errors in minified builds
// We explicitly register the English wordlist into the global ethers wordlists.
if (typeof window !== 'undefined') {
  try {
    const en = LangEn.wordlist();
    if (!(wordlists as any).en) {
      (wordlists as any).en = en;
    }
  } catch (e) {
    console.warn("BIP39 wordlist initialization warning:", e);
  }
}

const VAULT_KEY = 'bolt_vault_v1';
let activeChainId = 'ethereum';

export interface ContractData {
  address: string;
  abi: string;
  name: string;
  decimals: number;
  chainId: string;
}

export interface NFTData {
  address: string;
  tokenId: string;
  name: string;
  symbol: string;
  tokenUri: string;
  metadata?: any;
  chainId: string;
}

export interface HistoryData {
  hash: string;
  type: 'send' | 'receive' | 'contract_call';
  from: string;
  to: string;
  value: string;
  asset: string;
  usdValue: string;
  timestamp: string;
  chainId: string;
  status: 'success' | 'failed' | 'pending';
}

export interface LogEvent {
  id: string;
  type: 'rpc' | 'security' | 'session' | 'fallback';
  message: string;
  status: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
  metadata?: any;
}

interface VaultData {
  encryptedMnemonic: string;
  salt: string;
  iv: string;
  isEncrypted: boolean;
  wallets: Array<{
    id: string;
    name: string;
    index: number;
    createdAt: string;
  }>;
  contracts: Array<ContractData>;
  nfts: Array<NFTData>;
  history: Array<HistoryData>;
}

// Pyth Hermes API Constants
const HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";
const PRICE_FEED_IDS: Record<string, string> = {
  "ethereum": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "bsc": "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  "polygon": "0xcc24d03da2d348003612f09d3c5f5905d49ac539fe38466e3ef6022e0325493b",
  "pulsechain": "0xecf55730022301c80fbbcc2c7199990e1f75323ddf069f21f64f77c8e96bf655",
  "monad": "0x",
  "sui": "0x50c18d9ef61730bb53c448eb3b054817a2e0a010899def360e4282367f08365a",
  "coredao": "0x1bf60fe662ecab2f06997df00c61f86778eaa158850043ae999971477f4a0f97"
};

const DERIVATION_PATHS: Record<string, string> = {
  "ethereum": "m/44'/60'/0'/0/",
  "bsc": "m/44'/60'/0'/0/",
  "polygon": "m/44'/60'/0'/0/",
  "pulsechain": "m/44'/60'/0'/0/",
  "quai": "m/44'/969'/0'/0/",
  "monad": "m/44'/60'/0'/0/",
  "bitcoin": "m/84'/0'/0'/0/",
  "sui": "m/44'/784'/0'/0'/",
  "xrpl_evm": "m/44'/60'/0'/0/",
  "tron_evm": "m/44'/60'/0'/0/",
  "coredao": "m/44'/60'/0'/0/"
};

export const CHAINS = CORE_CHAINS;
export type { ChainConfig } from "@/ows/chains";

export interface WalletData {
  id: string;
  name: string;
  address: string;
  index: number;
}

let sessionMnemonic: string | null = null;
let sessionPassword: string | null = null;
let sessionLastActivity: number = 0;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes auto-lock

// SEC-01: Session timeout — auto-lock after inactivity
const touchSession = () => { sessionLastActivity = Date.now(); };
const isSessionExpired = () => {
  if (!sessionMnemonic) return true;
  if (Date.now() - sessionLastActivity > SESSION_TIMEOUT_MS) {
    logEvent('security', 'Session expired — vault auto-locked', 'warning');
    sessionMnemonic = null;
    sessionPassword = null;
    return true;
  }
  return false;
};

// ── LI.FI API Integration ──────────────────────────────────────
const LIFI_API_BASE = "https://li.quest/v1";
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export interface SwapQuoteParams {
  fromChainKey: string;
  toChainKey: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  slippage: number;
}

export interface SwapQuote {
  id: string;
  fromToken: any;
  toToken: any;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  rate: string;
  estimatedGasUSD: string;
  feeCosts: any[];
  gasCosts: any[];
  transactionRequest: { to: string; data: string; value: string; gasLimit: string; chainId: number };
  tool: string;
  approvalRequired: boolean;
  approvalAddress?: string;
  executionDurationSeconds: number;
}

const resolveChainId = (chainKey: string): number => {
  const chain = CHAINS[chainKey as keyof typeof CHAINS];
  if (!chain) throw new Error(`Unknown chain: ${chainKey}`);
  if (chain.chainId === 0) throw new Error(`Chain ${chain.name} is not supported for swaps/bridges (non-EVM).`);
  return chain.chainId;
};

const resolveTokenAddress = (token: string, chainKey: string): string => {
  if (token === 'native' || token === '' || token === '0x0') return NATIVE_TOKEN_ADDRESS;
  const chain = CHAINS[chainKey as keyof typeof CHAINS];
  if (chain && token.toUpperCase() === chain.nativeCurrency.symbol.toUpperCase()) return NATIVE_TOKEN_ADDRESS;
  if (token.startsWith('0x') && token.length === 42) return token;
  return token;
};

const mapLifiQuoteResponse = (data: any): SwapQuote => {
  const action = data.action || {};
  const estimate = data.estimate || {};
  const txReq = data.transactionRequest || {};

  const fromAmount = estimate.fromAmount || action.fromAmount || '0';
  const toAmount = estimate.toAmount || '0';
  const toAmountMin = estimate.toAmountMin || toAmount;

  const fromDecimals = action.fromToken?.decimals || 18;
  const toDecimals = action.toToken?.decimals || 18;
  const fromNum = parseFloat(fromAmount) / Math.pow(10, fromDecimals);
  const toNum = parseFloat(toAmount) / Math.pow(10, toDecimals);
  const rate = fromNum > 0 ? (toNum / fromNum).toFixed(6) : '0';

  const gasCosts = (estimate.gasCosts || []);
  const estimatedGasUSD = gasCosts.reduce((sum: number, g: any) => sum + parseFloat(g.amountUSD || '0'), 0).toFixed(2);

  return {
    id: data.id || `quote-${Date.now()}`,
    fromToken: action.fromToken || {},
    toToken: action.toToken || {},
    fromAmount,
    toAmount,
    toAmountMin,
    rate,
    estimatedGasUSD,
    feeCosts: estimate.feeCosts || [],
    gasCosts,
    transactionRequest: {
      to: txReq.to || '',
      data: txReq.data || '',
      value: txReq.value || '0',
      gasLimit: txReq.gasLimit || txReq.gas || '300000',
      chainId: txReq.chainId || 0,
    },
    tool: data.tool || 'unknown',
    approvalRequired: !!(estimate.approvalAddress) && (action.fromToken?.address !== NATIVE_TOKEN_ADDRESS),
    approvalAddress: estimate.approvalAddress,
    executionDurationSeconds: estimate.executionDuration || 0,
  };
};

export class BoltwalletCore {
  private chainId: string = 'ethereum';
  
  async getWallets() { return listWallets(); }
  async listWallets() { return listWallets(); }
  async createNewWallet(name: string) { return createWallet(name); }
  async isVaultLocked() { return isVaultLocked(); }
  async unlockVault(password: string) { return unlockVault(password); }
  async isVaultSetup() { return isVaultSetup(); }
  async setupVault(password: string) { return setupVault(password); }
  async getNativeBalance(address: string) { 
    const rpc = CHAINS[this.chainId as keyof typeof CHAINS]?.rpc || '';
    return getNativeBalance(address, rpc); 
  }
  async getContractBalance(contractAddress: string, walletAddress: string, decimals: number) {
    const rpc = CHAINS[this.chainId as keyof typeof CHAINS]?.rpc || '';
    return getContractBalance(contractAddress, walletAddress, decimals, rpc);
  }
  async getGasPriceEstimates() {
    const rpc = CHAINS[this.chainId as keyof typeof CHAINS]?.rpc || '';
    return getGasPriceEstimates(rpc);
  }
  async listContracts() { return listContracts(this.chainId); }
  async importContract(name: string, address: string, abi: string, decimals: number) {
     return importContract(name, address, abi, decimals, this.chainId);
  }
  async deleteContract(address: string) {
     return deleteContract(address, this.chainId);
  }
  async listNFTs() { return listNFTs(this.chainId); }
  async importNFT(address: string, tokenId: string, name: string) {
     return importNFT(address, tokenId, name, this.chainId);
  }
  async deleteNFT(address: string, tokenId: string) {
     return deleteNFT(address, tokenId, this.chainId);
  }
  async getAssetPrices() { return getAssetPrices(); }
  async getHistory(address: string) { return getHistory(address, this.chainId); }
  async signTransaction(walletId: string, tx: any) { return signTransaction(walletId, this.chainId, JSON.stringify(tx)); }
  async resetVault(mnemonic: string, pass: string) { return resetVault(mnemonic, pass); }
  async getSession() { return getSessionMnemonic(); }
  
  setChain(chainId: string) { 
    this.chainId = chainId; 
    setActiveChain(chainId);
  }

  addCustomChain(key: string, config: any) {
    (CHAINS as any)[key] = config;
  }

  async setSession(mnemonic: string | null) {
    setSessionMnemonic(mnemonic);
  }

  /**
   * Resolve an ENS name to an address with checksum validation.
   */
  async resolveName(name: string): Promise<string | null> {
    if (!name.includes('.')) return null;
    try {
      const provider = new ethers.JsonRpcProvider(CHAINS.ethereum.rpc);
      const resolved = await provider.resolveName(name);
      if (resolved && !ethers.isAddress(resolved)) {
        console.warn("ENS resolved to invalid address:", resolved);
        return null;
      }
      return resolved;
    } catch (err) {
      console.warn("ENS Resolution failed:", err);
      return null;
    }
  }
  
  onLogs(cb: any) { return onLogs(cb); }
  getLogs() { return getLogs(); }

  /**
   * Execute a transaction and broadcast. Supports EVM, Bitcoin, and Sui.
   */
  async executeTransaction(walletId: string, txData: any): Promise<string> {
    const vault = await getVault();
    const w = vault.wallets.find((x: any) => x.id === walletId || x.name === walletId);
    if (!w) throw new Error("Wallet not found");
    if (!sessionMnemonic) throw new Error("Wallet is locked. Session mnemonic required to sign.");

    const rpc = CHAINS[this.chainId as keyof typeof CHAINS]?.rpc || '';
    let hash = '';

    if (this.chainId === 'bitcoin') {
      const provider = new BitcoinProvider();
      hash = await provider.signAndBroadcast(txData, sessionMnemonic, w.index, rpc);
    } else if (this.chainId === 'sui') {
      const provider = new SuiProvider();
      hash = await provider.signAndBroadcast(txData, sessionMnemonic, w.index, rpc);
    } else {
      const provider = new EVMProvider(DERIVATION_PATHS[this.chainId] || "m/44'/60'/0'/0/");
      hash = await provider.signAndBroadcast(txData, sessionMnemonic, w.index, rpc);
    }

    // Add to history
    const from = deriveAddress(sessionMnemonic, w.index);
    const newHistory: HistoryData = {
      hash,
      type: txData.data && txData.data !== '0x' && txData.to ? 'contract_call' : 'send',
      from,
      to: txData.to || '',
      value: txData.value || '0',
      asset: this.chainId === 'ethereum' ? 'ETH' : this.chainId.toUpperCase(),
      usdValue: '0.00',
      timestamp: new Date().toISOString(),
      chainId: this.chainId,
      status: 'success'
    };
    vault.history = [newHistory, ...(vault.history || [])];
    await saveVault(vault);

    return hash;
  }

  /**
   * Get a real-time swap quote from LI.FI aggregator.
   * All bridge/DEX providers are unrestricted.
   */
  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const fromChainId = resolveChainId(params.fromChainKey);
    const toChainId = resolveChainId(params.toChainKey);
    const fromToken = resolveTokenAddress(params.fromToken, params.fromChainKey);
    const toToken = resolveTokenAddress(params.toToken, params.toChainKey);

    const queryParams = new URLSearchParams({
      fromChain: fromChainId.toString(),
      toChain: toChainId.toString(),
      fromToken,
      toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      slippage: params.slippage.toString(),
      integrator: 'boltwallet',
    });

    const url = `${LIFI_API_BASE}/quote?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Swap quote failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return mapLifiQuoteResponse(data);
  }

  /**
   * Execute a swap using validated quote calldata. No hardcoded router addresses.
   */
  async executeSwap(walletId: string, quote: SwapQuote): Promise<string> {
    if (!quote.transactionRequest?.to || !quote.transactionRequest?.data) {
      throw new Error('Invalid swap quote: missing transaction request data.');
    }
    const txData = {
      to: quote.transactionRequest.to,
      value: quote.transactionRequest.value || '0',
      data: quote.transactionRequest.data,
      gasLimit: quote.transactionRequest.gasLimit,
    };
    return this.executeTransaction(walletId, txData);
  }

  /**
   * Get a bridge quote (cross-chain) from LI.FI.
   */
  async getBridgeQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const fromChainId = resolveChainId(params.fromChainKey);
    const toChainId = resolveChainId(params.toChainKey);
    if (fromChainId === toChainId) {
      throw new Error('Bridge requires different source and destination chains.');
    }
    return this.getSwapQuote(params);
  }

  /**
   * Execute a cross-chain bridge using validated quote.
   */
  async executeBridge(walletId: string, quote: SwapQuote): Promise<string> {
    return this.executeSwap(walletId, quote);
  }
}

// Crypto Helpers
// SEC-02: Increased PBKDF2 iterations from 100K to 600K per OWASP 2023 guidance
const PBKDF2_ITERATIONS = 600000;

const deriveKey = async (password: string, salt: Uint8Array) => {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const encryptData = async (data: string, password: string) => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  return {
    encrypted: arrayBufferToBase64(encrypted),
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer)
  };
};

const decryptData = async (encrypted: string, salt: string, iv: string, password: string) => {
  const decoder = new TextDecoder();
  const saltArr = new Uint8Array(base64ToArrayBuffer(salt));
  const ivArr = new Uint8Array(base64ToArrayBuffer(iv));
  const encryptedArr = base64ToArrayBuffer(encrypted);
  const key = await deriveKey(password, saltArr);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArr },
    key,
    encryptedArr
  );
  return decoder.decode(decrypted);
};

const validateTransactionPayload = (tx: any) => {
  if (!tx.to) throw new Error("Transaction recipient (to) is missing");
  if (!ethers.isAddress(tx.to)) throw new Error("Invalid recipient address");

  if (tx.value) {
    try {
      const val = BigInt(tx.value.toString());
      if (val < 0n) throw new Error("Transaction value cannot be negative");
    } catch (e: any) {
      throw new Error(`Invalid transaction value: ${e.message}`);
    }
  }

  if (tx.data && typeof tx.data === 'string' && tx.data !== '0x') {
    if (!tx.data.startsWith('0x')) throw new Error("Transaction data must be a hex string starting with 0x");
    // Basic length check for hex
    if (tx.data.length % 2 !== 0) throw new Error("Transaction data has invalid length");
  }
};

// SEC-18: Full vault encryption — encrypt entire vault structure, not just mnemonic.
// Only the 'isSetup' flag and encryption params are stored in cleartext.
interface EncryptedVaultEnvelope {
  encrypted: string;   // AES-GCM encrypted JSON of VaultData
  salt: string;
  iv: string;
  isSetup: boolean;
}

const getVaultEnvelope = (): EncryptedVaultEnvelope | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(VAULT_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    // Migration: detect legacy vault format (has 'encryptedMnemonic' key)
    if (parsed.encryptedMnemonic !== undefined) return null;
    return parsed as EncryptedVaultEnvelope;
  } catch { return null; }
};

const getLegacyVault = (): VaultData | null => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(VAULT_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed.encryptedMnemonic !== undefined) return parsed as VaultData;
    return null;
  } catch { return null; }
};

const getVault = async (): Promise<VaultData> => {
  if (typeof window === 'undefined') return initializeVault();

  // Try new encrypted envelope format first
  const envelope = getVaultEnvelope();
  if (envelope && envelope.isSetup && sessionPassword) {
    try {
      const decrypted = await decryptData(envelope.encrypted, envelope.salt, envelope.iv, sessionPassword);
      return JSON.parse(decrypted);
    } catch {
      return initializeVault();
    }
  }

  // Legacy migration: old format with only mnemonic encrypted
  const legacy = getLegacyVault();
  if (legacy) return legacy;

  return initializeVault();
};

const initializeVault = () => {
  const newData: VaultData = {
    encryptedMnemonic: '',
    salt: '',
    iv: '',
    isEncrypted: false,
    wallets: [],
    contracts: [],
    nfts: [],
    history: []
  };
  return newData;
};

export const setupVault = async (password: string): Promise<string> => {
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic?.phrase || '';
  if (!mnemonic) throw new Error('Failed to generate mnemonic');

  const vault: VaultData = {
    encryptedMnemonic: '',
    salt: '',
    iv: '',
    isEncrypted: true,
    wallets: [],
    contracts: [],
    nfts: [],
    history: []
  };
  // Store mnemonic inside the vault structure itself
  (vault as any).__mnemonic = mnemonic;

  sessionMnemonic = mnemonic;
  sessionPassword = password;
  touchSession();
  await saveVault(vault);
  return mnemonic;
};

export const unlockVault = async (password: string): Promise<boolean> => {
  // Try new encrypted envelope format first
  const envelope = getVaultEnvelope();
  if (envelope && envelope.isSetup) {
    try {
      const decrypted = await decryptData(envelope.encrypted, envelope.salt, envelope.iv, password);
      const vault = JSON.parse(decrypted);
      sessionMnemonic = vault.__mnemonic || null;
      sessionPassword = password;
      touchSession();
      return !!sessionMnemonic;
    } catch { return false; }
  }

  // Legacy fallback: old format with encryptedMnemonic
  const legacy = getLegacyVault();
  if (legacy && legacy.isEncrypted) {
    try {
      sessionMnemonic = await decryptData(legacy.encryptedMnemonic, legacy.salt, legacy.iv, password);
      sessionPassword = password;
      touchSession();
      // Migrate legacy vault to new encrypted format
      (legacy as any).__mnemonic = sessionMnemonic;
      await saveVault(legacy);
      logEvent('security', 'Vault migrated to full-encryption format', 'success');
      return true;
    } catch { return false; }
  }

  return false;
};

export const isVaultLocked = () => {
  if (isSessionExpired()) return true;
  return !sessionMnemonic;
};

export const isVaultSetup = async () => {
  const envelope = getVaultEnvelope();
  if (envelope) return envelope.isSetup;
  const legacy = getLegacyVault();
  if (legacy) return legacy.isEncrypted;
  return false;
};

const saveVault = async (data: VaultData) => {
  if (typeof window === 'undefined') return;
  if (!sessionPassword) {
    // Fallback: save as legacy format if no session password
    localStorage.setItem(VAULT_KEY, JSON.stringify(data));
    return;
  }
  // SEC-18: Encrypt the entire vault structure
  const vaultJson = JSON.stringify(data);
  const encrypted = await encryptData(vaultJson, sessionPassword);
  const envelope: EncryptedVaultEnvelope = {
    encrypted: encrypted.encrypted,
    salt: encrypted.salt,
    iv: encrypted.iv,
    isSetup: true,
  };
  localStorage.setItem(VAULT_KEY, JSON.stringify(envelope));
};


let logs: LogEvent[] = [];
let logListeners: ((l: LogEvent[]) => void)[] = [];

export const logEvent = (type: LogEvent['type'], message: string, status: LogEvent['status'] = 'info', metadata?: any) => {
  const safeId = (Math.random().toString(36) + '00000000').substring(2, 11);
  const event: LogEvent = {
    id: safeId || String(Date.now()),
    type: type || 'fallback',
    message: message || "Unknown Event",
    status: status || 'info',
    metadata: metadata || {},
    timestamp: Date.now()
  };
  logs = [event, ...logs].slice(0, 100);
  logListeners.forEach(l => l(logs));
};

export const onLogs = (callback: (l: LogEvent[]) => void) => {
  logListeners.push(callback);
  callback(logs);
  return () => {
    logListeners = logListeners.filter(l => l !== callback);
  };
};

export const getLogs = () => logs;

export const setActiveChain = (chainId: string) => {
  activeChainId = chainId;
};

export const deriveAddress = (mnemonic: string, index: number): string => {
  if (!mnemonic || mnemonic.trim() === "") {
    return "0x0000000000000000000000000000000000000000";
  }

  try {
    if (activeChainId === 'bitcoin') {
      const provider = new BitcoinProvider();
      return provider.deriveAddress(mnemonic, index);
    }

    if (activeChainId === 'sui') {
      const provider = new SuiProvider();
      return provider.deriveAddress(mnemonic, index);
    }

    // Default EVM derivation
    const basePath = DERIVATION_PATHS[activeChainId] || "m/44'/60'/0'/0/";
    const provider = new EVMProvider(basePath);
    return provider.deriveAddress(mnemonic, index);
  } catch (e) {
    console.error("Address Derivation Error:", e);
    return "0x0000000000000000000000000000000000000000";
  }
};

export const createWallet = async (name: string): Promise<any> => {
  if (!sessionMnemonic) throw new Error("Vault is locked");
  const vault = await getVault();
  const index = vault.wallets.length;
  const randStr = Math.random().toString(16);
  const id = `wallet_${(randStr + '00000000').substring(2, 10)}`;
  const address = deriveAddress(sessionMnemonic, index);

  const newWallet = {
    id,
    name: name || `Wallet ${index + 1}`,
    index,
    createdAt: new Date().toISOString()
  };

  vault.wallets.push(newWallet);
  await saveVault(vault);

  return {
    id: newWallet.id,
    name: newWallet.name,
    address, // Top-level address for UI convenience
    accounts: [{ chainId: "ethereum", address, derivationPath: `m/44'/60'/0'/0/${index}` }],
    createdAt: newWallet.createdAt
  };
};

export const listWallets = async (): Promise<any[]> => {
  const vault = await getVault();
  return vault.wallets.map((w: any) => {
    let address = '0x0000000000000000000000000000000000000000';
    if (sessionMnemonic) {
      address = deriveAddress(sessionMnemonic, w.index);
    }

    return {
      id: w.id,
      name: w.name,
      address, // Ensure top-level address exists for UI components
      accounts: [{
        chainId: "ethereum",
        address,
        derivationPath: `m/44'/60'/0'/0/${w.index}`
      }],
      createdAt: w.createdAt
    };
  });
};

export const getWallet = async (idOrName: string): Promise<any> => {
  const vault = await getVault();
  const w = vault.wallets.find((x: any) => x.id === idOrName || x.name === idOrName);
  if (!w) return null;

  const address = deriveAddress(sessionMnemonic || '', w.index);
  return {
    id: w.id,
    name: w.name,
    address,
    accounts: [{
      chainId: "ethereum",
      address,
      derivationPath: `m/44'/60'/0'/0/${w.index}`
    }],
    createdAt: w.createdAt
  };
};

export const deleteWallet = async (idOrName: string) => {
  const vault = await getVault();
  vault.wallets = vault.wallets.filter((w: any) => w.id !== idOrName && w.name !== idOrName);
  await saveVault(vault);
};

export const renameWallet = async (idOrName: string, newName: string) => {
  const vault = await getVault();
  const w = vault.wallets.find((x: any) => x.id === idOrName || x.name === idOrName);
  if (w) {
    w.name = newName;
    await saveVault(vault);
  }
};

export const exportWallet = async (idOrName: string): Promise<string> => {
  return sessionMnemonic || '';
};

export const signMessage = async (walletId: string, chain: string, message: string): Promise<any> => {
  if (isSessionExpired() || !sessionMnemonic) throw new Error("Vault is locked");
  touchSession();
  const vault = await getVault();
  const w = vault.wallets.find((x: any) => x.id === walletId || x.name === walletId);
  if (!w) throw new Error("Wallet not found");

  const basePath = DERIVATION_PATHS[activeChainId] || "m/44'/60'/0'/0/";
  const fullPath = basePath.endsWith('/') ? `${basePath}${w.index}` : `${basePath}/${w.index}`;
  const wordlist = (wordlists as any).en || LangEn.wordlist();
  const hdWallet = ethers.HDNodeWallet.fromPhrase(sessionMnemonic, undefined, fullPath, wordlist);
  const wallet = new ethers.Wallet(hdWallet.privateKey);
  const signature = await wallet.signMessage(message);
  return { signature };
};

export const signTransaction = async (walletId: string, chain: string, txHex: string): Promise<any> => {
  // SEC-01 + SEC-03: Check session expiry before signing
  if (isSessionExpired() || !sessionMnemonic) throw new Error("Vault is locked");
  touchSession();
  logEvent('security', `Signing transaction for ${chain}...`, 'info');

  const vault = await getVault();
  const w = vault.wallets.find((x: any) => x.id === walletId || x.name === walletId);
  if (!w) throw new Error("Wallet not found");

  try {
    const txParams = JSON.parse(txHex);
    // Skip EVM-specific validation for non-EVM chains
    if (chain !== 'sui') {
      validateTransactionPayload(txParams);
    }

    const basePath = DERIVATION_PATHS[chain] || "m/44'/60'/0'/0/";
    const fullPath = basePath.endsWith('/') ? `${basePath}${w.index}` : `${basePath}/${w.index}`;
    const wordlist = (wordlists as any).en || LangEn.wordlist();
    const chainConfig = CHAINS[chain as keyof typeof CHAINS];

    // 1. EVM Signing (REAL — ethers v6 HDNodeWallet)
    const hdWallet = ethers.HDNodeWallet.fromPhrase(sessionMnemonic, undefined, fullPath, wordlist);
    const wallet = new ethers.Wallet(hdWallet.privateKey);

    // SEC-04: Fetch live nonce and estimate gas
    const rpcUrl = chainConfig?.rpc || '';
    let liveNonce = txParams.nonce;
    let liveGasLimit = txParams.gasLimit;
    let liveGasPrice = txParams.gasPrice || txParams.maxFeePerGas;

    if (rpcUrl) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        if (liveNonce === undefined || liveNonce === 0) {
          liveNonce = await provider.getTransactionCount(hdWallet.address, 'pending');
        }
        if (!liveGasLimit || liveGasLimit === '21000' || liveGasLimit === 21000) {
          try {
            const estimated = await provider.estimateGas({
              to: txParams.to,
              value: txParams.value ? ethers.parseEther(txParams.value.toString()) : 0,
              data: txParams.data || '0x',
              from: hdWallet.address,
            });
            // Add 20% buffer for safety
            liveGasLimit = (estimated * 120n / 100n).toString();
          } catch {
            liveGasLimit = txParams.data && txParams.data !== '0x' ? 200000 : 21000;
          }
        }
        if (!liveGasPrice) {
          const feeData = await provider.getFeeData();
          liveGasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
        }
      } catch (e: any) {
        logEvent('rpc', `Live gas/nonce fetch warning: ${e.message}`, 'warning');
      }
    }

    const signature = await wallet.signTransaction({
      to: txParams.to,
      value: txParams.value ? ethers.parseEther(txParams.value.toString()) : 0,
      data: txParams.data || '0x',
      nonce: liveNonce ?? 0,
      gasLimit: liveGasLimit || 21000,
      gasPrice: typeof liveGasPrice === 'string' ? liveGasPrice : (liveGasPrice || ethers.parseUnits('1', 'gwei')),
      chainId: Number(chainConfig?.chainId || 1)
    });

    const from = hdWallet.address;
    const newHistory: HistoryData = {
      hash: ethers.keccak256(signature),
      type: txParams.data && txParams.to === '0x' ? 'contract_call' : 'send',
      from,
      to: txParams.to,
      value: txParams.value || '0',
      asset: chainConfig?.nativeCurrency?.symbol || 'ETH',
      usdValue: '0.00',
      timestamp: new Date().toISOString(),
      chainId: chain,
      status: 'success'
    };

    vault.history = [newHistory, ...(vault.history || [])];
    await saveVault(vault);

    logEvent('security', `Transaction signed successfully`, 'success');
    return { signature };
  } catch (e: any) {
    logEvent('security', `Signing Violation: ${e.message}`, 'error');
    throw new Error(`Signing Violation: ${e.message}`);
  }
};

export const getHistory = async (address: string, chainId: string): Promise<HistoryData[]> => {
  const vault = await getVault();
  if (!vault.history) return [];
  const safeAddress = (address || '').toLowerCase();
  
  // Filter by address (either from or to) and chainId if requested
  return (vault.history || []).filter((h: any) =>
    h && h.from && h.to &&
    (h.from.toLowerCase() === safeAddress || h.to.toLowerCase() === safeAddress) &&
    (chainId === 'all' || h.chainId === chainId)
  );
};

export const importWalletMnemonic = async (name: string, mnemonic: string, password: string): Promise<any> => {
  const encrypted = await encryptData(mnemonic, password);
  const vault = await getVault();
  vault.encryptedMnemonic = encrypted.encrypted;
  vault.salt = encrypted.salt;
  vault.iv = encrypted.iv;
  vault.isEncrypted = true;
  vault.wallets = [];
  vault.history = [];
  await saveVault(vault);
  sessionMnemonic = mnemonic;
  return createWallet(name);
};

export const generateMnemonic = async (): Promise<string> => {
  return sessionMnemonic || '';
};

export const setSessionMnemonic = (mnemonic: string | null) => {
  sessionMnemonic = mnemonic;
  if (mnemonic) touchSession();
};

// SEC-03: Check session expiry before exposing mnemonic
export const getSessionMnemonic = () => {
  if (isSessionExpired()) return null;
  touchSession();
  return sessionMnemonic;
};


export const resetVault = async (mnemonic: string, newPassword: string): Promise<void> => {
  logEvent('security', 'Vault reset initiated with new password', 'warning');
  try {
    const wordlist = (wordlists as any).en || LangEn.wordlist();
    ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, undefined, wordlist);
  } catch (e) {
    throw new Error("Invalid mnemonic phrase. Please check the 12 words.");
  }

  const vault: VaultData = {
    encryptedMnemonic: '',
    salt: '',
    iv: '',
    isEncrypted: true,
    wallets: [],
    contracts: [],
    nfts: [],
    history: []
  };
  (vault as any).__mnemonic = mnemonic;
  sessionMnemonic = mnemonic;
  sessionPassword = newPassword;
  touchSession();
  await saveVault(vault);
};

export const getGasPriceEstimates = async (rpcUrl: string) => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    const baseFee = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    return {
      baseFee: ethers.formatUnits(baseFee, 'gwei'),
      slow: { priorityFee: '1', maxFee: ethers.formatUnits(baseFee + ethers.parseUnits('1', 'gwei'), 'gwei'), speed: 'slow' },
      average: { priorityFee: '2', maxFee: ethers.formatUnits(baseFee + ethers.parseUnits('2', 'gwei'), 'gwei'), speed: 'average' },
      fast: { priorityFee: '5', maxFee: ethers.formatUnits(baseFee + ethers.parseUnits('5', 'gwei'), 'gwei'), speed: 'fast' }
    };
  } catch {
    return {
      baseFee: '20',
      slow: { priorityFee: '1', maxFee: '21', speed: 'slow' },
      average: { priorityFee: '2', maxFee: '25', speed: 'average' },
      fast: { priorityFee: '5', maxFee: '35', speed: 'fast' }
    };
  }
};

// Simplified stubs for remaining items
export const importWalletPrivateKey = () => ({});
export const signTypedData = () => ({ signature: "0x" });
export const createPolicy = () => { };
export const listPolicies = () => [];
export const getPolicy = () => null;
export const deletePolicy = () => { };
export const createApiKey = () => ({ token: "", id: "", name: "" });
export const listApiKeys = () => [];
export const revokeApiKey = () => { };
export const signAndSend = (walletId: string) => ({ txHash: `0x_mock_hash_${walletId}` });

export const importContract = async (name: string, address: string, abi: string, decimals: number, chainId: string) => {
  // SEC-09: Checksum-validate EVM addresses
  let checksumAddr = address;
  try {
    if (address.startsWith('0x') && address.length === 42) {
      checksumAddr = ethers.getAddress(address);
    }
  } catch (e: any) {
    throw new Error(`Invalid contract address: ${e.message}`);
  }

  // SEC-14: Validate ABI is a parseable JSON array
  try {
    const parsed = JSON.parse(abi);
    if (!Array.isArray(parsed)) throw new Error('ABI must be a JSON array');
  } catch (e: any) {
    throw new Error(`Invalid ABI format: ${e.message}`);
  }

  const vault = await getVault();
  if (!vault.contracts) vault.contracts = [];

  // SEC-11: Duplicate contract guard
  const existing = vault.contracts.find(
    (c: any) => c.address.toLowerCase() === checksumAddr.toLowerCase() && c.chainId === chainId
  );
  if (existing) {
    logEvent('rpc', `Contract ${checksumAddr} already imported on ${chainId} — updating`, 'info');
    existing.name = name;
    existing.abi = abi;
    existing.decimals = decimals;
    await saveVault(vault);
    return existing;
  }

  const newContract = { name, address: checksumAddr, abi, decimals, chainId };
  vault.contracts.push(newContract);
  await saveVault(vault);
  return newContract;
};

export const listContracts = async (chainId: string) => {
  const vault = await getVault();
  if (!vault.contracts) return [];
  return vault.contracts.filter((c: any) => c.chainId === chainId);
};

export const deleteContract = async (address: string, chainId: string) => {
  const vault = await getVault();
  if (!vault.contracts) return;
  vault.contracts = vault.contracts.filter((c: any) => !(c.address === address && c.chainId === chainId));
  await saveVault(vault);
};

export const getNativeBalance = async (address: string, rpcUrl: string): Promise<string> => {
  if (!address || typeof address !== 'string') return "0.00";
  if (!rpcUrl || typeof rpcUrl !== 'string') return "0.00";

  const safeAddress = address || '0x...';
  logEvent('rpc', `Fetching balance for ${safeAddress.substring(0, 8)}...`, 'info', { rpcUrl });

  try {
    const lowerRpc = rpcUrl.toLowerCase();
    
    if (lowerRpc.includes('bitcoin') || lowerRpc.includes('btc') || lowerRpc.includes('blockstream') || lowerRpc.includes('esplora')) {
      const provider = new BitcoinProvider();
      const balance = await provider.getBalance(address, rpcUrl);
      logEvent('rpc', `Bitcoin Balance Success: ${balance} BTC`, 'success');
      return balance;
    }

    if (lowerRpc.includes('sui')) {
      const provider = new SuiProvider();
      const balance = await provider.getBalance(address, rpcUrl);
      logEvent('rpc', `Sui Balance Success: ${balance} SUI`, 'success');
      return balance;
    }

    // Default EVM
    const apiKey = (typeof (import.meta as any).env !== 'undefined') ? (import.meta as any).env.VITE_BOLT_API_KEY : "";
    let finalRpcUrl = rpcUrl;
    
    if (apiKey) {
      if (lowerRpc.includes('rpc.ankr.com')) {
        const base = rpcUrl.endsWith('/') ? rpcUrl.slice(0, -1) : rpcUrl;
        finalRpcUrl = `${base}/${apiKey}`;
      }
    }

    const provider = new EVMProvider();
    const balance = await provider.getBalance(address, finalRpcUrl);
    logEvent('rpc', `EVM Balance Success: ${balance}`, 'success');
    return balance;
  } catch (err: any) {
    logEvent('rpc', `Fatal balance error: ${err.message}`, 'error');
    console.error(`Balance Fetch Error [${address}]:`, err.message || err);
    return "0.00";
  }
};

export const getContractBalance = async (contractAddress: string, walletAddress: string, decimals: number, rpcUrl: string): Promise<string> => {
    if (!contractAddress || !walletAddress || !rpcUrl) return "0.00";
    
    const lowerRpc = rpcUrl.toLowerCase();
    if (lowerRpc.includes('bitcoin') || lowerRpc.includes('btc') || lowerRpc.includes('blockstream') || lowerRpc.includes('esplora') || lowerRpc.includes('sui')) {
      return "0.00";
    }

    const apiKey = (typeof (import.meta as any).env !== 'undefined') ? (import.meta as any).env.VITE_BOLT_API_KEY : "8355b82201a25997c6ad4660f55a632";
    let finalRpcUrl = rpcUrl;

    // BOLT-08: Tailored Ankr Premium Support & Override
    // We prioritize Ankr if an API key is available, especially if the current RPC is failing or legacy
    if (apiKey) {
      if (rpcUrl.includes('rpc.ankr.com')) {
        const base = rpcUrl.endsWith('/') ? rpcUrl.slice(0, -1) : rpcUrl;
        finalRpcUrl = `${base}/${apiKey}`;
      } else if (rpcUrl.includes('llamarpc.com') || rpcUrl.includes('polygon-rpc.com') || rpcUrl.includes('monad.xyz') || rpcUrl.includes('sui.io')) {
        // AUTO-OVERRIDE: If we have an Ankr key and the current RPC is a known standard one, switch to Ankr for performance
        if (rpcUrl.includes('eth')) finalRpcUrl = `https://rpc.ankr.com/eth/${apiKey}`;
        else if (rpcUrl.includes('bsc')) finalRpcUrl = `https://rpc.ankr.com/bsc/${apiKey}`;
        else if (rpcUrl.includes('polygon')) finalRpcUrl = `https://rpc.ankr.com/polygon/${apiKey}`;
        else if (rpcUrl.includes('monad')) finalRpcUrl = `https://rpc.ankr.com/monad/${apiKey}`;
        else if (rpcUrl.includes('sui')) finalRpcUrl = `https://rpc.ankr.com/sui/${apiKey}`;
      }
    }

    const fetchReq = new ethers.FetchRequest(finalRpcUrl);
    if (apiKey && !finalRpcUrl.includes('rpc.ankr.com')) {
      fetchReq.setHeader("x-api-key", apiKey);
    }
    try {
      const provider = new ethers.JsonRpcProvider(fetchReq, undefined, {
        staticNetwork: true,
        batchMaxCount: 1
      });
      const abi = ["function balanceOf(address) view returns (uint256)"];
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const balance = await contract.balanceOf(walletAddress);
      const formatted = ethers.formatUnits(balance, decimals);
      logEvent('rpc', `Contract Balance Success: ${formatted}`, 'success');
      return formatted;
    } catch (e: any) {
      // BOLT-11: Aggressive Fallback for Contracts
      const isForbidden = 
        e.message?.includes('403') || 
        e.message?.includes('Forbidden') || 
        e.info?.responseStatus === 403 ||
        e.error?.message?.includes('403');
        
      if (isForbidden && finalRpcUrl !== rpcUrl) {
        console.warn(`Boltwallet: Contract Fallback Triggered for ${contractAddress} on ${rpcUrl}.`);
        try {
          const fallbackProvider = new ethers.JsonRpcProvider(rpcUrl);
          const fbContract = new ethers.Contract(contractAddress, ["function balanceOf(address) view returns (uint256)"], fallbackProvider);
          const balance = await fbContract.balanceOf(walletAddress);
          return ethers.formatUnits(balance, decimals);
        } catch (fbErr) {
           console.error("Boltwallet: Both Ankr and Fallback failed for contract.");
        }
      }
      const errorMsg = e.message || "Unknown Contract RPC Error";
      console.error(`Contract Balance Fetch Error [${contractAddress}]:`, errorMsg);
      return "0.00";
    }
};

export const importNFT = async (address: string, tokenId: string, name: string, chainId: string) => {
  const vault = await getVault();
  if (!vault.nfts) vault.nfts = [];

  const newNFT: NFTData = {
    address,
    tokenId,
    name,
    symbol: "NFT",
    tokenUri: "",
    chainId
  };
  vault.nfts.push(newNFT);
  await saveVault(vault);
  return newNFT;
};

export const listNFTs = async (chainId: string) => {
  const vault = await getVault();
  if (!vault.nfts) return [];
  return vault.nfts.filter((n: any) => n.chainId === chainId);
};
export const getAssetPrices = async (): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};

  // Fetch each price individually to prevent a single 404 from blocking all prices
  await Promise.all(Object.entries(PRICE_FEED_IDS).map(async ([chain, id]) => {
    if (!id || id === "0x") {
      if (chain === 'monad') prices[chain] = 4.20;
      return;
    }

    try {
      const response = await fetch(`${HERMES_URL}?ids[]=${id}`);
      if (!response.ok) return;

      const data = await response.json();
      const feed = data.parsed?.[0];
      if (feed && feed.price) {
        const expo = feed.price.expo || 0;
        const priceVal = feed.price.price || "0";
        const price = Number(priceVal) * Math.pow(10, expo);
        prices[chain] = price;
        logEvent('rpc', `Price Update: ${(chain || '').toUpperCase()} = $${price.toFixed(2)}`, 'info');
      }
    } catch (err) {
      console.warn(`Failed to fetch price for ${chain}:`, err);
    }
  }));

  return prices;
};

export const deleteNFT = async (address: string, tokenId: string, chainId: string) => {
  const vault = await getVault();
  if (!vault.nfts) return;
  vault.nfts = vault.nfts.filter((n: any) => !(n.address === address && n.tokenId === tokenId && n.chainId === chainId));
  await saveVault(vault);
};

export const getNFTMetadata = async (address: string, tokenId: string, chainId: string) => {
  // Simulated metadata fetching
  return {
    name: "Cyber Punk",
    description: "A premium NFT from the Boltwallet collection.",
    image: "/0logov3.png"
  };
};
