import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  ChefHat,
  Receipt,
  CheckCircle2,
  Shield,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { loginWithGoogle } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

interface StaffAuthScreenProps {
  currentUser: User | null;
  currentRole: 'server' | 'kitchen';
  onRoleSelected: (role: 'server' | 'kitchen') => void;
}

export const StaffAuthScreen: React.FC<StaffAuthScreenProps> = ({
  currentUser,
  currentRole,
  onRoleSelected,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'server' | 'kitchen'>(currentRole);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setUnauthorizedDomain(null);

    try {
      const user = await loginWithGoogle();
      if (user) {
        // Save initial staff profile in Firestore
        await setDoc(
          doc(db, 'users', user.uid),
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Staff Member',
            photoURL: user.photoURL || '',
            role: selectedRole,
            lastSeen: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      const isUnauthorizedDomain =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.toLowerCase().includes('unauthorized domain') ||
        err?.message?.toLowerCase().includes('unauthorized-domain');

      if (isUnauthorizedDomain) {
        setUnauthorizedDomain(currentHostname);
      } else {
        setErrorMsg(err?.message || 'Sign in was cancelled or failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleConfirmRole = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Staff Member',
          photoURL: currentUser.photoURL || '',
          role: selectedRole,
          lastSeen: new Date().toISOString(),
        },
        { merge: true }
      );
      onRoleSelected(selectedRole);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      onRoleSelected(selectedRole);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0E14] text-stone-100 flex items-center justify-center p-4 selection:bg-amber-600 selection:text-white">
      <div className="max-w-md w-full bg-[#161822] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Brand Header */}
        <div className="text-center mb-6 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white shadow-xl mx-auto mb-3 font-serif font-black text-2xl border border-amber-500/40">
            M
          </div>
          <h1 className="font-['Cinzel'] tracking-widest text-2xl font-bold text-amber-100 leading-tight">
            MOONSHINE
          </h1>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-wider font-semibold">
            Cloud POS & Kitchen Network
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-[11px] font-mono mt-3 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Firebase Cloud Sync Active</span>
          </div>
        </div>

        {/* UNAUTHORIZED DOMAIN HELPER (Vercel Fix Guide) */}
        {unauthorizedDomain && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-950/80 border border-amber-500/70 text-amber-100 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 mb-2 text-amber-300 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Authorize Domain in Firebase</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed mb-3">
              Firebase requires domains hosting the app (like your Vercel URL) to be added to the Google OAuth allowlist once:
            </p>

            {/* Domain Box + Copy button */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900 border border-amber-500/40 mb-3">
              <span className="font-mono text-xs text-amber-200 truncate pr-2">
                {currentHostname}
              </span>
              <button
                onClick={handleCopyDomain}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition"
              >
                {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDomain ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Steps list */}
            <div className="text-[11px] text-stone-300 space-y-1 mb-3 bg-black/30 p-2.5 rounded-xl">
              <div><strong>1.</strong> Click button below to open Firebase Settings.</div>
              <div><strong>2.</strong> Under <strong>Authorized domains</strong>, click <strong>Add domain</strong>.</div>
              <div><strong>3.</strong> Paste <code className="text-amber-300">{currentHostname}</code> and click <strong>Save</strong>.</div>
            </div>

            <a
              href={firebaseSettingsUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
            >
              <span>Open Firebase Console Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-600/70 text-rose-200 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: If NOT logged in, show Google Sign-in */}
        {!currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 text-center">
              <Shield className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-stone-200">Staff Authentication</h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Log in with your Google account. All servers and kitchen screens sync instantly across the cloud.
              </p>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-sm tracking-wide flex items-center justify-center gap-3 shadow-xl active:scale-98 transition cursor-pointer"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Signing in...' : 'Sign in with Google (Gmail)'}</span>
            </button>

            <p className="text-[11px] text-center text-stone-500">
              Authorized Moonshine restaurant staff only
            </p>
          </div>
        ) : (
          /* STEP 2: Signed In -> Select Screen Role */
          <div className="space-y-4">
            {/* Signed-in badge */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-stone-900 border border-stone-800">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-10 h-10 rounded-full border border-amber-500/40 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-sm">
                  {(currentUser.displayName || currentUser.email || 'S')[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-stone-200 block truncate">
                  {currentUser.displayName || 'Staff Member'}
                </span>
                <span className="text-[11px] text-stone-400 font-mono block truncate">
                  {currentUser.email}
                </span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>

            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Select Device Role for This Screen:
            </div>

            {/* Role Options */}
            <div className="space-y-2.5">
              {/* Option 1: Waiter Mobile Phone */}
              <div
                onClick={() => setSelectedRole('server')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                  selectedRole === 'server'
                    ? 'bg-amber-950/70 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                    : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    selectedRole === 'server'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                    <span>Floor Server (Waiter Phone)</span>
                    {selectedRole === 'server' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-600 text-white font-bold">
                        Selected
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Punch table tickets, stage dishes, and receive phone vibration chimes when kitchen finishes dishes.
                  </p>
                </div>
              </div>

              {/* Option 2: Kitchen Display System */}
              <div
                onClick={() => setSelectedRole('kitchen')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                  selectedRole === 'kitchen'
                    ? 'bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                    : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    selectedRole === 'kitchen'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                    <span>Kitchen Display (Chef Screen)</span>
                    {selectedRole === 'kitchen' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                        Selected
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Live tickets queue, incoming sound bell, total items prep count, and one-tap "Order Ready for Pickup" button.
                  </p>
                </div>
              </div>
            </div>

            {/* Launch App Button */}
            <button
              onClick={handleConfirmRole}
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-98 transition cursor-pointer"
            >
              <span>Launch {selectedRole === 'server' ? 'Server Screen' : 'Kitchen Screen'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
