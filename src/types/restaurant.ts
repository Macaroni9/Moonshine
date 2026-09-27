export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export type MenuCategory = 'Starters' | 'Paninis & Subs' | 'Desserts';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  isVegetarian?: boolean;
  popularModifiers: string[];
}

export interface OrderItem {
  id: string; // unique ID for this item instance in order
  menuItemId: string;
  name: string;
  category: MenuCategory;
  quantity: number;
  comments?: string;
  isVegetarian?: boolean;
  status: 'PENDING' | 'DONE'; // individual item bump in kitchen
}

export interface OrderTicket {
  id: string;
  orderNumber: number; // e.g. 101, 102
  tableNumber: string; // e.g. "Table 1/1", "Bar 14"
  floor: string; // "1st Floor", "2nd Floor", "Patio", "Bar Counter"
  serverName: string; // e.g. "Marco (1st Fl)"
  orderNotes?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  preparingAt?: string;
  readyAt?: string;
  servedAt?: string;
}

export interface PresenceDevice {
  id: string;
  role: 'server' | 'kitchen';
  name: string;
  lastSeenSecondsAgo: number;
}

export interface PresenceSummary {
  total: number;
  serversCount: number;
  kitchensCount: number;
  devices: PresenceDevice[];
}

export type WebSocketClientMessage =
  | { type: 'CREATE_ORDER'; payload: Omit<OrderTicket, 'orderNumber' | 'createdAt' | 'updatedAt' | 'status'> }
  | { type: 'CHANGE_STATUS'; payload: { orderId: string; status: OrderStatus } }
  | { type: 'CHANGE_ITEM_STATUS'; payload: { orderId: string; itemId: string; itemStatus: 'PENDING' | 'DONE' } }
  | { type: 'HEARTBEAT'; payload: { deviceId: string; role: 'server' | 'kitchen'; deviceName: string } }
  | { type: 'PING' };

export type WebSocketServerMessage =
  | { type: 'INIT'; orders: OrderTicket[]; serverTime: string; clientCount: number; presence?: PresenceSummary }
  | { type: 'NEW_ORDER'; order: OrderTicket }
  | { type: 'ORDER_UPDATED'; order: OrderTicket }
  | { type: 'ORDER_DELETED'; orderId: string }
  | { type: 'CLIENTS_UPDATED'; clientCount: number }
  | { type: 'PRESENCE_UPDATED'; presence: PresenceSummary }
  | { type: 'PONG' };
