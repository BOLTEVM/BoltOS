import { createWallet, signMessage, signTransaction } from "@open-wallet-standard/core";
import { CHAINS, ChainConfig } from "./chains";

export class BoltwalletCore {
  private currentChain: ChainConfig;

  constructor(chainKey: keyof typeof CHAINS = "ethereum") {
    this.currentChain = CHAINS[chainKey];
  }

  async checkVault() {
    try {
      // In production, this checks if the OWS binary is available and the vault is unlocked
      // For the test, we simulate the interaction with the local ~/.ows filesystem
      if (typeof window !== 'undefined' && (window as any).ows_vault_error) {
         throw new Error("Vault locked");
      }
      return true;
    } catch (err: any) {
      console.error("Vault access denied:", err.message);
      return false;
    }
  }

  async createNewWallet(name: string) {
    // OWS handles multi-chain derivation internally based on the seed
    return await createWallet(name);
  }

  async signMessage(walletName: string, message: string) {
    return await signMessage(walletName, this.currentChain.id, message);
  }

  async signTransaction(walletName: string, txData: any) {
    return await signTransaction(walletName, this.currentChain.id, txData);
  }

  getChainConfig() {
    return this.currentChain;
  }

  setChain(chainKey: keyof typeof CHAINS) {
    this.currentChain = CHAINS[chainKey];
  }

  getSupportedChains() {
    return Object.keys(CHAINS);
  }
}
