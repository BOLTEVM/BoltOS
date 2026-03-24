import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Shield, Zap, Globe, Cpu, ArrowRight, CheckCircle2, Copy, ExternalLink, Settings, Plus, Menu, X } from 'lucide-react';
import { Button } from '@boltwallet/ui';
import { BoltwalletCore } from '@boltwallet/core';

const core = new BoltwalletCore();

const App = () => {
  const [selectedChain, setSelectedChain] = useState('ethereum');
  const [wallets, setWallets] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const chains = [
    { id: 'ethereum', name: 'Ethereum', icon: <Globe className="w-4 h-4" />, color: '#627EEA' },
    { id: 'bsc', name: 'BSC', icon: <Zap className="w-4 h-4" />, color: '#F3BA2F' },
    { id: 'polygon', name: 'Polygon', icon: <Shield className="w-4 h-4" />, color: '#8247E5' },
    { id: 'pulsechain', name: 'PulseChain', icon: <Zap className="w-4 h-4" />, color: '#FF00FF' },
    { id: 'quai', name: 'Quai Network', icon: <Cpu className="w-4 h-4" />, color: '#00D1FF' },
    { id: 'monad', name: 'Monad', icon: <Shield className="w-4 h-4" />, color: '#8A2BE2' },
    { id: 'bitcoin', name: 'Bitcoin', icon: <Wallet className="w-4 h-4" />, color: '#F7931A' },
    { id: 'sui', name: 'Sui', icon: <Zap className="w-4 h-4" />, color: '#6FBCF0' },
    { id: 'xrpl_evm', name: 'XRPL EVM', icon: <Globe className="w-4 h-4" />, color: '#23292F' },
    { id: 'tron_evm', name: 'TRON EVM', icon: <Zap className="w-4 h-4" />, color: '#FF0013' },
  ];

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      // Direct interaction with OWS (no mock)
      const wallet = await core.createNewWallet(`Wallet ${wallets.length + 1}`);
      setWallets([...wallets, `Wallet ${wallets.length + 1}`]);
    } catch (err) {
      console.error("Failed to create wallet", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen text-white overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-bolt-blue/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] bg-bolt-indigo/10 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Boltwallet" className="w-10 h-10 object-contain" />
          <span className="text-2xl font-black tracking-tighter neon-text">BOLTWALLET</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button className="hover:text-bolt-blue transition-colors font-medium">Dashboard</button>
          <button className="hover:text-bolt-blue transition-colors font-medium">Assets</button>
          <button className="hover:text-bolt-blue transition-colors font-medium">Security</button>
          <Button variant="glass">Connect Extension</Button>
        </div>
        <Menu className="md:hidden w-6 h-6 cursor-pointer" />
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-8 sm:pt-12 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 sm:gap-16 items-center">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-6 text-bolt-blue">
              <Zap className="w-3 h-3" />
              Powered by Open Wallet Standard
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tighter">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-bolt-blue to-bolt-indigo">Non-Custodial</span> Future.
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-10 leading-relaxed max-w-lg">
              Boltwallet provides secure, policy-gated signing across Ethereum, BSC, QUAI, and beyond. Designed for humans and AI agents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleCreateWallet} className="px-6 sm:px-10 h-14 sm:h-16 text-base sm:text-lg flex items-center justify-center gap-3" variant="primary">
                {isCreating ? 'Accessing Vault...' : 'Create New Wallet'}
                {!isCreating && <ArrowRight className="w-5 h-5" />}
              </Button>
              <Button variant="glass" className="px-6 sm:px-10 h-14 sm:h-16 text-base sm:text-lg">
                Import Existing
              </Button>
            </div>

            <div className="mt-12 sm:mt-16 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6 sm:gap-8 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
               {chains.map(c => (
                 <div key={c.id} className="flex items-center gap-2">
                   <div style={{ color: c.color }}>{c.icon}</div>
                   <span className="text-sm font-bold">{c.name}</span>
                 </div>
               ))}
            </div>
          </motion.div>

          {/* Feature Showcase / UI Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card p-1 overflow-hidden relative group">
               <div className="absolute inset-0 bg-gradient-to-br from-bolt-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               <div className="bg-bolt-dark/90 rounded-[22px] p-8 relative z-10">
                 {/* Mock UI for Visual Impact */}
                 <div className="flex items-center justify-between mb-12">
                   <div>
                     <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Active Wallet</p>
                     <p className="text-2xl font-black">Main Treasury</p>
                   </div>
                   <div className="w-12 h-12 rounded-full bg-bolt-blue/20 flex items-center justify-center border border-bolt-blue/30">
                     <Wallet className="w-6 h-6 text-bolt-blue" />
                   </div>
                 </div>

                 <div className="mb-12">
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Total Balance</p>
                   <div className="flex items-baseline gap-3">
                     <span className="text-5xl font-black tracking-tight">$42,904.50</span>
                     <span className="text-green-400 font-bold text-sm">+5.2%</span>
                   </div>
                 </div>

                 <div className="space-y-4">
                   {wallets.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/20 text-center">
                        <p className="text-gray-500 text-sm">No active wallets found in vault. Create one to get started.</p>
                      </div>
                   ) : (
                      wallets.map(w => (
                        <div key={w} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bolt-blue to-bolt-indigo flex items-center justify-center font-bold text-xs">
                              {w.substring(0, 2)}
                            </div>
                            <div>
                               <p className="font-bold">{w}</p>
                               <p className="text-xs text-gray-500">0x71C...4f31</p>
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-bolt-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))
                   )}
                 </div>
               </div>
            </div>

            {/* Floating Badges */}
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -top-8 -right-8 glass-card px-6 py-3 flex items-center gap-3"
            >
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="font-bold text-sm">Vault Secure</span>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Cross-Platform CTA */}
      <footer className="relative z-10 border-t border-white/5 pt-24 pb-12 bg-bolt-dark">
         <div className="max-w-7xl mx-auto px-8 text-center">
            <h2 className="text-4xl font-black mb-12">Everywhere You go.</h2>
            <div className="grid md:grid-cols-3 gap-8">
               <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-bolt-blue/50 transition-colors">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Globe className="w-6 h-6 text-bolt-blue" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Browser Dashboard</h3>
                  <p className="text-gray-500 text-sm">Manage your treasury with a high-performance web interface.</p>
               </div>
               <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-bolt-blue/50 transition-colors translate-y-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Plus className="w-6 h-6 text-bolt-blue" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Chrome Extension</h3>
                  <p className="text-gray-500 text-sm">Seamlessly interact with DeFi and NFTs on any Chromium browser.</p>
               </div>
               <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-bolt-blue/50 transition-colors">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <zap className="w-6 h-6 text-bolt-blue" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Mobile Application</h3>
                  <p className="text-gray-500 text-sm">Secure biometric signing and push notifications on iOS and Android.</p>
               </div>
            </div>
            <p className="mt-24 text-gray-700 text-xs font-bold uppercase tracking-[0.4em]">© 2026 BOLTEVM FOUNDATION | OPEN WALLET STANDARD</p>
         </div>
      </footer>
    </div>
  );
};

export default App;
