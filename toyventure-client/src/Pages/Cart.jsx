import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { removeFromCart, updateQuantity, clearCart } from '../features/cart/cartSlice';

const resolveImage = (imgPath) => {
  if (!imgPath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
  const baseUrl = apiBaseUrl.replace('/api', '');
  return `${baseUrl}${imgPath}`;
};

const Cart = () => {
  const cartItems = useSelector((state) => state.cart.cartItems);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const userInfoData = sessionStorage.getItem('userInfo');
  const userInfo = (userInfoData && userInfoData !== 'null' && userInfoData !== 'undefined') 
                   ? JSON.parse(userInfoData) 
                   : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getNumericPrice = (priceStr) => {
    if (!priceStr) return 0;
    return Number(String(priceStr).replace(/[^0-9.-]+/g, "")) || 0;
  };

  const subtotal = cartItems.reduce((acc, item) => {
    const price = getNumericPrice(item.price);
    const qty = parseInt(item.qty, 10) || 1;
    return acc + (price * qty);
  }, 0);

  const delivery = subtotal < 500 && cartItems.length > 0 ? 50 : 0; 
  const total = subtotal + delivery;

  const handleIncrease = (item) => {
    if (item.qty < item.countInStock) {
      dispatch(updateQuantity({ id: item._id, variant: item.variant, qty: (item.qty || 1) + 1 }));
    } else {
      alert(`Sorry, we only have ${item.countInStock} units available.`);
    }
  };

  const handleDecrease = (item) => {
    if (item.qty > 1) {
      dispatch(updateQuantity({ id: item._id, variant: item.variant, qty: item.qty - 1 }));
    } else {
      dispatch(removeFromCart({ id: item._id, variant: item.variant }));
    }
  };

  // --- Check if any item in the cart is out of stock ---
  const hasOutOfStockItems = cartItems.some(item => item.countInStock === 0);

  const handleCheckout = () => {
    if (hasOutOfStockItems) {
        alert("Please remove out of stock items from your cart before proceeding.");
        return;
    }
    navigate('/checkout');
  };

  if (!userInfo) {
    return (
      <main className="pt-32 pb-24 min-h-screen bg-surface flex flex-col items-center justify-center px-6 fade-in">
        <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-[48px] text-zinc-300">lock</span>
        </div>
        <h2 className="text-3xl font-black text-zinc-800 mb-4">Login to View Cart</h2>
        <p className="text-zinc-500 font-bold mb-8 text-center max-w-md">Please log in or create an account to view and manage your shopping cart.</p>
        <Link to="/auth?redirect=/cart" className="px-8 py-4 bg-primary-container text-white font-black rounded-full hover:-translate-y-1 shadow-md hover:shadow-lg transition-all flex items-center gap-2">
          Login / Sign Up <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="pt-32 pb-24 min-h-screen bg-surface flex flex-col items-center justify-center px-6 fade-in">
        <span className="material-symbols-outlined text-[80px] text-zinc-300 mb-6">shopping_bag</span>
        <h2 className="text-3xl font-black text-zinc-800 mb-4">Your cart is empty!</h2>
        <p className="text-xs text-zinc-500 font-bold mb-4 text-center">Taxes and shipping calculated at checkout. Free shipping on orders over ₹500.</p>
        <Link to="/shop" className="px-8 py-4 bg-primary-container text-white font-black rounded-full hover:-translate-y-1 hover:shadow-lg transition-all">
          Discover Toys
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-24 min-h-screen bg-surface bg-hero-glow relative fade-in">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT SIDE: CART ITEMS */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8 border-b border-white pb-6">
            <h1 className="text-3xl font-black text-zinc-800 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container text-[36px]">shopping_cart</span>
              Your Cart
            </h1>
            <button 
              onClick={() => dispatch(clearCart())}
              className="text-red-500 font-bold text-sm hover:underline flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span> Clear Cart
            </button>
          </div>

          {/* --- Global Cart Warning for Out of Stock --- */}
          {hasOutOfStockItems && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl flex items-start gap-3 shadow-sm animate-pulse">
                  <span className="material-symbols-outlined mt-0.5">error</span>
                  <div>
                      <p className="font-black text-sm">Action Required</p>
                      <p className="text-xs font-medium mt-1">One or more items in your cart are currently out of stock. You must remove them to proceed to checkout.</p>
                  </div>
              </div>
          )}

          <div className="space-y-6">
            {cartItems.map((item) => {
              const itemPrice = getNumericPrice(item.price);
              const itemQty = parseInt(item.qty, 10) || 1;
              const itemTotal = itemPrice * itemQty;
              
              const isOutOfStock = item.countInStock === 0;
              const isExceedingStock = itemQty > item.countInStock && item.countInStock > 0;
              const hasStockError = isOutOfStock || isExceedingStock;

              return (
                <div key={`${item._id}-${item.variant}`} className={`card-surface p-4 md:p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center gap-6 relative border ${hasStockError ? 'border-red-400 bg-red-50/50' : 'border-white shadow-sm'}`}>
                  
                  <div className="flex gap-4 md:contents w-full">
                    <Link to={`/product/${item._id}`} className="w-24 h-24 md:w-32 md:h-32 bg-white/60 rounded-[1.5rem] p-2 flex-shrink-0 shadow-inner">
                      <img src={resolveImage(item.image || item.img)} alt={item.title || item.name} className={`w-full h-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-110 ${item.countInStock === 0 ? 'grayscale opacity-60' : ''}`} />
                    </Link>

                    <div className="flex-1 text-left">
                      <Link to={`/product/${item._id}`}>
                        <h3 className="font-bold text-zinc-800 text-lg hover:text-primary-container transition-colors line-clamp-2 pr-8">{item.title || item.name}</h3>
                      </Link>
                      {item.variant && <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">{item.variant}</p>}
                      <p className="text-zinc-500 font-bold text-sm mt-1 md:hidden">₹{itemPrice.toLocaleString('en-IN')} x {itemQty}</p>
                      <p className="text-zinc-500 font-bold text-sm mt-1 hidden md:block">₹{itemPrice.toLocaleString('en-IN')}</p>
                      
                      {/* --- Item-level Out of Stock Badge --- */}
                      {isOutOfStock && (
                          <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-1 justify-start">
                              <span className="material-symbols-outlined text-[14px]">warning</span> Out of Stock
                          </p>
                      )}
                    </div>
                  </div>

                  {/* Wrapper to fix mobile alignment - Forces row layout on mobile */}
                  <div className="flex items-center justify-between w-full md:w-auto mt-2 md:mt-0 gap-4">
                    <div className="flex items-center gap-4 bg-white/60 rounded-full px-4 py-2 shadow-inner border border-white">
                      <button onClick={() => handleDecrease(item)} disabled={isOutOfStock} className="text-zinc-500 hover:text-red-500 font-black text-xl w-6 flex justify-center items-center transition-colors disabled:opacity-50">-</button>
                      <span className="font-black text-zinc-800 w-6 text-center">{itemQty}</span>
                      <button 
                        onClick={() => handleIncrease(item)} 
                        disabled={itemQty >= item.countInStock || isOutOfStock}
                        className={`font-black text-xl w-6 flex justify-center items-center transition-colors ${itemQty >= item.countInStock ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-500 hover:text-green-500'}`}
                      >+</button>
                    </div>

                    <div className="text-xl font-black text-zinc-800 text-right md:w-28">
                      ₹{itemTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Fixed Delete Button Position */}
                  <button 
                    onClick={() => dispatch(removeFromCart({ id: item._id, variant: item.variant }))}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm md:shadow-none md:bg-transparent z-10"
                    title="Remove Item"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>

                  {isExceedingStock && (
                     <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 text-xs font-bold px-4 py-1 rounded-full shadow-sm whitespace-nowrap">
                       Only {item.countInStock} available. Please reduce quantity.
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE: ORDER SUMMARY */}
        <div className="lg:col-span-4">
          <div className="card-surface p-8 rounded-[2.5rem] shadow-soft sticky top-32 border border-white">
            <h2 className="text-2xl font-black text-zinc-800 mb-6 border-b border-white pb-4">Order Summary</h2>
            
            <div className="space-y-4 text-sm font-bold text-zinc-600 mb-6">
              <div className="flex justify-between items-center">
                <span>Subtotal ({cartItems.length} items)</span>
                <span className="text-zinc-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-zinc-600">
                <span>Shipping {delivery > 0 ? '(Under ₹500)' : ''}</span>
                <span className={delivery === 0 ? "text-green-500 font-bold" : "font-bold text-zinc-800"}>
                  {delivery === 0 ? 'Free' : `₹${delivery.toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="border-t border-white pt-6 mb-8 flex justify-between items-end">
              <span className="text-lg font-bold text-zinc-800">Total</span>
              <span className="text-3xl font-black text-primary-container">₹{total.toFixed(2)}</span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={hasOutOfStockItems}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 block text-center shadow-xl ${hasOutOfStockItems ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed opacity-70' : 'bg-zinc-900 text-white hover:bg-black hover:-translate-y-1'}`}
            >
             {hasOutOfStockItems ? 'Resolve Cart Issues' : 'Proceed to Checkout'} 
             {!hasOutOfStockItems && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
            
            <p className="text-center text-[10px] text-zinc-400 font-bold mt-4 uppercase tracking-wider flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified_user</span> Secure Checkout
            </p>
          </div>
        </div>

      </div>
    </main>
  );
};

export default Cart;