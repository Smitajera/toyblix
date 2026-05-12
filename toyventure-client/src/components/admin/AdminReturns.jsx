import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { resolveImage } from './utils/adminHelpers';

const AdminReturns = ({ allReturnRequests, pendingReturnsCount, updateItemReturnStatus, isUpdatingReturn }) => {
  const [rejectModal, setRejectModal] = useState({ isOpen: false, orderId: null, itemId: null, reason: '' });

  return (
    <>
      <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
        {/* Header */}
        <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
          <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600 text-[28px]">assignment_return</span>
            Return &amp; Exchange Requests
          </h2>
          {pendingReturnsCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-sm font-black px-4 py-1.5 rounded-full border border-orange-200">
              {pendingReturnsCount} Pending
            </span>
          )}
        </div>

        {allReturnRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-[64px] text-red-100">assignment_return</span>
            <p className="text-red-950/40 font-bold text-lg">No return or exchange requests yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-red-50">
            {allReturnRequests.map(reqItem => {
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
                      <p className="text-xs text-red-950/40 font-medium">
                        {order.user?.name || order.shippingDetails?.fullName} &bull; {new Date(reqItem.returnRequestedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Type + Reason */}
                  <div className="flex-1 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border mb-2
                      ${reqItem.returnStatus === 'Approved' ? 'bg-green-50 text-green-700 border-green-200'
                      : reqItem.returnStatus === 'Rejected' ? 'bg-red-950 text-white border-red-950'
                      : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
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
                          disabled={isUpdatingReturn}
                          onClick={async () => {
                            try {
                              await updateItemReturnStatus({ id: order._id, itemId: reqItem._id, status: 'Approved' }).unwrap();
                              toast.success('Return/Exchange approved!');
                            } catch (err) { toast.error(err?.data?.message || 'Failed to approve'); }
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl transition-colors shadow-sm disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span> Approve
                        </button>
                        <button
                          disabled={isUpdatingReturn}
                          onClick={() => setRejectModal({ isOpen: true, orderId: order._id, itemId: reqItem._id, reason: '' })}
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

      {/* Rejection Reason Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
            <h3 className="text-xl font-black text-red-950 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">cancel</span>
              Reject Request
            </h3>
            <p className="text-sm text-red-950/50 font-medium mb-6">You must provide a reason. This will be shown to the customer.</p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
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
    </>
  );
};

export default AdminReturns;
