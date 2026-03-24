import { 
  createWallet as owsCreateWallet, 
  signMessage as owsSignMessage, 
  signTransaction as owsSignTransaction, 
  listWallets as owsListWallets, 
  generateMnemonic as owsGenerateMnemonic,
  // @ts-ignore
  setActiveChain as owsSetActiveChain,
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
}
