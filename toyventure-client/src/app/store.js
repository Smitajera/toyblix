import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from '../features/api/apiSlice';
import cartReducer from '../features/cart/cartSlice'; 
import wishlistReducer from '../features/wishlist/wishlistSlice'; // <-- ADD THIS IMPORT

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    cart: cartReducer, 
    wishlist: wishlistReducer, // <-- ADD THIS TO THE REDUCER OBJECT
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});