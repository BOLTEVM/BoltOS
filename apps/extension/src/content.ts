// Boltwallet Extension Content Script
// Injects the provider script into the page to enable dApp interaction.
// @ts-ignore
const _chrome = (globalThis as any).chrome || (window as any).chrome;
// Use _chrome throughout or just rely on the global chrome object.
// For safety across different environments, we'll use _chrome.

function injectProvider() {
  try {
    const script = document.createElement('script');
    // @ts-ignore
    script.src = _chrome.runtime.getURL('provider.js');
    script.setAttribute('async', 'false');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => {
      script.remove();
    };
  } catch (error) {
    console.error('Boltwallet: Provider injection failed', error);
  }
}

injectProvider();

// Listen for messages from the provider to forward to background (WYSIWYS security layer)
window.addEventListener('message', (event) => {
  // BOLT-SECURITY: Origin and Source Validation
  // We allow any origin for dApp compatibility, but ensure the message is from our own window.
  if (event.source !== window) return;
  
  if (event.data?.source === 'bolt-provider' && event.data?.payload) {
    const { id, payload } = event.data;

    // BOLT-SECURITY: Basic Payload Sanitization
    if (typeof payload !== 'object' || !payload.method) {
      console.warn('Boltwallet: Invalid RPC payload received', payload);
      return;
    }

    // Relay to background
    // @ts-ignore
    _chrome.runtime.sendMessage({ 
      type: 'BOLT_RPC_REQUEST', 
      id, 
      payload 
    }, (response: any) => {
      if (_chrome.runtime.lastError) {
        console.error('Boltwallet: Background communication failed', _chrome.runtime.lastError);
        return;
      }

      // BOLT-SECURITY: Restricted PostMessage
      // Send response back to the provider window securely.
      window.postMessage({ 
        source: 'bolt-provider', 
        id, 
        result: response?.result, 
        error: response?.error 
      }, window.location.origin);
    });
  }
});
