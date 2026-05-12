import React, { useState } from 'react';
import toast from 'react-hot-toast';

const AdminCustomers = ({
  users,
  setConfirmUserBan,
  setConfirmUserRole,
  showAdminForm,
  setShowAdminForm,
  adminStep,
  setAdminStep,
  adminTarget,
  setAdminTarget,
  adminOtp,
  setAdminOtp,
  handleRequestAdminOtp,
  handleConfirmAdmin,
  isRequestingOtp,
  isConfirmingAdmin,
}) => {
  const adminUsers   = users?.filter(u => u.role === 'admin')  || [];
  const regularUsers = users?.filter(u => u.role !== 'admin')  || [];

  const renderUserRow = (user) => (
    <tr key={user._id} className={`hover:bg-red-50/20 transition-colors border-b border-red-50 group ${user.isBanned ? 'opacity-50 grayscale' : ''}`}>
      <td className="p-5 pl-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${user.role === 'admin' ? 'bg-red-600 text-white border-red-700' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {user.name ? user.name.charAt(0).toUpperCase() : <span className="material-symbols-outlined text-[18px]">person</span>}
          </div>
          <div>
            <p className="font-bold text-red-950 text-sm flex items-center gap-1">
              {user.name || 'Anonymous User'}
              {user.role === 'admin' && <span className="material-symbols-outlined text-red-600 text-[14px]" title="Admin">shield</span>}
            </p>
            <p className="text-[10px] text-red-950/50 font-bold">Joined: {new Date(user.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </td>
      <td className="p-5">
        <p className="text-sm font-medium text-red-950/70 truncate max-w-[150px]" title={user.email}>{user.email || '—'}</p>
        <p className="text-xs text-red-950/50 font-medium">{user.mobileNumber || '—'}</p>
      </td>
      <td className="p-5 text-center"><span className="font-black text-red-950">{user.orderCount || 0}</span></td>
      <td className="p-5 text-center"><span className="font-black text-red-950">Rs {(user.totalSpend || 0).toLocaleString('en-IN')}</span></td>
      <td className="p-5">
        {user.isBanned ? (
          <span className="text-[10px] uppercase tracking-widest font-black bg-red-950 text-white border border-red-950 px-3 py-1.5 rounded-full flex items-center gap-1 w-max">
            <span className="material-symbols-outlined text-[12px]">block</span> Banned
          </span>
        ) : user.role === 'admin' ? (
          <span className="text-[10px] uppercase tracking-widest font-black bg-red-600 text-white border border-red-700 px-3 py-1.5 rounded-full flex items-center gap-1 w-max">
            <span className="material-symbols-outlined text-[12px]">admin_panel_settings</span> Admin
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-widest font-black bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full flex items-center gap-1 w-max">
            <span className="material-symbols-outlined text-[12px]">check_circle</span> Active
          </span>
        )}
      </td>
      <td className="p-5 pr-8 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setConfirmUserBan({ isOpen: true, id: user._id, isBanned: user.isBanned })}
            className={`p-2 rounded-lg transition-colors ${user.isBanned ? 'bg-red-950 text-white hover:bg-black' : 'bg-red-50 text-red-500 hover:bg-red-600 hover:text-white'}`}
            title={user.isBanned ? 'Unban User' : 'Ban User'}
          >
            <span className="material-symbols-outlined text-[18px]">{user.isBanned ? 'lock_open' : 'block'}</span>
          </button>
          <button
            onClick={() => setConfirmUserRole({ isOpen: true, id: user._id, role: user.role })}
            className={`p-2 rounded-lg flex items-center transition-colors ${user.role === 'admin' ? 'bg-red-50 text-red-950/40 hover:text-red-950' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100'}`}
            title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
          >
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
          </button>
        </div>
      </td>
    </tr>
  );

  const tableHead = (
    <thead>
      <tr className="bg-red-50/50 border-b border-red-50">
        {['User', 'Contact', 'Orders', 'Total Spend', 'Status', 'Actions'].map((h, i) => (
          <th key={h} className={`p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest ${i === 0 ? 'pl-8' : ''} ${i >= 2 && i <= 3 ? 'text-center' : ''} ${i === 5 ? 'pr-8 text-right' : ''}`}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Header with Add Admin */}
      <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600 text-[28px]">group</span>
            User Directory
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-bold text-red-950/50">
              <span className="bg-red-600 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black">{adminUsers.length}</span> Admins
              <span className="mx-1 text-red-200">|</span>
              <span className="bg-green-500 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black">{regularUsers.length}</span> Customers
            </div>
            <button
              onClick={() => { setShowAdminForm(!showAdminForm); setAdminStep(1); setAdminOtp(''); }}
              className="bg-red-950 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-900 transition-all shadow-md hover:-translate-y-0.5 w-max"
            >
              <span className="material-symbols-outlined text-[18px]">{showAdminForm ? 'close' : 'security'}</span>
              {showAdminForm ? 'Cancel' : 'Add Admin'}
            </button>
          </div>
        </div>

        {/* Secure Admin Promotion Form */}
        {showAdminForm && (
          <div className="p-8 border-b border-red-100 bg-red-50/50">
            <div className="max-w-md bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
              <h3 className="font-black text-red-950 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">admin_panel_settings</span>
                Promote to Admin
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-red-950/60 font-bold mb-5">
                Security Check: To promote someone, we will send an OTP to <strong>your</strong> registered admin email/phone to verify it's you making the change.
              </p>
              {adminStep === 1 ? (
                <form onSubmit={handleRequestAdminOtp} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Target User's Email or Phone</label>
                    <input required value={adminTarget} onChange={e => setAdminTarget(e.target.value)} placeholder="user@example.com" className="w-full mt-1 bg-red-50/50 p-3 border border-red-50 rounded-xl font-bold text-sm focus:ring-2 focus:ring-red-600 outline-none" />
                  </div>
                  <button disabled={isRequestingOtp} type="submit" className="w-full bg-red-950 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-900 transition-all shadow-md disabled:opacity-50">
                    {isRequestingOtp ? 'Sending...' : 'Send OTP to My Device'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmAdmin} className="space-y-4 fade-in">
                  <div>
                    <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Enter OTP Sent to You</label>
                    <input required value={adminOtp} onChange={e => setAdminOtp(e.target.value)} placeholder="123456" className="w-full mt-1 bg-red-50 p-3 border border-red-100 rounded-xl font-black text-center text-lg tracking-[0.5em] focus:ring-2 focus:ring-red-600 outline-none text-red-700" />
                  </div>
                  <button disabled={isConfirmingAdmin} type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-600/20 disabled:opacity-50">
                    {isConfirmingAdmin ? 'Verifying...' : 'Verify & Promote User'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Team Table */}
      <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden">
        <div className="p-6 px-8 border-b border-red-50/50 bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px]">shield</span>
            Admin Team
            <span className="bg-white/20 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black ml-1">{adminUsers.length}</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            {tableHead}
            <tbody>
              {adminUsers.map(renderUserRow)}
              {adminUsers.length === 0 && (
                <tr><td colSpan="6" className="text-center py-12">
                  <span className="material-symbols-outlined text-[40px] text-red-200 mb-2 block">shield</span>
                  <p className="text-red-950/50 font-bold text-sm">No admin users found.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regular Customers Table */}
      <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden">
        <div className="p-6 px-8 border-b border-red-50/50 bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px]">people</span>
            Customers
            <span className="bg-white/20 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-black ml-1">{regularUsers.length}</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            {tableHead}
            <tbody>
              {regularUsers.map(renderUserRow)}
              {regularUsers.length === 0 && (
                <tr><td colSpan="6" className="text-center py-12">
                  <span className="material-symbols-outlined text-[40px] text-red-200 mb-2 block">group_off</span>
                  <p className="text-red-950/50 font-bold text-sm">No registered customers found.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomers;
