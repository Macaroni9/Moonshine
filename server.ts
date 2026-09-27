import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProd = process.env.NODE_ENV === 'production';

// Types duplicated here for server autonomy
type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  category: 'Starters' | 'Paninis & Subs' | 'Desserts';
  quantity: number;
  comments?: string;
  isVegetarian?: boolean;
  status: 'PENDING' | 'DONE';
}

interface OrderTicket {
  id: string;
  orderNumber: number;
  tableNumber: string;
  floor: string;
  serverName: string;
  orderNotes?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  preparingAt?: string;
  readyAt?: string;
  servedAt?: string;
}

interface ConnectedDevice {
  deviceId: string;
  role: 'server' | 'kitchen';
  deviceName: string;
  lastSeen: number;
  ip?: string;
  transport?: 'ws' | 'http';
}

function getLocalNetworkAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

let nextOrderSeq = 101;

// Clean slate: no confusing dummy/sample orders by default
let orders: OrderTicket[] = [];

// Registry of devices seen active in last 8 seconds
const activeDevices = new Map<string, ConnectedDevice>();

function getActiveDevicesSummary() {
  const now = Date.now();
  // Purge any device inactive for > 8 seconds
  for (const [id, dev] of activeDevices.entries()) {
    if (now - dev.lastSeen > 8000) {
      activeDevices.delete(id);
    }
  }

  const list = Array.from(activeDevices.values());
  const servers = list.filter((d) => d.role === 'server');
  const kitchens = list.filter((d) => d.role === 'kitchen');

  return {
    total: list.length,
    serversCount: servers.length,
    kitchensCount: kitchens.length,
    devices: list.map((d) => ({
      id: d.deviceId,
      role: d.role,
      name: d.deviceName,
      lastSeenSecondsAgo: Math.max(0, Math.round((now - d.lastSeen) / 1000)),
    })),
  };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Permissive CORS for multiple devices across local WiFi
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // WebSocket Server setup
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcast(data: unknown) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch (err) {
          console.error('Failed to send to client', err);
        }
      }
    });
  }

  function broadcastPresence() {
    broadcast({
      type: 'PRESENCE_UPDATED',
      presence: getActiveDevicesSummary(),
    });
  }

  wss.on('connection', (ws: WebSocket) => {
    const count = Array.from(wss.clients).filter((c) => c.readyState === WebSocket.OPEN).length;

    // Send full current orders & presence on connect
    const initMessage = {
      type: 'INIT',
      orders,
      serverTime: new Date().toISOString(),
      clientCount: count,
      presence: getActiveDevicesSummary(),
    };
    ws.send(JSON.stringify(initMessage));

    ws.on('close', () => {
      broadcastPresence();
    });

    ws.on('message', (messageRaw: string) => {
      try {
        const msg = JSON.parse(messageRaw.toString());
        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
          return;
        }

        if (msg.type === 'HEARTBEAT' && msg.payload) {
          const { deviceId, role, deviceName } = msg.payload;
          if (deviceId) {
            activeDevices.set(deviceId, {
              deviceId,
              role: role || 'server',
              deviceName: deviceName || 'Device',
              lastSeen: Date.now(),
              transport: 'ws',
            });
            broadcastPresence();
          }
          return;
        }

        if (msg.type === 'CREATE_ORDER') {
          const payload = msg.payload;
          const newOrder = createOrderFromPayload(payload);
          broadcast({ type: 'NEW_ORDER', order: newOrder });
        } else if (msg.type === 'CHANGE_STATUS') {
          const { orderId, status } = msg.payload;
          const updated = updateOrderStatus(orderId, status);
          if (updated) {
            broadcast({ type: 'ORDER_UPDATED', order: updated });
          }
        } else if (msg.type === 'CHANGE_ITEM_STATUS') {
          const { orderId, itemId, itemStatus } = msg.payload;
          const updated = updateOrderItemStatus(orderId, itemId, itemStatus);
          if (updated) {
            broadcast({ type: 'ORDER_UPDATED', order: updated });
          }
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });
  });

  // Business logic helpers
  function createOrderFromPayload(payload: any): OrderTicket {
    // 1. Deduplication guard: if an order with this client-side id already exists, return it
    if (payload.id) {
      const existing = orders.find((o) => o.id === payload.id);
      if (existing) return existing;
    }

    // 2. Secondary deduplication guard: if same table created an identical order in last 3 seconds
    const recentDuplicate = orders.find(
      (o) =>
        o.tableNumber === payload.tableNumber &&
        Date.now() - new Date(o.createdAt).getTime() < 3000 &&
        o.items.length === (payload.items || []).length
    );
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const now = new Date().toISOString();
    const orderSeq = nextOrderSeq++;
    const orderId = payload.id || `ord-${orderSeq}`;

    const items: OrderItem[] = (payload.items || []).map((item: any, idx: number) => ({
      id: item.id || `item-${orderSeq}-${idx + 1}`,
      menuItemId: item.menuItemId,
      name: item.name,
      category: item.category,
      quantity: Math.max(1, Number(item.quantity) || 1),
      comments: (item.comments || '').trim(),
      isVegetarian: Boolean(item.isVegetarian),
      status: 'PENDING',
    }));

    const newTicket: OrderTicket = {
      id: orderId,
      orderNumber: orderSeq,
      tableNumber: payload.tableNumber || 'Table 1',
      floor: payload.floor || '1st Floor',
      serverName: payload.serverName || 'Server (1st Fl)',
      orderNotes: (payload.orderNotes || '').trim(),
      items,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    orders.unshift(newTicket);
    return newTicket;
  }

  function updateOrderStatus(orderId: string, status: OrderStatus): OrderTicket | null {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const now = new Date().toISOString();
    order.status = status;
    order.updatedAt = now;

    if (status === 'PREPARING' && !order.preparingAt) {
      order.preparingAt = now;
    } else if (status === 'READY') {
      order.readyAt = now;
    } else if (status === 'SERVED') {
      order.servedAt = now;
      // Also mark all items as DONE if ticket is completed
      order.items.forEach((item) => {
        item.status = 'DONE';
      });
    }

    return order;
  }

  function updateOrderItemStatus(
    orderId: string,
    itemId: string,
    itemStatus: 'PENDING' | 'DONE'
  ): OrderTicket | null {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const item = order.items.find((i) => i.id === itemId);
    if (!item) return null;

    item.status = itemStatus;
    order.updatedAt = new Date().toISOString();

    // Auto-progress order if all items done
    const allDone = order.items.every((i) => i.status === 'DONE');
    if (allDone && order.status === 'PENDING') {
      order.status = 'READY';
      order.readyAt = new Date().toISOString();
    }

    return order;
  }

  // REST API Routes
  app.get('/api/orders', (req: Request, res: Response) => {
    res.json({
      success: true,
      orders,
      serverTime: new Date().toISOString(),
      presence: getActiveDevicesSummary(),
    });
  });

  // Real-time device heartbeat (Works across local network & cloud without WS dependency)
  app.post('/api/presence/heartbeat', (req: Request, res: Response) => {
    const { deviceId, role, deviceName } = req.body || {};
    if (deviceId) {
      activeDevices.set(deviceId, {
        deviceId,
        role: role || 'server',
        deviceName: deviceName || (role === 'kitchen' ? 'Kitchen Display' : 'Server Phone'),
        lastSeen: Date.now(),
        ip: req.ip || req.socket.remoteAddress,
        transport: 'http',
      });
      broadcastPresence();
    }

    res.json({
      success: true,
      presence: getActiveDevicesSummary(),
      orders,
      serverTime: new Date().toISOString(),
    });
  });

  // Local Network discovery info for connecting multiple servers & kitchen on same WiFi
  app.get('/api/network-info', (_req: Request, res: Response) => {
    const ips = getLocalNetworkAddresses();
    res.json({
      success: true,
      port: PORT,
      hostname: os.hostname(),
      localIps: ips,
      localUrls: ips.map((ip) => `http://${ip}:${PORT}`),
    });
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    try {
      const newOrder = createOrderFromPayload(req.body);
      broadcast({ type: 'NEW_ORDER', order: newOrder });
      res.status(201).json({ success: true, order: newOrder });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const updated = updateOrderStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    broadcast({ type: 'ORDER_UPDATED', order: updated });
    res.json({ success: true, order: updated });
  });

  app.patch('/api/orders/:id/items/:itemId/status', (req: Request, res: Response) => {
    const { id, itemId } = req.params;
    const { status } = req.body;
    const updated = updateOrderItemStatus(id, itemId, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order or item not found' });
    }
    broadcast({ type: 'ORDER_UPDATED', order: updated });
    res.json({ success: true, order: updated });
  });

  app.post('/api/orders/reset', (req: Request, res: Response) => {
    orders = [];
    nextOrderSeq = 101;

    const count = Array.from(wss.clients).filter((c) => c.readyState === WebSocket.OPEN).length;
    broadcast({
      type: 'INIT',
      orders,
      serverTime: new Date().toISOString(),
      clientCount: count,
    });

    res.json({ success: true, orders: [] });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      connectedClients: wss.clients.size,
      totalOrders: orders.length,
    });
  });

  // Client SPA serving
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Moonshine POS & Kitchen Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
