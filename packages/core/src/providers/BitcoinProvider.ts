import { IChainProvider } from './types';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';

const bip32 = BIP32Factory(ecc);

export class BitcoinProvider implements IChainProvider {
  private network: bitcoin.Network;
  private derivationPath: string;

  constructor(network: bitcoin.Network = bitcoin.networks.bitcoin, derivationPath: string = "m/84'/0'/0'/0") {
    this.network = network;
    this.derivationPath = derivationPath;
  }

  deriveAddress(mnemonic: string, index: number): string {
    try {
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = bip32.fromSeed(seed, this.network);
      
      const fullPath = `${this.derivationPath}/${index}`;
      const child = root.derivePath(fullPath);

      const { address } = bitcoin.payments.p2wpkh({ 
        pubkey: child.publicKey, 
        network: this.network 
      });
      
      if (!address) throw new Error("Failed to generate Bech32 address");
      return address;
    } catch (e) {
      console.error("Bitcoin Address Derivation Error:", e);
      return "";
    }
  }

  async getBalance(address: string, rpcUrl: string): Promise<string> {
    try {
      // Use Esplora/Blockstream compatible API
      const baseUrl = rpcUrl.replace(/\/$/, "");
      
      // Some RPCs are direct blockstream APIs, others might be ankr but ankr requires JSON-RPC
      // For simplicity in this provider, we assume standard Esplora REST if possible, 
      // or we handle Ankr's custom format if specified.
      
      let sats = 0;
      if (rpcUrl.includes("ankr.com")) {
        // Fallback for Ankr
        const response = await axios.post(rpcUrl, {
          jsonrpc: '2.0',
          id: 1,
          method: 'ankr_getAccountBalance',
          params: { walletAddress: address, blockchain: ['btc'] }
        });
        const btcAsset = response.data?.result?.assets?.find((a: any) => a.blockchain === 'btc');
        if (btcAsset) {
          return btcAsset.balance;
        }
      }

      // Default Esplora
      const esploraUrl = rpcUrl.includes("ankr") ? "https://blockstream.info/api/" : baseUrl + "/";
      const response = await axios.get(`${esploraUrl}address/${address}`);
      
      const stats = response.data.chain_stats;
      sats = (stats.funded_txo_sum - stats.spent_txo_sum) || 0;
      
      return (sats / 1e8).toFixed(8);
    } catch (e) {
      console.error(`Bitcoin Balance Fetch Error [${address}]:`, e);
      return "0.00";
    }
  }

  async broadcastTransaction(txHex: string, rpcUrl: string): Promise<string> {
    try {
      const esploraUrl = rpcUrl.includes("ankr") ? "https://blockstream.info/api/" : rpcUrl.replace(/\/$/, "") + "/";
      const response = await axios.post(`${esploraUrl}tx`, txHex, {
        headers: { 'Content-Type': 'text/plain' }
      });
      return response.data; // txid
    } catch (e: any) {
      throw new Error(`Bitcoin Broadcast Error: ${e.response?.data || e.message}`);
    }
  }

  async signAndBroadcast(txData: any, mnemonic: string, index: number, rpcUrl: string): Promise<string> {
    try {
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = bip32.fromSeed(seed, this.network);
      const child = root.derivePath(`${this.derivationPath}/${index}`);
      
      const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: this.network });
      if (!address) throw new Error("Failed to derive sender address.");

      const esploraUrl = rpcUrl.includes("ankr") ? "https://blockstream.info/api/" : rpcUrl.replace(/\/$/, "") + "/";
      
      // Fetch UTXOs
      const utxoRes = await axios.get(`${esploraUrl}address/${address}/utxo`);
      const utxos = utxoRes.data;
      if (!utxos || utxos.length === 0) throw new Error("No UTXOs available.");

      const psbt = new bitcoin.Psbt({ network: this.network });
      let inputSum = BigInt(0);
      const targetAmount = BigInt(parseInt(txData.value, 10));
      const fee = BigInt(5000); // Hardcoded basic fee for demonstration (in production, use mempool.space estimation)
      
      for (const utxo of utxos) {
        // Fetch raw tx hex for non-segwit or prevout for segwit
        const txRes = await axios.get(`${esploraUrl}tx/${utxo.txid}/hex`);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: this.network }).output!,
            value: BigInt(utxo.value),
          },
        });
        inputSum += BigInt(utxo.value);
        if (inputSum >= targetAmount + fee) break;
      }

      if (inputSum < targetAmount + fee) {
        throw new Error("Insufficient funds for Bitcoin transfer + fee.");
      }

      psbt.addOutput({
        address: txData.to,
        value: targetAmount,
      });

      const change = inputSum - targetAmount - fee;
      if (change > BigInt(546)) { // Dust threshold
        psbt.addOutput({
          address: address, // Send change back to self
          value: change,
        });
      }

      psbt.signAllInputs(child);
      psbt.finalizeAllInputs();
      const txHex = psbt.extractTransaction().toHex();

      return await this.broadcastTransaction(txHex, rpcUrl);
    } catch (e: any) {
      console.error("Bitcoin Sign & Broadcast Error:", e);
      throw new Error(`Bitcoin Execution Failed: ${e.message}`);
    }
  }

  isValidAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch {
      return false;
    }
  }
}
