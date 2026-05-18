import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation
} from '../features/api/apiSlice';
import BulkUpload from '../components/admin/BulkUpload';
import CatalogToyCategoryField from '../components/admin/CatalogToyCategoryField';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '');

const AdminCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false); 
  const [isCreatingNew, setIsCreatingNew] = useState(false); 
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState({
    title: '', price: '', oldPrice: '', description: '', img: '', images: [], tag: '', category: [], countInStock: '', isPopular: false, isBestSelling: false, isLimitedEdition: false, videoUrl: '', sku: '', isDraft: false, allowCod: true, allowPrepaid: true,
    variants: [],
    specifications: [] // Phase 2: Added specifications array
  });

  const { data: productsData, isLoading, refetch: refetchProducts } = useGetProductsQuery({ keyword: searchTerm, limit: 100, isAdmin: 'true' });
  const products = productsData?.products || [];

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isFormOpen && isCreatingNew) {
        const message = "You have unsaved changes.";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormOpen, isCreatingNew]);

  const handleCreateProduct = async () => {
    setConfirmCreateOpen(true);
  };

  const confirmCreate = async () => {
    setConfirmCreateOpen(false);
    try {
      const newProduct = await createProduct().unwrap();
      setEditingProduct({ 
        ...newProduct, 
        title: '', price: '', oldPrice: '', description: '', countInStock: '', isPopular: false, isBestSelling: false, isLimitedEdition: false, videoUrl: '',
        images: newProduct.images || [],
        variants: [],
        specifications: [], // Phase 2: Initialize empty specs
        category: Array.isArray(newProduct.category) ? newProduct.category : ['All Age'],
        tag: newProduct.tag || '',
        sku: '', 
        isDraft: true 
      });
      setIsCreatingNew(true); 
      setIsFormOpen(true); 
      window.scrollTo(0, 0); 
    } catch (err) { 
      const msg = err?.data?.message || err?.error || 'Failed to create product. Please ensure you are logged in as admin.';
      toast.error(msg); 
    }
  };

  const handleDeleteProduct = async (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await deleteProduct(id).unwrap();
      toast.success('Toy deleted successfully ✨');
    } catch (err) { toast.error('Failed to delete toy'); }
  };

  // Phase 2: Dynamic Specification Handlers
  const handleAddSpecification = () => {
    setEditingProduct({
      ...editingProduct,
      specifications: [...(editingProduct.specifications || []), { name: '', value: '' }]
    });
  };

  const handleRemoveSpecification = (indexToRemove) => {
    setEditingProduct((prev) => ({
      ...prev,
      specifications: (prev.specifications || []).filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSpecificationChange = (index, field, value) => {
    setEditingProduct((prev) => {
      const updatedSpecs = [...(prev.specifications || [])];
      updatedSpecs[index] = { ...updatedSpecs[index], [field]: value };
      return { ...prev, specifications: updatedSpecs };
    });
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct.allowCod && !editingProduct.allowPrepaid) {
      return toast.error('Enable at least one payment method: Cash on Delivery or Pay Online.');
    }
    try {
      const formattedProduct = {
        ...editingProduct,
        price: editingProduct.price === '' ? 0 : Number(editingProduct.price),
        oldPrice: editingProduct.oldPrice === '' ? 0 : Number(editingProduct.oldPrice),
        countInStock: editingProduct.countInStock === '' ? 0 : Number(editingProduct.countInStock),
        sku: editingProduct.sku ? editingProduct.sku.trim().toUpperCase() : '',
        // Filter out empty specifications to keep database clean
        specifications: (editingProduct.specifications || []).filter(spec => spec.name.trim() !== '' && spec.value.trim() !== ''),
        variants: editingProduct.variants.map(v => {
            const { _uiId, ...rest } = v;
            return {
                ...rest, 
                sku: rest.sku ? rest.sku.trim().toUpperCase() : '',
                price: rest.price === '' ? 0 : Number(rest.price), 
                oldPrice: rest.oldPrice === '' ? 0 : Number(rest.oldPrice), 
                countInStock: rest.countInStock === '' ? 0 : Number(rest.countInStock)
            };
        })
      };
      await updateProduct(formattedProduct).unwrap();
      toast.success(editingProduct.isDraft ? 'Draft saved successfully! 📝' : 'Product published! ✨');
      setIsFormOpen(false); setIsCreatingNew(false); window.scrollTo(0, 0);
    } catch (err) { toast.error('Failed to update product'); }
  };

  const handleCancelForm = async () => {
      setConfirmDiscardOpen(true);
  };

  const confirmDiscard = async () => {
      setConfirmDiscardOpen(false);
      if (isCreatingNew) {
          await deleteProduct(editingProduct._id);
      }
      setIsFormOpen(false); setIsCreatingNew(false);
  };

  const handleSaveAsDraftFromModal = async () => {
      setConfirmDiscardOpen(false);
      try {
        const formattedProduct = {
          ...editingProduct,
          isDraft: true,
          price: editingProduct.price === '' ? 0 : Number(editingProduct.price),
          oldPrice: editingProduct.oldPrice === '' ? 0 : Number(editingProduct.oldPrice),
          countInStock: editingProduct.countInStock === '' ? 0 : Number(editingProduct.countInStock),
          sku: editingProduct.sku ? editingProduct.sku.trim().toUpperCase() : '',
          specifications: (editingProduct.specifications || []).filter(spec => spec.name.trim() !== '' && spec.value.trim() !== ''),
          variants: editingProduct.variants.map(v => {
              const { _uiId, ...rest } = v;
              return {
                  ...rest, 
                  sku: rest.sku ? rest.sku.trim().toUpperCase() : '',
                  price: rest.price === '' ? 0 : Number(rest.price), 
                  oldPrice: rest.oldPrice === '' ? 0 : Number(rest.oldPrice), 
                  countInStock: rest.countInStock === '' ? 0 : Number(rest.countInStock)
              };
          })
        };
        await updateProduct(formattedProduct).unwrap();
        toast.success('Saved safely as a draft! 📝');
        setIsFormOpen(false); setIsCreatingNew(false); window.scrollTo(0, 0);
      } catch (err) { toast.error('Failed to save draft'); }
  };

  const handleEditChange = (e) => setEditingProduct({ ...editingProduct, [e.target.name]: e.target.value });

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    const currentCount = editingProduct.images?.length || 0;
    if (files.length + currentCount > 7) { alert(`Maximum 7 images allowed. You can only add ${7 - currentCount} more.`); return; }
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('images', files[i]);
    setUploading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json(); 
      const updatedImages = [...(editingProduct.images || []), ...data];
      setEditingProduct({ ...editingProduct, images: updatedImages, img: updatedImages[0] || '' });
      e.target.value = null;
    } catch (error) { alert('Image upload failed.'); } finally { setUploading(false); }
  };

  const handleRemoveMainImage = (imageIndex) => {
    const newImages = editingProduct.images.filter((_, i) => i !== imageIndex);
    setEditingProduct({ ...editingProduct, images: newImages, img: newImages.length > 0 ? newImages[0] : '' });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('images', file); 
    setUploading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json(); 
      setEditingProduct({ ...editingProduct, videoUrl: data[0] });
    } catch (error) { toast.error('Video upload failed.'); } finally { setUploading(false); }
  };

  const handleAddVariant = () => setEditingProduct({ ...editingProduct, variants: [...editingProduct.variants, { _uiId: Math.random().toString(36).substr(2, 9), color: '', size: '', description: '', price: editingProduct.price || '', oldPrice: '', countInStock: '', images: [] }] });
  
  const handleRemoveVariant = (indexToRemove) => {
      setEditingProduct(prev => ({ 
          ...prev, 
          variants: prev.variants.filter((_, index) => index !== indexToRemove) 
      }));
  };

  const handleVariantChange = (index, field, value) => {
      setEditingProduct(prev => {
          const updatedVariants = [...prev.variants];
          updatedVariants[index] = { ...updatedVariants[index], [field]: value };
          return { ...prev, variants: updatedVariants };
      });
  };

  const handleVariantFileUpload = async (e, variantIndex) => {
      const files = e.target.files;
      const target = e.target;
      const currentCount = editingProduct.variants[variantIndex].images?.length || 0;
      if (files.length + currentCount > 4) { alert(`Maximum 4 images per variant. You can only add ${4 - currentCount} more.`); return; }
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append('images', files[i]);
      setUploading(true);
      try {
        const token = sessionStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json(); 
        
        setEditingProduct((prev) => {
            const updatedVariants = [...prev.variants];
            if (updatedVariants[variantIndex]) {
                updatedVariants[variantIndex] = {
                    ...updatedVariants[variantIndex],
                    images: [...(updatedVariants[variantIndex].images || []), ...data]
                };
            }
            return { ...prev, variants: updatedVariants };
        });
        target.value = null;
      } catch (error) { alert('Variant image upload failed.'); } finally { setUploading(false); }
  };

  const handleRemoveVariantImage = (variantIndex, imageIndex) => {
      setEditingProduct(prev => {
          const updatedVariants = [...prev.variants];
          if (updatedVariants[variantIndex]) {
              updatedVariants[variantIndex] = {
                  ...updatedVariants[variantIndex],
                  images: updatedVariants[variantIndex].images.filter((_, i) => i !== imageIndex)
              };
          }
          return { ...prev, variants: updatedVariants };
      });
  };

  const resolveImage = (imgSrc) => {
    if (!imgSrc) return '';
    return imgSrc.startsWith('/uploads') ? `${ASSET_BASE_URL}${imgSrc}` : imgSrc;
  };

  if (isLoading) return <div className="pt-32 text-center font-bold text-red-950/50">Loading Catalog...</div>;

  return (
    <>
    <main className="pt-28 pb-24 min-h-screen bg-surface bg-hero-glow relative fade-in">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>
      <div className="max-w-[1300px] mx-auto px-6 relative z-10">
        
        {isFormOpen ? (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-8">
              <button onClick={handleCancelForm} className="inline-flex items-center gap-2 text-sm font-bold text-red-950/50 hover:text-red-600 mb-4 transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Catalog
              </button>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm">
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-red-950 tracking-tight flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-600 text-[36px]">edit_square</span> 
                    {editingProduct.title === '' || editingProduct.title === 'New Toy' ? 'Draft New Toy' : 'Edit Toy Details'}
                  </h1>
                  <p className="text-red-950/50 font-bold mt-2">Update pricing, inventory, and product details below.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-red-50 shadow-sm">
              <form onSubmit={handleUpdateProductSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  
                  {/* Column 1 & 2: Main Details */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Product Title</label>
                      <input type="text" name="title" value={editingProduct.title} onChange={handleEditChange} required placeholder="e.g. Magic Flying Orb" className="w-full bg-red-50/50 p-4 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none border border-red-50 font-bold text-red-950 text-lg transition-all" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Default Price (₹)</label>
                        <input type="number" name="price" value={editingProduct.price} onChange={handleEditChange} required placeholder="499" className="w-full bg-red-50/50 p-4 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none border border-red-50 font-black text-red-600 text-xl transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">MRP / Old Price (₹)</label>
                        <input type="number" name="oldPrice" value={editingProduct.oldPrice} onChange={handleEditChange} placeholder="999" className="w-full bg-red-50/50 p-4 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none border border-red-50 font-bold text-red-950/50 line-through text-xl transition-all" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Default Description</label>
                      <textarea name="description" rows="6" value={editingProduct.description} onChange={handleEditChange} placeholder="Describe the awesome features of this toy..." className="w-full bg-red-50/50 p-4 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none border border-red-50 resize-none font-medium text-red-950/70 text-lg transition-all"></textarea>
                    </div>

                    {/* --- PHASE 2: SPECIFICATIONS SECTION --- */}
                    <div className="space-y-4 mt-6 p-6 bg-red-50/30 rounded-3xl border border-red-50">
                      <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                          <label className="text-lg font-black text-red-950 block">Product Specifications</label>
                          <span className="text-sm text-red-950/60 font-bold">Add custom attributes (e.g., Material, Battery Size, Dimensions)</span>
                        </div>
                        <button type="button" onClick={handleAddSpecification} className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-red-200 transition-colors shadow-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">add</span> Add Spec
                        </button>
                      </div>
                      
                      {(editingProduct.specifications || []).length === 0 ? (
                        <p className="text-sm font-bold text-red-950/40 italic py-2">No specifications added yet.</p>
                      ) : (
                        <div className="space-y-3 mt-4">
                          {(editingProduct.specifications || []).map((spec, index) => (
                            <div key={index} className="flex gap-3 items-start flex-col sm:flex-row">
                              <div className="flex-1 w-full">
                                <input type="text" value={spec.name} onChange={(e) => handleSpecificationChange(index, 'name', e.target.value)} placeholder="e.g. Material" className="w-full bg-white p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none border border-red-100 font-bold text-red-950 text-sm shadow-sm" />
                              </div>
                              <div className="flex-[2] w-full">
                                <input type="text" value={spec.value} onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)} placeholder="e.g. Non-toxic Wood" className="w-full bg-white p-3 rounded-xl focus:ring-2 focus:ring-red-600 outline-none border border-red-100 font-medium text-red-950 text-sm shadow-sm" />
                              </div>
                              <button type="button" onClick={() => handleRemoveSpecification(index)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-colors border border-red-100 w-full sm:w-auto flex justify-center">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* --- END SPECIFICATIONS --- */}

                    <div className="space-y-2 mt-4 p-6 bg-red-50/30 rounded-3xl border border-red-100 flex items-center justify-between shadow-sm">
                      <div>
                        <label className="text-lg font-black text-red-950 block">Editor's Pick (Popular Set)</label>
                        <span className="text-sm text-red-950/60 font-bold">Show this item in the "Explore Popular Sets" section on the Home Page.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-110">
                        <input type="checkbox" name="isPopular" checked={editingProduct.isPopular || false} onChange={(e) => setEditingProduct({...editingProduct, isPopular: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-red-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
                      </label>
                    </div>

                    <div className="space-y-2 mt-4 p-6 bg-orange-50/30 rounded-3xl border border-orange-100 flex items-center justify-between shadow-sm">
                      <div>
                        <label className="text-lg font-black text-orange-950 block">Best Selling Pick</label>
                        <span className="text-sm text-orange-950/60 font-bold">Show this item in the "Best Selling Picks" section on the Home Page.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-110">
                        <input type="checkbox" name="isBestSelling" checked={editingProduct.isBestSelling || false} onChange={(e) => setEditingProduct({...editingProduct, isBestSelling: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-orange-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-orange-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 shadow-inner"></div>
                      </label>
                    </div>

                    <div className="space-y-2 mt-4 p-6 bg-blue-50/30 rounded-3xl border border-blue-100 flex items-center justify-between shadow-sm">
                      <div>
                        <label className="text-lg font-black text-blue-950 block">Limited Edition Set</label>
                        <span className="text-sm text-blue-950/60 font-bold">Show this item in the "Limited-edition Sets" section. Requires a video below.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-110">
                        <input type="checkbox" name="isLimitedEdition" checked={editingProduct.isLimitedEdition || false} onChange={(e) => setEditingProduct({...editingProduct, isLimitedEdition: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-blue-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-blue-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                      </label>
                    </div>

                    <div className="mt-4 p-6 bg-emerald-50/40 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
                      <div>
                        <label className="text-lg font-black text-emerald-950 block">Payment Methods</label>
                        <span className="text-sm text-emerald-950/60 font-bold">Control which checkout options customers can use for this product.</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-emerald-100 cursor-pointer">
                          <div>
                            <p className="font-black text-red-950 text-sm">Cash on Delivery</p>
                            <p className="text-xs text-red-950/50 font-medium">Allow COD orders</p>
                          </div>
                          <input type="checkbox" checked={editingProduct.allowCod !== false} onChange={(e) => setEditingProduct({ ...editingProduct, allowCod: e.target.checked })} className="w-5 h-5 accent-red-600 rounded" />
                        </label>
                        <label className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-emerald-100 cursor-pointer">
                          <div>
                            <p className="font-black text-red-950 text-sm">Pay Online (Prepaid)</p>
                            <p className="text-xs text-red-950/50 font-medium">Allow Razorpay / UPI / card</p>
                          </div>
                          <input type="checkbox" checked={editingProduct.allowPrepaid !== false} onChange={(e) => setEditingProduct({ ...editingProduct, allowPrepaid: e.target.checked })} className="w-5 h-5 accent-red-600 rounded" />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 p-6 bg-zinc-100 rounded-3xl border border-zinc-200 flex items-center justify-between shadow-sm">
                      <div>
                        <label className="text-lg font-black text-zinc-800 block">Save as Draft (Hidden)</label>
                        <span className="text-sm text-zinc-600 font-bold">Keep this product safely hidden from customers until you uncheck this.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer scale-110">
                        <input type="checkbox" name="isDraft" checked={editingProduct.isDraft || false} onChange={(e) => setEditingProduct({...editingProduct, isDraft: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-800 shadow-inner"></div>
                      </label>
                    </div>

                  </div>

                  {/* Column 3: Inventory & Media */}
                  <div className="space-y-6 bg-red-50/30 p-6 rounded-[2rem] border border-red-50">
                    
                    <div className="space-y-2">
                      <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Product SKU</label>
                      <input 
                        type="text" 
                        name="sku" 
                        value={editingProduct.sku || ''} 
                        onChange={handleEditChange} 
                        placeholder="e.g. TOY-001 (Leave blank to auto-generate)" 
                        className="w-full bg-white p-4 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none border border-red-50 font-mono font-black text-red-950 text-sm tracking-wide transition-all uppercase" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Default Stock Count</label>
                      <input type="number" name="countInStock" value={editingProduct.countInStock} onChange={handleEditChange} required placeholder="50" className="w-full bg-white p-4 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none border border-red-50 font-black text-red-950 text-xl transition-all" />
                    </div>

                    <CatalogToyCategoryField
                      tag={editingProduct.tag || ''}
                      onTagChange={(value) => handleEditChange({ target: { name: 'tag', value } })}
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Age Group</label>
                      <div className="w-full bg-white p-4 rounded-2xl border border-red-50 flex flex-wrap gap-2">
                        {['All Age', '0-12 MO', '12-36 MO', '2-5 YRS', '5-7 YRS', '7-10 YRS', '10-14 YRS', '14+ YRS'].map((ageOption) => {
                           const currentAges = Array.isArray(editingProduct.category) ? editingProduct.category : [];
                           const isSelected = currentAges.includes(ageOption);
                           return (
                             <label key={ageOption} className={`cursor-pointer px-4 py-2 rounded-xl border-2 transition-all font-bold text-sm ${isSelected ? 'border-red-600 bg-red-50 text-red-700' : 'border-red-100 bg-white text-red-950/50 hover:border-red-300'}`}>
                               <input 
                                 type="checkbox" 
                                 className="hidden" 
                                 checked={isSelected}
                                 onChange={(e) => {
                                    let newAges;
                                    if (e.target.checked) {
                                      if (ageOption === 'All Age') newAges = ['All Age'];
                                      else newAges = [...currentAges.filter(a => a !== 'All Age'), ageOption];
                                    } else {
                                      newAges = currentAges.filter(a => a !== ageOption);
                                    }
                                    setEditingProduct({...editingProduct, category: newAges});
                                 }} 
                               />
                               {ageOption === 'All Age' ? '🌟 All Age' : ageOption}
                             </label>
                           );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Upload Main Images (Max 7)</label>
                      <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading} className="w-full bg-white p-4 rounded-2xl border text-sm cursor-pointer" />
                      {editingProduct.images && editingProduct.images.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {editingProduct.images.map((img, idx) => (
                            <div key={idx} className="rounded-xl border bg-white p-1 shadow-sm aspect-square relative group">
                              {idx === 0 && <span className="absolute top-1 left-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold z-10 shadow-sm pointer-events-none">Main</span>}
                              <img src={resolveImage(img)} alt={`Preview ${idx}`} className="w-full h-full object-cover mix-blend-multiply" />
                              <button type="button" onClick={() => handleRemoveMainImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10 shadow-md" title="Remove Image">&times;</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 mt-6">
                      <label className="text-sm font-black text-red-950/40 uppercase tracking-widest ml-1">Upload Product Video (For Limited Edition)</label>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploading} className="w-full bg-white p-4 rounded-2xl border text-sm cursor-pointer" />
                      {editingProduct.videoUrl && (
                        <div className="mt-4 rounded-xl border bg-white p-2 shadow-sm relative group w-full aspect-video">
                          <video src={resolveImage(editingProduct.videoUrl)} controls className="w-full h-full rounded-lg" />
                          <button type="button" onClick={() => setEditingProduct({ ...editingProduct, videoUrl: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700 z-10 shadow-md" title="Remove Video">&times;</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- VARIANTS SECTION --- */}
                <div className="mt-12 pt-8 border-t-2 border-red-100">
                   <div className="flex justify-between items-center mb-6">
                     <div>
                        <h3 className="text-2xl font-black text-red-950">Product Variants (Colors & Sizes)</h3>
                        <p className="text-sm font-bold text-red-950/50 mt-1">Add combinations of colors and sizes. Leave blank if not applicable.</p>
                     </div>
                     <button type="button" onClick={handleAddVariant} className="bg-red-100 text-red-700 px-6 py-3 rounded-xl text-sm font-black hover:bg-red-200 transition-colors shadow-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">add_circle</span> Add Variant
                     </button>
                   </div>
                   {editingProduct.variants.length === 0 ? (
                       <div className="text-center p-8 bg-red-50/50 rounded-3xl border border-red-50 border-dashed">
                           <span className="material-symbols-outlined text-red-200 text-4xl mb-2">style</span>
                           <p className="text-red-950/40 font-bold">No variants added yet. This product will use default pricing and images.</p>
                       </div>
                   ) : (
                       <div className="space-y-6">
                         {editingProduct.variants.map((variant, index) => (
                           <div key={variant._id || variant._uiId || index} className="bg-white p-8 rounded-[2rem] border border-red-100 shadow-sm relative group">
                             {/* Keys MUST be unique to prevent inputs mixing across deleted items */}
                             <button type="button" onClick={() => handleRemoveVariant(index)} className="absolute top-6 right-6 text-red-500 hover:text-white font-bold text-sm bg-red-50 hover:bg-red-600 px-4 py-2 rounded-full transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">delete</span> Remove
                             </button>
                             <h4 className="text-lg font-black text-red-950 mb-6 flex items-center gap-2">
                                <span className="bg-red-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">{index + 1}</span> Variant Details
                                {variant.sku && <span className="text-xs font-mono text-red-950/40 ml-2">SKU: {variant.sku}</span>}
                             </h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                               <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <label className="text-xs font-black text-red-950/60 uppercase tracking-widest ml-1">Color (e.g. Red)</label>
                                     <input type="text" value={variant.color || ''} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} placeholder="Leave blank if none" className="w-full bg-red-50/30 p-4 rounded-2xl border border-red-50 outline-none focus:ring-2 focus:ring-red-600 mt-2 font-bold text-red-950" />
                                  </div>
                                  <div>
                                     <label className="text-xs font-black text-red-950/60 uppercase tracking-widest ml-1">Size/Height (e.g. XL)</label>
                                     <input type="text" value={variant.size || ''} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} placeholder="Leave blank if none" className="w-full bg-red-50/30 p-4 rounded-2xl border border-red-50 outline-none focus:ring-2 focus:ring-red-600 mt-2 font-bold text-red-950" />
                                  </div>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-xs font-black text-red-950/60 uppercase tracking-widest ml-1">Price</label>
                                    <input type="number" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} required className="w-full bg-red-50/30 p-4 rounded-2xl border border-red-50 outline-none focus:ring-2 focus:ring-red-600 mt-2 font-black text-red-600" />
                                  </div>
                                  <div>
                                    <label className="text-xs font-black text-red-950/60 uppercase tracking-widest ml-1">Stock</label>
                                    <input type="number" value={variant.countInStock} onChange={(e) => handleVariantChange(index, 'countInStock', e.target.value)} required className="w-full bg-red-50/30 p-4 rounded-2xl border border-red-50 outline-none focus:ring-2 focus:ring-red-600 mt-2 font-black text-red-950" />
                                  </div>
                               </div>
                             </div>
                             <div className="mb-6">
                                 <label className="text-xs font-black text-red-950/60 uppercase tracking-widest ml-1">Specific Description</label>
                                 <textarea value={variant.description} onChange={(e) => handleVariantChange(index, 'description', e.target.value)} className="w-full bg-red-50/30 p-4 rounded-2xl border border-red-50 outline-none focus:ring-2 focus:ring-red-600 mt-2 resize-none h-24 font-medium text-red-950/70" placeholder="Unique details about this specific variant..."></textarea>
                             </div>
                             <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50">
                               <label className="text-xs font-black text-red-950/60 uppercase tracking-widest ml-1 block mb-3">Upload Variant Images (Max 4)</label>
                               <input type="file" multiple accept="image/*" onChange={(e) => handleVariantFileUpload(e, index)} disabled={uploading} className="w-full text-sm cursor-pointer" />
                               {variant.images && variant.images.length > 0 && (
                                 <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                                   {variant.images.map((img, i) => (
                                     <div key={i} className="relative shrink-0 group/img">
                                       <img src={resolveImage(img)} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-red-100 mix-blend-multiply bg-white" />
                                       <button type="button" onClick={() => handleRemoveVariantImage(index, i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-700 shadow-md z-10" title="Remove Image">&times;</button>
                                     </div>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                   )}
                </div>

                <div className="pt-8 mt-8 border-t border-red-50 flex gap-4">
                  <button type="button" onClick={handleCancelForm} className="px-8 py-4 bg-red-50 text-red-950/60 font-black text-lg rounded-2xl hover:bg-red-100 transition-all">Cancel</button>
                  <button type="submit" disabled={isUpdating || uploading} className={`flex-1 py-4 text-white font-black text-lg rounded-2xl transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50 ${editingProduct.isDraft ? 'bg-zinc-800 hover:bg-black shadow-zinc-900/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}>
                    {isUpdating ? 'Saving to Database...' : (editingProduct.isDraft ? 'Save as Draft' : 'Publish Product')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className="mb-8">
              <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-red-950/50 hover:text-red-600 mb-4 transition-colors">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Dashboard
              </Link>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 p-8 rounded-[2.5rem] border border-white shadow-sm">
                <div><h1 className="text-3xl md:text-4xl font-black text-red-950 tracking-tight">Inventory Catalog</h1></div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button onClick={() => setShowBulkUpload(!showBulkUpload)} className="bg-red-50 text-red-700 px-6 py-4 rounded-2xl font-black hover:bg-red-100 transition-all flex items-center justify-center gap-2 hover:-translate-y-1 w-full sm:w-auto">
                    <span className="material-symbols-outlined">{showBulkUpload ? 'close' : 'upload_file'}</span> 
                    {showBulkUpload ? 'Close Upload' : 'Bulk Upload'}
                  </button>
                  <button onClick={handleCreateProduct} disabled={isCreating} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black shadow-md shadow-red-600/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2 hover:-translate-y-1 disabled:opacity-50 w-full sm:w-auto">
                    <span className="material-symbols-outlined">add_circle</span> Add New Toy
                  </button>
                </div>
              </div>
            </div>

            {showBulkUpload && (
               <BulkUpload onSuccess={() => refetchProducts()} />
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-red-950/40">search</span>
                <input type="text" placeholder="Search catalog by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white/80 border border-white shadow-sm pl-12 pr-4 py-3 rounded-full font-medium focus:ring-2 focus:ring-red-600 outline-none transition-all text-red-950 placeholder:text-red-950/40" />
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-red-50/50 border-b border-red-50">
                      <th className="p-5 text-xs font-black text-red-950/40 uppercase tracking-wider pl-8 w-24">Image</th>
                      <th className="p-5 text-xs font-black text-red-950/40 uppercase tracking-wider">Product Name</th>
                      <th className="p-5 text-xs font-black text-red-950/40 uppercase tracking-wider">Price</th>
                      <th className="p-5 text-xs font-black text-red-950/40 uppercase tracking-wider">Stock Status</th>
                      <th className="p-5 text-xs font-black text-red-950/40 uppercase tracking-wider">Tags & Visibility</th>
                      <th className="p-5 text-xs font-black text-red-950/40 uppercase tracking-wider pr-8 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products?.map((product) => (
                      <tr key={product._id} className={`transition-colors border-b border-red-50 group ${product.isDraft ? 'bg-zinc-50/50 hover:bg-zinc-100/50' : 'hover:bg-red-50/30'}`}>
                        <td className="p-5 pl-8">
                          <div className={`w-14 h-14 rounded-xl overflow-hidden shadow-sm border p-1 ${product.isDraft ? 'bg-zinc-100 border-zinc-200 opacity-60' : 'bg-white border-red-50'}`}>
                            <img src={resolveImage(product.img)} alt={product.title} className="w-full h-full object-cover mix-blend-multiply" />
                          </div>
                        </td>
                        <td className="p-5">
                          <p className={`font-bold text-sm max-w-[250px] truncate ${product.isDraft ? 'text-zinc-500' : 'text-red-950'}`} title={product.title}>{product.title}</p>
                          <p className="text-xs font-mono text-red-950/60 mt-1">SKU: {product.sku || 'Pending'}</p>
                          <p className="text-xs font-mono text-red-950/40">ID: ...{product._id.substring(product._id.length - 6)}</p>
                        </td>
                        <td className="p-5">
                          <p className={`text-sm font-black ${product.isDraft ? 'text-zinc-600' : 'text-red-950'}`}>₹{product.price}</p>
                          {product.oldPrice > 0 && <p className="text-xs text-red-950/40 line-through">₹{product.oldPrice}</p>}
                        </td>
                        <td className="p-5">
                          {product.countInStock > 10 ? (
                            <span className={`text-xs font-black px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1 w-max ${product.isDraft ? 'bg-zinc-200 text-zinc-600 border-zinc-300' : 'bg-green-50 text-green-700 border-green-200'}`}>
                              <span className="material-symbols-outlined text-[14px]">inventory</span> {product.countInStock} Default
                            </span>
                          ) : product.countInStock > 0 ? (
                            <span className="bg-orange-50 text-orange-700 text-xs font-black px-3 py-1.5 rounded-full border border-orange-200 shadow-sm flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-[14px]">warning</span> Low: {product.countInStock} Default
                            </span>
                          ) : (
                            <span className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-[14px]">error</span> Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="p-5">
                          <span className="bg-white text-red-950/70 text-xs font-bold px-3 py-1 rounded-full border border-red-100 max-w-[150px] truncate inline-block align-bottom" title={product.tag || 'No Category'}>
                            {product.tag || 'No Category'}
                          </span>
                          
                          {product.isDraft && (
                            <span className="bg-zinc-800 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm mt-1.5 ml-2 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">visibility_off</span> Draft
                            </span>
                          )}
                          
                          {product.isPopular && !product.isDraft && (
                            <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm mt-1.5 ml-2 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">star</span> Popular
                            </span>
                          )}
                          {!product.isDraft && product.allowCod === false && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200 mt-1.5 ml-1 inline-block">No COD</span>
                          )}
                          {!product.isDraft && product.allowPrepaid === false && (
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200 mt-1.5 ml-1 inline-block">Prepaid only off</span>
                          )}
                        </td>
                        <td className="p-5 pr-8 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { 
                                setEditingProduct({ 
                                  ...product, 
                                  title: product.title,
                                  price: product.price,
                                  oldPrice: product.oldPrice,
                                  countInStock: product.countInStock,
                                  isPopular: product.isPopular || false,
                                  isBestSelling: product.isBestSelling || false,
                                  isLimitedEdition: product.isLimitedEdition || false,
                                  videoUrl: product.videoUrl || '',
                                  images: product.images || [],
                                  variants: product.variants || [],
                                  category: Array.isArray(product.category) ? product.category : (product.category ? product.category.split(',').map(c => c.trim()) : []),
                                  tag: product.tag || '',
                                  sku: product.sku || '',
                                  isDraft: product.isDraft || false,
                                  allowCod: product.allowCod !== false,
                                  allowPrepaid: product.allowPrepaid !== false,
                                  specifications: product.specifications || [] // Phase 2: Load specs into state
                                }); 
                                setIsCreatingNew(false); setIsFormOpen(true); window.scrollTo(0, 0); 
                              }}
                              className="w-10 h-10 rounded-full bg-white text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors shadow-sm border border-red-100"
                              title="Edit Details"
                            ><span className="material-symbols-outlined text-[18px]">edit</span></button>
                            <button onClick={() => handleDeleteProduct(product._id)} disabled={isDeleting} className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors shadow-sm border border-red-100 disabled:opacity-50" title="Delete Toy">
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
          </div>
        )}
      </div>
    </main>

    <ConfirmModal
      isOpen={confirmCreateOpen}
      onConfirm={confirmCreate}
      onCancel={() => { setConfirmCreateOpen(false); }}
      title="Create New Product?"
      message="This will create a blank product template for you to fill in."
      confirmText="Create"
      cancelText="Cancel"
      variant="info"
      icon="add_circle"
    />

    <ConfirmModal
      isOpen={!!confirmDeleteId}
      onConfirm={confirmDelete}
      onCancel={() => { setConfirmDeleteId(null); }}
      title="Delete This Toy?"
      message="This action is permanent and cannot be undone. All product data and images will be removed."
      confirmText="Delete Forever"
      cancelText="Keep It"
      variant="danger"
      icon="delete_forever"
    />

    {/* 3-Way Discard / Save Draft Modal */}
    {confirmDiscardOpen && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
        <div 
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setConfirmDiscardOpen(false)}
        />
        <div className="relative bg-white rounded-[2rem] shadow-2xl shadow-slate-900/20 w-full max-w-sm overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-white/80">
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                save_as
              </span>
            </div>
            <h3 className="text-lg font-black text-red-950 mb-2">Unsaved Changes</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[280px] mx-auto">
              What would you like to do with your changes? You can save as a hidden draft and finish later, or discard your edits.
            </p>
          </div>
          <div className="px-8 pb-8 flex flex-col gap-3">
            <button
              onClick={handleSaveAsDraftFromModal}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-zinc-800 hover:bg-black shadow-lg shadow-zinc-900/20 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">visibility_off</span>
              Save as Draft
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDiscardOpen(false)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all duration-200"
              >
                Keep Editing
              </button>
              <button
                onClick={confirmDiscard}
                className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all duration-200 hover:-translate-y-0.5"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminCatalog;