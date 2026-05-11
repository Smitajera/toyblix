import { createSlice } from '@reduxjs/toolkit';

// Check if there are saved favorites and unseen counts in the browser memory
const initialState = {
  wishlistItems: sessionStorage.getItem('wishlist') 
    ? JSON.parse(sessionStorage.getItem('wishlist')) 
    : [],
  unseenCount: sessionStorage.getItem('wishlistUnseen') 
    ? JSON.parse(sessionStorage.getItem('wishlistUnseen')) 
    : 0,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    toggleFavorite: (state, action) => {
      const product = action.payload;
      const existingIndex = state.wishlistItems.findIndex((item) => item._id === product._id);

      if (existingIndex >= 0) {
        // If it's already favorited, remove it
        state.wishlistItems.splice(existingIndex, 1);
        // Optionally decrement unseen count if they remove an item they haven't "seen" yet
        if (state.unseenCount > 0) state.unseenCount -= 1;
      } else {
        // If it's not favorited, add it and increment the notification badge
        state.wishlistItems.push(product);
        state.unseenCount += 1;
      }

      // Save to browser storage
      sessionStorage.setItem('wishlist', JSON.stringify(state.wishlistItems));
      sessionStorage.setItem('wishlistUnseen', JSON.stringify(state.unseenCount));
    },
    // NEW: Action to mark all favorites as "read"
    markFavoritesSeen: (state) => {
      state.unseenCount = 0;
      sessionStorage.setItem('wishlistUnseen', JSON.stringify(0));
    },
    clearWishlist: (state) => {
      state.wishlistItems = [];
      state.unseenCount = 0;
      sessionStorage.removeItem('wishlist');
      sessionStorage.removeItem('wishlistUnseen');
    },
    // NEW: Cloud Hydration Reducer
    setWishlist: (state, action) => {
      state.wishlistItems = action.payload;
      // We do not overwrite unseen count here so user isn't startled by sudden badges
      sessionStorage.setItem('wishlist', JSON.stringify(state.wishlistItems));
    }
  },
});

export const { toggleFavorite, markFavoritesSeen, clearWishlist, setWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;