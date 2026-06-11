import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Send, 
  Shield, 
  Cpu, 
  Zap, 
  Copy, 
  Trash2, 
  ChevronRight, 
  Lock,
  History,
  Search,
  RefreshCw,
  ExternalLink,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Settings,
  Menu,
  X,
  ChevronDown,
  Info,
  Eye,
  EyeOff,
  Key,
  ArrowLeft,
  User,
  Users,
  ShieldCheck,
  Palette,
  Banknote,
  Terminal,
  Download,
  Activity,
  ArrowDown,
  ArrowLeftRight,
  GitMerge
} from 'lucide-react';
import { Button } from '@boltwallet/ui';
import { NetworkIcon } from './components/NetworkIcons';
import { WalletData, ContractData, NFTData, CHAINS, HistoryData, LogEvent, BoltwalletCore, SwapQuote, SwapQuoteParams, parseQRPayload, fetchFromIPFS, fetchABI } from './ows/ows-core';
import { ethers } from 'ethers';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import BustaBoltApp from './components/BustaBoltApp';

const core = new BoltwalletCore() as any;

// Unified Storage Utility for Web & Extension
const boltStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
      return new Promise((resolve) => {
        (window as any).chrome.storage.local.get([key], (result: any) => {
          resolve(result[key] || localStorage.getItem(key));
        });
      });
    }
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    localStorage.setItem(key, value);
    if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
      await (window as any).chrome.storage.local.set({ [key]: value });
    }
  },
  removeItem: async (key: string) => {
    localStorage.removeItem(key);
    if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
      await (window as any).chrome.storage.local.remove([key]);
    }
  },
  clear: async () => {
    localStorage.clear();
    if (typeof window !== 'undefined' && (window as any).chrome?.storage?.local) {
      await (window as any).chrome.storage.local.clear();
    }
  }
};

const THEMES = [
  { id: 'bolt', primary: '#00D1FF', secondary: '#4F46E5', name: 'BOLT' },
  { id: 'cyber', primary: '#39FF14', secondary: '#BC13FE', name: 'CYBER' },
  { id: 'royal', primary: '#FFD700', secondary: '#FF0000', name: 'ROYAL' },
  { id: 'mono', primary: '#FFFFFF', secondary: '#444444', name: 'VAULT' },
  { id: 'glossy', primary: '#8338EC', secondary: '#00D1FF', name: 'GLOSSY' }
];

const ERC20_ABI = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"}]';
const ERC721_ABI = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"count","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"name":"owner","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"}]';

const QRScannerOverlay = ({ onScan, onClose }: { onScan: (text: string) => void, onClose: () => void }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 }, false);
    scanner.render((text) => {
      onScan(text);
      scanner.clear();
      onClose();
    }, (err) => {});
    return () => { scanner.clear().catch(e => {}); };
  }, []);
 
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-6">
      <div className="relative w-full max-w-sm aspect-square bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div id="qr-reader" className="w-full h-full" />
        <div className="absolute inset-0 border-2 border-bolt-blue/50 pointer-events-none rounded-3xl animate-pulse" />
      </div>
      <button onClick={onClose} className="mt-8 px-8 py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all">Close Scanner</button>
    </div>
  );
};

interface AppDefinition {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  bootSteps: string[];
}

const APPS: Record<string, AppDefinition> = {
  wallet: {
    id: 'wallet',
    title: 'Bolt Wallet',
    icon: Wallet,
    color: '#00D1FF',
    defaultWidth: 420,
    defaultHeight: 700,
    bootSteps: [
      'Mounting secure local enclave...',
      'Verifying key store signature...',
      'Attaching OWS cryptoprovider...',
      'Connecting to Monad RPC nodes...',
      'Syncing asset balances...',
      'Bolt Wallet active.'
    ]
  },
  bustabolt: {
    id: 'bustabolt',
    title: 'BustaBolt Game',
    icon: Activity,
    color: '#C084FC',
    defaultWidth: 900,
    defaultHeight: 600,
    bootSteps: [
      'Establishing socket connections...',
      'Retrieving gaming contract ABI...',
      'Mapping random seed generators...',
      'Pre-loading graphical textures...',
      'Game engine synchronized.'
    ]
  },
  logs: {
    id: 'logs',
    title: 'Telemetry Log Console',
    icon: Terminal,
    color: '#4ADE80',
    defaultWidth: 700,
    defaultHeight: 480,
    bootSteps: [
      'Binding debug event listeners...',
      'Allocating circular memory log buffer...',
      'Compiling telemetry reports...',
      'Console stream initialized.'
    ]
  },
  settings: {
    id: 'settings',
    title: 'Vault Settings',
    icon: Settings,
    color: '#FB923C',
    defaultWidth: 700,
    defaultHeight: 600,
    bootSteps: [
      'Authenticating system settings access...',
      'Parsing local preferences...',
      'Loading visual theme registry...',
      'Settings configurations active.'
    ]
  }
};

