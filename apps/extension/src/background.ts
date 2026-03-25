// Boltwallet Extension Background Service Worker
// Manages vault session state and handles future-proofing for dApp interaction.

let sessionVault: any = null;
let lastActive = Date.now();
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

// @ts-ignore
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === 'BOLT_GET_SESSION') {
    if (Date.now() - lastActive > SESSION_TIMEOUT) {
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
