import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { useGetComboByIdQuery } from '../features/api/apiSlice';
import { addToCart, setPendingItem } from '../features/cart/cartSlice';
import { getComboAgeLabel } from '../constants/comboAgeGroups';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '');

const resolveImage = (img) => {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  return img.startsWith('/uploads') ? `${ASSET_BASE_URL}${img}` : img;
};

const ComboDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: combo, isLoading, error } = useGetComboByIdQuery({ id });

  const handleAddToCart = () => {
    if (!combo || combo.countInStock < 1) {
      toast.error('This combo is out of stock.');
      return;
    }
    const userInfo = sessionStorage.getItem('userInfo');
    const parsed = userInfo && userInfo !== 'null' ? JSON.parse(userInfo) : null;
    const cartItem = {
      _id: combo._id,
      title: combo.title,
      price: combo.price,
      img: combo.img,
      qty: 1,
      isCombo: true,
      comboAgeGroup: combo.ageGroup,
      countInStock: combo.countInStock,
    };
    if (!parsed) {
      dispatch(setPendingItem(cartItem));
      navigate('/cart');
    } else {
      dispatch(addToCart(cartItem));
      toast.success('Combo added to cart!');
    }
  };

  if (isLoading) {
    return <div className="pt-32 text-center font-bold text-red-950/50">Loading combo...</div>;
  }
  if (error || !combo) {
    return (
      <div className="pt-32 text-center">
        <p className="font-bold text-red-950">Combo not found.</p>
        <Link to="/shop" className="text-red-600 font-bold mt-4 inline-block">Back to shop</Link>
      </div>
    );
  }

  const discount = combo.oldPrice > combo.price
    ? Math.round(((combo.oldPrice - combo.price) / combo.oldPrice) * 100)
    : null;

  return (
    <main className="pt-28 pb-24 min-h-screen bg-white fade-in">
      <div className="max-w-5xl mx-auto px-6">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-red-950/50 hover:text-red-600 mb-8">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-red-50/30 rounded-[2rem] p-6 border border-red-50">
            <img src={resolveImage(combo.img)} alt={combo.title} className="w-full aspect-square object-cover rounded-2xl" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
              Age Combo · {getComboAgeLabel(combo.ageGroup)}
            </span>
            <h1 className="text-3xl md:text-4xl font-black text-red-950 mt-4">{combo.title}</h1>
            <p className="text-red-950/60 font-medium mt-3 leading-relaxed">{combo.description}</p>
            <div className="flex items-baseline gap-3 mt-6">
              <span className="text-3xl font-black text-red-950">₹{Number(combo.price).toLocaleString('en-IN')}</span>
              {combo.oldPrice > 0 && (
                <>
                  <span className="text-lg text-red-950/40 line-through">₹{Number(combo.oldPrice).toLocaleString('en-IN')}</span>
                  {discount && <span className="text-sm font-black text-green-600">{discount}% off</span>}
                </>
              )}
            </div>
            <p className="text-sm font-bold text-red-950/50 mt-2">
              {combo.countInStock > 0 ? `${combo.countInStock} bundles available` : 'Out of stock'}
            </p>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={combo.countInStock < 1}
              className="mt-8 w-full py-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20"
            >
              Add Combo to Cart
            </button>

            <div className="mt-10">
              <h2 className="text-lg font-black text-red-950 mb-4">Included in this bundle</h2>
              <ul className="space-y-3">
                {(combo.items || []).map((row) => {
                  const p = row.product;
                  if (!p || typeof p !== 'object') return null;
                  return (
                    <li key={p._id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-50">
                      <img src={resolveImage(p.img)} alt="" className="w-12 h-12 rounded-lg object-cover border border-red-50" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-red-950 text-sm truncate">{p.title}</p>
                        <p className="text-xs text-red-950/50">Qty {row.quantity} · ₹{p.price} each</p>
                      </div>
                      <Link to={`/product/${p._id}`} className="text-xs font-black text-red-600 hover:underline shrink-0">View</Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ComboDetail;
