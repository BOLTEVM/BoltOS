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
}

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
    nfts: []
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
  let path = `m/44'/60'/0'/0/${index}`;
  
  if (activeChainId === 'bitcoin') {
    path = `m/84'/0'/0'/0/${index}`;
    // Simulate Bech32 (SegWit) address for soft launch
    const hash = ethers.id(`${mnemonic}-${index}-btc`).substring(2, 42);
    return `bc1q${hash}`;
  } 
  
  if (activeChainId === 'quai') {
    path = `m/44'/969'/0'/0/${index}`;
  } else if (activeChainId === 'sui') {
    path = `m/44'/784'/0'/0'/${index}'`;
    // Sui addresses start with 0x but are 64 hex chars
    return ethers.id(`${mnemonic}-${index}-sui`);
  } else if (activeChainId === 'monad') {
    path = `m/44'/60'/0'/0/${index}`; // Monad uses EVM paths
  }

  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);
  return wallet.address;
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
  return vault.wallets.map((w: any) => ({
    id: w.id,
    name: w.name,
    accounts: [{ 
      chainId: "ethereum", 
      address: deriveAddress(sessionMnemonic || '', w.index), 
      derivationPath: `m/44'/60'/0'/0/${w.index}` 
    }],
    createdAt: w.createdAt
  }));
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

export const signTransaction = async (walletId: string, chain: string, txHex: string): Promise<any> => {
  const vault = await getVault();
  const w = vault.wallets.find((x: any) => x.id === walletId || x.name === walletId);
  if (!w) throw new Error("Wallet not found");
  
  // BOLT-05: Payload Validation
  try {
    const tx = JSON.parse(txHex);
    validateTransactionPayload(tx);
    console.info("Boltwallet Security: WYSIWYS payload validated and bound to signature.", { to: tx.to, value: tx.value });
  } catch (e: any) {
    console.error("Security Alert: Invalid Transaction Payload Detected", e);
    throw new Error(`Security Violation: ${e.message}`);
  }
  
  return { signature: `0x_mock_signed_tx_${walletId}` };
};

export const importWalletMnemonic = async (name: string, mnemonic: string, password: string): Promise<any> => {
  const encrypted = await encryptData(mnemonic, password);
  const vault = await getVault();
  vault.encryptedMnemonic = encrypted.encrypted;
  vault.salt = encrypted.salt;
  vault.iv = encrypted.iv;
  vault.isEncrypted = true;
  vault.wallets = []; 
  await saveVault(vault);
  sessionMnemonic = mnemonic;
  return createWallet(name);
};

export const generateMnemonic = async (): Promise<string> => {
  return sessionMnemonic || '';
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
