const fs = require('fs');
const path = 'c:\\toyVenture\\toyventure-client\\src\\Pages\\ProductDetail.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state variables
content = content.replace(
  /const \[rating, setRating\] = useState\(5\);\s*const \[comment, setComment\] = useState\(''\);\s*const \[notifyEmail, setNotifyEmail\] = useState\(''\);/,
  "const [rating, setRating] = useState(5);\n  const [comment, setComment] = useState('');\n  const [reviewImages, setReviewImages] = useState([]);\n  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);\n  const [notifyEmail, setNotifyEmail] = useState('');"
);

// 2. Update submitReviewHandler and add handleReviewImageUpload
content = content.replace(
  /const submitReviewHandler = async \(e\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?toast\.error[^}]*\}[\s\S]*?\};/,
  `const submitReviewHandler = async (e) => {
    e.preventDefault();
    try {
      await createReview({ productId: id, rating, comment, images: reviewImages }).unwrap();
      toast.success('Thanks for the review! ⭐'); 
      setRating(5); setComment(''); setReviewImages([]);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit review.');
    }
  };

  const handleReviewImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (reviewImages.length + files.length > 4) {
      return toast.error("You can only upload a maximum of 4 images per review.");
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    setIsUploadingReviewImage(true);
    try {
        const token = sessionStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(\`\${API_BASE_URL}/upload\`, { 
            method: 'POST', 
            headers: token ? { authorization: \`Bearer \${token}\` } : {}, 
            body: formData 
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json(); 
        setReviewImages((prev) => [...prev, ...data]);
    } catch (error) { 
        toast.error('Image upload failed.'); 
    } finally { 
        setIsUploadingReviewImage(false); 
        e.target.value = null;
    }
  };`
);

// 3. Layout changes - Left Side and Right Side Reordering
const oldLayoutRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">[\s\S]*?(<div className="mb-8">\s*<h3 className="text-lg font-bold text-zinc-800 mb-2">About this item<\/h3>[\s\S]*?<\/div>|(?=<\/div>\s*<p className="text-zinc-600 font-medium leading-relaxed mb-8 text-lg">))/;

