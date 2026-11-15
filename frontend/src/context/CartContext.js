import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, rupees } from '../services/api';
import { useAuth } from './AuthContext';
import { useRealtime } from '../services/realtime';

const CartContext = createContext();

const mapCart = (data) =>
  (data?.items || []).map((i) => ({
    id: i.id,
    productId: i.productId,
    variantId: i.variantId,
    name: i.productName,
    packSize: i.packSize,
    price: rupees(i.pricePaise),
    quantity: i.quantity,
    stock: i.stockAvailable,
    image: api.resolveImage(i.imageUrl),
  }));

export const CartProvider = ({ children }) => {
  const { token, isFarmer } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [cartError, setCartError] = useState(null);

  const refreshCart = useCallback(async () => {
    if (!token) {
      setCartItems([]);
      return;
    }
    try {
      setCartItems(mapCart(await api.getCart()));
      setCartError(null);
    } catch (e) {
      setCartError(e.message);
    }
  }, [token]);

  useEffect(() => {
    if (isFarmer) refreshCart();
  }, [isFarmer, refreshCart]);

  // Keep stock figures in the cart live
  useRealtime('stock:updated', ({ variantId, stock }) => {
    setCartItems((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, stock } : i)));
  });

  const addToCart = async (product, quantity = 1) => {
    try {
      if (!product.variantId) throw new Error('This product is not available right now');
      await api.addCartItem(product.variantId, quantity);
      await refreshCart();
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    const item = cartItems.find((i) => i.productId === productId || i.variantId === productId);
    if (!item) return;
    if (newQuantity <= 0) return removeFromCart(productId);
    setCartItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQuantity } : i)));
    try {
      await api.updateCartItem(item.id, newQuantity);
    } finally {
      await refreshCart();
    }
  };

  const removeFromCart = async (productId) => {
    const item = cartItems.find((i) => i.productId === productId || i.variantId === productId);
    if (!item) return;
    setCartItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await api.removeCartItem(item.id);
    } finally {
      await refreshCart();
    }
  };

  // Server clears the cart when an order is placed
  const clearCart = () => refreshCart();

  const itemsTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = itemsTotal >= 999 || itemsTotal === 0 ? 0 : 49;
  const grandTotal = itemsTotal + deliveryFee;
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartError,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        itemsTotal,
        deliveryFee,
        grandTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
