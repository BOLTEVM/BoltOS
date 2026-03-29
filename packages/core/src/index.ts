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
  // @ts-ignore
  getAssetPrices as owsGetAssetPrices,
  // @ts-ignore
  getNativeBalance as owsGetNativeBalance,
  // @ts-ignore
  getGasPriceEstimates as owsGetGasPriceEstimates,
  // @ts-ignore
  resetVault as owsResetVault,
  // @ts-ignore
  setSessionMnemonic as owsSetSessionMnemonic,
  // @ts-ignore
  getSessionMnemonic as owsGetSessionMnemonic,
  // @ts-ignore
  onLogs as owsOnLogs,
  // @ts-ignore
  getLogs as owsGetLogs,
  WalletInfo,
  SignResult,
  // @ts-ignore
  LogEvent
} from "@open-wallet-standard/core";
import { CHAINS, ChainConfig } from "./chains";
export { CHAINS };
export type { ChainConfig };

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

export class BoltwalletCore {
  private currentChain: ChainConfig;

  constructor(chainKey: keyof typeof CHAINS = "ethereum") {
    this.currentChain = CHAINS[chainKey];
  }

  async checkVault() {
    return true;
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
    
    // Attempt to extract index from derivation path (e.g., m/44'/60'/0'/0/0 -> 0)
    let index = 0;
    if (account.derivationPath) {
      const parts = account.derivationPath.split('/');
      const lastPart = parts[parts.length - 1];
      index = parseInt(lastPart.replace("'", "")) || 0;
    }

    return {
      id: info.id,
      name: info.name,
      address: account.address,
      index
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
    return owsGetContractBalance(contractAddress, walletAddress, decimals, this.currentChain.rpc);
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

  async getAssetPrices(): Promise<Record<string, number>> {
    return owsGetAssetPrices();
  }

  async setSession(mnemonic: string | null): Promise<void> {
    return owsSetSessionMnemonic(mnemonic);
  }

  async getSession(): Promise<string | null> {
    return owsGetSessionMnemonic();
  }

  async getNativeBalance(address: string): Promise<string> {
    return owsGetNativeBalance(address, this.currentChain.rpc);
  }

  async getGasPriceEstimates(): Promise<any> {
    return owsGetGasPriceEstimates(this.currentChain.rpc);
  }

  async resetVault(mnemonic: string, newPassword: string): Promise<void> {
    return owsResetVault(mnemonic, newPassword);
  }

  async getHistory(address: string, chainId: string = 'all'): Promise<HistoryData[]> {
    // @ts-ignore
    const history = await owsGetHistory(address, chainId);
    return history as HistoryData[];
  }

  onLogs(cb: (logs: any[]) => void) {
    if (typeof owsOnLogs === 'function') {
      return owsOnLogs(cb);
    }
  }

  getLogs() {
    if (typeof owsGetLogs === 'function') {
      return owsGetLogs();
    }
    return [];
  }
}

export type { LogEvent };
