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
  if (event.data?.source === 'bolt-provider') {
    // Relay to background or popup
    console.info('Boltwallet Security: Intercepted dApp request', event.data.payload);
  }
});
