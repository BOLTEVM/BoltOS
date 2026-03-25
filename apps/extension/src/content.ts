// Boltwallet Extension Content Script
// Injects the provider script into the page to enable dApp interaction.

function injectProvider() {
  try {
    const script = document.createElement('script');
    // @ts-ignore
    script.src = chrome.runtime.getURL('provider.js');
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
  if (event.source !== window) return;
  if (event.data?.source === 'bolt-provider' && event.data?.payload) {
    // Relay to background
    const { id, payload } = event.data;
    // @ts-ignore
    chrome.runtime.sendMessage({ 
      type: 'BOLT_RPC_REQUEST', 
      id, 
      payload 
    }, (response: any) => {
      // Send response back to the provider window
      window.postMessage({ 
        source: 'bolt-provider', 
        id, 
        result: response?.result, 
        error: response?.error 
      }, '*');
    });
  }
});
