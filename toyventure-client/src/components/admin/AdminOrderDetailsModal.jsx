import React from 'react';
import { resolveImage, getOrderItemProductId } from './utils/adminHelpers';

const AdminOrderDetailsModal = ({ order, products = [], onClose, onUpdateReturnStatus, isUpdatingReturn }) => {
  React.useEffect(() => {
    if (order) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [order]);

  if (!order) return null;

  const getOrderItemImage = (item) => {
    const productId = getOrderItemProductId(item);
    const match = products.find(
      (p) => String(p._id) === String(productId) || p.title === item.title
    );
    return resolveImage(
      item.image || item.img ||
      item.product?.img || item.product?.images?.[0] ||
      item._id?.img   || item._id?.images?.[0] ||
      match?.img      || match?.images?.[0]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md fade-in"
      style={{ alignItems: 'flex-start', paddingTop: '10vh' }}
    >
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-red-50 flex items-center justify-between bg-red-50/30">
          <h2 className="text-xl font-black text-red-950 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">receipt_long</span>
            Order #{String(order._id).slice(-8)}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full transition-colors">
            <span className="material-symbols-outlined text-red-950/40">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
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
                {order.shippingDetails?.city} - {order.shippingDetails?.pincode}
              </p>
            </div>
          </div>

          {/* Payment Info */}
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
              <p className="text-xs text-red-600 mt-2 font-bold whitespace-pre-wrap">Error: {order.paymentFailureReason}</p>
            )}
          </div>

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
                      {item.variant && (
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-0.5">{item.variant}</p>
                      )}
                      <p className="text-xs text-red-950/60 font-medium mt-1">Qty: {item.qty} x Rs {item.price}</p>
                    </div>
                    <div className="font-black text-red-950">Rs {item.price * item.qty}</div>
                  </div>

                  {/* Return status */}
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

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-red-100 space-y-1.5 flex flex-col items-end text-sm font-bold text-red-950">
              {order.deliveryFee > 0 && (
                <p className="w-full max-w-[200px] flex justify-between">
                  <span className="text-red-950/50">Delivery Fee:</span>
                  <span>Rs {order.deliveryFee}</span>
                </p>
              )}
              {order.giftWrapFee > 0 && (
                <p className="w-full max-w-[200px] flex justify-between">
                  <span className="text-red-950/50">Gift Wrap Fee:</span>
                  <span>Rs {order.giftWrapFee}</span>
                </p>
              )}
              <p className="w-full max-w-[200px] flex justify-between text-lg pt-1 border-t border-red-50 mt-1">
                <span className="text-red-950/50 font-black">Total Paid:</span>
                <span className="font-black text-red-600">Rs {order.totalPrice}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailsModal;
