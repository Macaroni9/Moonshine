import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  Bell,
  Check,
  RotateCcw,
  Layers,
  ChefHat
} from 'lucide-react';
import { OrderTicket, OrderStatus } from '../types/restaurant';

interface KitchenDisplayViewProps {
  orders: OrderTicket[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateItemStatus: (orderId: string, itemId: string, itemStatus: 'PENDING' | 'DONE') => void;
}

export const KitchenDisplayView: React.FC<KitchenDisplayViewProps> = ({
  orders,
  onUpdateStatus,
  onUpdateItemStatus,
}) => {
  // Simplified Kitchen Tabs: Orders Accepted (incoming) vs Order Ready for Pickup (at pass) vs All / History
  const [filter, setFilter] = useState<'accepted' | 'ready' | 'all' | 'history'>('accepted');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Tick timer every 5 seconds to update elapsed time labels
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedMinutes = (isoString: string) => {
    const created = new Date(isoString).getTime();
    const diffMs = currentTime - created;
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const formatElapsed = (isoString: string) => {
    const mins = getElapsedMinutes(isoString);
    if (mins === 0) return 'Just now';
    if (mins === 1) return '1m ago';
    return `${mins}m ago`;
  };

  // Grouped counts
  const acceptedOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const completedOrders = orders.filter((o) => o.status === 'SERVED' || o.status === 'CANCELLED');
  const allActiveOrders = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'SERVED');

  const displayedOrders = orders.filter((order) => {
    if (filter === 'accepted') return order.status === 'PENDING' || order.status === 'PREPARING';
    if (filter === 'ready') return order.status === 'READY';
    if (filter === 'all') return order.status !== 'CANCELLED' && order.status !== 'SERVED';
    if (filter === 'history') return order.status === 'SERVED' || order.status === 'CANCELLED';
    return true;
  });

  // Batch item summary across active orders (e.g. 4 Bruschetta, 2 Gabagool)
  const itemSummary = allActiveOrders.reduce<Record<string, { count: number; name: string; category: string }>>(
    (acc, order) => {
      order.items.forEach((item) => {
        if (item.status !== 'DONE') {
          if (!acc[item.name]) {
            acc[item.name] = { count: 0, name: item.name, category: item.category };
          }
          acc[item.name].count += item.quantity;
        }
      });
      return acc;
    },
    {}
  );

  const pendingDishesList = Object.values(itemSummary).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#0C0E12] text-stone-100 flex flex-col font-sans">
      
      {/* KDS Navigation & Queue Status Bar */}
      <div className="bg-[#14171E] border-b border-stone-800 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          
          {/* Title & Ticket Counters */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100 tracking-wide">
                  Kitchen Screen
                </h2>
                {acceptedOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {acceptedOrders.length} New Orders
                  </span>
                )}
                {readyOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    {readyOrders.length} Ready at Pass
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 font-mono">
                Real-time tickets received from floor servers
              </p>
            </div>
          </div>

          {/* Simple Kitchen Filter Tabs */}
          <div className="flex items-center bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilter('accepted')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                filter === 'accepted'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Order Accepted ({acceptedOrders.length})
            </button>

            <button
              onClick={() => setFilter('ready')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
                filter === 'ready'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ready for Pickup ({readyOrders.length})</span>
            </button>

            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                filter === 'all'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All Active ({allActiveOrders.length})
            </button>

            <button
              onClick={() => setFilter('history')}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                filter === 'history'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-500 hover:text-stone-300'
              }`}
            >
              History ({completedOrders.length})
            </button>
          </div>
        </div>

        {/* Batch Prep Summary Bar */}
        {pendingDishesList.length > 0 && filter !== 'history' && (
          <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-stone-800/80 flex items-center gap-2 overflow-x-auto pb-0.5 text-xs scrollbar-none">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 shrink-0">
              <Layers className="w-3 h-3" />
              Total to Prep:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {pendingDishesList.map((dish) => (
                <span
                  key={dish.name}
                  className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-stone-200 font-mono text-[11px] flex items-center gap-1"
                >
                  <strong className="text-amber-400 font-bold">{dish.count}x</strong>
                  <span className="truncate max-w-[140px]">{dish.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ticket Grid Display */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-5">
        {displayedOrders.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-center p-8 bg-stone-900/40 rounded-2xl border border-stone-800 shadow-inner">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 shadow-sm">
              <ChefHat className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-stone-200">
              {filter === 'ready'
                ? 'No Orders at the Pass'
                : filter === 'accepted'
                ? 'Kitchen is Clear'
                : 'No Orders in this View'}
            </h3>
            <p className="text-xs text-stone-400 mt-1 max-w-md leading-relaxed">
              {filter === 'ready'
                ? 'When dishes are finished, click "Order Ready for Pickup" to alert the server phone.'
                : 'When a server punches an order, it will appear here instantly with an audible chime.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedOrders.map((order) => {
              const elapsedMins = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsedMins >= 12;
              const isMedium = elapsedMins >= 7 && elapsedMins < 12;

              let cardBorder = 'border-stone-700/80';
              let headerBg = 'bg-stone-800/90 text-stone-100';

              if (order.status === 'READY') {
                cardBorder = 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-950/40 shadow-lg';
                headerBg = 'bg-emerald-950 text-emerald-200 border-b border-emerald-800';
              } else if (order.status === 'SERVED') {
                cardBorder = 'border-stone-800 opacity-60';
                headerBg = 'bg-stone-900 text-stone-400';
              } else if (isUrgent) {
                cardBorder = 'border-rose-500/80 ring-1 ring-rose-500/30';
                headerBg = 'bg-rose-950/70 text-rose-200 border-b border-rose-900';
              }

              return (
                <div
                  key={order.id}
                  className={`bg-[#171A21] rounded-2xl border ${cardBorder} flex flex-col justify-between overflow-hidden shadow-xl transition-all`}
                >
                  <div>
                    {/* Ticket Header */}
                    <div className={`p-3.5 ${headerBg} flex items-start justify-between gap-2 border-b border-stone-800/60`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xl font-black tracking-tight text-white">
                            {order.tableNumber}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/30 text-amber-200 font-bold border border-white/10">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 mt-0.5">
                          {order.serverName}
                        </p>
                      </div>

                      {/* Urgency / Elapsed timer badge */}
                      <div className="flex flex-col items-end">
                        <span
                          className={`flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            order.status === 'READY'
                              ? 'bg-emerald-900 text-emerald-200 border border-emerald-700'
                              : isUrgent
                              ? 'bg-rose-600 text-white animate-pulse'
                              : isMedium
                              ? 'bg-amber-600 text-white'
                              : 'bg-stone-900 text-stone-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{formatElapsed(order.createdAt)}</span>
                        </span>

                        <span className="text-[10px] uppercase font-bold mt-1 text-stone-400">
                          {order.status === 'READY' ? 'READY AT PASS' : 'ORDER ACCEPTED'}
                        </span>
                      </div>
                    </div>

                    {/* Overall Order Notes (allergies, urgency) */}
                    {order.orderNotes && (
                      <div className="mx-3 mt-2.5 p-2 rounded-xl bg-amber-950/80 border border-amber-600/70 text-xs text-amber-200 flex items-start gap-1.5 shadow-xs">
                        <span className="text-amber-400 font-black">⚠️</span>
                        <div>
                          <strong className="text-amber-300 uppercase tracking-wider text-[10px] block">
                            Kitchen Alert:
                          </strong>
                          <span>{order.orderNotes}</span>
                        </div>
                      </div>
                    )}

                    {/* Order Items List */}
                    <div className="p-3.5 space-y-2">
                      {order.items.map((item) => {
                        const isDone = item.status === 'DONE';

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isDone
                                ? 'bg-stone-900/50 border-stone-800 text-stone-500'
                                : 'bg-[#1F232D] border-stone-700/80 text-stone-100 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                                    isDone
                                      ? 'bg-stone-800 text-stone-500'
                                      : 'bg-amber-500 text-stone-950 shadow-xs'
                                  }`}
                                >
                                  {item.quantity}x
                                </span>

                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-sm font-bold leading-tight ${
                                        isDone ? 'line-through text-stone-500' : 'text-stone-100'
                                      }`}
                                    >
                                      {item.name}
                                    </span>
                                    {item.isVegetarian && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                                        V
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Individual item bump checkbox */}
                              <button
                                onClick={() =>
                                  onUpdateItemStatus(order.id, item.id, isDone ? 'PENDING' : 'DONE')
                                }
                                className={`w-6 h-6 rounded-md flex items-center justify-center border transition shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'border-stone-600 hover:border-amber-400 text-transparent hover:text-stone-400'
                                }`}
                                title={isDone ? 'Mark as not done' : 'Mark item completed'}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Item comments / modifications */}
                            {item.comments && (
                              <div className="mt-1.5 ml-9">
                                <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/70 text-xs text-amber-200 font-semibold flex items-center gap-1.5 shadow-xs">
                                  <span className="text-amber-400 font-black text-xs">⚠️</span>
                                  <span className="leading-snug">{item.comments}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* KDS Action Bar: ONLY "ORDER READY FOR PICKUP" (NO "Start Cooking" button) */}
                  <div className="p-3 bg-[#111318] border-t border-stone-800/80 flex flex-col gap-2">
                    
                    {/* When Order is Accepted: Big Button -> ORDER READY FOR PICKUP */}
                    {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                      <button
                        onClick={() => onUpdateStatus(order.id, 'READY')}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
                      >
                        <Bell className="w-4 h-4 animate-bounce" />
                        <span>ORDER READY FOR PICKUP</span>
                      </button>
                    )}

                    {/* When Order is Ready: Mark Served (Bump from pass) */}
                    {order.status === 'READY' && (
                      <div className="space-y-1.5">
                        <div className="text-center text-[11px] font-bold text-emerald-400 bg-emerald-950/60 py-1 rounded-lg border border-emerald-800/60">
                          🛎️ Server Phone Notified & Vibrating
                        </div>
                        <button
                          onClick={() => onUpdateStatus(order.id, 'SERVED')}
                          className="w-full py-2.5 px-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Picked Up by Server (Clear)</span>
                        </button>
                      </div>
                    )}

                    {order.status === 'SERVED' && (
                      <div className="flex items-center justify-between text-xs text-stone-400">
                        <span>Served & Completed</span>
                        <button
                          onClick={() => onUpdateStatus(order.id, 'PENDING')}
                          className="text-stone-400 hover:text-white flex items-center gap-1 underline text-[11px]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Recall</span>
                        </button>
                      </div>
                    )}

                    {order.status === 'CANCELLED' && (
                      <div className="text-xs text-rose-400 text-center font-bold">
                        Ticket Cancelled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
