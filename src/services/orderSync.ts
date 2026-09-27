import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, OperationType, handleFirestoreError } from './firebase';
import { OrderTicket, OrderStatus, PresenceSummary, PresenceDevice } from '../types/restaurant';
import { playKitchenOrderBell, playOrderReadyChime, triggerPhoneVibration } from './soundEffects';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'device-init';
  let id = localStorage.getItem('moonshine_device_id');
  if (!id) {
    id = `dev_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('moonshine_device_id', id);
  }
  return id;
}

export function useOrderSync(currentRole: 'server' | 'kitchen', currentUser: User | null) {
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

  const isInitialLoadRef = useRef(true);
  const currentRoleRef = useRef(currentRole);
  currentRoleRef.current = currentRole;

  const deviceIdRef = useRef<string>(getDeviceId());

  // Auto-dismiss banner notifications
  useEffect(() => {
    if (!lastNotification) return;
    const timer = setTimeout(() => {
      setLastNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastNotification]);

  // Real-time Firestore sync for orders
  useEffect(() => {
    if (!currentUser) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    const pathForOrders = 'orders';
    const ordersQuery = query(collection(db, pathForOrders), orderBy('orderNumber', 'desc'));

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setConnectionStatus('connected');
        const loadedOrders: OrderTicket[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OrderTicket;
          loadedOrders.push({
            ...data,
            id: docSnap.id,
          });
        });

        setOrders((prev) => {
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            return loadedOrders;
          }

          // 1. Kitchen Alert: Did a new order arrive?
          if (currentRoleRef.current === 'kitchen') {
            const newlyAdded = loadedOrders.find(
              (newO) => !prev.some((oldO) => oldO.id === newO.id) && newO.status !== 'CANCELLED'
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

          // 2. Server Alert: Did an order become READY at pass?
          if (currentRoleRef.current === 'server') {
            const newlyReady = loadedOrders.find(
              (newO) =>
                newO.status === 'READY' &&
                !prev.some((oldO) => oldO.id === newO.id && oldO.status === 'READY')
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

          return loadedOrders;
        });
      },
      (error) => {
        setConnectionStatus('disconnected');
        handleFirestoreError(error, OperationType.LIST, pathForOrders);
      }
    );

    return () => {
      unsubscribeOrders();
    };
  }, [currentUser]);

  // Real-time Presence Beacon via Firestore
  useEffect(() => {
    if (!currentUser) return;

    const deviceId = deviceIdRef.current;
    const presencePath = `presence/${deviceId}`;

    // Publish heartbeat every 5 seconds
    const publishHeartbeat = async () => {
      try {
        await setDoc(doc(db, 'presence', deviceId), {
          deviceId,
          uid: currentUser.uid,
          role: currentRole,
          displayName: currentUser.displayName || (currentRole === 'kitchen' ? 'Kitchen Screen' : 'Server Phone'),
          email: currentUser.email || '',
          lastSeen: Date.now(),
        });
      } catch (err) {
        console.warn('Presence beacon heartbeat failed:', err);
      }
    };

    publishHeartbeat();
    const interval = setInterval(publishHeartbeat, 5000);

    // Listen to all active presence beacons
    const unsubscribePresence = onSnapshot(
      collection(db, 'presence'),
      (snapshot) => {
        const now = Date.now();
        const activeList: PresenceDevice[] = [];
        let kitchens = 0;
        let servers = 0;

        snapshot.forEach((d) => {
          const data = d.data();
          // Active if seen in last 15 seconds
          if (data && now - (data.lastSeen || 0) < 15000) {
            if (data.role === 'kitchen') kitchens++;
            if (data.role === 'server') servers++;
            activeList.push({
              id: data.deviceId || d.id,
              role: data.role || 'server',
              name: data.displayName || data.email || 'Staff Device',
              lastSeenSecondsAgo: Math.max(0, Math.round((now - (data.lastSeen || 0)) / 1000)),
            });
          }
        });

        const total = Math.max(1, activeList.length);
        setActiveDevicesCount(total);
        setPresenceSummary({
          total,
          serversCount: servers,
          kitchensCount: kitchens,
          devices: activeList,
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'presence');
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribePresence();
      // Remove presence doc on cleanup
      deleteDoc(doc(db, 'presence', deviceId)).catch(() => {});
    };
  }, [currentUser, currentRole]);

  // Create Order in Firestore
  const createOrder = useCallback(
    async (payload: Omit<OrderTicket, 'orderNumber' | 'createdAt' | 'updatedAt' | 'status'>) => {
      if (!currentUser) return;
      const orderId = payload.id || `ord-${Date.now()}`;
      const pathForWrite = `orders/${orderId}`;

      // Calculate next sequential order number
      const existingMax = orders.reduce((max, o) => Math.max(max, o.orderNumber || 0), 100);
      const orderNumber = existingMax + 1;
      const now = new Date().toISOString();

      const newTicket: OrderTicket = {
        id: orderId,
        orderNumber,
        tableNumber: payload.tableNumber,
        floor: payload.floor || 'Main Floor',
        serverName: payload.serverName || currentUser.displayName || 'Server',
        orderNotes: payload.orderNotes || '',
        items: payload.items,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'orders', orderId), newTicket);
        return newTicket;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, pathForWrite);
      }
    },
    [currentUser, orders]
  );

  // Update order status (e.g. READY, SERVED)
  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (!currentUser) return;
      const pathForUpdate = `orders/${orderId}`;
      const now = new Date().toISOString();

      const updateData: Record<string, any> = {
        status,
        updatedAt: now,
      };

      if (status === 'PREPARING') updateData.preparingAt = now;
      if (status === 'READY') updateData.readyAt = now;
      if (status === 'SERVED') {
        updateData.servedAt = now;
        // Also mark all items DONE
        const currentOrder = orders.find((o) => o.id === orderId);
        if (currentOrder) {
          updateData.items = currentOrder.items.map((i) => ({ ...i, status: 'DONE' }));
        }
      }

      try {
        await updateDoc(doc(db, 'orders', orderId), updateData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathForUpdate);
      }
    },
    [currentUser, orders]
  );

  // Update item status within an order
  const updateItemStatus = useCallback(
    async (orderId: string, itemId: string, itemStatus: 'PENDING' | 'DONE') => {
      if (!currentUser) return;
      const pathForUpdate = `orders/${orderId}`;
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      const updatedItems = target.items.map((item) =>
        item.id === itemId ? { ...item, status: itemStatus } : item
      );

      const allDone = updatedItems.every((i) => i.status === 'DONE');
      const now = new Date().toISOString();

      const updateData: Record<string, any> = {
        items: updatedItems,
        updatedAt: now,
      };

      if (allDone && target.status === 'PENDING') {
        updateData.status = 'READY';
        updateData.readyAt = now;
      }

      try {
        await updateDoc(doc(db, 'orders', orderId), updateData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathForUpdate);
      }
    },
    [currentUser, orders]
  );

  // Clear/Reset all active tickets in Firestore
  const resetOrders = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      setOrders([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'orders');
    }
  }, [currentUser]);

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
