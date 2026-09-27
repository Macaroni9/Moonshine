import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  QrCode,
  ChefHat,
  Receipt,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Wifi,
  Radio,
  X,
  CheckCircle2,
  Smartphone
} from 'lucide-react';
import QRCode from 'qrcode';
import { ConnectionStatus } from '../services/orderSync';
import { PresenceSummary } from '../types/restaurant';
import { setSoundEnabled, isSoundEnabled, playKitchenOrderBell } from '../services/soundEffects';

interface HeaderProps {
  currentRole: 'server' | 'kitchen';
  onRoleChange: (role: 'server' | 'kitchen') => void;
  connectionStatus: ConnectionStatus;
  activeDevicesCount: number;
  presenceSummary?: PresenceSummary;
  activeOrdersCount: number;
  readyOrdersCount: number;
  onResetDemo: () => void;
}

interface NetworkInfo {
  localIps: string[];
  port: number;
  localUrls: string[];
  hostname: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  connectionStatus,
  activeDevicesCount,
  presenceSummary,
  activeOrdersCount,
  readyOrdersCount,
  onResetDemo,
}) => {
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'server' | 'kitchen' | 'local' | 'cloud' | null>(null);

  // Network info & QR codes
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [qrRole, setQrRole] = useState<'server' | 'kitchen'>('server');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playKitchenOrderBell();
    }
  };

  // Fetch local network info on mount or modal open
  useEffect(() => {
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setNetworkInfo(data);
        }
      })
      .catch(() => {
        // Fallback gracefully
      });
  }, [showShareModal]);

  // Generate QR code whenever the selected target role or host changes
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // Prefer current browser origin, or local WiFi IP if on localhost
    let targetUrl = `${origin}?role=${qrRole}`;
    
    // If running on localhost and we know a local LAN IP, we can generate local WiFi link
    if (origin.includes('localhost') && networkInfo?.localUrls?.[0]) {
      targetUrl = `${networkInfo.localUrls[0]}?role=${qrRole}`;
    }

    QRCode.toDataURL(targetUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [qrRole, networkInfo]);

  const getFullUrl = (roleParam: 'server' | 'kitchen', forceLocal = false) => {
    if (typeof window === 'undefined') return '';
    let base = window.location.origin;
    if (forceLocal && networkInfo?.localUrls?.[0]) {
      base = networkInfo.localUrls[0];
    }
    const url = new URL(base);
    url.searchParams.set('role', roleParam);
    return url.toString();
  };

  const copyToClipboard = (type: 'server' | 'kitchen' | 'local' | 'cloud', url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const hasKitchen = (presenceSummary?.kitchensCount ?? 0) > 0;
  const hasServer = (presenceSummary?.serversCount ?? 0) > 0;
  const isMultiDeviceSynced = hasKitchen && hasServer;

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
              
              {/* REAL-TIME DEVICE SYNC STATUS BADGE */}
              {connectionStatus === 'connected' ? (
                isMultiDeviceSynced ? (
                  <div
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono font-bold border bg-emerald-950/80 text-emerald-300 border-emerald-600/80 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-900/60 transition"
                    title="Kitchen and Server devices connected and synced in real-time"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span>
                      Synced ({presenceSummary?.kitchensCount}K + {presenceSummary?.serversCount}S)
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono border bg-amber-950/60 text-amber-300 border-amber-600/60 cursor-pointer hover:bg-amber-900/50 transition"
                    title="1 Device online. Tap to connect 2nd device (Kitchen or Server phone)"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{activeDevicesCount} Online · Connect 2nd</span>
                  </div>
                )
              ) : (
                <div
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono border bg-stone-900 text-stone-400 border-stone-700 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-stone-500 animate-ping" />
                  <span>Reconnecting</span>
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
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Scan QR Code or copy link to connect kitchen and servers"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="hidden md:inline">Connect Devices</span>
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

      {/* MULTI-DEVICE & LOCAL NETWORK HUB MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#181A22] border border-stone-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 text-stone-100 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-amber-100 font-serif">
                    Live Device Connection Hub
                  </h3>
                  <p className="text-xs text-stone-400">
                    Connect kitchen screen + multiple server phones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Currently Active Devices List */}
            <div className="mb-4 p-3.5 rounded-2xl bg-stone-900 border border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Devices on Network ({activeDevicesCount})
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  Auto-Synced
                </span>
              </div>

              {presenceSummary?.devices && presenceSummary.devices.length > 0 ? (
                <div className="space-y-1.5">
                  {presenceSummary.devices.map((dev) => (
                    <div
                      key={dev.id}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-950/60 border border-stone-800/80"
                    >
                      <div className="flex items-center gap-2">
                        {dev.role === 'kitchen' ? (
                          <ChefHat className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-semibold text-stone-200">{dev.name}</span>
                        <span className="text-[10px] font-mono text-stone-500 uppercase">
                          ({dev.role})
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Active</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-1">
                  1 device currently open on this screen.
                </p>
              )}
            </div>

            {/* QR Code Scanner Section */}
            <div className="mb-4 p-4 rounded-2xl bg-[#12141A] border border-amber-600/30 flex flex-col items-center text-center">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">
                Scan with Phone Camera to Open:
              </span>

              {/* Role selector for QR Code */}
              <div className="flex items-center bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs mb-3">
                <button
                  onClick={() => setQrRole('server')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    qrRole === 'server'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Waiter Phone</span>
                </button>
                <button
                  onClick={() => setQrRole('kitchen')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    qrRole === 'kitchen'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Kitchen Screen</span>
                </button>
              </div>

              {/* Scannable QR Image */}
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-500/40 mb-2.5">
                  <img
                    src={qrDataUrl}
                    alt="Scan to open on device"
                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-stone-900 rounded-2xl flex items-center justify-center text-stone-500 text-xs">
                  Generating QR...
                </div>
              )}

              <p className="text-[11px] text-stone-400 max-w-xs">
                Open phone camera & point at this QR. It opens directly to{' '}
                <strong className="text-amber-300">
                  {qrRole === 'server' ? 'Server Punch' : 'Kitchen Screen'}
                </strong>
                .
              </p>
            </div>

            {/* Direct Links for Local WiFi & Cloud */}
            <div className="space-y-2.5 mb-4">
              
              {/* Option 1: Waiter Direct Link */}
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-stone-200 block">
                    Server Direct Link (Waiter Mobile)
                  </span>
                  <p className="text-[11px] font-mono text-stone-500 truncate max-w-[220px] sm:max-w-xs">
                    {getFullUrl('server')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard('server', getFullUrl('server'))}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1 transition"
                  >
                    {copiedLink === 'server' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                  <a
                    href={getFullUrl('server')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Option 2: Kitchen Direct Link */}
              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-stone-200 block">
                    Kitchen Display Direct Link
                  </span>
                  <p className="text-[11px] font-mono text-stone-500 truncate max-w-[220px] sm:max-w-xs">
                    {getFullUrl('kitchen')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard('kitchen', getFullUrl('kitchen'))}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1 transition"
                  >
                    {copiedLink === 'kitchen' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </button>
                  <a
                    href={getFullUrl('kitchen')}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Option 3: Local Network IP if available */}
              {networkInfo?.localUrls?.[0] && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber-200 flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-amber-400" />
                      <span>Local Restaurant WiFi IP</span>
                    </span>
                    <p className="text-[11px] font-mono text-amber-300/80 truncate max-w-[220px] sm:max-w-xs">
                      {networkInfo.localUrls[0]}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard('local', networkInfo.localUrls[0])}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1 transition shrink-0"
                  >
                    {copiedLink === 'local' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy IP</span>
                  </button>
                </div>
              )}
            </div>

            {/* Clear All Orders Demo Reset */}
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
              <span>Start shift with clean ticket board:</span>
              <button
                onClick={() => {
                  onResetDemo();
                  setShowShareModal(false);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-rose-950/70 border border-stone-800 hover:border-rose-600/50 text-stone-300 hover:text-rose-300 font-bold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Clear All Active Tickets</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
