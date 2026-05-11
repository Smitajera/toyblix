const fs = require('fs');
let content = fs.readFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', 'utf8');
let lines = content.split('\n');

// Find the corrupted paragraph block starting at line 497 (0-indexed: 496)
// Lines 497-515 (0-indexed 496-514) need to be replaced with correct JSX
const corruptedBlock = lines.slice(496, 515).join('\n');

const correctBlock = `            <p className="text-zinc-600 font-medium leading-relaxed mb-8">
              {displayDescription || "Bring home the magic with this incredible toy! Spark creativity, imagination, and endless hours of joy."}
            </p>

            <div className="flex gap-4">
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
            </div>`;

// Replace lines 496-514 (0-indexed) with the correct block
lines.splice(496, 19, correctBlock);

fs.writeFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', lines.join('\n'), 'utf8');
console.log('Fixed corrupted block. Total lines:', lines.length);
