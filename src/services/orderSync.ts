import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OrderTicket,
  OrderStatus,
  WebSocketServerMessage,
  WebSocketClientMessage,
  PresenceSummary,
} from '../types/restaurant';
import { playKitchenOrderBell, playOrderReadyChime, triggerPhoneVibration } from './soundEffects';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

function getDeviceId(role: 'server' | 'kitchen'): string {
  if (typeof window === 'undefined') return 'device-init';
  let id = localStorage.getItem('moonshine_device_id');
  if (!id) {
    id = `dev_${role}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('moonshine_device_id', id);
  }
  return id;
}

function getDeviceName(role: 'server' | 'kitchen'): string {
  if (typeof window === 'undefined') return role;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (role === 'kitchen') {
    return isMobile ? 'Kitchen (Tablet)' : 'Kitchen Display';
  }
  return isMobile ? 'Server (Phone)' : 'Server (Terminal)';
}

export function useOrderSync(currentRole: 'server' | 'kitchen') {
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [activeDevicesCount, setActiveDevicesCount] = useState<number>(1);
  const [presenceSummary, setPresenceSummary] = useState<PresenceSummary>({
    total: 1,
    serversCount: currentRole === 'server' ? 1 : 0,
    kitchensCount: currentRole === 'kitchen' ? 1 : 0,
    devices: [],
  });
  const [lastNotification, setLastNotification] = useState<{
    id: string;
    title: string;
    subtitle: string;
    type: 'new' | 'ready';
  } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const isInitialLoadRef = useRef(true);

  const currentRoleRef = useRef(currentRole);
  currentRoleRef.current = currentRole;

  const deviceIdRef = useRef<string>(getDeviceId(currentRole));
  const deviceNameRef = useRef<string>(getDeviceName(currentRole));

  // Notification auto-dismiss timer
  useEffect(() => {
    if (!lastNotification) return;
    const timer = setTimeout(() => {
      setLastNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastNotification]);

  // Central order update handler that triggers sound and vibration
  const processIncomingOrders = useCallback((incomingOrders: OrderTicket[]) => {
    setOrders((prev) => {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return incomingOrders;
      }

      // 1. Kitchen Check: Did a new order arrive?
      if (currentRoleRef.current === 'kitchen') {
        const newlyAdded = incomingOrders.find(
          (inO) => !prev.some((oldO) => oldO.id === inO.id) && inO.status !== 'CANCELLED'
        );
        if (newlyAdded) {
          playKitchenOrderBell();
          setLastNotification({
            id: String(Date.now()),
            title: `🔥 New Order #${newlyAdded.orderNumber} (${newlyAdded.tableNumber})`,
            subtitle: `${newlyAdded.items.length} items punched`,
            type: 'new',
          });
        }
      }

      // 2. Server Check: Did an order become READY for pickup?
      if (currentRoleRef.current === 'server') {
        const newlyReady = incomingOrders.find(
          (inO) =>
            inO.status === 'READY' &&
            !prev.some((oldO) => oldO.id === inO.id && oldO.status === 'READY')
        );
        if (newlyReady) {
          triggerPhoneVibration([300, 150, 300, 150, 500]);
          playOrderReadyChime();
          setLastNotification({
            id: String(Date.now()),
            title: `🛎️ Order #${newlyReady.orderNumber} Ready for Pickup!`,
            subtitle: `${newlyReady.tableNumber} is ready at the pass`,
            type: 'ready',
          });
        }
      }

      return incomingOrders;
    });
  }, []);

  // Heartbeat function: syncs presence & orders reliably over REST
  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          role: currentRoleRef.current,
          deviceName: deviceNameRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConnectionStatus('connected');
        if (data.presence) {
          setPresenceSummary(data.presence);
          setActiveDevicesCount(data.presence.total || 1);
        }
        if (data.orders) {
          processIncomingOrders(data.orders);
        }
      }
    } catch {
      // If WebSocket is not open and REST fails, mark disconnected
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        setConnectionStatus('disconnected');
      }
    }
  }, [processIncomingOrders]);

  // Connect WebSocket for sub-10ms instantaneous push
  useEffect(() => {
    let isSubscribed = true;

    function connectWs() {
      if (!isSubscribed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setConnectionStatus('connected');

          // Send immediate presence handshake over WS
          ws.send(
            JSON.stringify({
              type: 'HEARTBEAT',
              payload: {
                deviceId: deviceIdRef.current,
                role: currentRoleRef.current,
                deviceName: deviceNameRef.current,
              },
            })
          );

          // Ping interval to keep connection alive
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data: WebSocketServerMessage = JSON.parse(event.data);

            if (data.type === 'INIT') {
              if (data.orders) {
                processIncomingOrders(data.orders);
              }
              if (data.presence) {
                setPresenceSummary(data.presence);
                setActiveDevicesCount(data.presence.total || 1);
              }
            } else if (data.type === 'PRESENCE_UPDATED') {
              if (data.presence) {
                setPresenceSummary(data.presence);
                setActiveDevicesCount(data.presence.total || 1);
              }
            } else if (data.type === 'CLIENTS_UPDATED') {
              if (typeof data.clientCount === 'number') {
                setActiveDevicesCount((prev) => Math.max(prev, data.clientCount));
              }
            } else if (data.type === 'NEW_ORDER') {
              setOrders((prev) => {
                if (prev.some((o) => o.id === data.order.id)) {
                  return prev.map((o) => (o.id === data.order.id ? data.order : o));
                }
                return [data.order, ...prev];
              });

              if (currentRoleRef.current === 'kitchen') {
                playKitchenOrderBell();
                setLastNotification({
                  id: String(Date.now()),
                  title: `🔥 New Order #${data.order.orderNumber} (${data.order.tableNumber})`,
                  subtitle: `${data.order.items.length} items punched`,
                  type: 'new',
                });
              }
            } else if (data.type === 'ORDER_UPDATED') {
              setOrders((prev) =>
                prev.map((o) => (o.id === data.order.id ? data.order : o))
              );

              if (data.order.status === 'READY' && currentRoleRef.current === 'server') {
                triggerPhoneVibration([300, 150, 300, 150, 500]);
                playOrderReadyChime();
                setLastNotification({
                  id: String(Date.now()),
                  title: `🛎️ Order #${data.order.orderNumber} Ready for Pickup!`,
                  subtitle: `${data.order.tableNumber} is ready at the pass`,
                  type: 'ready',
                });
              }
            } else if (data.type === 'ORDER_DELETED') {
              setOrders((prev) => prev.filter((o) => o.id !== data.orderId));
            }
          } catch (err) {
            console.error('Failed to parse incoming WS message:', err);
          }
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          clearInterval(pingIntervalRef.current);
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          // Handled via onclose and REST fallback
        };
      } catch {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      }
    }

    // Run initial heartbeat and connect
    sendHeartbeat();
    connectWs();

    // High-frequency 1.5s heartbeat for reliable multi-device sync
    const heartbeatTimer = setInterval(sendHeartbeat, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(heartbeatTimer);
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [sendHeartbeat, processIncomingOrders]);

  // Create Order
  const createOrder = useCallback(
    async (payload: Omit<OrderTicket, 'orderNumber' | 'createdAt' | 'updatedAt' | 'status'>) => {
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

  // Update status (e.g. READY, SERVED)
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
    }

    // 2. Also send REST PATCH to persist immediately
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

  // Update item status
  const updateItemStatus = useCallback(
    async (orderId: string, itemId: string, itemStatus: 'PENDING' | 'DONE') => {
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order;
          const updatedItems = order.items.map((item) =>
            item.id === itemId ? { ...item, status: itemStatus } : item
          );
          return { ...order, items: updatedItems };
        })
      );

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        const msg: WebSocketClientMessage = {
          type: 'CHANGE_ITEM_STATUS',
          payload: { orderId, itemId, itemStatus },
        };
        socketRef.current.send(JSON.stringify(msg));
      }

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

  // Reset orders
  const resetOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    presenceSummary,
    lastNotification,
    dismissNotification: () => setLastNotification(null),
    createOrder,
    updateOrderStatus,
    updateItemStatus,
    resetOrders,
  };
}
