import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  useGetAllToyCategoriesAdminQuery,
  useCreateToyCategoryMutation,
  useUpdateToyCategoryMutation,
  useDeleteToyCategoryMutation,
  useToggleToyCategoryMutation,
} from '../../features/api/apiSlice';
import ConfirmModal from '../ConfirmModal';

const suggestSkuCode = (name) => {
  const words = String(name || '').match(/[A-Za-z0-9]+/g) || [];
  if (words.length > 1) return words.map((w) => w[0]).join('').toUpperCase().slice(0, 5);
  return String(name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5) || 'GEN';
};

const AddCategoryModal = ({ isOpen, onClose, onSubmit, isCreating, newName, setNewName, newSku, setNewSku, skuTouched, setSkuTouched }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const inputCls = 'w-full bg-red-50/50 p-4 rounded-2xl border border-red-50 font-bold text-sm text-red-950 focus:ring-2 focus:ring-red-600 outline-none';

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSubmit();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-category-title"
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-red-50 animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-red-50 bg-red-50/30">
          <div className="flex items-center justify-between gap-4">
            <h3 id="add-category-title" className="text-xl font-black text-red-950 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">category</span>
              Add Toy Category
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-100 text-red-950/50 hover:text-red-950 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="text-sm font-medium text-red-950/50 mt-2">Creates a new tag for products and the shop.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest ml-1">Category Name *</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => {
                const name = e.target.value;
                setNewName(name);
                if (!skuTouched) setNewSku(suggestSkuCode(name));
              }}
              placeholder="e.g. Soft Toys"
              className={inputCls}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-red-950/50 uppercase tracking-widest ml-1">SKU Code *</label>
            <input
              value={newSku}
              onChange={(e) => {
                setSkuTouched(true);
                setNewSku(e.target.value.toUpperCase().slice(0, 5));
              }}
              placeholder="e.g. SFT"
              maxLength={5}
              className={`${inputCls} uppercase font-mono`}
              required
            />
            <p className="text-xs text-red-950/40 font-medium ml-1">Used when auto-generating product SKUs.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
            >
              {isCreating ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
};

