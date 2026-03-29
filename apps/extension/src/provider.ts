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
        const randStr = Math.random().toString(36);
        const id = randStr.substring(randStr.length - 7);
        
        const listener = (event: any) => {
          // BOLT-SECURITY: Validate response source and ID
          if (event.source !== window) return;
          
          if (event.data?.source === 'bolt-provider' && event.data?.id === id) {
             window.removeEventListener('message', listener);
             if (event.data.error) reject(event.data.error);
             else resolve(event.data.result);
          }
        };
        
        window.addEventListener('message', listener);
        
        // Use a more restricted postMessage to target only this window
        window.postMessage({ 
          source: 'bolt-provider', 
          id,
          payload: args 
        }, window.location.origin);
      });
    },
    on: (eventName: string, handler: Function) => {
       // Standard EventEmitter-like interface for dApps
    },
    removeListener: (eventName: string, handler: Function) => {
       // Standard cleanup for dApps
    },
    version: '1.0.0'
  };

  try {
    Object.freeze(provider); // Prevent dApps from modifying the provider object
    (window as any).ows = provider;
    (window as any).ethereum = provider; 
  } catch (e) {
    console.error('Boltwallet: Provider initialization failed', e);
  }
})();
