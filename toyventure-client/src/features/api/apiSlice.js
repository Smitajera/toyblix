import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';


const baseQuery = fetchBaseQuery({ 
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = sessionStorage.getItem('token'); 
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Custom base query to implement sessionStorage caching
const customBaseQuery = async (args, api, extraOptions) => {
  const isGet = typeof args === 'string' || (args && (!args.method || args.method.toUpperCase() === 'GET'));
  // We only cache getProducts or other heavy queries to avoid stale order/user data
  const shouldCache = isGet && (api.endpoint === 'getProducts' || api.endpoint === 'getProductById');
  
  if (shouldCache) {
    const url = typeof args === 'string' ? args : args.url;
    const cacheKey = `toyflix_cache_${url}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const now = Date.now();
        // 10-minute cache expiration (TTL)
        if (parsed.expiry && now < parsed.expiry) {
          console.log(`⚡ Returing from SessionStorage Cache: ${url}`);
          return { data: parsed.data };
        } else {
          sessionStorage.removeItem(cacheKey);
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }
  }

  // Hit the actual API
  const result = await baseQuery(args, api, extraOptions);

  // Store successful responses in cache
  if (shouldCache && result.data) {
    const url = typeof args === 'string' ? args : args.url;
    const cacheKey = `toyflix_cache_${url}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: result.data,
      expiry: Date.now() + 10 * 60 * 1000 // 10 mins
    }));
  }

  return result;
};


