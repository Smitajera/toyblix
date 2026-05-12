import React from 'react';

const StatCard = ({ icon, label, value }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm flex items-center gap-6">
    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-inner">
      <span className="material-symbols-outlined text-[32px]">{icon}</span>
    </div>
    <div>
      <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black text-red-950">{value}</h3>
    </div>
  </div>
);

const AdminStatsBar = ({ totalRevenue, totalOrders, pendingOrders }) => {
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <StatCard icon="payments"        label="Total Revenue" value={`₹${totalRevenue.toLocaleString('en-IN')}`} />
      <StatCard icon="shopping_bag"    label="Total Orders"  value={totalOrders} />
      <StatCard icon="calculate"       label="Average Order" value={`₹${avgOrder.toLocaleString('en-IN')}`} />
      <StatCard icon="pending_actions" label="Active Queue"  value={pendingOrders} />
    </div>
  );
};

export default AdminStatsBar;
