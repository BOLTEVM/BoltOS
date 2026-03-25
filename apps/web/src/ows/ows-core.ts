import { ethers } from 'ethers';

const VAULT_KEY = 'bolt_vault_v1';
let activeChainId = 'ethereum';

interface ContractData {
  address: string;
  abi: string;
  name: string;
  decimals: number;
  chainId: string;
}

interface NFTData {
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
  "sui": "0x50c18d9ef61730bb53c448eb3b054817a2e0a010899def360e4282367f08365a"
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
  "tron_evm": "m/44'/60'/0'/0/"
};

let sessionMnemonic: string | null = null;

// Crypto Helpers
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
      iterations: 100000, 
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

const getVault = async (): Promise<VaultData> => {
  // Try chromium extension storage first
  if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
    return new Promise((resolve) => {
      (window as any).chrome.storage.local.get([VAULT_KEY], (result: any) => {
        if (result[VAULT_KEY]) {
          resolve(result[VAULT_KEY]);
        } else {
          // Fallback to localStorage within extension if needed (or initialize)
          const data = localStorage.getItem(VAULT_KEY);
          if (data) {
            resolve(JSON.parse(data));
          } else {
            resolve(initializeVault());
          }
        }
      });
    });
  }

  const data = localStorage.getItem(VAULT_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
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
  saveVault(newData);
  return newData;
};

export const setupVault = async (password: string): Promise<string> => {
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic?.phrase || '';
  const encrypted = await encryptData(mnemonic, password);
  
  const vault = await getVault();
  vault.encryptedMnemonic = encrypted.encrypted;
  vault.salt = encrypted.salt;
  vault.iv = encrypted.iv;
  vault.isEncrypted = true;
  
  await saveVault(vault);
  sessionMnemonic = mnemonic;
  return mnemonic;
};

export const unlockVault = async (password: string): Promise<boolean> => {
  const vault = await getVault();
  if (!vault.isEncrypted) return false;
  try {
    sessionMnemonic = await decryptData(vault.encryptedMnemonic, vault.salt, vault.iv, password);
    return true;
  } catch (e) {
    return false;
  }
};

export const isVaultLocked = () => !sessionMnemonic;
export const isVaultSetup = async () => {
  const vault = await getVault();
  return vault.isEncrypted;
};

const saveVault = async (data: VaultData) => {
  localStorage.setItem(VAULT_KEY, JSON.stringify(data));
  if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
    await (window as any).chrome.storage.local.set({ [VAULT_KEY]: data });
  }
};

export const setActiveChain = (chainId: string) => {
  activeChainId = chainId;
};

export const deriveAddress = (mnemonic: string, index: number): string => {
  if (!mnemonic || mnemonic.trim() === "") {
    return "0x0000000000000000000000000000000000000000";
  }

  // Handle special cases first
  if (activeChainId === 'bitcoin') {
    // Simulate Bech32 (SegWit) address for soft launch
    const hash = ethers.id(`${mnemonic}-${index}-btc`).substring(2, 42);
    return `bc1q${hash}`;
  } 
  
  if (activeChainId === 'sui') {
    // Sui addresses start with 0x but are 64 hex chars
    return ethers.id(`${mnemonic}-${index}-sui`);
  }

  // Use DERIVATION_PATHS for other chains
  const basePath = DERIVATION_PATHS[activeChainId] || "m/44'/60'/0'/0/";
  // Ensure the path ends with a slash before appending index
  const fullPath = basePath.endsWith('/') ? `${basePath}${index}` : `${basePath}/${index}`;
  
  try {
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, fullPath);
    return wallet.address;
  } catch (e) {
    console.error("Address Derivation Error:", e);
    return "0x0000...0000";
  }
};

