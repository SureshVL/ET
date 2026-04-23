import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  size: number;
  quantity: number;
  image: string;
  variantName?: string | null;
  maxStock: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, size: number, variantName?: string | null) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  total: 0,
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (newItem: CartItem) => {
    // Increment addToCarts in Firestore
    const incrementTracking = async () => {
      try {
        const productRef = doc(db, 'products', newItem.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const data = productSnap.data();
          await updateDoc(productRef, {
            addToCarts: (data.addToCarts || 0) + 1
          });
        }
      } catch (e) {
        console.error("Failed to increment addToCarts:", e);
      }
    };
    incrementTracking();

    setItems((prev) => {
      const existing = prev.find(
        (i) => 
          i.productId === newItem.productId && 
          i.size === newItem.size && 
          (i.variantName === newItem.variantName || (!i.variantName && !newItem.variantName))
      );
      if (existing) {
        const newQuantity = existing.quantity + newItem.quantity;
        // Enforce max stock limit
        const finalQuantity = Math.min(Math.max(1, newQuantity), existing.maxStock);
        
        return prev.map((i) =>
          (i.productId === newItem.productId && 
           i.size === newItem.size && 
           (i.variantName === newItem.variantName || (!i.variantName && !newItem.variantName)))
            ? { ...i, quantity: finalQuantity }
            : i
        );
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (productId: string, size: number, variantName?: string | null) => {
    setItems((prev) => prev.filter((i) => !(
      i.productId === productId && 
      i.size === size && 
      (i.variantName === variantName || (!i.variantName && !variantName))
    )));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
