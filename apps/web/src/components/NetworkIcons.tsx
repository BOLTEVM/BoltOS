import React from 'react';

export const EthereumIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none">
    <path d="M16 2L15.8 2.6V21.4L16 21.6L25.3 16L16 2Z" fill="#627EEA"/>
    <path d="M16 2L6.7 16L16 21.6V12.1V2Z" fill="#3958D8"/>
    <path d="M16 23.2L15.9 23.3V30L16 30.3L25.3 17.6L16 23.2Z" fill="#627EEA"/>
    <path d="M16 30.3V23.2L6.7 17.6L16 30.3Z" fill="#3958D8"/>
    <path d="M16 21.6L25.3 16L16 12.1V21.6Z" fill="#14192D" opacity="0.1"/>
    <path d="M6.7 16L16 21.6V12.1L6.7 16Z" fill="#14192D" opacity="0.05"/>
  </svg>
);

export const BitcoinIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none">
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path d="M23.1 14.8c0.4-2.5-1.5-3.8-4.2-4.7l0.8-3.4-2.1-0.5-0.8 3.3c-0.6-0.1-1.1-0.3-1.7-0.4l0.8-3.3-2.1-0.5-0.8 3.4c-0.4-0.1-0.9-0.2-1.3-0.3l-2.9-0.7-0.6 2.3s1.5 0.4 1.5 0.4c0.8 0.2 1 0.7 0.9 1.2l-1 3.8c0.1 0 0.2 0.1 0.2 0.1l-0.2-0.1-1.3 5.4c-0.1 0.2-0.3 0.6-0.9 0.4 0 0-1.5-0.4-1.5-0.4l-1 2.4 2.8 0.7c0.5 0.1 1 0.3 1.5 0.4l-0.8 3.4 2.1 0.5 0.8-3.3c0.6 0.2 1.1 0.3 1.7 0.5l-0.8 3.3 2.1 0.5 0.8-3.4c3.5 0.7 6.2 0.4 7.3-2.8 0.9-2.6-0.1-4.1-1.9-5.1 1.4-0.3 2.4-1.2 2.7-3zm-4.8 7.3c-0.6 2.5-5 1.2-6.4 0.8l1.1-4.6c1.4 0.3 5.9 1 5.3 3.8zm0.5-7.6c-0.6 2.3-4.3 1.1-5.4 0.8l1-4.2c1.2 0.3 5 0.9 4.4 3.4z" fill="white"/>
  </svg>
);

export const BSCCicon = ({ className = 'w-5 h-5' }) => (
  <img src="/bsc.png" className={`${className} object-contain`} alt="BNB Chain" />
);

export const SuiIcon = ({ className = 'w-5 h-5' }) => (
  <img src="/sui.png" className={`${className} object-contain`} alt="Sui" />
);

export const PolygonIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none">
    <path d="M16 0L2.1 8.1V24L16 32L29.9 24V8.1L16 0Z" fill="#8247E5"/>
    <path d="M16 7.6L8.9 11.7V19.9L16 24L23.1 19.9V11.7L16 7.6Z" fill="white"/>
  </svg>
);

export const MonadIcon = ({ className = 'w-5 h-5' }) => (
  <img src="/monad.png" className={`${className} object-contain`} alt="Monad" />
);

export const PulseChainIcon = ({ className = 'w-5 h-5' }) => (
  <img src="/pulsechain.png" className={`${className} object-contain`} alt="PulseChain" />
);

export const QuaiIcon = ({ className = 'w-5 h-5' }) => (
  <img src="/quai.png" className={`${className} rounded-md object-contain`} alt="Quai" />
);

export const TronIcon = ({ className = 'w-5 h-5' }) => (
  <img src="/tron.png" className={`${className} object-contain`} alt="TRON" />
);

export const XRPIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none">
    <circle cx="16" cy="16" r="16" fill="#23292F"/>
    <path d="M22 10L16 16L10 10M22 22L16 16L10 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CoreIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none">
    <circle cx="16" cy="16" r="16" fill="#FFBD1A"/>
    <path d="M22 16C22 19.3137 19.3137 22 16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M16 16L20 16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

export const NetworkIcon = ({ chainId, className = 'w-5 h-5' }: { chainId: string, className?: string }) => {
  switch (chainId) {
    case 'ethereum': return <EthereumIcon className={className} />;
    case 'bitcoin': return <BitcoinIcon className={className} />;
    case 'bsc': return <BSCCicon className={className} />;
    case 'polygon': return <PolygonIcon className={className} />;
    case 'sui': return <SuiIcon className={className} />;
    case 'monad': return <MonadIcon className={className} />;
    case 'pulsechain': return <PulseChainIcon className={className} />;
    case 'quai': return <QuaiIcon className={className} />;
    case 'tron': return <TronIcon className={className} />;
    case 'xrpl': return <XRPIcon className={className} />;
    case 'xrpl_evm': return <XRPIcon className={className} />;
    case 'tron_evm': return <TronIcon className={className} />;
    case 'coredao': return <CoreIcon className={className} />;
    default: return null;
  }
};
