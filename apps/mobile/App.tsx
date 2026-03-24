import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { BoltwalletCore } from '@boltwallet/core';

const core = new BoltwalletCore();

export default function App() {
  const [isCreating, setIsCreating] = useState(false);
  const [wallet, setWallet] = useState<any>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const newWallet = await core.createNewWallet("Mobile User");
      setWallet(newWallet);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Image 
          source={require('./assets/logo.png')} 
          style={styles.logo} 
        />
        <Text style={styles.title}>BOLTWALLET</Text>
        <Text style={styles.subtitle}>Secure Multi-Chain Custody</Text>

        {!wallet ? (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleCreate}
            disabled={isCreating}
          >
            <Text style={styles.buttonText}>
              {isCreating ? "INITIALIZING VAULT..." : "CREATE NEW WALLET"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.walletCard}>
            <Text style={styles.walletTitle}>Vault Active</Text>
            <Text style={styles.walletId}>{wallet.name}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#00d2ff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 48,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#00d2ff',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  walletCard: {
    backgroundColor: '#1a1a1c',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  walletTitle: {
    color: '#00d2ff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  walletId: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
  }
});
