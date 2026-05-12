import React, { useState } from 'react';
import toast from 'react-hot-toast';

const AdminPromos = ({ coupons, createCoupon, deleteCoupon, toggleCoupon, setConfirmCouponDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', discountType: 'percentage', discountValue: '',
    minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '',
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createCoupon(form).unwrap();
      toast.success('Promo code created!');
      setForm({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscount: '', usageLimit: '', expiresAt: '' });
      setShowForm(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create coupon.');
    }
  };

  const inputCls = 'w-full bg-white p-3 border border-red-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none';

  return (
    <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
      {/* Header */}
      <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
        <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-600 text-[28px]">sell</span>
          Promo Code Manager
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-red-950 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-900 transition-all shadow-md hover:-translate-y-0.5"
        >
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'New Code'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-8 border-b border-red-50 bg-red-50/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Promo Code *</label>
              <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. SUMMER20" className={`${inputCls} uppercase`} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Discount Type *</label>
              <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))} className={inputCls}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (Rs)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Discount Value *</label>
              <input required type="number" min="1" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))} placeholder={form.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 500'} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Min Order (Rs)</label>
              <input type="number" min="0" value={form.minOrderAmount} onChange={e => setForm(p => ({ ...p, minOrderAmount: e.target.value }))} placeholder="0 = no min" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Max Discount (Rs)</label>
              <input type="number" min="0" value={form.maxDiscount} onChange={e => setForm(p => ({ ...p, maxDiscount: e.target.value }))} placeholder="Cap for %" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Usage Limit</label>
              <input type="number" min="1" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} placeholder="Empty = unlimited" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Expiry Date</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} className={inputCls} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-600/20 hover:-translate-y-0.5">
                Create Promo
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-red-50/50 border-b border-red-50">
              {['Code', 'Discount', 'Min Order', 'Usage', 'ROI', 'Status', 'Actions'].map((h, i) => (
                <th key={h} className={`p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest ${i === 0 ? 'pl-8' : ''} ${i === 6 ? 'pr-8 text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons?.map(coupon => {
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
                  <td className="p-5 text-sm font-bold text-red-950/70">{coupon.minOrderAmount > 0 ? `Rs ${coupon.minOrderAmount}` : '—'}</td>
                  <td className="p-5 text-sm font-bold text-red-950/70">{coupon.usedCount}{coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : ' / ∞'}</td>
                  <td className="p-5">
                    <p className="font-black text-red-950 text-xs">₹{(coupon.totalRevenueGenerated || 0).toLocaleString('en-IN')}</p>
                    <p className="text-red-950/40 text-xs">−₹{(coupon.totalDiscountGiven || 0).toLocaleString('en-IN')} given</p>
                  </td>
                  <td className="p-5">
                    {isExpired  ? <span className="text-xs font-black bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-full">Expired</span>
                    : isAtLimit ? <span className="text-xs font-black bg-red-50 text-red-950/50 border border-red-100 px-3 py-1.5 rounded-full">Exhausted</span>
                    : coupon.isActive ? <span className="text-xs font-black bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full">Active</span>
                    : <span className="text-xs font-black bg-white text-red-950/40 border border-red-50 px-3 py-1.5 rounded-full">Disabled</span>}
                  </td>
                  <td className="p-5 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={async () => { try { await toggleCoupon(coupon._id).unwrap(); toast.success(`Coupon ${coupon.isActive ? 'disabled' : 'enabled'}`); } catch { toast.error('Failed'); } }}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-950/40 hover:text-red-950"
                        title={coupon.isActive ? 'Disable' : 'Enable'}
                      >
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
                <td colSpan="7" className="text-center py-16">
                  <span className="material-symbols-outlined text-[48px] text-red-200 mb-2 block">sell</span>
                  <p className="text-red-950/50 font-bold">No promo codes yet. Click "New Code" to get started!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPromos;
