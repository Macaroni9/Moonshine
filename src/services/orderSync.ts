import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderTicket, OrderStatus, WebSocketServerMessage, WebSocketClientMessage } from '../types/restaurant';
import { playKitchenOrderBell, playOrderReadyChime } from './soundEffects';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useOrderSync(currentRole: 'server' | 'kitchen') {
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [activeDevicesCount, setActiveDevicesCount] = useState<number>(1);
  const [lastNotification, setLastNotification] = useState<{ id: string; title: string; subtitle: string; type: 'new' | 'ready' } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const currentRoleRef = useRef(currentRole);
  currentRoleRef.current = currentRole;

  // Notification auto-dismiss timer
  useEffect(() => {
    if (!lastNotification) return;
    const timer = setTimeout(() => {
      setLastNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [lastNotification]);

  // REST API fetch initial or fallback
  const fetchOrdersFromRest = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrders((prev) => {
            // Check if any order newly became READY
            if (currentRoleRef.current === 'server') {
              const newlyReady = (data.orders as OrderTicket[]).find(
                (newO) => newO.status === 'READY' && !prev.some((oldO) => oldO.id === newO.id && oldO.status === 'READY')
              );
              if (newlyReady && prev.length > 0) {
                playOrderReadyChime();
                setLastNotification({
                  id: String(Date.now()),
                  title: `🛎️ Order #${newlyReady.orderNumber} Ready for Pickup!`,
                  subtitle: `${newlyReady.tableNumber} is ready at the pass`,
                  type: 'ready',
                });
              }
            }
            return data.orders;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch orders via REST:', err);
    }
  }, []);

  // Connect WebSocket
  useEffect(() => {
    let isSubscribed = true;

    function connectWs() {
      if (!isSubscribed) return;
      setConnectionStatus('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setConnectionStatus('connected');

          // Keep alive ping
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data: WebSocketServerMessage = JSON.parse(event.data);

            if (data.type === 'INIT') {
              setOrders(data.orders);
              if (typeof data.clientCount === 'number') {
                setActiveDevicesCount(data.clientCount);
              }
            } else if (data.type === 'CLIENTS_UPDATED') {
              if (typeof data.clientCount === 'number') {
                setActiveDevicesCount(data.clientCount);
              }
            } else if (data.type === 'NEW_ORDER') {
              setOrders((prev) => {
                // Idempotent check
                if (prev.some((o) => o.id === data.order.id)) {
                  return prev.map((o) => (o.id === data.order.id ? data.order : o));
                }
                return [data.order, ...prev];
              });

              // Audio & notification logic for kitchen
              if (currentRoleRef.current === 'kitchen') {
                playKitchenOrderBell();
                setLastNotification({
                  id: String(Date.now()),
                  title: `🔥 New Order #${data.order.orderNumber} (${data.order.tableNumber})`,
                  subtitle: `${data.order.items.length} items punched from ${data.order.floor}`,
                  type: 'new',
                });
              }
            } else if (data.type === 'ORDER_UPDATED') {
              setOrders((prev) =>
                prev.map((o) => (o.id === data.order.id ? data.order : o))
              );

              // If order was marked READY, notify server
              if (data.order.status === 'READY') {
                if (currentRoleRef.current === 'server') {
                  playOrderReadyChime();
                  setLastNotification({
                    id: String(Date.now()),
                    title: `🛎️ Order #${data.order.orderNumber} Ready for Pickup!`,
                    subtitle: `${data.order.tableNumber} is ready at the pass`,
                    type: 'ready',
                  });
                }
              }
            } else if (data.type === 'ORDER_DELETED') {
              setOrders((prev) => prev.filter((o) => o.id !== data.orderId));
            }
          } catch (err) {
            console.error('Failed to parse WS incoming message:', err);
          }
        };

        ws.onerror = () => {
          // Handled in onclose
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setConnectionStatus('disconnected');
          clearInterval(pingIntervalRef.current);
          // Try reconnect in 2.5s
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connectWs, 2500);
        };
      } catch (err) {
        setConnectionStatus('disconnected');
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      }
    }

    fetchOrdersFromRest();
    connectWs();

    // Fallback polling every 3 seconds so kitchen screen never misses an order
    const pollInterval = setInterval(fetchOrdersFromRest, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [fetchOrdersFromRest]);

  // Send helpers: single authoritative submission with WebSocket broadcast from server
  const createOrder = useCallback(
    async (payload: Omit<OrderTicket, 'orderNumber' | 'createdAt' | 'updatedAt' | 'status'>) => {
      // Primary: submit via REST API. The Express server saves the order and immediately broadcasts
      // NEW_ORDER to all connected WebSocket devices (kitchen monitor, servers).
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success && data.order) {
          setOrders((prev) => {
            if (prev.some((o) => o.id === data.order.id)) return prev;
            return [data.order, ...prev];
          });
          return data.order;
        }
      } catch (err) {
        console.warn('REST create failed, fallback to WebSocket:', err);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'CREATE_ORDER', payload }));
        }
      }
    },
    []
  );

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o))
    );

    // 1. Try WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const msg: WebSocketClientMessage = {
        type: 'CHANGE_STATUS',
        payload: { orderId, status },
      };
      socketRef.current.send(JSON.stringify(msg));
      return;
    }

    // 2. Fallback REST
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('REST status update fallback failed:', err);
    }
  }, []);

  const updateItemStatus = useCallback(
    async (orderId: string, itemId: string, itemStatus: 'PENDING' | 'DONE') => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const updatedItems = order.items.map((item) =>
            item.id === itemId ? { ...item, status: itemStatus } : item
          );
          return { ...order, items: updatedItems };
        })
      );

      // 1. Try WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const msg: WebSocketClientMessage = {
          type: 'CHANGE_ITEM_STATUS',
          payload: { orderId, itemId, itemStatus },
        };
        socketRef.current.send(JSON.stringify(msg));
        return;
      }

      // 2. Fallback REST
      try {
        await fetch(`/api/orders/${orderId}/items/${itemId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: itemStatus }),
        });
      } catch (err) {
        console.error('REST item status update fallback failed:', err);
      }
    },
    []
  );

  const resetOrders = useCallback(async (mode: 'seed' | 'clear' = 'seed') => {
    try {
      const res = await fetch('/api/orders/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to reset orders:', err);
    }
  }, []);

  return {
    orders,
    connectionStatus,
    activeDevicesCount,
    lastNotification,
    dismissNotification: () => setLastNotification(null),
    createOrder,
    updateOrderStatus,
    updateItemStatus,
    resetOrders,
  };
}