// Helper to clear stale product cache entries after mutations
const clearProductCache = () => {
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('toyflix_cache_/products')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: customBaseQuery, 
  tagTypes: ['Product', 'Order', 'User', 'Contact', 'Coupon'],
  endpoints: (builder) => ({
    
   getProducts: builder.query({
      // Added 'category' and 'specs' to the arguments
      query: ({ keyword = '', exact = '', tags = '', category = '', specs = '', minPrice = '', maxPrice = '', minRating = '', sort = 'newest', inStock = '', outOfStock = '', isPopular = '', isBestSelling = '', isLimitedEdition = '', isAdmin = '', page = 1, limit = 12 } = {}) => {
        let url = `/products?page=${page}&limit=${limit}`;
        if (keyword) url += `&keyword=${keyword}`;
        if (exact) url += `&exact=${exact}`; 
        if (tags) url += `&tags=${tags}`;
        if (category) url += `&category=${category}`; // FIX: Added missing category filter
        if (specs) url += `&specs=${encodeURIComponent(specs)}`; // NEW: Dynamic Specifications
        
        if (minPrice !== '' && minPrice !== undefined) url += `&minPrice=${minPrice}`;
        if (maxPrice !== '' && maxPrice !== undefined) url += `&maxPrice=${maxPrice}`;
        if (minRating !== '' && minRating !== undefined) url += `&minRating=${minRating}`;
        if (sort) url += `&sort=${sort}`;
        if (inStock) url += `&inStock=${inStock}`;
        if (outOfStock) url += `&outOfStock=${outOfStock}`;
        if (isPopular) url += `&isPopular=${isPopular}`;
        if (isBestSelling) url += `&isBestSelling=${isBestSelling}`;
        if (isLimitedEdition) url += `&isLimitedEdition=${isLimitedEdition}`;
        if (isAdmin) url += `&isAdmin=${isAdmin}`;
        return url;
      },
      providesTags: ['Product'],
    }),

    getProductById: builder.query({ query: (productId) => `/products/${productId}`, providesTags: (result, error, id) => [{ type: 'Product', id }] }),
    createReview: builder.mutation({ query: (data) => ({ url: `/products/${data.productId}/reviews`, method: 'POST', body: data }), invalidatesTags: (result, error, arg) => [{ type: 'Product', id: arg.productId }] }),
    deleteReview: builder.mutation({ query: ({ productId, reviewId }) => ({ url: `/products/${productId}/reviews/${reviewId}`, method: 'DELETE' }), invalidatesTags: (result, error, arg) => [{ type: 'Product', id: arg.productId }, 'Product'] }),
    notifyMeWhenAvailable: builder.mutation({ query: (data) => ({ url: `/products/${data.productId}/notify`, method: 'POST', body: { email: data.email } }) }),
    
    createProduct: builder.mutation({ query: (data) => ({ url: '/products', method: 'POST', body: data }), invalidatesTags: ['Product'], onQueryStarted: async (_, { queryFulfilled }) => { try { await queryFulfilled; clearProductCache(); } catch {} } }),
    updateProduct: builder.mutation({ query: (data) => ({ url: `/products/${data._id}`, method: 'PUT', body: data }), invalidatesTags: ['Product'], onQueryStarted: async (_, { queryFulfilled }) => { try { await queryFulfilled; clearProductCache(); } catch {} } }),
    deleteProduct: builder.mutation({ query: (productId) => ({ url: `/products/${productId}`, method: 'DELETE' }), invalidatesTags: ['Product'], onQueryStarted: async (_, { queryFulfilled }) => { try { await queryFulfilled; clearProductCache(); } catch {} } }),
    
    login: builder.mutation({ query: (data) => ({ url: '/auth/login', method: 'POST', body: data }) }),
    register: builder.mutation({ query: (data) => ({ url: '/auth/register', method: 'POST', body: data }) }),
    sendOtp: builder.mutation({ query: (data) => ({ url: '/auth/send-otp', method: 'POST', body: data }) }),
    verifyOtp: builder.mutation({ query: (data) => ({ url: '/auth/verify-otp', method: 'POST', body: data }) }),
    
    getUserProfile: builder.query({ query: () => '/users/profile', providesTags: ['User'] }),
    updateUserProfile: builder.mutation({ query: (data) => ({ url: '/users/profile', method: 'PUT', body: data }), invalidatesTags: ['User'] }),
    
    getAllUsers: builder.query({ query: () => '/users', providesTags: ['User'] }),
    toggleUserBanStatus: builder.mutation({ query: (id) => ({ url: `/users/${id}/ban`, method: 'PUT' }), invalidatesTags: ['User'] }),
    updateUserRole: builder.mutation({ query: (id) => ({ url: `/users/${id}/role`, method: 'PUT' }), invalidatesTags: ['User'] }),
    requestAdminPromotion: builder.mutation({ query: () => ({ url: '/users/admin/request-promotion', method: 'POST' }) }),
    confirmAdminPromotion: builder.mutation({ query: (data) => ({ url: '/users/admin/confirm-promotion', method: 'POST', body: data }), invalidatesTags: ['User'] }),
    
    createOrder: builder.mutation({ query: ({ idempotencyKey, ...data }) => ({ url: '/orders', method: 'POST', body: data, headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }) }),
    createCodOrder: builder.mutation({ query: ({ idempotencyKey, ...data }) => ({ url: '/orders', method: 'POST', body: data, headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }), invalidatesTags: ['Order', 'User'] }),
    getMyOrders: builder.query({ query: () => '/orders/myorders', providesTags: ['Order'] }),
    
    getAllOrders: builder.query({ query: () => '/orders', providesTags: ['Order'] }),
    updateOrderStatus: builder.mutation({ query: ({ id, status, courierName, trackingLink }) => ({ url: `/orders/${id}/status`, method: 'PUT', body: { status, courierName, trackingLink } }), invalidatesTags: ['Order'] }),
    
    createRazorpayOrder: builder.mutation({ query: ({ idempotencyKey, ...data }) => ({ url: '/payments/razorpay/order', method: 'POST', body: data, headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }) }),
    verifyRazorpayPayment: builder.mutation({ query: (data) => ({ url: '/payments/razorpay/verify', method: 'POST', body: data }), invalidatesTags: ['Order', 'User'] }),
    createDemoOrder: builder.mutation({ query: ({ idempotencyKey, ...data }) => ({ url: '/payments/demo', method: 'POST', body: data, headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }), invalidatesTags: ['Order', 'User'] }),
    processRefund: builder.mutation({ query: (orderId) => ({ url: `/payments/refund/${orderId}`, method: 'POST' }), invalidatesTags: ['Order'] }),
    
    submitContactMessage: builder.mutation({ query: (data) => ({ url: '/contact', method: 'POST', body: data }) }),
    subscribeNewsletter: builder.mutation({ query: (data) => ({ url: '/contact/newsletter', method: 'POST', body: data }) }),
    getAllContactMessages: builder.query({ query: () => '/contact', providesTags: ['Contact'] }),
    
    getAllCoupons: builder.query({ query: () => '/coupons', providesTags: ['Coupon'] }),
    createCoupon: builder.mutation({ query: (data) => ({ url: '/coupons', method: 'POST', body: data }), invalidatesTags: ['Coupon'] }),
    deleteCoupon: builder.mutation({ query: (id) => ({ url: `/coupons/${id}`, method: 'DELETE' }), invalidatesTags: ['Coupon'] }),
    toggleCoupon: builder.mutation({ query: (id) => ({ url: `/coupons/${id}/toggle`, method: 'PUT' }), invalidatesTags: ['Coupon'] }),
    validateCoupon: builder.mutation({ query: (data) => ({ url: '/coupons/validate', method: 'POST', body: data }) }),

  }),
});

export const { 
  useGetProductsQuery, useGetProductByIdQuery, useCreateReviewMutation, useDeleteReviewMutation, useNotifyMeWhenAvailableMutation, 
  useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation,
  useLoginMutation, useRegisterMutation, useSendOtpMutation, useVerifyOtpMutation,
  useGetUserProfileQuery, useUpdateUserProfileMutation,
  useGetAllUsersQuery, useToggleUserBanStatusMutation, useUpdateUserRoleMutation, useRequestAdminPromotionMutation, useConfirmAdminPromotionMutation, 
  useCreateOrderMutation, useCreateCodOrderMutation, useGetMyOrdersQuery, useGetAllOrdersQuery, useUpdateOrderStatusMutation,
  useCreateRazorpayOrderMutation, useVerifyRazorpayPaymentMutation, useCreateDemoOrderMutation, useProcessRefundMutation,
  useSubmitContactMessageMutation, useGetAllContactMessagesQuery, useSubscribeNewsletterMutation,
  useGetAllCouponsQuery, useCreateCouponMutation, useDeleteCouponMutation, useToggleCouponMutation, useValidateCouponMutation,
} = apiSlice;