const DesktopWindow = ({ 
  id, 
  title, 
  onClose, 
  isActive, 
  onFocus, 
  isMinimized, 
  onMinimize, 
  children, 
  defaultWidth = 800, 
  defaultHeight = 550,
  launchState,
  launchProgress,
  launchLogs,
  skipBoot
}: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newWidth = Math.max(320, startW + deltaX);
      const newHeight = Math.max(300, startH + deltaY);
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const appColor = APPS[id]?.color || '#00D1FF';

  return (
    <motion.div 
      drag={!isMaximized}
      dragHandleClassName="window-drag-handle"
      dragMomentum={false}
      dragElastic={0}
      initial={{ 
        scale: 0.95, 
        opacity: 0, 
        x: id === 'wallet' ? 80 : id === 'bustabolt' ? 420 : id === 'settings' ? 300 : 220, 
        y: id === 'wallet' ? 40 : id === 'bustabolt' ? 60 : id === 'settings' ? 100 : 120 
      }}
      animate={isMinimized ? { scale: 0.8, opacity: 0, y: 150 } : { scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={onFocus}
      style={{ 
        width: isMaximized ? '100%' : size.width, 
        height: isMaximized ? 'calc(100vh - 120px)' : size.height, 
        zIndex: isActive ? 50 : 20,
        position: 'absolute',
        top: isMaximized ? 0 : undefined,
        left: isMaximized ? 0 : undefined,
        pointerEvents: isMinimized ? 'none' : 'auto',
      }}
      className={`glass-glossy flex flex-col rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-200 ${isActive ? 'shadow-[0_0_30px_rgba(0,209,255,0.08)] border-white/20' : ''}`}
    >
      {/* Window Title Bar */}
      <div 
        className="window-drag-handle flex items-center justify-between pl-5 bg-white/[0.03] border-b border-white/5 cursor-move select-none"
        onDoubleClick={() => setIsMaximized(!isMaximized)}
      >
        <div className="flex items-center gap-2.5 pointer-events-none py-2.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? appColor : '#4b5563' }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{title}</span>
        </div>
        
        {/* Retro Windows 10 Controls */}
        <div className="flex items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onMinimize(); }} 
            className="w-11 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Minimize"
          >
            <span className="text-[14px] leading-none select-none font-bold">―</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }} 
            className="w-11 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={isMaximized ? "Restore Down" : "Maximize"}
          >
            {isMaximized ? (
              <span className="text-[12px] leading-none select-none font-black">🗗</span>
            ) : (
              <span className="text-[12px] leading-none select-none font-bold">▢</span>
            )}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="w-11 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-red-600 hover:text-white transition-colors"
            title="Close"
          >
            <span className="text-[18px] leading-none select-none font-light">×</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0 bg-black/25 relative">
        {launchState === 'launching' ? (
          <div className="absolute inset-0 z-50 bg-[#06070a]/95 flex flex-col items-center justify-center p-8 text-center font-mono">
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" 
                style={{ borderColor: `${appColor} rgba(255,255,255,0.05) rgba(255,255,255,0.05)`, borderTopColor: 'transparent' }} 
              />
              <span className="text-xs font-black" style={{ color: appColor }}>{launchProgress}%</span>
            </div>
            
            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/80 mb-5">
              Booting {title}
            </h3>

            <div className="w-full max-w-xs h-28 bg-black/40 border border-white/5 rounded-xl p-3.5 overflow-y-auto text-left text-[8px] text-white/50 space-y-1 scrollbar-hide">
              {launchLogs?.map((log: string, idx: number) => (
                <div key={idx} className="truncate select-none">
                  {log.startsWith('[OK]') ? (
                    <span className="text-green-400 font-bold mr-1.5">[OK]</span>
                  ) : log.startsWith('[SYS]') ? (
                    <span className="text-blue-400 font-bold mr-1.5">[SYS]</span>
                  ) : null}
                  {log.replace(/^\[(OK|SYS)\]\s*/, '')}
                </div>
              ))}
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); skipBoot(); }} 
              className="mt-5 px-3 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-[7px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
            >
              Skip Init
            </button>
          </div>
        ) : null}

        <div className={`w-full h-full transition-opacity duration-300 ${launchState === 'launching' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {children}
        </div>
      </div>

      {/* Resize Handle */}
      {!isMaximized && (
        <div 
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize z-50 flex items-end justify-end p-0.5"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" className="text-white/20 hover:text-white/60 transition-colors">
            <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="8" y1="5" x2="5" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="8" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </motion.div>
  );
};

const App = () => {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [settingsTab, setSettingsTab] = useState<'general' | 'appearance' | 'currency' | 'logs' | 'extension'>('general');
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [sessionTimeout, setSessionTimeout] = useState(15); // minutes
  const [logVerbosity, setLogVerbosity] = useState<'compact' | 'verbose'>('compact');
  const [customColors, setCustomColors] = useState({ primary: '#00D1FF', secondary: '#4F46E5' });
  const [showVaultAnimation, setShowVaultAnimation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showNetworks, setShowNetworks] = useState(false);
  const [activeWallet, setActiveWallet] = useState<WalletData | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [currentThemeIdx, setCurrentThemeIdx] = useState(0);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [showContracts, setShowContracts] = useState(false);
  const [showImportContract, setShowImportContract] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [importContractType, setImportContractType] = useState<'erc20' | 'custom'>('erc20');
  const [newContractName, setNewContractName] = useState('');
  const [newContractAddress, setNewContractAddress] = useState('');
  const [newContractAbi, setNewContractAbi] = useState('');
  const [newContractDecimals, setNewContractDecimals] = useState('18');
  const [contractMethod, setContractMethod] = useState('');
  const [contractArgs, setContractArgs] = useState('');
  const [contractBalances, setContractBalances] = useState<Record<string, string>>({});
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [showNFTs, setShowNFTs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [showImportNFT, setShowImportNFT] = useState(false);
  const [importNFTType, setImportNFTType] = useState<'erc721' | 'custom'>('erc721');
  const [newNFTName, setNewNFTName] = useState('');
  const [newNFTAddress, setNewNFTAddress] = useState('');
  const [newNFTTokenId, setNewNFTTokenId] = useState('');
  const [newNFTAbi, setNewNFTAbi] = useState('');
  const [sendTab, setSendTab] = useState<'token' | 'nft'>('token');
  const [sendAsset, setSendAsset] = useState<string>('native');
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState('<$0.01');
  const [simulationStatus, setSimulationStatus] = useState<'success' | 'warning' | 'error'>('success');
  const [txStatus, setTxStatus] = useState<'idle' | 'transferring' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [isVaultPrepared, setIsVaultPrepared] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showMnemonicPlain, setShowMnemonicPlain] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [proposedTx, setProposedTx] = useState<any>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [nativeBalances, setNativeBalances] = useState<Record<string, string>>({});
  const [totalUSD, setTotalUSD] = useState('0.00');
  const [gasSettings, setGasSettings] = useState({
    priorityFee: '2',
    maxFee: '40',
    gasLimit: '21000',
    speed: 'average'
  });
  const [gasEstimates, setGasEstimates] = useState<any>(null);
  const [showGasModal, setShowGasModal] = useState(false);
  const [showCustomGasModal, setShowCustomGasModal] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryMnemonic, setRecoveryMnemonic] = useState(Array(12).fill(''));
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolvingENS, setIsResolvingENS] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [bridgeFromChain, setBridgeFromChain] = useState('ethereum');
  const [bridgeToChain, setBridgeToChain] = useState('monad');
  const [bridgeAmount, setBridgeAmount] = useState('');
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeQuote, setBridgeQuote] = useState<SwapQuote | null>(null);
  const [swapFromAsset, setSwapFromAsset] = useState('MON');
  const [swapToAsset, setSwapToAsset] = useState('USDC');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSlippage, setSwapSlippage] = useState(0.005); // 0.5% default
  const [swapError, setSwapError] = useState('');
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [showBustaBolt, setShowBustaBolt] = useState(false);
  const [openApps, setOpenApps] = useState<string[]>(['wallet']);
  const [activeApp, setActiveApp] = useState<string>('wallet');
  const [minimizedApps, setMinimizedApps] = useState<string[]>([]);
  const [appLaunchStates, setAppLaunchStates] = useState<Record<string, 'idle' | 'launching' | 'ready'>>({});
  const [appLaunchProgress, setAppLaunchProgress] = useState<Record<string, number>>({});
  const [appLaunchLogs, setAppLaunchLogs] = useState<Record<string, string[]>>({});
  const [skipBootAnimation, setSkipBootAnimation] = useState<boolean>(() => {
    return localStorage.getItem('boltos_skip_boot') === 'true';
  });

  const addCustomLog = (type: string, message: string, status: 'info' | 'success' | 'warning' | 'error' = 'info', metadata?: any) => {
    const newLog: LogEvent = {
      id: Math.random().toString(),
      type,
      message,
      status,
      timestamp: Date.now(),
      metadata
    } as any;
    setLogs(prev => [...prev, newLog].slice(-100));
  };
  const [customNetworks, setCustomNetworks] = useState<any[]>([]);
  const [newNetwork, setNewNetwork] = useState({ name: '', id: '', rpc: '', explorer: '', currencySymbol: '', currencyName: '', decimals: 18 });

  // Boot telemetry progression effect
  useEffect(() => {
    openApps.forEach(appId => {
      if (!appLaunchStates[appId]) {
        if (skipBootAnimation) {
          setAppLaunchStates(prev => ({ ...prev, [appId]: 'ready' }));
        } else {
          setAppLaunchStates(prev => ({ ...prev, [appId]: 'launching' }));
          setAppLaunchProgress(prev => ({ ...prev, [appId]: 0 }));
          setAppLaunchLogs(prev => ({ ...prev, [appId]: ['[SYS] Initializing launch thread...'] }));
        }
      }
    });
  }, [openApps, skipBootAnimation]);

  useEffect(() => {
    const launchingApps = Object.keys(appLaunchStates).filter(id => appLaunchStates[id] === 'launching');
    if (launchingApps.length === 0) return;

    const interval = setInterval(() => {
      launchingApps.forEach(appId => {
        const currentProgress = appLaunchProgress[appId] ?? 0;
        if (currentProgress >= 100) {
          setAppLaunchStates(prev => ({ ...prev, [appId]: 'ready' }));
        } else {
          const newProgress = Math.min(100, currentProgress + 10);
          setAppLaunchProgress(prev => ({ ...prev, [appId]: newProgress }));

          const appDef = APPS[appId];
          if (appDef) {
            const stepIndex = Math.floor((newProgress / 100) * appDef.bootSteps.length);
            const logsToAdd = appDef.bootSteps.slice(0, Math.max(1, stepIndex));
            setAppLaunchLogs(prev => ({
              ...prev,
              [appId]: [
                '[SYS] Bootstrapping system architecture...',
                ...logsToAdd.map(step => `[OK] ${step}`),
                ...(newProgress === 100 ? ['[SYS] Core process launched. Handshaking complete.'] : [])
              ]
            }));
          }
        }
      });
    }, 200);

    return () => clearInterval(interval);
  }, [appLaunchStates, appLaunchProgress]);

  const handleDockClick = (appId: string) => {
    if (!openApps.includes(appId)) {
      setOpenApps(prev => [...prev, appId]);
      setMinimizedApps(prev => prev.filter(id => id !== appId));
      setActiveApp(appId);
    } else if (minimizedApps.includes(appId)) {
      setMinimizedApps(prev => prev.filter(id => id !== appId));
      setActiveApp(appId);
    } else if (activeApp === appId) {
      setMinimizedApps(prev => [...prev, appId]);
      const remainingOpen = openApps.filter(id => id !== appId && !minimizedApps.includes(id));
      if (remainingOpen.length > 0) {
        setActiveApp(remainingOpen[remainingOpen.length - 1]);
      } else {
        setActiveApp('');
      }
    } else {
      setActiveApp(appId);
    }
  };

  const renderSettingsContent = () => {
    return (
      <div className="h-full flex flex-col p-6 text-white overflow-hidden bg-black/10 select-none">
        {/* Settings Tabs */}
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-[22px] mb-6 relative z-10 border border-white/5">
          {[
             { id: 'general', icon: ShieldCheck, label: 'Vault' },
             { id: 'appearance', icon: Palette, label: 'Look' },
             { id: 'currency', icon: Banknote, label: 'Cash' },
             { id: 'extension', icon: Cpu, label: 'Bolt' },
             { id: 'logs', icon: Terminal, label: 'Logs' }
          ].filter(t => t.id !== 'extension' || isPopup).map(tab => (
            <button
              key={tab.id}
              onClick={() => setSettingsTab(tab.id as any)}
              className={`flex-1 py-3 px-2 rounded-[18px] transition-all duration-500 flex flex-col items-center gap-1.5 relative group ${settingsTab === tab.id ? 'bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'hover:bg-white/[0.03]'}`}
            >
              <tab.icon className={`w-4 h-4 transition-all duration-300 ${settingsTab === tab.id ? 'scale-110' : 'text-gray-500 group-hover:text-gray-300'}`} style={{ color: settingsTab === tab.id ? theme.primary : undefined }} />
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all ${settingsTab === tab.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'}`}>{tab.label}</span>
              {settingsTab === tab.id && (
                 <motion.div layoutId="activeTab" className="absolute -bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }} />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-hide">
          {settingsTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="relative">
                <div className="flex justify-between items-center mb-4">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Security Phrase</p>
                   <div className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/20 text-[7px] font-black text-green-500 uppercase tracking-widest">Encrypted</div>
                </div>
                
                <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 relative overflow-hidden group shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                  
                  <div className={`grid grid-cols-3 gap-3 transition-all duration-700 ${!showMnemonicPlain ? 'blur-2xl opacity-20 scale-95 select-none' : 'opacity-100 scale-100'}`}>
                    {(showMnemonicPlain ? (mnemonic || "word ".repeat(12)).split(' ') : Array(12).fill('••••')).map((word, i) => (
                      <div key={i} className="bg-white/5 rounded-xl py-2.5 px-3 border border-white/5 flex flex-col items-center gap-1 group/word hover:bg-white/10 transition-all">
                         <span className="text-[7px] font-black text-gray-700 uppercase">{i + 1}</span>
                         <span className="text-[11px] font-black tracking-tight" style={{ color: theme.primary }}>{word}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={async () => {
                      if (!showMnemonicPlain && !mnemonic) {
                        const mnemon = await core.getSession();
                        setMnemonic(mnemon || '');
                      }
                      setShowMnemonicPlain(!showMnemonicPlain);
                    }}
                    className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 z-20 ${showMnemonicPlain ? 'opacity-0 pointer-events-none' : 'bg-black/40 backdrop-blur-md opacity-100'}`}
                  >
                     <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 shadow-2xl group-hover:scale-110 transition-transform">
                        <Eye className="w-6 h-6 text-white" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Reveal Vault Phrase</span>
                  </button>
                </div>

                {showMnemonicPlain && (
                   <div className="flex justify-center mt-4">
                      <button onClick={() => setShowMnemonicPlain(false)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                         <EyeOff className="w-3 h-3 text-gray-500" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Hide Phrase</span>
                      </button>
                   </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center justify-between p-5 rounded-[24px] bg-white/[0.03] border border-white/5">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">OS Boot Telemetry</p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider">Skip app loading sequences on launch</p>
                  </div>
                  <button 
                    onClick={() => {
                      const val = !skipBootAnimation;
                      setSkipBootAnimation(val);
                      localStorage.setItem('boltos_skip_boot', val ? 'true' : 'false');
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${skipBootAnimation ? 'bg-bolt-blue' : 'bg-white/10 border border-white/10'}`}
                    style={{ backgroundColor: skipBootAnimation ? theme.primary : undefined }}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-all duration-300 ${skipBootAnimation ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                     <p className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.3em]">Danger Zone</p>
                     <div className="h-[1px] flex-1 bg-red-500/10" />
                  </div>
                  <Button 
                    variant="glass" 
                    className="w-full border-red-500/10 text-red-500/80 hover:text-red-400 hover:bg-red-500/10 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all" 
                    onClick={handleResetVault}
                  >
                     <Trash2 className="w-4 h-4 opacity-50" />
                     Reset Vault Data
                  </Button>
              </div>
            </div>
          )}
          {settingsTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Master Themes</p>
                <div className="grid grid-cols-2 gap-4">
                  {THEMES.map((t, idx) => (
                    <motion.div 
                      key={t.id}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentThemeIdx(idx)}
                      className={`p-5 rounded-[28px] border-2 cursor-pointer transition-all flex flex-col items-center gap-4 relative overflow-hidden group ${currentThemeIdx === idx ? 'bg-white/10 border-white/20 shadow-2xl' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 blur-2xl rounded-full -mr-8 -mt-8 opacity-20" style={{ backgroundColor: t.primary }} />
                      <div className="w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-transform group-hover:rotate-12" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}>
                         <Palette className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase">{t.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Engine Overrides</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-6 rounded-[24px] bg-white/[0.03] border border-white/5 group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: customColors.primary }} />
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Primary Core</span>
                    </div>
                    <input 
                      type="color" 
                      value={customColors.primary} 
                      onChange={(e) => setCustomColors({ ...customColors, primary: e.target.value })}
                      className="bg-transparent border-none w-10 h-10 cursor-pointer rounded-2xl overflow-hidden shadow-2xl"
                    />
                  </div>
                  <div className="flex items-center justify-between p-6 rounded-[24px] bg-white/[0.03] border border-white/5 group hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: customColors.secondary }} />
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accent Glow</span>
                    </div>
                    <input 
                      type="color" 
                      value={customColors.secondary} 
                      onChange={(e) => setCustomColors({ ...customColors, secondary: e.target.value })}
                      className="bg-transparent border-none w-10 h-10 cursor-pointer rounded-2xl overflow-hidden shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'currency' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Settlement Currency</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'USD', name: 'US Dollar', icon: '🇺🇸' },
                    { id: 'EUR', name: 'Euro', icon: '🇪🇺' },
                    { id: 'GBP', name: 'British Pound', icon: '🇬🇧' },
                    { id: 'JPY', name: 'Japanese Yen', icon: '🇯🇵' },
                    { id: 'CNY', name: 'Chinese Yuan', icon: '🇨🇳' },
                    { id: 'BTC', name: 'Bitcoin', icon: '₿' },
                    { id: 'ETH', name: 'Ethereum', icon: 'Ξ' }
                  ].map(c => (
                    <motion.div 
                      key={c.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setSelectedCurrency(c.id)}
                      className={`p-5 rounded-[24px] border transition-all cursor-pointer flex items-center justify-between group ${selectedCurrency === c.id ? 'bg-white/10 border-white/20 shadow-xl' : 'bg-white/[0.03] border-transparent hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                            {c.icon}
                         </div>
                         <div>
                            <p className="text-xs font-black text-white">{c.name}</p>
                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{c.id}</p>
                         </div>
                      </div>
                      {selectedCurrency === c.id && (
                         <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10" style={{ color: theme.primary }}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'logs' && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                   <Activity className="w-4 h-4 text-gray-500 animate-pulse" />
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Telemetry Stream</p>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => setLogs([])} className="text-[9px] font-black text-red-500/60 uppercase tracking-widest hover:text-red-400 transition-colors">Wipe Console</button>
                   <button className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest hover:text-blue-400 transition-colors flex items-center gap-1.5">
                      <Download className="w-3 h-3" />
                      Export
                   </button>
                </div>
              </div>
              <div className="flex-1 bg-[#050608] rounded-[32px] border border-white/5 p-6 font-mono text-[9px] overflow-y-auto space-y-4 min-h-[300px] shadow-inner scrollbar-hide">
                {!logs || logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4">
                     <RefreshCw className="w-10 h-10 animate-spin-slow" />
                     <p className="uppercase tracking-[0.5em] font-black text-xs">Awaiting Network Events...</p>
                  </div>
                ) : (
                  (logs || []).slice().reverse().map(log => (
                    <div key={log?.id || Math.random().toString()} className="border-b border-white/[0.02] pb-4 last:border-0 group/log">
                      <div className="flex items-center gap-3 mb-2">
                         <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg ${
                           log?.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                           log?.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 
                           log?.status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 
                           'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                         }`}>{log?.type || 'event'}</span>
                         <span className="text-gray-700 text-[8px] font-black italic">{log?.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '...'}</span>
                         <div className="h-[1px] flex-1 bg-white/[0.02] group-hover/log:bg-white/[0.05] transition-colors" />
                      </div>
                      <p className="text-gray-400 leading-relaxed pl-1">{log?.message || 'Empty Log Message'}</p>
                      {log?.metadata && (
                        <pre className="text-[7px] text-gray-600 mt-3 bg-white/[0.02] p-4 rounded-2xl overflow-x-auto border border-white/[0.02] group-hover/log:border-white/[0.05] transition-all">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {settingsTab === 'extension' && isPopup && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Session Security</p>
                </div>
                <div className="space-y-4">
                  <div className="p-6 rounded-[28px] bg-white/[0.03] border border-white/5 space-y-4 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auto-Lock Timer</span>
                      <span className="text-[11px] font-black" style={{ color: theme.primary }}>{sessionTimeout} Minutes</span>
                    </div>
                    <input 
                      type="range" min="5" max="60" step="5"
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-current" 
                      style={{ color: theme.primary }}
                    />
                    <div className="flex justify-between text-[7px] font-black text-gray-600 uppercase">
                      <span>5m</span>
                      <span>15m</span>
                      <span>30m</span>
                      <span>60m</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="pt-8 border-t border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Telemetry & Verbosity</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => setLogVerbosity('compact')}
                     className={`p-5 rounded-[24px] border transition-all flex flex-col gap-2 ${logVerbosity === 'compact' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent opacity-40 hover:opacity-100'}`}
                   >
                      <span className="text-[10px] font-black text-white uppercase tracking-widest text-left">Compact</span>
                      <span className="text-[8px] text-gray-500 text-left">Summary only</span>
                   </button>
                   <button 
                     onClick={() => setLogVerbosity('verbose')}
                     className={`p-5 rounded-[24px] border transition-all flex flex-col gap-2 ${logVerbosity === 'verbose' ? 'bg-white/10 border-white/20 shadow-lg shadow-black/20' : 'bg-white/5 border-transparent opacity-40 hover:opacity-100'}`}
                   >
                      <span className="text-[10px] font-black text-white uppercase tracking-widest text-left" style={{ color: logVerbosity === 'verbose' ? theme.primary : undefined }}>Verbose</span>
                      <span className="text-[8px] text-gray-500 text-left">Full RPC meta</span>
                   </button>
                </div>
              </section>
            </div>
          )}
        </div>
        <div className="mt-6 pt-4 border-t border-white/5">
           <Button onClick={() => setOpenApps(prev => prev.filter(x => x !== 'settings'))} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[9px]" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}>Done</Button>
        </div>
      </div>
    );
  };

  const theme = THEMES[currentThemeIdx];

  const baseChains = [
    { id: 'ethereum', name: 'Ethereum', icon: <NetworkIcon chainId="ethereum" className="w-4 h-4" /> },
    { id: 'bitcoin', name: 'Bitcoin', icon: <NetworkIcon chainId="bitcoin" className="w-4 h-4" /> },
    { id: 'bsc', name: 'BNB Chain', icon: <NetworkIcon chainId="bsc" className="w-4 h-4" /> },
    { id: 'polygon', name: 'Polygon', icon: <NetworkIcon chainId="polygon" className="w-4 h-4" /> },
    { id: 'pulsechain', name: 'PulseChain', icon: <NetworkIcon chainId="pulsechain" className="w-4 h-4" /> },
    { id: 'quai', name: 'Quai Network', icon: <NetworkIcon chainId="quai" className="w-4 h-4" /> },
    { id: 'monad', name: 'Monad', icon: <NetworkIcon chainId="monad" className="w-4 h-4" /> },
    { id: 'sui', name: 'Sui', icon: <NetworkIcon chainId="sui" className="w-4 h-4" /> },
    { id: 'xrpl_evm', name: 'XRPL EVM', icon: <NetworkIcon chainId="xrpl" className="w-4 h-4" /> },
    { id: 'tron_evm', name: 'TRON EVM', icon: <NetworkIcon chainId="tron" className="w-4 h-4" /> },
    { id: 'coredao', name: 'CORE', icon: <NetworkIcon chainId="coredao" className="w-4 h-4" /> },
  ];

  const chains = [
    ...baseChains,
    ...customNetworks.map(cn => ({ id: cn.id, name: cn.name, icon: <ArrowLeftRight className="w-4 h-4" /> }))
  ];

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#recovery') {
        setShowRecovery(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const popup = window.innerWidth < 600 || !!(window as any).chrome?.runtime?.id;
      setIsPopup(popup);
      document.documentElement.classList.toggle('is-popup', popup);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const loadSettings = async () => {
      const timeout = await boltStorage.getItem('bolt_session_timeout');
      const verbosity = await boltStorage.getItem('bolt_log_verbosity');
      if (timeout) setSessionTimeout(parseInt(timeout));
      if (verbosity) setLogVerbosity(verbosity as any);
      
      // Load persisted theme
      const savedTheme = localStorage.getItem('bolt_theme_id');
      if (savedTheme) {
        const idx = THEMES.findIndex(t => t.id === savedTheme);
        if (idx !== -1) setCurrentThemeIdx(idx);
      }
      
      const savedNetworksStr = await boltStorage.getItem('bolt_custom_networks');
      if (savedNetworksStr) {
        try {
          const networks = JSON.parse(savedNetworksStr);
          setCustomNetworks(networks);
          networks.forEach((n: any) => {
            core.addCustomChain(n.id, {
              name: n.name,
              id: n.id,
              rpc: n.rpc,
              explorer: n.explorer,
              nativeCurrency: { name: n.currencyName, symbol: n.currencySymbol, decimals: n.decimals },
              derivationPath: "m/44'/60'/0'/0/0"
            });
          });
        } catch (e) { console.error('Failed to parse custom networks'); }
      }
    };

    const initSecurity = async () => {
      // 1. Restore persistent settings
      const savedChain = await boltStorage.getItem('selectedChain');
      if (savedChain) {
        setSelectedChain(savedChain);
        core.setChain(savedChain);
      }

      const savedCurrency = await boltStorage.getItem('bolt_currency');
      if (savedCurrency) setSelectedCurrency(savedCurrency);

      const savedColors = await boltStorage.getItem('bolt_custom_colors');
      if (savedColors) setCustomColors(JSON.parse(savedColors));

      // 2. Check for background session
      // @ts-ignore
      if (window.chrome?.runtime?.id) {
         // @ts-ignore
         window.chrome.runtime.sendMessage({ type: 'BOLT_GET_SESSION' }, async (response: any) => {
            if (response?.session) {
               await core.setSession(response.session);
               setIsLocked(false);
               const loadedWallets = await core.getWallets();
               setWallets(loadedWallets);
            }
         });
      }

      const prepared = await core.isVaultSetup();
      setIsVaultPrepared(prepared);
      if (prepared) {
        setIsLocked(await core.isVaultLocked());
      } else {
        setIsLocked(true);
      }
    };

    loadSettings();
    initSecurity();

    // Subscribe to local logs
    const unsubscribeLogs = (core as any).onLogs ? (core as any).onLogs((newLogs: any[]) => {
       setLogs(prev => [...prev, ...newLogs].slice(-100));
    }) : null;

    // Fetch and Listen to Background logs
    const extensionChrome = (window as any).chrome;
    if (typeof extensionChrome !== 'undefined' && extensionChrome.runtime?.sendMessage) {
       extensionChrome.runtime.sendMessage({ type: 'BOLT_GET_LOGS' }, (response: any) => {
          if (response?.logs) setLogs(prev => [...prev, ...response.logs].slice(-100));
       });

       const handleBackgroundLog = (msg: any) => {
          if (msg.type === 'BOLT_LOG_EVENT') {
             setLogs(prev => [...prev, msg.log].slice(-100));
          }
       };
       extensionChrome.runtime.onMessage.addListener(handleBackgroundLog);
    }

    core.getWallets().then(setWallets);
    core.listContracts().then(setContracts);
    core.listNFTs().then(setNfts);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []);

  useEffect(() => {
    boltStorage.setItem('bolt_session_timeout', sessionTimeout.toString());
    boltStorage.setItem('bolt_log_verbosity', logVerbosity);
    
    if (isPopup && (window as any).chrome?.runtime?.sendMessage) {
      (window as any).chrome.runtime.sendMessage({ 
        type: 'BOLT_UPDATE_SETTINGS', 
        settings: { sessionTimeout, logVerbosity } 
      }).catch(() => {});
    }
  }, [sessionTimeout, logVerbosity, isPopup]);

  useEffect(() => {
    if (contracts.length > 0 && activeWallet?.address) {
      const relevantContracts = contracts.filter(c => c.chainId === selectedChain);
      relevantContracts.forEach(async (c) => {
        try {
          const balance = await core.getContractBalance(c.address, activeWallet.address, c.decimals);
          setContractBalances(prev => ({ ...prev, [c.address]: balance || "0.00" }));
        } catch (err) {
          console.warn(`Failed to fetch balance for ${c.name}:`, err);
        }
      });
    }
  }, [contracts, activeWallet, selectedChain, selectedChain]);

  // Price & Balance Synchronization
  useEffect(() => {
    if (isLocked) return;

    const syncData = async () => {
      try {
        const newPrices = await core.getAssetPrices();
        setPrices(newPrices);

        const balances: Record<string, string> = {};
        for (const w of (wallets || [])) {
          if (!w?.address || w.address === '0x0000000000000000000000000000000000000000') continue;
          const bal = await core.getNativeBalance(w.address);
          balances[w.id] = bal || "0.00";
        }
        setNativeBalances(balances);

        let total = 0;
        const nativePrice = newPrices[selectedChain] || 0;
        Object.values(balances).forEach(bal => {
          const val = parseFloat(bal as string);
          if (!isNaN(val)) total += val * nativePrice;
        });

        // Add contract balances to total (assuming $1 for tokens if price not found, for simplified but non-zero view)
        // Only include contracts for the active chain
        Object.entries(contractBalances).forEach(([addr, bal]) => {
           const contract = contracts.find(c => c.address === addr);
           if (!contract || contract.chainId !== selectedChain) return;
           
           const tokenPrice = newPrices[addr] || 1; 
           const val = parseFloat(bal as string);
           if (!isNaN(val)) total += val * tokenPrice;
        });

        // Currency Conversion Logic
        const fxRates: Record<string, number> = { 'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 151, 'CNY': 7.23, 'BTC': 1 / (newPrices['bitcoin'] || 65000), 'ETH': 1 / (newPrices['ethereum'] || 3500) };
        const rate = fxRates[selectedCurrency] || 1;
        const convertedTotal = total * rate;

        const symbols: Record<string, string> = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥', 'BTC': '₿', 'ETH': 'Ξ' };
        const symbol = symbols[selectedCurrency] || '';
        
        setTotalUSD(`${symbol}${convertedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

        if (activeWallet) {
          const hist = await core.getHistory(activeWallet.address, 'all');
          setHistory(hist);
        }
      } catch (err) {
        console.error("Sync Error:", err);
      }
    };

    syncData();
    const interval = setInterval(syncData, 15000); // 15s refresh
    return () => clearInterval(interval);
  }, [isLocked, selectedChain, wallets, contractBalances, activeWallet, selectedCurrency]);

  // Settings Persistence Hooks
  useEffect(() => {
    boltStorage.setItem('selectedChain', selectedChain);
  }, [selectedChain]);

  useEffect(() => {
    boltStorage.setItem('bolt_currency', selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    boltStorage.setItem('bolt_custom_colors', JSON.stringify(customColors));
  }, [customColors]);

  const cycleTheme = () => {
    const nextIdx = (currentThemeIdx + 1) % THEMES.length;
    setCurrentThemeIdx(nextIdx);
    localStorage.setItem('bolt_theme_id', THEMES[nextIdx].id);
  };

  useEffect(() => {
    const resolveENS = async () => {
      if (recipient.includes('.')) {
        setIsResolvingENS(true);
        try {
          const address = await core.resolveName(recipient);
          setResolvedAddress(address);
        } catch (err) {
          console.error("ENS Error:", err);
          setResolvedAddress(null);
        } finally {
          setIsResolvingENS(false);
        }
      } else {
        setResolvedAddress(null);
      }
    };
 
    const timer = setTimeout(resolveENS, 500);
    return () => clearTimeout(timer);
  }, [recipient]);

  const handleAddCustomNetwork = async () => {
    if (!newNetwork.name || !newNetwork.id || !newNetwork.rpc || !newNetwork.currencySymbol) return;
    const network = {
      ...newNetwork,
      decimals: parseInt(newNetwork.decimals as any) || 18,
      currencyName: newNetwork.currencyName || newNetwork.currencySymbol
    };
    const updatedNetworks = [...customNetworks, network];
    setCustomNetworks(updatedNetworks);
    core.addCustomChain(network.id, {
      name: network.name,
      id: network.id,
      rpc: network.rpc,
      explorer: network.explorer,
      nativeCurrency: { name: network.currencyName, symbol: network.currencySymbol, decimals: network.decimals },
      derivationPath: "m/44'/60'/0'/0/0"
    });
    await boltStorage.setItem('bolt_custom_networks', JSON.stringify(updatedNetworks));
    setNewNetwork({ name: '', id: '', rpc: '', explorer: '', currencySymbol: '', currencyName: '', decimals: 18 });
    setShowAddNetwork(false);
  };

  const handleChainChange = (chainId: string) => {
    setSelectedChain(chainId);
    core.setChain(chainId);
    core.getWallets().then(setWallets);
    core.listContracts().then(setContracts);
    setShowNetworks(false);
    
    // Persist to unified storage
    boltStorage.setItem('selectedChain', chainId);
  };

  const handleSetupPassword = async () => {
    if (password.length < 8) return setPasswordError("Password must be at least 8 characters");
    if (password !== confirmPassword) return setPasswordError("Passwords do not match");
    
    setIsSending(true);
    let sessionPhrase = '';
    try {
      sessionPhrase = await core.setupVault(password);
      setMnemonic(sessionPhrase);
      setIsLocked(false);
      setIsVaultPrepared(true);
      const initialWallet = await core.getWallets();
      setWallets(initialWallet);
    } catch (err) {
      console.error("Vault Setup Error:", err);
      setPasswordError("Failed to setup vault");
    } finally {
      // Broadcast session to background
      // @ts-ignore
      if (window.chrome?.runtime?.id && sessionPhrase) {
        // @ts-ignore
        window.chrome.runtime.sendMessage({ type: 'BOLT_SET_SESSION', session: sessionPhrase });
      }
      setIsSending(false);
    }
  };

  const handleUnlock = async () => {
    setIsSending(true);
    const success = await core.unlockVault(password);
    if (success) {
      setIsLocked(false);
      const loadedWallets = await core.getWallets();
      setWallets(loadedWallets);
      setPassword('');

      // Get session phrase to broadcast
      const sessionPhrase = await core.getSession();
      setMnemonic(sessionPhrase || '');

      // Broadcast session to background
      // @ts-ignore
      if (window.chrome?.runtime?.id && sessionPhrase) {
        // @ts-ignore
        window.chrome.runtime.sendMessage({ type: 'BOLT_SET_SESSION', session: sessionPhrase });
      }
    } else {
      setPasswordError("Incorrect password");
    }
    setIsSending(false);
  };

  const handleCreateWallet = async () => {
    setIsCreating(true);
    setShowVaultAnimation(true);
    try {
      const wallet = await core.createNewWallet(`Wallet ${wallets.length + 1}`);
      setWallets([...wallets, wallet]);
    } catch (err) {
      console.error("Failed to create wallet", err);
    } finally {
      setIsCreating(false);
      setShowVaultAnimation(false);
    }
  };

  const handleResetVault = async () => {
    if (confirm("Are you sure you want to reset the vault? ALL data will be lost.")) {
      await boltStorage.clear();
      setWallets([]);
      setShowSettings(false);
      window.location.reload();
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount || !activeWallet) return;
    
    // Use resolved address if available, otherwise use original recipient
    const finalRecipient = resolvedAddress || recipient;
    if (!ethers.isAddress(finalRecipient || '') && !(finalRecipient as string).includes('.')) {
      alert("Invalid recipient address or ENS");
      return;
    }
    
    setIsSending(true);
    try {
      const estimates = await core.getGasPriceEstimates();
      setGasEstimates(estimates);
      setGasSettings({
        priorityFee: estimates.average.priorityFee,
        maxFee: estimates.average.maxFee,
        gasLimit: '21000',
        speed: 'average'
      });
      
      let txTo = finalRecipient;
      let txValue = amount;
      let txData: string | undefined = undefined;

      if (sendTab === 'token' && sendAsset !== 'native') {
        const tokenContract = contracts.find(c => c.address === sendAsset);
        if (tokenContract) {
          try {
             txTo = sendAsset;
             txValue = "0";
             const iface = new ethers.Interface(ERC20_ABI);
             const parsedAmount = ethers.parseUnits(amount, tokenContract.decimals);
             txData = iface.encodeFunctionData("transfer", [finalRecipient, parsedAmount]);
          } catch (e) {
             console.error("Failed to encode token transfer", e);
             alert("Error encoding custom token transfer. Please check decimals and amount.");
             setIsSending(false);
             return;
          }
        }
      }

      setProposedTx({
        to: txTo,
        value: txValue,
        from: activeWallet.address,
        data: txData,
        maxFeePerGas: ethers.parseUnits(estimates.average.maxFee, 'gwei').toString(),
        maxPriorityFeePerGas: ethers.parseUnits(estimates.average.priorityFee, 'gwei').toString(),
        gasLimit: '21000',
        timestamp: Date.now()
      });
      
      setShowConfirmSend(true);
      setSimulationStatus('success');
      if (estimates?.average?.speed) {
        setEstimatedFee(`${estimates.average.speed.charAt(0).toUpperCase() + estimates.average.speed.slice(1)} · ~${(parseFloat(estimates.average.maxFee) * 21000 / 1e9).toFixed(5)}`);
      } else {
        setEstimatedFee("Standard · ~0.00010");
      }
    } catch (err) {
      console.error("Gas fetch failed", err);
      alert("Failed to estimate gas. Please check your network connection and try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectSpeed = (speed: string) => {
    if (!gasEstimates) return;
    const tier = speed === 'fast' ? gasEstimates.fast : speed === 'slow' ? gasEstimates.slow : gasEstimates.average;
    const newSettings = {
      ...gasSettings,
      priorityFee: tier.priorityFee,
      maxFee: tier.maxFee,
      speed
    };
    setGasSettings(newSettings);
    setProposedTx({
      ...proposedTx,
      maxFeePerGas: ethers.parseUnits(tier.maxFee, 'gwei').toString(),
      maxPriorityFeePerGas: ethers.parseUnits(tier.priorityFee, 'gwei').toString()
    });
    setEstimatedFee(`${speed.charAt(0).toUpperCase() + speed.slice(1)} · ~${(parseFloat(tier.maxFee) * parseInt(gasSettings.gasLimit) / 1e9).toFixed(5)}`);
    setShowGasModal(false);
  };

  const handleSaveCustomGas = (customValues: any) => {
    setGasSettings({ ...customValues, speed: 'custom' });
    setProposedTx({
      ...proposedTx,
      maxFeePerGas: ethers.parseUnits(customValues.maxFee, 'gwei').toString(),
      maxPriorityFeePerGas: ethers.parseUnits(customValues.priorityFee, 'gwei').toString(),
      gasLimit: customValues.gasLimit
    });
    setEstimatedFee(`Custom · ~${(parseFloat(customValues.maxFee) * parseInt(customValues.gasLimit) / 1e9).toFixed(5)}`);
    setShowCustomGasModal(false);
    setShowGasModal(false);
  };

  const handleGetSwapQuote = async () => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || !activeWallet) return;
    setSwapError('');
    setSwapQuote(null);
    try {
      const nativeCurrency = chains.find(c => c.id === selectedChain)?.name || 'ETH';
      const fromAmountWei = ethers.parseUnits(swapAmount, 18).toString();
      const quote = await core.getSwapQuote({
        fromChainKey: selectedChain,
        toChainKey: selectedChain,
        fromToken: swapFromAsset,
        toToken: swapToAsset,
        fromAmount: fromAmountWei,
        fromAddress: activeWallet.address,
        slippage: swapSlippage,
      });
      setSwapQuote(quote);
    } catch (err: any) {
      console.error("Quote Error:", err);
      setSwapError(err.message || 'Failed to fetch quote');
    }
  };

  const handleExecuteSwap = async () => {
    if (!activeWallet || !swapQuote) return;
    setIsSwapping(true);
    setSwapError('');
    try {
      const hash = await core.executeSwap(activeWallet.id, swapQuote);
      alert(`Swap Successful! Hash: ${hash}`);
      setShowSwap(false);
      setSwapQuote(null);
      setSwapAmount('');
    } catch (err: any) {
      setSwapError(err.message || 'Swap execution failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleExecuteBridge = async () => {
    if (!activeWallet || !bridgeAmount) return;
    setIsBridging(true);
    try {
      const fromAmountWei = ethers.parseUnits(bridgeAmount, 18).toString();
      const quote = await core.getBridgeQuote({
        fromChainKey: bridgeFromChain,
        toChainKey: bridgeToChain,
        fromToken: 'native',
        toToken: 'native',
        fromAmount: fromAmountWei,
        fromAddress: activeWallet.address,
        slippage: swapSlippage,
      });
      const hash = await core.executeBridge(activeWallet.id, quote);
      alert(`Bridge Successful! Hash: ${hash}`);
      setShowBridge(false);
      setBridgeAmount('');
    } catch (err: any) {
      alert(`Bridge Failed: ${err.message || err}`);
    } finally {
      setIsBridging(false);
    }
  };

  const handleRecovery = async () => {
    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError("Passwords do not match");
      return;
    }
    if (recoveryPassword.length < 8) {
      setRecoveryError("Password must be at least 8 characters");
      return;
    }
    const mnemonic = recoveryMnemonic.join(' ').toLowerCase().trim();
    if (mnemonic.split(' ').length !== 12) {
       setRecoveryError("Please enter all 12 words");
       return;
    }

    setIsSending(true);
    try {
      await core.resetVault(mnemonic, recoveryPassword);
      setIsLocked(false);
      setShowRecovery(false);
      setRecoveryPassword('');
      setRecoveryConfirmPassword('');
      setRecoveryMnemonic(Array(12).fill(''));
      // Reload wallets
      const w = await core.listWallets();
      if (w.length > 0) setActiveWallet(w[0]);
    } catch (err: any) {
      setRecoveryError(err.message || "Recovery failed. Check your mnemonic.");
    } finally {
      setIsSending(false);
    }
  };

  const executeSend = async () => {
    if (!proposedTx || !activeWallet) return;
    setIsSending(true);
    setTxStatus('transferring');
    try {
      const result = await core.signTransaction(activeWallet.id, proposedTx);
      setTxHash(result.signature);
      setTxStatus('success');
    } catch (err) {
      console.error("Send failed", err);
      setTxStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleImportContract = async (abiOverride?: string) => {
    const abi = abiOverride || newContractAbi;
    if (!newContractName || !newContractAddress || !abi) return;
    try {
      const decimals = parseInt(newContractDecimals) || 18;
      const contract = await core.importContract(newContractName, newContractAddress, abi, decimals);
      setContracts([...contracts, contract]);
      setShowImportContract(false);
      setNewContractName('');
      setNewContractAddress('');
      setNewContractAbi('');
      setNewContractDecimals('18');
    } catch (err) {
      console.error("Import failed", err);
    }
  };

  const handleImportNFT = async (abiOverride?: string) => {
    if (!newNFTName || !newNFTAddress || !newNFTTokenId) return;
    try {
      const nft = await core.importNFT(newNFTAddress, newNFTTokenId, newNFTName);
      setNfts([...nfts, nft]);
      setShowImportNFT(false);
      setNewNFTName('');
      setNewNFTAddress('');
      setNewNFTTokenId('');
      setNewNFTAbi('');
    } catch (err) {
      console.error("Import NFT failed", err);
    }
  };

  const handleDeleteNFT = async (address: string, tokenId: string) => {
    if (confirm("Are you sure you want to remove this NFT from your vault?")) {
      await core.deleteNFT(address, tokenId);
      setNfts(nfts.filter(n => !(n.address === address && n.tokenId === tokenId)));
    }
  };


  const handleDeleteContract = async (addr: string) => {
    if (confirm("Delete this contract?")) {
      await core.deleteContract(addr);
      setContracts(contracts.filter(c => c.address !== addr));
    }
  };

  const handleContractCall = async () => {
    if (!selectedContract || !contractMethod || !activeWallet) {
      alert("Please select a wallet and a method");
      return;
    }
    setIsSending(true);
    try {
      // Encode function data
      const iface = new ethers.Interface(selectedContract.abi);
      const args = contractArgs ? contractArgs.split(',').map(a => a.trim()) : [];
      const data = iface.encodeFunctionData(contractMethod, args);
      
      const hash = await core.signTransaction(activeWallet.id, { to: selectedContract.address, data });
      alert(`Transaction Broadcasted!\nContract: ${selectedContract.name}\nMethod: ${contractMethod}\nHash: ${hash}`);
      setSelectedContract(null);
      setContractMethod('');
      setContractArgs('');
    } catch (err: any) {
      alert(`Interaction failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    alert('Address copied to clipboard!');
  };

  const formatAddress = (addr: any) => {
    if (!addr || typeof addr !== 'string') return '0x...';
    if (addr.length < 10) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };


  const themeStyles = theme.id === 'glossy' ? {
    '--theme-primary': theme.primary,
    '--theme-secondary': theme.secondary,
    'background': '#07080A',
    'color': '#FFFFFF'
  } : {
    '--theme-primary': theme.primary,
    '--theme-secondary': theme.secondary
  };

  const renderWalletDashboard = (customClasses = "w-[380px] min-h-[600px]") => {
    return (
      <div 
        style={themeStyles}
        className={`${customClasses} bg-bolt-dark text-white overflow-hidden flex flex-col p-6 font-sans selection:bg-bolt-blue/30 relative`}
      >
        {/* Security Overlay */}
        <AnimatePresence mode="wait">
          {isLocked && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1000] bg-[#0A0B0E]/95 backdrop-blur-[50px] flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative z-10 w-full">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="mb-8"
                >
                  <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-2xl relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent transition-all group-hover:scale-110" />
                    <Shield className="w-8 h-8 text-white relative z-10" />
                  </div>
                  <h1 className="text-2xl font-black text-white tracking-tighter mb-2 uppercase italic">
                    {isVaultPrepared ? 'Unlock' : 'Secure'}
                  </h1>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] px-4">
                    {isVaultPrepared ? 'Enter password' : 'Create master password'}
                  </p>
                </motion.div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Key className="w-3.5 h-3.5 text-gray-500 group-focus-within:text-white transition-colors" />
                      </div>
                      <input 
                        type={showPassword ? "text" : "password"}
                        placeholder={isVaultPrepared ? "Password" : "Password (8+ chars)"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && (isVaultPrepared ? handleUnlock() : handleSetupPassword())}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-10 text-xs font-bold text-white placeholder:text-gray-600 outline-none focus:bg-white/10 focus:border-white/20 transition-all shadow-inner"
                      />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white transition-colors">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {!isVaultPrepared && (
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Shield className="w-3.5 h-3.5 text-gray-500 group-focus-within:text-white transition-colors" />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleSetupPassword()}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-10 text-xs font-bold text-white placeholder:text-gray-600 outline-none focus:bg-white/10 focus:border-white/20 transition-all shadow-inner"
                        />
                      </div>
                    )}
                  </div>

                  {passwordError && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest leading-none">{passwordError}</p>}

                  <Button 
                    onClick={isVaultPrepared ? handleUnlock : handleSetupPassword}
                    disabled={isSending || (isVaultPrepared ? !password : (!password || !confirmPassword))}
                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all disabled:opacity-20"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                  >
                    {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" /> : (isVaultPrepared ? 'Unlock' : 'Setup')}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <motion.img 
              src="/0logov3.png" 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={cycleTheme}
              className="w-10 h-10 cursor-pointer object-contain" 
            />
            <div className="flex flex-col">
               <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tighter leading-none" style={{ color: theme.primary }}>{theme.name}</span>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
               </div>
               <span className="text-[8px] font-bold tracking-[0.4em] text-gray-500">SECURE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Custom Swap & Bridge Widget */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10 shadow-lg">
              {/* Circular Bridge Button with Tooltip */}
              <div className="relative group">
                <button
                  onClick={() => {
                    if (wallets.length > 0) {
                      if (!activeWallet) setActiveWallet(wallets[0]);
                      setShowBridge(true);
                    } else {
                      alert("Please setup or unlock your vault first.");
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all duration-200 active:scale-90"
                >
                  <GitMerge className="w-3.5 h-3.5 text-white/90 rotate-90" />
                </button>
                {/* Tooltip */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-2xl z-50">
                  Bridge
                </div>
              </div>

              {/* Capsule Swap Button */}
              <button
                onClick={() => {
                  if (wallets.length > 0) {
                    if (!activeWallet) setActiveWallet(wallets[0]);
                    setShowSwap(true);
                  } else {
                    alert("Please setup or unlock your vault first.");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/90 hover:bg-black text-white border border-white/10 transition-all duration-200 active:scale-95 text-xs font-bold shadow-inner"
              >
                <ArrowLeftRight className="w-3 h-3 text-bolt-blue" />
                <span>Swap</span>
              </button>
            </div>

            <Settings 
               className={`w-5 h-5 cursor-pointer transition-colors ${openApps.includes('settings') ? 'text-bolt-blue' : 'text-gray-400 hover:text-white'}`} 
               onClick={async () => {
                  handleDockClick('settings');
               }}
               style={{ color: openApps.includes('settings') ? theme.primary : undefined }}
            />
            <X 
               className="w-5 h-5 text-gray-400 hover:text-red-400 cursor-pointer transition-colors" 
               onClick={() => {
                  setIsLocked(true);
                  setMnemonic('');
                  setShowMnemonicPlain(false);
               }}
               title="Lock Vault"
            />
          </div>
        </div>

        <AnimatePresence>
          {showNetworks && (
            <motion.div 
              initial={{ opacity: 0, y: 300 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 300 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 backdrop-blur-3xl p-8 flex flex-col rounded-t-[40px] border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>Select Network</h3>
                <X className="w-6 h-6 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setShowNetworks(false)} />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {chains.map(c => (
                  <motion.div 
                    key={c.id} 
                    whileHover={{ x: 3 }}
                    onClick={() => handleChainChange(c.id)}
                    className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${selectedChain === c.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-2" style={{ color: selectedChain === c.id ? theme.primary : 'inherit' }}>{c.icon}</div>
                      <span className={`text-sm font-bold ${selectedChain === c.id ? 'text-white' : 'text-gray-400'}`}>{c.name}</span>
                    </div>
                    {selectedChain === c.id && <CheckCircle2 className="w-5 h-5" style={{ color: theme.primary }} />}
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-white/5 space-y-3">
                 <Button onClick={() => setShowAddNetwork(true)} variant="glass" className="w-full py-4 rounded-2xl flex justify-center gap-2 items-center">
                    <Plus className="w-4 h-4" /> Add Custom Network
                 </Button>
                 <Button onClick={() => setShowNetworks(false)} className="w-full py-4 rounded-2xl">Done</Button>
              </div>
            </motion.div>
          )}

          {showAddNetwork && (
            <motion.div 
              initial={{ opacity: 0, y: 300 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 300 }}
              className="absolute inset-x-0 bottom-0 top-[15%] z-[65] bg-[#0A0B10]/98 backdrop-blur-3xl p-8 flex flex-col rounded-t-[40px] border-t border-white/10 overflow-y-auto scrollbar-hide shadow-[0_-20px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>Add Network</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Connect to Custom EVM</p>
                </div>
                <X className="w-6 h-6 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setShowAddNetwork(false)} />
              </div>
              <div className="flex-1 space-y-4 pr-1">
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Network Name *</p>
                   <input type="text" placeholder="e.g. Sepolia" value={newNetwork.name} onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">New RPC URL *</p>
                   <input type="text" placeholder="https://..." value={newNetwork.rpc} onChange={(e) => setNewNetwork({ ...newNetwork, rpc: e.target.value })} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors font-mono" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Chain ID *</p>
                   <input type="text" placeholder="e.g. 11155111" value={newNetwork.id} onChange={(e) => setNewNetwork({ ...newNetwork, id: e.target.value })} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Currency Symbol *</p>
                    <input type="text" placeholder="ETH" value={newNetwork.currencySymbol} onChange={(e) => setNewNetwork({ ...newNetwork, currencySymbol: e.target.value })} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Block Explorer URL</p>
                    <input type="text" placeholder="Optional" value={newNetwork.explorer} onChange={(e) => setNewNetwork({ ...newNetwork, explorer: e.target.value })} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors" />
                  </div>
                </div>
              </div>
              <div className="mt-8">
                 <Button onClick={handleAddCustomNetwork} disabled={!newNetwork.name || !newNetwork.id || !newNetwork.rpc || !newNetwork.currencySymbol} className="w-full py-4 rounded-2xl" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}>Save Network</Button>
                 {/* Settings are now rendered inside DesktopWindow */}
                 <Button onClick={() => setShowAddNetwork(false)} className="w-full py-4 rounded-2xl mt-2" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}>Done</Button>
              </div>
            </motion.div>
          )}

          {showSend && activeWallet && (
            <motion.div 
              initial={{ opacity: 0, x: 380 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 380 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 text-white backdrop-blur-3xl flex flex-col font-sans"
            >
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <ArrowLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:bg-white/10 rounded-full transition-all p-1 box-content" onClick={() => setShowSend(false)} />
                  <h3 className="text-base font-black tracking-tight" style={{ color: theme.primary }}>Send</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center p-2 cursor-pointer hover:bg-white/10 transition-all" style={{ color: theme.primary }} title="Bridge Assets" onClick={() => setShowBridge(true)}>
                      <ArrowLeftRight className="w-full h-full" />
                    </div>
                    <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest" onClick={() => setShowSwap(true)}>
                      Swap
                    </div>
                  </div>
                </div>

                {/* Tabs with dark styling */}
                <div className="flex border-b border-white/5 mb-6">
                  <button 
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${sendTab === 'token' ? 'text-[var(--theme-primary)] border-[var(--theme-primary)]' : 'text-gray-500 border-transparent'}`}
                    onClick={() => setSendTab('token')}
                    style={{ color: sendTab === 'token' ? theme.primary : undefined, borderColor: sendTab === 'token' ? theme.primary : undefined }}
                  >
                    Token
                  </button>
                  <button 
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${sendTab === 'nft' ? 'text-[var(--theme-primary)] border-[var(--theme-primary)]' : 'text-gray-500 border-transparent'}`}
                    onClick={() => setSendTab('nft')}
                    style={{ color: sendTab === 'nft' ? theme.primary : undefined, borderColor: sendTab === 'nft' ? theme.primary : undefined }}
                  >
                    NFT
                  </button>
                </div>

                {/* Network Selector refined */}
                <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all w-fit group">
                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                    {chains.find(c => c.id === selectedChain)?.icon || <ArrowLeftRight className="w-3 h-3" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{chains.find(c => c.id === selectedChain)?.name}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-white transition-all" />
                </div>

                {/* Form Sections with Glassmorphism */}
                <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide pr-1 pb-4">
                  {/* Recipient Input Card */}
                  <div className="p-5 rounded-[28px] bg-white/5 border border-white/5 focus-within:bg-white/10 focus-within:border-white/10 transition-all flex flex-col gap-2 group shadow-xl relative">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-1 group-focus-within:scale-105 transition-transform" style={{ color: theme.primary }}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowQRScanner(true)}
                          className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                          title="Scan QR Code"
                        >
                          <Zap className="w-5 h-5 text-bolt-blue" />
                        </button>
                        <Users className="w-5 h-5 text-gray-500 cursor-pointer hover:text-white transition-colors self-center" />
                      </div>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Address, domain or identity" 
                      value={recipient} 
                      onChange={(e) => setRecipient(e.target.value)}
                      className="bg-transparent text-lg font-bold text-white placeholder:text-white/10 outline-none w-full tracking-tight" 
                    />
                    <div className="flex justify-between items-center h-4">
                      {isResolvingENS ? (
                        <span className="text-[8px] text-bolt-blue font-black uppercase tracking-widest animate-pulse">Resolving ENS...</span>
                      ) : resolvedAddress ? (
                        <span className="text-[8px] text-green-500 font-black uppercase tracking-widest">
                          Resolved: {formatAddress(resolvedAddress)}
                        </span>
                      ) : recipient.includes('.') && !isResolvingENS ? (
                        <span className="text-[8px] text-red-500 font-black uppercase tracking-widest">Unresolved Domain</span>
                      ) : (
                        <span className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.2em] opacity-50">0x0000...</span>
                      )}
                    </div>
                  </div>

                  {/* Asset Selection Card */}
                  <div className="p-6 rounded-[28px] bg-white/5 border border-white/5 flex flex-col gap-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/10 transition-all" />
                    <div className="flex items-center justify-between relative z-10">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center p-2 shadow-inner overflow-hidden" style={{ color: theme.primary }}>
                             {sendTab === 'nft' ? (
                               <div className="w-full h-full flex items-center justify-center text-[8px] font-black opacity-40">NFT</div>
                             ) : (
                               chains.find(c => c.id === selectedChain)?.icon || <ArrowLeftRight className="w-5 h-5" />
                             )}
                          </div>
                          <div className="w-full">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{sendTab === 'nft' ? 'Collection' : 'Asset'}</p>
                            {sendTab === 'nft' ? (
                               <p className="text-sm font-black text-white">NFT Collection</p>
                            ) : (
                               <select 
                                 value={sendAsset} 
                                 onChange={(e) => setSendAsset(e.target.value)}
                                 className="bg-transparent text-sm font-black text-white outline-none w-full appearance-none flex-1 cursor-pointer"
                               >
                                  <option value="native" className="bg-[#121318] text-white">{chains.find(c => c.id === selectedChain)?.name} Native</option>
                                  {contracts.filter(c => c.chainId === selectedChain).map(c => (
                                     <option key={c.address} value={c.address} className="bg-[#121318] text-white">{c.name} ({contractBalances[c.address] || '0.00'})</option>
                                  ))}
                               </select>
                            )}
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{sendTab === 'nft' ? 'Token ID' : 'Balance'}</p>
                          <p className="text-xs font-bold text-white/50">{sendTab === 'nft' ? 'Required' : 'n/a'}</p>
                       </div>
                    </div>
                    
                    <div className="border-t border-white/5 pt-6 relative z-10">
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 text-center">Amount to Send</p>
                       <div className="flex flex-col items-center">
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-transparent text-5xl font-black text-center text-white placeholder:text-white/5 outline-none w-full tracking-tighter" 
                            style={{ textShadow: `0 0 30px ${theme.primary}40` }}
                          />
                          <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-[0.2em]">
                            USD ${amount ? (parseFloat(amount) * (prices[selectedChain] || 0)).toFixed(2) : '0.00'}
                          </p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Footer Button using theme gradient */}
                <div className="mt-auto pt-6">
                  <Button 
                    onClick={handleSend} 
                    disabled={isSending || !recipient || !amount} 
                    className="w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                  >
                    {isSending ? 'Signing...' : 'Confirm'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {showConfirmSend && proposedTx && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               className="absolute inset-x-0 bottom-0 top-0 z-[70] bg-bolt-dark/98 backdrop-blur-3xl p-8 flex flex-col rounded-t-[40px] border-t border-white/10"
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-2 shadow-2xl relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent transition-transform group-hover:scale-110" />
                   <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500 font-black text-[10px] relative z-10">🦊</div>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Confirm Send</h3>
                <p className="text-[9px] font-mono text-gray-500 uppercase mt-0.5 opacity-60">{formatAddress(activeWallet?.address || '0x00...00')}</p>
              </div>

               <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pb-4">
                {/* Recipient info card */}
                <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4 group hover:bg-white/10 transition-all">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center overflow-hidden">
                      <div className="w-6 h-6 rounded-md bg-white/10 animate-pulse" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Recipient</p>
                      <p className="text-sm font-bold text-white leading-none">{proposedTx.to.includes('.') ? proposedTx.to : formatAddress(proposedTx.to)}</p>
                   </div>
                   <div className="ml-auto w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <ExternalLink className="w-3 h-3 text-white/50" />
                   </div>
                </div>

                {/* Amount detail card */}
                <div className="p-5 rounded-[32px] bg-white/5 border border-white/5 flex items-center justify-between shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full -mr-12 -mt-12" />
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center p-2.5 shadow-inner" style={{ color: theme.primary }}>
                         {sendTab === 'nft' ? <Zap className="w-6 h-6" /> : (chains.find(c => c.id === selectedChain)?.icon || <ArrowLeftRight className="w-6 h-6" />)}
                      </div>
                      <div>
                          <p className="text-2xl font-black text-white leading-none mb-1">-{proposedTx.value} {sendTab === 'nft' ? 'NFT' : (chains.find(c => c.id === selectedChain)?.name === 'Ethereum' ? 'ETH' : chains.find(c => c.id === selectedChain)?.name?.split(' ')[0])}</p>
                          <p className="text-xs font-bold text-gray-500 leading-none">${(parseFloat(proposedTx.value) * (prices[selectedChain] || 0)).toFixed(2)}</p>
                       </div>
                   </div>
                </div>

                {/* Risk & Details toggles */}
                <div className="flex gap-3 pt-2">
                   <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-all group">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-black uppercase text-green-500 tracking-wider">No Risks Found</span>
                      <ChevronDown className="w-3 h-3 text-green-500/50 group-hover:translate-y-0.5 transition-transform" />
                   </div>
                   <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all group">
                      <Info className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black uppercase text-white tracking-wider">Details</span>
                      <ChevronDown className="w-3 h-3 text-gray-500 group-hover:translate-y-0.5 transition-transform" />
                   </div>
                </div>
              </div>

              {/* Fee info and Actions */}
              <div className="mt-auto pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-6">
                   <p className="text-sm font-bold text-gray-400 tracking-tight">Network Fee</p>
                   <div 
                     className="flex items-center gap-2 text-right cursor-pointer group hover:bg-white/5 py-1 px-2 rounded-lg transition-all"
                     onClick={() => setShowGasModal(true)}
                   >
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{estimatedFee}</span>
                      <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                   </div>
                </div>
                
                <div className="flex gap-3">
                   <Button 
                     onClick={() => setShowConfirmSend(false)}
                     className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-bold text-white shadow-lg"
                   >
                     Cancel
                   </Button>
                   <Button 
                     onClick={executeSend} 
                     disabled={isSending}
                     className="flex-[1.5] py-4 rounded-2xl bg-[#2A2B2F] hover:bg-[#35363B] transition-all text-sm font-black text-white shadow-2xl border border-white/5 flex items-center justify-center gap-2"
                   >
                     {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Sign and Send'}
                   </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Network Fee Selector Modal */}
          <AnimatePresence>
            {showGasModal && (
              <motion.div 
                 initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                 className="absolute inset-x-0 bottom-0 z-[80] bg-[#121318]/98 backdrop-blur-3xl p-8 rounded-t-[40px] border-t border-white/10 shadow-2xl"
              >
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-white tracking-tight">Network Fee</h3>
                    <X className="w-6 h-6 text-gray-400 cursor-pointer hover:text-white transition-colors" onClick={() => setShowGasModal(false)} />
                 </div>

                 <div className="space-y-3">
                    {[
                      { id: 'fast', name: 'Fast', icon: '🚀', tier: gasEstimates?.fast },
                      { id: 'average', name: 'Average', icon: '🚙', tier: gasEstimates?.average },
                      { id: 'slow', name: 'Slow', icon: '🐢', tier: gasEstimates?.slow },
                      { id: 'custom', name: 'Custom', icon: '⚒️', tier: null }
                    ].map((opt) => (
                      <div 
                        key={opt.id}
                        onClick={() => opt.id === 'custom' ? setShowCustomGasModal(true) : handleSelectSpeed(opt.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${gasSettings.speed === opt.id ? 'bg-white/10 border-white/20 shadow-inner' : 'bg-white/5 border-white/5 hover:bg-white/8 hover:scale-[1.01]'}`}
                        style={{ borderColor: gasSettings.speed === opt.id ? theme.primary : undefined }}
                      >
                         <div className="flex items-center gap-4">
                            <span className="text-2xl drop-shadow-lg">{opt.icon}</span>
                            <div>
                               <p className={`text-sm font-black tracking-tight ${gasSettings.speed === opt.id ? 'text-white' : 'text-gray-400'}`}>{opt.name}</p>
                               {opt.tier && <p className="text-[10px] font-mono text-gray-600 opacity-60">{opt.tier.maxFee} GWEI</p>}
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black tracking-tight" style={{ color: gasSettings.speed === opt.id ? theme.primary : '#666' }}>
                               {opt.tier ? `<$${(parseFloat(opt.tier.maxFee) * 21000 / 1e9 * (prices[selectedChain] || 0)).toFixed(2)}` : ''}
                            </p>
                            {opt.tier && <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-0.5 opacity-40">{(parseFloat(opt.tier.maxFee) * 21000 / 1e9).toFixed(5)} {chains.find(c => c.id === selectedChain)?.name.split(' ')[0]}</p>}
                            {opt.id === 'custom' && <ChevronRight className="w-4 h-4 text-gray-600" />}
                         </div>
                      </div>
                    ))}
                 </div>
              </motion.div>
            )}

            {showCustomGasModal && (
              <motion.div 
                 initial={{ opacity: 0, x: 380 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 380 }}
                 className="absolute inset-0 z-[90] bg-bolt-dark/98 backdrop-blur-3xl p-8 flex flex-col"
              >
                 <div className="flex items-center gap-4 mb-10 overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all" onClick={() => setShowCustomGasModal(false)}>
                       <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tight">Custom Gas</h3>
                       <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{chains.find(c => c.id === selectedChain)?.name}</p>
                    </div>
                 </div>

                 <div className="flex-1 space-y-8">
                    <div className="flex justify-between items-center py-5 border-b border-white/5 group">
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">Current Base Fee</p>
                       <p className="text-sm font-black text-white px-3 py-1 bg-white/5 rounded-lg border border-white/10">{gasEstimates?.baseFee || '20'} GWEI</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 rounded-3xl bg-white/5 border border-white/5 focus-within:border-white/20 transition-all group">
                          <div className="flex items-center gap-2 mb-2">
                             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Priority</p>
                             <Zap className="w-3 h-3 text-gray-700" />
                          </div>
                          <div className="flex items-baseline gap-1">
                             <input 
                               type="number" 
                               className="bg-transparent text-xl font-black text-white outline-none w-full tracking-tighter"
                               value={gasSettings.priorityFee}
                               onChange={(e) => {
                                 const val = e.target.value;
                                 setGasSettings({ ...gasSettings, priorityFee: val });
                               }}
                             />
                             <span className="text-[9px] font-bold text-gray-700">GWEI</span>
                          </div>
                       </div>
                       <div className="p-5 rounded-3xl bg-white/5 border border-white/5 focus-within:border-white/20 transition-all group">
                          <div className="flex items-center gap-2 mb-2">
                             <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Max Fee</p>
                             <Cpu className="w-3 h-3 text-gray-700" />
                          </div>
                          <div className="flex items-baseline gap-1">
                             <input 
                               type="number" 
                               className="bg-transparent text-xl font-black text-white outline-none w-full tracking-tighter"
                               value={gasSettings.maxFee}
                               onChange={(e) => {
                                 const val = e.target.value;
                                 setGasSettings({ ...gasSettings, maxFee: val });
                               }}
                             />
                             <span className="text-[9px] font-bold text-gray-700">GWEI</span>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 relative overflow-hidden group shadow-inner">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
                       <div className="flex items-center gap-2 mb-3">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gas Limit</p>
                          <Info className="w-3.5 h-3.5 text-gray-600 hover:text-white transition-colors cursor-help" />
                       </div>
                       <input 
                         type="number" 
                         className="bg-transparent text-3xl font-black text-white outline-none w-full tracking-tighter relative z-10"
                         value={gasSettings.gasLimit}
                         onChange={(e) => {
                           const val = e.target.value;
                           setGasSettings({ ...gasSettings, gasLimit: val });
                         }}
                       />
                       <p className="text-[10px] text-gray-600 font-bold mt-3 uppercase tracking-wider">Recommended: <span className="underline decoration-dotted transition-colors hover:text-white cursor-pointer" onClick={() => setGasSettings({...gasSettings, gasLimit: '21000'})} style={{ color: theme.primary }}>21000</span></p>
                    </div>

                    <div className="p-6 rounded-[32px] bg-gradient-to-br from-white/5 to-transparent border border-white/5 space-y-5">
                       <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-gray-500">Expected Total</p>
                          <div className="text-right">
                             <p className="text-sm font-black text-white tracking-tight italic">{"<$" + (parseFloat(gasSettings.priorityFee || '0') * parseInt(gasSettings.gasLimit || '0') / 1e9 * (prices[selectedChain] || 0)).toFixed(2)}</p>
                             <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{(parseFloat(gasSettings.priorityFee || '0') * parseInt(gasSettings.gasLimit || '0') / 1e9).toFixed(5)} {chains.find(c => c.id === selectedChain)?.name.split(' ')[0]}</p>
                          </div>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <p className="text-xs font-bold text-gray-500">Maximum possible</p>
                          <div className="text-right">
                             <p className="text-sm font-black text-white tracking-tight italic opacity-60">{"<$" + (parseFloat(gasSettings.maxFee || '0') * parseInt(gasSettings.gasLimit || '0') / 1e9 * (prices[selectedChain] || 0)).toFixed(2)}</p>
                             <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">{(parseFloat(gasSettings.maxFee || '0') * parseInt(gasSettings.gasLimit || '0') / 1e9).toFixed(5)} {chains.find(c => c.id === selectedChain)?.name.split(' ')[0]}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 mt-auto">
                    <Button 
                      onClick={() => handleSelectSpeed('average')}
                      className="flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-bold text-sm"
                    >
                       Reset Default
                    </Button>
                    <Button 
                      className="flex-[1.8] py-5 rounded-2xl font-black uppercase text-sm shadow-2xl border border-white/10"
                      style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                      onClick={() => handleSaveCustomGas(gasSettings)}
                    >
                       Apply Changes
                    </Button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          {txStatus !== 'idle' && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 z-[80] bg-[#0A0B0E]/98 backdrop-blur-[60px] flex flex-col items-center justify-center p-8 text-center overflow-hidden"
            >
               {/* Animated Background Glows */}
               <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px]"
                    style={{ background: txStatus === 'success' ? 'rgba(34,197,94,0.15)' : `${theme.primary}25` }}
                  />
               </div>
 
               <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
                 {txStatus === 'transferring' ? (
                   <>
                     <div className="flex items-center gap-16 mb-16 relative">
                        {/* Connection Line */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        
                        <motion.div 
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="w-24 h-24 rounded-[32px] bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative group"
                        >
                           <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[32px]" />
                           <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner relative z-10" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                              {activeWallet?.name.match(/\d+/)?.[0] || '1'}
                           </div>
                        </motion.div>
                        
                        <div className="flex flex-col items-center gap-1 relative">
                           <motion.div 
                             animate={{ x: [-10, 10, -10], opacity: [0.2, 1, 0.2] }}
                             transition={{ duration: 2, repeat: Infinity }}
                             className="flex gap-1"
                           >
                              {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />)}
                           </motion.div>
                        </div>
 
                        <motion.div 
                          animate={{ y: [0, 5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                          className="w-24 h-24 rounded-[32px] bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative"
                        >
                           <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[32px]" />
                           <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                              <User className="w-8 h-8 text-white/20" />
                           </div>
                        </motion.div>
                     </div>
                     <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Transferring...</h2>
                     <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] opacity-40 animate-pulse">Broadcasting to {chains.find(c => c.id === selectedChain)?.name}</p>
                   </>
                 ) : txStatus === 'success' ? (
                   <>
                     <motion.div 
                       initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                       className="w-40 h-40 rounded-full flex items-center justify-center mb-12 relative"
                     >
                        <div className="absolute inset-0 bg-green-500/20 blur-[60px] rounded-full" />
                        <div className="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center shadow-2xl relative z-10">
                           <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={3} />
                        </div>
                        {[...Array(3)].map((_, i) => (
                          <motion.div 
                            key={i}
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                            className="absolute inset-0 rounded-full border-2 border-green-500/30"
                          />
                        ))}
                     </motion.div>
                     <h2 className="text-6xl font-black text-white tracking-tighter mb-4">Done</h2>
                     <div className="flex flex-col items-center gap-4">
                        <a 
                          href={`${CHAINS[selectedChain]?.explorer}/tx/${txHash}`} 
                          target="_blank" rel="noreferrer" 
                          className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-black text-blue-400 hover:bg-white/10 transition-all flex items-center gap-2 group uppercase tracking-widest"
                        >
                           View In Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-8">
                        <X className="w-12 h-12 text-red-500" />
                     </div>
                     <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Failed</h2>
                     <p className="text-gray-500 text-sm mb-8 px-12">The transaction could not be broadcasted to the network. Please check your connection and try again.</p>
                     <Button 
                        onClick={() => setTxStatus('idle')}
                        className="px-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-xs"
                      >
                        Try Again
                      </Button>
                   </>
                 )}
               </div>
            </motion.div>
          )}
 
          {showQRScanner && (
            <QRScannerOverlay 
              onScan={async (text) => {
                const payload = parseQRPayload(text);
                if (payload?.type === 'contract') {
                  // Auto-import contract from QR scan
                  try {
                    let abi = '[]';
                    if (payload.abiCid) {
                      const fetched = await fetchFromIPFS(payload.abiCid);
                      if (fetched) abi = fetched;
                    }
                    await core.importContract(payload.name, payload.address, abi, payload.decimals);
                    core.listContracts().then(setContracts);
                    alert(`Contract "${payload.name}" imported successfully!`);
                  } catch (e: any) {
                    alert(`Failed to import contract: ${e.message}`);
                  }
                } else if (payload?.type === 'address') {
                  setRecipient(payload.address);
                } else {
                  setRecipient(text);
                }
              }} 
              onClose={() => setShowQRScanner(false)} 
            />
          )}
 
          {showReceiveModal && activeWallet && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
               className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
            >
               <motion.div className="w-full max-w-sm bg-bolt-dark/95 rounded-[40px] border border-white/10 p-8 flex flex-col items-center gap-8 shadow-2xl relative">
                  <button onClick={() => setShowReceiveModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all">
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
 
                  <div className="text-center px-4">
                    <h3 className="text-2xl font-black text-white tracking-tight mb-2">Receive Assets</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-relaxed">
                       This address accepts {chains.find(c => c.id === selectedChain)?.name} native assets and all tracked custom tokens.
                    </p>
                  </div>
 
                  <div className="p-4 bg-white rounded-[32px] shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                    <QRCodeSVG 
                      value={activeWallet.address} 
                      size={200}
                      bgColor={"#ffffff"}
                      fgColor={"#000000"}
                      level={"L"}
                      includeMargin={false}
                    />
                  </div>
 
                  <div className="w-full space-y-4">
                    <div 
                      onClick={() => copyAddress(activeWallet.address)}
                      className="w-full p-6 rounded-[24px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group flex flex-col items-center gap-1"
                    >
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{activeWallet.name}</p>
                      <p className="text-sm font-mono font-bold text-white group-hover:text-bolt-blue transition-colors">{activeWallet.address}</p>
                      <div className="flex items-center gap-2 mt-4 text-[10px] font-black uppercase tracking-widest text-bolt-blue opacity-0 group-hover:opacity-100 transition-all">
                        <Copy className="w-3 h-3" />
                        Copy to Clipboard
                      </div>
                    </div>
 
                    <Button 
                      onClick={() => setShowReceiveModal(false)} 
                      className="w-full py-4 rounded-3xl font-black uppercase tracking-widest text-xs" 
                      style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
                    >
                      Done
                    </Button>
                  </div>
               </motion.div>
            </motion.div>
          )}

           {showSwap && activeWallet && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
               className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
             >
               <motion.div className={`w-full max-w-md ${theme.id === 'glossy' ? 'glass-glossy' : 'bg-bolt-dark/95 border-white/10'} rounded-[40px] border p-8 flex flex-col gap-6 shadow-2xl relative`}>
                  <button onClick={() => setShowSwap(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all">
                    <X className="w-6 h-6 text-gray-500" />
                  </button>

                  <div className="text-center">
                    <h3 className="text-2xl font-black text-white tracking-tight mb-1">Instant Swap</h3>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Cross-chain settlement engine</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Pay</p>
                      <div className="flex items-center justify-between">
                        <select 
                          value={swapFromAsset} 
                          onChange={(e) => setSwapFromAsset(e.target.value)}
                          className="bg-transparent text-xl font-black text-white outline-none"
                        >
                          <option value="MON">MON</option>
                          <option value="ETH">ETH</option>
                          <option value="USDC">USDC</option>
                        </select>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          value={swapAmount} 
                          onChange={(e) => { setSwapAmount(e.target.value); handleGetSwapQuote(); }}
                          className="bg-transparent text-right text-2xl font-black text-white outline-none w-1/2"
                        />
                      </div>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-bolt-blue flex items-center justify-center border-4 border-bolt-dark shadow-xl">
                        <ArrowDown className="w-5 h-5 text-black" />
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/10 border border-white/10">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Receive</p>
                      <div className="flex items-center justify-between">
                        <select 
                          value={swapToAsset} 
                          onChange={(e) => setSwapToAsset(e.target.value)}
                          className="bg-transparent text-xl font-black text-white outline-none"
                        >
                          <option value="USDC">USDC</option>
                          <option value="MON">MON</option>
                          <option value="ETH">ETH</option>
                        </select>
                        <div className="text-right">
                          <p className="text-2xl font-black" style={{ color: theme.primary }}>{swapQuote ? swapQuote.toAmount : '0.00'}</p>
                          <p className="text-[9px] font-bold text-gray-500 uppercase">Est. Output</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {swapQuote && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                       <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-gray-500 uppercase">Rate</span>
                          <span className="text-white">1 {swapFromAsset} ≈ {swapQuote.rate} {swapToAsset}</span>
                       </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleExecuteSwap} 
                    disabled={isSwapping || !swapQuote} 
                    className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-2xl ${theme.id === 'glossy' ? 'glossy-button' : ''}`}
                    style={theme.id !== 'glossy' ? { background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` } : {}}
                  >
                    {isSwapping ? 'Swapping...' : 'Execute Swap'}
                  </Button>
               </motion.div>
             </motion.div>
           )}

           {showBridge && activeWallet && (
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
               className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
             >
               <motion.div className={`w-full max-w-md ${theme.id === 'glossy' ? 'glass-glossy' : 'bg-bolt-dark/95 border-white/10'} rounded-[40px] border p-8 flex flex-col gap-6 shadow-2xl relative`}>
                  <button onClick={() => setShowBridge(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all">
                    <X className="w-6 h-6 text-gray-500" />
                  </button>

                  <div className="text-center">
                    <h3 className="text-2xl font-black text-white tracking-tight mb-1">Bridge Assets</h3>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Cross-chain liquidity highway</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">From Network</p>
                      <select 
                        value={bridgeFromChain} 
                        onChange={(e) => setBridgeFromChain(e.target.value)}
                        className="w-full bg-transparent text-lg font-black text-white outline-none mb-2"
                      >
                        {Object.entries(CHAINS).map(([id, cfg]) => (
                          <option key={id} value={id}>{cfg.name}</option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={bridgeAmount} 
                        onChange={(e) => setBridgeAmount(e.target.value)}
                        className="bg-transparent text-2xl font-black text-white outline-none w-full"
                      />
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-bolt-blue flex items-center justify-center border-4 border-bolt-dark shadow-xl">
                        <ArrowDown className="w-5 h-5 text-black" />
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white/10 border border-white/10">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">To Network</p>
                      <select 
                        value={bridgeToChain} 
                        onChange={(e) => setBridgeToChain(e.target.value)}
                        className="w-full bg-transparent text-lg font-black text-white outline-none"
                      >
                        {Object.entries(CHAINS).map(([id, cfg]) => (
                          <option key={id} value={id}>{cfg.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button 
                    onClick={handleExecuteBridge} 
                    disabled={isBridging || !bridgeAmount} 
                    className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-2xl ${theme.id === 'glossy' ? 'glossy-button' : ''}`}
                    style={theme.id !== 'glossy' ? { background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` } : {}}
                  >
                    {isBridging ? 'Bridging...' : 'Initiate Bridge'}
                  </Button>
               </motion.div>
             </motion.div>
           )}

          {showImportContract && (
            <motion.div 
              initial={{ opacity: 0, y: 300 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 300 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 backdrop-blur-3xl p-8 flex flex-col rounded-t-[40px] border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>Import Contract</h3>
                <X className="w-6 h-6 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setShowImportContract(false)} />
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setImportContractType('erc20')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${importContractType === 'erc20' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent opacity-50'}`}
                    style={{ color: importContractType === 'erc20' ? theme.primary : 'inherit' }}
                  >
                    ERC20 Token
                  </button>
                  <button 
                    onClick={() => setImportContractType('custom')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${importContractType === 'custom' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent opacity-50'}`}
                    style={{ color: importContractType === 'custom' ? theme.primary : 'inherit' }}
                  >
                    Custom ABI
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Contract Name</p>
                    <input type="text" placeholder="e.g. My Token" value={newContractName} onChange={(e) => setNewContractName(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Decimals</p>
                    <input type="number" placeholder="18" value={newContractDecimals} onChange={(e) => setNewContractDecimals(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors" />
                  </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Address</p>
                   <input type="text" placeholder="0x..." value={newContractAddress} onChange={(e) => setNewContractAddress(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors font-mono" />
                </div>
                {importContractType === 'custom' && (
                  <div>
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ABI (JSON)</p>
                     <textarea placeholder='[{"name":"transfer","type":"function",...}]' value={newContractAbi} onChange={(e) => setNewContractAbi(e.target.value)} className="w-full h-24 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs focus:border-[var(--theme-primary)] outline-none transition-colors font-mono resize-none" />
                  </div>
                )}
              </div>
              <div className="mt-6">
                 <Button 
                   onClick={() => handleImportContract(importContractType === 'erc20' ? ERC20_ABI : newContractAbi)} 
                   disabled={!newContractName || !newContractAddress || (importContractType === 'custom' && !newContractAbi)} 
                   className="w-full py-4 rounded-2xl" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
                 >
                   Import Contract
                 </Button>
              </div>
            </motion.div>
          )}

          {showImportNFT && (
            <motion.div 
              initial={{ opacity: 0, y: 300 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 300 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 backdrop-blur-3xl p-8 flex flex-col rounded-t-[40px] border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>Import NFT</h3>
                <X className="w-6 h-6 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setShowImportNFT(false)} />
              </div>
              <div className="flex-1 space-y-4 pr-2 scrollbar-hide">
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setImportNFTType('erc721')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${importNFTType === 'erc721' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent opacity-50'}`}
                    style={{ color: importNFTType === 'erc721' ? theme.primary : 'inherit' }}
                  >
                    ERC721 NFT
                  </button>
                  <button 
                    onClick={() => setImportNFTType('custom')}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${importNFTType === 'custom' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent opacity-50'}`}
                    style={{ color: importNFTType === 'custom' ? theme.primary : 'inherit' }}
                  >
                    Custom
                  </button>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Collection Name</p>
                   <input type="text" placeholder="e.g. Bored Ape" value={newNFTName} onChange={(e) => setNewNFTName(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Contract Address</p>
                   <input type="text" placeholder="0x..." value={newNFTAddress} onChange={(e) => setNewNFTAddress(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors font-mono" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Token ID</p>
                   <input type="text" placeholder="1" value={newNFTTokenId} onChange={(e) => setNewNFTTokenId(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors font-mono" />
                </div>
                {importNFTType === 'custom' && (
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ABI (JSON)</p>
                    <textarea placeholder='[...]' value={newNFTAbi} onChange={(e) => setNewNFTAbi(e.target.value)} className="w-full h-24 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs focus:border-[var(--theme-primary)] outline-none transition-colors font-mono resize-none" />
                  </div>
                )}
              </div>
              <div className="mt-6">
                 <Button 
                   onClick={() => handleImportNFT(importNFTType === 'erc721' ? ERC721_ABI : newNFTAbi)} 
                   disabled={!newNFTName || !newNFTAddress || !newNFTTokenId || (importNFTType === 'custom' && !newNFTAbi)} 
                   className="w-full py-4 rounded-2xl" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
                 >
                   Import NFT
                 </Button>
              </div>
            </motion.div>
          )}

          {selectedContract && (
            <motion.div 
              initial={{ opacity: 0, y: 300 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 300 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 backdrop-blur-3xl p-8 flex flex-col rounded-t-[40px] border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>Interact</h3>
                   <p className="text-[10px] text-gray-500 font-mono">{selectedContract.name}</p>
                </div>
                <X className="w-6 h-6 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setSelectedContract(null)} />
              </div>
              <div className="flex-1 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Executor Wallet</p>
                   <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {wallets.map(w => (
                        <div 
                          key={w.id} 
                          onClick={() => setActiveWallet(w)}
                          className={`p-3 rounded-xl border flex-shrink-0 cursor-pointer transition-all ${activeWallet?.id === w.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent'}`}
                        >
                           <p className="text-[10px] font-bold" style={{ color: activeWallet?.id === w.id ? theme.primary : 'inherit' }}>{w.name}</p>
                        </div>
                      ))}
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Function Name</p>
                   <select 
                      value={contractMethod} 
                      onChange={(e) => setContractMethod(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none appearance-none"
                   >
                      <option value="">Select Method</option>
                      {(() => {
                        try {
                          const abi = JSON.parse(selectedContract.abi);
                          return abi.filter((x: any) => x.type === 'function').map((x: any) => (
                            <option key={x.name} value={x.name}>{x.name}</option>
                          ));
                        } catch (e) { return null; }
                      })()}
                   </select>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Arguments (comma separated)</p>
                   <input type="text" placeholder="arg1, arg2, ..." value={contractArgs} onChange={(e) => setContractArgs(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none" />
                </div>
              </div>
              <div className="mt-auto">
                 <Button onClick={handleContractCall} disabled={isSending || !contractMethod || !activeWallet} className="w-full py-4 rounded-2xl" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}>
                   {isSending ? 'Executing...' : 'Send Transaction'}
                 </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className={`glass-card-premium p-6 mb-6 vault-scan ${showVaultAnimation ? 'after:opacity-100' : 'after:opacity-0'}`}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ '--scan-color': theme.primary } as any}
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: theme.primary }}>Total Assets</p>
              <h2 className="text-3xl font-black text-white leading-none">{totalUSD}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div 
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 hover:border-white/20 transition-all shadow-lg group active:scale-90"
                  onClick={() => setShowBridge(true)}
                  title="Bridge Assets"
                >
                  <ArrowLeftRight className="w-[18px] h-[18px] text-white/70 group-hover:text-white transition-colors" />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Bridge</span>
              </div>
              <button 
                className="flex items-center gap-2.5 px-7 py-3 rounded-full bg-black text-white border border-white/5 hover:bg-white/5 transition-all shadow-2xl active:scale-95 group"
                onClick={() => setShowSwap(true)}
              >
                <RefreshCw className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-700" />
                <span className="text-xs font-black uppercase tracking-widest">Swap</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <div 
                className={`px-4 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all duration-500 shadow-xl ${showHistory ? 'border-white/40 bg-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`} 
                style={{ 
                  boxShadow: showHistory ? `0 0 20px ${theme.primary}30` : 'none',
                  background: showHistory ? `linear-gradient(135deg, ${theme.primary}20, ${theme.secondary}20)` : undefined 
                }}
                onClick={() => { setShowHistory(!showHistory); setShowContracts(false); setShowNFTs(false); setShowBustaBolt(false); }}
              >
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: showHistory ? theme.primary : '#444', filter: showHistory ? `drop-shadow(0 0 5px ${theme.primary})` : 'none' }} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Activity</span>
              </div>
             <div 
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${showContracts ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} 
                onClick={() => { setShowContracts(!showContracts); setShowNFTs(false); setShowHistory(false); setShowBustaBolt(false); }}
              >
                <Cpu className="w-3 h-3" style={{ color: showContracts ? theme.primary : 'inherit' }} />
                <span className="text-[10px] font-black uppercase text-gray-300">Contracts</span>
             </div>
              <div 
                 className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${showNFTs ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} 
                 onClick={() => { setShowNFTs(!showNFTs); setShowContracts(false); setShowHistory(false); setShowBustaBolt(false); }}
              >
                 <Zap className="w-3 h-3" style={{ color: showNFTs ? theme.primary : 'inherit' }} />
                 <span className="text-[10px] font-black uppercase text-gray-300">NFTs</span>
              </div>
              <div 
                 className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${showBustaBolt ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} 
                 onClick={() => { setShowBustaBolt(!showBustaBolt); setShowNFTs(false); setShowContracts(false); setShowHistory(false); }}
              >
                 <Activity className="w-3 h-3" style={{ color: showBustaBolt ? theme.primary : 'inherit' }} />
                 <span className="text-[10px] font-black uppercase text-gray-300">BustaBolt</span>
              </div>
          </div>
        </motion.div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {showBustaBolt ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                <BustaBoltApp activeWallet={activeWallet} core={core} theme={theme} addLog={addCustomLog} />
              </motion.div>
            ) : showContracts ? (
              contracts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 rounded-[32px] bg-white/5 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><Cpu className="w-6 h-6" /></div>
                  <p className="text-gray-500 text-xs text-center leading-relaxed font-medium">No custom contracts imported. Add your first smart contract to interact.</p>
                </motion.div>
              ) : (
                contracts.map((c, i) => (
                  <motion.div 
                    key={c.address} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="p-5 rounded-[28px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group flex items-center justify-between"
                    onClick={() => setSelectedContract(c)}
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-xl transition-transform group-hover:-rotate-6" style={{ backgroundColor: `${theme.primary}20`, border: `1px solid ${theme.primary}40`, color: theme.primary }}>ABI</div>
                      <div>
                        <p className="text-base font-bold">{c.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-gray-500 font-mono tracking-tighter opacity-70">{formatAddress(c.address)}</p>
                          <span className="text-[10px] font-bold" style={{ color: theme.primary }}>{contractBalances[c.address] || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteContract(c.address); }} className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                       </button>
                       <Zap className="w-5 h-5 text-gray-400 group-hover:text-yellow-400 transition-colors" />
                    </div>
                  </motion.div>
                ))
              )
            ) : showNFTs ? (
              nfts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 rounded-[32px] bg-white/5 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><Zap className="w-6 h-6" /></div>
                  <p className="text-gray-500 text-xs text-center leading-relaxed font-medium">No NFTs imported. Add your first digital collectible to view it here.</p>
                </motion.div>
              ) : (
                nfts.map((n, i) => (
                  <motion.div 
                    key={`${n.address}-${n.tokenId}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="p-5 rounded-[28px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden shadow-xl group-hover:scale-105 transition-transform">
                        <img src="/0logov3.png" className="w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" alt="NFT" />
                      </div>
                      <div>
                        <p className="text-base font-bold">{n.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono tracking-tighter opacity-70">ID: {n.tokenId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteNFT(n.address, n.tokenId); }} className="p-2 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </motion.div>
                ))
              )
            ) : showHistory ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                   <div className="relative flex-1 mr-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="text" placeholder="Search History..." 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-white placeholder:text-gray-600 outline-none focus:bg-white/10 transition-all"
                        value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                      />
                   </div>
                   <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                      <RefreshCw className="w-4 h-4" />
                   </button>
                </div>

                <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
                   {['all', ...Object.keys(CHAINS)].map(chain => (
                      <button 
                        key={chain} 
                        onClick={() => setHistoryFilter(chain)}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${historyFilter === chain ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 bg-white/5 text-gray-500 hover:bg-white/10'}`}
                        style={{ borderColor: historyFilter === chain ? theme.primary : 'rgba(255,255,255,0.05)' }}
                      >
                         {chain}
                      </button>
                   ))}
                </div>

                {history.length === 0 ? (
                  <div className="p-10 rounded-[32px] bg-white/5 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><History className="w-6 h-6" /></div>
                    <p className="text-gray-500 text-xs text-center leading-relaxed font-medium">No transactions found. All activity from your vaults will appear here.</p>
                  </div>
                ) : (
                  history
                  .filter(h => historyFilter === 'all' || h.chainId === historyFilter)
                  .filter(h => h.hash.toLowerCase().includes(historySearch.toLowerCase()) || h.to.toLowerCase().includes(historySearch.toLowerCase()))
                  .map((h, i) => (
                    <motion.div 
                      key={h.hash} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-[24px] bg-white/[0.03] backdrop-blur-md border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/[0.1] transition-all flex items-center justify-between group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-11 h-11 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                          {h.type === 'send' ? <Send className="w-5 h-5 text-red-400/80" /> : <RefreshCw className="w-5 h-5 text-green-400/80" />}
                        </div>
                        <div>
                          <p className="text-sm font-black capitalize tracking-tight text-white/90">{h.type.replace('_', ' ')}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-[10px] text-gray-500 font-mono tracking-tighter opacity-60 cursor-pointer hover:text-white transition-colors" onClick={() => copyAddress(h.to)}>
                                {formatAddress(h.to)}
                             </p>
                             <a 
                                href={`${CHAINS[h.chainId]?.explorer}/tx/${h.hash}`} 
                                target="_blank" rel="noreferrer"
                                className="p-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                             >
                                <ExternalLink className="w-2.5 h-2.5 text-gray-400 group-hover:text-blue-400" />
                             </a>
                          </div>
                        </div>
                      </div>
                      <div className="text-right relative z-10">
                        <p className={`text-sm font-black tracking-tighter ${h.type === 'send' ? 'text-white' : 'text-green-400'}`}>
                          {h.type === 'send' ? '-' : '+'}{h.value} {h.asset}
                        </p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.1em] opacity-40">
                          {new Date(h.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · {new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              wallets.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 rounded-[32px] bg-white/5 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><Cpu className="w-6 h-6" /></div>
                  <p className="text-gray-500 text-xs text-center leading-relaxed font-medium">No vaults deployed. Click below to initialize your secure enclave.</p>
                </motion.div>
              ) : (
                wallets.map((w, i) => (
                  <motion.div 
                    key={w.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="p-5 rounded-[28px] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group flex items-center justify-between"
                    onClick={() => { setActiveWallet(w); setShowSend(true); }}
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-xl transition-transform group-hover:rotate-6" style={{ background: `linear-gradient(to br, ${theme.primary}, ${theme.secondary})` }}>{w.name.match(/\d+/)?.[0] || '1'}</div>
                      <div>
                        <p className="text-base font-bold">{w.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-gray-500 font-mono tracking-tighter opacity-70">{formatAddress(w.address)}</p>
                          <span className="text-[10px] font-black" style={{ color: theme.primary }}>
                            {nativeBalances[w.id] || '0.00'} {chains.find(c => c.id === selectedChain)?.name.split(' ')[0]}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyAddress(w.address); }}
                            className="p-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-2.5 h-2.5 text-gray-400 group-hover:text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-x-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveWallet(w); setShowSend(true); }}
                        className="px-4 py-2 rounded-xl border text-[10px] font-black hover:scale-105 active:scale-95 transition-all uppercase flex items-center gap-2 shadow-inner" 
                        style={{ backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}20`, color: theme.primary }}
                      >
                        <Send className="w-3.5 h-3.5" />Send
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveWallet(w); setShowReceiveModal(true); }}
                        className="px-4 py-2 rounded-xl border text-[10px] font-black hover:scale-105 active:scale-95 transition-all uppercase flex items-center gap-2 shadow-inner bg-white/5 border-white/10 text-white"
                      >
                        <Download className="w-3.5 h-3.5" />Receive
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveWallet(w); setShowSwap(true); }}
                        className="px-4 py-2 rounded-xl border text-[10px] font-black hover:scale-105 active:scale-95 transition-all uppercase flex items-center gap-2 shadow-inner bg-white/5 border-white/10 text-white"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-bolt-blue" />Swap
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveWallet(w); setShowBridge(true); }}
                        className="px-4 py-2 rounded-xl border text-[10px] font-black hover:scale-105 active:scale-95 transition-all uppercase flex items-center gap-2 shadow-inner bg-white/5 border-white/10 text-white"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />Bridge
                      </button>
                    </div>
                  </motion.div>
                ))
              )
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5">
          {showContracts ? (
            <Button 
              onClick={() => setShowImportContract(true)} 
              variant="primary" 
              className="w-full py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-2xl"
              style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
            >
              <Plus className="w-6 h-6" /><span>Import New Contract</span>
            </Button>
          ) : showNFTs ? (
            <Button 
              onClick={() => setShowImportNFT(true)} 
              variant="primary" 
              className="w-full py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-2xl"
              style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
            >
              <Plus className="w-6 h-6" /><span>Import New NFT</span>
            </Button>
          ) : (
            <Button 
              onClick={handleCreateWallet} 
              variant="primary" 
              className="w-full py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-2xl"
              style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
            >
              {isCreating ? <span className="flex items-center gap-3"><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />Securing...</span> : <><Plus className="w-6 h-6" /><span>Create New Vault</span></>}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isPopup) {
    return renderWalletDashboard();
  }

  return (
    <div style={themeStyles as any} className={`min-h-screen text-white overflow-hidden relative font-sans flex flex-col items-center justify-center ${theme.id === 'glossy' ? 'bg-[#07080A]' : 'bg-bolt-dark'}`}>
       {/* Security Overlay */}
       <AnimatePresence mode="wait">
         {isLocked && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1000] bg-[#0A0B0E]/95 backdrop-blur-[60px] flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: `${theme.primary}10` }} />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: `${theme.secondary}10` }} />
              </div>

              <div className="relative z-10 w-full max-w-sm">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-12">
                  <div className="w-24 h-24 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase italic">
                    {isVaultPrepared ? 'Unlock Vault' : 'Secure Vault'}
                  </h1>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] px-8">
                    {isVaultPrepared ? 'Enter password to access Boltwallet' : 'Create a master password for your high-fidelity assets'}
                  </p>
                </motion.div>

                <div className="space-y-4">
                  {!showRecovery ? (
                    <>
                      <div className="space-y-2">
                        <input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && (isVaultPrepared ? handleUnlock() : handleSetupPassword())}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-sm font-bold text-white placeholder:text-gray-600 outline-none focus:bg-white/10 transition-all shadow-inner"
                        />
                        {!isVaultPrepared && (
                          <input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetupPassword()}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-sm font-bold text-white placeholder:text-gray-600 outline-none focus:bg-white/10 transition-all shadow-inner"
                          />
                        )}
                      </div>
                      {passwordError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{passwordError}</p>}
                      {isVaultPrepared && (
                        <div className="flex justify-center mb-4">
                          <button 
                            onClick={() => setShowRecovery(true)}
                            className="text-[11px] font-bold uppercase text-white hover:text-blue-400 transition-all tracking-[0.2em] border-b border-white/40 hover:border-blue-400/40 pb-1"
                          >
                            Forgot Password? Use Recovery Phrase
                          </button>
                        </div>
                      )}

                      <Button 
                        onClick={isVaultPrepared ? handleUnlock : handleSetupPassword}
                        disabled={isSending || !password}
                        className="w-full h-14 text-lg font-black tracking-widest bg-gradient-to-r from-bolt-blue to-bolt-purple hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group shadow-[0_0_20px_rgba(0,209,255,0.2)] disabled:opacity-50 disabled:grayscale"
                      >
                        {isSending ? 'Authenticating...' : (isVaultPrepared ? 'Unlock' : 'Begin Setup')}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-6">
                       <div className="grid grid-cols-3 gap-2">
                          {recoveryMnemonic.map((word, i) => (
                             <div key={i} className="relative group">
                                <span className="absolute left-2 top-1.5 text-[8px] font-black text-gray-600 uppercase group-focus-within:text-white/55">{i + 1}</span>
                                <input 
                                   type="text"
                                   className="w-full bg-white/5 border border-white/5 rounded-xl pt-4 pb-2 px-2 text-[10px] font-bold text-white outline-none focus:bg-white/10 focus:border-white/20 transition-all text-center"
                                   value={word}
                                   onChange={(e) => {
                                      const newMnemonic = [...recoveryMnemonic];
                                      newMnemonic[i] = e.target.value.toLowerCase();
                                      setRecoveryMnemonic(newMnemonic);
                                      setRecoveryError('');
                                   }}
                                />
                             </div>
                          ))}
                       </div>
                       
                       <div className="space-y-3">
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"}
                              placeholder="New Master Password"
                              value={recoveryPassword}
                              onChange={(e) => setRecoveryPassword(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-sm font-bold text-white placeholder:text-gray-600 outline-none focus:bg-white/10 transition-all shadow-inner"
                            />
                            <button 
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          
                          <div className="relative">
                            <input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Confirm New Password"
                              value={recoveryConfirmPassword}
                              onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-sm font-bold text-white placeholder:text-gray-600 outline-none focus:bg-white/10 transition-all shadow-inner"
                            />
                            <button 
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                       </div>

                       {recoveryError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">{recoveryError}</p>}

                       <div className="space-y-3">
                          <Button 
                            onClick={handleRecovery}
                            disabled={isSending}
                            className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl"
                            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                          >
                            {isSending ? 'Recovering...' : 'Reset & Restore'}
                          </Button>
                          <button 
                            onClick={() => setShowRecovery(false)}
                            className="w-full text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all tracking-widest py-2"
                          >
                            Back to Login
                          </button>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
         )}
       </AnimatePresence>

       {!isLocked ? (
         // Desktop Workspace View (unlocked)
         <div className="absolute inset-0 z-10 flex flex-col overflow-hidden">
           {/* Animated wallpaper */}
           <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#030305] z-0">
             <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] bg-cyan-500/10 animate-pulse" style={{ animationDuration: '8s' }} />
             <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] rounded-full blur-[150px] bg-purple-500/10 animate-pulse" style={{ animationDuration: '12s' }} />
             <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
           </div>

           {/* Desktop Shortcuts */}
           <div className="absolute top-10 left-10 flex flex-col gap-6 z-10">
             {Object.values(APPS).map((app) => {
               const Icon = app.icon;
               return (
                 <div 
                   key={app.id}
                   onDoubleClick={() => handleDockClick(app.id)}
                   className="flex flex-col items-center justify-center w-20 h-20 rounded-xl hover:bg-white/5 active:bg-white/10 border border-transparent hover:border-white/5 cursor-pointer group transition-all"
                 >
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all" style={{ border: `1px solid ${app.color}20` }}>
                     <Icon className="w-5 h-5" style={{ color: app.color }} />
                   </div>
                   <span className="text-[9px] font-black tracking-wide text-white/70 group-hover:text-white mt-2 text-center select-none truncate w-full px-1">{app.title}</span>
                 </div>
               );
             })}
           </div>

           {/* Desktop App Windows */}
           <div className="flex-1 p-8 relative z-10 overflow-hidden">
             
             {/* 1. Bolt Wallet App Window */}
             {openApps.includes('wallet') && (
               <DesktopWindow 
                 id="wallet" 
                 title="Bolt Wallet" 
                 defaultWidth={420} 
                 defaultHeight={700}
                 onClose={() => {
                   setOpenApps(prev => prev.filter(x => x !== 'wallet'));
                   setAppLaunchStates(prev => {
                     const copy = { ...prev };
                     delete copy.wallet;
                     return copy;
                   });
                 }}
                 isMinimized={minimizedApps.includes('wallet')}
                 onMinimize={() => setMinimizedApps(prev => [...prev, 'wallet'])}
                 isActive={activeApp === 'wallet'}
                 onFocus={() => setActiveApp('wallet')}
                 launchState={appLaunchStates['wallet']}
                 launchProgress={appLaunchProgress['wallet']}
                 launchLogs={appLaunchLogs['wallet']}
                 skipBoot={() => setAppLaunchStates(prev => ({ ...prev, wallet: 'ready' }))}
               >
                 {renderWalletDashboard("w-full h-full rounded-none border-0")}
               </DesktopWindow>
             )}

             {/* 2. BustaBolt Crash App Window */}
             {openApps.includes('bustabolt') && (
               <DesktopWindow 
                 id="bustabolt" 
                 title="BustaBolt Game" 
                 defaultWidth={900} 
                 defaultHeight={600}
                 onClose={() => {
                   setOpenApps(prev => prev.filter(x => x !== 'bustabolt'));
                   setAppLaunchStates(prev => {
                     const copy = { ...prev };
                     delete copy.bustabolt;
                     return copy;
                   });
                 }}
                 isMinimized={minimizedApps.includes('bustabolt')}
                 onMinimize={() => setMinimizedApps(prev => [...prev, 'bustabolt'])}
                 isActive={activeApp === 'bustabolt'}
                 onFocus={() => setActiveApp('bustabolt')}
                 launchState={appLaunchStates['bustabolt']}
                 launchProgress={appLaunchProgress['bustabolt']}
                 launchLogs={appLaunchLogs['bustabolt']}
                 skipBoot={() => setAppLaunchStates(prev => ({ ...prev, bustabolt: 'ready' }))}
               >
                 <BustaBoltApp activeWallet={activeWallet} core={core} theme={theme} addLog={addCustomLog} />
               </DesktopWindow>
             )}

             {/* 3. Telemetry Console Window */}
             {openApps.includes('logs') && (
               <DesktopWindow 
                 id="logs" 
                 title="Telemetry Log Console" 
                 defaultWidth={700} 
                 defaultHeight={480}
                 onClose={() => {
                   setOpenApps(prev => prev.filter(x => x !== 'logs'));
                   setAppLaunchStates(prev => {
                     const copy = { ...prev };
                     delete copy.logs;
                     return copy;
                   });
                 }}
                 isMinimized={minimizedApps.includes('logs')}
                 onMinimize={() => setMinimizedApps(prev => [...prev, 'logs'])}
                 isActive={activeApp === 'logs'}
                 onFocus={() => setActiveApp('logs')}
                 launchState={appLaunchStates['logs']}
                 launchProgress={appLaunchProgress['logs']}
                 launchLogs={appLaunchLogs['logs']}
                 skipBoot={() => setAppLaunchStates(prev => ({ ...prev, logs: 'ready' }))}
               >
                 <div className="h-full flex flex-col p-6 font-mono text-[10px] bg-[#050608] text-white">
                   <div className="flex justify-between items-center mb-4">
                     <span className="text-gray-500 uppercase tracking-widest text-[9px]">Live System Stream</span>
                     <button onClick={() => setLogs([])} className="text-red-400 hover:text-red-300 font-bold uppercase text-[9px]">Clear Logs</button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                     {logs.length === 0 ? (
                       <div className="h-full flex items-center justify-center text-gray-700 uppercase tracking-[0.3em]">No System Logs</div>
                     ) : (
                       logs.slice().reverse().map((log: any, i) => (
                         <div key={i} className="border-b border-white/[0.02] pb-2 last:border-0">
                           <div className="flex items-center gap-2 text-[8px] mb-1">
                             <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                               log.status === 'error' ? 'bg-red-500/20 text-red-400' :
                               log.status === 'success' ? 'bg-green-500/20 text-green-400' :
                               'bg-blue-500/20 text-blue-400'
                             }`}>{log.type}</span>
                             <span className="text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                           </div>
                           <p className="text-gray-300">{log.message}</p>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               </DesktopWindow>
             )}

             {/* 4. Vault Settings Window */}
             {openApps.includes('settings') && (
               <DesktopWindow 
                 id="settings" 
                 title="Vault Settings" 
                 defaultWidth={700} 
                 defaultHeight={600}
                 onClose={() => {
                   setOpenApps(prev => prev.filter(x => x !== 'settings'));
                   setAppLaunchStates(prev => {
                     const copy = { ...prev };
                     delete copy.settings;
                     return copy;
                   });
                 }}
                 isMinimized={minimizedApps.includes('settings')}
                 onMinimize={() => setMinimizedApps(prev => [...prev, 'settings'])}
                 isActive={activeApp === 'settings'}
                 onFocus={() => setActiveApp('settings')}
                 launchState={appLaunchStates['settings']}
                 launchProgress={appLaunchProgress['settings']}
                 launchLogs={appLaunchLogs['settings']}
                 skipBoot={() => setAppLaunchStates(prev => ({ ...prev, settings: 'ready' }))}
               >
                 {renderSettingsContent()}
               </DesktopWindow>
             )}

           </div>

           {/* Dock Launcher Bar */}
           <div className="h-24 flex items-center justify-center pb-6 relative z-30">
             <div className="glass-glossy px-8 py-3 rounded-3xl border border-white/10 flex items-center gap-6 shadow-2xl relative">
               
               {/* Dock Apps */}
               {[
                 { id: 'wallet', title: 'Wallet', icon: Wallet, color: 'text-bolt-blue' },
                 { id: 'bustabolt', title: 'BustaBolt', icon: Activity, color: 'text-purple-400 animate-pulse' },
                 { id: 'logs', title: 'Console', icon: Terminal, color: 'text-green-400' },
                 { id: 'settings', title: 'Settings', icon: Settings, color: 'text-orange-400' }
               ].map(app => {
                 const Icon = app.icon;
                 const isOpen = openApps.includes(app.id);
                 const isMinimized = minimizedApps.includes(app.id);
                 const isLaunching = appLaunchStates[app.id] === 'launching';
                 const isActive = activeApp === app.id && !isMinimized;
                 
                 return (
                   <button 
                     key={app.id}
                     onClick={() => handleDockClick(app.id)}
                     className="flex flex-col items-center gap-1 group relative active:scale-95 transition-all"
                   >
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                       isActive ? 'bg-white/15 border border-white/30 scale-105' : 
                       isOpen ? 'bg-white/10 border border-white/20' : 'bg-white/5 opacity-50 hover:opacity-100 hover:scale-105'
                     }`}>
                       <Icon className={`w-6 h-6 ${app.color}`} style={{ color: APPS[app.id]?.color }} />
                     </div>
                     <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">{app.title}</span>
                     
                     {/* Active indicator dot */}
                     {isOpen && (
                       <div 
                         className={`absolute -bottom-1 w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                           isLaunching ? 'animate-ping' : ''
                         }`}
                         style={{ 
                           backgroundColor: APPS[app.id]?.color,
                           opacity: isMinimized ? 0.35 : 1,
                           boxShadow: isActive ? `0 0 8px ${APPS[app.id]?.color}` : 'none'
                         }} 
                       />
                     )}
                   </button>
                 );
               })}
             </div>
           </div>
         </div>
       ) : (
         // Landing Page View (locked)
         <>
           <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
              <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ backgroundColor: `${theme.primary}20` }} />
              <div className="absolute top-1/2 -right-48 w-[800px] h-[800px] rounded-full blur-[200px]" style={{ backgroundColor: `${theme.secondary}20` }} />
           </div>

           <div className="relative z-10 max-w-4xl mx-auto px-10 text-center">
              <motion.img 
                src="/0logov3.png" onClick={cycleTheme} 
                className="w-32 h-32 mx-auto mb-12 cursor-pointer drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                animate={{ rotateY: [0, 180, 360] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} 
              />
              <h1 className="text-8xl font-black mb-8 leading-[0.85] tracking-tighter" style={{ color: theme.primary }}>Boltwallet {theme.name}</h1>
              <p className="text-2xl text-gray-500 mb-16 leading-relaxed max-w-2xl mx-auto font-medium">Enterprise-grade multi-chain security with an interactive {theme.name} interface. Switch themes by clicking the logo.</p>
              <div className="flex items-center justify-center gap-6">
                <Button onClick={handleCreateWallet} className="px-14 h-20 text-xl rounded-3xl" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}>Initialize Vault</Button>
                <Button variant="glass" className="px-14 h-20 text-xl rounded-3xl">Import State</Button>
              </div>
           </div>

           <div className="fixed bottom-12 flex gap-10 opacity-30">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-gray-400">Security</span>
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-gray-400">Scale</span>
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-gray-400">Speed</span>
           </div>
         </>
       )}
    </div>
  );
};

export default App;
