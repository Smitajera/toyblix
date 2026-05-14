import React, { useState } from 'react';
import toast from 'react-hot-toast';

// RTK Query hooks
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
  useProcessRefundMutation,
} from '../features/api/apiSlice';

// Sub-components
import AdminStatsBar          from '../components/admin/AdminStatsBar';
import AdminSidebar           from '../components/admin/AdminSidebar';
import AdminAnalytics         from '../components/admin/AdminAnalytics';
import AdminOrderPanel        from '../components/admin/AdminOrderPanel';
import AdminPromos            from '../components/admin/AdminPromos';
import AdminAbandonedCarts    from '../components/admin/AdminAbandonedCarts';
import AdminCustomers         from '../components/admin/AdminCustomers';
import AdminModeration        from '../components/admin/AdminModeration';
import AdminOrderDetailsModal from '../components/admin/AdminOrderDetailsModal';
import ConfirmModal           from '../components/ConfirmModal';

const AdminDashboard = () => {
  // ── Data fetching ──────────────────────────────────────────────
  const { data: orders, isLoading }  = useGetAllOrdersQuery(undefined, { pollingInterval: 5000 });
  const { data: users }              = useGetAllUsersQuery();
  const { data: coupons }            = useGetAllCouponsQuery();
  const { data: productsData }       = useGetProductsQuery({ limit: 100 });

  // ── Mutations ──────────────────────────────────────────────────
  const [updateOrderStatus, { isLoading: isUpdating }]           = useUpdateOrderStatusMutation();
  const [processRefund]                                           = useProcessRefundMutation();
  const [createCoupon]                                            = useCreateCouponMutation();
  const [deleteCoupon]                                            = useDeleteCouponMutation();
  const [toggleCoupon]                                            = useToggleCouponMutation();
  const [deleteReview]                                            = useDeleteReviewMutation();
  const [toggleBanStatus]                                         = useToggleUserBanStatusMutation();
  const [updateUserRole]                                          = useUpdateUserRoleMutation();
  const [requestAdminPromotion, { isLoading: isRequestingOtp }]  = useRequestAdminPromotionMutation();
  const [confirmAdminPromotion, { isLoading: isConfirmingAdmin }] = useConfirmAdminPromotionMutation();

  // ── UI state ───────────────────────────────────────────────────
  const [activeTab,     setActiveTab]     = useState('analytics');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Admin promotion form
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminStep,     setAdminStep]     = useState(1);
  const [adminTarget,   setAdminTarget]   = useState('');
  const [adminOtp,      setAdminOtp]      = useState('');

  // Confirm modals
  const [confirmOrderStatus,  setConfirmOrderStatus]  = useState({ isOpen: false, id: null, status: null });
  const [confirmReviewDelete, setConfirmReviewDelete] = useState({ isOpen: false, productId: null, reviewId: null });
  const [confirmCouponDelete, setConfirmCouponDelete] = useState({ isOpen: false, id: null });
  const [confirmUserBan,      setConfirmUserBan]      = useState({ isOpen: false, id: null, isBanned: false });
  const [confirmUserRole,     setConfirmUserRole]     = useState({ isOpen: false, id: null, role: null });

  // ── Derived data ───────────────────────────────────────────────
  const totalRevenue  = orders?.reduce((acc, o) => {
    if (o.orderStatus === 'cancelled' || o.orderStatus === 'refunded') return acc;
    return acc + (o.paymentStatus === 'paid' || o.paymentMethod === 'cod' ? o.totalPrice : 0);
  }, 0) || 0;
  const totalOrders   = orders?.length || 0;
  const pendingOrders = orders?.filter(o => !['delivered', 'fulfilled', 'cancelled'].includes(o.orderStatus)).length || 0;

  const allReviews = productsData?.products?.reduce((acc, product) => {
    return [...acc, ...product.reviews.map(r => ({ ...r, productId: product._id, productTitle: product.title, productImage: product.img }))];
  }, []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];


  // Sidebar badges
  const badges = {
    customers: users?.length || 0,
    promos:    coupons?.length || 0,
    reviews:   allReviews.length,
  };

  // ── Handlers ───────────────────────────────────────────────────
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
      setShowAdminForm(false); setAdminStep(1); setAdminTarget(''); setAdminOtp('');
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid OTP or failed to promote.');
    }
  };

  const handleExportCSV = () => {
    if (!orders || orders.length === 0) return toast.error('No orders to export!');
    const headers = ['Order ID', 'Date', 'Customer Name', 'Mobile', 'City', 'Payment Route', 'Payment Status', 'Order Status', 'Total Paid (Rs)'];
    const rows = orders.map(o => [
      o._id,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      o.shippingDetails?.fullName || o.user?.name || 'N/A',
      o.shippingDetails?.phone   || o.user?.mobileNumber || 'N/A',
      o.shippingDetails?.city    || 'N/A',
      o.paymentMethod?.toUpperCase() || 'N/A',
      o.paymentStatus?.toUpperCase() || 'N/A',
      o.orderStatus?.toUpperCase()   || 'N/A',
      o.totalPrice || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ToyBlix_Orders_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report Downloaded! 📊');
  };

  // ── Guard ──────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="pt-32 text-center font-bold text-red-950/50">Loading Command Center...</div>;
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main className="pt-28 pb-24 min-h-screen bg-white bg-hero-glow relative fade-in">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0" />

      <div className="max-w-[1300px] mx-auto px-6 relative z-10">
        {/* Page title */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-red-50 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-black text-red-950 tracking-tight">Admin Dashboard</h1>
        </div>

        {/* Stats row */}
        <AdminStatsBar 
          totalRevenue={totalRevenue} 
          totalOrders={totalOrders} 
          pendingOrders={pendingOrders} 
          orders={orders} 
          users={users} 
          setActiveTab={setActiveTab} 
        />

        {/* Sidebar + content */}
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} badges={badges} />

          <div className="flex-1 min-w-0">
            {activeTab === 'analytics' && (
              <AdminAnalytics orders={orders} productsData={productsData} onExportCSV={handleExportCSV} />
            )}

            {activeTab === 'orders' && (
              <AdminOrderPanel orders={orders} isUpdating={isUpdating} onViewDetails={setSelectedOrder} />
            )}

            {activeTab === 'promos' && (
              <AdminPromos
                coupons={coupons}
                createCoupon={createCoupon}
                deleteCoupon={deleteCoupon}
                toggleCoupon={toggleCoupon}
                setConfirmCouponDelete={setConfirmCouponDelete}
              />
            )}

            {activeTab === 'abandoned' && (
              <AdminAbandonedCarts users={users} />
            )}

            {activeTab === 'customers' && (
              <AdminCustomers
                users={users}
                setConfirmUserBan={setConfirmUserBan}
                setConfirmUserRole={setConfirmUserRole}
                showAdminForm={showAdminForm}
                setShowAdminForm={setShowAdminForm}
                adminStep={adminStep}
                setAdminStep={setAdminStep}
                adminTarget={adminTarget}
                setAdminTarget={setAdminTarget}
                adminOtp={adminOtp}
                setAdminOtp={setAdminOtp}
                handleRequestAdminOtp={handleRequestAdminOtp}
                handleConfirmAdmin={handleConfirmAdmin}
                isRequestingOtp={isRequestingOtp}
                isConfirmingAdmin={isConfirmingAdmin}
              />
            )}

            {activeTab === 'reviews' && (
              <AdminModeration
                allReviews={allReviews}
                setConfirmReviewDelete={setConfirmReviewDelete}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Global Modals ── */}
      <AdminOrderDetailsModal
        order={selectedOrder}
        products={productsData?.products || []}
        onClose={() => setSelectedOrder(null)}
      />

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

      <ConfirmModal
        isOpen={confirmUserBan.isOpen}
        onConfirm={async () => {
          const { id, isBanned } = confirmUserBan;
          setConfirmUserBan({ isOpen: false, id: null, isBanned: false });
          try { await toggleBanStatus(id).unwrap(); toast.success(`User successfully ${isBanned ? 'unbanned' : 'banned'}.`); } catch (e) { toast.error(e?.data?.message || 'Action failed.'); }
        }}
        onCancel={() => setConfirmUserBan({ isOpen: false, id: null, isBanned: false })}
        title={confirmUserBan.isBanned ? 'Unban User?' : 'Ban User?'}
        message={confirmUserBan.isBanned ? 'This user will regain access to their account.' : 'This user will no longer be able to log in or make purchases.'}
        confirmText={confirmUserBan.isBanned ? 'Unban' : 'Ban User'}
        variant={confirmUserBan.isBanned ? 'info' : 'danger'}
        icon={confirmUserBan.isBanned ? 'lock_open' : 'block'}
      />

      <ConfirmModal
        isOpen={confirmUserRole.isOpen}
        onConfirm={async () => {
          const { id } = confirmUserRole;
          setConfirmUserRole({ isOpen: false, id: null, role: null });
          try { await updateUserRole(id).unwrap(); toast.success('User role updated.'); } catch (e) { toast.error(e?.data?.message || 'Action failed.'); }
        }}
        onCancel={() => setConfirmUserRole({ isOpen: false, id: null, role: null })}
        title={confirmUserRole.role === 'admin' ? 'Remove Admin?' : 'Promote to Admin?'}
        message={confirmUserRole.role === 'admin' ? 'They will lose access to the dashboard.' : 'They will have full access to the store dashboard and catalog.'}
        confirmText={confirmUserRole.role === 'admin' ? 'Demote' : 'Promote'}
        variant="warning"
        icon="admin_panel_settings"
      />
    </main>
  );
};

export default AdminDashboard;