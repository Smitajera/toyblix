import React, { useState } from 'react';
import { resolveImage, getOrderItemProductId } from './utils/adminHelpers';
import { useUpdateOrderStatusMutation } from '../../features/api/apiSlice';
import toast from 'react-hot-toast';

/* ── Helpers ─────────────────────────────────────────────────────────── */
const STATUS_TIMELINE = [
  { key: 'pending',   label: 'Order Placed',      icon: 'shopping_bag' },
  { key: 'confirmed', label: 'Confirmed',          icon: 'verified' },
  { key: 'dispatched',label: 'Dispatched',         icon: 'local_shipping' },
  { key: 'delivered', label: 'Delivered',          icon: 'check_circle' },
];

const STATUS_ORDER = ['pending', 'confirmed', 'dispatched', 'delivered'];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : null;

/* ── Component ───────────────────────────────────────────────────────── */
const AdminOrderDetailsModal = ({ order, products = [], onClose, onUpdateReturnStatus, isUpdatingReturn }) => {
  const [activeSection, setActiveSection] = useState('details'); // details | timeline
  const [trackingId,    setTrackingId]    = useState('');
  const [courierName,   setCourierName]   = useState('');
  const [savingTracking, setSavingTracking] = useState(false);

  const [updateOrderStatus] = useUpdateOrderStatusMutation();

  React.useEffect(() => {
    if (order) {
      setTrackingId(order.trackingLink || '');
      setCourierName(order.courierName || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [order]);

  if (!order) return null;

  const getOrderItemImage = (item) => {
    const productId = getOrderItemProductId(item);
    const match = products.find(p => String(p._id) === String(productId) || p.title === item.title);
    return resolveImage(
      item.image || item.img ||
      item.product?.img || item.product?.images?.[0] ||
      match?.img || match?.images?.[0]
    );
  };

  const isCancelled = order.orderStatus === 'cancelled';
  const currentIdx  = isCancelled ? -1 : STATUS_ORDER.indexOf(order.orderStatus);

  const handleSaveTracking = async () => {
    if (!trackingId.trim()) return toast.error('Enter a tracking ID / AWB number');
    setSavingTracking(true);
    try {
      await updateOrderStatus({
        id: order._id,
        status: order.orderStatus,
        trackingLink: trackingId.trim(),
        courierName: courierName.trim(),
      }).unwrap();
      toast.success('Tracking info saved!');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save tracking info');
    } finally {
      setSavingTracking(false);
    }
  };

  /* ── Render ── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-md fade-in"
      style={{ paddingTop: '8vh' }}
    >
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-red-50 flex items-center justify-between bg-red-50/30 shrink-0">
          <div>
            <h2 className="text-xl font-black text-red-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">receipt_long</span>
              Order #{String(order._id).slice(-8).toUpperCase()}
            </h2>
            <p className="text-xs font-bold text-red-950/40 mt-0.5">
              {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full transition-colors">
            <span className="material-symbols-outlined text-red-950/40">close</span>
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-red-50 shrink-0">
          {[
            { id: 'details',  label: 'Order Details', icon: 'list_alt' },
            { id: 'timeline', label: 'Activity Timeline', icon: 'timeline' },
            { id: 'tracking', label: 'Tracking / AWB', icon: 'local_shipping' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black transition-all border-b-2 ${
                activeSection === s.id
                  ? 'border-red-600 text-red-600 bg-red-50/30'
                  : 'border-transparent text-red-950/40 hover:text-red-950/70'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6">

          {/* ── DETAILS TAB ── */}
          {activeSection === 'details' && (
            <>
              {/* Customer + Shipping */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50 shadow-sm">
                  <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Customer Details</p>
                  <p className="font-bold text-red-950">{order.shippingDetails?.fullName || order.user?.name}</p>
                  <p className="text-sm font-medium text-red-950/60 mt-0.5">{order.shippingDetails?.phone || order.user?.mobileNumber}</p>
                </div>
                <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50 shadow-sm">
                  <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">Shipping Address</p>
                  <p className="font-bold text-red-950 text-sm mt-0.5">
                    {order.shippingDetails?.flatNumber}, {order.shippingDetails?.street}
                  </p>
                  {order.shippingDetails?.landmark && (
                    <p className="text-sm font-medium text-red-950/60">{order.shippingDetails.landmark}</p>
                  )}
                  <p className="text-sm font-medium text-red-950/60">
                    {order.shippingDetails?.city} – {order.shippingDetails?.pincode}
                  </p>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50 shadow-sm">
                <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-2">Payment Info</p>
                <div className="flex items-center gap-4 text-sm font-bold text-red-950 flex-wrap">
                  <span className="bg-white px-3 py-1 rounded-md shadow-sm capitalize border border-red-50 text-red-600">
                    {order.paymentMethod || 'Unknown'} Route
                  </span>
                  <span className="bg-white px-3 py-1 rounded-md shadow-sm border border-red-50 uppercase tracking-wider text-[10px]">
                    Status: {order.paymentStatus || 'pending'}
                  </span>
                  {order.isGiftWrapped && (
                    <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-md shadow-sm font-black text-[10px] flex items-center gap-1 border border-amber-200 uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">redeem</span> Gift Wrap!
                    </span>
                  )}
                </div>
                {order.paymentFailureReason && (
                  <p className="text-xs text-red-600 mt-2 font-bold">{order.paymentFailureReason}</p>
                )}
              </div>

              {/* Admin Notes */}
              {order.adminNotes && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-amber-700/70 uppercase tracking-widest mb-1">Admin Notes</p>
                  <p className="text-sm font-medium text-amber-900">{order.adminNotes}</p>
                </div>
              )}

              {/* Order Items */}
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
                          <p className="text-xs text-red-950/60 font-medium mt-1">Qty: {item.qty} × ₹{item.price}</p>
                        </div>
                        <div className="font-black text-red-950">₹{item.price * item.qty}</div>
                      </div>

                      {item.returnStatus && item.returnStatus !== 'Not Requested' && (
                        <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex flex-col gap-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                              item.returnStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                              item.returnStatus === 'Rejected' ? 'bg-red-200 text-red-800' :
                              'bg-orange-100 text-orange-700'}`}>
                              {item.returnStatus}
                            </span>
                            {item.returnRequestedAt && (
                              <span className="text-[10px] font-bold text-red-950/40">
                                {new Date(item.returnRequestedAt).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-red-950/70 bg-white p-2 rounded-lg border border-red-50 italic">
                            "{item.returnReason}"
                          </p>
                          {(item.returnStatus === 'Return Requested' || item.returnStatus === 'Exchange Requested') && (
                            <div className="flex gap-2 justify-end mt-1">
                              <button
                                disabled={isUpdatingReturn}
                                onClick={() => onUpdateReturnStatus(order._id, item._id, 'Rejected')}
                                className="text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                              >Reject</button>
                              <button
                                disabled={isUpdatingReturn}
                                onClick={() => onUpdateReturnStatus(order._id, item._id, 'Approved')}
                                className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                              >Approve</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-red-100 space-y-1.5 flex flex-col items-end text-sm font-bold text-red-950">
                  {order.deliveryFee > 0 && (
                    <p className="w-full max-w-[200px] flex justify-between">
                      <span className="text-red-950/50">Delivery Fee:</span>
                      <span>₹{order.deliveryFee}</span>
                    </p>
                  )}
                  {order.giftWrapFee > 0 && (
                    <p className="w-full max-w-[200px] flex justify-between">
                      <span className="text-red-950/50">Gift Wrap:</span>
                      <span>₹{order.giftWrapFee}</span>
                    </p>
                  )}
                  <p className="w-full max-w-[200px] flex justify-between text-lg pt-1 border-t border-red-50 mt-1">
                    <span className="text-red-950/50 font-black">Total Paid:</span>
                    <span className="font-black text-red-600">₹{order.totalPrice}</span>
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── TIMELINE TAB ── */}
          {activeSection === 'timeline' && (
            <div>
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-6">Order Activity Log</p>

              {isCancelled ? (
                <div className="flex items-center gap-4 bg-red-50 rounded-2xl p-5 border border-red-100">
                  <span className="material-symbols-outlined text-red-500 text-[32px]">cancel</span>
                  <div>
                    <p className="font-black text-red-700">Order Cancelled</p>
                    <p className="text-sm text-red-950/50 mt-0.5">This order was cancelled before fulfilment.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-red-100" />

                  <div className="space-y-6">
                    {STATUS_TIMELINE.map((step, idx) => {
                      const done    = currentIdx >= idx;
                      const current = currentIdx === idx;

                      /* Timestamps heuristic – use real fields when available */
                      let timestamp = null;
                      if (idx === 0) timestamp = fmtDate(order.createdAt);
                      if (idx === 1) timestamp = fmtDate(order.confirmedAt || (done && order.updatedAt));
                      if (idx === 2) timestamp = fmtDate(order.dispatchedAt || (done && order.updatedAt));
                      if (idx === 3) timestamp = fmtDate(order.deliveredAt || (done && order.updatedAt));

                      return (
                        <div key={step.key} className="relative flex items-start gap-5 pl-14">
                          {/* Circle */}
                          <div className={`absolute left-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                            done
                              ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200'
                              : 'bg-white border-red-100 text-red-200'
                          } ${current ? 'ring-4 ring-red-100' : ''}`}>
                            <span className="material-symbols-outlined text-[22px]">{step.icon}</span>
                          </div>

                          {/* Content */}
                          <div className={`flex-1 pb-1 ${done ? '' : 'opacity-40'}`}>
                            <div className="flex items-center justify-between gap-4">
                              <p className={`font-black text-sm ${done ? 'text-red-950' : 'text-red-950/40'}`}>
                                {step.label}
                                {current && (
                                  <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                                    Current
                                  </span>
                                )}
                              </p>
                              {timestamp && done && (
                                <span className="text-[11px] font-bold text-red-950/40 whitespace-nowrap">{timestamp}</span>
                              )}
                            </div>

                            {/* Extra info for dispatched */}
                            {idx === 2 && done && (order.trackingLink || order.courierName) && (
                              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500 text-[16px]">package_2</span>
                                <div>
                                  {order.courierName && <p className="text-xs font-bold text-blue-700">{order.courierName}</p>}
                                  {order.trackingLink && (
                                    <p className="text-xs font-mono text-blue-600">AWB: {order.trackingLink}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {!done && (
                              <p className="text-[11px] text-red-950/30 mt-0.5 font-medium">Pending</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TRACKING TAB ── */}
          {activeSection === 'tracking' && (
            <div className="space-y-5">
              <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest">
                Courier & Tracking Info
              </p>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 font-medium flex gap-3">
                <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
                <p>Enter the courier name and AWB / tracking number after dispatching this order. It will appear in the Activity Timeline.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest block mb-1.5">
                    Courier Partner
                  </label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={e => setCourierName(e.target.value)}
                    placeholder="e.g. Delhivery, Blue Dart, DTDC..."
                    className="w-full px-4 py-3 border-2 border-red-100 rounded-xl text-sm font-bold text-red-950 focus:border-red-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest block mb-1.5">
                    AWB / Tracking Number
                  </label>
                  <input
                    type="text"
                    value={trackingId}
                    onChange={e => setTrackingId(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full px-4 py-3 border-2 border-red-100 rounded-xl text-sm font-mono font-bold text-red-950 focus:border-red-500 outline-none transition-all"
                  />
                </div>

                {/* Current saved tracking */}
                {(order.trackingLink || order.courierName) && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <div>
                      <p className="text-xs font-black text-green-700">Currently saved:</p>
                      {order.courierName && <p className="text-xs text-green-600">{order.courierName}</p>}
                      {order.trackingLink && <p className="text-xs font-mono text-green-600">AWB: {order.trackingLink}</p>}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveTracking}
                  disabled={savingTracking}
                  className="w-full bg-red-950 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {savingTracking ? 'Saving...' : 'Save Tracking Info'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailsModal;
