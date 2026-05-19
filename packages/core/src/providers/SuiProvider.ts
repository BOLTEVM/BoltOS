import { IChainProvider } from './types';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';

export class SuiProvider implements IChainProvider {
  private derivationPath: string;

  constructor(derivationPath: string = "m/44'/784'/0'/0'/") {
    this.derivationPath = derivationPath;
  }

  deriveAddress(mnemonic: string, index: number): string {
    try {
      const fullPath = this.derivationPath.endsWith('/') 
        ? `${this.derivationPath}${index}'` 
        : `${this.derivationPath}/${index}'`;
      
      const keypair = Ed25519Keypair.deriveKeypair(mnemonic, fullPath);
      return keypair.getPublicKey().toSuiAddress();
    } catch (e) {
      console.error("Sui Address Derivation Error:", e);
      return "";
    }
  }

  async getBalance(address: string, rpcUrl: string): Promise<string> {
    try {
      const client = new SuiGrpcClient({ baseUrl: rpcUrl, network: 'mainnet' });
      const balanceResponse = await client.getBalance({ owner: address });
      // Sui has 9 decimals. The balance is nested inside balanceResponse.balance.balance
      const formatted = (Number(balanceResponse.balance.balance) / 1e9).toFixed(9);
      return formatted;
    } catch (e) {
      console.error(`Sui Balance Fetch Error [${address}]:`, e);
      return "0.00";
    }
  }

  async broadcastTransaction(txBytes: string, rpcUrl: string): Promise<string> {
    throw new Error("Sui broadcast requires client.executeTransactionBlock with signatures. Use the SuiClient directly.");
  }

  async signAndBroadcast(txData: any, mnemonic: string, index: number, rpcUrl: string): Promise<string> {
    try {
      const fullPath = this.derivationPath.endsWith('/') 
        ? `${this.derivationPath}${index}'` 
        : `${this.derivationPath}/${index}'`;
      
      const keypair = Ed25519Keypair.deriveKeypair(mnemonic, fullPath);
      const client = new SuiGrpcClient({ baseUrl: rpcUrl, network: 'mainnet' });
      
      // We expect txData to be a TransactionBlock or an object we can build from.
      // For a simple send: { to: string, value: string }
      // In @mysten/sui, we use Transaction to build PTBs.
      // Since @mysten/sui replaced @mysten/sui.js, we dynamically import it or assume it's available.
      // For simplicity, we assume txData is a fully formed Transaction object or we build a simple coin transfer.
      // Dynamic import to avoid strict dependency resolution issues if not heavily used
      const { Transaction } = await import('@mysten/sui/transactions');
      
      let tx: any;
      if (txData.kind && typeof txData.transferObjects === 'function') {
         tx = txData; // It's already a Transaction block
      } else {
         tx = new Transaction();
         // value is in SUI (decimals = 9) or already in MIST? 
         // Assuming txData.value is in SUI and needs conversion to MIST if it's a raw decimal, 
         // but ethers.parseUnits might have already parsed it into an EVM wei equivalent string.
         // Let's assume txData.value is the raw smallest unit (MIST) as passed from the frontend.
         const coin = tx.splitCoins(tx.gas, [tx.pure.u64(txData.value)]);
         tx.transferObjects([coin], tx.pure.address(txData.to));
      }

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
      });

      if (result.$kind === 'Transaction') {
        return result.Transaction.digest;
      } else {
        throw new Error(`Transaction execution failed: ${result.FailedTransaction?.digest || 'Unknown error'}`);
      }
    } catch (e: any) {
      console.error("Sui Sign & Broadcast Error:", e);
      throw new Error(`Sui Execution Failed: ${e.message}`);
    }
  }

  isValidAddress(address: string): boolean {
    // Basic Sui address check (0x followed by 64 hex chars)
    return /^0x[a-fA-F0-9]{64}$/.test(address);
  }
}
