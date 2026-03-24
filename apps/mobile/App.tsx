import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { BoltwalletCore } from '@boltwallet/core';

const core = new BoltwalletCore();

export default function App() {
  return (
    <View style={styles.container}>
      <Image 
        source={require('./assets/logo.png')} 
        style={{ width: 100, height: 100, marginBottom: 20 }} 
      />
      <Text style={styles.title}>BOLTWALLET</Text>
      <Text style={styles.subtitle}>Premium Multi-Chain Mobile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#00d2ff',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
  }
});
