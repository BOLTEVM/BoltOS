// Boltwallet Extension Background Service Worker
import { DEFAULT_API_KEY } from './secrets.js';
// Manages vault session state, context menus, and recovery flows.
// @ts-ignore
const _chrome = (globalThis as any).chrome;

let sessionVault: any = null;
let lastActive = Date.now();
let sessionTimeoutLimit = 15 * 60 * 1000; // 15 minutes default
let logVerbosity = 'compact';

// Load initial settings from storage
// @ts-ignore
_chrome.storage.local.get(['bolt_session_timeout', 'bolt_log_verbosity'], (res) => {
  if (res.bolt_session_timeout) sessionTimeoutLimit = parseInt(res.bolt_session_timeout) * 60 * 1000;
  if (res.bolt_log_verbosity) logVerbosity = res.bolt_log_verbosity;
});

const backgroundLogs: any[] = [];
const logBackgroundEvent = (event: any) => {
  const safeId = (Math.random().toString(36) + '00000000').substring(2, 11);
  const log = {
    id: safeId,
    timestamp: Date.now(),
    ...event
  };
  backgroundLogs.push(log);
  if (backgroundLogs.length > 100) backgroundLogs.shift();
  // Notify any open popups
  // @ts-ignore
  _chrome.runtime.sendMessage({ type: 'BOLT_LOG_EVENT', log }).catch(() => {});
};

const CHAINS_RPC: Record<string, string> = {
  ethereum: "https://rpc.ankr.com/eth",
  bsc: "https://rpc.ankr.com/bsc",
  polygon: "https://rpc.ankr.com/polygon",
  pulsechain: "https://rpc.pulsechain.com",
  quai: "https://quaiscan.io/api/eth-rpc",
  monad: "https://rpc.ankr.com/monad",
  bitcoin: "https://rpc.ankr.com/btc",
  sui: "https://rpc.ankr.com/sui",
  xrpl_evm: "https://rpc-evm-sidechain.xrpl.org",
  tron_evm: "https://rpc.bittorrentchain.io",
  coredao: "https://rpc.coredao.org"
};

