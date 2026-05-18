import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useGetMyOrdersQuery,
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useGetAllContactMessagesQuery,
  useRequestItemReturnMutation,
} from '../features/api/apiSlice';
import toast from 'react-hot-toast';

const resolveImage = (imgPath) => {
  if (!imgPath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
  const baseUrl = apiBaseUrl.replace('/api', '');
  return `${baseUrl}${imgPath}`;
};

const getFulfillmentMeta = (status) => {
  switch (status) {
    case 'confirmed': return { label: 'Confirmed', className: 'bg-red-50 border-red-100 text-red-700', icon: 'thumb_up' };
    case 'packed': return { label: 'Packed', className: 'bg-red-100 border-red-200 text-red-800', icon: 'inventory_2' };
    case 'dispatched': return { label: 'Dispatched', className: 'bg-red-600 border-red-700 text-white', icon: 'local_shipping' };
    case 'delivered':
    case 'fulfilled': return { label: 'Delivered', className: 'bg-green-50 border-green-200 text-green-700', icon: 'check_circle' };
    default: return { label: 'Processing', className: 'bg-white border-red-50 text-red-950/70', icon: 'hourglass_empty' };
  }
};

const getPaymentMeta = (status) => {
  switch (status) {
    case 'paid': return { label: 'Paid', className: 'bg-green-50 border-green-200 text-green-700', icon: 'check_circle' };
    case 'failed': return { label: 'Failed', className: 'bg-red-950 border-red-950 text-white', icon: 'error' };
    case 'refunded': return { label: 'Refunded', className: 'bg-red-50 border-red-100 text-red-700', icon: 'replay' };
    default: return { label: 'Pending Payment', className: 'bg-white border-red-100 text-red-600', icon: 'timer' };
  }
};

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [name, setName] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [downloadingOrderIds, setDownloadingOrderIds] = useState({});
  const [returnModal, setReturnModal] = useState({ isOpen: false, orderId: null, item: null });
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState('return');
  const [returnProofMedia, setReturnProofMedia] = useState([]);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const { data: orders, isLoading: loadingOrders } = useGetMyOrdersQuery(undefined, { pollingInterval: 5000 });
  const { data: profile, isLoading: loadingProfile } = useGetUserProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateUserProfileMutation();
  const [requestItemReturn, { isLoading: isSubmittingReturn }] = useRequestItemReturnMutation();

  const { data: messages, isLoading: loadingMessages } = useGetAllContactMessagesQuery(undefined, {
    skip: !isAdmin
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');


  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const userInfoData = sessionStorage.getItem('userInfo');

    if (!token) {
      navigate('/auth');
    } else if (userInfoData) {
      try {
        const userInfo = JSON.parse(userInfoData);
        if (userInfo.role === 'admin') {
          setIsAdmin(true);
        }
      } catch {
        // Ignore invalid stored user info.
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAddresses(profile.addresses || []);

      const userInfoData = sessionStorage.getItem('userInfo');
      if (userInfoData && userInfoData !== 'undefined') {
        const userInfo = JSON.parse(userInfoData);
        sessionStorage.setItem('userInfo', JSON.stringify({ ...userInfo, name: profile.name }));
      }
    }
  }, [profile]);


  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({ name, addresses }).unwrap();
      alert('Profile updated successfully!');
    } catch (error) {
      alert(error?.data?.message || 'Failed to update profile');
    }
  };

  const handleAddAddress = () => {
    if (addresses.length >= 3) return alert('You can only save up to 3 addresses.');
    setAddresses([...addresses, { flatNumber: '', street: '', landmark: '', city: '', pincode: '' }]);
  };

  const handleAddressChange = (index, field, value) => {
    const nextAddresses = [...addresses];
    if (field === 'pincode') {
      const sanitizedValue = value.replace(/\D/g, '');
      if (sanitizedValue.length > 6) return;
      nextAddresses[index] = { ...nextAddresses[index], [field]: sanitizedValue };
    } else {
      nextAddresses[index] = { ...nextAddresses[index], [field]: value };
    }
    setAddresses(nextAddresses);
  };

  const handleRemoveAddress = (index) => {
    setAddresses(addresses.filter((_, addressIndex) => addressIndex !== index));
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      setDownloadingOrderIds((current) => ({ ...current, [orderId]: true }));
      const token = sessionStorage.getItem('token');

      const baseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

      const response = await fetch(`${baseUrl}/orders/${orderId}/invoice`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ToyBlix-Invoice-${orderId.substring(orderId.length - 8)}.pdf`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Invoice download error:', error);
      alert('Could not download the invoice. Please try again later.');
    } finally {
      setDownloadingOrderIds((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    }
  };

  const openReturnModal = (orderId, item) => {
    setReturnModal({ isOpen: true, orderId, item });
    setReturnReason('');
    setReturnType('return');
    setReturnProofMedia([]);
  };

  const closeReturnModal = () => {
    setReturnModal({ isOpen: false, orderId: null, item: null });
    setReturnReason('');
    setReturnType('return');
    setReturnProofMedia([]);
  };

  const isVideoUrl = (url) => /\.(mp4|webm|mkv|mov|avi)(\?|$)/i.test(url) || url.includes('/video/');

  const handleReturnProofUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (returnProofMedia.length + files.length > 5) {
      return toast.error('You can upload up to 5 photos or videos as proof.');
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setIsUploadingProof(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setReturnProofMedia((prev) => [...prev, ...data]);
    } catch {
      toast.error('Failed to upload proof. Please try again.');
    } finally {
      setIsUploadingProof(false);
      e.target.value = null;
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      return toast.error('Please describe the damage or issue.');
    }
    if (returnProofMedia.length === 0) {
      return toast.error('Please upload at least one photo or video as proof.');
    }

    const itemId = returnModal.item?._id?._id || returnModal.item?._id;
    if (!returnModal.orderId || !itemId) return;

    try {
      await requestItemReturn({
        id: returnModal.orderId,
        itemId,
        reason: returnReason.trim(),
        requestType: returnType,
        media: returnProofMedia,
      }).unwrap();
      toast.success('Return request submitted! Our team will review it shortly.');
      closeReturnModal();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit return request.');
    }
  };

  if (loadingProfile) {
    return <div className="pt-40 min-h-screen bg-surface text-center font-bold text-red-950/50">Loading profile...</div>;
  }

  return (
    <main className="pt-32 pb-24 min-h-screen bg-surface bg-hero-glow relative fade-in selection:bg-red-200">
      {/* Unified Background Pattern */}
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      <div className="max-w-[1100px] mx-auto px-6 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Sidebar Navigation */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-red-50 text-center">
            <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-4xl font-black mx-auto mb-4 border border-red-100 uppercase">
              {profile?.name ? profile.name.charAt(0) : 'U'}
            </div>

            <h2 className="text-2xl font-black text-red-950 mb-1">{profile?.name || 'Magical Guest'}</h2>
            <p className="text-red-950/60 font-bold mb-6">
              {profile?.mobileNumber ? `+91 ${profile.mobileNumber}` : profile?.email || 'No phone number'}
            </p>

            <div className="space-y-3 mb-6">
              <button onClick={() => setActiveTab('orders')} className={`w-full py-3 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${activeTab === 'orders' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-950/70 hover:bg-red-50 border border-red-100 shadow-sm'}`}>
                <span className="material-symbols-outlined text-[20px]">inventory_2</span> Order History
              </button>

              {isAdmin && (
                <button onClick={() => setActiveTab('messages')} className={`w-full py-3 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${activeTab === 'messages' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-950/70 hover:bg-red-50 border border-red-100 shadow-sm'}`}>
                  <span className="material-symbols-outlined text-[20px]">forum</span> User Messages
                </button>
              )}

              <button onClick={() => setActiveTab('edit')} className={`w-full py-3 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${activeTab === 'edit' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-red-950/70 hover:bg-red-50 border border-red-100 shadow-sm'}`}>
                <span className="material-symbols-outlined text-[20px]">edit</span> Edit Profile
              </button>
            </div>


          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8">


          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="bg-white/80 backdrop-blur-md p-4 sm:p-8 rounded-[2.5rem] shadow-sm border border-red-50 min-h-[400px]">
              <h1 className="text-2xl sm:text-3xl font-black text-red-950 mb-6 sm:mb-8 border-b border-red-50 pb-4">Order History</h1>
              {loadingOrders ? (
                <div className="flex justify-center py-10"><p className="font-bold text-red-950/60">Loading orders...</p></div>
              ) : orders && orders.length > 0 ? (
                <div className="space-y-6">
                  {orders.map((order) => {
                    const fulfillMeta = getFulfillmentMeta(order.orderStatus);
                    const payMeta = getPaymentMeta(order.paymentStatus);
                    const isInvoiceDownloading = Boolean(downloadingOrderIds[order._id]);
                    return (
                      <div key={order._id} className="bg-red-50/30 p-5 sm:p-6 rounded-3xl border border-red-50 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all hover:bg-red-50/60">
                        {/* Top Header Row */}
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div>
                            <p className="text-xs text-red-950/40 font-bold uppercase tracking-wider mb-1">
                              Order: <span className="text-red-950/60 font-mono">{order._id.substring(order._id.length - 8)}</span>
                            </p>
                            <p className="text-sm font-bold text-red-950 mb-3">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                            <div className="flex flex-wrap gap-2">
                              <span className={`${payMeta.className} text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 border shadow-sm`}>
                                <span className="material-symbols-outlined text-[14px]">{payMeta.icon}</span> {payMeta.label}
                              </span>
                              <span className={`${fulfillMeta.className} text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 border shadow-sm`}>
                                <span className="material-symbols-outlined text-[14px]">{fulfillMeta.icon}</span> {fulfillMeta.label}
                              </span>

                            </div>
                          </div>

                          <div className="text-left md:text-right flex flex-col justify-between items-start md:items-end">
                            <div>
                              <p className="text-xs text-red-950/60 font-bold mb-1">{order.orderItems.length} Item(s)</p>
                              <p className="text-2xl font-black text-red-600">₹{order.totalPrice.toLocaleString('en-IN')}</p>
                            </div>

                            {/* Download Invoice Button */}
                            <button
                              onClick={() => handleDownloadInvoice(order._id)}
                              disabled={isInvoiceDownloading}
                              className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-red-950 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]">download</span>
                              {isInvoiceDownloading ? 'Downloading...' : 'Invoice'}
                            </button>
                          </div>
                        </div>

                        {/* RENDER ITEMS & RETURNS */}
                        <div className="mt-4 border-t border-red-100/60 pt-4 space-y-3">
                           {order.orderItems?.map((item, idx) => {
                              const isDelivered = order.orderStatus === 'delivered' || order.orderStatus === 'fulfilled';
                              const deliveryDate = order.statusTimestamps?.deliveredAt || order.deliveredAt || order.createdAt;
                              const daysSinceDelivery = (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 3600 * 24);
                              const returnStatus = item.returnStatus || 'Not Requested';
                              const isEligibleForReturn = isDelivered && daysSinceDelivery <= 7 && returnStatus === 'Not Requested';

                              return (
                                <div key={idx} className="flex flex-col sm:flex-row gap-4 sm:items-center bg-white p-3 rounded-2xl border border-red-50 shadow-sm relative">
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 bg-red-50 rounded-xl overflow-hidden shrink-0 border border-red-100">
                                      <img src={resolveImage(item.img || item.image)} alt={item.title} className="w-full h-full object-cover mix-blend-multiply" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-sm font-bold text-red-950 line-clamp-1">{item.title}</h4>
                                      {item.variant && <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-0.5">{item.variant}</p>}
                                      <p className="text-xs text-red-950/60 font-medium mt-1">Qty: {item.qty} x Rs {item.price}</p>
                                    </div>
                                    <div className="font-black text-red-950">Rs {item.price * item.qty}</div>
                                  </div>

                                  {/* Return Status / Button */}
                                  <div className="sm:w-auto w-full flex flex-col items-end gap-1">
                                      {returnStatus !== 'Not Requested' ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border flex items-center gap-1 w-max ${
                                            returnStatus === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                            returnStatus === 'Rejected' ? 'bg-red-950 text-white border-red-950' :
                                            'bg-orange-50 text-orange-600 border-orange-200'
                                          }`}>
                                              <span className="material-symbols-outlined text-[14px]">
                                                {returnStatus === 'Approved' ? 'check_circle' : returnStatus === 'Rejected' ? 'cancel' : 'pending_actions'}
                                              </span>
                                              {returnStatus}
                                          </span>
                                          {returnStatus === 'Rejected' && item.returnRejectionReason && (
                                            <p className="text-[10px] text-red-600 font-bold max-w-[160px] text-right leading-relaxed">
                                              "{item.returnRejectionReason}"
                                            </p>
                                          )}
                                        </div>
                                      ) : isEligibleForReturn ? (
                                        <button
                                          type="button"
                                          onClick={() => openReturnModal(order._id, item)}
                                          className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-orange-200 transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">assignment_return</span>
                                          Report Damage
                                        </button>
                                      ) : isDelivered && daysSinceDelivery > 7 ? (
                                        <span className="text-[10px] text-red-950/30 font-bold">Return window closed</span>
                                      ) : null}
                                  </div>
                                </div>
                              );
                           })}
                        </div>

                        {/* FIXED: Delivery Timeline UI for Mobile */}
                        <div className="mt-4 border-t border-red-100/60 pt-4 sm:pt-6">
                          <div className="relative flex justify-between items-start sm:items-center w-full px-1 sm:px-2">
                            {/* Static Background Track */}
                            <div className="absolute left-3 right-3 top-2.5 sm:top-3 -translate-y-1/2 h-[3px] sm:h-1 bg-red-100 rounded-full z-0"></div>

                            {/* Dynamic Progress Track */}
                            <div
                              className="absolute left-3 top-2.5 sm:top-3 -translate-y-1/2 h-[3px] sm:h-1 bg-red-600 rounded-full z-0 transition-all duration-700 ease-in-out"
                              style={{
                                width: `calc(${['created', 'confirmed', 'packed', 'dispatched', 'delivered', 'fulfilled'].indexOf(order.orderStatus) >= 4 ? 100 :
                                    (['created', 'confirmed', 'packed', 'dispatched'].indexOf(order.orderStatus) / 4) * 100
                                  }% - 24px)`
                              }}
                            ></div>

                            {/* Timeline Nodes */}
                            {[
                              { id: 'created', label: 'Placed', date: order.createdAt },
                              { id: 'confirmed', label: 'Confirmed', date: order.statusTimestamps?.confirmedAt },
                              { id: 'packed', label: 'Packed', date: order.statusTimestamps?.packedAt },
                              { id: 'dispatched', label: 'Dispatched', date: order.statusTimestamps?.dispatchedAt },
                              { id: 'delivered', label: 'Delivered', date: order.statusTimestamps?.deliveredAt || (order.orderStatus === 'fulfilled' ? new Date() : null) }
                            ].map((step, idx) => {
                              const currentIdx = ['created', 'confirmed', 'packed', 'dispatched', 'delivered'].indexOf(
                                order.orderStatus === 'fulfilled' ? 'delivered' : order.orderStatus
                              );
                              const isCompleted = idx <= (currentIdx === -1 ? 0 : currentIdx);

                              return (
                                <div key={step.id} className="flex flex-col items-center relative z-10 w-12 sm:w-16">
                                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border-2 sm:border-[3px] transition-colors duration-500 bg-white shadow-sm
                                     ${isCompleted ? 'border-red-600 text-red-600' : 'border-red-100 text-transparent'}
                                   `}>
                                    {isCompleted && <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-red-600 rounded-full"></div>}
                                  </div>
                                  <div className={`text-[9px] sm:text-xs font-bold text-center mt-1 sm:mt-2 leading-tight ${isCompleted ? 'text-red-950' : 'text-red-950/40'}`}>
                                    {step.label}
                                    {/* Hides the date on tiny mobile screens to prevent overlap */}
                                    {step.date && <div className="hidden sm:block text-[9px] font-medium text-red-950/40 mt-0.5">{new Date(step.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Active Courier Link Box */}
                          {(order.orderStatus === 'dispatched' || order.orderStatus === 'delivered' || order.orderStatus === 'fulfilled') && (order.courier?.trackingLink || order.courier?.name) && (
                            <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white shadow-sm text-red-600 rounded-xl flex items-center justify-center border border-red-100">
                                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                                </div>
                                <div>
                                  <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-0.5">Shipping Partner</p>
                                  <p className="font-bold text-red-950">{order.courier.name || 'Standard Courier'}</p>
                                </div>
                              </div>

                              {order.courier.trackingLink ? (
                                <a
                                  href={order.courier.trackingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full sm:w-auto bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                                >
                                  Track Package <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                </a>
                              ) : (
                                <span className="w-full sm:w-auto bg-white text-red-600 px-5 py-2.5 rounded-xl font-bold text-sm text-center border border-red-100 shadow-sm">
                                  Tracking link not available
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-[60px] text-red-200 mb-4">shopping_cart</span>
                  <p className="text-red-950/60 font-bold mb-4">No orders yet!</p>
                  <Link to="/shop" className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 transition-colors font-bold rounded-full">Start Shopping</Link>
                </div>
              )}
            </div>
          )}

          {/* USER MESSAGES TAB (Admin Only) */}
          {activeTab === 'messages' && isAdmin && (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-sm border border-red-50 min-h-[400px]">
              <h1 className="text-3xl font-black text-red-950 mb-8 border-b border-red-50 pb-4">Customer Messages</h1>
              {loadingMessages ? (
                <div className="flex justify-center py-10"><p className="font-bold text-red-950/60">Loading messages...</p></div>
              ) : messages && messages.length > 0 ? (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div key={msg._id} className="bg-red-50/50 p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col gap-3 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h4 className="font-bold text-red-950 text-lg">{msg.name}</h4>
                          <a href={`mailto:${msg.email}`} className="text-sm font-medium text-red-600 hover:underline">{msg.email}</a>
                        </div>
                        <span className="text-xs font-bold text-red-950/50 bg-white px-3 py-1 rounded-full border border-red-100">
                          {new Date(msg.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-red-50 shadow-sm">
                        <p className="text-red-950/80 font-medium text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-[60px] text-red-200 mb-4">inbox</span>
                  <p className="text-red-950/60 font-bold mb-4">No messages received yet.</p>
                </div>
              )}
            </div>
          )}

          {/* EDIT PROFILE TAB */}
          {activeTab === 'edit' && (
            <div className="bg-white/80 backdrop-blur-md p-4 sm:p-8 rounded-[2.5rem] shadow-sm border border-red-50 min-h-[400px]">
              <h1 className="text-2xl sm:text-3xl font-black text-red-950 mb-6 sm:mb-8 border-b border-red-50 pb-4">Edit Profile</h1>

              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-red-950/70 ml-1">Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="w-full bg-red-50/50 p-4 border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none font-medium text-red-950 transition-all shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-red-950/70 ml-1">Mobile / Email</label>
                    <input type="text" value={profile?.mobileNumber ? `+91 ${profile.mobileNumber}` : profile?.email || ''} disabled className="w-full bg-red-50/30 text-red-950/40 p-4 border border-red-50 rounded-2xl outline-none font-medium cursor-not-allowed shadow-inner" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-red-950">Saved Addresses</h3>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm">{addresses.length} / 3</span>
                  </div>

                  {addresses.length === 0 && <p className="text-red-950/40 text-sm italic mb-4">No addresses saved yet.</p>}

                  <div className="space-y-6">
                    {addresses.map((address, index) => (
                      <div key={index} className="bg-white p-5 rounded-3xl border border-red-100 relative shadow-sm">
                        <div className="absolute top-4 right-4">
                          <button type="button" onClick={() => handleRemoveAddress(index)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-full shadow-sm border border-red-100 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                        <h4 className="font-bold text-red-950/70 mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-400 text-[18px]">home_pin</span> Address #{index + 1}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input type="text" placeholder="Flat / Block No." value={address.flatNumber} onChange={(e) => handleAddressChange(index, 'flatNumber', e.target.value)} required className="w-full bg-red-50/50 p-3 rounded-xl outline-none border border-red-100 shadow-sm text-sm font-medium text-red-950 focus:ring-2 focus:ring-red-600" />
                          <input type="text" placeholder="Street / Locality" value={address.street} onChange={(e) => handleAddressChange(index, 'street', e.target.value)} required className="w-full bg-red-50/50 p-3 rounded-xl outline-none border border-red-100 shadow-sm text-sm font-medium text-red-950 focus:ring-2 focus:ring-red-600" />
                          <input type="text" placeholder="Landmark (Optional)" value={address.landmark} onChange={(e) => handleAddressChange(index, 'landmark', e.target.value)} className="w-full bg-red-50/50 p-3 rounded-xl outline-none border border-red-100 shadow-sm text-sm font-medium text-red-950 focus:ring-2 focus:ring-red-600" />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="City" value={address.city} onChange={(e) => handleAddressChange(index, 'city', e.target.value)} required className="w-full bg-red-50/50 p-3 rounded-xl outline-none border border-red-100 shadow-sm text-sm font-medium text-red-950 focus:ring-2 focus:ring-red-600" />
                            <input type="text" placeholder="Pincode" value={address.pincode} onChange={(e) => handleAddressChange(index, 'pincode', e.target.value)} pattern="[0-9]{6}" title="Please enter a valid 6-digit pincode" maxLength="6" required className="w-full bg-red-50/50 p-3 rounded-xl outline-none border border-red-100 shadow-sm text-sm font-medium text-red-950 focus:ring-2 focus:ring-red-600" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {addresses.length < 3 && (
                    <button type="button" onClick={handleAddAddress} className="mt-4 text-sm font-bold text-red-600 flex items-center gap-1 hover:bg-red-50 bg-white px-4 py-2 rounded-full transition-colors border border-red-100 shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">add_circle</span> Add New Address
                    </button>
                  )}
                </div>

                <button type="submit" disabled={isUpdating} className="w-full py-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                  {isUpdating ? 'Saving...' : 'Save Profile Details'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Return request modal */}
      {returnModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-red-950 mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">assignment_return</span>
              Report Product Damage
            </h3>
            <p className="text-sm text-red-950/50 font-medium mb-6">
              {returnModal.item?.title} — upload photos and/or a video showing the damage.
            </p>

            <div className="flex gap-2 mb-4">
              {['return', 'exchange'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReturnType(type)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${
                    returnType === type
                      ? 'bg-red-950 text-white border-red-950'
                      : 'bg-red-50 text-red-950/60 border-red-100 hover:border-red-200'
                  }`}
                >
                  {type === 'return' ? 'Return' : 'Exchange'}
                </button>
              ))}
            </div>

            <label className="text-sm font-bold text-red-950/70 ml-1 block mb-2">Describe the damage</label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Box was crushed, product arrived broken..."
              className="w-full bg-red-50/50 p-4 rounded-2xl border border-red-100 focus:ring-2 focus:ring-red-600 outline-none resize-none font-medium text-sm text-red-950 h-24 mb-4"
            />

            <label className="text-sm font-bold text-red-950/70 ml-1 flex justify-between items-center mb-2">
              <span>Upload proof (photos &amp; video)</span>
              <span className="text-xs font-medium text-red-950/40">Max 5 files</span>
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleReturnProofUpload}
              disabled={isUploadingProof || returnProofMedia.length >= 5}
              className="w-full bg-red-50/50 p-3 border border-red-100 rounded-2xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-red-600 file:text-white cursor-pointer disabled:opacity-50 mb-2"
            />
            {isUploadingProof && <p className="text-xs text-red-600 font-bold mb-2">Uploading...</p>}

            {returnProofMedia.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {returnProofMedia.map((url, idx) => (
                  <div key={idx} className="relative shrink-0">
                    {isVideoUrl(url) ? (
                      <video src={url} className="w-20 h-20 object-cover rounded-xl border border-red-100" muted />
                    ) : (
                      <img src={url} alt={`Proof ${idx + 1}`} className="w-20 h-20 object-cover rounded-xl border border-red-100" />
                    )}
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-800"
                      onClick={() => setReturnProofMedia((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeReturnModal}
                className="flex-1 py-3 bg-red-50 text-red-950/60 font-black rounded-xl hover:bg-red-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReturn || isUploadingProof || !returnReason.trim() || returnProofMedia.length === 0}
                onClick={handleSubmitReturn}
                className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
              >
                {isSubmittingReturn ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
};

export default Profile;
