import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logoutStaff } from './services/firebase';
import { useOrderSync } from './services/orderSync';
import { Header } from './components/Header';
import { ServerFloorView } from './components/ServerFloorView';
import { KitchenDisplayView } from './components/KitchenDisplayView';
import { StaffAuthScreen } from './components/StaffAuthScreen';
import { Bell, CheckCircle2, X, Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  // Read role from URL query param if present (?role=kitchen or ?role=server)
  const [role, setRole] = useState<'server' | 'kitchen'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('role');
      if (r === 'kitchen' || r === 'server') {
        return r;
      }
      const stored = localStorage.getItem('moonshine_role');
      if (stored === 'kitchen' || stored === 'server') {
        return stored as 'server' | 'kitchen';
      }
    }
    return 'server';
  });

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = (newRole: 'server' | 'kitchen') => {
    setRole(newRole);
    try {
      localStorage.setItem('moonshine_role', newRole);
      const url = new URL(window.location.href);
      url.searchParams.set('role', newRole);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore URL/storage errors
    }
  };

  const handleSignOut = async () => {
    await logoutStaff();
  };

  const {
    orders,
    connectionStatus,
    activeDevicesCount,
    presenceSummary,
    lastNotification,
    dismissNotification,
    createOrder,
    updateOrderStatus,
    updateItemStatus,
    resetOrders,
  } = useOrderSync(role, currentUser);

  const activeOrdersCount = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'SERVED').length;
  const readyOrdersCount = orders.filter((o) => o.status === 'READY').length;

  // 1. Initial loading splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0C0E14] text-stone-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 animate-spin">
          <Loader2 className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-stone-400">Connecting Moonshine Cloud...</p>
      </div>
    );
  }

  // 2. If not authenticated or user opened role switcher
  if (!currentUser || showRoleSelector) {
    return (
      <StaffAuthScreen
        currentUser={currentUser}
        currentRole={role}
        onRoleSelected={(newRole) => {
          handleRoleChange(newRole);
          setShowRoleSelector(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1015] text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      {/* Top Header */}
      <Header
        currentRole={role}
        onRoleChange={handleRoleChange}
        connectionStatus={connectionStatus}
        activeDevicesCount={activeDevicesCount}
        presenceSummary={presenceSummary}
        activeOrdersCount={activeOrdersCount}
        readyOrdersCount={readyOrdersCount}
        onResetDemo={() => resetOrders()}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenRoleSelector={() => setShowRoleSelector(true)}
      />

      {/* Real-time Global Banner / Alert Notification */}
      {lastNotification && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-bounce">
          <div
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 ${
              lastNotification.type === 'ready'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100'
                : 'bg-amber-950/90 border-amber-500 text-amber-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  lastNotification.type === 'ready'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-amber-800 text-white'
                }`}
              >
                {lastNotification.type === 'ready' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5 animate-pulse" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide">
                  {lastNotification.title}
                </h4>
                <p className="text-xs text-stone-300 mt-0.5">
                  {lastNotification.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={dismissNotification}
              className="text-stone-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Role Views */}
      <main className="flex-1 flex flex-col">
        {role === 'server' && (
          <ServerFloorView
            orders={orders}
            onCreateOrder={createOrder}
            onUpdateStatus={updateOrderStatus}
          />
        )}

        {role === 'kitchen' && (
          <KitchenDisplayView
            orders={orders}
            onUpdateStatus={updateOrderStatus}
            onUpdateItemStatus={updateItemStatus}
          />
        )}
      </main>
    </div>
  );
}
