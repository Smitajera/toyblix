const fs = require('fs');
let content = fs.readFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', 'utf8');

// 1. Add handleBuyNow
content = content.replace(
`    }
  };

  const handleNotifySubmit = async (e) => {`,
`    }
  };

  const handleBuyNow = () => {
    const variantString = [selectedColor, selectedSize].filter(Boolean).join(' - ');
    const cartPayload = { 
      ...product, 
      price: displayPriceValue,      
      countInStock: displayStock,    
      image: mainImage,              
      variant: variantString || null, 
      qty: 1 
    };

    if (!userInfo) {
      dispatch(setPendingItem(cartPayload));
      navigate('/cart');
    } else {
      dispatch(addToCart(cartPayload));
      if (displayStock === 0) {
          toast.error(\`Added to cart, but currently out of stock. Checkout is disabled until restocked.\`);
      } else {
          navigate('/checkout');
      }
    }
  };

  const handleNotifySubmit = async (e) => {`
);

// 2. Remove padding from thumbnail images
content = content.replace(
  /className="w-full h-full object-cover mix-blend-multiply p-1"/g,
  'className="w-full h-full object-cover mix-blend-multiply"'
);

// 3. Remove padding from main image container
content = content.replace(
  `className="flex-1 aspect-square card-surface rounded-[2rem] p-4 flex items-center justify-center shadow-soft relative overflow-hidden cursor-zoom-in transform-gpu border border-white"`,
  `className="flex-1 aspect-square card-surface rounded-[2rem] flex items-center justify-center shadow-soft relative overflow-hidden cursor-zoom-in transform-gpu border border-white"`
);

// 4. Update the Add to Cart UI to include Buy Now button
content = content.replace(
`            <div className="flex gap-4">
               <button 
                 onClick={handleAddToCart} 
                 className={\`flex-1 py-5 font-black text-xl rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group \${displayStock === 0 ? 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300' : 'bg-zinc-900 text-white hover:bg-black hover:-translate-y-1'}\`}
               >
                 {displayStock === 0 ? 'Add to Cart (Waitlist)' : 'Add to Cart'}
                 <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">shopping_cart_checkout</span>
               </button>
              
              <button 
                onClick={() => {
                    dispatch(toggleFavorite(product));
                    isMainProductFavorited ? toast.error('Removed from favorites') : toast.success('Added to favorites!');
                }} 
                className={\`w-20 rounded-[2rem] border-2 transition-all flex items-center justify-center hover:-translate-y-1 active:scale-95 shadow-md shrink-0 \${isMainProductFavorited ? 'border-red-500 bg-red-50 text-red-500' : 'border-white bg-white/60 text-zinc-400 hover:border-red-200 hover:text-red-400'}\`} 
                title="Add to Wishlist"
              >
                <span className={\`material-symbols-outlined text-[32px] \${isMainProductFavorited ? 'filled' : ''}\`}>favorite</span>
              </button>
            </div>`,
`            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                 <button 
                   onClick={handleAddToCart} 
                   className={\`flex-1 py-4 font-black text-lg rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group border-2 \${displayStock === 0 ? 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300 border-transparent' : 'bg-white border-zinc-900 text-zinc-900 hover:bg-zinc-50 hover:-translate-y-1'}\`}
                 >
                   {displayStock === 0 ? 'Add to Cart (Waitlist)' : 'Add to Cart'}
                   <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">add_shopping_cart</span>
                 </button>
                
                <button 
                  onClick={() => {
                      dispatch(toggleFavorite(product));
                      isMainProductFavorited ? toast.error('Removed from favorites') : toast.success('Added to favorites!');
                  }} 
                  className={\`w-20 rounded-[2rem] border-2 transition-all flex items-center justify-center hover:-translate-y-1 active:scale-95 shadow-md shrink-0 \${isMainProductFavorited ? 'border-red-500 bg-red-50 text-red-500' : 'border-white bg-white/60 text-zinc-400 hover:border-red-200 hover:text-red-400'}\`} 
                  title="Add to Wishlist"
                >
                  <span className={\`material-symbols-outlined text-[32px] \${isMainProductFavorited ? 'filled' : ''}\`}>favorite</span>
                </button>
              </div>
              <button 
                onClick={handleBuyNow} 
                className={\`w-full py-5 font-black text-xl rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group \${displayStock === 0 ? 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300' : 'bg-primary-container text-white hover:bg-orange-600 hover:-translate-y-1'}\`}
                disabled={displayStock === 0}
              >
                Buy Now
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">bolt</span>
              </button>
            </div>`
);

fs.writeFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', content, 'utf8');
console.log('Script completed');
