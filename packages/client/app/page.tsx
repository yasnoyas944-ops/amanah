'use client';
import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { ethers, Contract } from 'ethers';
import Link from 'next/link';
import { ESCROW_ABI } from './abi';

const ESCROW_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // REPLACE WITH DEPLOYED ADDRESS
import { AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Wallet,
  Link as LinkIcon,
  CheckCircle2,
  Loader2,
  Zap,
  Twitter,
  Instagram,
  Video,
  ArrowRight,
  Copy,
  Terminal,
  Cpu,
  Lock,
  X,
  Globe,
  Send,
  Coins,
  Menu,
  Moon,
  Sun,
  PartyPopper,
  XCircle,
  Ghost,
  Facebook,
  Youtube,
  ExternalLink,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
  Check,
  ChevronDown,
  Search,
  Settings,
  MoreVertical,
  LayoutDashboard,
  AlertTriangle,
  Play,
  Linkedin,
  Plus,
  Type,
  Award,
  Hexagon,
  Layout,
  Kanban,
  FileText,
  CheckCircle,
  PieChart,
  Download,
  User,
  Mail,
  Timer,
  Building2,
  MapPin,
  ShieldAlert,
  AlertCircle,
  Hash,
  AtSign,
  History,
  LogOut
} from 'lucide-react';

// NEW: PITCH MODE CONTEXT
const PitchModeContext = createContext<{ isPitchMode: boolean; togglePitchMode: () => void }>({
  isPitchMode: false,
  togglePitchMode: () => { },
});

const usePitchMode = () => useContext(PitchModeContext);

const RevenueTag = ({ text, side = 'top' }: { text: string; side?: 'top' | 'bottom' | 'left' | 'right' }) => {
  const { isPitchMode } = usePitchMode();
  if (!isPitchMode) return null;

  return (
    <div className={`absolute z-50 pointer-events-none animate-in fade-in zoom-in duration-300 ${side === 'top' ? '-top-12 left-1/2 -translate-x-1/2' :
      side === 'bottom' ? '-bottom-12 left-1/2 -translate-x-1/2' :
        side === 'left' ? 'top-1/2 -left-32 -translate-y-1/2' :
          'top-1/2 -right-32 -translate-y-1/2'
      }`}>
      <div className="relative">
        <div className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap border border-indigo-400">
          💰 {text}
        </div>
        <div className={`absolute w-2 h-2 bg-indigo-600 rotate-45 ${side === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
          side === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
            side === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
          }`} />
      </div>
    </div>
  );
};

const MarketStatsBanner = () => {
  const { isPitchMode } = usePitchMode();
  if (!isPitchMode) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-indigo-600 text-white py-2 px-4 shadow-[0_-5px_20px_rgba(79,70,229,0.3)] animate-in slide-in-from-bottom duration-500">
      <div className="max-w-6xl mx-auto flex justify-between items-center text-xs font-mono font-bold tracking-wider">
        <div className="flex gap-8">
          <span>TAM: <span className="text-indigo-200">$20B (MENA)</span></span>
          <span>CAC: <span className="text-indigo-200">$50</span></span>
          <span>LTV: <span className="text-indigo-200">$2,000</span></span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          INVESTOR MODE ACTIVE
        </div>
      </div>
    </div>
  );
};

/**
 * --- HOOKS & UTILS ---
 */

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// HOOK: usePersistentState
// Syncs state with localStorage to prevent data loss on refresh
// FIXED: Uses useEffect for reading to prevent Hydration Mismatch
function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Always initialize with default value to match Server Side Rendering
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Read from local storage only after mount (Client Side only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
    }
  }, [key]);

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  return [storedValue, setValue];
}

// Updated Wallet Hook to support REAL interactions + AUTO CONNECT
// CONTEXT: Wallet Context for Shared State
const WalletContext = createContext<any>(null);

const WalletProvider = ({ children }: any) => {
  const [address, setAddress] = usePersistentState<string | null>('wallet_address', null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType] = usePersistentState<string | null>('wallet_type', null);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const chainId = 97; // BSC Testnet

  // 1. Auto-Connect Logic (Runs on Mount)
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined') {
        // Check for MetaMask / Injected Provider
        if ((window as any).ethereum) {
          try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
              setAddress(accounts[0].address);
              setWalletType('metamask');
            }
            (window as any).ethereum.on('accountsChanged', (newAccounts: string[]) => {
              if (newAccounts.length > 0) {
                setAddress(newAccounts[0]);
              } else {
                setAddress(null);
                setWalletType(null);
              }
            });
          } catch (err) {
            console.log("Auto-connect check failed", err);
          }
        }
      }
    };
    checkConnection();
    return () => {
      if (typeof window !== 'undefined' && (window as any).ethereum?.removeListener) {
        (window as any).ethereum.removeListener('accountsChanged', () => { });
      }
    }
  }, []);

  // 2. Manual Connect Logic with Network Switching
  const connect = async (type: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      if (type === 'demo-brand') {
        await wait(800);
        setAddress('0x71C...9A23');
        setWalletType('demo');
        setIsConnecting(false);
        return;
      }

      if (type === 'demo-creator') {
        await wait(800);
        setAddress('0xCreator...B882'); // Distinct address
        setWalletType('demo');
        setIsConnecting(false);
        return;
      }

      if (type === 'demo') {
        // Fallback legacy
        await wait(800);
        setAddress('0x71C...9A23');
        setWalletType('demo');
        setIsConnecting(false);
        return;
      }

      let provider;
      if (type === 'metamask' && (window as any).ethereum) {
        provider = new ethers.BrowserProvider((window as any).ethereum);
      } else if (type === 'bnb' && (window as any).BinanceChain) {
        provider = new ethers.BrowserProvider((window as any).BinanceChain);
      } else if (type === 'telegram') {
        window.open('https://wallet.tg/', '_blank');
        setError('Opening Telegram Wallet...');
        return;
      } else {
        window.open('https://metamask.io/download/', '_blank');
        setError(`${type} wallet not detected.`);
        return;
      }

      if (provider) {
        try {
          // Request accounts
          const accounts = await provider.send("eth_requestAccounts", []);
          setAddress(accounts[0]);
          setWalletType(type);

          const newProvider = new ethers.BrowserProvider((window as any).ethereum);
          const newSigner = await newProvider.getSigner();
          setProvider(newProvider);
          setSigner(newSigner);

          // Switch Network Logic
          const network = await provider.getNetwork();
          if (Number(network.chainId) !== chainId) {
            try {
              await provider.send("wallet_switchEthereumChain", [{ chainId: "0x61" }]); // 97 in hex
            } catch (switchError: any) {
              // Check if user rejected
              if (switchError.code === 4001) {
                throw new Error("User rejected network switch");
              }

              // For any other error (including 4902 Chain Not Found), try adding the chain
              // This is more robust than checking for specific error codes which vary by wallet
              try {
                await provider.send("wallet_addEthereumChain", [{
                  chainId: "0x61",
                  chainName: "BNB Smart Chain Testnet",
                  rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
                  nativeCurrency: {
                    name: "BNB",
                    symbol: "tBNB",
                    decimals: 18
                  },
                  blockExplorerUrls: ["https://testnet.bscscan.com"]
                }]);
              } catch (addError) {
                console.error("Failed to add chain:", addError);
                throw new Error("Failed to switch to BSC Testnet. Please switch manually.");
              }
            }
          }
        } catch (err: any) {
          throw new Error(err.message || "User rejected request");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setWalletType(null);
    setSigner(null);
    setProvider(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('wallet_address');
      window.localStorage.removeItem('wallet_type');
    }
  };

  return (
    <WalletContext.Provider value={{ address, isConnecting, connect, disconnect, walletType, error, signer, provider }}>
      {children}
    </WalletContext.Provider>
  );
};

const useWallet = () => useContext(WalletContext);

const Confetti = () => {
  const particles = Array.from({ length: 50 });
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-emerald-400 rounded-full animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            animationDelay: `${Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
};

/**
 * --- COMPONENTS ---
 */

const Button = ({
  children,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = ''
}: any) => {
  const baseStyles = "relative px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-emerald-400/50",
    secondary: "bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border border-zinc-200 dark:border-emerald-900/50 shadow-sm",
    outline: "bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-500 dark:hover:text-emerald-400",
    ghost: "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white",
    metamask: "bg-orange-500 hover:bg-orange-600 text-white border border-orange-400/50",
    telegram: "bg-blue-500 hover:bg-blue-600 text-white border border-blue-400/50",
    bnb: "bg-yellow-500 hover:bg-yellow-600 text-black border border-yellow-400/50"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant as keyof typeof variants] || variants.primary} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-xl dark:shadow-2xl ${className}`}>
    {children}
  </div>
);

