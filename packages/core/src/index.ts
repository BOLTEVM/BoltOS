import { 
  createWallet as owsCreateWallet, 
  signMessage as owsSignMessage, 
  signTransaction as owsSignTransaction, 
  listWallets as owsListWallets, 
  generateMnemonic as owsGenerateMnemonic,
  // @ts-ignore
  setActiveChain as owsSetActiveChain,
  // @ts-ignore
  importContract as owsImportContract,
  // @ts-ignore
  listContracts as owsListContracts,
  // @ts-ignore
  deleteContract as owsDeleteContract,
  // @ts-ignore
  getContractBalance as owsGetContractBalance,
  // @ts-ignore
  importNFT as owsImportNFT,
  // @ts-ignore
  listNFTs as owsListNFTs,
  // @ts-ignore
  deleteNFT as owsDeleteNFT,
  // @ts-ignore
  getNFTMetadata as owsGetNFTMetadata,
  // @ts-ignore
  isVaultSetup as owsIsVaultSetup,
  // @ts-ignore
  setupVault as owsSetupVault,
  // @ts-ignore
  unlockVault as owsUnlockVault,
  // @ts-ignore
  isVaultLocked as owsIsVaultLocked,
  WalletInfo,
  SignResult
} from "@open-wallet-standard/core";
import { CHAINS, ChainConfig } from "./chains";

export interface WalletData {
  id: string;
  name: string;
  address: string;
  index: number;
}

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

export class BoltwalletCore {
  private currentChain: ChainConfig;

  constructor(chainKey: keyof typeof CHAINS = "ethereum") {
    this.currentChain = CHAINS[chainKey];
  }

  async checkVault() {
    try {
      if (typeof window !== 'undefined' && (window as any).ows_vault_error) {
         throw new Error("Vault locked");
      }
      return true;
    } catch (err: any) {
      console.error("Vault access denied:", err.message);
      return false;
    }
  }

  async generateMnemonic() {
    return owsGenerateMnemonic();
  }

  async createNewWallet(name: string): Promise<WalletData> {
    const info = await owsCreateWallet(name);
    return this.mapWalletInfo(info);
  }

  async getWallets(): Promise<WalletData[]> {
    const wallets = await owsListWallets();
    return wallets.map(w => this.mapWalletInfo(w));
  }

  async signMessage(walletName: string, message: string): Promise<string> {
    const result = await owsSignMessage(walletName, this.currentChain.id, message);
    return result.signature;
  }

  async signTransaction(walletName: string, txData: any): Promise<string> {
    const result = await owsSignTransaction(walletName, this.currentChain.id, JSON.stringify(txData));
    return result.signature;
  }

  private mapWalletInfo(info: WalletInfo): WalletData {
    // Standard OWS wallet might have multiple accounts. We pick the first one matching our chain for the UI view.
    const account = info.accounts[0] || { address: "0x0", derivationPath: "" };
    // The index can be extracted from derivation path if needed, but for now we simplify
    return {
      id: info.id,
      name: info.name,
      address: account.address,
      index: 0 // Placeholder or extracted
    };
  }

  getChainConfig() {
    return this.currentChain;
  }

  setChain(chainKey: keyof typeof CHAINS) {
    this.currentChain = CHAINS[chainKey];
    if (typeof owsSetActiveChain === 'function') {
      owsSetActiveChain(chainKey as string);
    }
  }

  getSupportedChains() {
    return Object.keys(CHAINS);
  }

  async importContract(name: string, address: string, abi: string, decimals: number): Promise<ContractData> {
    return owsImportContract(name, address, abi, decimals, this.currentChain.id);
  }

  async listContracts(): Promise<ContractData[]> {
    return owsListContracts(this.currentChain.id);
  }

  async deleteContract(address: string): Promise<void> {
    return owsDeleteContract(address, this.currentChain.id);
  }

  async getContractBalance(contractAddress: string, walletAddress: string, decimals: number): Promise<string> {
    return owsGetContractBalance(contractAddress, walletAddress, decimals);
  }

  async importNFT(address: string, tokenId: string, name: string): Promise<NFTData> {
    return owsImportNFT(address, tokenId, name, this.currentChain.id);
  }

  async listNFTs(): Promise<NFTData[]> {
    return owsListNFTs(this.currentChain.id);
  }

  async deleteNFT(address: string, tokenId: string): Promise<void> {
    return owsDeleteNFT(address, tokenId, this.currentChain.id);
  }

  async getNFTMetadata(address: string, tokenId: string): Promise<any> {
    return owsGetNFTMetadata(address, tokenId, this.currentChain.id);
  }

  async isVaultSetup(): Promise<boolean> {
    return owsIsVaultSetup();
  }

  async setupVault(password: string): Promise<string> {
    return owsSetupVault(password);
  }

  async unlockVault(password: string): Promise<boolean> {
    return owsUnlockVault(password);
  }

  isVaultLocked(): boolean {
    return owsIsVaultLocked();
  }
}
