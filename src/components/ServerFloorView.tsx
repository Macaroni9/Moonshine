import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Send,
  MessageSquare,
  CheckCircle2,
  Search,
  ArrowRight,
  X,
  ShoppingBag,
  ChevronDown,
  Bell
} from 'lucide-react';
import { MENU_ITEMS, RESTAURANT_INFO } from '../data/menu';
import { MenuItem, OrderItem, OrderTicket, OrderStatus } from '../types/restaurant';
import { playPunchSuccessSound } from '../services/soundEffects';

interface ServerFloorViewProps {
  orders: OrderTicket[];
  onCreateOrder: (payload: Omit<OrderTicket, 'orderNumber' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

interface CartItem extends OrderItem {
  popularModifiers: string[];
}

export const ServerFloorView: React.FC<ServerFloorViewProps> = ({
  orders,
  onCreateOrder,
  onUpdateStatus,
}) => {
  // Server state: Only Table selection (no floor button, we have 1 floor)
  const [selectedTable, setSelectedTable] = useState<string>('Table 1');
  const [ticketNotes, setTicketNotes] = useState<string>('');

  // Cart / Working Ticket
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ONLY TWO TABS for Server: "punch" (Punch Ticket) and "ready" (Order Ticket Ready Alert)
  const [activeTab, setActiveTab] = useState<'punch' | 'ready'>('punch');

  // Mobile Bottom Drawer for Cart Review
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState<boolean>(false);

  // Dish Pop-up Window for Notes & Quantity
  const [selectedDishForNotes, setSelectedDishForNotes] = useState<MenuItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [modalNotes, setModalNotes] = useState<string>('');

  // Success Feedback
  const [justPunchedInfo, setJustPunchedInfo] = useState<{ table: string; count: number } | null>(null);

  // Categories
  const categories = ['All', 'Starters', 'Paninis & Subs', 'Desserts'];

  const filteredMenuItems = MENU_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Tap dish -> Opens pop-up window
  const handleDishCardClick = (dish: MenuItem) => {
    setSelectedDishForNotes(dish);
    setModalQuantity(1);
    setModalNotes('');
  };

  // Add dish to ticket
  const handleConfirmAddDishToTicket = () => {
    if (!selectedDishForNotes) return;

    const newItem: CartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      menuItemId: selectedDishForNotes.id,
      name: selectedDishForNotes.name,
      category: selectedDishForNotes.category,
      quantity: Math.max(1, modalQuantity),
      comments: modalNotes.trim(),
      isVegetarian: selectedDishForNotes.isVegetarian,
      status: 'PENDING',
      popularModifiers: selectedDishForNotes.popularModifiers,
    };

    setCart((prev) => [...prev, newItem]);
    setSelectedDishForNotes(null);
  };

  const updateQuantityInCart = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Send Order Directly to Kitchen
  const handleSendOrderDirectly = () => {
    if (cart.length === 0) return;

    playPunchSuccessSound();

    const orderPayload = {
      id: `ord-${Date.now()}`,
      tableNumber: selectedTable,
      floor: 'Main Floor',
      serverName: 'Server',
      orderNotes: ticketNotes.trim(),
      items: cart.map(({ popularModifiers, ...rest }) => rest),
    };

    onCreateOrder(orderPayload);

    setJustPunchedInfo({
      table: selectedTable,
      count: totalItemCount,
    });

    setShowMobileCartDrawer(false);
    setCart([]);
    setTicketNotes('');

    // Auto-dismiss feedback in 4 seconds
    setTimeout(() => {
      setJustPunchedInfo(null);
    }, 4000);
  };

  // Filter ready orders for pickup
  const readyOrders = orders.filter((o) => o.status === 'READY');

  return (
    <div className="min-h-[calc(100vh-115px)] sm:min-h-[calc(100vh-65px)] bg-[#0C0E12] text-stone-100 flex flex-col pb-24 lg:pb-6">
      
      {/* Top Bar: Table Selection & Server 2-Button Switcher */}
      <div className="bg-[#14161E] border-b border-stone-800/80 px-3 sm:px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
          
          <div className="flex items-center justify-between gap-2">
            
            {/* Table Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Table:
              </span>
              <div className="relative">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="bg-stone-900 border border-amber-600/70 rounded-xl px-3 py-1.5 text-xs font-black text-amber-300 focus:outline-none cursor-pointer pr-7 shadow-xs appearance-none"
                >
                  {RESTAURANT_INFO.tables.map((table) => (
                    <option key={table} value={table} className="bg-stone-900 text-white">
                      {table}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* ONLY TWO BUTTONS FOR SERVER: "Punch Ticket" & "Ready for Pickup Alert" */}
            <div className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800 shrink-0">
              <button
                onClick={() => setActiveTab('punch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'punch'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Punch Ticket {totalItemCount > 0 && `(${totalItemCount})`}
              </button>

              <button
                onClick={() => setActiveTab('ready')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'ready'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : readyOrders.length > 0
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Bell className={`w-3.5 h-3.5 ${readyOrders.length > 0 ? 'animate-bounce' : ''}`} />
                <span>Ready for Pickup</span>
                {readyOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[10px] font-black animate-pulse">
                    {readyOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Table Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {RESTAURANT_INFO.tables.slice(0, 12).map((tbl) => (
              <button
                key={tbl}
                onClick={() => setSelectedTable(tbl)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border ${
                  selectedTable === tbl
                    ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                    : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:text-stone-200'
                }`}
              >
                {tbl}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-5 pt-3">
        
        {/* Simple success confirmation after sending order (NO prompt to check kitchen) */}
        {justPunchedInfo && (
          <div className="mb-3 p-3 bg-emerald-950/95 border border-emerald-500 rounded-xl text-emerald-100 flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-bold">
                Order Sent to Kitchen for {justPunchedInfo.table}!
              </p>
            </div>
            <button
              onClick={() => setJustPunchedInfo(null)}
              className="text-emerald-300 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BUTTON 1 VIEW: PUNCH TICKET MENU */}
        {activeTab === 'punch' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Column: Menu Items */}
            <div className="lg:col-span-7 space-y-3">
              
              {/* Category Pills & Search */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                        selectedCategory === cat
                          ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Menu Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {filteredMenuItems.map((item) => {
                  const itemsInCart = cart.filter((c) => c.menuItemId === item.id);
                  const totalCountInCart = itemsInCart.reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleDishCardClick(item)}
                      className={`group active:scale-[0.99] cursor-pointer p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                        totalCountInCart > 0
                          ? 'bg-stone-900/95 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-stone-900/60 border-stone-800/90 hover:border-amber-500/40 hover:bg-stone-900/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-stone-100 group-hover:text-amber-200 transition">
                              {item.name}
                            </h3>
                            {item.isVegetarian && (
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                V
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] sm:text-xs text-stone-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-stone-800/70 flex items-center justify-between">
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                          {item.category}
                        </span>

                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-600/50 px-2.5 py-1 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                          <MessageSquare className="w-3 h-3" />
                          <span>{totalCountInCart > 0 ? `${totalCountInCart} in ticket` : '+ Add with Notes'}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Desktop Cart Tray (Hidden on mobile) */}
            <div className="hidden lg:flex lg:col-span-5 flex-col space-y-4">
              <div className="bg-[#161820] border border-stone-700/70 rounded-2xl p-4 sm:p-5 flex-1 flex flex-col shadow-xl">
                
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                        Order Ticket
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-stone-800 text-amber-200 text-xs font-mono font-bold">
                        {selectedTable}
                      </span>
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-stone-400 hover:text-rose-400 text-xs flex items-center gap-1 transition"
                      title="Clear order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Items in cart list */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5 min-h-[200px] max-h-[420px] pr-1">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
                      <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mb-2 text-stone-400">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-stone-300">Ticket is empty</p>
                      <p className="text-xs text-stone-500 mt-1 max-w-[240px]">
                        Click any dish to pick quantity and add comments for the kitchen.
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-stone-100">
                            {item.name}
                          </span>

                          <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-stone-800">
                            <button
                              onClick={() => updateQuantityInCart(item.id, -1)}
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold font-mono text-amber-300">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantityInCart(item.id, 1)}
                              className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {item.comments && (
                          <div className="p-1.5 rounded-lg bg-amber-950/70 border border-amber-600/50 text-xs text-amber-300 flex items-center justify-between">
                            <span className="truncate max-w-[220px]">
                              ⚠️ {item.comments}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-stone-400 hover:text-rose-400 ml-2"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Table general notes */}
                {cart.length > 0 && (
                  <div className="pt-2 border-t border-stone-800">
                    <label className="text-[11px] font-semibold text-stone-400 block mb-1">
                      Table Notes (Optional):
                    </label>
                    <input
                      type="text"
                      value={ticketNotes}
                      onChange={(e) => setTicketNotes(e.target.value)}
                      placeholder="e.g. rush order, serve starters first..."
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Direct Send Button */}
                <div className="mt-auto pt-3 border-t border-stone-800">
                  <button
                    onClick={handleSendOrderDirectly}
                    disabled={cart.length === 0}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2.5 transition-all ${
                      cart.length > 0
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white cursor-pointer active:scale-[0.98]'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/40'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>SEND ORDER TO KITCHEN</span>
                    {cart.length > 0 && (
                      <span className="ml-1 bg-amber-950/60 px-2 py-0.5 rounded text-xs font-mono font-extrabold text-amber-200">
                        {totalItemCount} Items
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BUTTON 2 VIEW: ORDER TICKET READY ALERT SCREEN */}
        {activeTab === 'ready' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div>
                <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2 font-serif">
                  <Bell className="w-4 h-4 animate-bounce" />
                  <span>Orders Ready for Pickup at the Pass</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Phone vibrates and chimes whenever the kitchen marks an order ready.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('punch')}
                className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Punch Ticket</span>
              </button>
            </div>

            {readyOrders.length === 0 ? (
              <div className="p-12 text-center text-stone-500 bg-stone-900/40 rounded-2xl border border-stone-800">
                <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-stone-300">No Orders Waiting at Pass</p>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  When the kitchen finishes dishes and taps "Order Ready for Pickup", your phone will vibrate and the table will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {readyOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-4 text-stone-100 flex flex-col justify-between shadow-xl"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2 pb-2 border-b border-emerald-800/80">
                        <div>
                          <span className="text-xl font-black text-white font-mono block">
                            {order.tableNumber}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            Ticket #{order.orderNumber}
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-stone-950 animate-pulse">
                          HOT & READY
                        </span>
                      </div>

                      {order.orderNotes && (
                        <div className="p-1.5 rounded bg-black/40 border border-emerald-700/60 text-[11px] text-amber-200 mb-2">
                          ⚠️ {order.orderNotes}
                        </div>
                      )}

                      <div className="space-y-1 text-xs text-stone-200 mb-3">
                        {order.items.map((i) => (
                          <div key={i.id} className="flex items-start gap-1.5">
                            <span className="font-bold font-mono text-amber-300">
                              {i.quantity}x
                            </span>
                            <div>
                              <span>{i.name}</span>
                              {i.comments && (
                                <p className="text-[10px] text-amber-300 italic">
                                  "{i.comments}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => onUpdateStatus(order.id, 'SERVED')}
                      className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Delivered to Table (Clear)</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE STICKY FLOATING CART BAR */}
      {cart.length > 0 && activeTab === 'punch' && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 z-40 animate-in slide-in-from-bottom-4">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between border border-amber-500/50">
            <div
              onClick={() => setShowMobileCartDrawer(true)}
              className="flex items-center gap-2.5 cursor-pointer flex-1"
            >
              <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center font-mono font-black text-sm">
                {totalItemCount}
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  {selectedTable} Order
                </p>
                <p className="text-[11px] text-amber-200">
                  {cart.length} dish{cart.length > 1 ? 'es' : ''} staged
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMobileCartDrawer(true)}
              className="bg-stone-950 text-amber-300 px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 active:scale-95 transition"
            >
              <span>Review Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE SLIDE-UP CART DRAWER */}
      {showMobileCartDrawer && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-[#181A22] border-t border-stone-700 rounded-t-3xl max-h-[85vh] flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            
            {/* Drawer Handle & Header */}
            <div className="flex flex-col items-center mb-2">
              <div className="w-12 h-1.5 bg-stone-700 rounded-full mb-3" />
              <div className="w-full flex items-center justify-between pb-2 border-b border-stone-800">
                <div>
                  <h3 className="text-base font-bold text-amber-200 font-serif">
                    {selectedTable} Order
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {totalItemCount} items staged
                  </p>
                </div>
                <button
                  onClick={() => setShowMobileCartDrawer(false)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-stone-100">{item.name}</span>

                    <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-stone-800">
                      <button
                        onClick={() => updateQuantityInCart(item.id, -1)}
                        className="w-7 h-7 rounded bg-stone-800 flex items-center justify-center text-stone-300 font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-mono font-bold text-amber-300">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantityInCart(item.id, 1)}
                        className="w-7 h-7 rounded bg-stone-800 flex items-center justify-center text-stone-300 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.comments && (
                    <div className="p-1.5 rounded bg-amber-950/70 border border-amber-600/50 text-xs text-amber-300 flex items-center justify-between">
                      <span className="truncate max-w-[240px]">⚠️ {item.comments}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-stone-400 hover:text-rose-400 ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Table notes */}
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-stone-400 block mb-1">
                  Table Notes (Optional):
                </label>
                <input
                  type="text"
                  value={ticketNotes}
                  onChange={(e) => setTicketNotes(e.target.value)}
                  placeholder="e.g. rush order, serve starters first..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Direct Send button */}
            <div className="pt-3 border-t border-stone-800">
              <button
                onClick={handleSendOrderDirectly}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition"
              >
                <Send className="w-4 h-4" />
                <span>SEND ORDER TO KITCHEN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISH NOTES & QUANTITY POP-UP WINDOW */}
      {selectedDishForNotes && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#1C1F28] border-t sm:border border-stone-700 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 text-stone-100 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-150">
            
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-amber-100 font-serif">
                    {selectedDishForNotes.name}
                  </h3>
                  {selectedDishForNotes.isVegetarian && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      V
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedDishForNotes(null)}
                className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-400 mb-3 leading-relaxed">
              {selectedDishForNotes.description}
            </p>

            {/* Quantity Stepper */}
            <div className="mb-3.5 p-3 bg-stone-900 rounded-2xl border border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wide">
                Quantity:
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center justify-center font-bold text-base active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono text-lg font-black text-amber-300">
                  {modalQuantity}
                </span>
                <button
                  onClick={() => setModalQuantity((q) => q + 1)}
                  className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center justify-center font-bold text-base active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notes / Special Instructions */}
            <div className="mb-3.5">
              <label className="text-xs font-bold text-amber-200 block mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Kitchen Comments / Modifications (Optional):</span>
              </label>
              <textarea
                rows={3}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="e.g. extra crispy, cut in half, sauce on side, allergy..."
                className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />

              {/* Quick suggestion chips */}
              <div className="mt-2">
                <span className="text-[10px] text-stone-400 block mb-1 font-semibold">
                  Quick chips:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDishForNotes.popularModifiers.map((mod) => (
                    <button
                      key={mod}
                      onClick={() =>
                        setModalNotes((prev) => (prev ? `${prev}, ${mod}` : mod))
                      }
                      className="text-[11px] bg-stone-900 hover:bg-amber-950 hover:text-amber-300 hover:border-amber-600/50 text-stone-300 px-2.5 py-1.5 rounded-lg border border-stone-700 transition active:scale-95"
                    >
                      +{mod}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                onClick={() => setSelectedDishForNotes(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddDishToTicket}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md active:scale-95 transition"
              >
                Add to Ticket ({modalQuantity})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