const newLayout = `        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          
          {/* LEFT COLUMN: IMAGES */}
          <div className="lg:col-span-5 flex flex-col md:flex-row gap-4 relative group">
            
            {/* Desktop Vertical Thumbnails */}
            <div className="hidden md:flex flex-col gap-3 overflow-y-auto max-h-[500px] w-20 shrink-0 custom-scrollbar pr-1">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImage(imgUrl)}
                  className={\`w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-300 bg-white shadow-sm transform-gpu \${mainImage === imgUrl ? 'border-primary-container shadow-md scale-105' : 'border-white/80 opacity-60 hover:opacity-100 hover:scale-105'}\`}
                >
                  <img src={resolveImage(imgUrl)} alt={\`Angle \${idx + 1}\`} className="w-full h-full object-cover mix-blend-multiply p-1" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div
              className="flex-1 aspect-square card-surface rounded-[2rem] p-4 flex items-center justify-center shadow-soft relative overflow-hidden cursor-zoom-in transform-gpu border border-white"
              onClick={() => openModal(mainImage)}
            >
              <img
                src={resolveImage(mainImage)}
                alt={product.title}
                decoding="async"
                className={\`w-full h-full object-cover mix-blend-multiply transition-transform duration-300 hover:scale-[1.03] \${displayStock === 0 ? 'opacity-80' : ''}\`}
              />
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full text-zinc-600 shadow-md opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all">
                  <span className="material-symbols-outlined">fullscreen</span>
              </div>
            </div>
            
            {/* Mobile Horizontal Thumbnails */}
            <div className="flex md:hidden items-center justify-start gap-3 mt-2 overflow-x-auto w-full pb-2">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImage(imgUrl)}
                  className={\`w-16 h-16 shrink-0 rounded-2xl overflow-hidden border-[3px] transition-all duration-300 bg-white shadow-sm transform-gpu \${mainImage === imgUrl ? 'border-primary-container shadow-lg scale-110' : 'border-white/80 opacity-60 hover:opacity-100 hover:scale-105'}\`}
                >
                  <img src={resolveImage(imgUrl)} alt={\`Angle \${idx + 1}\`} className="w-full h-full object-cover mix-blend-multiply p-1" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILS */}
          <div className="lg:col-span-7 flex flex-col justify-start">
            
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-black text-zinc-800 tracking-tight leading-tight mb-2">{product.title}</h1>
            
            {/* Reviews */}
            {product.numReviews > 0 && (
              <div className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity w-max" onClick={() => document.getElementById('reviews-section')?.scrollIntoView({behavior: 'smooth'})}>
                <div className="flex gap-0.5">{renderStars(Math.round(product.rating) || 5)}</div>
                <span className="text-sm font-bold text-primary-container hover:underline">{product.numReviews} ratings</span>
              </div>
            )}

            {/* Stock Badge */}
            <div className="mb-4 flex gap-3">
              {displayStock > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-green-700 font-bold text-sm tracking-wide">
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span> In Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-red-600 font-bold text-sm tracking-wide">
                  <span className="material-symbols-outlined text-[18px]">error</span> Temporarily Out of Stock
                </span>
              )}
            </div>

            {/* Price Section */}
            <div className="mb-6 pb-6 border-b border-white">
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="text-4xl font-black text-zinc-900">{displayPrice(displayPriceValue)}</span>
                {displayOldPriceValue > 0 && (
                   <span className="text-lg font-medium text-zinc-500 line-through">M.R.P.: {displayPrice(displayOldPriceValue)}</span>
                )}
                {discountPercent > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-600 font-black text-lg">
                    -{discountPercent}%
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 font-medium mt-1">Inclusive of all taxes</p>
            </div>

            <div className="mb-8 space-y-5">
              {availableColors.length > 0 && (
                <div>
                   <p className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-3">Color: <span className="font-bold text-zinc-500 capitalize">{selectedColor || "Select a Color"}</span></p>
                   <div className="flex flex-wrap gap-3">
                      {availableColors.map((color) => (
                         <button 
                            key={color}
                            onClick={() => handleColorClick(color)}
                            className={\`px-5 py-2.5 rounded-2xl border-[3px] font-black text-sm transition-all transform active:scale-95 \${selectedColor === color ? 'border-primary-container bg-orange-50 text-primary-container shadow-md' : 'border-white bg-white/60 text-zinc-500 hover:border-zinc-200 hover:text-zinc-800'}\`}
                         >
                            {color}
                         </button>
                      ))}
                   </div>
                </div>
              )}

              {availableSizes.length > 0 && (
                <div>
                   <p className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-3">Size / Option: <span className="font-bold text-zinc-500 capitalize">{selectedSize || "Select a Size"}</span></p>
                   <div className="flex flex-wrap gap-3">
                      {availableSizes.map((size) => (
                         <button 
                            key={size}
                            onClick={() => {
                               if (selectedSize === size) {
                                  setSelectedSize(null);
                                  return;
                               }
                               setSelectedSize(size);
                               const comboVariant = product.variants.find(v => v.color === selectedColor && v.size === size);
                               if (comboVariant?.images?.length > 0) setMainImage(comboVariant.images[0]);
                            }}
                            className={\`px-5 py-2.5 rounded-2xl border-[3px] font-black text-sm transition-all transform active:scale-95 \${selectedSize === size ? 'border-zinc-800 bg-zinc-800 text-white shadow-md' : 'border-white bg-white/60 text-zinc-500 hover:border-zinc-200 hover:text-zinc-800'}\`}
                         >
                            {size}
                         </button>
                      ))}
                   </div>
                </div>
              )}
            </div>

            <p className="text-zinc-600 font-medium leading-relaxed mb-8 text-lg">
              {displayDescription || "Bring home the magic with this incredible toy! Spark creativity, imagination, and endless hours of joy."}
            </p>`;

content = content.replace(oldLayoutRegex, newLayout);

