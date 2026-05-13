import React from 'react';

const StatCard = ({ icon, label, value, sub, color = 'red', onClick, clickable }) => {
  const colorMap = {
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-100'    },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100'  },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100'   },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   border: 'border-teal-100'   },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  };
  const c = colorMap[color] || colorMap.red;

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white p-6 rounded-[2rem] border border-red-50 shadow-sm flex items-center gap-5 transition-all ${clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-red-100' : ''}`}
    >
      <div className={`w-14 h-14 ${c.bg} ${c.text} rounded-2xl flex items-center justify-center border ${c.border} shadow-inner shrink-0`}>
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-0.5 truncate">{label}</p>
        <h3 className="text-2xl font-black text-red-950 leading-none">{value}</h3>
        {sub && <p className={`text-[11px] font-bold mt-1 ${c.text}`}>{sub}</p>}
      </div>
    </div>
  );
};

const AdminStatsBar = ({ totalRevenue, totalOrders, pendingOrders, orders = [], users = [], setActiveTab }) => {
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  /* ── Today's stats ── */
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const todayOrders   = orders.filter(o => new Date(o.createdAt) >= todayStart);
  const todayRevenue  = todayOrders.reduce((acc, o) =>
    acc + (o.paymentStatus === 'paid' || o.paymentMethod === 'cod' ? o.totalPrice : 0), 0);
  const dispatchedToday = todayOrders.filter(o => o.orderStatus === 'dispatched').length;

  /* ── Pending returns ── */
  const pendingReturns = orders.reduce((acc, o) => {
    const pending = (o.orderItems || []).filter(item =>
      item.returnStatus === 'Return Requested' || item.returnStatus === 'Exchange Requested'
    ).length;
    return acc + pending;
  }, 0);

  /* ── Cancellation rate ── */
  const cancelled = orders.filter(o => o.orderStatus === 'cancelled').length;
  const cancelRate = totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0;

  /* ── COD ratio ── */
  const codCount     = orders.filter(o => o.paymentMethod === 'cod').length;
  const codPct       = totalOrders > 0 ? Math.round((codCount / totalOrders) * 100) : 0;
  const prepaidPct   = 100 - codPct;

  /* ── New customers this month ── */
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newCustomers = (users || []).filter(u => new Date(u.createdAt) >= monthStart).length;

  return (
    <div className="mb-10 space-y-4">
      {/* Row 1: Core metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="payments"        label="Total Revenue"    value={`₹${totalRevenue.toLocaleString('en-IN')}`}  color="red" />
        <StatCard icon="shopping_bag"    label="Total Orders"     value={totalOrders}                                  color="red" />
        <StatCard icon="calculate"       label="Average Order"    value={`₹${avgOrder.toLocaleString('en-IN')}`}       color="blue" />
        <StatCard icon="pending_actions" label="Active Queue"     value={pendingOrders}                                color="orange"
          onClick={() => setActiveTab?.('orders')} clickable={!!setActiveTab} sub="Click to manage orders" />
      </div>

      {/* Row 2: Today at a glance */}
      <div className="bg-gradient-to-r from-red-950 to-red-800 rounded-[2rem] p-5 flex flex-col sm:flex-row gap-4 items-center text-white shadow-lg">
        <div className="flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-red-300 text-[22px]">today</span>
          <span className="text-xs font-black uppercase tracking-widest text-red-200">Today at a Glance</span>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 flex-1 justify-center sm:justify-start">
          {[
            { icon: 'receipt_long',      label: 'New Orders',       value: todayOrders.length },
            { icon: 'payments',          label: 'Today Revenue',    value: `₹${todayRevenue.toLocaleString('en-IN')}` },
            { icon: 'local_shipping',    label: 'Dispatched',       value: dispatchedToday },
            { icon: 'assignment_return', label: 'Pending Returns',  value: pendingReturns, alert: pendingReturns > 0 },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-[18px] ${s.alert ? 'text-orange-300' : 'text-red-300'}`}>{s.icon}</span>
              <div>
                <p className="text-[10px] font-black text-red-300 uppercase tracking-widest">{s.label}</p>
                <p className={`text-lg font-black leading-none ${s.alert && s.value > 0 ? 'text-orange-300' : 'text-white'}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Operational stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="assignment_return" label="Pending Returns" value={pendingReturns}
          color="orange" sub={pendingReturns > 0 ? 'Needs attention!' : 'All clear ✓'}
          onClick={() => setActiveTab?.('returns')} clickable={!!setActiveTab}
        />
        <StatCard
          icon="cancel" label="Cancellation Rate" value={`${cancelRate}%`}
          color={cancelRate > 15 ? 'orange' : 'green'} sub={`${cancelled} of ${totalOrders} orders`}
        />
        <StatCard
          icon="credit_card" label="COD vs Prepaid" value={`${codPct}% COD`}
          color="teal" sub={`${prepaidPct}% prepaid`}
        />
        <StatCard
          icon="group_add" label="New Customers" value={newCustomers}
          color="purple" sub="This month"
          onClick={() => setActiveTab?.('customers')} clickable={!!setActiveTab}
        />
      </div>
    </div>
  );
};

export default AdminStatsBar;