const CatalogToyCategoryField = ({ tag, onTagChange }) => {
  const { data: categories = [], isLoading } = useGetAllToyCategoriesAdminQuery();
  const [createToyCategory, { isLoading: isCreating }] = useCreateToyCategoryMutation();
  const [updateToyCategory, { isLoading: isUpdating }] = useUpdateToyCategoryMutation();
  const [deleteToyCategory] = useDeleteToyCategoryMutation();
  const [toggleToyCategory] = useToggleToyCategoryMutation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [skuTouched, setSkuTouched] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', skuCode: '' });
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    [categories]
  );

  const activeOptions = sortedCategories.filter((c) => c.isActive);
  const currentTags = tag ? tag.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const openAddModal = () => {
    setNewName('');
    setNewSku('');
    setSkuTouched(false);
    setShowManage(false);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewName('');
    setNewSku('');
    setSkuTouched(false);
  };

  const toggleTag = (catName, checked) => {
    const next = checked
      ? [...currentTags, catName]
      : currentTags.filter((t) => t !== catName);
    onTagChange(next.join(', '));
  };

  const handleAddCategory = async () => {
    const name = newName.trim();
    if (!name) return toast.error('Enter a category name.');

    const skuCode = (newSku.trim() || suggestSkuCode(name)).toUpperCase().slice(0, 5);

    try {
      await createToyCategory({
        name,
        skuCode,
        sortOrder: sortedCategories.length + 1,
        isActive: true,
      }).unwrap();
      toast.success(`"${name}" added!`);
      const next = currentTags.includes(name) ? currentTags : [...currentTags, name];
      onTagChange(next.join(', '));
      closeAddModal();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add category.');
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditForm({ name: cat.name, skuCode: cat.skuCode });
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateToyCategory({
        id,
        name: editForm.name.trim(),
        skuCode: editForm.skuCode.trim().toUpperCase(),
      }).unwrap();
      toast.success('Category updated.');
      const old = categories.find((c) => c._id === id);
      if (old && old.name !== editForm.name.trim()) {
        const updated = currentTags.map((t) => (t === old.name ? editForm.name.trim() : t));
        onTagChange(updated.join(', '));
      }
      setEditingId(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update category.');
    }
  };

  const handleDelete = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ isOpen: false, id: null, name: '' });
    try {
      await deleteToyCategory(id).unwrap();
      toast.success('Category deleted.');
      const removed = categories.find((c) => c._id === id);
      if (removed) {
        onTagChange(currentTags.filter((t) => t !== removed.name).join(', '));
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between ml-1">
        <label className="text-sm font-black text-red-950/40 uppercase tracking-widest">Toy Category (Tags)</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow-md shadow-red-600/30 transition-all hover:-translate-y-0.5"
            title="Add category"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => { setShowManage((v) => !v); setShowAddModal(false); }}
            className="text-[10px] font-black uppercase tracking-widest text-red-950/50 hover:text-red-950 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            Manage
          </button>
        </div>
      </div>

      <AddCategoryModal
        isOpen={showAddModal}
        onClose={closeAddModal}
        onSubmit={handleAddCategory}
        isCreating={isCreating}
        newName={newName}
        setNewName={setNewName}
        newSku={newSku}
        setNewSku={setNewSku}
        skuTouched={skuTouched}
        setSkuTouched={setSkuTouched}
      />

      {showManage && (
        <div className="p-3 bg-white rounded-2xl border border-red-100 space-y-2 max-h-48 overflow-y-auto">
          {sortedCategories.length === 0 && (
            <p className="text-xs font-bold text-red-950/40 text-center py-2">No categories yet.</p>
          )}
          {sortedCategories.map((cat) => (
            <div key={cat._id} className="flex items-center gap-2 text-sm">
              {editingId === cat._id ? (
                <>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="flex-1 min-w-0 p-2 rounded-lg border border-red-100 font-bold text-xs"
                  />
                  <input
                    value={editForm.skuCode}
                    onChange={(e) => setEditForm((p) => ({ ...p, skuCode: e.target.value.toUpperCase().slice(0, 5) }))}
                    className="w-16 p-2 rounded-lg border border-red-100 font-mono font-bold text-xs uppercase"
                    maxLength={5}
                  />
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleSaveEdit(cat._id)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Save"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="p-1.5 text-red-950/40 hover:bg-red-50 rounded-lg" title="Cancel">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </>
              ) : (
                <>
                  <span className={`flex-1 font-bold truncate ${cat.isActive ? 'text-red-950' : 'text-red-950/40 line-through'}`}>
                    {cat.name}
                    <span className="ml-1 font-mono text-[10px] text-red-400">{cat.skuCode}</span>
                  </span>
                  <button type="button" onClick={() => startEdit(cat)} className="p-1.5 text-red-950/40 hover:text-red-950 hover:bg-red-50 rounded-lg" title="Edit">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await toggleToyCategory(cat._id).unwrap();
                        toast.success(cat.isActive ? 'Category hidden' : 'Category activated');
                      } catch {
                        toast.error('Failed to update status.');
                      }
                    }}
                    className="p-1.5 text-red-950/40 hover:text-red-950 hover:bg-red-50 rounded-lg"
                    title={cat.isActive ? 'Hide' : 'Show'}
                  >
                    <span className="material-symbols-outlined text-[16px]">{cat.isActive ? 'visibility_off' : 'visibility'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ isOpen: true, id: cat._id, name: cat.name })}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="w-full bg-white p-4 rounded-2xl border border-red-50 flex flex-wrap gap-2 min-h-[52px]">
        {isLoading && (
          <span className="text-xs font-bold text-red-950/40">Loading categories...</span>
        )}
        {!isLoading && activeOptions.length === 0 && (
          <span className="text-xs font-bold text-red-950/40">No active categories — tap + to add one.</span>
        )}
        {activeOptions.map((cat) => {
          const isSelected = currentTags.includes(cat.name);
          return (
            <label
              key={cat._id}
              className={`cursor-pointer px-4 py-2 rounded-xl border-2 transition-all font-bold text-sm ${
                isSelected ? 'border-red-600 bg-red-50 text-red-700' : 'border-red-100 bg-white text-red-950/50 hover:border-red-300'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={isSelected}
                onChange={(e) => toggleTag(cat.name, e.target.checked)}
              />
              {cat.name}
            </label>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        title="Delete Category?"
        message={`Delete "${confirmDelete.name}"? Only possible if no products use it.`}
        confirmText="Delete"
        variant="danger"
        icon="delete"
      />
    </div>
  );
};

export default CatalogToyCategoryField;
