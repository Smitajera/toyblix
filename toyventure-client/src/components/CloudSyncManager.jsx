import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useGetUserProfileQuery, useUpdateUserProfileMutation } from '../features/api/apiSlice';
import { setCart } from '../features/cart/cartSlice';
import { setWishlist } from '../features/wishlist/wishlistSlice';

const CloudSyncManager = () => {
  const dispatch = useDispatch();
  const token = sessionStorage.getItem('token');
  
  const cartItems = useSelector(state => state.cart.cartItems);
  const wishlistItems = useSelector(state => state.wishlist.wishlistItems);
  
  const { data: profile, isSuccess } = useGetUserProfileQuery(undefined, { skip: !token });
  const [updateProfile] = useUpdateUserProfileMutation();
  
  const hasHydrated = useRef(false);

  // 1. HYDRATE: On load/login, merge cloud data into local state
  useEffect(() => {
    if (token && isSuccess && profile && !hasHydrated.current) {
      
      const mergedCart = [...cartItems];
      profile.cart?.forEach(cloudItem => {
        if (!mergedCart.find(i => i._id === cloudItem._id)) mergedCart.push(cloudItem);
      });
      dispatch(setCart(mergedCart));

      const mergedWishlist = [...wishlistItems];
      profile.wishlist?.forEach(cloudItem => {
        if (!mergedWishlist.find(i => i._id === cloudItem._id)) mergedWishlist.push(cloudItem);
      });
      dispatch(setWishlist(mergedWishlist));

      hasHydrated.current = true;
    }
  }, [isSuccess, profile, dispatch, token, cartItems, wishlistItems]);

  // 2. SYNC: Automatically upload local cart/wishlist changes back to cloud
  useEffect(() => {
    if (token && hasHydrated.current) {
      const timeoutId = setTimeout(() => {
        updateProfile({ cart: cartItems, wishlist: wishlistItems });
      }, 1500); // 1.5s delay to batch rapid changes (like fast clicking)
      
      return () => clearTimeout(timeoutId);
    }
  }, [cartItems, wishlistItems, token, updateProfile]);

  // Reset hydrator if user logs out
  useEffect(() => {
    if (!token) {
      hasHydrated.current = false;
    }
  }, [token]);

  return null; // Invisible component
};

export default CloudSyncManager;