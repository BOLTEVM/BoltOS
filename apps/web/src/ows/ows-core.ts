import { ethers } from 'ethers';

const VAULT_KEY = 'bolt_vault_v1';
let activeChainId = 'ethereum';

interface VaultData {
  mnemonic: string;
  wallets: Array<{
    id: string;
    name: string;
    index: number;
    createdAt: string;
  }>;
}

const getVault = (): VaultData => {
  const data = localStorage.getItem(VAULT_KEY);
  if (data) {
    return JSON.parse(data);
  }
  
  // Initialize new vault
  const wallet = ethers.Wallet.createRandom();
  const newData: VaultData = {
    mnemonic: wallet.mnemonic?.phrase || '',
    wallets: []
  };
  saveVault(newData);
  return newData;
};

const saveVault = (data: VaultData) => {
  localStorage.setItem(VAULT_KEY, JSON.stringify(data));
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

export const createWallet = (name: string): any => {
  const vault = getVault();
  const index = vault.wallets.length;
  const id = `wallet_${Math.random().toString(16).substring(2, 10)}`;
  const address = deriveAddress(vault.mnemonic, index);
  
  const newWallet = {
    id,
    name: name || `Wallet ${index + 1}`,
    index,
    createdAt: new Date().toISOString()
  };
  
  vault.wallets.push(newWallet);
  saveVault(vault);
  
  return {
    id: newWallet.id,
    name: newWallet.name,
    accounts: [{ chainId: "ethereum", address, derivationPath: `m/44'/60'/0'/0/${index}` }],
    createdAt: newWallet.createdAt
  };
};

export const listWallets = (): any[] => {
  const vault = getVault();
  return vault.wallets.map(w => ({
    id: w.id,
    name: w.name,
    accounts: [{ 
      chainId: "ethereum", 
      address: deriveAddress(vault.mnemonic, w.index), 
      derivationPath: `m/44'/60'/0'/0/${w.index}` 
    }],
    createdAt: w.createdAt
  }));
};

export const getWallet = (idOrName: string): any => {
  const vault = getVault();
  const w = vault.wallets.find(w => w.id === idOrName || w.name === idOrName);
  if (!w) return null;
  
  return {
    id: w.id,
    name: w.name,
    accounts: [{ 
      chainId: "ethereum", 
      address: deriveAddress(vault.mnemonic, w.index), 
      derivationPath: `m/44'/60'/0'/0/${w.index}` 
    }],
    createdAt: w.createdAt
  };
};

export const deleteWallet = (idOrName: string) => {
  const vault = getVault();
  vault.wallets = vault.wallets.filter(w => w.id !== idOrName && w.name !== idOrName);
  saveVault(vault);
};

export const renameWallet = (idOrName: string, newName: string) => {
  const vault = getVault();
  const w = vault.wallets.find(w => w.id === idOrName || w.name === idOrName);
  if (w) {
    w.name = newName;
    saveVault(vault);
  }
};

export const exportWallet = (idOrName: string): string => {
  return getVault().mnemonic;
};

export const signMessage = (walletId: string, chain: string, message: string): any => {
  const vault = getVault();
  const w = vault.wallets.find(w => w.id === walletId || w.name === walletId);
  if (!w) throw new Error("Wallet not found");
  
  const path = `m/44'/60'/0'/0/${w.index}`;
  const wallet = ethers.HDNodeWallet.fromPhrase(vault.mnemonic, undefined, path);
  // Note: signMessage returns a promise in real ethers, but OWS might expect sync or we wrap it
  return { signature: "0x_mock_signed_message_hash" }; 
};

export const signTransaction = (walletId: string, chain: string, txHex: string): any => {
  const vault = getVault();
  const w = vault.wallets.find(w => w.id === walletId || w.name === walletId);
  if (!w) throw new Error("Wallet not found");
  
  return { signature: `0x_mock_signed_tx_${walletId}` };
};

export const importWalletMnemonic = (name: string, mnemonic: string): any => {
  const vault = getVault();
  vault.mnemonic = mnemonic;
  vault.wallets = []; // Reset wallets for new seed
  saveVault(vault);
  return createWallet(name);
};

export const generateMnemonic = (): string => {
  return getVault().mnemonic;
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
