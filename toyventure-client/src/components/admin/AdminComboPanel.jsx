import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  useGetCombosQuery,
  useGetProductsQuery,
  useCreateComboMutation,
  useUpdateComboMutation,
  useDeleteComboMutation,
} from '../../features/api/apiSlice';
import { COMBO_AGE_GROUPS, getComboAgeLabel } from '../../constants/comboAgeGroups';
import ConfirmModal from '../ConfirmModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '');

const emptyCombo = {
  title: '',
  description: '',
  img: '',
  ageGroup: '0-12 MO',
  items: [],
  price: '',
  oldPrice: '',
  sortOrder: 0,
  isDraft: true,
  isActive: true,
};

const resolveImage = (imgSrc) => {
  if (!imgSrc) return '';
  if (imgSrc.startsWith('http') || imgSrc.startsWith('data:')) return imgSrc;
  return imgSrc.startsWith('/uploads') ? `${ASSET_BASE_URL}${imgSrc}` : imgSrc;
};

const ComboFormModal = ({
  isOpen,
  onClose,
  combo,
  setCombo,
  products,
  onSave,
  isSaving,
  uploading,
  onImageUpload,
}) => {
  useEffectEscape(onClose, isOpen);

  if (!isOpen) return null;

  const publishedProducts = products.filter((p) => !p.isDraft && p.title !== 'New Toy');
  const selectedIds = combo.items.map((i) => i.product);

  const toggleProduct = (productId) => {
    const exists = combo.items.find((i) => i.product === productId);
    if (exists) {
      setCombo({ ...combo, items: combo.items.filter((i) => i.product !== productId) });
    } else {
      setCombo({ ...combo, items: [...combo.items, { product: productId, quantity: 1 }] });
    }
  };

  const setItemQty = (productId, qty) => {
    setCombo({
      ...combo,
      items: combo.items.map((i) =>
        i.product === productId ? { ...i, quantity: Math.max(1, Number(qty) || 1) } : i
      ),
    });
  };

  const suggestedPrice = combo.items.reduce((sum, row) => {
    const p = publishedProducts.find((x) => x._id === row.product);
    return sum + (p ? Number(p.price) * row.quantity : 0);
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-red-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-red-50 bg-red-50/30 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-black text-red-950 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">inventory_2</span>
            {combo._id ? 'Edit Age Combo' : 'New Age Combo'}
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-red-100 text-red-950/50">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Combo Title *</label>
              <input
                required
                value={combo.title}
                onChange={(e) => setCombo({ ...combo, title: e.target.value })}
                placeholder="e.g. Infant Starter Pack"
                className="w-full bg-red-50/50 p-3 rounded-xl border border-red-50 font-bold text-red-950 focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Age Group *</label>
              <select
                value={combo.ageGroup}
                onChange={(e) => setCombo({ ...combo, ageGroup: e.target.value })}
                className="w-full bg-red-50/50 p-3 rounded-xl border border-red-50 font-bold text-red-950 focus:ring-2 focus:ring-red-600 outline-none"
              >
                {COMBO_AGE_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Sort Order</label>
              <input
                type="number"
                min="0"
                value={combo.sortOrder}
                onChange={(e) => setCombo({ ...combo, sortOrder: Number(e.target.value) || 0 })}
                className="w-full bg-red-50/50 p-3 rounded-xl border border-red-50 font-bold text-red-950 focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Combo Price (₹) *</label>
              <input
                required
                type="number"
                min="0"
                value={combo.price}
                onChange={(e) => setCombo({ ...combo, price: e.target.value })}
                className="w-full bg-red-50/50 p-3 rounded-xl border border-red-50 font-bold text-red-950 focus:ring-2 focus:ring-red-600 outline-none"
              />
              {suggestedPrice > 0 && (
                <p className="text-xs text-red-950/40 font-medium">Sum of items: ₹{suggestedPrice.toLocaleString('en-IN')}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">MRP / Old Price (₹)</label>
              <input
                type="number"
                min="0"
                value={combo.oldPrice}
                onChange={(e) => setCombo({ ...combo, oldPrice: e.target.value })}
                className="w-full bg-red-50/50 p-3 rounded-xl border border-red-50 font-bold text-red-950 focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Description</label>
            <textarea
              rows={3}
              value={combo.description}
              onChange={(e) => setCombo({ ...combo, description: e.target.value })}
              placeholder="What's included and why parents love this bundle..."
              className="w-full bg-red-50/50 p-3 rounded-xl border border-red-50 font-bold text-sm text-red-950 focus:ring-2 focus:ring-red-600 outline-none resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Cover Image *</label>
            <input type="file" accept="image/*" onChange={onImageUpload} disabled={uploading} className="w-full text-sm" />
            {combo.img && (
              <img src={resolveImage(combo.img)} alt="" className="w-24 h-24 object-cover rounded-xl border border-red-100" />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest">Products in Combo *</label>
            <div className="max-h-48 overflow-y-auto border border-red-50 rounded-2xl divide-y divide-red-50">
              {publishedProducts.length === 0 && (
                <p className="p-4 text-xs font-bold text-red-950/40 text-center">Publish products first to add them to combos.</p>
              )}
              {publishedProducts.map((p) => {
                const selected = selectedIds.includes(p._id);
                const row = combo.items.find((i) => i.product === p._id);
                return (
                  <div key={p._id} className={`flex items-center gap-3 p-3 ${selected ? 'bg-red-50/50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProduct(p._id)}
                      className="w-4 h-4 accent-red-600"
                    />
                    <img src={resolveImage(p.img)} alt="" className="w-10 h-10 rounded-lg object-cover border border-red-50" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-red-950 truncate">{p.title}</p>
                      <p className="text-xs text-red-950/50">₹{p.price} · Stock {p.countInStock}</p>
                    </div>
                    {selected && (
                      <input
                        type="number"
                        min="1"
                        value={row?.quantity || 1}
                        onChange={(e) => setItemQty(p._id, e.target.value)}
                        className="w-16 p-2 rounded-lg border border-red-100 text-sm font-bold text-center"
                        title="Quantity in combo"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={combo.isDraft}
                onChange={(e) => setCombo({ ...combo, isDraft: e.target.checked })}
                className="w-4 h-4 accent-zinc-800"
              />
              <span className="text-sm font-bold text-zinc-700">Save as draft (hidden)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={combo.isActive}
                onChange={(e) => setCombo({ ...combo, isActive: e.target.checked })}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm font-bold text-red-950/70">Active listing</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || uploading || combo.items.length === 0}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : combo._id ? 'Update Combo' : 'Create Combo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

function useEffectEscape(onClose, isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);
}

const AdminComboPanel = () => {
  const [ageFilter, setAgeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(emptyCombo);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [uploading, setUploading] = useState(false);

  const { data: combos = [], isLoading, refetch } = useGetCombosQuery({ isAdmin: 'true', ageGroup: ageFilter });
  const { data: productsData } = useGetProductsQuery({ limit: 200, isAdmin: 'true' });
  const products = productsData?.products || [];

  const [createCombo, { isLoading: isCreating }] = useCreateComboMutation();
  const [updateCombo, { isLoading: isUpdating }] = useUpdateComboMutation();
  const [deleteCombo] = useDeleteComboMutation();

  const grouped = useMemo(() => {
    const map = {};
    COMBO_AGE_GROUPS.forEach((g) => { map[g.value] = []; });
    combos.forEach((c) => {
      if (map[c.ageGroup]) map[c.ageGroup].push(c);
      else map[c.ageGroup] = [c];
    });
    return map;
  }, [combos]);

  const openCreate = () => {
    setEditingCombo({ ...emptyCombo, items: [] });
    setModalOpen(true);
  };

  const openEdit = (combo) => {
    setEditingCombo({
      _id: combo._id,
      title: combo.title,
      description: combo.description || '',
      img: combo.img,
      ageGroup: combo.ageGroup,
      items: (combo.items || []).map((i) => ({
        product: i.product?._id || i.product,
        quantity: i.quantity || 1,
      })),
      price: combo.price,
      oldPrice: combo.oldPrice || '',
      sortOrder: combo.sortOrder || 0,
      isDraft: combo.isDraft,
      isActive: combo.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      const url = Array.isArray(data) ? data[0] : (data.image || data.path || data.url);
      setEditingCombo((p) => ({ ...p, img: url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      title: editingCombo.title.trim(),
      description: editingCombo.description,
      img: editingCombo.img,
      ageGroup: editingCombo.ageGroup,
      items: editingCombo.items,
      price: Number(editingCombo.price) || 0,
      oldPrice: Number(editingCombo.oldPrice) || 0,
      sortOrder: Number(editingCombo.sortOrder) || 0,
      isDraft: editingCombo.isDraft,
      isActive: editingCombo.isActive,
    };

    try {
      if (editingCombo._id) {
        await updateCombo({ id: editingCombo._id, ...payload }).unwrap();
        toast.success('Combo updated!');
      } else {
        await createCombo(payload).unwrap();
        toast.success('Combo created!');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save combo.');
    }
  };

  const handleDelete = async () => {
    const id = confirmDelete.id;
    setConfirmDelete({ isOpen: false, id: null });
    try {
      await deleteCombo(id).unwrap();
      toast.success('Combo deleted.');
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete combo.');
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-red-950/50 font-bold text-sm">Bundle toys by age for curated shop listings.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black shadow-md hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          New Age Combo
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setAgeFilter('')}
          className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${!ageFilter ? 'border-red-600 bg-red-50 text-red-700' : 'border-red-100 text-red-950/50'}`}
        >
          All Ages
        </button>
        {COMBO_AGE_GROUPS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setAgeFilter(g.value)}
            className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${ageFilter === g.value ? 'border-red-600 bg-red-50 text-red-700' : 'border-red-100 text-red-950/50'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-center font-bold text-red-950/40 py-12">Loading combos...</p>}

      {!isLoading && combos.length === 0 && (
        <div className="text-center py-16 bg-white rounded-[2rem] border border-red-50">
          <span className="material-symbols-outlined text-[48px] text-red-200">inventory_2</span>
          <p className="font-bold text-red-950/50 mt-2">No age combos yet. Create your first bundle!</p>
        </div>
      )}

      {!isLoading && !ageFilter && COMBO_AGE_GROUPS.map((g) => {
        const list = grouped[g.value] || [];
        if (list.length === 0) return null;
        return (
          <div key={g.value} className="mb-8">
            <h3 className="text-lg font-black text-red-950 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">child_care</span>
              {g.label}
            </h3>
            <ComboTable combos={list} onEdit={openEdit} onDelete={(id) => setConfirmDelete({ isOpen: true, id })} resolveImage={resolveImage} />
          </div>
        );
      })}

      {!isLoading && ageFilter && (
        <ComboTable combos={combos} onEdit={openEdit} onDelete={(id) => setConfirmDelete({ isOpen: true, id })} resolveImage={resolveImage} />
      )}

      <ComboFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        combo={editingCombo}
        setCombo={setEditingCombo}
        products={products}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
        uploading={uploading}
        onImageUpload={handleImageUpload}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
        title="Delete Combo?"
        message="This bundle will be removed from the shop."
        confirmText="Delete"
        variant="danger"
        icon="delete"
      />
    </div>
  );
};

const ComboTable = ({ combos, onEdit, onDelete, resolveImage }) => (
  <div className="bg-white rounded-[2rem] border border-red-50 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[800px]">
        <thead>
          <tr className="bg-red-50/50 border-b border-red-50">
            {['Image', 'Combo', 'Age', 'Items', 'Price', 'Stock', 'Status', 'Actions'].map((h) => (
              <th key={h} className="p-4 text-[10px] font-black text-red-950/40 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {combos.map((c) => (
            <tr key={c._id} className="border-b border-red-50 hover:bg-red-50/20">
              <td className="p-4">
                <img src={resolveImage(c.img)} alt="" className="w-12 h-12 rounded-xl object-cover border border-red-50" />
              </td>
              <td className="p-4 font-bold text-red-950 text-sm max-w-[200px] truncate">{c.title}</td>
              <td className="p-4 text-sm font-bold text-red-700">{getComboAgeLabel(c.ageGroup)}</td>
              <td className="p-4 text-sm text-red-950/70">{c.items?.length || 0} toys</td>
              <td className="p-4 font-black text-red-950">₹{c.price}</td>
              <td className="p-4 text-sm font-bold">{c.countInStock}</td>
              <td className="p-4">
                {c.isDraft ? (
                  <span className="text-[10px] font-black bg-zinc-800 text-white px-2 py-1 rounded-full">Draft</span>
                ) : (
                  <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">Live</span>
                )}
              </td>
              <td className="p-4">
                <div className="flex gap-1">
                  <button type="button" onClick={() => onEdit(c)} className="p-2 hover:bg-red-50 rounded-lg text-red-600" title="Edit">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button type="button" onClick={() => onDelete(c._id)} className="p-2 hover:bg-red-100 rounded-lg text-red-400" title="Delete">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default AdminComboPanel;
