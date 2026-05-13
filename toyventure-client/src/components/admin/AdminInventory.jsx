import React, { useState, useMemo } from 'react';
import { useGetProductsQuery, useUpdateProductMutation } from '../../features/api/apiSlice';
import { resolveImage } from './utils/adminHelpers';
import toast from 'react-hot-toast';

const LOW_STOCK_THRESHOLD = 5;

const AdminInventory = () => {
  const { data: productsData, isLoading, refetch } = useGetProductsQuery({ limit: 200, isAdmin: true });
  const [updateProduct] = useUpdateProductMutation();

  const [search,      setSearch]      = useState('');
  const [filterMode,  setFilterMode]  = useState('all'); // all | low | out
  const [editingId,   setEditingId]   = useState(null);
  const [editQty,     setEditQty]     = useState('');
  const [saving,      setSaving]      = useState(false);

  const products = productsData?.products || [];

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase());
      const qty = p.stock ?? p.qty ?? 0;
      if (filterMode === 'low') return matchSearch && qty > 0 && qty <= LOW_STOCK_THRESHOLD;
      if (filterMode === 'out') return matchSearch && qty === 0;
      return matchSearch;
    });
  }, [products, search, filterMode]);

  const stats = useMemo(() => ({
    total:   products.length,
    low:     products.filter(p => { const q = p.stock ?? p.qty ?? 0; return q > 0 && q <= LOW_STOCK_THRESHOLD; }).length,
    out:     products.filter(p => (p.stock ?? p.qty ?? 0) === 0).length,
    inStock: products.filter(p => (p.stock ?? p.qty ?? 0) > LOW_STOCK_THRESHOLD).length,
  }), [products]);

  const handleSaveQty = async (product) => {
    const newQty = parseInt(editQty, 10);
    if (isNaN(newQty) || newQty < 0) return toast.error('Enter a valid quantity (≥ 0)');
    setSaving(true);
    try {
      await updateProduct({ ...product, stock: newQty, qty: newQty }).unwrap();
      toast.success(`Stock updated for "${product.title}"`);
      setEditingId(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      await updateProduct({ ...product, inStock: !product.inStock }).unwrap();
      toast.success(`"${product.title}" marked as ${product.inStock ? 'Out of Stock' : 'In Stock'}`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to toggle availability');
    }
  };

  const getStockStyle = (qty) => {
    if (qty === 0)                      return { badge: 'bg-red-100 text-red-700',    label: 'Out of Stock', icon: 'inventory_2' };
    if (qty <= LOW_STOCK_THRESHOLD)     return { badge: 'bg-orange-100 text-orange-700', label: 'Low Stock', icon: 'warning' };
    return { badge: 'bg-green-100 text-green-700', label: 'In Stock', icon: 'check_circle' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm p-20 flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-[48px] text-red-200 animate-spin">autorenew</span>
        <p className="text-red-950/40 font-bold">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      {/* Header */}
      <div className="p-8 border-b border-red-50/50 bg-red-50/20 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600 text-[28px]">inventory_2</span>
              Inventory Manager
            </h2>
            <p className="text-sm font-bold text-red-950/40 mt-1">{products.length} products tracked</p>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-red-950/30">search</span>
            <input
              type="text"
              placeholder="Search product or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3.5 bg-white border-2 border-red-50 rounded-2xl w-full md:w-[300px] text-sm font-bold text-red-950 focus:border-red-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'all', label: 'All Products', count: stats.total,   color: 'bg-red-50 text-red-950/60' },
            { id: 'low', label: 'Low Stock',    count: stats.low,     color: 'bg-orange-50 text-orange-700' },
            { id: 'out', label: 'Out of Stock', count: stats.out,     color: 'bg-red-100 text-red-700' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
                filterMode === f.id ? 'bg-red-950 text-white border-transparent shadow-md' : `${f.color} border-transparent hover:border-red-100`
              }`}
            >
              {f.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${filterMode === f.id ? 'bg-white/20' : 'bg-white/60'}`}>
                {f.count}
              </span>
            </button>
          ))}

          {stats.low > 0 && filterMode !== 'low' && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl text-xs font-black text-orange-700 animate-pulse">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              {stats.low} product{stats.low > 1 ? 's' : ''} need restocking!
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-red-50/30 border-b border-red-50">
              <th className="p-5 pl-8 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Product</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Category</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Price</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Stock Qty</th>
              <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Status</th>
              <th className="p-5 pr-8 text-right text-[10px] font-black text-red-950/40 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map(product => {
              const qty = product.stock ?? product.qty ?? 0;
              const { badge, label, icon } = getStockStyle(qty);
              const isEditing = editingId === product._id;

              return (
                <tr key={product._id} className={`border-b border-red-50/50 transition-colors group ${qty === 0 ? 'bg-red-50/20' : qty <= LOW_STOCK_THRESHOLD ? 'bg-orange-50/20' : 'hover:bg-red-50/10'}`}>
                  <td className="p-5 pl-8">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-red-50 border border-red-100 shrink-0">
                        <img src={resolveImage(product.img || product.images?.[0])} alt={product.title} className="w-full h-full object-cover mix-blend-multiply" />
                      </div>
                      <div>
                        <p className="font-bold text-red-950 text-sm line-clamp-1 max-w-[200px]">{product.title}</p>
                        <p className="text-[10px] font-bold text-red-950/40 mt-0.5">SKU: {product._id?.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="text-xs font-black bg-red-50 text-red-950/50 px-3 py-1 rounded-lg">
                      {product.category || '—'}
                    </span>
                  </td>
                  <td className="p-5">
                    <p className="font-black text-red-950">₹{product.price?.toLocaleString('en-IN')}</p>
                    {product.mrp && product.mrp > product.price && (
                      <p className="text-[10px] line-through text-red-950/30">₹{product.mrp}</p>
                    )}
                  </td>
                  <td className="p-5">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0"
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          className="w-20 px-3 py-1.5 border-2 border-red-500 rounded-lg text-sm font-bold text-red-950 outline-none"
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveQty(product); if (e.key === 'Escape') setEditingId(null); }}
                        />
                        <button onClick={() => handleSaveQty(product)} disabled={saving}
                          className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(product._id); setEditQty(String(qty)); }}
                        className={`flex items-center gap-2 font-black text-2xl transition-all hover:scale-110 ${qty === 0 ? 'text-red-500' : qty <= LOW_STOCK_THRESHOLD ? 'text-orange-500' : 'text-red-950'}`}
                        title="Click to edit"
                      >
                        {qty}
                        <span className="material-symbols-outlined text-[16px] text-red-950/20 group-hover:text-red-400">edit</span>
                      </button>
                    )}
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${badge}`}>
                      <span className="material-symbols-outlined text-[13px]">{icon}</span>
                      {label}
                    </span>
                  </td>
                  <td className="p-5 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Toggle storefront visibility */}
                      <button
                        onClick={() => handleToggleAvailability(product)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 border ${
                          product.inStock !== false
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                        }`}
                        title={product.inStock !== false ? 'Click to hide from storefront' : 'Click to show on storefront'}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {product.inStock !== false ? 'visibility' : 'visibility_off'}
                        </span>
                        {product.inStock !== false ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" className="p-20 text-center">
                  <span className="material-symbols-outlined text-[64px] text-red-100 block mb-4">inventory_2</span>
                  <p className="text-xl font-black text-red-950/20">No products match your filter</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div className="p-5 px-8 border-t border-red-50/50 bg-red-50/10 flex flex-wrap items-center gap-6 text-xs font-bold text-red-950/40">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Healthy stock (&gt; {LOW_STOCK_THRESHOLD})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Low stock (1–{LOW_STOCK_THRESHOLD})</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Out of stock (0)</span>
        <span className="ml-auto">Click any stock number to edit inline</span>
      </div>
    </div>
  );
};

export default AdminInventory;
