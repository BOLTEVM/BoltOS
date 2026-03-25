// Boltwallet In-Page Provider (window.ows)
// Exposed to dApps for transaction signing and network interaction.

(function() {
  const provider = {
    isBoltwallet: true,
    request: async (args: any) => {
      console.log('Boltwallet Request:', args);
      
      // Handle common read-only requests locally or relay to content script
      if (args.method === 'eth_accounts') {
        // This will normally be handled by the background script's response
        // but we'll relay for approval
      }
      
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(7);
        
        const listener = (event: any) => {
          if (event.data?.source === 'bolt-provider' && event.data?.id === id) {
             window.removeEventListener('message', listener);
             if (event.data.error) reject(event.data.error);
             else resolve(event.data.result);
          }
        };
        
        window.addEventListener('message', listener);
        window.postMessage({ 
          source: 'bolt-provider', 
          id,
          payload: args 
        }, '*');
      });
    },
    on: (eventName: string, handler: Function) => {
       console.log('Boltwallet: Subscribed to', eventName);
    },
    removeListener: (eventName: string, handler: Function) => {
       console.log('Boltwallet: Unsubscribed from', eventName);
    },
    version: '1.0.0'
  };

  (window as any).ows = provider;
  // Shim for ethers/web3 detection
  (window as any).ethereum = provider; 
})();
