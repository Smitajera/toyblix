import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toggleFavorite } from '../features/wishlist/wishlistSlice';
import ScrollReveal from '../components/ScrollReveal';

const ASSET_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || (import.meta.env.PROD ? '' : 'http://localhost:5000');

const resolveImage = (imgSrc) => {
  if (!imgSrc) return '';
  return imgSrc.startsWith('/uploads') ? `${ASSET_BASE_URL}${imgSrc}` : imgSrc;
};

const Favorites = () => {
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state) => state.wishlist?.wishlistItems || []);
  
  // FIX: Bulletproof check to ensure we don't accidentally read "null" as a logged-in user
  const userInfoData = sessionStorage.getItem('userInfo');
  const userInfo = (userInfoData && userInfoData !== 'null' && userInfoData !== 'undefined') 
                   ? JSON.parse(userInfoData) 
                   : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const displayPrice = (price) => {
    if (price === undefined || price === null) return '₹0';
    return '₹' + Number(price).toLocaleString('en-IN');
  };

  // ==========================================
  // NOT LOGGED IN STATE
  // ==========================================
  if (!userInfo) {
    return (
      <main className="pt-32 pb-24 min-h-screen bg-surface flex flex-col items-center justify-center px-6 fade-in">
        <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[48px] text-zinc-300">lock</span>
        </div>
        <h2 className="text-3xl font-black text-zinc-800 mb-4">Login to View Favorites</h2>
        <p className="text-zinc-500 font-bold mb-8 text-center max-w-md">Please log in or create an account to view your saved magical toys.</p>
        <Link to="/auth?redirect=/favorites" className="px-8 py-4 bg-primary-container text-white font-black rounded-full hover:-translate-y-1 shadow-md hover:shadow-lg transition-all flex items-center gap-2">
          Login / Sign Up <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </main>
    );
  }

  // ==========================================
  // EMPTY FAVORITES STATE
  // ==========================================
  if (wishlistItems.length === 0) {
    return (
      <main className="pt-32 pb-24 min-h-screen bg-surface flex flex-col items-center justify-center px-6 fade-in">
        <span className="material-symbols-outlined text-[80px] text-zinc-300 mb-6">favorite_border</span>
        <h2 className="text-3xl font-black text-zinc-800 mb-4">No favorites yet!</h2>
        <p className="text-zinc-500 font-bold mb-8 text-center max-w-md">Save the toys you love by clicking the heart icon while shopping.</p>
        <Link to="/shop" className="px-8 py-4 bg-primary-container text-white font-black rounded-full hover:-translate-y-1 hover:shadow-lg transition-all">
          Explore Shop
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-24 min-h-screen bg-surface bg-hero-glow relative fade-in">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-row items-start sm:items-center justify-between mb-10 border-b border-white pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-800 flex items-center gap-3 tracking-tight">
              <span className="material-symbols-outlined text-primary-container text-[36px]">favorite</span>
              Your Favorites
            </h1>
            <p className="text-zinc-500 font-bold mt-2">All your saved magical toys in one place.</p>
          </div>
          
          <span className="bg-white/60 px-4 py-2 rounded-full border border-white shadow-sm text-sm font-bold text-zinc-500 whitespace-nowrap">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        {/* PRODUCTS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {wishlistItems.map((product, index) => (
            <ScrollReveal as="div" key={product._id} delay={index * 50} className="flex flex-col group relative card-surface p-4 rounded-[2rem] hover:-translate-y-2 transition-all duration-300 shadow-sm border border-white">
              
              <button 
                onClick={(e) => { 
                  e.preventDefault(); 
                  dispatch(toggleFavorite(product)); 
                }} 
                className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md transition-all hover:scale-110"
                title="Remove from favorites"
              >
                <span className="material-symbols-outlined text-[20px] text-red-500 filled">favorite</span>
              </button>

              <Link to={`/product/${product._id}`} className="w-full aspect-square bg-white/50 rounded-[1.5rem] overflow-hidden relative mb-5 shadow-inner border border-white/60 block z-10 isolate">
                <img 
                  alt={product.title} 
                  className="w-full h-full object-cover mix-blend-multiply p-2 transition-transform duration-700 group-hover:scale-110" 
                  src={resolveImage(product.img)} 
                />
              </Link>

              <div className="px-2 flex flex-col flex-1">
                <Link to={`/product/${product._id}`}>
                  <h3 className="font-bold text-zinc-800 text-base leading-snug hover:text-primary-container transition-colors line-clamp-2 h-11 mb-2">
                    {product.title}
                  </h3>
                </Link>
                <div className="flex items-center justify-between mt-auto pt-2">
                  <span className="text-zinc-800 font-black text-xl tracking-tight">{displayPrice(product.price)}</span>
                  {product.countInStock > 0 ? (
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">In Stock</span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">Sold Out</span>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>
    </main>
  );
};

export default Favorites;