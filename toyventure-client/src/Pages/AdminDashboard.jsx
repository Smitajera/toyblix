import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import indiaGeoJson from '../assets/india.json';

echarts.registerMap('India', indiaGeoJson);
import ConfirmModal from '../components/ConfirmModal';
import {
  useGetAllOrdersQuery,
  useUpdateOrderStatusMutation,
  useGetAllCouponsQuery,
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useToggleCouponMutation,
  useGetProductsQuery,
  useDeleteReviewMutation,
  useGetAllUsersQuery,
  useToggleUserBanStatusMutation,
  useUpdateUserRoleMutation,
  useRequestAdminPromotionMutation,
  useConfirmAdminPromotionMutation,
  useUpdateItemReturnStatusMutation,
  useProcessRefundMutation
} from '../features/api/apiSlice';

const getFulfillmentMeta = (status) => {
  switch (status) {
    case 'confirmed': return { label: 'Confirmed', className: 'bg-red-50 border-red-100 text-red-700', icon: 'thumb_up' };
    case 'packed': return { label: 'Packed', className: 'bg-red-100 border-red-200 text-red-800', icon: 'inventory_2' };
    case 'dispatched': return { label: 'Dispatched', className: 'bg-red-600 border-red-700 text-white', icon: 'local_shipping' };
    case 'delivered':
    case 'fulfilled': return { label: 'Delivered', className: 'bg-green-50 border-green-200 text-green-700', icon: 'check_circle' }; // Keeping green for success
    default: return { label: 'Processing', className: 'bg-white border-red-50 text-red-950/60', icon: 'hourglass_empty' };
  }
};

const getPaymentMeta = (status) => {
  switch (status) {
    case 'paid': return { label: 'Paid', className: 'bg-green-50 border-green-200 text-green-700', icon: 'check_circle' }; // Keeping green for paid
    case 'failed': return { label: 'Failed', className: 'bg-red-950 border-red-900 text-white', icon: 'error' };
    case 'refunded': return { label: 'Refunded', className: 'bg-red-50 border-red-100 text-red-700', icon: 'replay' };
    default: return { label: 'Pending', className: 'bg-white border-red-100 text-red-600', icon: 'timer' };
  }
};

