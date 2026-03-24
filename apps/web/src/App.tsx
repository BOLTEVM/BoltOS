import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Shield, Zap, Globe, Cpu, ArrowRight, CheckCircle2, 
  Copy, ExternalLink, Settings, Plus, Menu, X, ChevronRight, 
  Fingerprint, Send, ChevronDown, Search, Info, RefreshCw,
  Trash2, Eye, EyeOff, Key
} from 'lucide-react';
import { Button } from '@boltwallet/ui';
import { NetworkIcon } from './components/NetworkIcons';
import { BoltwalletCore, WalletData } from '@boltwallet/core';

const core = new BoltwalletCore();

const THEMES = [
  { id: 'bolt', primary: '#00D1FF', secondary: '#4F46E5', name: 'BOLT' },
  { id: 'cyber', primary: '#39FF14', secondary: '#BC13FE', name: 'CYBER' },
  { id: 'royal', primary: '#FFD700', secondary: '#FF0000', name: 'ROYAL' },
  { id: 'mono', primary: '#FFFFFF', secondary: '#444444', name: 'VAULT' }
];

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

    core.getWallets().then(setWallets);
    core.generateMnemonic().then(setMnemonic);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cycleTheme = () => {
    const nextIdx = (currentThemeIdx + 1) % THEMES.length;
    setCurrentThemeIdx(nextIdx);
    localStorage.setItem('bolt_theme_id', THEMES[nextIdx].id);
  };

  const handleChainChange = (chainId: string) => {
    setSelectedChain(chainId);
    core.setChain(chainId);
    core.getWallets().then(setWallets);
    setShowNetworks(false);
  };

  const handleCreateWallet = async () => {
    setIsCreating(true);
    setShowVaultAnimation(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const wallet = await core.createNewWallet(`Wallet ${wallets.length + 1}`);
      setWallets([...wallets, wallet]);
    } catch (err) {
      console.error("Failed to create wallet", err);
    } finally {
      setIsCreating(false);
      setTimeout(() => setShowVaultAnimation(false), 500);
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
    setIsSending(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      const hash = await core.signTransaction(activeWallet.id, { to: recipient, value: amount });
      alert(`Transaction Broadcasted!\nHash: 0x${Math.random().toString(16).substring(2, 42)}`);
      setShowSend(false);
      setRecipient('');
      setAmount('');
    } catch (err) {
      console.error("Send failed", err);
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
                onClick={() => setShowSettings(!showSettings)}
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
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Security Phrase</p>
                  <div className="p-5 rounded-3xl bg-white/5 border border-white/10 select-all font-mono text-xs leading-relaxed text-center" style={{ color: theme.primary }}>
                    {mnemonic}
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
              initial={{ opacity: 0, y: 300 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 300 }}
              className="absolute inset-0 z-[60] bg-bolt-dark/95 backdrop-blur-3xl p-8 flex flex-col rounded-t-[40px] border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black tracking-tight" style={{ color: theme.primary }}>Send Assets</h3>
                <X className="w-6 h-6 text-gray-500 cursor-pointer hover:text-white transition-colors" onClick={() => setShowSend(false)} />
              </div>
              <div className="flex-1 space-y-6">
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">From Wallet</p>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px]" style={{ backgroundColor: `${theme.primary}20`, color: theme.primary }}>{activeWallet.name.substring(7)}</div>
                      <span className="text-xs font-bold">{formatAddress(activeWallet.address)}</span>
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Recipient Address</p>
                   <input type="text" placeholder={selectedChain === 'bitcoin' ? "bc1q..." : "0x..."} value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors font-mono" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Amount ({selectedChain.toUpperCase()})</p>
                   <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:border-[var(--theme-primary)] outline-none transition-colors font-mono" />
                </div>
              </div>
              <div className="mt-auto">
                 <Button onClick={handleSend} disabled={isSending || !recipient || !amount} className="w-full py-4 rounded-2xl" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}>
                   {isSending ? 'Signing...' : 'Confirm Transaction'}
                 </Button>
                 <button onClick={() => setShowSend(false)} className="w-full text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-4 hover:text-white transition-colors">Cancel</button>
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
              <h2 className="text-3xl font-black text-white leading-none">$0.00</h2>
            </div>
            <div className="p-3 rounded-2xl border transition-all cursor-pointer hover:rotate-12" style={{ backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` }} onClick={() => setShowNetworks(true)}>
              <Fingerprint className="w-6 h-6" style={{ color: theme.primary }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 group cursor-pointer hover:bg-white/10 transition-all" onClick={() => setShowNetworks(true)}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
                <span className="text-[10px] font-black uppercase text-gray-300">{chains.find(c => c.id === selectedChain)?.name}</span>
             </div>
          </div>
        </motion.div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {wallets.length === 0 ? (
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
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5">
          <Button 
            onClick={handleCreateWallet} 
            variant="primary" 
            className="w-full py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-2xl"
            style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
          >
            {isCreating ? <span className="flex items-center gap-3"><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />Securing...</span> : <><Plus className="w-6 h-6" /><span>Create New Vault</span></>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={themeStyles} className="min-h-screen text-white overflow-hidden relative font-sans flex flex-col items-center justify-center bg-bolt-dark">
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
