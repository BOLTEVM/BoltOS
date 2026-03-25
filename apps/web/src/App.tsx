import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Send, 
  Shield, 
  Cpu, 
  Globe, 
  Zap, 
  Copy, 
  Trash2, 
  Fingerprint, 
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
  Users
} from 'lucide-react';
import { Button } from '@boltwallet/ui';
import { NetworkIcon } from './components/NetworkIcons';
import { BoltwalletCore, WalletData, ContractData, NFTData, CHAINS, HistoryData } from '@boltwallet/core';
import { ethers } from 'ethers';

const core = new BoltwalletCore() as any;

const THEMES = [
  { id: 'bolt', primary: '#00D1FF', secondary: '#4F46E5', name: 'BOLT' },
  { id: 'cyber', primary: '#39FF14', secondary: '#BC13FE', name: 'CYBER' },
  { id: 'royal', primary: '#FFD700', secondary: '#FF0000', name: 'ROYAL' },
  { id: 'mono', primary: '#FFFFFF', secondary: '#444444', name: 'VAULT' }
];

const ERC20_ABI = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"}]';
const ERC721_ABI = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"count","type":"uint256"}],"type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"name":"owner","type":"address"}],"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"type":"function"},{"constant":true,"inputs":[{"name":"_tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"}]';

const App = () => {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isPopup, setIsPopup] = useState(false);
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

  const theme = THEMES[currentThemeIdx];

  const chains = [
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
  ];

  useEffect(() => {
    const handleResize = () => {
      const popup = window.innerWidth < 600 || !!(window as any).chrome?.runtime?.id;
      setIsPopup(popup);
      document.documentElement.classList.toggle('is-popup', popup);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Load persisted theme
    const savedTheme = localStorage.getItem('bolt_theme_id');
    if (savedTheme) {
      const idx = THEMES.findIndex(t => t.id === savedTheme);
      if (idx !== -1) setCurrentThemeIdx(idx);
    }

    const initSecurity = async () => {
      // 1. Check for background session (Extension Bridge)
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
    initSecurity();

    core.getWallets().then(setWallets);
    core.listContracts().then(setContracts);
    core.listNFTs().then(setNfts);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (contracts.length > 0 && activeWallet) {
      contracts.forEach(async (c) => {
        const balance = await core.getContractBalance(c.address, activeWallet.address, c.decimals);
        setContractBalances(prev => ({ ...prev, [c.address]: balance }));
      });
    }
  }, [contracts, activeWallet]);

  // Price & Balance Synchronization
  useEffect(() => {
    if (isLocked) return;

    const syncData = async () => {
      try {
        const newPrices = await core.getAssetPrices();
        setPrices(newPrices);

        const balances: Record<string, string> = {};
        for (const w of wallets) {
          if (!w.address || w.address === '0x0000000000000000000000000000000000000000') continue;
          const bal = await core.getNativeBalance(w.address);
          balances[w.id] = bal;
        }
        setNativeBalances(balances);

        let total = 0;
        const nativePrice = newPrices[selectedChain] || 0;
        Object.values(balances).forEach(bal => {
          total += parseFloat(bal) * nativePrice;
        });

        // Add contract balances to total (assuming $1 for tokens if price not found, for simplified but non-zero view)
        Object.entries(contractBalances).forEach(([addr, bal]) => {
           const tokenPrice = newPrices[addr] || 1; // Fallback to $1 if token price not in map
           total += parseFloat(bal) * tokenPrice;
        });

        setTotalUSD(total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

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
  }, [isLocked, selectedChain, wallets, contractBalances, activeWallet]);

  const cycleTheme = () => {
    const nextIdx = (currentThemeIdx + 1) % THEMES.length;
    setCurrentThemeIdx(nextIdx);
    localStorage.setItem('bolt_theme_id', THEMES[nextIdx].id);
  };

  const handleChainChange = (chainId: string) => {
    setSelectedChain(chainId);
    core.setChain(chainId);
    core.getWallets().then(setWallets);
    core.listContracts().then(setContracts);
    setShowNetworks(false);
  };

  const handleSetupPassword = async () => {
    if (password.length < 8) return setPasswordError("Password must be at least 8 characters");
    if (password !== confirmPassword) return setPasswordError("Passwords do not match");
    
    setIsSending(true);
    try {
      const mnemon = await core.setupVault(password);
      setMnemonic(mnemon);
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
      if (window.chrome?.runtime?.id) {
        // @ts-ignore
        window.chrome.runtime.sendMessage({ type: 'BOLT_SET_SESSION', session: mnemonic });
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

      // Broadcast session to background
      // @ts-ignore
      if (window.chrome?.runtime?.id) {
        // @ts-ignore
        window.chrome.runtime.sendMessage({ type: 'BOLT_SET_SESSION', session: mnemon });
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

  const handleResetVault = () => {
    if (confirm("Are you sure you want to reset the vault? ALL data will be lost.")) {
      localStorage.clear();
      setWallets([]);
      setShowSettings(false);
      window.location.reload();
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount || !activeWallet) return;
    if (!ethers.isAddress(recipient || '') && !(recipient as string).includes('.')) {
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
      
      setProposedTx({
        to: recipient,
        value: amount,
        from: activeWallet.address,
        maxFeePerGas: ethers.parseUnits(estimates.average.maxFee, 'gwei').toString(),
        maxPriorityFeePerGas: ethers.parseUnits(estimates.average.priorityFee, 'gwei').toString(),
        gasLimit: '21000',
        timestamp: Date.now()
      });
      
      setShowConfirmSend(true);
      setSimulationStatus('success');
      setEstimatedFee(`${estimates.average.speed.charAt(0).toUpperCase() + estimates.average.speed.slice(1)} · ~${(parseFloat(estimates.average.maxFee) * 21000 / 1e9).toFixed(5)}`);
    } catch (err) {
      console.error("Gas fetch failed", err);
      // Fallback
      setProposedTx({ to: recipient, value: amount, from: activeWallet.address });
      setShowConfirmSend(true);
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

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const themeStyles = {
    '--theme-primary': theme.primary,
    '--theme-secondary': theme.secondary,
  } as React.CSSProperties;

  if (isPopup) {
    return (
      <div 
        style={themeStyles}
        className="w-[380px] min-h-[600px] bg-bolt-dark text-white overflow-hidden flex flex-col p-6 font-sans selection:bg-bolt-blue/30 relative"
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
               <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setShowNetworks(true)}>
                  <span className="text-xl font-black tracking-tighter leading-none" style={{ color: theme.primary }}>{theme.name}</span>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
               </div>
               <span className="text-[8px] font-bold tracking-[0.4em] text-gray-500">SECURE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all group" onClick={() => setShowNetworks(true)}>
               <div style={{ color: theme.primary }} className="group-hover:scale-110 transition-transform">{chains.find(c => c.id === selectedChain)?.icon || <Globe className="w-3 h-3" />}</div>
               <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-white transition-colors" />
            </div>
             <Settings 
                className={`w-5 h-5 cursor-pointer transition-colors ${showSettings ? 'text-bolt-blue' : 'text-gray-400 hover:text-white'}`} 
                onClick={async () => {
                   if (showSettings) {
                      setMnemonic('');
                      setShowMnemonicPlain(false);
                   }
                   setShowSettings(!showSettings);
                }}
                style={{ color: showSettings ? theme.primary : undefined }}
             />
             <X className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
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
              <div className="mt-8 pt-8 border-t border-white/5">
                 <Button onClick={() => setShowNetworks(false)} className="w-full py-4 rounded-2xl">Done</Button>
              </div>
            </motion.div>
          )}

          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 backdrop-blur-xl p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>Vault Settings</h3>
                <X className="w-6 h-6 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setShowSettings(false)} />
              </div>
              <div className="flex-1 space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Security Phrase</p>
                    <button 
                      onClick={async () => {
                        if (!showMnemonicPlain && !mnemonic) {
                          const mnemon = await core.getSession();
                          setMnemonic(mnemon || '');
                        }
                        setShowMnemonicPlain(!showMnemonicPlain);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    >
                      {showMnemonicPlain ? <EyeOff className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" /> : <Eye className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />}
                      <span className="text-[9px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest">{showMnemonicPlain ? 'Hide' : 'Reveal'}</span>
                    </button>
                  </div>
                  <div className={`p-6 rounded-3xl bg-white/5 border border-white/10 font-mono text-xs leading-relaxed text-center transition-all duration-300 ${!showMnemonicPlain ? 'blur-md select-none' : 'select-all'}`} style={{ color: theme.primary }}>
                    {showMnemonicPlain ? mnemonic : '•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••'}
                  </div>
                </div>
                <div className="pt-8 border-t border-white/5">
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Danger Zone</p>
                   <Button variant="glass" className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 py-4" onClick={handleResetVault}>Reset Vault Data</Button>
                </div>
              </div>
              <div className="mt-auto">
                 <Button onClick={() => setShowSettings(false)} className="w-full py-4" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}>Close Settings</Button>
              </div>
            </motion.div>
          )}

          {showSend && activeWallet && (
            <motion.div 
              initial={{ opacity: 0, x: 380 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 380 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 text-white backdrop-blur-3xl flex flex-col font-sans"
            >
              <div className="p-6 flex flex-col h-full">
                {/* Header with improved aesthetics */}
                <div className="flex items-center justify-between mb-2">
                  <ArrowLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:bg-white/10 rounded-full transition-all p-1 box-content" onClick={() => setShowSend(false)} />
                  <h3 className="text-base font-black tracking-tight" style={{ color: theme.primary }}>Send</h3>
                  <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2" style={{ color: theme.primary }}>
                    <Fingerprint className="w-full h-full" />
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
                    {chains.find(c => c.id === selectedChain)?.icon || <Globe className="w-3 h-3" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{chains.find(c => c.id === selectedChain)?.name}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-white transition-all" />
                </div>

                {/* Form Sections with Glassmorphism */}
                <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide pr-1 pb-4">
                  {/* Recipient Input Card */}
                  <div className="p-5 rounded-[28px] bg-white/5 border border-white/5 focus-within:bg-white/10 focus-within:border-white/10 transition-all flex flex-col gap-2 group shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-1 group-focus-within:scale-105 transition-transform" style={{ color: theme.primary }}>
                        <User className="w-5 h-5" />
                      </div>
                      <Users className="w-5 h-5 text-gray-500 cursor-pointer hover:text-white transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Address, domain or identity" 
                      value={recipient} 
                      onChange={(e) => setRecipient(e.target.value)}
                      className="bg-transparent text-lg font-bold text-white placeholder:text-white/10 outline-none w-full tracking-tight" 
                    />
                    <span className="text-[8px] text-gray-500 font-mono uppercase tracking-[0.2em] opacity-50">0x0000...</span>
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
                               chains.find(c => c.id === selectedChain)?.icon || <Globe className="w-5 h-5" />
                             )}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{sendTab === 'nft' ? 'Collection' : 'Asset'}</p>
                            <p className="text-sm font-black text-white">{sendTab === 'nft' ? 'NFT Collection' : chains.find(c => c.id === selectedChain)?.name}</p>
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
                         {sendTab === 'nft' ? <Zap className="w-6 h-6" /> : (chains.find(c => c.id === selectedChain)?.icon || <Globe className="w-6 h-6" />)}
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
                               onChange={(e) => setGasSettings({ ...gasSettings, priorityFee: e.target.value })}
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
                               onChange={(e) => setGasSettings({ ...gasSettings, maxFee: e.target.value })}
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
                         onChange={(e) => setGasSettings({ ...gasSettings, gasLimit: e.target.value })}
                       />
                       <p className="text-[10px] text-gray-600 font-bold mt-3 uppercase tracking-wider">Recommended: <span className="underline decoration-dotted transition-colors hover:text-white cursor-pointer" onClick={() => setGasSettings({...gasSettings, gasLimit: '21000'})} style={{ color: theme.primary }}>21000</span></p>
                    </div>

                    <div className="p-6 rounded-[32px] bg-gradient-to-br from-white/5 to-transparent border border-white/5 space-y-5">
                       <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-gray-500">Expected Total</p>
                          <div className="text-right">
                             <p className="text-sm font-black text-white tracking-tight italic">{"<$" + (parseFloat(gasSettings.priorityFee) * parseInt(gasSettings.gasLimit) / 1e9 * (prices[selectedChain] || 0)).toFixed(2)}</p>
                             <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{(parseFloat(gasSettings.priorityFee) * parseInt(gasSettings.gasLimit) / 1e9).toFixed(5)} {chains.find(c => c.id === selectedChain)?.name.split(' ')[0]}</p>
                          </div>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                          <p className="text-xs font-bold text-gray-500">Maximum possible</p>
                          <div className="text-right">
                             <p className="text-sm font-black text-white tracking-tight italic opacity-60">{"<$" + (parseFloat(gasSettings.maxFee) * parseInt(gasSettings.gasLimit) / 1e9 * (prices[selectedChain] || 0)).toFixed(2)}</p>
                             <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">{(parseFloat(gasSettings.maxFee) * parseInt(gasSettings.gasLimit) / 1e9).toFixed(5)} {chains.find(c => c.id === selectedChain)?.name.split(' ')[0]}</p>
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
                  </>
                )}
              </div>

              <div className="w-full pt-12 border-t border-white/5 relative z-10">
                 <Button 
                   onClick={() => {
                     setTxStatus('idle');
                     setShowConfirmSend(false);
                     setShowSend(false);
                     setRecipient('');
                     setAmount('');
                   }}
                   disabled={txStatus === 'transferring'}
                   className="w-full py-5 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-black text-white shadow-xl disabled:opacity-20 uppercase tracking-[0.2em]"
                 >
                   Return to Vault
                 </Button>
              </div>
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
              <h2 className="text-3xl font-black text-white leading-none">${totalUSD}</h2>
            </div>
            <div className="p-3 rounded-2xl border transition-all cursor-pointer hover:rotate-12" style={{ backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` }} onClick={() => setShowNetworks(true)}>
              <Fingerprint className="w-6 h-6" style={{ color: theme.primary }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
              <div 
                className={`px-4 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all duration-500 shadow-xl ${showHistory ? 'border-white/40 bg-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`} 
                style={{ 
                  boxShadow: showHistory ? `0 0 20px ${theme.primary}30` : 'none',
                  background: showHistory ? `linear-gradient(135deg, ${theme.primary}20, ${theme.secondary}20)` : undefined 
                }}
                onClick={() => { setShowHistory(!showHistory); setShowContracts(false); setShowNFTs(false); }}
              >
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: showHistory ? theme.primary : '#444', filter: showHistory ? `drop-shadow(0 0 5px ${theme.primary})` : 'none' }} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Activity</span>
              </div>
             <div 
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${showContracts ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} 
                onClick={() => { setShowContracts(!showContracts); setShowNFTs(false); setShowHistory(false); }}
              >
                <Cpu className="w-3 h-3" style={{ color: showContracts ? theme.primary : 'inherit' }} />
                <span className="text-[10px] font-black uppercase text-gray-300">Contracts</span>
             </div>
              <div 
                 className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${showNFTs ? 'bg-white/15 border-white/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} 
                 onClick={() => { setShowNFTs(!showNFTs); setShowContracts(false); setShowHistory(false); }}
              >
                 <Zap className="w-3 h-3" style={{ color: showNFTs ? theme.primary : 'inherit' }} />
                 <span className="text-[10px] font-black uppercase text-gray-300">NFTs</span>
              </div>
          </div>
        </motion.div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {showContracts ? (
              contracts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 rounded-[32px] bg-white/5 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><Globe className="w-6 h-6" /></div>
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
                    <div className="flex items-center gap-x-3">
                      <button className="px-4 py-2 rounded-xl border text-[10px] font-black hover:scale-105 active:scale-95 transition-all uppercase flex items-center gap-2 shadow-inner" style={{ backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}20`, color: theme.primary }}>
                        <Send className="w-3.5 h-3.5" />Send
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
  }

  return (
    <div style={themeStyles} className="min-h-screen text-white overflow-hidden relative font-sans flex flex-col items-center justify-center bg-bolt-dark">
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
                      <Button 
                        onClick={isVaultPrepared ? handleUnlock : handleSetupPassword}
                        className="w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em]"
                        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                      >
                        {isSending ? 'Authenticating...' : (isVaultPrepared ? 'Unlock' : 'Begin Setup')}
                      </Button>
                      
                      {isVaultPrepared && (
                        <button 
                          onClick={() => setShowRecovery(true)}
                          className="w-full py-2 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors tracking-widest mt-2"
                        >
                          Forgot Password? Use Recovery Phrase
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-6">
                       <div className="grid grid-cols-3 gap-2">
                          {recoveryMnemonic.map((word, i) => (
                             <div key={i} className="relative group">
                                <span className="absolute left-2 top-1.5 text-[8px] font-black text-gray-600 uppercase group-focus-within:text-white/50">{i + 1}</span>
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
                       
                       <div className="space-y-2">
                          <input 
                            type="password"
                            placeholder="New Master Password"
                            value={recoveryPassword}
                            onChange={(e) => setRecoveryPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-8 text-xs font-bold text-white placeholder:text-gray-500 outline-none focus:bg-white/10 transition-all"
                          />
                          <input 
                            type="password"
                            placeholder="Confirm New Password"
                            value={recoveryConfirmPassword}
                            onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-8 text-xs font-bold text-white placeholder:text-gray-500 outline-none focus:bg-white/10 transition-all"
                          />
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
    </div>
  );
};

export default App;
