// Boltwallet In-Page Provider (window.ows)
// Exposed to dApps for transaction signing and network interaction.

(function() {
  const provider = {
    isBoltwallet: true,
    request: async (args: any) => {
      console.log('Boltwallet Request:', args);
      // Relay message to content script
      window.postMessage({ source: 'bolt-provider', payload: args }, '*');
    },
    version: '1.0.0'
  };

  (window as any).ows = provider;
  // Standard shim for EIP-1193 if desired in the future
  // (window as any).ethereum = provider; 
})();
