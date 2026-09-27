import React, { useState, useEffect } from 'react';
import { useOrderSync } from './services/orderSync';
import { Header } from './components/Header';
import { ServerFloorView } from './components/ServerFloorView';
import { KitchenDisplayView } from './components/KitchenDisplayView';
import { Bell, CheckCircle2, X } from 'lucide-react';

export default function App() {
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
        return stored;
      }
    }
    return 'server';
  });

  const handleRoleChange = (newRole: 'server' | 'kitchen') => {
    setRole(newRole);
    try {
      localStorage.setItem('moonshine_role', newRole);
      const url = new URL(window.location.href);
      url.searchParams.set('role', newRole);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore URL/storage issues
    }
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
  } = useOrderSync(role);

  const activeOrdersCount = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'SERVED').length;
  const readyOrdersCount = orders.filter((o) => o.status === 'READY').length;

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