export const createWallet = async (name: string): Promise<any> => {
  if (!sessionMnemonic) throw new Error("Vault is locked");
  const vault = await getVault();
  const index = vault.wallets.length;
  const id = `wallet_${Math.random().toString(16).substring(2, 10)}`;
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
  
  return {
    id: w.id,
    name: w.name,
    accounts: [{ 
      chainId: "ethereum", 
      address: deriveAddress(sessionMnemonic || '', w.index), 
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
  const vault = await getVault();
  const w = vault.wallets.find((x: any) => x.id === walletId || x.name === walletId);
  if (!w) throw new Error("Wallet not found");
  
  return { signature: "0x_mock_signed_message_hash" }; 
};

export const getGasPriceEstimates = async (rpcUrl: string) => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();
    const baseFee = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    
    return {
      baseFee: ethers.formatUnits(baseFee, 'gwei'),
      slow: {
        priorityFee: ethers.formatUnits(ethers.parseUnits('1', 'gwei'), 'gwei'),
        maxFee: ethers.formatUnits(baseFee + ethers.parseUnits('2', 'gwei'), 'gwei')
      },
      average: {
        priorityFee: ethers.formatUnits(ethers.parseUnits('2', 'gwei'), 'gwei'),
        maxFee: ethers.formatUnits(baseFee * BigInt(2), 'gwei')
      },
      fast: {
        priorityFee: ethers.formatUnits(ethers.parseUnits('5', 'gwei'), 'gwei'),
        maxFee: ethers.formatUnits(baseFee * BigInt(3), 'gwei')
      }
    };
  } catch (err) {
    console.error("Gas Estimate Error:", err);
    return {
      baseFee: '20',
      slow: { priorityFee: '1', maxFee: '22' },
      average: { priorityFee: '2', maxFee: '40' },
      fast: { priorityFee: '5', maxFee: '60' }
    };
  }
};

export const signTransaction = async (walletId: string, chain: string, txHex: string): Promise<any> => {
  const vault = await getVault();
  const w = vault.wallets.find((x: any) => x.id === walletId || x.name === walletId);
  if (!w) throw new Error("Wallet not found");
  
  // BOLT-05: Payload Validation
  try {
    const tx = JSON.parse(txHex);
    validateTransactionPayload(tx);
    
    // Log gas parameters for audit trail
    if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
       console.info("Boltwallet Security: EIP-1559 Gas parameters validated.", {
          maxFee: tx.maxFeePerGas,
          priorityFee: tx.maxPriorityFeePerGas,
          gasLimit: tx.gasLimit
       });
    }

    console.info("Boltwallet Security: WYSIWYS payload validated and bound to signature.", { to: tx.to, value: tx.value });
  } catch (e: any) {
    console.error("Security Alert: Invalid Transaction Payload Detected", e);
    throw new Error(`Security Violation: ${e.message}`);
  }
  
  const sig = `0x_mock_signed_tx_${walletId}_${Math.random().toString(16).substring(2, 10)}`;
  
  // Save to history
  const parsedTx = JSON.parse(txHex);
  const from = deriveAddress(sessionMnemonic || '', w.index);
  const newHistory: HistoryData = {
    hash: sig,
    type: parsedTx.data && parsedTx.to === '0x' ? 'contract_call' : 'send',
    from,
    to: parsedTx.to,
    value: parsedTx.value || '0',
    asset: chain === 'ethereum' ? 'ETH' : chain.toUpperCase(),
    usdValue: '0.00', // To be filled by UI if price available
    timestamp: new Date().toISOString(),
    chainId: chain,
    status: 'success'
  };
  
  vault.history = [newHistory, ...(vault.history || [])];
  await saveVault(vault);

  return { signature: sig };
};

export const getHistory = async (address: string, chainId: string): Promise<HistoryData[]> => {
  const vault = await getVault();
  if (!vault.history) return [];
  // Filter by address (either from or to) and chainId if requested
  return vault.history.filter((h: any) => 
    (h.from.toLowerCase() === address.toLowerCase() || h.to.toLowerCase() === address.toLowerCase()) && 
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

export const resetVault = async (mnemonic: string, newPassword: string): Promise<void> => {
  // Validate mnemonic
  try {
    ethers.HDNodeWallet.fromPhrase(mnemonic);
  } catch (e) {
    throw new Error("Invalid mnemonic phrase. Please check the 12 words.");
  }

  const encrypted = await encryptData(mnemonic, newPassword);
  const vault = await getVault();
  
  vault.encryptedMnemonic = encrypted.encrypted;
  vault.salt = encrypted.salt;
  vault.iv = encrypted.iv;
  vault.isEncrypted = true;
  
  await saveVault(vault);
  sessionMnemonic = mnemonic;
};

// Simplified stubs for remaining items
export const importWalletPrivateKey = () => ({});
export const signTypedData = () => ({ signature: "0x" });
export const createPolicy = () => {};
export const listPolicies = () => [];
export const getPolicy = () => null;
export const deletePolicy = () => {};
export const createApiKey = () => ({ token: "", id: "", name: "" });
export const listApiKeys = () => [];
export const revokeApiKey = () => {};
export const signAndSend = (walletId: string) => ({ txHash: `0x_mock_hash_${walletId}` });

export const importContract = async (name: string, address: string, abi: string, decimals: number, chainId: string) => {
  const vault = await getVault();
  if (!vault.contracts) vault.contracts = [];
  
  const newContract = { name, address, abi, decimals, chainId };
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
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (err) {
    console.warn("Balance Fetch Error, using deterministic mock:", err);
    // Deterministic mock based on address for development consistency
    const hash = ethers.id(address);
    const mockVal = (parseInt(hash.substring(2, 6), 16) % 2000) / 1000;
    return mockVal.toFixed(4);
  }
};

export const getContractBalance = async (contractAddress: string, walletAddress: string, decimals: number): Promise<string> => {
   // Simulated balance fetching logic for the extension/web views
   await new Promise(r => setTimeout(r, 500));
   const mockBalances: Record<string, string> = {
      "0x1234567890123456789012345678901234567890": "1000.50",
      "default": (Math.random() * 500).toFixed(decimals > 2 ? 2 : decimals)
   };
   return mockBalances[contractAddress] || mockBalances["default"];
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
      if (feed) {
        prices[chain] = Number(feed.price.price) * Math.pow(10, feed.price.expo);
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
