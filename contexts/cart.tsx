import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react";

export interface CartItem {
  product_id: number;
  name: string;
  image?: string;
  size: "Small" | "Medium" | "Large";
  price: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (product_id: number, size: string) => void;
  updateQuantity: (product_id: number, size: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product_id === newItem.product_id && i.size === newItem.size);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + newItem.quantity };
        return updated;
      }
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((product_id: number, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.product_id === product_id && i.size === size)));
  }, []);

  const updateQuantity = useCallback((product_id: number, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(product_id, size);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product_id === product_id && i.size === size ? { ...i, quantity } : i))
    );
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);

  const value = useMemo(() => ({
    items,
    totalItems,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }), [items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
