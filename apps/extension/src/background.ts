// Boltwallet Extension Background Service Worker
// Manages vault session state and handles future-proofing for dApp interaction.

let sessionVault: any = null;
let lastActive = Date.now();
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// @ts-ignore
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === 'BOLT_GET_SESSION') {
    if (sessionVault && (Date.now() - lastActive > SESSION_TIMEOUT)) {
      sessionVault = null;
    }
    sendResponse({ session: sessionVault });
  } else if (message.type === 'BOLT_SET_SESSION') {
    sessionVault = message.session;
    lastActive = Date.now();
    sendResponse({ status: 'success' });
  } else if (message.type === 'BOLT_HEARTBEAT') {
    lastActive = Date.now();
    sendResponse({ status: 'alive' });
  } else if (message.type === 'BOLT_RPC_REQUEST') {
    // Future: Integrate BoltwalletCore here for background RPC handling
    // For now, relay back that we've received it
    lastActive = Date.now();
    // sendResponse({ status: 'pending', payload: message.payload });
  }
  return true;
});

// Alarm for session timeout cleanup
// @ts-ignore
chrome.alarms.create('checkSession', { periodInMinutes: 1 });
// @ts-ignore
chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === 'checkSession') {
    if (Date.now() - lastActive > SESSION_TIMEOUT) {
      sessionVault = null;
    }
  }
});
