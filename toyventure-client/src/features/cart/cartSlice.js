import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cartItems: sessionStorage.getItem('cartItems') ? JSON.parse(sessionStorage.getItem('cartItems')) : [],
  // Remember the product if they aren't logged in
  pendingItem: sessionStorage.getItem('pendingItem') ? JSON.parse(sessionStorage.getItem('pendingItem')) : null, 
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.cartItems.find((x) => x._id === item._id && x.variant === item.variant);

      if (existingItem) {
        existingItem.qty += item.qty; 
      } else {
        state.cartItems.push(item);
      }
      
      sessionStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    updateQuantity: (state, action) => {
      const { id, variant, qty } = action.payload;
      const item = state.cartItems.find((x) => x._id === id && x.variant === variant);
      if (item) {
        item.qty = qty;
      }
      sessionStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    removeFromCart: (state, action) => {
      const { id, variant } = action.payload;
      state.cartItems = state.cartItems.filter((x) => !(x._id === id && x.variant === variant));
      sessionStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    clearCart: (state) => {
      state.cartItems = [];
      sessionStorage.removeItem('cartItems');
    },
    setCart: (state, action) => {
      state.cartItems = action.payload;
      sessionStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    // NEW REDUCERS FOR PENDING ITEMS
    setPendingItem: (state, action) => {
      state.pendingItem = action.payload;
      sessionStorage.setItem('pendingItem', JSON.stringify(action.payload));
    },
    clearPendingItem: (state) => {
      state.pendingItem = null;
      sessionStorage.removeItem('pendingItem');
    }
  },
});

export const { addToCart, updateQuantity, removeFromCart, clearCart, setCart, setPendingItem, clearPendingItem } = cartSlice.actions;
export default cartSlice.reducer;