// 4. Update the Reviews Section display and form
const oldReviewsRegex = /{hasBoughtAndDelivered \? \([\s\S]*?<div className="card-surface p-8 rounded-\[2\.5rem\] shadow-soft sticky top-32 border border-white">[\s\S]*?<\/div>\s*\)\s*:\s*userInfo \? \([\s\S]*?Verified Buyers Only[\s\S]*?<\/div>\s*\)\s*:\s*\([\s\S]*?Login to Review[\s\S]*?<\/div>\s*\)}/;

const newReviewsLogic = `{userInfo ? (
              <div className="card-surface p-8 rounded-[2.5rem] shadow-soft sticky top-32 border border-white">
                <h3 className="text-xl font-black text-zinc-800 mb-6">Write a Review</h3>
                <form onSubmit={submitReviewHandler} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-600 ml-1">Rating</label>
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-bold text-zinc-800 cursor-pointer">
                      <option value="5">5 - Excellent (⭐⭐⭐⭐⭐)</option>
                      <option value="4">4 - Very Good (⭐⭐⭐⭐)</option>
                      <option value="3">3 - Good (⭐⭐⭐)</option>
                      <option value="2">2 - Fair (⭐⭐)</option>
                      <option value="1">1 - Poor (⭐)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-600 ml-1">Your Experience</label>
                    <textarea required rows="4" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you love about this toy?" className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800 resize-none"></textarea>
                  </div>
                  
                  {/* Image Upload for Reviews */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-600 ml-1 flex justify-between items-center">
                       <span>Add Photos</span>
                       <span className="text-xs font-medium text-zinc-400">Max 4 images</span>
                    </label>
                    <input 
                       type="file" 
                       multiple 
                       accept="image/*" 
                       onChange={handleReviewImageUpload} 
                       disabled={isUploadingReviewImage || reviewImages.length >= 4} 
                       className="w-full bg-white/60 p-3 border border-white rounded-2xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-container file:text-white hover:file:bg-orange-600 cursor-pointer disabled:opacity-50"
                    />
                    {isUploadingReviewImage && <p className="text-xs text-primary-container font-bold mt-1">Uploading...</p>}
                    {reviewImages.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {reviewImages.map((img, idx) => (
                           <div key={idx} className="relative shrink-0">
                              <img src={resolveImage(img)} className="w-16 h-16 object-cover rounded-xl border border-zinc-200" alt={\`upload-\${idx}\`} />
                              <button 
                                 type="button" 
                                 className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700" 
                                 onClick={() => setReviewImages(prev => prev.filter((_, i) => i !== idx))}
                              >&times;</button>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={isReviewLoading || isUploadingReviewImage} className="w-full py-4 mt-2 bg-primary-container text-white font-black text-lg rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 disabled:opacity-50">
                    {isReviewLoading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="card-surface p-8 rounded-[2.5rem] shadow-soft border border-white text-center sticky top-32">
                <span className="material-symbols-outlined text-[48px] text-zinc-300 mb-4 block">lock</span>
                <h3 className="text-xl font-black text-zinc-800 mb-2">Login to Review</h3>
                <p className="text-zinc-500 font-medium text-sm mb-6">
                  Please sign in to leave a review and share your experience.
                </p>
                <Link to="/auth" className="inline-block w-full py-3 bg-zinc-900 text-white font-black text-sm rounded-xl hover:bg-black transition-all shadow-md">
                  Log In or Sign Up
                </Link>
              </div>
            )}`;

content = content.replace(oldReviewsRegex, newReviewsLogic);

// 5. Update the individual review to render images
content = content.replace(
  /<p className="text-zinc-600 text-sm leading-relaxed">\{review\.comment\}<\/p>\s*<\/div>/g,
  `<p className="text-zinc-600 text-sm leading-relaxed mb-4">{review.comment}</p>
                    {/* Display Review Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {review.images.map((imgUrl, idx) => (
                           <img 
                             key={idx} 
                             src={resolveImage(imgUrl)} 
                             alt={\`Review Image \${idx + 1}\`} 
                             className="w-20 h-20 object-cover rounded-xl border border-zinc-200 cursor-pointer hover:scale-105 transition-transform" 
                             onClick={() => {
                                window.open(resolveImage(imgUrl), '_blank');
                             }}
                           />
                        ))}
                      </div>
                    )}
                  </div>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('ProductDetail.jsx updated');
