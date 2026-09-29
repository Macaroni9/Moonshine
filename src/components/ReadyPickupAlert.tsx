import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, X, ChevronRight, Volume2, Sparkles, Clock } from 'lucide-react';
import { OrderTicket, OrderStatus } from '../types/restaurant';
import { testAlertSound, unlockAudio } from '../services/soundEffects';

interface ReadyPickupAlertProps {
  readyOrders: OrderTicket[];
  currentRole: 'server' | 'kitchen';
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onOpenReadyTab?: () => void;
}

export const ReadyPickupAlert: React.FC<ReadyPickupAlertProps> = ({
  readyOrders,
  currentRole,
  onUpdateStatus,
  onOpenReadyTab,
}) => {
  // Track which order was most recently made ready to trigger the high-impact popup modal
  const [activeModalOrder, setActiveModalOrder] = useState<OrderTicket | null>(null);
  const [lastSeenReadyId, setLastSeenReadyId] = useState<string | null>(null);

  // When a new ready order appears, automatically present the high-priority modal
  useEffect(() => {
    if (readyOrders.length > 0) {
      const latestReady = readyOrders[0];
      if (latestReady && latestReady.id !== lastSeenReadyId) {
        setLastSeenReadyId(latestReady.id);
        // Only auto-popup on Server screens (waiter iPad)
        if (currentRole === 'server') {
          setActiveModalOrder(latestReady);
        }
      }
    } else {
      setActiveModalOrder(null);
    }
  }, [readyOrders, currentRole, lastSeenReadyId]);

  if (readyOrders.length === 0) return null;

  return (
    <>
      {/* 1. PERSISTENT HIGH-VISIBILITY ALERT BANNER ACROSS TOP OF IPAD */}
      <div className="sticky top-[53px] sm:top-[57px] z-30 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border-y-2 border-emerald-400/90 text-white shadow-[0_8px_30px_rgba(16,185,129,0.35)] px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          
          {/* Left: Animated Ringing Bell & Table Summary */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black shadow-lg animate-bounce">
                <Bell className="w-6 h-6 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full text-[10px] font-black text-black flex items-center justify-center border border-white">
                {readyOrders.length}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-emerald-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  HOT FOOD READY AT PASS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                  {readyOrders.length} {readyOrders.length === 1 ? 'Order' : 'Orders'} Waiting
                </span>
              </div>

              {/* Ready Tables Quick Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {readyOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setActiveModalOrder(o)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 text-white font-mono text-xs font-bold border border-emerald-400/50 shadow-xs cursor-pointer transition active:scale-95"
                    title="Click to view ticket dishes"
                  >
                    <span>{o.tableNumber}</span>
                    <span className="text-[10px] text-emerald-200">({o.items.length})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            {/* Direct Deliver First Ready Order button */}
            <button
              onClick={() => onUpdateStatus(readyOrders[0].id, 'SERVED')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
              title={`Mark ${readyOrders[0].tableNumber} as Delivered`}
            >
              <CheckCircle2 className="w-4 h-4 text-stone-950" />
              <span>Deliver {readyOrders[0].tableNumber}</span>
            </button>

            {onOpenReadyTab && (
              <button
                onClick={onOpenReadyTab}
                className="px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-900 text-stone-200 text-xs font-bold border border-emerald-500/50 flex items-center gap-1 transition"
              >
                <span>View Pass Board</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Test alert sound button */}
            <button
              onClick={() => testAlertSound('ready')}
              className="p-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs transition"
              title="Test iPad Sound Volume"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. HIGH-PRIORITY FLASH MODAL FOR NEW READY DISHES (Unmissable on iPad) */}
      {activeModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#121E17] border-4 border-emerald-400 rounded-3xl max-w-lg w-full p-5 sm:p-7 text-stone-100 shadow-[0_0_80px_rgba(16,185,129,0.5)] relative overflow-hidden">
            {/* Top alert badge bar */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black shadow-lg animate-bounce">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-wider text-emerald-300 uppercase font-mono">
                    ORDER READY FOR PICKUP!
                  </h2>
                  <p className="text-xs text-emerald-200/80 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>Plated at kitchen pass — pick up now</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModalOrder(null)}
                className="text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-emerald-950 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Huge Table Identifier */}
            <div className="p-4 rounded-2xl bg-black/50 border-2 border-emerald-500/70 text-center mb-4 shadow-inner">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 block mb-1">
                DELIVER TO TABLE
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight block">
                {activeModalOrder.tableNumber}
              </span>
              <div className="flex items-center justify-center gap-2 mt-1.5 text-xs text-stone-300 font-mono">
                <span className="text-emerald-400 font-bold">Ticket #{activeModalOrder.orderNumber}</span>
                {activeModalOrder.serverName && <span>• Server: {activeModalOrder.serverName}</span>}
              </div>
            </div>

            {/* Special Instructions / Notes */}
            {activeModalOrder.orderNotes && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/70 text-amber-200 text-xs font-semibold flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span>{activeModalOrder.orderNotes}</span>
              </div>
            )}

            {/* Items List */}
            <div className="mb-5 max-h-56 overflow-y-auto space-y-2 pr-1">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                Dishes on Plate ({activeModalOrder.items.length} items):
              </span>
              {activeModalOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-stone-950 font-black font-mono text-sm">
                      {item.quantity}x
                    </span>
                    <div>
                      <span className="text-sm font-bold text-white block">{item.name}</span>
                      {item.comments && (
                        <p className="text-xs text-amber-300 font-medium italic mt-0.5">
                          "{item.comments}"
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/60 shrink-0">
                    PLATED
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  onUpdateStatus(activeModalOrder.id, 'SERVED');
                  setActiveModalOrder(null);
                }}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-black text-base flex items-center justify-center gap-2.5 shadow-xl active:scale-[0.98] transition cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-stone-950" />
                <span>DELIVERED TO TABLE (DONE)</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => testAlertSound('ready')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Re-Ring Sound Bell</span>
                </button>

                <button
                  onClick={() => setActiveModalOrder(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-bold transition"
                >
                  Dismiss / Deliver Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
