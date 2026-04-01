export interface ChainConfig {
  name: string;
  id: string;
  rpc: string;
  explorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  derivationPath: string;
}

export const CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    id: "1",
    rpc: "https://rpc.ankr.com/eth",
    explorer: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  },
  bsc: {
    name: "Binance Smart Chain",
    id: "56",
    rpc: "https://rpc.ankr.com/bsc",
    explorer: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  },
  polygon: {
    name: "Polygon",
    id: "137",
    rpc: "https://rpc.ankr.com/polygon",
    explorer: "https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  },
  pulsechain: {
    name: "PulseChain",
    id: "369",
    rpc: "https://rpc.pulsechain.com",
    explorer: "https://otter.pulsechain.com",
    nativeCurrency: { name: "Pulse", symbol: "PLS", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  },
  quai: {
    name: "Quai Network",
    id: "969",
    rpc: "https://quaiscan.io/api/eth-rpc",
    explorer: "https://quaiscan.io",
    nativeCurrency: { name: "Quai", symbol: "QUAI", decimals: 18 },
    derivationPath: "m/44'/969'/0'/0/0"
  },
  monad: {
    name: "Monad",
    id: "143",
    rpc: "https://rpc.ankr.com/monad",
    explorer: "https://monadvision.com",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  },
  bitcoin: {
    name: "Bitcoin",
    id: "bitcoin",
    rpc: "https://rpc.ankr.com/btc",
    explorer: "https://blockchain.info",
    nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 8 },
    derivationPath: "m/84'/0'/0'/0/0"
  },
  sui: {
    name: "Sui",
    id: "sui:mainnet",
    rpc: "https://rpc.ankr.com/sui",
    explorer: "https://suiexplorer.com",
    nativeCurrency: { name: "Sui", symbol: "SUI", decimals: 9 },
    derivationPath: "m/44'/784'/0'/0'/0'"
  },
  xrpl_evm: {
    name: "XRPL EVM Sidechain",
    id: "1440001",
    rpc: "https://rpc-evm-sidechain.xrpl.org",
    explorer: "https://evm-sidechain.xrpl.org",
    nativeCurrency: { name: "XRP", symbol: "XRP", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  },
  tron_evm: {
    name: "TRON EVM (BTTC)",
    id: "199",
    rpc: "https://rpc.bittorrentchain.io",
    explorer: "https://bttcscan.com",
    nativeCurrency: { name: "BTT", symbol: "BTT", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  },
  coredao: {
    name: "CORE",
    id: "1116",
    rpc: "https://rpc.coredao.org",
    explorer: "https://scan.coredao.org",
    nativeCurrency: { name: "CORE", symbol: "CORE", decimals: 18 },
    derivationPath: "m/44'/60'/0'/0/0"
  }
};
