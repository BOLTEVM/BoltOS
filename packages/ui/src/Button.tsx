import React, { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'glass';
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const Button = ({ children, onClick, className = "", variant = 'primary', disabled = false, style }: ButtonProps) => {
  const baseStyles = "relative px-6 py-3 rounded-2xl font-bold transition-all duration-500 overflow-hidden active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  const variants = {
    primary: "bg-gradient-to-r from-bolt-blue to-bolt-indigo text-white shadow-[0_0_20px_rgba(0,210,255,0.3)] hover:shadow-[0_0_30px_rgba(0,210,255,0.5)] hover:-translate-y-0.5",
    secondary: "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10",
    glass: "bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/15 hover:border-white/20 shadow-2xl"
  };

  return (
    <button 
      onClick={!disabled ? onClick : undefined} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
