import React, { useState, useMemo } from 'react';
import { useUpdateOrderStatusMutation, useProcessRefundMutation } from '../../features/api/apiSlice';
import toast from 'react-hot-toast';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const AdminOrderPanel = ({ orders, isUpdating, onViewDetails }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // all | today | week | month
  const [paymentFilter, setPaymentFilter] = useState('all'); // all | cod | prepaid
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [updateStatus] = useUpdateOrderStatusMutation();
  const [processRefund, { isLoading: isRefunding }] = useProcessRefundMutation();

  const tabs = [
    { id: 'all',       label: 'All Orders',  icon: 'list_alt' },
    { id: 'pending',   label: 'Pending',      icon: 'pending_actions' },
    { id: 'confirmed', label: 'Confirmed',    icon: 'verified' },
    { id: 'dispatched',label: 'Dispatched',   icon: 'local_shipping' },
    { id: 'delivered', label: 'Delivered',    icon: 'check_circle' },
    { id: 'cancelled', label: 'Cancelled',    icon: 'cancel' },
  ];

  const columns = [
    { key: 'createdAt', label: 'Date' },
    { key: 'totalPrice', label: 'Amount' },
    { key: 'orderStatus', label: 'Status' },
  ];

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  };

  const getDateStart = () => {
    const now = new Date();
    if (dateRange === 'today') { now.setHours(0,0,0,0); return now; }
    if (dateRange === 'week')  { now.setDate(now.getDate() - 7); return now; }
    if (dateRange === 'month') { now.setDate(now.getDate() - 30); return now; }
    return null;
  };

  const filtered = useMemo(() => {
    if (!orders) return [];
    const dateStart = getDateStart();
    return orders.filter(o => {
      const matchTab = activeTab === 'all' 
        ? true 
        : activeTab === 'pending' 
          ? (o.orderStatus === 'pending' || o.orderStatus === 'pending_payment')
          : o.orderStatus === activeTab;
      const matchSearch = o._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.shippingDetails?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.shippingDetails?.phone || '').includes(searchQuery);
      const matchDate   = !dateStart || new Date(o.createdAt) >= dateStart;
      const matchPay    = paymentFilter === 'all' ||
        (paymentFilter === 'cod' && o.paymentMethod === 'cod') ||
        (paymentFilter === 'prepaid' && o.paymentMethod !== 'cod');
      return matchTab && matchSearch && matchDate && matchPay;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, activeTab, searchQuery, dateRange, paymentFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortKey], valB = b[sortKey];
      if (sortKey === 'createdAt') { valA = new Date(valA); valB = new Date(valB); }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

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
      case 'confirmed':      return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'dispatched':     return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'delivered':      return 'bg-green-50 text-green-700 border-green-100';
      case 'cancelled':      return 'bg-red-50 text-red-700 border-red-100';
      case 'pending_payment':return 'bg-amber-50 text-amber-700 border-amber-100';
      default:               return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="material-symbols-outlined text-[14px] text-red-950/20">unfold_more</span>;
    return <span className="material-symbols-outlined text-[14px] text-red-600">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>;
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
      {/* ── Header ── */}
      <div className="p-8 border-b border-red-50/50 bg-red-50/20 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600 text-[28px]">receipt_long</span>
              Order Management
            </h2>
            <p className="text-sm font-bold text-red-950/40 mt-1">
              {filtered.length} order{filtered.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-red-950/30">search</span>
            <input
              type="text"
              placeholder="Search ID, customer, phone..."
              className="pl-12 pr-6 py-3.5 bg-white border-2 border-red-50 rounded-2xl w-full md:w-[320px] text-sm font-bold text-red-950 focus:border-red-500 transition-all outline-none"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-red-950/40">date_range</span>
            {[
              { id: 'all',   label: 'All time' },
              { id: 'today', label: 'Today' },
              { id: 'week',  label: '7 Days' },
              { id: 'month', label: '30 Days' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => { setDateRange(d.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${dateRange === d.id ? 'bg-red-950 text-white' : 'bg-red-50 text-red-950/50 hover:text-red-950'}`}
              >{d.label}</button>
            ))}
          </div>

          <div className="h-6 w-px bg-red-100 mx-1" />

          {/* Payment filter */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-red-950/40">credit_card</span>
            {[
              { id: 'all',     label: 'All' },
              { id: 'cod',     label: 'COD' },
              { id: 'prepaid', label: 'Prepaid' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => { setPaymentFilter(p.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${paymentFilter === p.id ? 'bg-red-950 text-white' : 'bg-red-50 text-red-950/50 hover:text-red-950'}`}
              >{p.label}</button>
            ))}
          </div>

          {/* Page size */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold text-red-950/40">Show</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-red-100 rounded-lg px-2 py-1 text-xs font-black text-red-950 outline-none bg-white"
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs font-bold text-red-950/40">per page</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-8 pt-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-red-50/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-red-950/40 hover:text-red-950/60'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            {tab.label}
            <span className="ml-1 bg-red-50 px-2 py-0.5 rounded-full text-[10px]">
              {orders?.filter(o => tab.id === 'all' ? true : tab.id === 'pending' ? (o.orderStatus === 'pending' || o.orderStatus === 'pending_payment') : o.orderStatus === tab.id).length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-50/30 border-b border-red-50">
              <th className="p-5 pl-8 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Order Info</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Customer</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest cursor-pointer select-none hover:text-red-600 transition-colors"
                onClick={() => toggleSort('totalPrice')}>
                <span className="flex items-center gap-1">Amount <SortIcon col="totalPrice" /></span>
              </th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest cursor-pointer select-none hover:text-red-600 transition-colors"
                onClick={() => toggleSort('orderStatus')}>
                <span className="flex items-center gap-1">Status <SortIcon col="orderStatus" /></span>
              </th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest cursor-pointer select-none hover:text-red-600 transition-colors"
                onClick={() => toggleSort('createdAt')}>
                <span className="flex items-center gap-1">Date <SortIcon col="createdAt" /></span>
              </th>
              <th className="p-5 pr-8 text-right text-[10px] font-black text-red-950/40 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map(order => (
                <tr key={order._id} className="border-b border-red-50/50 hover:bg-red-50/10 transition-colors group">
                  <td className="p-5 pl-8">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${order.paymentMethod === 'cod' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'}`}>
                        {order.paymentMethod === 'cod' ? 'COD' : 'PRE'}
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-red-950">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-[10px] font-bold text-red-950/40">{order.orderItems?.length || 0} item{(order.orderItems?.length || 0) !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-red-950">{order.user?.name || order.shippingDetails?.fullName}</p>
                    <p className="text-[10px] font-bold text-red-950/40">{order.shippingDetails?.city}, {order.shippingDetails?.state}</p>
                  </td>
                  <td className="p-5">
                    <p className="font-black text-red-950">₹{order.totalPrice}</p>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(order.orderStatus)}`}>
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-bold text-red-950/60">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                    <p className="text-[10px] font-bold text-red-950/30">{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="p-5 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => onViewDetails(order)}
                        className="p-2 hover:bg-red-50 text-red-950/40 hover:text-red-600 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>

                      {order.orderStatus === 'pending' && (
                        <button onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                          className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-700 transition-all shadow-md">
                          Confirm
                        </button>
                      )}
                      {order.orderStatus === 'confirmed' && (
                       
                       <button onClick={() => handleUpdateStatus(order._id, 'dispatched')}
                          className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-600 transition-all shadow-md">
                          Dispatch
                        </button>
                      )}
                      {order.orderStatus === 'dispatched' && (
                        <button onClick={() => handleUpdateStatus(order._id, 'delivered')}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-green-700 transition-all shadow-md">
                          Deliver
                        </button>
                      )}
                      {order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
                        <button onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                          className="bg-white border border-red-100 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-50 transition-all">
                          Cancel
                        </button>
                      )}
                      {order.paymentStatus === 'paid' && order.refundStatus !== 'processed' && order.orderStatus === 'cancelled' && (
                        <button onClick={() => handleRefund(order._id)} disabled={isRefunding}
                          className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-100 transition-all">
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-20 text-center">
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="p-5 px-8 border-t border-red-50/50 flex items-center justify-between gap-4 bg-red-50/10">
          <p className="text-xs font-bold text-red-950/40">
            Showing {Math.min((page - 1) * pageSize + 1, sorted.length)}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-30 transition-colors"
            ><span className="material-symbols-outlined text-[18px] text-red-950">first_page</span></button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-30 transition-colors"
            ><span className="material-symbols-outlined text-[18px] text-red-950">chevron_left</span></button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const n = start + i;
              if (n > totalPages) return null;
              return (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${page === n ? 'bg-red-950 text-white' : 'hover:bg-red-50 text-red-950/60'}`}>
                  {n}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-30 transition-colors"
            ><span className="material-symbols-outlined text-[18px] text-red-950">chevron_right</span></button>
            <button
              onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-30 transition-colors"
            ><span className="material-symbols-outlined text-[18px] text-red-950">last_page</span></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderPanel;
