import React, { useState } from 'react';
import { Volume2, VolumeX, QrCode, Smartphone, ChefHat, Receipt, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { ConnectionStatus } from '../services/orderSync';
import { setSoundEnabled, isSoundEnabled, playKitchenOrderBell } from '../services/soundEffects';

interface HeaderProps {
  currentRole: 'server' | 'kitchen';
  onRoleChange: (role: 'server' | 'kitchen') => void;
  connectionStatus: ConnectionStatus;
  activeDevicesCount: number;
  activeOrdersCount: number;
  readyOrdersCount: number;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  connectionStatus,
  activeDevicesCount,
  activeOrdersCount,
  readyOrdersCount,
  onResetDemo,
}) => {
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'all' | 'server' | 'kitchen' | null>(null);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playKitchenOrderBell();
    }
  };

  const getFullUrl = (roleParam?: string) => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    if (roleParam) {
      url.searchParams.set('role', roleParam);
    } else {
      url.searchParams.delete('role');
    }
    return url.toString();
  };

  const copyToClipboard = (role?: 'server' | 'kitchen') => {
    const url = getFullUrl(role);
    navigator.clipboard.writeText(url);
    setCopiedLink(role || 'all');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#14161C] border-b border-stone-800 text-stone-100 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5">
          {/* Top row: Brand & Status controls */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white shadow-inner font-serif font-black tracking-wider text-base sm:text-lg border border-amber-500/40 shrink-0">
                M
              </div>
              <div>
                <span className="font-['Cinzel'] tracking-widest text-base sm:text-lg font-bold text-amber-100 block leading-tight">
                  MOONSHINE
                </span>
                <span className="text-[10px] text-stone-400 font-medium hidden sm:block">
                  Order & Kitchen System
                </span>
              </div>
            </div>

            {/* Desktop Navigation Switcher */}
            <div className="hidden sm:flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-700/60 shadow-inner">
              <button
                onClick={() => onRoleChange('server')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === 'server'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Server</span>
                {readyOrdersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[10px] animate-pulse font-bold">
                    {readyOrdersCount} Ready!
                  </span>
                )}
              </button>

              <button
                onClick={() => onRoleChange('kitchen')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === 'kitchen'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Kitchen</span>
                {activeOrdersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-full text-[10px] font-bold">
                    {activeOrdersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Controls & Connection */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Device Sync Status Badge */}
              {connectionStatus !== 'connected' ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-mono border bg-amber-950/60 text-amber-300 border-amber-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Connecting</span>
                </div>
              ) : activeDevicesCount >= 2 ? (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-mono border bg-emerald-950/70 text-emerald-300 border-emerald-700/70 cursor-pointer shadow-xs"
                  title={`${activeDevicesCount} devices connected and synced in real-time`}
                  onClick={() => setShowShareModal(true)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                  <span className="font-bold">{activeDevicesCount} Synced</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-mono border bg-stone-900 text-stone-300 border-stone-700/80 cursor-pointer hover:border-amber-600/60 transition"
                  title="Only 1 device active. Tap to connect 2nd device"
                  onClick={() => setShowShareModal(true)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>1 Device</span>
                </div>
              )}

              {/* Sound toggle */}
              <button
                onClick={toggleSound}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  soundOn
                    ? 'bg-amber-950/40 border-amber-600/40 text-amber-300 hover:bg-amber-900/50'
                    : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-400'
                }`}
                title={soundOn ? 'Kitchen audio bell ON' : 'Audio muted'}
              >
                {soundOn ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              {/* Share / Multi-device modal opener */}
              <button
                onClick={() => setShowShareModal(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition flex items-center gap-1.5"
                title="Connect 2nd device"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">Connect 2nd Device</span>
              </button>
            </div>
          </div>

          {/* Mobile Bottom Segmented Switcher (Visible only on mobile) */}
          <div className="sm:hidden mt-2 pt-1 border-t border-stone-800/80 flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => onRoleChange('server')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                currentRole === 'server'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Server</span>
              {readyOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[9px] font-black animate-pulse">
                  {readyOrdersCount} Ready
                </span>
              )}
            </button>

            <button
              onClick={() => onRoleChange('kitchen')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                currentRole === 'kitchen'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen</span>
              {activeOrdersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 rounded-full text-[9px] font-bold">
                  {activeOrdersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Share / Multi-Device Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1C1F26] border border-stone-700 rounded-2xl max-w-md w-full p-6 text-stone-100 shadow-2xl relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-amber-200 font-['Cinzel']">
                  Multi-Device Setup
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Open this link on both your mobile phone & kitchen screen. Any order punched on the phone instantly arrives in the kitchen!
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Option 1: Server Phone */}
              <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-600/30">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-200">1st Floor Server (Waiter Phone)</h4>
                    <p className="text-xs text-stone-400">Punches food, comments & qty</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard('server')}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1"
                    title="Copy direct link"
                  >
                    {copiedLink === 'server' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={getFullUrl('server')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Option 2: Kitchen Display */}
              <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-600/30">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-200">Kitchen Display System (KDS)</h4>
                    <p className="text-xs text-stone-400">Incoming tickets, audio chimes & prep</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard('kitchen')}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1"
                    title="Copy direct link"
                  >
                    {copiedLink === 'kitchen' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={getFullUrl('kitchen')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* QR Code generator placeholder using SVG for instant mobile scanning */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-mono text-stone-400 mb-2 truncate max-w-full px-2">
                  {typeof window !== 'undefined' ? window.location.href : ''}
                </p>
                <button
                  onClick={() => copyToClipboard()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition"
                >
                  {copiedLink === 'all' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Link Copied! Send via WhatsApp / AirDrop</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Shared App Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Clear All Orders Button */}
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                <span>Need to clear all current active tickets?</span>
                <button
                  onClick={() => {
                    onResetDemo();
                    setShowShareModal(false);
                  }}
                  className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Clear All Orders</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
