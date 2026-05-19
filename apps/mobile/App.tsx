import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, Image, TouchableOpacity, 
  SafeAreaView, StatusBar, TextInput, ScrollView,
  Modal, ActivityIndicator, Clipboard
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import QRCode from 'react-native-qrcode-svg';
import { BoltwalletCore } from '@boltwallet/core';

// Icons placeholder (Since we don't have a library yet, we'll use emojis or stylized View components)
const FingerprintIcon = () => <View style={styles.iconCircle}><Text style={{ color: '#00d2ff', fontSize: 24 }}>⚡</Text></View>;

const core = new BoltwalletCore();

const parseQRPayloadMobile = (raw: string): { type: string; address?: string; name?: string; chainId?: string; decimals?: number; abiCid?: string } | null => {
  const trimmed = raw.trim();
  if (trimmed.startsWith('boltxr://contract')) {
    try {
      const url = new URL(trimmed.replace('boltxr://', 'https://boltxr.local/'));
      return {
        type: 'contract',
        address: url.searchParams.get('addr') || '',
        name: url.searchParams.get('name') || '',
        decimals: parseInt(url.searchParams.get('dec') || '18', 10),
        chainId: url.searchParams.get('chain') || 'ethereum',
        abiCid: url.searchParams.get('cid') || '',
      };
    } catch { return null; }
  }
  if (trimmed.startsWith('ethereum:')) {
    return { type: 'address', address: trimmed.replace('ethereum:', '').split(/[@?/]/)[0] };
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return { type: 'address', address: trimmed };
  if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmed)) return { type: 'address', address: trimmed, chainId: 'bitcoin' };
  return { type: 'address', address: trimmed };
};

