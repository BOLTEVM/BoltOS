export interface IChainProvider {
  /**
   * Derive a network-specific address from a BIP39 mnemonic.
   */
  deriveAddress(mnemonic: string, index: number): string;

  /**
   * Fetch the native balance for the given address.
   */
  getBalance(address: string, rpcUrl: string): Promise<string>;

  /**
   * Broadcast a signed transaction to the network.
   */
  broadcastTransaction(signature: string, rpcUrl: string): Promise<string>;

  /**
   * Builds, signs, and broadcasts a transaction natively for the VM.
   */
  signAndBroadcast(txData: any, mnemonic: string, index: number, rpcUrl: string): Promise<string>;

  /**
   * Check if a given address is valid for this network.
   */
  isValidAddress(address: string): boolean;
}