const resolveImage = (imgPath) => {
  if (!imgPath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const baseUrl = apiBaseUrl.replace('/api', '');
  return `${baseUrl}${imgPath}`;
};

const getOrderItemProductId = (item) => {
  const itemId = item?.product || item?._id;
  return typeof itemId === 'object' ? itemId?._id : itemId;
};

const getNextAction = (orderStatus) => {
  if (!orderStatus || orderStatus === 'paid' || orderStatus === 'created' || orderStatus === 'pending_payment') {
    return { label: 'Mark Confirmed', nextStatus: 'confirmed', bg: 'bg-red-600 hover:bg-red-700 text-white' };
  }
  if (orderStatus === 'confirmed') return { label: 'Mark Packed', nextStatus: 'packed', bg: 'bg-red-700 hover:bg-red-800 text-white' };
  if (orderStatus === 'packed') return { label: 'Mark Dispatched', nextStatus: 'dispatched', bg: 'bg-red-950 hover:bg-black text-white' };
  if (orderStatus === 'dispatched') return { label: 'Mark Delivered', nextStatus: 'delivered', bg: 'bg-green-600 hover:bg-green-700 text-white' };
  return null;
};

const OrderDetailsModal = ({ order, products = [], onClose, onUpdateReturnStatus, isUpdatingReturn }) => {
  React.useEffect(() => {
    if (order) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [order]);

  if (!order) return null;

  const getOrderItemImage = (item) => {
    const productId = getOrderItemProductId(item);
    const matchingProduct = products.find((product) => (
      String(product._id) === String(productId) || product.title === item.title
    ));

    return resolveImage(
      item.image ||
      item.img ||
      item.product?.img ||
      item.product?.images?.[0] ||
      item._id?.img ||
      item._id?.images?.[0] ||
      matchingProduct?.img ||
      matchingProduct?.images?.[0]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md fade-in" style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-red-50 flex items-center justify-between bg-red-50/30">
          <h2 className="text-xl font-black text-red-950 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">receipt_long</span> Order #{String(order._id).slice(-8)}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full transition-colors">
            <span className="material-symbols-outlined text-red-950/40">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50 shadow-sm">
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Customer Details</p>
              <p className="font-bold text-red-950">{order.shippingDetails?.fullName || order.user?.name}</p>
              <p className="text-sm font-medium text-red-950/60 mt-0.5">{order.shippingDetails?.phone || order.user?.mobileNumber}</p>
            </div>
            <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50 shadow-sm">
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Shipping Address</p>
              <p className="font-bold text-red-950 text-sm mt-0.5">{order.shippingDetails?.flatNumber}, {order.shippingDetails?.street}</p>
              {order.shippingDetails?.landmark && <p className="text-sm font-medium text-red-950/60">{order.shippingDetails.landmark}</p>}
              <p className="text-sm font-medium text-red-950/60">{order.shippingDetails?.city} - {order.shippingDetails?.pincode}</p>
            </div>
          </div>

          <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50 shadow-sm">
            <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-2">Payment Info</p>
            <div className="flex items-center gap-4 text-sm font-bold text-red-950 flex-wrap">
              <span className="bg-white px-3 py-1 rounded-md shadow-sm capitalize border border-red-50 text-red-600">{order.paymentMethod || 'Unknown'} Route</span>
              <span className="bg-white px-3 py-1 rounded-md shadow-sm border border-red-50 uppercase tracking-wider text-[10px]">Status: {order.paymentStatus || 'pending'}</span>
              {order.isGiftWrapped && (
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-md shadow-sm font-black text-[10px] flex items-center gap-1 border border-amber-200 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">redeem</span> Gift Wrap!
                </span>
              )}
            </div>
            {order.paymentFailureReason && <p className="text-xs text-red-600 mt-2 font-bold whitespace-pre-wrap">Error: {order.paymentFailureReason}</p>}
          </div>

          <div>
            <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-3">Order Items</p>
            <div className="space-y-3">
              {order.orderItems?.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-red-50 shadow-sm">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-red-50 rounded-xl overflow-hidden shrink-0 border border-red-100">
                      <img src={getOrderItemImage(item)} alt={item.title} className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-red-950 line-clamp-1">{item.title}</h4>
                      {item.variant && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-0.5">{item.variant}</p>}
                      <p className="text-xs text-red-950/60 font-medium mt-1">Qty: {item.qty} x Rs {item.price}</p>
                    </div>
                    <div className="font-black text-red-950">Rs {item.price * item.qty}</div>
                  </div>
                  
                  {item.returnStatus && item.returnStatus !== 'Not Requested' && (
                    <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex flex-col gap-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                          item.returnStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                          item.returnStatus === 'Rejected' ? 'bg-red-200 text-red-800' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {item.returnStatus}
                        </span>
                        {item.returnRequestedAt && <span className="text-[10px] font-bold text-red-950/40">{new Date(item.returnRequestedAt).toLocaleDateString('en-IN')}</span>}
                      </div>
                      <p className="text-xs font-medium text-red-950/70 bg-white p-2 rounded-lg border border-red-50 italic">"{item.returnReason}"</p>
                      
                      {(item.returnStatus === 'Return Requested' || item.returnStatus === 'Exchange Requested') && (
                        <div className="flex gap-2 justify-end mt-1">
                          <button 
                            disabled={isUpdatingReturn}
                            onClick={() => onUpdateReturnStatus(order._id, item._id, 'Rejected')}
                            className="text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button 
                            disabled={isUpdatingReturn}
                            onClick={() => onUpdateReturnStatus(order._id, item._id, 'Approved')}
                            className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-red-100 space-y-1.5 flex flex-col items-end text-sm font-bold text-red-950">
              {order.deliveryFee > 0 && <p className="w-full max-w-[200px] flex justify-between"><span className="text-red-950/50">Delivery Fee:</span> <span>Rs {order.deliveryFee}</span></p>}
              {order.giftWrapFee > 0 && <p className="w-full max-w-[200px] flex justify-between"><span className="text-red-950/50">Gift Wrap Fee:</span> <span>Rs {order.giftWrapFee}</span></p>}
              <p className="w-full max-w-[200px] flex justify-between text-lg pt-1 border-t border-red-50 mt-1"><span className="text-red-950/50 font-black">Total Paid:</span> <span className="font-black text-red-600">Rs {order.totalPrice}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { data: orders, isLoading } = useGetAllOrdersQuery(undefined, { pollingInterval: 5000 });
  const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [updateItemReturnStatus, { isLoading: isUpdatingReturn }] = useUpdateItemReturnStatusMutation();
  const [processRefund, { isLoading: isRefunding }] = useProcessRefundMutation();
  
  const { data: users } = useGetAllUsersQuery();
  const [toggleBanStatus] = useToggleUserBanStatusMutation();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [activeTab, setActiveTab] = useState('analytics');

  // Date Filter State
  const [dateRangeFilter, setDateRangeFilter] = useState('7d'); // '7d', '30d', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Coupon state
  const { data: coupons } = useGetAllCouponsQuery();
  const [createCoupon] = useCreateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();
  const [toggleCoupon] = useToggleCouponMutation();
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '',
  });

  // Secure Admin Promotion State
  const [requestAdminPromotion, { isLoading: isRequestingOtp }] = useRequestAdminPromotionMutation();
  const [confirmAdminPromotion, { isLoading: isConfirmingAdmin }] = useConfirmAdminPromotionMutation();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminStep, setAdminStep] = useState(1);
  const [adminTarget, setAdminTarget] = useState('');
  const [adminOtp, setAdminOtp] = useState('');

  // Review State
  const { data: productsData } = useGetProductsQuery({ limit: 100 });
  const [deleteReview] = useDeleteReviewMutation();

  // Confirm Modal States
  const [confirmOrderStatus, setConfirmOrderStatus] = useState({ isOpen: false, id: null, status: null });
  const [confirmReviewDelete, setConfirmReviewDelete] = useState({ isOpen: false, productId: null, reviewId: null });
  const [confirmCouponDelete, setConfirmCouponDelete] = useState({ isOpen: false, id: null });
  const [confirmUserBan, setConfirmUserBan] = useState({ isOpen: false, id: null, isBanned: false });
  const [confirmUserRole, setConfirmUserRole] = useState({ isOpen: false, id: null, role: null });
  // Return Rejection Modal State
  const [rejectModal, setRejectModal] = useState({ isOpen: false, orderId: null, itemId: null, reason: '' });

  const allReviews = productsData?.products?.reduce((acc, product) => {
    const productReviews = product.reviews.map(r => ({
      ...r,
      productId: product._id,
      productTitle: product.title,
      productImage: product.img
    }));
    return [...acc, ...productReviews];
  }, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await createCoupon(couponForm).unwrap();
      toast.success('Promo code created!');
      setCouponForm({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '' });
      setShowCouponForm(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create coupon.');
    }
  };

  const handleUpdateStatus = async () => {
    const { id, status } = confirmOrderStatus;
    setConfirmOrderStatus({ isOpen: false, id: null, status: null });
    try {
      await updateOrderStatus({ id, status }).unwrap();
      toast.success(`Order advanced to ${status}!`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update order');
    }
  };

  const handleUpdateReturnStatus = async (orderId, itemId, status) => {
    try {
      await updateItemReturnStatus({ id: orderId, itemId, status }).unwrap();
      toast.success(`Request marked as ${status}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update request');
    }
  };

  const handleDeleteReview = async () => {
    const { productId, reviewId } = confirmReviewDelete;
    setConfirmReviewDelete({ isOpen: false, productId: null, reviewId: null });
    try {
      await deleteReview({ productId, reviewId }).unwrap();
      toast.success('Review successfully deleted.');
    } catch {
      toast.error('Failed to delete review.');
    }
  };

  const handleRequestAdminOtp = async (e) => {
    e.preventDefault();
    if (!adminTarget) return toast.error('Please enter the target email or phone.');
    try {
      await requestAdminPromotion().unwrap();
      toast.success('Security OTP sent to YOUR device/email.');
      setAdminStep(2);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to request security OTP.');
    }
  };

  const handleConfirmAdmin = async (e) => {
    e.preventDefault();
    try {
      const payload = adminTarget.includes('@')
        ? { targetEmail: adminTarget, otp: adminOtp }
        : { targetMobile: adminTarget, otp: adminOtp };

      await confirmAdminPromotion(payload).unwrap();
      toast.success('Success! User promoted to Admin.');
      setShowAdminForm(false);
      setAdminStep(1);
      setAdminTarget('');
      setAdminOtp('');
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid OTP or failed to promote.');
    }
  };

  // ==========================================
  // NEW: ONE-CLICK CSV EXPORT
  // ==========================================
  const handleExportCSV = () => {
    if (!orders || orders.length === 0) {
      toast.error("No orders to export!");
      return;
    }
    
    // 1. Define the Excel Column Headers
    const headers = ["Order ID", "Date", "Customer Name", "Mobile", "City", "Payment Route", "Payment Status", "Order Status", "Total Paid (Rs)"];
    
    // 2. Map the data to rows
    const rows = orders.map(o => [
      o._id,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      o.shippingDetails?.fullName || o.user?.name || "N/A",
      o.shippingDetails?.phone || o.user?.mobileNumber || "N/A",
      o.shippingDetails?.city || "N/A",
      o.paymentMethod?.toUpperCase() || "N/A",
      o.paymentStatus?.toUpperCase() || "N/A",
      o.orderStatus?.toUpperCase() || "N/A",
      o.totalPrice || 0
    ]);

    // 3. Convert to CSV format
    const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    
    // 4. Trigger the silent download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ToyBlix_Orders_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Report Downloaded! 📊");
  };

  const analyticsData = useMemo(() => {
    if (!orders) return null;

    // Filter orders for Revenue Trend based on selected date range
    let daysToCalculate = 7;
    let startDate = new Date();
    let endDate = new Date();
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (dateRangeFilter === '30d') {
      daysToCalculate = 30;
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRangeFilter === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      daysToCalculate = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    }

    // Generate date labels
    const dateLabels = [];
    if (daysToCalculate <= 31) {
       for (let i = daysToCalculate - 1; i >= 0; i--) {
         const d = new Date(endDate);
         d.setDate(endDate.getDate() - i);
         dateLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
       }
    } else {
       // Group by month if large range
       let curr = new Date(startDate);
       while(curr <= endDate) {
         const label = curr.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
         if (!dateLabels.includes(label)) dateLabels.push(label);
         curr.setMonth(curr.getMonth() + 1);
       }
    }

    const revenueDataMap = {};
    dateLabels.forEach(l => revenueDataMap[l] = 0);

    // Calculate revenue mapping
    orders.forEach(order => {
       if (order.paymentStatus !== 'paid' && order.paymentMethod !== 'cod') return;
       const orderDate = new Date(order.createdAt);
       if (orderDate >= startDate && orderDate <= endDate) {
          let label = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (daysToCalculate > 31) label = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          if (revenueDataMap[label] !== undefined) {
             revenueDataMap[label] += order.totalPrice;
          }
       }
    });
    
    const revenueData = Object.keys(revenueDataMap).map(date => ({ date, Revenue: revenueDataMap[date] }));

    // Top Toys
    const topToysMap = {};
    const categoryMap = {};
    const cityMap = {};
    const areaMap = {};
    const userOrdersMap = {};

    orders.forEach(order => {
      // Repeat vs New Customer tracking
      if (order.user) {
        const userId = typeof order.user === 'object' ? order.user._id : order.user;
        userOrdersMap[userId] = (userOrdersMap[userId] || 0) + 1;
      } else if (order.shippingDetails?.phone) {
        userOrdersMap[order.shippingDetails.phone] = (userOrdersMap[order.shippingDetails.phone] || 0) + 1;
      }

      // City tracking
      if (order.shippingDetails?.city && (order.paymentStatus === 'paid' || order.paymentMethod === 'cod')) {
        const city = order.shippingDetails.city.trim().toUpperCase();
        cityMap[city] = (cityMap[city] || 0) + 1;
      }
      
      // Area tracking (for map)
      if (order.shippingDetails?.state && (order.paymentStatus === 'paid' || order.paymentMethod === 'cod')) {
        let state = order.shippingDetails.state.trim();
        state = state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        areaMap[state] = (areaMap[state] || 0) + 1;
      }

      if (order.paymentStatus === 'paid' || order.paymentMethod === 'cod') {
        order.orderItems?.forEach(item => {
          topToysMap[item.title] = (topToysMap[item.title] || 0) + item.qty;
          
          // Try to find category from productsData
          const product = productsData?.products?.find(p => p.title === item.title || String(p._id) === String(getOrderItemProductId(item)));
          const category = product?.category || 'Uncategorized';
          categoryMap[category] = (categoryMap[category] || 0) + item.qty;
        });
      }
    });

    const topToysData = Object.keys(topToysMap)
      .map(key => ({ name: key, Sales: topToysMap[key] }))
      .sort((a, b) => b.Sales - a.Sales)
      .slice(0, 5);

    const categoryData = Object.keys(categoryMap)
      .map(key => ({ name: key, value: categoryMap[key] }))
      .sort((a, b) => b.value - a.value);

    const cityData = Object.keys(cityMap)
      .map(key => ({ name: key, Orders: cityMap[key] }))
      .sort((a, b) => b.Orders - a.Orders)
      .slice(0, 7);
      
    const areaData = Object.keys(areaMap)
      .map(key => ({ name: key, value: areaMap[key] }));

    // Customer Demographics (New vs Repeat)
    let newCustomers = 0;
    let repeatCustomers = 0;
    Object.values(userOrdersMap).forEach(count => {
       if (count > 1) repeatCustomers++;
       else newCustomers++;
    });
    const customerData = [
       { name: 'New Customers', value: newCustomers, color: '#f87171' },
       { name: 'Repeat Customers', value: repeatCustomers, color: '#991b1b' }
    ].filter(item => item.value > 0);

    // Active Bottlenecks (Pending, Confirmed, Cancelled, RTO/Returned, Delivered)
    let pendingCount = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let rtoReturnCount = 0;
    let deliveredCount = 0;

    orders.forEach(o => {
       const hasReturnRequest = o.orderItems?.some(item => item.returnStatus && item.returnStatus !== 'Not Requested');
       if (o.orderStatus === 'cancelled') {
         cancelledCount++;
       } else if (o.orderStatus === 'refunded' || o.orderStatus === 'rto' || hasReturnRequest) {
         rtoReturnCount++;
       } else if (o.orderStatus === 'delivered' || o.orderStatus === 'fulfilled') {
         deliveredCount++;
       } else if (o.orderStatus === 'confirmed' || o.orderStatus === 'packed' || o.orderStatus === 'dispatched') {
         confirmedCount++;
       } else {
         pendingCount++; // created, pending_payment
       }
    });

    const fulfillmentData = [
      { name: 'Pending', value: pendingCount, color: '#fca5a5' }, // red-300
      { name: 'Confirmed', value: confirmedCount, color: '#ef4444' }, // red-500
      { name: 'Cancelled', value: cancelledCount, color: '#9ca3af' }, // gray-400
      { name: 'RTO / Return', value: rtoReturnCount, color: '#b91c1c' }, // red-700
      { name: 'Delivered', value: deliveredCount, color: '#16a34a' }, // green-600
    ].filter(item => item.value > 0);

    return { revenueData, topToysData, fulfillmentData, categoryData, cityData, areaData, customerData };
  }, [orders, dateRangeFilter, customStartDate, customEndDate, productsData]);


  if (isLoading) {
    return <div className="pt-32 text-center font-bold text-red-950/50">Loading Command Center...</div>;
  }

  const totalRevenue = orders?.reduce((acc, order) => acc + (order.paymentStatus === 'paid' || order.paymentMethod === 'cod' ? order.totalPrice : 0), 0) || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter((order) => order.orderStatus !== 'delivered' && order.orderStatus !== 'fulfilled' && order.orderStatus !== 'cancelled').length || 0;

  // Flatten all return/exchange requests across all orders
  const allReturnRequests = orders?.flatMap(order =>
    (order.orderItems || [])
      .filter(item => item.returnStatus && item.returnStatus !== 'Not Requested')
      .map(item => ({ ...item, order }))
  ) || [];
  const pendingReturnsCount = allReturnRequests.filter(r => r.returnStatus === 'Return Requested' || r.returnStatus === 'Exchange Requested').length;

  return (
    <main className="pt-28 pb-24 min-h-screen bg-white bg-hero-glow relative fade-in">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      <div className="max-w-[1300px] mx-auto px-6 relative z-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-red-950 tracking-tight">Admin Dashboard</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">payments</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Total Revenue</p>
              <h3 className="text-3xl font-black text-red-950">₹{totalRevenue.toLocaleString('en-IN')}</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">shopping_bag</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Total Orders</p>
              <h3 className="text-3xl font-black text-red-950">{totalOrders}</h3>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">calculate</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Average Order</p>
              <h3 className="text-3xl font-black text-red-950">₹{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString('en-IN') : 0}</h3>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">pending_actions</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Active Queue</p>
              <h3 className="text-3xl font-black text-red-950">{pendingOrders}</h3>
            </div>
          </div>
        </div>

        {/* Sidebar & Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Sidebar */}
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="bg-white/60 backdrop-blur-md p-4 rounded-[2rem] border border-red-50 shadow-sm flex flex-col gap-2 sticky top-32">
              <button onClick={() => setActiveTab('analytics')} className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'analytics' ? 'bg-red-950 text-white shadow-md translate-x-1' : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}>
                <span className="material-symbols-outlined text-[20px]">bar_chart</span> Analytics
              </button>
              <button onClick={() => setActiveTab('customers')} className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'customers' ? 'bg-red-950 text-white shadow-md translate-x-1' : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}>
                <span className="material-symbols-outlined text-[20px]">group</span> Customers
                {users?.length > 0 && <span className="bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-auto">{users.length}</span>}
              </button>
              <button onClick={() => setActiveTab('orders')} className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'orders' ? 'bg-red-950 text-white shadow-md translate-x-1' : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}>
                <span className="material-symbols-outlined text-[20px]">local_shipping</span> Orders
              </button>
              <button onClick={() => setActiveTab('promos')} className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'promos' ? 'bg-red-950 text-white shadow-md translate-x-1' : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}>
                <span className="material-symbols-outlined text-[20px]">sell</span> Promo Codes
                {coupons?.length > 0 && <span className="bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-auto">{coupons.length}</span>}
              </button>
              <button onClick={() => setActiveTab('abandoned')} className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'abandoned' ? 'bg-red-950 text-white shadow-md translate-x-1' : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}>
                <span className="material-symbols-outlined text-[20px]">shopping_cart_off</span> Abandoned Carts
              </button>
              <button onClick={() => setActiveTab('reviews')} className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'reviews' ? 'bg-red-950 text-white shadow-md translate-x-1' : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}>
                <span className="material-symbols-outlined text-[20px]">rate_review</span> Moderation
                {allReviews.length > 0 && <span className="bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-auto">{allReviews.length}</span>}
              </button>
              <button onClick={() => setActiveTab('returns')} className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${activeTab === 'returns' ? 'bg-red-950 text-white shadow-md translate-x-1' : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}>
                <span className="material-symbols-outlined text-[20px]">assignment_return</span> Returns
                {pendingReturnsCount > 0 && <span className="bg-orange-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-auto">{pendingReturnsCount}</span>}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">

        {/* ============= ANALYTICS TAB ============= */}
        {activeTab === 'analytics' && analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm lg:col-span-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black text-red-950 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">trending_up</span> Revenue Trend
                  </h3>
                  <button onClick={handleExportCSV} className="hidden sm:flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    value={dateRangeFilter} 
                    onChange={(e) => setDateRangeFilter(e.target.value)}
                    className="bg-red-50 border border-red-100 text-red-900 text-xs rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5 font-bold outline-none"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="custom">Custom Dates</option>
                  </select>
                  {dateRangeFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-100">
                      <input 
                        type="date" 
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)} 
                        className="bg-transparent text-xs text-red-900 font-bold outline-none px-1"
                      />
                      <span className="text-red-950/40 text-xs">to</span>
                      <input 
                        type="date" 
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)} 
                        className="bg-transparent text-xs text-red-900 font-bold outline-none px-1"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ReactECharts
                  option={{
                    tooltip: {
                      trigger: 'axis',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: '#fee2e2',
                      borderWidth: 1,
                      textStyle: { fontWeight: 'bold', color: '#dc2626' },
                      borderRadius: 16,
                      boxShadow: '0 10px 25px -5px rgba(69, 10, 10, 0.1)',
                      formatter: (params) => {
                        return `${params[0].name}<br/><span style="color:#dc2626;font-weight:900">Revenue: ₹${params[0].value}</span>`;
                      }
                    },
                    grid: { top: 20, right: 20, bottom: 20, left: 60, containLabel: false },
                    xAxis: {
                      type: 'category',
                      data: analyticsData.revenueData.map(d => d.date),
                      axisLine: { show: false },
                      axisTick: { show: false },
                      axisLabel: { color: '#fca5a5', fontSize: 12, fontWeight: 700, margin: 15 }
                    },
                    yAxis: {
                      type: 'value',
                      axisLine: { show: false },
                      axisTick: { show: false },
                      splitLine: { lineStyle: { type: 'dashed', color: '#fee2e2' } },
                      axisLabel: { color: '#fca5a5', fontSize: 12, fontWeight: 700, formatter: '₹{value}', margin: 15 }
                    },
                    series: [{
                      data: analyticsData.revenueData.map(d => d.Revenue),
                      type: 'line',
                      smooth: true,
                      symbolSize: 12,
                      itemStyle: { color: '#dc2626', borderColor: '#fff', borderWidth: 2 },
                      lineStyle: { color: '#dc2626', width: 4 },
                      areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                          { offset: 0, color: 'rgba(220, 38, 38, 0.2)' },
                          { offset: 1, color: 'rgba(220, 38, 38, 0)' }
                        ])
                      }
                    }]
                  }}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
              <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500">star</span> Best Selling Toys
              </h3>
              <div className="h-[250px] w-full">
                {analyticsData.topToysData.length > 0 ? (
                  <ReactECharts
                    option={{
                      tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' },
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderColor: '#fee2e2',
                        borderWidth: 1,
                        textStyle: { fontWeight: 'bold' },
                        borderRadius: 16
                      },
                      grid: { top: 10, right: 20, bottom: 10, left: 120, containLabel: false },
                      xAxis: { type: 'value', show: false },
                      yAxis: {
                        type: 'category',
                        data: analyticsData.topToysData.map(d => d.name).reverse(),
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: { color: '#991b1b', fontSize: 11, fontWeight: 700, margin: 15 }
                      },
                      series: [{
                        type: 'bar',
                        data: analyticsData.topToysData.map(d => d.Sales).reverse(),
                        barWidth: 20,
                        itemStyle: { color: '#dc2626', borderRadius: [0, 8, 8, 0] }
                      }]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-red-950/40 font-bold">No sales data yet.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
              <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">pie_chart</span> Active Bottlenecks
              </h3>
              <div className="h-[250px] w-full flex items-center justify-center relative">
                {analyticsData.fulfillmentData.length > 0 ? (
                  <>
                    <div className="absolute inset-0 right-[120px]">
                      <ReactECharts
                        option={{
                          tooltip: {
                            trigger: 'item',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderColor: '#fee2e2',
                            borderWidth: 1,
                            textStyle: { fontWeight: 'bold' },
                            borderRadius: 16
                          },
                          series: [{
                            type: 'pie',
                            radius: ['55%', '85%'],
                            center: ['50%', '50%'],
                            itemStyle: {
                              borderRadius: 5,
                              borderColor: '#fff',
                              borderWidth: 2
                            },
                            label: { show: false },
                            data: analyticsData.fulfillmentData.map(d => ({
                              value: d.value,
                              name: d.name,
                              itemStyle: { color: d.color }
                            }))
                          }]
                        }}
                        style={{ height: '100%', width: '100%' }}
                      />
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 flex flex-col gap-3 z-10">
                      {analyticsData.fulfillmentData.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-red-950/70">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          {entry.name} ({entry.value})
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-red-950/40 font-bold text-center">
                    <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">done_all</span><br />Queue is empty!
                  </div>
                )}
              </div>
            </div>
            
            {/* Sales by Categories */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
              <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500">category</span> Sales by Category
              </h3>
              <div className="h-[250px] w-full">
                {analyticsData.categoryData.length > 0 ? (
                  <ReactECharts
                    option={{
                      tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' },
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderColor: '#fee2e2',
                        borderWidth: 1,
                        textStyle: { fontWeight: 'bold' },
                        borderRadius: 16
                      },
                      grid: { top: 20, right: 20, bottom: 30, left: 30, containLabel: false },
                      xAxis: {
                        type: 'category',
                        data: analyticsData.categoryData.map(d => d.name),
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: { color: '#991b1b', fontSize: 10, fontWeight: 700, margin: 15 }
                      },
                      yAxis: {
                        type: 'value',
                        axisLine: { show: false },
                        axisTick: { show: false },
                        splitLine: { lineStyle: { type: 'dashed', color: '#fee2e2' } },
                        axisLabel: { color: '#fca5a5', fontSize: 12, fontWeight: 700, margin: 15 }
                      },
                      series: [{
                        type: 'bar',
                        data: analyticsData.categoryData.map(d => d.value),
                        barWidth: 30,
                        itemStyle: { color: '#8b5cf6', borderRadius: [8, 8, 0, 0] }
                      }]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-red-950/40 font-bold">No category data yet.</div>
                )}
              </div>
            </div>

            {/* Area-wise Sales */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
              <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">location_on</span> Top Areas (India)
              </h3>
              <div className="h-[350px] w-full">
                <ReactECharts
                  option={{
                    tooltip: {
                      trigger: 'item',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: '#bfdbfe',
                      borderWidth: 1,
                      textStyle: { fontWeight: 'bold' },
                      borderRadius: 16,
                      formatter: '{b}<br/>Orders: {c}'
                    },
                    visualMap: {
                      min: 0,
                      max: Math.max(...(analyticsData.areaData.length ? analyticsData.areaData.map(d => d.value) : [10])),
                      left: 'left',
                      top: 'bottom',
                      text: ['High', 'Low'],
                      calculable: true,
                      inRange: {
                        color: ['#eff6ff', '#3b82f6', '#1e3a8a']
                      }
                    },
                    series: [
                      {
                        name: 'Orders',
                        type: 'map',
                        map: 'India',
                        roam: true,
                        itemStyle: {
                          areaColor: '#eff6ff',
                          borderColor: '#93c5fd'
                        },
                        emphasis: {
                          itemStyle: {
                            areaColor: '#60a5fa'
                          },
                          label: { show: true, color: '#fff' }
                        },
                        data: analyticsData.areaData
                      }
                    ]
                  }}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            </div>

            {/* Repeat vs New Customers */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
              <h3 className="text-xl font-black text-red-950 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">group_add</span> Customer Retention
              </h3>
              <div className="h-[250px] w-full flex items-center justify-center relative">
                {analyticsData.customerData.length > 0 ? (
                  <>
                    <div className="absolute inset-0 right-[150px]">
                      <ReactECharts
                        option={{
                          tooltip: {
                            trigger: 'item',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderColor: '#fee2e2',
                            borderWidth: 1,
                            textStyle: { fontWeight: 'bold' },
                            borderRadius: 16
                          },
                          series: [{
                            type: 'pie',
                            radius: ['55%', '85%'],
                            center: ['50%', '50%'],
                            itemStyle: {
                              borderRadius: 5,
                              borderColor: '#fff',
                              borderWidth: 2
                            },
                            label: { show: false },
                            data: analyticsData.customerData.map(d => ({
                              value: d.value,
                              name: d.name,
                              itemStyle: { color: d.color }
                            }))
                          }]
                        }}
                        style={{ height: '100%', width: '100%' }}
                      />
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 flex flex-col gap-3 z-10">
                      {analyticsData.customerData.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-red-950/70">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          {entry.name} ({entry.value})
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-red-950/40 font-bold text-center">
                    No customer data yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============= ORDERS TAB ============= */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
            <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
              <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600 text-[28px]">local_shipping</span>
                Fulfillment Pipeline
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-red-50/50 border-b border-red-50">
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-8">Order ID</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Customer</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Payment</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Fulfillment</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pr-8 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders?.map((order) => {
                    const fulfillMeta = getFulfillmentMeta(order.orderStatus);
                    const payMeta = getPaymentMeta(order.paymentStatus);
                    const nextAction = getNextAction(order.orderStatus);

                    return (
                      <tr key={order._id} className="hover:bg-red-50/20 transition-colors border-b border-red-50 group">
                        <td className="p-5 font-mono text-sm font-bold text-red-950/60 pl-8">
                          ...{order._id.substring(order._id.length - 6)}
                          <p className="text-[10px] text-red-950/40 font-sans mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </p>
                        </td>
                        <td className="p-5">
                          <p className="font-bold text-red-950">{order.user?.name || order.shippingDetails?.fullName}</p>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-xs font-black text-red-600 hover:text-red-700 flex items-center gap-1 mt-1 transition-colors uppercase tracking-widest"
                          >
                            <span className="material-symbols-outlined text-[14px]">visibility</span> Details
                          </button>
                        </td>
                        <td className="p-5">
                          <span className={`${payMeta.className} text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 w-max shadow-sm`}>
                            <span className="material-symbols-outlined text-[14px]">{payMeta.icon}</span>
                            {payMeta.label}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className={`${fulfillMeta.className} text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 w-max shadow-sm`}>
                            <span className="material-symbols-outlined text-[14px]">{fulfillMeta.icon}</span>
                            {fulfillMeta.label}
                          </span>
                        </td>
                        <td className="p-5 pr-8 text-right flex items-center justify-end gap-2">
                          {nextAction ? (
                            <button
                              onClick={() => setConfirmOrderStatus({ isOpen: true, id: order._id, status: nextAction.nextStatus })}
                              disabled={isUpdating}
                              className={`${nextAction.bg} text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-50`}
                            >
                              {nextAction.label}
                            </button>
                          ) : order.orderStatus !== 'cancelled' ? (
                            <span className="text-[10px] font-bold text-red-950/40 flex items-center justify-end gap-1 px-4 py-2.5 uppercase tracking-widest">
                              <span className="material-symbols-outlined text-[14px]">done_all</span> Completed
                            </span>
                          ) : null}

                          {order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
                            <button
                              onClick={() => setConfirmOrderStatus({ isOpen: true, id: order._id, status: 'cancelled' })}
                              disabled={isUpdating}
                              className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 border border-red-100"
                            >
                              Cancel
                            </button>
                          )}
                          {order.orderStatus === 'cancelled' && (
                            <span className="text-[10px] font-bold text-red-600 flex items-center justify-end gap-1 px-4 py-2.5 uppercase tracking-widest">
                              <span className="material-symbols-outlined text-[14px]">cancel</span> Cancelled
                            </span>
                          )}

                          {(order.orderStatus === 'cancelled' || order.orderItems?.some(item => item.returnStatus === 'Approved')) 
                            && order.paymentStatus === 'paid' && order.refundStatus !== 'processed' && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Process automated refund via Razorpay for this order?')) {
                                  try {
                                    await processRefund(order._id).unwrap();
                                    toast.success('Refund processed successfully!');
                                  } catch (err) {
                                    toast.error(err?.data?.message || 'Refund failed');
                                  }
                                }
                              }}
                              disabled={isRefunding}
                              className="bg-orange-50 text-orange-600 hover:bg-orange-100 text-[10px] font-black px-4 py-2.5 rounded-xl transition-all shadow-sm border border-orange-200 flex items-center gap-1 uppercase tracking-widest"
                            >
                              <span className="material-symbols-outlined text-[14px]">currency_rupee</span> Refund
                            </button>
                          )}
                          
                          {order.refundStatus === 'processed' && (
                             <span className="text-[10px] font-bold text-orange-600 flex items-center justify-end gap-1 px-4 py-2.5 uppercase tracking-widest">
                               <span className="material-symbols-outlined text-[14px]">check_circle</span> Refunded
                             </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {orders?.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-16">
                        <span className="material-symbols-outlined text-[48px] text-red-200 mb-2 block">inbox</span>
                        <p className="text-red-950/50 font-bold">No orders have been placed yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============= PROMOS TAB ============= */}
        {activeTab === 'promos' && (
          <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
            <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
              <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600 text-[28px]">sell</span>
                Promo Code Manager
              </h2>
              <button
                onClick={() => setShowCouponForm(!showCouponForm)}
                className="bg-red-950 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-900 transition-all shadow-md hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-[18px]">{showCouponForm ? 'close' : 'add'}</span>
                {showCouponForm ? 'Cancel' : 'New Code'}
              </button>
            </div>

            {showCouponForm && (
              <form onSubmit={handleCreateCoupon} className="p-8 border-b border-red-50 bg-red-50/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Promo Code *</label>
                    <input required value={couponForm.code} onChange={(e) => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. SUMMER20" className="w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm uppercase focus:ring-2 focus:ring-red-600 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Discount Type *</label>
                    <select value={couponForm.discountType} onChange={(e) => setCouponForm(p => ({ ...p, discountType: e.target.value }))} className="w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (Rs)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Discount Value *</label>
                    <input required type="number" min="1" value={couponForm.discountValue} onChange={(e) => setCouponForm(p => ({ ...p, discountValue: e.target.value }))} placeholder={couponForm.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 500'} className="w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Min Order (Rs)</label>
                    <input type="number" min="0" value={couponForm.minOrderAmount} onChange={(e) => setCouponForm(p => ({ ...p, minOrderAmount: e.target.value }))} placeholder="0 = no min" className="w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Max Discount (Rs)</label>
                    <input type="number" min="0" value={couponForm.maxDiscount} onChange={(e) => setCouponForm(p => ({ ...p, maxDiscount: e.target.value }))} placeholder="Cap for %" className="w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Usage Limit</label>
                    <input type="number" min="1" value={couponForm.usageLimit} onChange={(e) => setCouponForm(p => ({ ...p, usageLimit: e.target.value }))} placeholder="Empty = unlimited" className="w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Expiry Date</label>
                    <input type="date" value={couponForm.expiresAt} onChange={(e) => setCouponForm(p => ({ ...p, expiresAt: e.target.value }))} className="w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-600/20 hover:-translate-y-0.5">Create Promo</button>
                  </div>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-red-50/50 border-b border-red-50">
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-8">Code</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Discount</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Min Order</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Usage</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">ROI</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Status</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pr-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons?.map((coupon) => {
                    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                    const isAtLimit = coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit;
                    return (
                      <tr key={coupon._id} className="hover:bg-red-50/20 border-b border-red-50 transition-colors">
                        <td className="p-5 pl-8">
                          <span className="font-mono font-black text-red-950 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg text-sm">{coupon.code}</span>
                        </td>
                        <td className="p-5">
                          <span className="font-black text-red-950">
                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `Rs ${coupon.discountValue}`}
                          </span>
                          {coupon.maxDiscount && <span className="text-[10px] text-red-950/50 ml-1">(max Rs {coupon.maxDiscount})</span>}
                        </td>
                        <td className="p-5 text-sm font-bold text-red-950/70">
                          {coupon.minOrderAmount > 0 ? `Rs ${coupon.minOrderAmount}` : '—'}
                        </td>
                        <td className="p-5 text-sm font-bold text-red-950/70">
                          {coupon.usedCount}{coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : ' / ∞'}
                        </td>
                        <td className="p-5">
                          <div className="text-xs">
                            <p className="font-black text-red-950">₹{(coupon.totalRevenueGenerated || 0).toLocaleString('en-IN')}</p>
                            <p className="text-red-950/40">−₹{(coupon.totalDiscountGiven || 0).toLocaleString('en-IN')} given</p>
                          </div>
                        </td>
                        <td className="p-5">
                          {isExpired ? (
                            <span className="text-xs font-black bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-full">Expired</span>
                          ) : isAtLimit ? (
                            <span className="text-xs font-black bg-red-50 text-red-950/50 border border-red-100 px-3 py-1.5 rounded-full">Exhausted</span>
                          ) : coupon.isActive ? (
                            <span className="text-xs font-black bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full">Active</span>
                          ) : (
                            <span className="text-xs font-black bg-white text-red-950/40 border border-red-50 px-3 py-1.5 rounded-full">Disabled</span>
                          )}
                        </td>
                        <td className="p-5 pr-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={async () => { try { await toggleCoupon(coupon._id).unwrap(); toast.success(`Coupon ${coupon.isActive ? 'disabled' : 'enabled'}`); } catch { toast.error('Failed'); } }} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-950/40 hover:text-red-950" title={coupon.isActive ? 'Disable' : 'Enable'}>
                              <span className="material-symbols-outlined text-[18px]">{coupon.isActive ? 'toggle_on' : 'toggle_off'}</span>
                            </button>
                            <button onClick={() => setConfirmCouponDelete({ isOpen: true, id: coupon._id })} className="p-2 rounded-lg hover:bg-red-100 transition-colors text-red-400 hover:text-red-600" title="Delete">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!coupons || coupons.length === 0) && (
                    <tr>
                      <td colSpan="6" className="text-center py-16">
                        <span className="material-symbols-outlined text-[48px] text-red-200 mb-2 block">sell</span>
                        <p className="text-red-950/50 font-bold">No promo codes yet. Click "New Code" to get started!</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============= ABANDONED CARTS TAB ============= */}
        {activeTab === 'abandoned' && (() => {
          const ABANDONED_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
          const now = Date.now();
          const abandonedUsers = users?.filter(u => {
            if (!u.cart || u.cart.length === 0) return false;
            // We'll approximate since we need cartUpdatedAt. Filter users whose account was updated > 1h ago
            // (backend sets cartUpdatedAt, but user API aggregation doesn't expose it, so we show all non-empty carts for now)
            return true;
          }) || [];

          const totalAbandonedValue = abandonedUsers.reduce((sum, u) => {
            return sum + (u.cart || []).reduce((s, item) => s + ((item.price || 0) * (item.qty || 1)), 0);
          }, 0);

          return (
            <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
              <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-600 text-[28px]">shopping_cart_off</span>
                    Abandoned Carts
                  </h2>
                  <p className="text-xs text-red-950/50 font-bold mt-1">Customers with items in cart but no completed order. Cron auto-recovers every 30 min via WhatsApp + Email.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest">Est. Lost Revenue</p>
                  <p className="text-3xl font-black text-red-600">₹{totalAbandonedValue.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-red-50/50 border-b border-red-50">
                      <th className="p-5 pl-8 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Customer</th>
                      <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Contact</th>
                      <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Items in Cart</th>
                      <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Est. Value</th>
                      <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pr-8">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedUsers.length > 0 ? abandonedUsers.map(u => {
                      const cartValue = (u.cart || []).reduce((s, item) => s + ((item.price || 0) * (item.qty || 1)), 0);
                      return (
                        <tr key={u._id} className="hover:bg-red-50/20 border-b border-red-50 transition-colors">
                          <td className="p-5 pl-8">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center font-bold text-red-600">
                                {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <span className="font-bold text-sm text-red-950">{u.name || 'Anonymous'}</span>
                            </div>
                          </td>
                          <td className="p-5">
                            <p className="text-xs font-medium text-red-950/70">{u.email || '—'}</p>
                            <p className="text-xs font-medium text-red-950/50">{u.mobileNumber || '—'}</p>
                          </td>
                          <td className="p-5">
                            <span className="font-black text-red-950">{(u.cart || []).length}</span>
                            <span className="text-red-950/40 text-xs ml-1">items</span>
                          </td>
                          <td className="p-5">
                            <span className="font-black text-red-600 text-sm">₹{cartValue.toLocaleString('en-IN')}</span>
                          </td>
                          <td className="p-5 pr-8">
                            <span className="text-xs text-red-950/40 font-medium">{new Date(u.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="5" className="text-center py-16">
                        <span className="material-symbols-outlined text-[48px] text-red-200 mb-2 block">check_circle</span>
                        <p className="text-red-950/50 font-bold">No users with items left in cart. 🎉</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ============= CUSTOMERS TAB ============= */}
        {activeTab === 'customers' && (() => {
          const adminUsers = users?.filter(u => u.role === 'admin') || [];
          const regularUsers = users?.filter(u => u.role !== 'admin') || [];

          const renderUserRow = (user) => (
            <tr key={user._id} className={`hover:bg-red-50/20 transition-colors border-b border-red-50 group ${user.isBanned ? 'opacity-50 grayscale' : ''}`}>
              <td className="p-5 pl-8">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${user.role === 'admin' ? 'bg-red-600 text-white border-red-700' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {user.name ? user.name.charAt(0).toUpperCase() : <span className="material-symbols-outlined text-[18px]">person</span>}
                  </div>
                  <div>
                    <p className="font-bold text-red-950 text-sm flex items-center gap-1">
                      {user.name || 'Anonymous User'}
                      {user.role === 'admin' && <span className="material-symbols-outlined text-red-600 text-[14px]" title="Admin">shield</span>}
                    </p>
                    <p className="text-[10px] text-red-950/50 font-bold">Joined: {new Date(user.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </td>
              <td className="p-5">
                <p className="text-sm font-medium text-red-950/70 truncate max-w-[150px]" title={user.email}>{user.email || '—'}</p>
                <p className="text-xs text-red-950/50 font-medium">{user.mobileNumber || '—'}</p>
              </td>
              <td className="p-5 text-center">
                <span className="font-black text-red-950">{user.orderCount || 0}</span>
              </td>
              <td className="p-5 text-center">
                <span className="font-black text-red-950">Rs {(user.totalSpend || 0).toLocaleString('en-IN')}</span>
              </td>
              <td className="p-5">
                {user.isBanned ? (
                  <span className="text-[10px] uppercase tracking-widest font-black bg-red-950 text-white border border-red-950 px-3 py-1.5 rounded-full flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[12px]">block</span> Banned</span>
                ) : user.role === 'admin' ? (
                  <span className="text-[10px] uppercase tracking-widest font-black bg-red-600 text-white border border-red-700 px-3 py-1.5 rounded-full flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[12px]">admin_panel_settings</span> Admin</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest font-black bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[12px]">check_circle</span> Active</span>
                )}
              </td>
              <td className="p-5 pr-8 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setConfirmUserBan({ isOpen: true, id: user._id, isBanned: user.isBanned })}
                    className={`p-2 rounded-lg transition-colors ${user.isBanned ? 'bg-red-950 text-white hover:bg-black' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}
                    title={user.isBanned ? 'Unban User' : 'Ban User'}
                  >
                    <span className="material-symbols-outlined text-[18px]">{user.isBanned ? 'lock_open' : 'block'}</span>
                  </button>
                  <button
                    onClick={() => setConfirmUserRole({ isOpen: true, id: user._id, role: user.role })}
                    className={`p-2 rounded-lg flex items-center transition-colors ${user.role === 'admin' ? 'bg-red-50 text-red-950/40 hover:text-red-950' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100'}`}
                    title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin (Legacy method)'}
                  >
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                  </button>
                </div>
              </td>
            </tr>
          );

          const tableHead = (
            <thead>
              <tr className="bg-red-50/50 border-b border-red-50">
                <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-8">User</th>
                <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Contact</th>
                <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest text-center">Orders</th>
                <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest text-center">Total Spend</th>
                <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Status</th>
                <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pr-8 text-right">Actions</th>
              </tr>
            </thead>
          );

          return (
            <div className="space-y-8 fade-in">
              {/* ---- HEADER WITH ADD ADMIN BUTTON ---- */}
              <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-600 text-[28px]">group</span>
                    User Directory
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-950/50">
                      <span className="bg-red-600 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black">{adminUsers.length}</span> Admins
                      <span className="mx-1 text-red-200">|</span>
                      <span className="bg-green-500 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black">{regularUsers.length}</span> Customers
                    </div>
                    <button
                      onClick={() => { setShowAdminForm(!showAdminForm); setAdminStep(1); setAdminOtp(''); }}
                      className="bg-red-950 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-900 transition-all shadow-md hover:-translate-y-0.5 w-max"
                    >
                      <span className="material-symbols-outlined text-[18px]">{showAdminForm ? 'close' : 'security'}</span>
                      {showAdminForm ? 'Cancel' : 'Add Admin'}
                    </button>
                  </div>
                </div>

                {/* SECURE ADMIN ADDITION FORM */}
                {showAdminForm && (
                  <div className="p-8 border-b border-red-100 bg-red-50/50">
                    <div className="max-w-md bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                      <h3 className="font-black text-red-950 mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-600">admin_panel_settings</span>
                        Promote to Admin
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest text-red-950/60 font-bold mb-5">
                        Security Check: To promote someone, we will send an OTP to <strong>your</strong> registered admin email/phone to verify it's you making the change.
                      </p>
                      {adminStep === 1 ? (
                        <form onSubmit={handleRequestAdminOtp} className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Target User's Email or Phone</label>
                            <input required value={adminTarget} onChange={(e) => setAdminTarget(e.target.value)} placeholder="user@example.com" className="w-full mt-1 bg-red-50/50 p-3 border border-red-50 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                          </div>
                          <button disabled={isRequestingOtp} type="submit" className="w-full bg-red-950 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-900 transition-all shadow-md disabled:opacity-50">
                            {isRequestingOtp ? 'Sending...' : 'Send OTP to My Device'}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleConfirmAdmin} className="space-y-4 fade-in">
                          <div>
                            <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Enter OTP Sent to You</label>
                            <input required value={adminOtp} onChange={(e) => setAdminOtp(e.target.value)} placeholder="123456" className="w-full mt-1 bg-red-50 p-3 border border-red-100 rounded-xl font-black text-center text-lg tracking-[0.5em] focus:ring-2 focus:ring-red-600 outline-none text-red-700" />
                          </div>
                          <button disabled={isConfirmingAdmin} type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-600/20 disabled:opacity-50">
                            {isConfirmingAdmin ? 'Verifying...' : 'Verify & Promote User'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ---- ADMIN TEAM SECTION ---- */}
              <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden">
                <div className="p-6 px-8 border-b border-red-50/50 bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px]">shield</span>
                    Admin Team
                    <span className="bg-white/20 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black ml-1">{adminUsers.length}</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    {tableHead}
                    <tbody>
                      {adminUsers.map(renderUserRow)}
                      {adminUsers.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-12">
                            <span className="material-symbols-outlined text-[40px] text-red-200 mb-2 block">shield</span>
                            <p className="text-red-950/50 font-bold text-sm">No admin users found.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ---- REGULAR CUSTOMERS SECTION ---- */}
              <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden">
                <div className="p-6 px-8 border-b border-red-50/50 bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px]">people</span>
                    Customers
                    <span className="bg-white/20 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black ml-1">{regularUsers.length}</span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    {tableHead}
                    <tbody>
                      {regularUsers.map(renderUserRow)}
                      {regularUsers.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-12">
                            <span className="material-symbols-outlined text-[40px] text-red-200 mb-2 block">group_off</span>
                            <p className="text-red-950/50 font-bold text-sm">No registered customers found.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ============= REVIEWS MODERATION TAB ============= */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
            <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
              <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600 text-[28px]">rate_review</span>
                Review Moderation
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-red-50/50 border-b border-red-50">
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pl-8 w-[250px]">Product</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest w-[150px]">User & Rating</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Comment</th>
                    <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest pr-8 text-right w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allReviews.map((review) => (
                    <tr key={review._id} className="hover:bg-red-50/20 transition-colors border-b border-red-50 group">
                      <td className="p-5 pl-8 flex items-center gap-3">
                        <Link
                          to={`/product/${review.productId}`}
                          className="flex items-center gap-3 group/product"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-red-50 shrink-0">
                            <img src={resolveImage(review.productImage)} alt={review.productTitle} className="w-full h-full object-cover mix-blend-multiply" />
                          </div>
                          <span className="font-bold text-sm text-red-950 hover:text-red-600 transition-colors line-clamp-2">
                            {review.productTitle}
                          </span>
                        </Link>
                      </td>
                      <td className="p-5">
                        <p className="font-bold text-red-950 text-sm flex items-center gap-1">
                          {review.name}
                          <span className="material-symbols-outlined text-red-600 text-[14px]" title="Verified Buyer">verified</span>
                        </p>
                        <div className="flex gap-0.5 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={`material-symbols-outlined text-[14px] ${i < review.rating ? 'text-red-600 filled' : 'text-red-100'}`}>star</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-5">
                        <p className="text-sm font-medium text-red-950/70 line-clamp-3">{review.comment}</p>
                        <p className="text-[10px] text-red-950/40 font-bold mt-1 uppercase tracking-widest">{new Date(review.createdAt).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="p-5 pr-8 text-right">
                        <button
                          onClick={() => setConfirmReviewDelete({ isOpen: true, productId: review.productId, reviewId: review._id })}
                          className="bg-red-50 text-red-500 hover:bg-red-600 hover:text-white p-2 rounded-xl transition-all shadow-sm flex items-center justify-center w-max ml-auto"
                          title="Delete Review"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allReviews.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-16">
                        <span className="material-symbols-outlined text-[48px] text-red-200 mb-2 block">rate_review</span>
                        <p className="text-red-950/50 font-bold">No reviews have been submitted yet.</p>
                      </td>
                    </tr>
                  )}
                 </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============= RETURNS TAB ============= */}
        {activeTab === 'returns' && (
          <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
            <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
              <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600 text-[28px]">assignment_return</span>
                Return &amp; Exchange Requests
              </h2>
              <div className="flex items-center gap-2">
                {pendingReturnsCount > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-sm font-black px-4 py-1.5 rounded-full border border-orange-200">
                    {pendingReturnsCount} Pending
                  </span>
                )}
              </div>
            </div>

            {allReturnRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <span className="material-symbols-outlined text-[64px] text-red-100">assignment_return</span>
                <p className="text-red-950/40 font-bold text-lg">No return or exchange requests yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-red-50">
                {allReturnRequests.map((reqItem) => {
                  const { order } = reqItem;
                  const isPending = reqItem.returnStatus === 'Return Requested' || reqItem.returnStatus === 'Exchange Requested';
                  return (
                    <div key={`${order._id}-${reqItem._id}`} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-red-50/20 transition-colors">
                      {/* Product Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-16 h-16 bg-red-50 rounded-2xl overflow-hidden shrink-0 border border-red-100">
                          <img src={resolveImage(reqItem.img || reqItem.image)} alt={reqItem.title} className="w-full h-full object-cover mix-blend-multiply" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-red-950 text-sm line-clamp-1">{reqItem.title}</p>
                          {reqItem.variant && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-0.5">{reqItem.variant}</p>}
                          <p className="text-xs text-red-950/50 font-bold mt-1">
                            Order: <span className="font-mono">...{order._id.slice(-8).toUpperCase()}</span>
                          </p>
                          <p className="text-xs text-red-950/40 font-medium">{order.user?.name || order.shippingDetails?.fullName} &bull; {new Date(reqItem.returnRequestedAt).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>

                      {/* Type + Reason */}
                      <div className="flex-1 min-w-0">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border mb-2 ${reqItem.returnStatus === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : reqItem.returnStatus === 'Rejected' ? 'bg-red-950 text-white border-red-950' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                          <span className="material-symbols-outlined text-[13px]">
                            {reqItem.returnStatus === 'Approved' ? 'check_circle' : reqItem.returnStatus === 'Rejected' ? 'cancel' : 'pending_actions'}
                          </span>
                          {reqItem.returnStatus}
                        </span>
                        <p className="text-xs text-red-950/70 font-medium leading-relaxed line-clamp-2">{reqItem.returnReason || 'No reason provided.'}</p>
                        {reqItem.returnRejectionReason && (
                          <p className="text-[10px] mt-1 text-red-600 font-bold italic">Rejection: "{reqItem.returnRejectionReason}"</p>
                        )}
                      </div>

                      {/* Product Photo */}
                      {reqItem.returnImage && (
                        <div className="shrink-0">
                          <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1.5">Product Photo</p>
                          <a href={reqItem.returnImage} target="_blank" rel="noreferrer" className="block w-20 h-20 rounded-xl overflow-hidden border-2 border-red-100 hover:border-red-400 transition-colors shadow-sm">
                            <img src={reqItem.returnImage} alt="Return" className="w-full h-full object-cover" />
                          </a>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-row md:flex-col gap-2 items-start justify-end shrink-0">
                        {isPending ? (
                          <>
                            <button
                              onClick={async () => {
                                try {
                                  await updateItemReturnStatus({ id: order._id, itemId: reqItem._id, status: 'Approved' }).unwrap();
                                  toast.success('Return/Exchange approved!');
                                } catch (err) { toast.error(err?.data?.message || 'Failed to approve'); }
                              }}
                              disabled={isUpdatingReturn}
                              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span> Approve
                            </button>
                            <button
                              onClick={() => setRejectModal({ isOpen: true, orderId: order._id, itemId: reqItem._id, reason: '' })}
                              disabled={isUpdatingReturn}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-950 hover:bg-black text-white text-xs font-black rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">cancel</span> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-red-950/30 font-bold uppercase tracking-widest">Resolved</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Rejection Reason Modal */}
        {rejectModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 animate-[slideUp_0.3s_ease-out]">
              <h3 className="text-xl font-black text-red-950 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">cancel</span>
                Reject Request
              </h3>
              <p className="text-sm text-red-950/50 font-medium mb-6">You must provide a reason. This will be shown to the customer.</p>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Item appears to be used. Return window policy requires item in original, sealed condition..."
                className="w-full bg-red-50/50 p-4 rounded-2xl border border-red-100 focus:ring-2 focus:ring-red-600 outline-none resize-none font-medium text-sm text-red-950 h-28 mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setRejectModal({ isOpen: false, orderId: null, itemId: null, reason: '' })}
                  className="flex-1 py-3 bg-red-50 text-red-950/60 font-black rounded-xl hover:bg-red-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!rejectModal.reason.trim() || isUpdatingReturn}
                  onClick={async () => {
                    try {
                      await updateItemReturnStatus({ id: rejectModal.orderId, itemId: rejectModal.itemId, status: 'Rejected', rejectionReason: rejectModal.reason }).unwrap();
                      toast.success('Request rejected.');
                      setRejectModal({ isOpen: false, orderId: null, itemId: null, reason: '' });
                    } catch (err) { toast.error(err?.data?.message || 'Failed to reject'); }
                  }}
                  className="flex-1 py-3 bg-red-950 text-white font-black rounded-xl hover:bg-black transition-colors shadow-md disabled:opacity-50"
                >
                  {isUpdatingReturn ? 'Rejecting...' : 'Submit Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>


      <OrderDetailsModal 
        order={selectedOrder} 
        products={productsData?.products || []} 
        onClose={() => setSelectedOrder(null)} 
        onUpdateReturnStatus={handleUpdateReturnStatus}
        isUpdatingReturn={isUpdatingReturn}
      />

      {/* Order Status Modal */}
      <ConfirmModal
        isOpen={confirmOrderStatus.isOpen}
        onConfirm={handleUpdateStatus}
        onCancel={() => setConfirmOrderStatus({ isOpen: false, id: null, status: null })}
        title={`Mark as ${confirmOrderStatus.status?.toUpperCase()}?`}
        message={`Are you sure you want to advance this order to ${confirmOrderStatus.status}?`}
        confirmText="Confirm Status"
        variant="info"
        icon="local_shipping"
      />

      {/* Delete Review Modal */}
      <ConfirmModal
        isOpen={confirmReviewDelete.isOpen}
        onConfirm={handleDeleteReview}
        onCancel={() => setConfirmReviewDelete({ isOpen: false, productId: null, reviewId: null })}
        title="Delete Review?"
        message="This user review will be permanently removed. This action cannot be undone."
        confirmText="Delete Forever"
        variant="danger"
        icon="delete_forever"
      />

      {/* Delete Coupon Modal */}
      <ConfirmModal
        isOpen={confirmCouponDelete.isOpen}
        onConfirm={async () => {
          const id = confirmCouponDelete.id;
          setConfirmCouponDelete({ isOpen: false, id: null });
          try { await deleteCoupon(id).unwrap(); toast.success('Coupon deleted.'); } catch { toast.error('Failed to delete coupon.'); }
        }}
        onCancel={() => setConfirmCouponDelete({ isOpen: false, id: null })}
        title="Delete Promo Code?"
        message="Are you sure you want to delete this coupon? Users will no longer be able to use it."
        confirmText="Delete Coupon"
        variant="danger"
        icon="delete"
      />

      {/* Ban User Modal */}
      <ConfirmModal
        isOpen={confirmUserBan.isOpen}
        onConfirm={async () => {
          const { id, isBanned } = confirmUserBan;
          setConfirmUserBan({ isOpen: false, id: null, isBanned: false });
          try { await toggleBanStatus(id).unwrap(); toast.success(`User successfully ${isBanned ? 'unbanned' : 'banned'}.`); } catch (e) { toast.error(e?.data?.message || 'Action failed.'); }
        }}
        onCancel={() => setConfirmUserBan({ isOpen: false, id: null, isBanned: false })}
        title={confirmUserBan.isBanned ? "Unban User?" : "Ban User?"}
        message={confirmUserBan.isBanned ? "This user will regain access to their account." : "This user will no longer be able to log in or make purchases."}
        confirmText={confirmUserBan.isBanned ? "Unban" : "Ban User"}
        variant={confirmUserBan.isBanned ? "info" : "danger"}
        icon={confirmUserBan.isBanned ? "lock_open" : "block"}
      />

      {/* Change User Role Modal */}
      <ConfirmModal
        isOpen={confirmUserRole.isOpen}
        onConfirm={async () => {
          const { id } = confirmUserRole;
          setConfirmUserRole({ isOpen: false, id: null, role: null });
          try { await updateUserRole(id).unwrap(); toast.success('User role updated.'); } catch (e) { toast.error(e?.data?.message || 'Action failed.'); }
        }}
        onCancel={() => setConfirmUserRole({ isOpen: false, id: null, role: null })}
        title={confirmUserRole.role === 'admin' ? "Remove Admin?" : "Promote to Admin?"}
        message={confirmUserRole.role === 'admin' ? "They will lose access to the dashboard." : "They will have full access to the store dashboard and catalog."}
        confirmText={confirmUserRole.role === 'admin' ? "Demote" : "Promote"}
        variant="warning"
        icon="admin_panel_settings"
      />
    </main>
  );
};

export default AdminDashboard;