export default function App() {
  const [isCreating, setIsCreating] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  
  // Send state
  const [showSend, setShowSend] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // QR state
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [swapFromAsset, setSwapFromAsset] = useState('MON');
  const [swapToAsset, setSwapToAsset] = useState('USDC');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  // Bridge state
  const [showBridge, setShowBridge] = useState(false);
  const [bridgeFromChain, setBridgeFromChain] = useState('ethereum');
  const [bridgeToChain, setBridgeToChain] = useState('monad');
  const [bridgeAmount, setBridgeAmount] = useState('');
  const [isBridging, setIsBridging] = useState(false);

  // Lock/unlock state
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVaultSetup, setIsVaultSetup] = useState(false);
  const [nativeBalance, setNativeBalance] = useState('0.00');
  const [history, setHistory] = useState<any[]>([]);
  const [contractImportMsg, setContractImportMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      const setup = await core.isVaultSetup();
      setIsVaultSetup(setup);
      if (!setup) setIsLocked(true);
    })();
  }, []);

  // ENS Resolution
  useEffect(() => {
    const resolve = async () => {
      if (recipient.includes('.')) {
        setIsResolving(true);
        try {
          const addr = await core.resolveName(recipient);
          setResolvedAddress(addr);
        } catch (err) {
          setResolvedAddress(null);
        } finally {
          setIsResolving(false);
        }
      } else {
        setResolvedAddress(null);
      }
    };
    const timer = setTimeout(resolve, 500);
    return () => clearTimeout(timer);
  }, [recipient]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const newWallet = await core.createNewWallet("Mobile User");
      setWallet(newWallet);
      // Fetch balance immediately
      try {
        const bal = await core.getNativeBalance(newWallet.address);
        setNativeBalance(bal);
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // Periodic balance/history sync
  useEffect(() => {
    if (!wallet || isLocked) return;
    const sync = async () => {
      try {
        const bal = await core.getNativeBalance(wallet.address);
        setNativeBalance(bal);
        const hist = await core.getHistory(wallet.address, 'all');
        setHistory(hist.slice(0, 5));
      } catch {}
    };
    sync();
    const interval = setInterval(sync, 15000);
    return () => clearInterval(interval);
  }, [wallet, isLocked]);

  const handleSend = async () => {
    if (!wallet) return;
    setIsSending(true);
    try {
      const target = resolvedAddress || recipient;
      await core.executeTransaction(wallet.id, {
        to: target,
        value: amount,
        data: '0x'
      });
      alert('Transaction successful!');
      setShowSend(false);
      setRecipient('');
      setAmount('');
    } catch (err) {
      alert('Transaction failed: ' + (err as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!wallet || !swapQuote) return;
    setIsSwapping(true);
    try {
      const hash = await core.executeSwap(wallet.id, swapQuote);
      alert('Swap Successful!\n' + hash);
      setShowSwap(false);
      setSwapQuote(null);
      setSwapAmount('');
    } catch (err) {
      alert('Swap Failed: ' + (err as Error).message);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleGetQuote = async (val: string) => {
    setSwapAmount(val);
    if (!val || isNaN(parseFloat(val)) || !wallet) {
      setSwapQuote(null);
      return;
    }
    try {
      const quote = await core.getSwapQuote({
        fromChainKey: 'ethereum',
        toChainKey: 'ethereum',
        fromToken: swapFromAsset,
        toToken: swapToAsset,
        fromAmount: val,
        fromAddress: wallet.address,
        slippage: 0.005,
      });
      setSwapQuote(quote);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setShowScanner(false);
    const parsed = parseQRPayloadMobile(data);
    if (parsed?.type === 'contract' && parsed.address) {
      // Auto-import scanned contract
      setContractImportMsg(`Importing contract: ${parsed.name || parsed.address}`);
      core.importContract(parsed.name || 'Scanned Contract', parsed.address, '[]', parsed.decimals || 18)
        .then(() => setContractImportMsg(`✓ Imported ${parsed.name || parsed.address}`))
        .catch((e: Error) => setContractImportMsg(`✗ ${e.message}`));
    } else if (parsed?.address) {
      setRecipient(parsed.address);
    }
  };

  const handleExecuteBridge = async () => {
    if (!wallet || !bridgeAmount) return;
    setIsBridging(true);
    try {
      const quote = await core.getBridgeQuote({
        fromChainKey: bridgeFromChain,
        toChainKey: bridgeToChain,
        fromToken: 'native',
        toToken: 'native',
        fromAmount: bridgeAmount,
        fromAddress: wallet.address,
        slippage: 0.005,
      });
      const hash = await core.executeBridge(wallet.id, quote);
      alert('Bridge Successful!\n' + hash);
      setShowBridge(false);
      setBridgeAmount('');
    } catch (err) {
      alert('Bridge Failed: ' + (err as Error).message);
    } finally {
      setIsBridging(false);
    }
  };

  const copyToClipboard = () => {
    if (wallet) {
      Clipboard.setString(wallet.address);
      alert('Address copied to clipboard!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {!wallet ? (
        <View style={styles.content}>
          <Image source={require('./assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>BOLTWALLET</Text>
          <Text style={styles.subtitle}>Secure Multi-Chain Hub</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleCreate}
            disabled={isCreating}
          >
            <Text style={styles.buttonText}>
              {isCreating ? "INITIALIZING..." : "GENERATE MASTER VAULT"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.dashboard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Vault Status: Active</Text>
              <Text style={styles.walletName}>{wallet.name}</Text>
            </View>
            <FingerprintIcon />
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Liquidity</Text>
            <Text style={styles.balanceValue}>${parseFloat(nativeBalance).toFixed(2)}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => setShowSend(true)} style={[styles.actionBtn, { backgroundColor: '#00d2ff' }]}>
                <Text style={styles.actionBtnText}>SEND</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowReceive(true)} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>RECEIVE</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSwap(true)} style={[styles.actionBtn, { borderColor: '#00d2ff', borderWidth: 1 }]}>
                <Text style={[styles.actionBtnText, { color: '#00d2ff' }]}>SWAP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowBridge(true)} style={[styles.actionBtn, { borderColor: '#555', borderWidth: 1 }]}>
                <Text style={[styles.actionBtnText, { color: '#aaa' }]}>BRIDGE</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {history.length > 0 ? history.map((h: any, i: number) => (
            <View key={i} style={styles.txRow}>
              <View style={styles.txIcon}><Text style={{ color: '#fff' }}>⚡</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{h.type === 'send' ? 'Sent' : h.type === 'contract_call' ? 'Contract Call' : 'Received'}</Text>
                <Text style={styles.txSub}>{h.status} · {h.chainId}</Text>
              </View>
              <Text style={styles.txValue}>{h.value} {h.asset}</Text>
            </View>
          )) : (
            <View style={styles.txRow}>
              <View style={styles.txIcon}><Text style={{ color: '#fff' }}>⚡</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>No transactions yet</Text>
                <Text style={styles.txSub}>Send or receive to get started</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Send Modal */}
      <Modal visible={showSend} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Assets</Text>
              <TouchableOpacity onPress={() => setShowSend(false)}><Text style={styles.closeBtn}>×</Text></TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Address or ENS</Text>
              <View style={styles.recipientRow}>
                <TextInput 
                  style={styles.input} 
                  value={recipient} 
                  onChangeText={setRecipient}
                  placeholder="0x... or name.eth"
                  placeholderTextColor="#444"
                />
                <TouchableOpacity onPress={() => setShowScanner(true)} style={styles.scanBtn}>
                  <Text style={{ fontSize: 20 }}>📸</Text>
                </TouchableOpacity>
              </View>
              {isResolving && <Text style={styles.resolvingText}>Resolving Name...</Text>}
              {resolvedAddress && <Text style={styles.resolvedText}>Resolved: {resolvedAddress.slice(0, 8)}...{resolvedAddress.slice(-6)}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount</Text>
              <TextInput 
                style={styles.input} 
                value={amount} 
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#444"
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, { marginTop: 24, backgroundColor: isSending ? '#111' : '#00d2ff' }]} 
              onPress={handleSend}
              disabled={isSending || !recipient || !amount}
            >
              {isSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>SIGN & BROADCAST</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Swap Modal */}
      <Modal visible={showSwap} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Swap Assets</Text>
              <TouchableOpacity onPress={() => setShowSwap(false)}><Text style={styles.closeBtn}>×</Text></TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pay with</Text>
              <View style={styles.assetInput}>
                <Text style={styles.assetName}>{swapFromAsset}</Text>
                <TextInput 
                  style={[styles.input, { textAlign: 'right' }]} 
                  value={swapAmount} 
                  onChangeText={handleGetQuote}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#444"
                />
              </View>
            </View>

            <View style={{ alignItems: 'center', marginVertical: -10, zIndex: 10 }}>
              <View style={styles.arrowCircle}>
                <Text style={{ color: '#fff' }}>↓</Text>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: 20 }]}>
              <Text style={styles.label}>Receive</Text>
              <View style={styles.assetInput}>
                <Text style={styles.assetName}>{swapToAsset}</Text>
                <View style={{ flex: 1, padding: 20, alignItems: 'flex-end' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>
                    {swapQuote ? swapQuote.toAmount : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {swapQuote && (
              <View style={styles.quoteBox}>
                <Text style={styles.quoteText}>1 {swapFromAsset} ≈ {swapQuote.rate} {swapToAsset}</Text>
                <Text style={styles.quoteSub}>Fee: {swapQuote.fee} {swapFromAsset}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.button, { marginTop: 24, backgroundColor: (isSwapping || !swapQuote) ? '#111' : '#00d2ff' }]} 
              onPress={handleExecuteSwap}
              disabled={isSwapping || !swapQuote}
            >
              {isSwapping ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>EXECUTE SWAP</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bridge Modal */}
      <Modal visible={showBridge} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bridge Assets</Text>
              <TouchableOpacity onPress={() => setShowBridge(false)}><Text style={styles.closeBtn}>×</Text></TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>From Network</Text>
              <View style={styles.assetInput}>
                <Text style={styles.assetName}>{bridgeFromChain.toUpperCase()}</Text>
                <TextInput 
                  style={[styles.input, { textAlign: 'right' }]} 
                  value={bridgeAmount} 
                  onChangeText={setBridgeAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#444"
                />
              </View>
            </View>

            <View style={{ alignItems: 'center', marginVertical: -10, zIndex: 10 }}>
              <View style={styles.arrowCircle}>
                <Text style={{ color: '#fff' }}>↓</Text>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: 20 }]}>
              <Text style={styles.label}>To Network</Text>
              <View style={styles.assetInput}>
                <Text style={styles.assetName}>{bridgeToChain.toUpperCase()}</Text>
                <View style={{ flex: 1, padding: 20, alignItems: 'flex-end' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>
                    {bridgeAmount || '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, { marginTop: 24, backgroundColor: (isBridging || !bridgeAmount) ? '#111' : '#00d2ff' }]} 
              onPress={handleExecuteBridge}
              disabled={isBridging || !bridgeAmount}
            >
              {isBridging ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>INITIATE BRIDGE</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="fade">
        <View style={styles.fullBg}>
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity style={styles.scannerClose} onPress={() => setShowScanner(false)}>
            <Text style={styles.buttonText}>CANCEL SCAN</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Receive Modal */}
      <Modal visible={showReceive} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receive Funds</Text>
              <TouchableOpacity onPress={() => setShowReceive(false)}><Text style={styles.closeBtn}>×</Text></TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              {wallet && (
                <QRCode
                  value={wallet.address}
                  size={200}
                  color="#000"
                  backgroundColor="#fff"
                />
              )}
            </View>

            <TouchableOpacity style={styles.addressBox} onPress={copyToClipboard}>
              <Text style={styles.addressText}>{wallet?.address}</Text>
              <Text style={styles.copyNotice}>Tap to copy address</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={() => setShowReceive(false)}>
              <Text style={styles.buttonText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07080A' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  dashboard: { padding: 30 },
  logo: { width: 100, height: 100, marginBottom: 20 },
  title: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -2 },
  subtitle: { color: '#00d2ff', fontSize: 14, fontWeight: 'bold', marginBottom: 40, letterSpacing: 3 },
  button: { backgroundColor: '#00d2ff', padding: 20, borderRadius: 20, width: '100%', alignItems: 'center', shadowColor: '#00d2ff', shadowOpacity: 0.3, shadowRadius: 10 },
  buttonText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greeting: { color: '#444', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  walletName: { color: '#fff', fontSize: 24, fontWeight: '900' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
  balanceCard: { backgroundColor: '#111', padding: 30, borderRadius: 32, borderWidth: 1, borderColor: '#222', marginBottom: 30 },
  balanceLabel: { color: '#444', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  balanceValue: { color: '#fff', fontSize: 42, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, backgroundColor: '#222', padding: 15, borderRadius: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, backgroundColor: '#111', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#1a1a1c' },
  txIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  txTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  txSub: { color: '#444', fontSize: 10 },
  txValue: { color: '#fff', fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0a0a0b', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, paddingBottom: 50, borderTopWidth: 1, borderTopColor: '#222' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, width: '100%' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  closeBtn: { color: '#444', fontSize: 32, padding: 4 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#444', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  recipientRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#111', padding: 20, borderRadius: 20, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#222' },
  scanBtn: { backgroundColor: '#111', width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
  resolvingText: { color: '#00d2ff', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  resolvedText: { color: '#4cd964', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 30, marginBottom: 30 },
  addressBox: { backgroundColor: '#111', padding: 20, borderRadius: 20, width: '100%', marginBottom: 30, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  addressText: { color: '#fff', fontSize: 12, fontFamily: 'monospace', textAlign: 'center' },
  copyNotice: { color: '#00d2ff', fontSize: 10, fontWeight: 'bold', marginTop: 10, textTransform: 'uppercase' },
  fullBg: { flex: 1, backgroundColor: '#000' },
  scannerClose: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 20 },
  assetInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 20, borderWidth: 1, borderColor: '#222' },
  assetName: { color: '#fff', fontWeight: '900', paddingLeft: 20, fontSize: 16 },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#00d2ff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#07080A' },
  quoteBox: { marginTop: 10, padding: 16, backgroundColor: '#111', borderRadius: 16, borderWidth: 1, borderColor: '#1a1a1c' },
  quoteText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  quoteSub: { color: '#444', fontSize: 10, textAlign: 'center', marginTop: 4 }
});
