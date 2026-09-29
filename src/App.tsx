import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logoutStaff } from './services/firebase';
import { useOrderSync } from './services/orderSync';
import { Header } from './components/Header';
import { ServerFloorView } from './components/ServerFloorView';
import { KitchenDisplayView } from './components/KitchenDisplayView';
import { StaffAuthScreen } from './components/StaffAuthScreen';
import { ReadyPickupAlert } from './components/ReadyPickupAlert';
import { Bell, CheckCircle2, X, Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active role for this device session ('server' | 'kitchen').
  // Retained in sessionStorage for page reloads, but cleared on sign out.
  const [selectedRole, setSelectedRole] = useState<'server' | 'kitchen' | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('moonshine_session_role');
      if (stored === 'kitchen' || stored === 'server') {
        return stored;
      }
    }
    return null;
  });

  // Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleSelected = (newRole: 'server' | 'kitchen') => {
    setSelectedRole(newRole);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('moonshine_session_role', newRole);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const handleSignOut = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('moonshine_session_role');
        localStorage.removeItem('moonshine_role');
      }
      setSelectedRole(null);
      await logoutStaff();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const activeRole: 'server' | 'kitchen' = selectedRole || 'server';

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
  } = useOrderSync(activeRole, currentUser);

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

  // 2. If not authenticated OR staff device has not picked a role yet:
  // After signing in, ALWAYS ask the device to pick a role!
  if (!currentUser || !selectedRole) {
    return (
      <StaffAuthScreen
        currentUser={currentUser}
        currentRole={selectedRole || 'server'}
        onRoleSelected={handleRoleSelected}
        onSignOut={currentUser ? handleSignOut : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1015] text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      {/* Top Header with Locked Role Indicator */}
      <Header
        currentRole={selectedRole}
        connectionStatus={connectionStatus}
        activeDevicesCount={activeDevicesCount}
        presenceSummary={presenceSummary}
        activeOrdersCount={activeOrdersCount}
        readyOrdersCount={readyOrdersCount}
        onResetDemo={() => resetOrders()}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Prominent High-Visibility Ready-for-Pickup Alert System (ONLY for Server iPad, NEVER kitchen) */}
      <ReadyPickupAlert
        readyOrders={orders.filter((o) => o.status === 'READY')}
        currentRole={selectedRole}
        onUpdateStatus={updateOrderStatus}
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

      {/* Main Screen: Renders ONLY the chosen role */}
      <main className="flex-1 flex flex-col">
        {selectedRole === 'server' && (
          <ServerFloorView
            orders={orders}
            onCreateOrder={createOrder}
            onUpdateStatus={updateOrderStatus}
          />
        )}

        {selectedRole === 'kitchen' && (
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