const Input = ({ label, icon: Icon, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
        {Icon && <Icon size={18} />}
      </div>
      <input
        className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500/50 text-zinc-900 dark:text-zinc-100 rounded-lg py-3 pl-10 pr-4 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
        {...props}
      />
    </div>
  </div>
);

const PlatformSelect = ({ selected, onSelect }: any) => {
  const platforms = [
    { id: 'twitter', name: 'Twitter / X', icon: Twitter },
    { id: 'tiktok', name: 'TikTok', icon: Video },
    { id: 'instagram', name: 'Instagram', icon: Instagram },
    { id: 'youtube', name: 'YouTube', icon: Youtube },
    { id: 'snapchat', name: 'Snapchat', icon: Ghost },
    { id: 'facebook', name: 'Facebook', icon: Facebook },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {platforms.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 ${selected === p.id
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
            : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
        >
          <p.icon size={20} />
          <span className="text-xs font-medium">{p.name}</span>
        </button>
      ))}
    </div>
  );
};



const AuthPage = ({ onLogin, userType = 'brand' }: { onLogin: () => void; userType?: 'brand' | 'creator' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Set colors based on userType
  const colorClass = userType === 'brand' ? 'emerald-500' : 'amber-500';
  const fromColor = userType === 'brand' ? 'from-emerald-500' : 'from-amber-500';
  const toColor = userType === 'brand' ? 'to-teal-400' : 'to-amber-400';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await wait(1000); // Simulate API call
    setLoading(false);
    onLogin();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className={`w-full max-w-md 2xl:max-w-lg transition-all duration-500 p-8 relative overflow-hidden border-${colorClass}/20`}>
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${fromColor} ${toColor}`} />

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
            {isLogin
              ? `Enter your credentials to access the ${userType === 'brand' ? 'Brand Portal' : 'Creator Studio'}`
              : `Start your journey with TrustlessDeals for ${userType === 'brand' ? 'Brands' : 'Creators'}`}
          </p>
        </div>

        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg mb-8">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input
              label="Full Name"
              placeholder="John Doe"
              icon={User}
              type="text"
              required
            />
          )}
          <Input
            label="Email Address"
            placeholder="name@company.com"
            icon={Mail}
            type="email"
            required
          />
          <Input
            label="Password"
            placeholder="••••••••"
            icon={Lock}
            type="password"
            required
          />

          <Button loading={loading} className={`w-full mt-6 ${userType === 'creator' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-4">
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200 dark:border-zinc-800"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500">Or continue with</span></div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.6z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            Google
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </Card>
    </div>
  );
};

// NEW: Live Activity Ticker
const LiveTicker = () => {
  const events = [
    "💸 @sarah_uk just claimed 500 USDT via TikTok Escrow",
    "🔒 Nike_Dubai locked 20 BNB for campaign #AirMax",
    "✅ Chainlink verified post for campaign #SummerSale",
    "💸 @alex_gam3r claimed 1,200 USDT from @Ubisoft_ME",
    "🔒 Puma_MiddleEast locked 15 BNB for #ForeverFaster",
    "✅ Oracle verified post for #TechReview",
    "💸 @foodie_ae claimed 300 USDT via Instagram Reels",
    "🔒 VisitAbuDhabi locked 50 BNB for #InAbuDhabi",
    "✅ Chainlink verified video for #TravelVlog",
    "💸 @crypto_queen claimed 2,500 USDT"
  ];

  return (
    <div className="w-full bg-white/50 dark:bg-zinc-900/40 border-y border-zinc-200 dark:border-white/5 backdrop-blur-md overflow-hidden py-3 mb-24 relative group cursor-default">
      {/* Gradient Fade Edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-zinc-50 to-transparent dark:from-zinc-950 dark:to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-950 dark:to-transparent z-10" />

      {/* Marquee Container */}
      <div
        className="flex whitespace-nowrap animate-scroll hover:pause-animation"
        style={{ width: 'max-content' }}
      >
        {/* Duplicate list for seamless loop */}
        {[...events, ...events, ...events].map((ev, i) => (
          <div key={i} className="inline-flex items-center gap-2 mx-8 text-sm text-zinc-600 dark:text-zinc-400">
            {ev.startsWith('💸') && <span className="text-emerald-600 dark:text-emerald-400 font-bold">{ev.split(' ')[0]}</span>}
            {ev.startsWith('🔒') && <span className="text-amber-600 dark:text-amber-400 font-bold">{ev.split(' ')[0]}</span>}
            {ev.startsWith('✅') && <span className="text-blue-600 dark:text-blue-400 font-bold">{ev.split(' ')[0]}</span>}

            <span dangerouslySetInnerHTML={{
              __html: ev.substring(2)
                .replace(/(\d+ (USDT|BNB))/g, '<b class="text-zinc-900 dark:text-white">$1</b>')
                .replace(/(@\w+)/g, '<span class="text-zinc-700 dark:text-zinc-300">$1</span>')
                .replace(/(#\w+)/g, '<span class="text-emerald-600/80 dark:text-emerald-500/80">$1</span>')
            }} />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        .hover\\:pause-animation:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

const LandingPage = ({ onSelect }: { onSelect: (role: 'brand' | 'creator') => void }) => {
  return (
    <div className="flex flex-col items-center justify-center animate-in fade-in duration-700 w-full overflow-hidden">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-slate-900/10 dark:bg-slate-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-slate-900/5 dark:bg-slate-900/20 rounded-full blur-[100px]" />
      </div>

      {/* HERO SECTION */}
      <section className="relative mt-12 md:mt-24 text-center space-y-8 mb-32 max-w-4xl 2xl:max-w-6xl px-4 z-10 transition-all duration-700">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-amber-400 text-xs font-serif font-medium mb-6 uppercase tracking-wider backdrop-blur-md animate-in slide-in-from-top-4 duration-700 border border-amber-500/20 shadow-lg shadow-amber-500/10">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          The New Standard for Trust
        </div>

        <h1 className="text-6xl md:text-8xl min-[2500px]:text-9xl font-serif font-black tracking-tight text-slate-900 dark:text-white leading-tight animate-in slide-in-from-bottom-8 duration-700 delay-100">
          Trust is <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Golden</span>.<br />
          Payments are <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400">Instant</span>.
        </h1>

        <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light animate-in slide-in-from-bottom-8 duration-700 delay-200">
          The first <span className="text-slate-900 dark:text-white font-serif italic">AI-Powered Escrow Protocol</span>. <br />
          Trustworthy payments in <span className="text-amber-500 font-bold">5 Seconds</span>.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in slide-in-from-bottom-8 duration-700 delay-300">
          <button
            onClick={() => document.getElementById('role-selection')?.scrollIntoView({ behavior: 'smooth' })}
            className="min-w-[180px] px-8 py-4 rounded-xl bg-slate-900 text-amber-400 font-serif font-bold border border-amber-500/30 shadow-lg shadow-amber-500/10 hover:scale-105 hover:bg-slate-800 transition-all duration-300"
          >
            Start Now
          </button>
          <button
            onClick={() => window.open('https://github.com', '_blank')}
            className="min-w-[180px] px-8 py-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-all backdrop-blur-sm"
          >
            View Smart Contract
          </button>
        </div>

        <div className="pt-8 flex items-center justify-center gap-2 text-sm text-zinc-500 animate-in fade-in duration-700 delay-500">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                {['SJ', 'AK', 'MD', '..'][i - 1]}
              </div>
            ))}
          </div>
          Trusted by 50+ Abu Dhabi Creators
        </div>
      </section>

      <LiveTicker />

      {/* THE PROBLEM */}
      <section className="w-full max-w-6xl px-4 mb-32 z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">The Reality of Creation</h2>
          <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 p-8 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
            <div className="p-3 bg-red-500/10 w-fit rounded-lg mb-4 text-red-500"><Timer size={24} /></div>
            <h3 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">90 Days</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Average wait time for invoice payments in the MENA region.</p>
          </Card>
          <Card className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 p-8 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
            <div className="p-3 bg-amber-500/10 w-fit rounded-lg mb-4 text-amber-500"><ShieldAlert size={24} /></div>
            <h3 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">$20B</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Lost annually in trust deficits and uncollected fees globally.</p>
          </Card>
          <Card className="bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 p-8 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
            <div className="p-3 bg-blue-500/10 w-fit rounded-lg mb-4 text-blue-500"><Users size={24} /></div>
            <h3 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">56%</h3>
            <p className="text-zinc-600 dark:text-zinc-400">Of creators report facing late or non-payments regularly.</p>
          </Card>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="w-full bg-zinc-950/50 border-y border-zinc-800/50 backdrop-blur-xl py-24 px-4 mb-24 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* OLD WAY */}
            <div className="space-y-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-xl font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><FileText size={20} /> The Old Way</h3>
              <div className="space-y-4 relative">
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
                {['Invoice Sent', 'Email Back-and-forth', 'Client "Proccessing"', 'Chasing Payment', 'Net-60 Day Wait'].map((step, i) => (
                  <div key={i} className="flex items-center gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-600 text-xs">{i + 1}</div>
                    <div className="p-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 dark:text-zinc-400 w-full">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* NEW WAY */}
            <div className="relative">
              <div className="absolute -inset-4 bg-amber-500/20 rounded-3xl blur-xl" />
              <div className="bg-white dark:bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 relative space-y-8 shadow-2xl dark:shadow-none">
                <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center"><ShieldCheck size={18} className="text-amber-400" /></span>
                  Amanah Protocol
                </h3>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900/5 dark:bg-slate-900/50 rounded-xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"><Lock size={20} /></div>
                    <div>
                      <div className="text-slate-900 dark:text-white font-bold">Smart Contract Lock</div>
                      <div className="text-zinc-500 text-sm">Funds secured upfront. No "net-60".</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400"><Cpu size={20} /></div>
                    <div>
                      <div className="text-zinc-900 dark:text-white font-bold">AI Verification</div>
                      <div className="text-zinc-500 text-sm">Chainlink Oracle validates post URL.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400"><Coins size={20} /></div>
                    <div>
                      <div className="text-zinc-900 dark:text-white font-bold">Instant Payout</div>
                      <div className="text-zinc-500 text-sm">USDT sent immediately to wallet.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* REGIONAL IMPACT */}
      <section className="w-full max-w-4xl px-4 text-center mb-32 z-10">
        <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-[80px]" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700">
              <MapPin size={12} className="text-amber-500" /> Abu Dhabi, UAE
            </div>
            <h2 className="text-4xl font-bold text-white">Solving the Trust Deficit in the <br /><span className="text-amber-500">Influencer Capital of the World</span></h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Built specifically for the region's $150M creator market. Stabilizing creative income with peg-value USDT payments.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto pt-6">
              {[
                { l: 'No Volatility', v: 'USDT' },
                { l: 'Low Fees', v: '< $0.01' },
                { l: 'Network', v: 'BNB Chain' },
                { l: 'Pegged To', v: 'AED' }
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold">{s.l}</div>
                  <div className="text-white font-bold">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* APP LAUNCH / SELECTION */}
      <div id="role-selection" className="w-[100vw] h-[1px] my-4" /> {/* Scroll anchor */}

      <section className="grid md:grid-cols-2 gap-6 w-full max-w-4xl px-4 pb-20 z-10">
        {/* Brand Option */}
        <button
          onClick={() => onSelect('brand')}
          className="group relative overflow-hidden bg-white dark:bg-zinc-900/40 border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:bg-emerald-950/30">
              <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors">I am a Brand</h2>
              <p className="text-zinc-600 dark:text-zinc-400">Lock funds. Automate verification. <br />Stop chasing receipts.</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-500 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
              Launch Dashboard <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Creator Option */}
        <button
          onClick={() => onSelect('creator')}
          className="group relative overflow-hidden bg-white dark:bg-zinc-900/40 border-2 border-zinc-200 dark:border-zinc-800 hover:border-amber-500/50 rounded-3xl p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:bg-amber-950/30">
              <Zap className="w-8 h-8 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white group-hover:text-amber-500 transition-colors">I am a Creator</h2>
              <p className="text-zinc-600 dark:text-zinc-400">Post content. Get verified. <br />Receive crypto instantly.</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-500 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
              Launch Dashboard <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-zinc-900 py-12 text-center text-zinc-600 text-sm z-10">
        <p className="mb-4">Designed for the BNB Chain Hackathon: Abu Dhabi 🇦🇪</p>
        <div className="flex justify-center gap-6">
          <a href="#" className="hover:text-emerald-500 transition-colors">GitHub</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Documentation</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Twitter</a>
        </div>
      </footer>

    </div >
  );
};



/**
 * --- PAGES ---
 */

// 1. BRAND PAGE: CREATE DEAL FORM
const CreateCampaignForm = ({ navigateToClaim, onCancel, onCreate }: any) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    platform: 'twitter',
    amount: '',
    currency: 'USDT'
  });
  const [rules, setRules] = useState<any[]>([]);
  const [ruleType, setRuleType] = useState('hashtag');
  const [currentRule, setCurrentRule] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Smart Contract State
  const { address, signer, connect, disconnect, isConnected, walletType, error } = useWallet();
  const [contractAddress, setContractAddress] = usePersistentState('contract_address', ESCROW_CONTRACT_ADDRESS);
  const [onChainId, setOnChainId] = useState<string | null>(null);

  // Wallet Modal State (Restored)
  const [showWalletModal, setShowWalletModal] = useState(false);
  const handleWalletConnect = async (type: string) => {
    await connect(type);
    if (type === 'telegram') setShowWalletModal(false);
  };

  useEffect(() => {
    if (address) setShowWalletModal(false);
  }, [address]);

  const addRule = () => {
    if (!currentRule) return;
    let formatted = currentRule;
    if (ruleType === 'hashtag' && !formatted.startsWith('#')) formatted = '#' + formatted;
    if (ruleType === 'mention' && !formatted.startsWith('@')) formatted = '@' + formatted;

    setRules([...rules, { type: ruleType, value: formatted }]);
    setCurrentRule('');
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  // Final Submit
  const handleCreate = async () => {
    setIsLoading(true);
    setFormError(null);
    try {
      let createdId = Date.now();

      // REAL TRANSACTION LOGIC
      if (signer && formData.currency === 'BNB') { // Only BNB is supported for native value in simple example
        try {
          const contract = new Contract(contractAddress, ESCROW_ABI, signer);
          // Requirements string from rules
          const reqString = rules.map(r => `${r.type}:${r.value}`).join('|');
          // Arbitrary influencer address for demo or self
          const influencerAddr = address; // In demo, maybe we just use self or a hardcoded one? 
          // Better: Add "Influencer Address" input, but to keep simple we use User or specific mock.
          // Let's use a dummy or the user's own address if they are testing alone.

          const tx = await contract.createCampaign(influencerAddr, reqString, {
            value: ethers.parseEther(formData.amount)
          });

          await tx.wait();
          // In a real app we'd parse logs to get ID, for now we assume success
          alert(`Transaction Successful! Hash: ${tx.hash}`);
        } catch (err: any) {
          console.error(err);
          throw new Error(err.reason || err.message || "Transaction failed");
        }
      } else {
        await wait(2000); // Mock delay
      }

      onCreate({
        t: formData.title,
        h: '@brand_new', // Mock handle
        a: `${formData.amount} ${formData.currency}`,
        s: 'Locked',
        c: 'text-emerald-500',
        requirements: rules.map(r => r.value).join(', ')
      });

      setIsLoading(false);
      setStep(4); // Success State
    } catch (e: any) {
      setIsLoading(false);
      setFormError(e.message || "Transaction Failed");
    }
  };

  if (step === 4) {
    return (
      <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <Card className="text-center space-y-6 border-emerald-500/20">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-emerald-500/30 ring-offset-8 ring-offset-zinc-950 dark:ring-offset-zinc-950">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Funds Locked!</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Escrow Contract #882...99A created on opBNB.</p>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/80 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 group cursor-pointer hover:border-emerald-500/30 transition-colors"
            onClick={() => navigateToClaim(formData)}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-emerald-500/10 rounded-md">
                <LinkIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs text-zinc-500 uppercase">Shareable Link</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">trustless.deals/claim/8x29...</p>
              </div>
            </div>
            <Copy className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500" />
          </div>

          <Button onClick={() => navigateToClaim(formData)} className="w-full">
            View as Influencer <ArrowRight className="w-4 h-4" />
          </Button>
          <button onClick={onCancel} className="w-full p-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            Return to Dashboard
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
        error={error}
      />

      {/* Header & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowRight className="w-5 h-5 rotate-180 text-zinc-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-500">
              New Campaign
            </h1>
            <p className="text-xs text-zinc-500">Step {step} of 3</p>
          </div>
        </div>
        {!address ? (
          <Button
            variant="secondary"
            onClick={() => setShowWalletModal(true)}
            className="text-xs px-4 py-2 h-9"
          >
            <Wallet className="w-4 h-4" /> Connect
          </Button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            <div className={`w-2 h-2 rounded-full ${walletType === 'demo' ? 'bg-emerald-500' : walletType === 'metamask' ? 'bg-orange-500' : 'bg-blue-500'} animate-pulse`} />
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 ease-in-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <Card className="min-h-[400px] flex flex-col justify-between">

        {/* Step 1: The Hook */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-center gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Let's start with a name.</h2>
              <p className="text-zinc-500">What are we promoting today?</p>
            </div>
            <input
              autoFocus
              className="w-full text-center text-2xl bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 outline-none py-2 text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-all"
              placeholder="e.g. Summer Launch 2024"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && formData.title && setStep(2)}
            />
            <div className="pt-8 flex justify-center">
              <Button onClick={() => setStep(2)} disabled={!formData.title} className="px-8 w-full md:w-auto">
                Next Step <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: The Venue */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Where is this happening?</h2>
              <PlatformSelect
                selected={formData.platform}
                onSelect={(p: any) => {
                  setFormData({ ...formData, platform: p });
                }}
              />
            </div>
            <div className="pt-4 mt-auto">
              <Button onClick={() => setStep(3)} className="w-full">
                Confirm Platform <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: The Deal */}
        {step === 3 && (
          <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">

            {/* Mini Summary */}
            <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-500">
              <span className="font-bold text-zinc-900 dark:text-white">{formData.title}</span>
              <span>on</span>
              <span className="capitalize text-emerald-500 font-bold">{formData.platform}</span>
            </div>

            {/* SMART VERIFICATION CRITERIA */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 ml-1">Smart Verification Criteria</label>

              <div className="bg-zinc-50 dark:bg-zinc-900/30 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-5 space-y-5">

                {/* Input Builder Row */}
                <div className="flex gap-2">
                  <select
                    className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-lg px-3 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                  >
                    <option value="hashtag">Hashtag</option>
                    <option value="mention">Account Mention</option>
                    <option value="keyword">Keyword Match</option>
                    <option value="link">Link in Bio</option>
                    <option value="duration">Min Duration</option>
                  </select>

                  <div className="flex-1 relative">
                    <input
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm rounded-lg pl-3 pr-10 py-2 outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-400"
                      placeholder={
                        ruleType === 'hashtag' ? '#SummerSale' :
                          ruleType === 'mention' ? '@MyBrand' :
                            ruleType === 'duration' ? '60' :
                              'Enter value...'
                      }
                      type={ruleType === 'duration' ? 'number' : 'text'}
                      value={currentRule}
                      onChange={(e) => setCurrentRule(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addRule()}
                    />
                    <button
                      onClick={addRule}
                      className="absolute right-1 top-1 p-1.5 bg-zinc-100 dark:bg-zinc-700 hover:bg-emerald-500 hover:text-white rounded-md text-zinc-400 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Active Rules Stack (Logic Chips) */}
                <div className="flex flex-wrap gap-2 min-h-[30px]">
                  {rules.length === 0 && (
                    <div className="w-full text-center text-xs text-zinc-400 italic py-2">
                      Add a rule to enable the Oracle.
                    </div>
                  )}
                  {rules.map((r, i) => (
                    <div key={i} className="animate-in fade-in zoom-in duration-300 flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-full shadow-sm">
                      {r.type === 'hashtag' && <Hash size={12} className="text-emerald-600 dark:text-emerald-400" />}
                      {r.type === 'mention' && <AtSign size={12} className="text-emerald-600 dark:text-emerald-400" />}
                      {r.type === 'keyword' && <Type size={12} className="text-emerald-600 dark:text-emerald-400" />}
                      {r.type === 'link' && <LinkIcon size={12} className="text-emerald-600 dark:text-emerald-400" />}
                      {r.type === 'duration' && <Clock size={12} className="text-emerald-600 dark:text-emerald-400" />}

                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide text-[10px] mr-1">{r.type}:</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{r.value}</span>

                      <button onClick={() => removeRule(i)} className="ml-1 text-emerald-900/40 hover:text-red-500 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800/50 border-dashed">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  The AI Oracle will check for these exact conditions.
                </div>
              </div>
            </div>

            <div className="relative">
              <Input
                label={`Bounty Amount (${formData.currency})`}
                placeholder="0.00"
                type="number"
                icon={Lock}
                value={formData.amount}
                onChange={(e: any) => setFormData({ ...formData, amount: e.target.value })}
              />
              <div className="absolute top-[28px] right-2 flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setFormData({ ...formData, currency: 'USDT' })}
                  className={`px-2 py-1 text-xs font-bold rounded ${formData.currency === 'USDT' ? 'bg-emerald-500 text-black shadow-lg' : 'text-zinc-500 hover:text-emerald-500'}`}
                >
                  USDT
                </button>
                <button
                  onClick={() => setFormData({ ...formData, currency: 'BNB' })}
                  className={`px-2 py-1 text-xs font-bold rounded ${formData.currency === 'BNB' ? 'bg-yellow-400 text-black shadow-lg' : 'text-zinc-500 hover:text-yellow-400'}`}
                >
                  BNB
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 mb-2">
                <AlertTriangle size={14} className="inline mr-2" />
                Error: {formError}
              </div>
            )}

            <div className="pt-2 mt-auto">
              {address ? (
                <div className="relative group">
                  <RevenueTag text="We take 1.5% fee here" side="top" />
                  <Button onClick={handleCreate} loading={isLoading} className="w-full" disabled={!formData.amount || rules.length === 0}>
                    {isLoading ? 'Approving & Locking...' : `Review & Lock ${formData.amount || '0'} ${formData.currency}`}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowWalletModal(true)}
                  className="w-full border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all opacity-50 cursor-not-allowed" // Disabled look if no rules
                  disabled={rules.length === 0}
                >
                  {rules.length === 0 ? 'Add a Rule to Continue' : 'Connect Wallet to Lock'}
                </Button>
              )}
            </div>
          </div>
        )}

      </Card>

      {/* Footer Helper */}
      <div className="text-center text-xs text-zinc-500 dark:text-zinc-600 font-mono">
        {step === 1 && "Start with a catchy title."}
        {step === 2 && "Select the main platform for your campaign."}
        {step === 3 && "Funds are locked in Smart Contract until verified."}
      </div>

    </div>
  );
};

// 2. CREATOR DASHBOARD OS
const VerificationModal = ({ isOpen, onClose, deal, onVerify }: any) => {
  const [postUrl, setPostUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [txHash, setTxHash] = useState('');

  // Real Contract Logic
  const { signer } = useWallet();
  const [contractAddress] = usePersistentState('contract_address', ESCROW_CONTRACT_ADDRESS);
  const [manualId, setManualId] = useState(''); // Allow manual ID override for testing

  // Reset state when opening new deal
  useEffect(() => {
    if (isOpen) {
      setPostUrl('');
      setStatus('idle');
      setLogs([]);
    }
  }, [isOpen]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`]);

  const handleVerify = async () => {
    try {
      if (!postUrl) return;
      setStatus('scanning');
      setLogs([]);
      setTxHash('');

      addLog('Initializing Neural Agent...');
      await wait(800);
      addLog(`Connecting to ${deal.platform} API...`);
      await wait(1000);
      addLog('Analyzing content media...');
      await wait(1200);

      const isValid = postUrl.includes('twitter.com') || postUrl.includes('x.com') || postUrl.includes('tiktok.com');

      if (isValid) {
        addLog(`Found requirement: "${deal.requirements}"`);
        await wait(600);
        addLog('Verifying chain signature...');
        await wait(800);
        addLog('Releasing Escrow Funds...');
        await wait(500);

        if (signer) {
          addLog('Executing "verifyAndRelease" on-chain...');
          try {
            const contract = new Contract(contractAddress, ESCROW_ABI, signer);
            // Use manual ID if provided, else try to guess or use 0? 
            // Since mock deal IDs are timestamps, they won't match chain IDs (1, 2, 3...)
            // We rely on the user to input the Chain ID for this test.
            const idToVerify = manualId ? manualId : deal.id; // Fallback

            const tx = await contract.verifyAndRelease(idToVerify);
            addLog(`Tx Sent: ${tx.hash.substring(0, 12)}...`);
            await tx.wait();
            addLog('On-Chain Success!');
            setTxHash(tx.hash);
          } catch (err: any) {
            addLog(`Chain Error: ${err.reason || 'Failed'}`);
            throw err;
          }
        } else {
          const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
          setTxHash(mockHash);
        }

        setStatus('success');

        // Auto-close after success
        setTimeout(() => {
          onVerify(deal.id);
          onClose();
        }, 3000);

      } else {
        addLog('ERROR: Pattern match failed.');
        setStatus('error');
      }
    } catch (err) {
      addLog('CRITICAL ERROR: Transaction reverted.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white"><X size={20} /></button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase tracking-wider text-xs mb-2">
            <Zap size={14} /> AI Oracle Verification
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Verify Completion</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">Paste your post URL to unlock <span className="text-zinc-900 dark:text-white font-bold">{deal.amount} {deal.currency}</span>.</p>

          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
            <div className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
              <ShieldCheck size={12} /> Smart Contract Requirements
            </div>
            <div className="space-y-2">
              {deal.rules?.map((rule: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  {rule}
                </div>
              )) || <div className="text-zinc-500 italic">No specific rules set.</div>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase">Post URL</label>
            <div className="flex gap-2">
              <input
                className="w-20 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-emerald-500"
                placeholder="ID"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                title="Chain Campaign ID (Optional)"
              />
              <input
                className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-zinc-900 dark:text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-700"
                placeholder={`https://${deal.platform}.com/...`}
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                disabled={status === 'scanning' || status === 'success'}
              />
              <div className="relative">
                <RevenueTag text="Cost per API call: $0.001" side="top" />
                <Button
                  onClick={handleVerify}
                  loading={status === 'scanning'}
                  disabled={!postUrl || status === 'success'}
                  className={status === 'success' ? 'bg-emerald-500 text-white' : ''}
                >
                  {status === 'success' ? <Check size={18} /> : 'Verify'}
                </Button>
              </div>
            </div>
          </div>

          {/* AI Terminal */}
          <div className="bg-zinc-950 dark:bg-black/50 rounded-xl p-4 font-mono text-xs h-40 overflow-y-auto border border-zinc-800/50">
            {logs.length === 0 && <div className="text-zinc-500 dark:text-zinc-700 italic">Ready to scan...</div>}
            {logs.map((log, i) => (
              <div key={i} className={`mb-1 ${log.includes('ERROR') ? 'text-red-400' : log.includes('Found') ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {log}
              </div>
            ))}
            {status === 'success' && (
              <div className="text-emerald-400 font-bold mt-2 animate-pulse">
                Successfully Verified! Funds released.
              </div>
            )}
            {status === 'success' && <Confetti />}
          </div>
        </div>
      </Card>
    </div>
  );
};

const CreatorDashboard = ({ dealData: propDealData, onBack }: any) => {
  const [view, setView] = useState<'deals' | 'splits' | 'wallet'>('deals');
  const { address, connect, disconnect, error } = useWallet();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  // MOCK STATE
  const [deals, setDeals] = useState([
    {
      id: 1,
      title: 'Summer Nike Promo',
      amount: '500',
      currency: 'USDT',
      status: 'new',
      platform: 'tiktok',
      requirements: '#NikeSummer',
      rules: ['Must include hashtag #NikeSummer', 'Video duration > 15 seconds', 'No competitor logos visible', 'Must tag @nike']
    },
    {
      id: 2,
      title: 'Tech Review Video',
      amount: '5.2',
      currency: 'BNB',
      status: 'active',
      platform: 'youtube',
      requirements: '#TechReview',
      rules: ['Video title must contain "Review"', 'Description must include affiliate link', 'Minimum 1080p resolution']
    },
    {
      id: 3,
      title: 'Coffee Shop Visit',
      amount: '150',
      currency: 'USDT',
      status: 'paid',
      platform: 'instagram',
      requirements: '@CoffeeHouse',
      rules: ['Photo must be at location', 'Tag @CoffeeHouse', 'Mention "Best Latte" in caption']
    }
  ]);

  const [team, setTeam] = useState([
    { name: 'Alice (Agent)', wallet: '0x71...9A23', split: 15 },
    { name: 'Bob (Editor)', wallet: '0x3B...2C19', split: 5 },
  ]);

  // Handle new deal from prop (Simulation)
  useEffect(() => {
    if (propDealData) {
      // Check if already added
      const exists = deals.find(d => d.title === propDealData.title);
      if (!exists) {
        setDeals(prev => [{
          id: Date.now(),
          ...propDealData,
          status: 'new' // New deals start here
        }, ...prev]);
      }
    }
  }, [propDealData]);

  const moveDeal = (id: number, newStatus: string) => {
    setDeals(deals.map(d => d.id === id ? { ...d, status: newStatus } : d));
  };

  const handleAccept = (id: number) => {
    if (!address) {
      setShowWalletModal(true);
      return;
    }
    moveDeal(id, 'active');
  };

  const openVerify = (deal: any) => {
    setSelectedDeal(deal);
    setVerifyModalOpen(true);
  };

  const [hasSeenCreatorTour, setHasSeenCreatorTour] = useState(false);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
      {!hasSeenCreatorTour && <OnboardingTour role="creator" onComplete={() => setHasSeenCreatorTour(true)} />}
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col justify-between hidden md:flex">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2 relative group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg shadow-sm">
              {address ? '👾' : <Wallet size={20} />}
            </div>
            <div>
              <div className="font-bold">{address ? 'PixelMaster' : 'Guest'}</div>
              <div className="text-xs text-zinc-500">Creator Account</div>
            </div>
            {address && (
              <button
                onClick={disconnect}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Sign Out"
              >
                <LinkIcon size={14} className="rotate-45" />
              </button>
            )}
          </div>

          <nav className="space-y-2">
            <button id="creator-deals" onClick={() => setView('deals')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${view === 'deals' ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white' : 'text-zinc-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
              <span className="flex items-center gap-3"><Kanban size={18} /> Deal Flow</span>
              {deals.filter(d => d.status === 'new').length > 0 && <span className="bg-amber-500 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{deals.filter(d => d.status === 'new').length}</span>}
            </button>
            <button id="creator-splits" onClick={() => setView('splits')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'splits' ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white' : 'text-zinc-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
              <Users size={18} /> Smart Splits
            </button>
            <button onClick={() => setView('wallet')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'wallet' ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white' : 'text-zinc-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
              <BarChart3 size={18} /> Analytics
            </button>
          </nav>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/20 rounded-2xl p-4 shadow-lg shadow-amber-500/5">
          <div className="text-xs font-bold text-amber-500 mb-1">NEXT PAYOUT</div>
          <div className="text-2xl font-bold mb-1 text-white">
            {/* This was previously text-white, now it's default text-zinc-900 dark:text-white */}
            $1,250.00
          </div>
          <div className="text-xs text-zinc-400">Est. 24 Hours</div>
          <button className="text-xs text-amber-400 hover:text-white hover:underline mt-1 transition-colors">View Payouts →</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="w-full max-w-[1920px] mx-auto space-y-6">
          <WalletModal
            isOpen={showWalletModal}
            onClose={() => setShowWalletModal(false)}
            onConnect={(type: string) => {
              connect(type);
              setShowWalletModal(false);
            }}
            error={error}
            role="creator"
          />
          <VerificationModal
            isOpen={verifyModalOpen}
            onClose={() => setVerifyModalOpen(false)}
            deal={selectedDeal}
            onVerify={(id: number) => moveDeal(id, 'paid')}
          />

          {view === 'deals' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Deal Flow</h1>
                <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Switch Profile</button>
              </div>

              <div className="flex gap-6 overflow-x-auto pb-8">
                {/* COL 1: NEW OFFERS */}
                <div className="min-w-[320px] flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm font-bold uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> New Offers (Action Req)
                  </div>
                  {deals.filter(d => d.status === 'new').map(d => (
                    <Card key={d.id} className="bg-white dark:bg-slate-900 border-zinc-200 dark:border-slate-800 p-5 hover:border-amber-500/30 transition-colors group shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm font-bold text-slate-600 dark:text-slate-300">{d.amount} {d.currency}</div>
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400"><Layout size={14} /></div>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{d.title}</h3>
                      <p className="text-sm text-zinc-500 mb-4 truncate">Req: {d.requirements}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleAccept(d.id)} className="bg-slate-800 text-white hover:bg-slate-700">Accept & Lock</Button>
                        <Button size="sm" variant="outline" className="border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Decline</Button>
                      </div>
                    </Card>
                  ))}
                  {deals.filter(d => d.status === 'new').length === 0 && (
                    <div className="h-32 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-sm">No new offers</div>
                  )}
                </div>

                {/* COL 2: IN PRODUCTION */}
                <div id="creator-production" className="min-w-[320px] flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm font-bold uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> In Production (Locked)
                  </div>
                  {deals.filter(d => d.status === 'active').map(d => (
                    <Card key={d.id} className="bg-white dark:bg-slate-900 border-zinc-200 dark:border-slate-800 p-5 hover:border-amber-500/30 transition-colors shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Lock size={12} /> {d.amount} {d.currency}</div>
                        <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg"><Clock size={14} /></div>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">{d.title}</h3>
                      <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-amber-500/20" onClick={() => openVerify(d)}>Verify Post Completion</Button>
                    </Card>
                  ))}
                </div>

                {/* COL 3: PAID */}
                <div className="min-w-[320px] flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm font-bold uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Paid & Settled
                  </div>
                  {deals.filter(d => d.status === 'paid').map(d => (
                    <Card key={d.id} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-5 opacity-60 hover:opacity-100 transition-opacity">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm font-bold text-zinc-400 line-through">{d.amount} {d.currency}</div>
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"><CheckCircle2 size={14} /></div>
                      </div>
                      <h3 className="font-bold text-lg text-zinc-700 dark:text-zinc-300 mb-4">{d.title}</h3>
                      <button className="w-full py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-500 flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <Download size={12} /> Download Invoice
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'splits' && (
            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Smart Splits Team</h1>
                  <p className="text-zinc-500">Manage automatic revenue sharing for your agency.</p>
                </div>
                <Button><Plus size={16} className="mr-2" /> Add Member</Button>
              </div>

              <div className="space-y-4">
                {team.map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white">{member.name}</div>
                        <div className="text-xs font-mono text-zinc-500">{member.wallet}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-500 dark:text-emerald-400">{member.split}%</div>
                        <div className="text--[10px] text-zinc-500">AUTO-PAY</div>
                      </div>
                      <button className="p-2 text-zinc-400 hover:text-red-500"><XCircle size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                <Zap className="text-indigo-400 shrink-0 mt-1" size={18} />
                <div>
                  <h3 className="font-bold text-indigo-500 dark:text-indigo-300">How it works</h3>
                  <p className="text-sm text-indigo-500/70 dark:text-indigo-200/60 mt-1">When you receive payment (e.g. 1000 USDT), the smart contract automatically routes 15% (150 USDT) to Alice before the rest hits your wallet.</p>
                </div>
              </div>
            </div>
          )}

          {view === 'wallet' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Wallet & Analytics</h1>

              <div className="grid md:grid-cols-2 gap-6">
                {/* REVENUE CHART MOCK */}
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-300">Monthly Revenue</h3>
                    <select className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs rounded-lg px-2 py-1 outline-none text-zinc-900 dark:text-white">
                      <option>Last 6 Months</option>
                    </select>
                  </div>
                  <div className="h-48 flex items-end gap-2 justify-between px-2">
                    {[35, 60, 45, 80, 55, 90].map((h, i) => (
                      <div key={i} className="w-full bg-emerald-100 dark:bg-emerald-950/30 rounded-t-lg relative group">
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg transition-all duration-500" style={{ height: `${h}%` }} />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${h * 150}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-zinc-500 font-mono">
                    <span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span>
                  </div>
                </Card>

                {/* ACTION PANEL */}
                <div className="space-y-6">
                  <Card className="bg-gradient-to-br from-emerald-900/10 to-transparent dark:from-emerald-900/20 dark:to-zinc-900 border-zinc-200 dark:border-zinc-800 p-6">
                    <h3 className="font-bold text-zinc-900 dark:text-white mb-2">Instant Advance ⚡</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Qualify for up to 50% advance on verified campaigns for a 2% fee.</p>
                    <Button className="w-full">Check Eligibility</Button>
                  </Card>

                  <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl"><FileText size={20} className="text-zinc-400" /></div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white">Tax Export</h3>
                        <p className="text-xs text-zinc-500">CSV format for accounting</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700">Download Report</Button>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const ReputationCard = ({ isOpen, onClose, handle }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header Background */}
        <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 -mt-12 relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-zinc-900 border-4 border-white dark:border-zinc-950 shadow-xl flex items-center justify-center text-3xl overflow-hidden">
                👾
              </div>
              <div className="mb-1">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{handle || '@alex_web3'}</h3>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                  <ShieldCheck size={12} fill="currentColor" className="text-emerald-500" />
                  Verified Creator
                </div>
              </div>
            </div>

            {/* Trust Score Radial */}
            <div className="text-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-zinc-200 dark:text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                  <path className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" strokeDasharray="98, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-sm">98</div>
              </div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 mt-1">Trust Score</div>
            </div>
          </div>

          <div className="space-y-6">
            {/* NFT Badges */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Verified Skills (NFTs)</div>
              <div className="flex gap-3">
                {[
                  { label: 'TikTok Verified', icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { label: 'Fast Deliverer', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                  { label: 'High Value', icon: Award, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                ].map((badge, i) => (
                  <div key={i} className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border ${badge.bg} ${badge.border}`}>
                    <div className="p-1.5 rounded-full bg-white dark:bg-zinc-900 shadow-sm ${badge.color}">
                      <badge.icon size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-center leading-tight dark:text-zinc-300">{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction History */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recent Chain Activity</div>
              <div className="space-y-1">
                {[
                  { hash: '0x71...9A23', action: 'Escrow Released', date: '2h ago', amount: '+ 500 USDT' },
                  { hash: '0x3B...2C19', action: 'Contract Locked', date: '1d ago', amount: 'Pending' },
                  { hash: '0x9E...4D55', action: 'Dispute Resolved', date: '5d ago', amount: '+ 1,200 USDT' },
                ].map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <Terminal size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-mono text-zinc-500 group-hover:text-emerald-500 transition-colors">{tx.hash}</div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-300">{tx.action}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${tx.amount.includes('+') ? 'text-emerald-500' : 'text-zinc-500'}`}>{tx.amount}</div>
                      <div className="text-[10px] text-zinc-400">{tx.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <a href="#" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold transition-colors">
              <ExternalLink size={14} />
              View Identity on Space ID
            </a>

          </div>
        </div>
      </div>
    </div>
  );
};

// NEW: ONBOARDING TOUR COMPONENT
const OnboardingTour = ({ onComplete, role = 'brand' }: { onComplete: () => void, role?: 'brand' | 'creator' }) => {
  const [step, setStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});
  const [show, setShow] = useState(true);

  // Tour Steps Config
  // Tour Steps Config
  const brandSteps = [
    { target: null, title: "Welcome to Amanah Protocol", text: "Let's get you set up with the world's first AI-powered payment protocol." },
    { target: "tour-create-btn", title: "Create Campaign", text: "Lock funds here to start a new secured deal with any creator." },
    { target: "tour-stats", title: "Track Real-Time", text: "Monitor verification status and escrow releases live on-chain." },
    { target: "tour-wallet", title: "Wallet Connection", text: "Your funds are secured on BNB Chain. Connect here to manage assets." },
  ];

  const creatorSteps = [
    { target: null, title: "Welcome Creator 🎨", text: "Amanah Protocol ensures you get paid instantly upon work completion." },
    { target: "creator-deals", title: "Deal Flow", text: "Accept new offers here. Once accepted, funds are locked in escrow for you." },
    { target: "creator-production", title: "Verify Work", text: "When you're done, click 'Verify' to let our AI check your post and release funds." },
    { target: "creator-splits", title: "Smart Splits", text: "Automatically share revenue with your team or editor via smart contacts." },
  ];

  const steps = role === 'creator' ? creatorSteps : brandSteps;

  const currentStep = steps[step];

  useEffect(() => {
    const updateSpotlight = () => {
      if (step === 0) {
        setSpotlightStyle({});
        return;
      }

      const targetId = currentStep.target;
      if (!targetId) return;

      const element = document.getElementById(targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Add padding
        setSpotlightStyle({
          top: rect.top - 10,
          left: rect.left - 10,
          width: rect.width + 20,
          height: rect.height + 20,
          opacity: 1
        });
      }
    };

    // Small delay to ensure render
    setTimeout(updateSpotlight, 100);
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [step]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setShow(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    setShow(false);
    onComplete();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop with Hole (Simulated via SVG mask or huge borders, simpler: just 4 divs) */}
      {/* We'll use a mixed-blend-mode approach or simply a high z-index overlay that is darker */}
      {step === 0 && <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />}

      {step > 0 && (
        <div className="absolute inset-0 bg-black/50 duration-500 transition-colors">
          {/* Spotlight Hole */}
          <div
            className="absolute bg-transparent transition-all duration-500 ease-in-out border-2 border-emerald-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-xl"
            style={{ ...spotlightStyle, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)' }}
          />
        </div>
      )}

      {/* Logic Card */}
      <div
        className={`absolute transition-all duration-500 flex flex-col items-start p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-[350px] ${step === 0 ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
        style={step > 0 ? {
          top: (spotlightStyle.top as number) + (spotlightStyle.height as number) + 220 > window.innerHeight
            ? (spotlightStyle.top as number) - 240 // Position above if near bottom
            : (spotlightStyle.top as number) + (spotlightStyle.height as number) + 20, // Else position below
          left: (spotlightStyle.left as number)
        } : {}}
      >
        <div className="flex items-center gap-2 mb-4">
          {step === 0 ? <span className="text-4xl">👋</span> : <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-sm">{step}</span>}
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{currentStep.title}</h3>
        </div>

        <p className="text-zinc-500 mb-6 leading-relaxed">{currentStep.text}</p>

        <div className="flex items-center justify-between w-full">
          <button onClick={handleSkip} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-sm font-medium">Skip Tour</button>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-slate-900 text-amber-500 hover:bg-slate-800 font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap border border-amber-500/20"
          >
            {step === steps.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// WALLET MODAL
const WalletModal = ({ isOpen, onClose, onConnect, error, role = 'brand' }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-white">Connect Wallet</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-400">Demo Mode</span>
              <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase">Instant</div>
            </div>
            <p className="text-xs text-zinc-400 mb-3">Instant simulated access.</p>
            <button
              onClick={() => onConnect(role === 'creator' ? 'demo-creator' : 'demo-brand')}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-colors"
            >
              <Zap size={16} fill="black" /> Connect Simulated {role === 'brand' ? 'Brand' : 'Creator'}
            </button>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">OR CONNECT REAL WALLET</span></div>
          </div>

          <button onClick={() => onConnect('metamask')} className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors border border-zinc-700/50">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-orange-500" />
              <span className="font-medium">Connect Real Wallet</span>
            </div>
            <ArrowRight size={16} className="text-zinc-500" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
// MOCK QR CODE MODAL COMPONENT
const QrCodeModal = ({ isOpen, onClose, deal, onCopy, onSimulate }: any) => {
  if (!isOpen || !deal) return null;

  const inviteLink = `https://trustless.deals/invite/${deal.id}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-white">Share Invite</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center space-y-6">
          <div className="bg-white p-4 rounded-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}&color=000000&bgcolor=ffffff`}
              alt="QR Code"
              className="w-48 h-48"
            />
          </div>

          <div className="text-center space-y-1">
            <h4 className="font-bold text-white text-lg">Scan to Accept Deal</h4>
            <p className="text-sm text-zinc-400">Creators can scan this code to instantly view and accept the contract.</p>
          </div>

          <div className="w-full relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <LinkIcon size={16} className="text-zinc-500" />
            </div>
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-12 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={() => onCopy(deal)}
              className="absolute inset-y-1 right-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-md transition-colors"
            >
              Copy
            </button>
          </div>

          <button
            onClick={() => onSimulate(deal)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Zap size={18} className="fill-white" /> Simulate Creator Scan (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};


// NEW: BRAND DASHBOARD
const BrandDashboard = ({ navigateToClaim, onInvite, onSimulate }: { navigateToClaim: (data: any) => void; onInvite: (deal: any) => void; onSimulate: (deal: any) => void }) => {
  const [view, setView] = useState<'overview' | 'create'>('overview');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [sharingDeal, setSharingDeal] = useState<any>(null);
  const { address, disconnect } = useWallet();
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [hasSeenTour, setHasSeenTour] = usePersistentState('has-seen-tour', false); // Tour state
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null); // State for active dropdown menu

  // Campaign State with Persistence
  const [campaigns, setCampaigns] = usePersistentState<any[]>('dashboard-campaigns', [
    { t: 'Summer Drop #1', h: '@alex_web3', a: '500 USDT', s: 'Verifying', c: 'text-amber-500' },
    { t: 'Promo Video - Gaming', h: '', a: '2.5 BNB', s: 'Locked', c: 'text-emerald-500' }, // Empty handle demo
    { t: 'Podcast Sponsor', h: '@crypto_talks', a: '1,200 USDT', s: 'Dispute', c: 'text-red-500' },
  ]);

  const handleNewCampaign = (newCamp: any) => {
    const campaignWithId = { ...newCamp, id: Date.now() }; // FIX: Add ID for URL
    setCampaigns([campaignWithId, ...campaigns]);

    // Normalize for Creator View (Simulation)
    const shareableDeal = {
      ...campaignWithId,
      title: campaignWithId.t,
      amount: campaignWithId.a.split(' ')[0],
      currency: campaignWithId.a.split(' ')[1] || 'USDT',
      platform: 'twitter',
      status: 'new'
    };

    setSharingDeal(shareableDeal);
    setQrModalOpen(true); // Open QR immediately on create
    setView('overview');
  };

  const handleShareClick = (deal: any) => {
    setSharingDeal(deal);
    setQrModalOpen(true);
  };

  if (view === 'create') {
    return <CreateCampaignForm
      navigateToClaim={navigateToClaim}
      onCancel={() => setView('overview')}
      onCreate={handleNewCampaign}
    />;
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <QrCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        deal={sharingDeal}
        onCopy={(d: any) => {
          onInvite(d);
          setQrModalOpen(false);
        }}
        onSimulate={onSimulate}
      />
      {!hasSeenTour && <OnboardingTour onComplete={() => setHasSeenTour(true)} />}

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl hidden md:flex flex-col p-6 overflow-y-auto">
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-3 mb-4">Main Menu</h3>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-900 rounded-lg font-medium transition-colors">
              <LayoutDashboard size={20} className="text-emerald-500" /> Overview
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg font-medium transition-colors">
              <Wallet size={20} /> Transactions
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg font-medium transition-colors">
              <Users size={20} /> Creators
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg font-medium transition-colors">
              <BarChart3 size={20} /> Analytics
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/20 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-slate-950 rounded-lg text-amber-500 border border-amber-500/20"><Zap size={14} /></div>
              <span className="font-bold text-amber-500 text-sm">Escrow Status</span>
            </div>
            <div className="text-2xl font-bold text-white">Active</div>
            <div className="text-xs text-zinc-400 mt-1">Contract v2.1.0</div>
          </div>

          <div id="tour-wallet" className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 relative group">
            <RevenueTag text="We earn 4% APY on float" side="right" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
              {address ? address.substring(0, 2) : 'WA'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-zinc-900 dark:text-white truncate w-24">{address ? address : 'Not Connected'}</div>
              <div className="text-xs text-amber-500 font-medium">Pro Plan</div>
            </div>
            {address && (
              <button
                onClick={disconnect}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Sign Out"
              >
                <LinkIcon size={14} className="rotate-45" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="w-full max-w-[1920px] mx-auto space-y-8">

          {/* TOP HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
              <p className="text-zinc-500">Welcome back, brand manager.</p>
            </div>
            <button
              id="tour-create-btn"
              onClick={() => setView('create')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-amber-500 font-bold rounded-xl shadow-lg shadow-amber-500/10 border border-amber-500/20 hover:scale-105 hover:bg-slate-800 transition-all"
            >
              <Plus size={18} /> Create Campaign
            </button>
          </div>

          {/* STATS ROW */}
          <div id="tour-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { l: 'Total Value Locked', v: '$124,500.00', i: Lock, c: 'text-amber-500', bg: 'bg-amber-500' },
              { l: 'Active Campaigns', v: '8', i: Zap, c: 'text-slate-400', bg: 'bg-slate-500' },
              { l: 'Success Rate', v: '98.2%', i: TrendingUp, c: 'text-emerald-500', bg: 'bg-emerald-500' },
            ].map((s, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:border-amber-500/30 transition-colors">
                <div className={`p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 ${s.c} bg-opacity-10 dark:bg-opacity-20`}>
                  <s.i size={24} />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 font-medium">{s.l}</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white">{s.v}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ACTIVE CAMPAIGNS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Active Campaigns</h2>
              <div className="flex gap-2">
                <button className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Search size={18} /></button>
                <button className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Settings size={18} /></button>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 font-medium border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Campaign</th>
                      <th className="px-6 py-4">Influencer</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {campaigns.map((row: any, i: number) => (
                      <tr key={i} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{row.t}</td>
                        <td className="px-6 py-4">
                          {row.h ? (
                            <button
                              onClick={() => setSelectedCreator(row.h)}
                              className="text-blue-500 hover:text-blue-400 hover:underline font-mono"
                            >
                              {row.h}
                            </button>
                          ) : (
                            <span className="text-zinc-400 italic flex items-center gap-1">
                              Waiting <span className="animate-pulse">...</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{row.a}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-950 ${row.c}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${row.c.replace('text-', 'bg-')}`} />
                            {row.s}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex gap-2">
                          <button
                            onClick={() => handleShareClick({ ...row, id: row.id || Date.now(), title: row.t, amount: row.a.split(' ')[0], currency: row.a.split(' ')[1], status: 'new', platform: 'twitter' })}
                            className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-emerald-500 hover:text-white" title="Share Invite Link"
                          >
                            <LinkIcon size={16} />
                          </button>

                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === i ? null : i); }}
                              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeMenuId === i && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                  {row.s !== 'Locked' && (
                                    <button
                                      onClick={() => {
                                        // Handle Edit
                                        setActiveMenuId(null);
                                        // Mock Edit - reopen create form with data? For now simple alert
                                        alert(`Editing ${row.t}`);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                      <Layout size={14} /> Edit Campaign
                                    </button>
                                  )}

                                  {row.s === 'Locked' && (
                                    <button
                                      onClick={() => {
                                        setCampaigns(campaigns.map((c: any, idx) => idx === i ? { ...c, s: 'Refunded', c: 'text-zinc-500' } : c));
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
                                    >
                                      <History size={14} /> Refund Escrow
                                    </button>
                                  )}

                                  {row.s !== 'Locked' && (
                                    <button
                                      onClick={() => {
                                        setCampaigns(campaigns.filter((_, idx) => idx !== i));
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-t border-zinc-100 dark:border-zinc-800"
                                    >
                                      <XCircle size={14} /> Delete Campaign
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <ReputationCard
            isOpen={!!selectedCreator}
            onClose={() => setSelectedCreator(null)}
            handle={selectedCreator}
          />
        </div>
        <ReputationCard
          isOpen={!!selectedCreator}
          onClose={() => setSelectedCreator(null)}
          handle={selectedCreator}
        />
      </main>
    </div>
  );
};

// ... existing App component ...
const AppContent = () => {
  const [view, setView] = useState<'landing' | 'auth' | 'brand' | 'claim'>('landing');
  const [userType, setUserType] = useState<'brand' | 'creator'>('brand'); // NEW: Track user type
  const [activeDeal, setActiveDeal] = usePersistentState<any>('active-deal', null);
  const [darkMode, setDarkMode] = usePersistentState('theme-preference', true);
  const { isPitchMode, togglePitchMode } = usePitchMode(); // Moved hook usage here

  const { address, disconnect } = useWallet();

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Invite shared state
  const [pendingInvite, setPendingInvite] = useState<any>(null);

  const navigateToClaim = (data: any) => {
    setActiveDeal({
      ...data,
      amount: data.amount || '5000',
      requirements: data.requirements || '#TrustlessDeals',
      currency: data.currency || 'USDT'
    });
    setView('claim');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-zinc-950' : 'bg-zinc-50'}`}>

      {pendingInvite && userType === 'creator' && view === 'claim' && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right-12 duration-500">
          <div className="bg-emerald-500 text-black p-4 rounded-xl shadow-2xl flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => {
            setActiveDeal(pendingInvite);
            setPendingInvite(null);
          }}>
            <div className="p-2 bg-black/20 rounded-lg"><Zap size={20} className="text-white" /></div>
            <div>
              <div className="font-bold text-sm">New Offer Received!</div>
              <div className="text-xs font-medium opacity-80">Click to view details</div>
            </div>
          </div>
        </div>
      )}

      <MarketStatsBanner />

      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
        <div className="w-full max-w-[2400px] mx-auto flex h-16 items-center justify-between px-4 md:px-8 2xl:px-12">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-amber-400 font-bold border border-amber-500/20 shadow-lg shadow-amber-500/10">
              <ShieldCheck size={22} fill="currentColor" className="text-slate-900" />
            </div>
            <span className="text-2xl font-serif font-black tracking-tight text-slate-900 dark:text-white">
              Amanah
            </span>
          </div>

          {!address && view !== 'landing' && view !== 'auth' && (
            <Button onClick={() => setView('auth')} variant="outline" className="gap-2">
              <Wallet size={16} /> Connect Wallet
            </Button>
          )}

          {address && (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-zinc-500">Connected to opBNB</span>
                <span className="text-xs text-emerald-500 font-mono">0.0042 BNB</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 ring-2 ring-white dark:ring-zinc-950" />
              <button
                onClick={disconnect}
                className="p-2 ml-1 text-zinc-400 hover:text-red-500 bg-zinc-100 dark:bg-zinc-900 rounded-full transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center">
            {/* Pitch Mode Toggle (Hidden Shortcut: Ctrl+Shift+P) */}
            <button onClick={togglePitchMode} className="p-2 opacity-0 hover:opacity-10 pointer-events-none">.</button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[2400px] mx-auto px-4 md:px-8 2xl:px-12 py-6 md:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {view === 'landing' ? (
          <LandingPage onSelect={(role: any) => {
            setUserType(role);
            setView('auth');
          }} />
        ) : view === 'auth' ? (
          <AuthPage
            userType={userType}
            onLogin={() => setView(userType === 'brand' ? 'brand' : 'claim')}
          />
        ) : view === 'brand' ? (
          <BrandDashboard
            navigateToClaim={navigateToClaim}
            onInvite={(deal: any) => {
              setPendingInvite(deal);
              // Mock toast
              const toast = document.createElement('div');
              toast.className = "fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-zinc-900 text-white rounded-full shadow-xl z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300 flex items-center gap-2 border border-zinc-700";
              toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Invite Link Copied`;
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 2500);
            }}
            onSimulate={(deal: any) => {
              setPendingInvite(deal);
              setUserType('creator');
              setView('claim');
              // Mock notification of scan
              const toast = document.createElement('div');
              toast.className = "fixed top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-indigo-600 text-white rounded-full shadow-2xl z-[100] animate-in slide-in-from-top-4 fade-in duration-300 font-bold border border-indigo-400";
              toast.innerText = "⚡ Simulating Creator Scan...";
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 2000);
            }}
          />
        ) : (
          <CreatorDashboard dealData={activeDeal} onBack={() => setView('landing')} />
        )}
      </main>
    </div>
  );
};

// NEW: WELCOME MODAL COMPONENT
const WelcomeModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
          <XCircle size={24} />
        </button>

        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6">
          <PartyPopper size={32} className="text-amber-500" />
        </div>

        <h2 className="text-3xl font-bold font-serif text-slate-900 dark:text-white mb-3">Welcome to Amanah Protocol</h2>
        <p className="text-zinc-600 dark:text-zinc-300 mb-6 text-lg leading-relaxed">
          The world's first <span className="font-bold text-amber-500">AI-powered trustless payment protocol</span> for the $20B creator economy. Money moves in 5 seconds.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/about" className="w-full py-4 bg-slate-900 text-amber-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors text-lg shadow-lg shadow-amber-500/10">
            View Vision & Roadmap <ArrowRight size={20} />
          </Link>
          <button onClick={onClose} className="w-full py-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors">
            Continue to Demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isPitchMode, setIsPitchMode] = useState(false);
  const togglePitchMode = () => setIsPitchMode(!isPitchMode);

  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <PitchModeContext.Provider value={{ isPitchMode, togglePitchMode }}>
      <WalletProvider>
        <AnimatePresence>
          {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
        </AnimatePresence>
        <AppContent />
      </WalletProvider>
    </PitchModeContext.Provider>
  );
};


