const fs = require('fs');
let content = fs.readFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', 'utf8');
let lines = content.split('\n');

// Keep everything up to and including line 691 (0-indexed: 690)
// Line 688: </div>   -- closes login div
// Line 689: )}        -- closes userInfo conditional
// Line 690: </div>    -- closes lg:col-span-5 right column
// Line 691: </div>    -- closes the reviews grid
lines = lines.slice(0, 691);

const cleanEnding = `
        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-16 border-t border-white">
            <h2 className="text-3xl font-black text-zinc-800 mb-8 text-center">You Might Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relProduct, index) => {
                const isRelFavorited = wishlistItems.some((w) => w._id === relProduct._id);
                return (
                  <ScrollReveal as="div" key={relProduct._id} delay={index * 50} className="flex flex-col group relative card-surface p-4 rounded-[2rem] hover:-translate-y-2 transition-all duration-300">
                    <button 
                      onClick={(e) => { 
                          e.preventDefault(); 
                          dispatch(toggleFavorite(relProduct)); 
                          isRelFavorited ? toast.error('Removed from favorites') : toast.success('Added to favorites!');
                      }} 
                      className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                    >
                      <span className={\`material-symbols-outlined text-[20px] transition-colors \${isRelFavorited ? 'text-red-500 filled' : 'text-zinc-400 hover:text-red-400'}\`}>favorite</span>
                    </button>
                    <Link to={\`/product/\${relProduct._id}\`} className="w-full aspect-[4/3] bg-white/50 rounded-[1.5rem] overflow-hidden relative mb-4 shadow-inner border border-white/60 block z-10 isolate transform-gpu">
                      <img alt={relProduct.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 mix-blend-multiply transform-gpu" src={resolveImage(relProduct.img)} />
                    </Link>
                    <div className="px-2 flex flex-col flex-1">
                      <Link to={\`/product/\${relProduct._id}\`}>
                        <h3 className="font-bold text-zinc-800 text-sm leading-snug hover:text-primary-container transition-colors line-clamp-2 h-10 mb-2">{relProduct.title}</h3>
                      </Link>
                      <span className="text-zinc-800 font-black text-lg tracking-tight">{displayPrice(relProduct.price)}</span>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.main>
  );
};

export default ProductDetail;
`;

lines.push(cleanEnding);
fs.writeFileSync('c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx', lines.join('\n'), 'utf8');
console.log('Done. Total lines:', lines.length);
