import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchCart } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const getCartCount = (items = []) => (
  items.reduce((total, item) => total + Number(item.quantity || 0), 0)
);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadCart();
    } else {
      setCart(null);
      setCartCount(0);
    }
  }, [user]);

  const loadCart = async () => {
    try {
      const data = await fetchCart();
      setCart(data);
      setCartCount(getCartCount(data?.items));
    } catch (e) {
      console.log('Cart load error', e);
    }
  };

  const refreshCart = async () => {
    await loadCart();
  };

  return (
    <CartContext.Provider value={{ cart, cartCount, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
