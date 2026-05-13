import React from 'react';

const NAV_ITEMS = [
  { key: 'analytics', icon: 'bar_chart',          label: 'Analytics' },
  { key: 'customers', icon: 'group',               label: 'Customers' },
  { key: 'orders',    icon: 'local_shipping',      label: 'Orders' },
  { key: 'promos',    icon: 'sell',                label: 'Promo Codes' },
  { key: 'abandoned', icon: 'shopping_cart_off',   label: 'Abandoned Carts' },
  { key: 'reviews',   icon: 'rate_review',         label: 'Moderation' },
  { key: 'returns',   icon: 'assignment_return',   label: 'Returns' },
];

const AdminSidebar = ({ activeTab, setActiveTab, badges = {} }) => (
  <div className="w-full lg:w-[280px] shrink-0">
    <div className="bg-white/60 backdrop-blu
    r-md p-4 rounded-[2rem] border border-red-50 shadow-sm flex flex-col gap-2 sticky top-32">
      {NAV_ITEMS.map(({ key, icon, label }) => {
        const badgeCount = badges[key];
        const badgeColor = key === 'returns' ? 'bg-orange-500' : 'bg-red-600';
        return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`w-full text-left px-5 py-3.5 rounded-xl font-black text-sm transition-all flex items-center gap-3
              ${activeTab === key
                ? 'bg-red-950 text-white shadow-md translate-x-1'
                : 'text-red-950/50 hover:text-red-950 hover:bg-white/80'}`}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            {label}
            {badgeCount > 0 && (
              <span className={`${badgeColor} text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-auto`}>
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export default AdminSidebar;
