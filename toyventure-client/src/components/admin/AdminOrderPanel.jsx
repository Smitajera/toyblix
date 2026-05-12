import React, { useState, useMemo } from 'react';
import { useUpdateOrderStatusMutation, useProcessRefundMutation } from '../../features/api/apiSlice';
import toast from 'react-hot-toast';

const AdminOrderPanel = ({ orders, isUpdating, onViewDetails }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const [updateStatus] = useUpdateOrderStatusMutation();
  const [processRefund, { isLoading: isRefunding }] = useProcessRefundMutation();

  const tabs = [
    { id: 'all', label: 'All Orders', icon: 'list_alt' },
    { id: 'pending', label: 'Pending', icon: 'pending_actions' },
    { id: 'confirmed', label: 'Confirmed', icon: 'verified' },
    { id: 'dispatched', label: 'Dispatched', icon: 'local_shipping' },
    { id: 'delivered', label: 'Delivered', icon: 'check_circle' },
    { id: 'cancelled', label: 'Cancelled', icon: 'cancel' }
  ];

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const matchesTab = activeTab === 'all' || order.orderStatus === activeTab;
      const matchesSearch = 
        order._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.shippingDetails?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchQuery]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateStatus({ id, status }).unwrap();
      toast.success(`Order marked as ${status}`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update status');
    }
  };

  const handleRefund = async (id) => {
    if (window.confirm('Process automated refund via Razorpay for this order?')) {
      try {
        await processRefund(id).unwrap();
        toast.success('Refund processed successfully!');
      } catch (err) {
        toast.error(err?.data?.message || 'Refund failed');
      }
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'dispatched': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'delivered': return 'bg-green-50 text-green-700 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
      case 'pending_payment': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
      {/* Header & Search */}
      <div className="p-8 border-b border-red-50/50 bg-red-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600 text-[28px]">receipt_long</span>
            Order Management
          </h2>
          <p className="text-sm font-bold text-red-950/40 mt-1">Manage fulfillment and track order status</p>
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-red-950/30">search</span>
          <input
            type="text"
            placeholder="Search by ID or Customer..."
            className="pl-12 pr-6 py-3.5 bg-white border-2 border-red-50 rounded-2xl w-full md:w-[350px] text-sm font-bold text-red-950 focus:border-red-500 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-red-50/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-red-600 text-red-600' 
                : 'border-transparent text-red-950/40 hover:text-red-950/60'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            {tab.label}
            <span className="ml-1 bg-red-50 px-2 py-0.5 rounded-full text-[10px]">
              {orders?.filter(o => tab.id === 'all' || o.orderStatus === tab.id).length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-50/30 border-b border-red-50">
              <th className="p-5 pl-8 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Order Info</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Customer</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Amount</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Status</th>
              <th className="p-5 pr-8 text-right text-[10px] font-black text-red-950/40 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <tr key={order._id} className="border-b border-red-50/50 hover:bg-red-50/10 transition-colors group">
                  <td className="p-5 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-black text-xs">
                        {order.paymentMethod === 'cod' ? 'COD' : 'PRE'}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-red-950">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-red-950/40">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-red-950">{order.user?.name || order.shippingDetails?.fullName}</p>
                    <p className="text-[10px] font-bold text-red-950/40">{order.shippingDetails?.city}, {order.shippingDetails?.state}</p>
                  </td>
                  <td className="p-5">
                    <p className="font-black text-red-950">₹{order.totalPrice}</p>
                    {order.pointsUsed > 0 && (
                      <p className="text-[10px] font-bold text-teal-600">-{order.pointsUsed} Points Used</p>
                    )}
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(order.orderStatus)}`}>
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-5 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewDetails(order)}
                        className="p-2 hover:bg-red-50 text-red-950/40 hover:text-red-600 rounded-lg transition-colors group/btn"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>

                      {order.orderStatus === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                          className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-700 transition-all shadow-md"
                        >
                          Confirm
                        </button>
                      )}
                      {order.orderStatus === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'dispatched')}
                          className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-600 transition-all shadow-md"
                        >
                          Dispatch
                        </button>
                      )}
                      {order.orderStatus === 'dispatched' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'delivered')}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-green-700 transition-all shadow-md"
                        >
                          Deliver
                        </button>
                      )}
                      {order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                          className="bg-white border border-red-100 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-50 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                      {order.paymentStatus === 'paid' && order.refundStatus !== 'processed' && (order.orderStatus === 'cancelled') && (
                         <button
                          onClick={() => handleRefund(order._id)}
                          disabled={isRefunding}
                          className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-100 transition-all"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-[64px] text-red-100">receipt_long</span>
                    <p className="text-xl font-black text-red-950/20">No orders found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrderPanel;