// @ts-ignore
_chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  // BOLT-SECURITY: Strict Origin & Identity Validation
  const isExtensionContext = sender.id === _chrome.runtime.id;
  const isInternalOrigin = sender.url?.startsWith(_chrome.runtime.getURL(''));
  
  if (!isExtensionContext && !isInternalOrigin) {
    logBackgroundEvent({
      type: 'security',
      status: 'warning',
      message: `Unauthorized Origin Blocked: ${sender.url || 'Unknown Source'}`,
      metadata: { origin: sender.url, senderId: sender.id }
    });
    return false;
  }

  if (message.type === 'BOLT_GET_SESSION') {
    if (sessionVault && (Date.now() - lastActive > sessionTimeoutLimit)) {
      sessionVault = null;
    }
    sendResponse({ session: sessionVault });
  } else if (message.type === 'BOLT_SET_SESSION') {
    sessionVault = message.session;
    lastActive = Date.now();
    sendResponse({ status: 'success' });
  } else if (message.type === 'BOLT_UPDATE_SETTINGS') {
    if (message.settings.sessionTimeout) {
      sessionTimeoutLimit = parseInt(message.settings.sessionTimeout) * 60 * 1000;
    }
    if (message.settings.logVerbosity) {
      logVerbosity = message.settings.logVerbosity;
    }
    sendResponse({ status: 'updated', sessionTimeoutLimit, logVerbosity });
  } else if (message.type === 'BOLT_LOCK_VAULT') {
    sessionVault = null;
    sendResponse({ status: 'locked' });
  } else if (message.type === 'BOLT_HEARTBEAT') {
    lastActive = Date.now();
    sendResponse({ status: 'alive' });
  } else if (message.type === 'BOLT_RPC_REQUEST') {
    lastActive = Date.now();
    const { id, payload } = message;
    
    // BOLT-SECURITY: RPC Method Validation
    const SENSITIVE_METHODS = ['eth_sendTransaction', 'personal_sign', 'eth_sign', 'eth_signTypedData_v4', 'eth_sendRawTransaction', 'sui_executeTransactionBlock'];
    const PUBLIC_METHODS = [
      'eth_accounts', 'eth_chainId', 'net_version', 'eth_blockNumber', 
      'eth_getBalance', 'eth_gasPrice', 'eth_estimateGas', 'eth_call', 
      'eth_getTransactionReceipt', 'eth_getTransactionByHash', 'eth_requestAccounts'
    ];

    if (SENSITIVE_METHODS.includes(payload.method)) {
       logBackgroundEvent({
         type: 'security',
         status: 'blocked',
         message: `Sensitive RPC method [${payload.method}] requires user approval (WIP)`,
         metadata: { method: payload.method, origin: sender.url }
       });
       sendResponse({ id, error: { message: "Method requires explicit user approval in Boltwallet UI." } });
       return true;
    }

    if (!PUBLIC_METHODS.includes(payload.method) && !payload.method.startsWith('sui_') && !payload.method.startsWith('quai_')) {
       // Log non-standard but potentially safe methods for observation
       if (logVerbosity === 'verbose') {
         console.warn(`Boltwallet: Non-standard RPC method called: ${payload.method}`);
       }
    }

    const executeRequest = async (rpcUrl: string) => {
      const startTime = Date.now();
      try {
        // Ensure API Key is not leaked in error messages or logs
        const urlToUse = rpcUrl.includes('rpc.ankr.com') ? `${rpcUrl}/${DEFAULT_API_KEY}` : rpcUrl;
        
        const response = await fetch(urlToUse, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.status === 403) throw new Error('RPC Provider Error: 403 Forbidden');
        const result = await response.json();
        
        // Use anonymized logging for security
        const rpcHost = rpcUrl && rpcUrl.includes('/') ? rpcUrl.split('/')[2] : (rpcUrl || 'unknown-rpc');
        logBackgroundEvent({
           type: 'rpc',
           status: 'success',
           message: `RPC [${payload.method}] via ${rpcHost}`,
           metadata: logVerbosity === 'verbose' ? { 
             method: payload.method, 
             duration: Date.now() - startTime, 
             origin: sender.url 
           } : { method: payload.method, duration: Date.now() - startTime }
        });

        sendResponse({ id, result: result.result, error: result.error });
      } catch (e: any) {
        logBackgroundEvent({
          type: 'rpc',
          status: 'error',
          message: `RPC [${payload.method}] failed: ${e.message}`,
          metadata: { method: payload.method, error: e.message }
        });
        sendResponse({ id, error: { message: "RPC communication error" } });
      }
    };

    if (message.rpcUrl) {
      executeRequest(message.rpcUrl);
    } else {
      // @ts-ignore
      _chrome.storage.local.get(['selectedChain'], (result: any) => {
        const chain = result.selectedChain || 'ethereum';
        const rpcUrl = CHAINS_RPC[chain] || CHAINS_RPC.ethereum;
        executeRequest(rpcUrl);
      });
    }
    return true; 
  } else if (message.type === 'BOLT_GET_LOGS') {
    sendResponse({ logs: backgroundLogs });
  }
  return true;
});

// Alarm for session timeout cleanup
// @ts-ignore
_chrome.alarms.create('checkSession', { periodInMinutes: 1 });
// @ts-ignore
_chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === 'checkSession') {
    if (Date.now() - lastActive > sessionTimeoutLimit) {
      sessionVault = null;
    }
  }
});

// @ts-ignore
_chrome.runtime.onInstalled.addListener(() => {
  // @ts-ignore
  _chrome.contextMenus.create({
    id: "recovery",
    title: "Forgot Password? Use Recovery Phrase",
    contexts: ["action"]
  });
});

// @ts-ignore
_chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
  if (info.menuItemId === "recovery") {
    // Open recovery in a separate tab if the popup is too small or inaccessible
    // @ts-ignore
    _chrome.tabs.create({ url: 'index.html#recovery' });
  }
});
