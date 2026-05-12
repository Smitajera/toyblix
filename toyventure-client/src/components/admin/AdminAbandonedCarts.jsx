import React from 'react';

const AdminAbandonedCarts = ({ users }) => {
  const abandonedUsers = users?.filter(u => u.cart && u.cart.length > 0) || [];

  const totalAbandonedValue = abandonedUsers.reduce(
    (sum, u) => sum + (u.cart || []).reduce((s, item) => s + ((item.price || 0) * (item.qty || 1)), 0),
    0
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
      {/* Header */}
      <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-600 text-[28px]">shopping_cart_off</span>
            Abandoned Carts
          </h2>
          <p className="text-xs text-red-950/50 font-bold mt-1">
            Customers with items in cart but no completed order. Cron auto-recovers every 30 min via WhatsApp + Email.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-red-950/40 uppercase tracking-widest">Est. Lost Revenue</p>
          <p className="text-3xl font-black text-red-600">₹{totalAbandonedValue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-red-50/50 border-b border-red-50">
              {['Customer', 'Contact', 'Items in Cart', 'Est. Value', 'Last Seen'].map((h, i) => (
                <th key={h} className={`p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest ${i === 0 ? 'pl-8' : ''} ${i === 4 ? 'pr-8' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {abandonedUsers.length > 0 ? abandonedUsers.map(u => {
              const cartValue = (u.cart || []).reduce((s, item) => s + ((item.price || 0) * (item.qty || 1)), 0);
              return (
                <tr key={u._id} className="hover:bg-red-50/20 border-b border-red-50 transition-colors">
                  <td className="p-5 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center font-bold text-red-600">
                        {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="font-bold text-sm text-red-950">{u.name || 'Anonymous'}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-medium text-red-950/70">{u.email || '—'}</p>
                    <p className="text-xs font-medium text-red-950/50">{u.mobileNumber || '—'}</p>
                  </td>
                  <td className="p-5">
                    <span className="font-black text-red-950">{(u.cart || []).length}</span>
                    <span className="text-red-950/40 text-xs ml-1">items</span>
                  </td>
                  <td className="p-5">
                    <span className="font-black text-red-600 text-sm">₹{cartValue.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="p-5 pr-8">
                    <span className="text-xs text-red-950/40 font-medium">
                      {new Date(u.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="5" className="text-center py-16">
                  <span className="material-symbols-outlined text-[48px] text-red-200 mb-2 block">check_circle</span>
                  <p className="text-red-950/50 font-bold">No users with items left in cart. 🎉</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAbandonedCarts;
