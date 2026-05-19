import { IChainProvider } from './types';
import { ethers } from 'ethers';

export class EVMProvider implements IChainProvider {
  private derivationPath: string;

  constructor(derivationPath: string = "m/44'/60'/0'/0/") {
    this.derivationPath = derivationPath;
  }

  deriveAddress(mnemonic: string, index: number): string {
    try {
      const fullPath = this.derivationPath.endsWith('/') 
        ? `${this.derivationPath}${index}` 
        : `${this.derivationPath}/${index}`;
      
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, fullPath);
      return wallet.address;
    } catch (e) {
      console.error("EVM Address Derivation Error:", e);
      return "0x0000000000000000000000000000000000000000";
    }
  }

  async getBalance(address: string, rpcUrl: string): Promise<string> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (e) {
      console.error(`EVM Balance Fetch Error [${address}]:`, e);
      return "0.00";
    }
  }

  async broadcastTransaction(signature: string, rpcUrl: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const response = await provider.broadcastTransaction(signature);
    return response.hash;
  }

  async signAndBroadcast(txData: any, mnemonic: string, index: number, rpcUrl: string): Promise<string> {
    try {
      const fullPath = this.derivationPath.endsWith('/') 
        ? `${this.derivationPath}${index}` 
        : `${this.derivationPath}/${index}`;
      
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, fullPath).connect(provider);
      
      const txResponse = await wallet.sendTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data || "0x",
        maxFeePerGas: txData.maxFeePerGas,
        maxPriorityFeePerGas: txData.maxPriorityFeePerGas,
        gasLimit: txData.gasLimit
      });
      return txResponse.hash;
    } catch (e: any) {
      console.error("EVM Sign & Broadcast Error:", e);
      throw new Error(`EVM Execution Failed: ${e.message}`);
    }
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
}
