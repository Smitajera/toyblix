import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion'; 
import toast from 'react-hot-toast'; 
import { 
  useGetProductByIdQuery, 
  useGetProductsQuery, 
  useCreateReviewMutation, 
  useGetMyOrdersQuery,
  useNotifyMeWhenAvailableMutation 
} from '../features/api/apiSlice';
import { addToCart, setPendingItem } from '../features/cart/cartSlice';
import { toggleFavorite } from '../features/wishlist/wishlistSlice'; 
import SkeletonProductDetail from '../components/SkeletonProductDetail.jsx';
import ScrollReveal from '../components/ScrollReveal.jsx'; 

// ==========================================
// Helper to resolve image paths correctly for backend uploads
// ==========================================
const resolveImage = (imgPath) => {
  if (!imgPath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const baseUrl = apiBaseUrl.replace('/api', '');
  return `${baseUrl}${imgPath}`;
};

const ProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userInfoData = sessionStorage.getItem('userInfo');
  const userInfo = userInfoData && userInfoData !== 'undefined' ? JSON.parse(userInfoData) : null;

  const { data: responseData, isLoading, error } = useGetProductByIdQuery(id);
  const product = responseData?.data || (Array.isArray(responseData) ? responseData[0] : responseData);

  const { data: allProductsData } = useGetProductsQuery({ limit: 8 }, { skip: !product }); 
  const { data: myOrders } = useGetMyOrdersQuery(undefined, { skip: !userInfo });
  
  const [createReview, { isLoading: isReviewLoading }] = useCreateReviewMutation();
  const [notifyMeWhenAvailable, { isLoading: isNotifying }] = useNotifyMeWhenAvailableMutation(); 
  
  const wishlistItems = useSelector((state) => state.wishlist?.wishlistItems || []);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentModalIndex, setCurrentModalIndex] = useState(0); 
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const [mainImage, setMainImage] = useState('');
  
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(3);

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  const relatedProducts = allProductsData?.products?.filter(p => p._id !== id).slice(0, 4) || [];

  const hasBoughtAndDelivered = myOrders?.some((order) =>
    ['delivered', 'fulfilled'].includes(order.orderStatus) &&
    order.orderItems.some((item) => {
      const productId = item._id?._id || item._id || item.product;
      return String(productId) === String(id);
    })
  );

  useEffect(() => { 
    if (product) {
      setSelectedColor(null);
      setSelectedSize(null);
      
      if (product.img) {
         setMainImage(product.img);
      } else if (product.images && product.images.length > 0) {
         setMainImage(product.images[0]);
      } else if (product.variants && product.variants.length > 0 && product.variants[0].images?.length > 0) {
         setMainImage(product.variants[0].images[0]);
      }
    }
  }, [id, product]);

  const handleColorClick = (color) => {
      if (selectedColor === color) {
          setSelectedColor(null);
          setSelectedSize(null);
          setMainImage(product.img || (product.images && product.images[0]) || '');
          return;
      }

      setSelectedColor(color);
      const sizesForColor = product.variants.filter(v => v.color === color && v.size).map(v => v.size);
      
      if (sizesForColor.length > 0) {
         setSelectedSize(sizesForColor[0]);
      } else {
         setSelectedSize(null);
      }

      const colorVariant = product.variants.find(v => v.color === color && v.images?.length > 0);
      if (colorVariant) {
          setMainImage(colorVariant.images[0]);
      } else if (product.img) {
          setMainImage(product.img);
      }
  };

  const currentVariant = product?.variants?.find(v => 
      (v.color === selectedColor || (!v.color && !selectedColor)) && 
      (v.size === selectedSize || (!v.size && !selectedSize))
  ) || null;

  useEffect(() => {
    if (userInfo && userInfo.email && !notifyEmail) {
      setNotifyEmail(userInfo.email);
    }
  }, [userInfo]);

  const displayPriceValue = currentVariant && selectedColor ? currentVariant.price : product?.price;
  const displayOldPriceValue = currentVariant?.oldPrice > 0 && selectedColor ? currentVariant.oldPrice : product?.oldPrice;
  const displayStock = currentVariant && selectedColor ? currentVariant.countInStock : product?.countInStock;
  const displayDescription = currentVariant?.description && selectedColor ? currentVariant.description : product?.description;
  
  const galleryImages = currentVariant?.images?.length > 0 && selectedColor
      ? currentVariant.images 
      : (product?.images?.length > 0 ? product.images : [product?.img]); 

  const availableColors = product?.variants ? [...new Set(product.variants.map(v => v.color).filter(Boolean))] : [];
  const availableSizes = product?.variants ? [...new Set(product.variants.filter(v => (selectedColor ? v.color === selectedColor : true) && v.size).map(v => v.size).filter(Boolean))] : [];

  const displayPrice = (price) => {
    if (price === undefined || price === null) return '₹0';
    return '₹' + Number(price).toLocaleString('en-IN');
  };

  const getDiscountPercent = (price, oldPrice) => {
    if (!oldPrice || !price) return null;
    const p = Number(price);
    const op = Number(oldPrice);
    if (isNaN(p) || isNaN(op) || op === 0) return null;
    return Math.round(((op - p) / op) * 100);
  };

  const handleAddToCart = () => {
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
          toast.error(`Added to cart, but currently out of stock. Checkout is disabled until restocked.`);
      } else {
          toast.success('Added to your cart 🎒'); 
      }
    }
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
          toast.error('Added to cart, but currently out of stock. Checkout is disabled until restocked.');
      } else {
          navigate('/checkout');
      }
    }
  };

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    if (!notifyEmail) return toast.error("Please enter an email address.");
    try {
      const res = await notifyMeWhenAvailable({ productId: id, email: notifyEmail }).unwrap();
      toast.success(res.message || "You're on the list! 🎈");
      setNotifyEmail('');
    } catch (err) {
      toast.error("Failed to sign up for notifications.");
    }
  };

  const submitReviewHandler = async (e) => {
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
        const res = await fetch(`${API_BASE_URL}/upload`, { 
            method: 'POST', 
            headers: token ? { authorization: `Bearer ${token}` } : {}, 
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
  };

  const renderStars = (starCount, sizeClass = 'text-[18px]') =>
    [...Array(5)].map((_, index) => (
      <span
        key={index}
        className={`material-symbols-outlined ${sizeClass} ${index < starCount ? 'text-red-600 filled' : 'text-zinc-300'}`}
      >
        star
      </span>
    ));

  const renderInteractiveRatingStars = () => {
    const activeRating = hoverRating || rating;
    return [...Array(5)].map((_, index) => {
      const filled = index < activeRating;
      return (
        <button
          key={index}
          type="button"
          onClick={() => setRating(index + 1)}
          onMouseEnter={() => setHoverRating(index + 1)}
          className="p-0.5 rounded-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
          aria-label={`Rate ${index + 1} out of 5`}
        >
          <span
            className={`material-symbols-outlined text-[32px] transition-colors ${
              filled ? 'text-red-600 filled' : 'text-zinc-300'
            }`}
          >
            star
          </span>
        </button>
      );
    });
  };

  const openModal = (imgUrl) => {
      const index = galleryImages.indexOf(imgUrl);
      setCurrentModalIndex(index !== -1 ? index : 0);
      setIsImageModalOpen(true);
  };

  const handleMouseMoveModal = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  const slideNext = useCallback(() => {
    setCurrentModalIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  }, [galleryImages.length]);

  const slidePrev = useCallback(() => {
    setCurrentModalIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  }, [galleryImages.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isImageModalOpen) return;
      
      if (e.key === 'ArrowRight') {
        slideNext();
      } else if (e.key === 'ArrowLeft') {
        slidePrev();
      } else if (e.key === 'Escape') {
        setIsImageModalOpen(false);
      }
    };

    if (isImageModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isImageModalOpen, slideNext, slidePrev]);

  if (isLoading) return <SkeletonProductDetail />;
  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <h2 className="text-2xl font-bold text-red-500">Product not found!</h2>
      </div>
    );
  }

  const isMainProductFavorited = wishlistItems.some(w => w._id === product._id);
  const discountPercent = getDiscountPercent(displayPriceValue, displayOldPriceValue);

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="pt-28 pb-24 min-h-screen bg-surface bg-hero-glow relative">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      {isImageModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/95 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <button onClick={() => setIsImageModalOpen(false)} className="absolute top-6 right-6 z-50 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
          {galleryImages.length > 1 && (
            <button onClick={slidePrev} className="absolute left-4 md:left-10 z-50 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm">
              <span className="material-symbols-outlined text-[32px]">chevron_left</span>
            </button>
          )}
          {galleryImages.length > 1 && (
            <button onClick={slideNext} className="absolute right-4 md:right-10 z-50 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm">
              <span className="material-symbols-outlined text-[32px]">chevron_right</span>
            </button>
          )}
          <div 
            className="relative w-full max-w-[90vw] md:max-w-4xl h-[70vh] md:h-[80vh] flex items-center justify-center overflow-hidden rounded-3xl cursor-crosshair"
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={handleMouseMoveModal}
          >
            <img 
              src={resolveImage(galleryImages[currentModalIndex])} 
              alt={`${product.title} zoomed`} 
              className={`max-w-full max-h-full object-contain transition-transform duration-100 ease-linear transform-gpu ${isZooming ? 'scale-[2.5]' : 'scale-100'}`}
              style={{ transformOrigin: isZooming ? `${zoomPosition.x}% ${zoomPosition.y}%` : 'center', willChange: 'transform' }}
            />
            {!isZooming && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                   <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm flex items-center gap-2">
                       <span className="material-symbols-outlined text-[18px]">zoom_in</span> Hover to inspect details
                   </div>
                </div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="absolute bottom-6 w-full flex justify-center px-4">
               <div className="flex gap-3 bg-black/40 p-3 rounded-2xl backdrop-blur-xl overflow-x-auto max-w-full">
                  {galleryImages.map((img, idx) => (
                      <button
                          key={idx}
                          onClick={() => setCurrentModalIndex(idx)}
                          className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden transition-all ${currentModalIndex === idx ? 'ring-2 ring-primary-container ring-offset-2 scale-105 shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                      >
                          <img src={resolveImage(img)} className="w-full h-full object-cover bg-white" />
                      </button>
                  ))}
               </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-8">
          <Link to="/" className="hover:text-primary-container transition-colors">HOME</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary-container transition-colors">SHOP</Link>
          <span>/</span>
          <span className="text-zinc-800 line-clamp-1">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-20">
          
          {/* LEFT COLUMN: IMAGES */}
          <div className="flex flex-col md:flex-row gap-4 relative group items-start">
            
            {/* Desktop Vertical Thumbnails */}
            <div className="hidden md:flex flex-col gap-3 max-h-[500px] w-20 shrink-0 py-2 px-2" style={{overflowY: 'auto', overflowX: 'visible'}}>
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImage(imgUrl)}
                  className={`w-16 h-16 shrink-0 rounded-xl overflow-hidden isolate transition-all duration-300 shadow-sm ${mainImage === imgUrl ? 'ring-2 ring-primary-container ring-offset-2 shadow-md scale-105' : 'ring-1 ring-white/80 opacity-60 hover:opacity-100 hover:scale-105'}`}
                >
                  <img src={resolveImage(imgUrl)} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover mix-blend-multiply" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div
              className="flex-1 w-full h-fit card-surface rounded-[2rem] shadow-soft relative overflow-hidden isolate cursor-zoom-in border border-white"
              onClick={() => openModal(mainImage)}
            >
              <img
                src={resolveImage(mainImage)}
                alt={product.title}
                decoding="async"
                className={`w-full h-auto block mix-blend-multiply transition-transform duration-300 hover:scale-[1.03] ${displayStock === 0 ? 'opacity-80' : ''}`}
              />
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full text-zinc-600 shadow-md opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all z-10">
                  <span className="material-symbols-outlined">fullscreen</span>
              </div>
            </div>
            
            {/* Mobile Horizontal Thumbnails */}
            {/* FIX: Changed 'pb-2' to 'py-3 px-2' to give the scaled images room to breathe at the top! */}
            <div className="flex md:hidden items-center justify-start gap-3 mt-2 overflow-x-auto w-full py-3 px-2">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => setMainImage(imgUrl)}
                  className={`w-16 h-16 shrink-0 rounded-2xl overflow-hidden isolate transition-all duration-300 shadow-sm ${mainImage === imgUrl ? 'ring-2 ring-primary-container ring-offset-2 shadow-lg scale-110' : 'ring-1 ring-white/80 opacity-60 hover:opacity-100 hover:scale-105'}`}
                >
                  <img src={resolveImage(imgUrl)} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover mix-blend-multiply" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILS */}
          <div className="flex flex-col justify-start">
            
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-black text-zinc-800 tracking-tight leading-tight mb-2">{product.title}</h1>
            
            {/* Reviews Link */}
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

            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white flex-wrap">
              <span className="text-4xl font-black text-primary-container">{displayPrice(displayPriceValue)}</span>
              {displayOldPriceValue > 0 && <span className="text-xl font-bold text-zinc-400 line-through">{displayPrice(displayOldPriceValue)}</span>}
              {discountPercent > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 font-black text-sm px-3 py-1.5 rounded-full shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">local_offer</span> {discountPercent}% OFF
                  </span>
                </div>
              )}
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
                            className={`px-5 py-2.5 rounded-2xl border-[3px] font-black text-sm transition-all transform active:scale-95 ${selectedColor === color ? 'border-primary-container bg-orange-50 text-primary-container shadow-md' : 'border-white bg-white/60 text-zinc-500 hover:border-zinc-200 hover:text-zinc-800'}`}
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
                            className={`px-5 py-2.5 rounded-2xl border-[3px] font-black text-sm transition-all transform active:scale-95 ${selectedSize === size ? 'border-zinc-800 bg-zinc-800 text-white shadow-md' : 'border-white bg-white/60 text-zinc-500 hover:border-zinc-200 hover:text-zinc-800'}`}
                         >
                            {size}
                         </button>
                      ))}
                   </div>
                </div>
              )}
            </div>

            <p className="text-zinc-600 font-medium leading-relaxed mb-6">
              {displayDescription || "Bring home the magic with this incredible toy! Spark creativity, imagination, and endless hours of joy."}
            </p>

            {/* --- DYNAMIC SPECIFICATIONS BLOCK --- */}
            {product?.specifications && product.specifications.length > 0 && (
              <div className="mb-8 bg-white/60 backdrop-blur-md rounded-[2rem] border border-white shadow-soft overflow-hidden">
                <div className="p-5 bg-white/40 border-b border-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-container">format_list_bulleted</span>
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Product Specifications</h3>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="flex flex-col border-b border-zinc-200/50 pb-2 last:border-0">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">{spec.name}</span>
                      <span className="text-zinc-800 font-bold text-sm">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* --- END SPECIFICATIONS BLOCK --- */}

            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                 <button 
                   onClick={handleAddToCart} 
                   className={`flex-1 py-4 font-black text-lg rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group border-2 ${displayStock === 0 ? 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300 border-transparent' : 'bg-white border-zinc-900 text-zinc-900 hover:bg-zinc-50 hover:-translate-y-1'}`}
                 >
                   {displayStock === 0 ? 'Add to Cart (Waitlist)' : 'Add to Cart'}
                   <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">add_shopping_cart</span>
                 </button>
                
                <button 
                  onClick={() => {
                      dispatch(toggleFavorite(product));
                      isMainProductFavorited ? toast.error('Removed from favorites') : toast.success('Added to favorites!');
                  }} 
                  className={`w-20 rounded-[2rem] border-2 transition-all flex items-center justify-center hover:-translate-y-1 active:scale-95 shadow-md shrink-0 ${isMainProductFavorited ? 'border-red-500 bg-red-50 text-red-500' : 'border-white bg-white/60 text-zinc-400 hover:border-red-200 hover:text-red-400'}`} 
                  title="Add to Wishlist"
                >
                  <span className={`material-symbols-outlined text-[32px] ${isMainProductFavorited ? 'filled' : ''}`}>favorite</span>
                </button>
              </div>
              <button 
                onClick={handleBuyNow} 
                className={`w-full py-5 font-black text-xl rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group ${displayStock === 0 ? 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300' : 'bg-primary-container text-white hover:bg-red-800 hover:-translate-y-1'}`}
                disabled={displayStock === 0}
              >
                Buy Now
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">bolt</span>
              </button>
            </div>
            
            {displayStock === 0 && (
               <div className="mt-6 bg-red-50 p-5 rounded-[2rem] border border-red-100 flex flex-col justify-center shadow-inner">
                  <p className="text-red-600 font-black text-sm mb-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                    Out of stock! Get notified when it's back:
                  </p>
                  <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2 w-full">
                    <input 
                      type="email" 
                      value={notifyEmail} 
                      onChange={(e) => setNotifyEmail(e.target.value)} 
                      required 
                      placeholder="Your email address" 
                      className="flex-1 px-4 py-3 rounded-xl border border-red-200 outline-none focus:ring-2 focus:ring-red-400 font-bold text-sm bg-white shadow-sm"
                    />
                    <button 
                      type="submit" 
                      disabled={isNotifying}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
                    >
                      {isNotifying ? 'Wait...' : 'Notify Me'}
                      {!isNotifying && <span className="material-symbols-outlined text-[18px]">send</span>}
                    </button>
                  </form>
                  <p className="mt-3 text-xs text-red-500 font-bold">
                    * You can still add this item to your cart, but checkout will be disabled until it is restocked.
                  </p>
               </div>
            )}

            <div className="flex items-center gap-4 mt-6 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-white/60 px-3 py-2 rounded-full border border-white"><span className="material-symbols-outlined text-green-500 text-[16px]">verified_user</span> 100% Safe</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-white/60 px-3 py-2 rounded-full border border-white"><span className="material-symbols-outlined text-blue-500 text-[16px]">local_shipping</span> Free Delivery over ₹500</div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-white/60 px-3 py-2 rounded-full border border-white"><span className="material-symbols-outlined text-orange-500 text-[16px]">verified</span> Premium Quality</div>
            </div>

            {/* Visual Disclaimer */}
            <div className="mt-6 flex items-start gap-2.5 text-xs font-medium text-zinc-500 bg-amber-50/40 p-4 rounded-2xl border border-amber-100 shadow-sm transition-all hover:shadow-md">
              <span className="material-symbols-outlined text-amber-500 text-[18px] shrink-0">info</span>
              <p className="leading-relaxed"><strong>Please Note:</strong> Product images are for illustrative purposes. Due to enhancements and variations, the actual physical item may slightly differ in color tone, design, or packaging.</p>
            </div>
          </div>
        </div>

        {/* REVIEWS SECTION */}
        <div id="reviews-section" className="mt-20 border-t border-white pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <h2 className="text-3xl font-black text-zinc-800 mb-8 flex items-center gap-3">
              Customer Reviews <span className="bg-primary-container text-white text-sm py-1 px-3 rounded-full">{product.reviews?.length || 0}</span>
            </h2>

            {(!product.reviews || product.reviews.length === 0) ? (
              <div className="card-surface p-8 rounded-[2rem] text-center border border-white">
                <span className="material-symbols-outlined text-[48px] text-zinc-300 mb-3 block">rate_review</span>
                <p className="text-zinc-500 font-medium">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              <div>
                <div className="space-y-6">
                  {product.reviews.slice(0, visibleReviewsCount).map((review) => (
                    <div key={review._id} className="card-surface p-6 rounded-[2rem] shadow-sm border border-white">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-fixed to-orange-100 flex items-center justify-center font-black text-primary-container shadow-inner">
                            {review.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-800 flex items-center gap-1.5">
                              {review.name}
                              {review.isVerifiedPurchase && (
                                <span className="bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[10px]">verified</span> Verified
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-zinc-400 font-medium">{review.createdAt ? review.createdAt.substring(0, 10) : 'Just now'}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5 bg-white px-3 py-1.5 rounded-full shadow-inner">{renderStars(review.rating)}</div>
                      </div>
                      <p className="text-zinc-600 text-sm leading-relaxed mb-4">{review.comment}</p>
                      {/* Display Review Images */}
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {review.images.map((imgUrl, idx) => (
                            <img 
                              key={idx} 
                              src={resolveImage(imgUrl)} 
                              alt={`Review Image ${idx + 1}`} 
                              className="w-20 h-20 object-cover rounded-xl border border-zinc-200 cursor-pointer hover:scale-105 transition-transform" 
                              onClick={() => {
                                  window.open(resolveImage(imgUrl), '_blank');
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* SHOW MORE BUTTON */}
                {product.reviews.length > visibleReviewsCount && (
                  <div className="mt-8 flex justify-center">
                    <button 
                      onClick={() => setVisibleReviewsCount(product.reviews.length)} 
                      className="px-8 py-3 bg-white border-2 border-zinc-200 text-zinc-700 font-bold text-sm rounded-full hover:border-primary-container hover:text-primary-container transition-all shadow-sm hover:shadow-md flex items-center gap-2 group"
                    >
                      Show all {product.reviews.length} reviews
                      <span className="material-symbols-outlined group-hover:translate-y-1 transition-transform">expand_more</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            {userInfo ? (
              hasBoughtAndDelivered ? (
              <div className="card-surface p-8 rounded-[2.5rem] shadow-soft sticky top-32 border border-white">
                <h3 className="text-xl font-black text-zinc-800 mb-6">Write a Review</h3>
                <form onSubmit={submitReviewHandler} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-zinc-600 ml-1 uppercase tracking-widest">
                      Overall Rating <span className="text-red-600">*</span>
                    </label>
                    <div
                      className="flex items-center gap-4 bg-white/60 p-4 border border-white rounded-2xl shadow-inner"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <div className="flex items-center gap-0.5">{renderInteractiveRatingStars()}</div>
                      <span className="text-xl font-black text-zinc-800 tabular-nums">
                        {(hoverRating || rating).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-600 ml-1">Your Experience (Optional)</label>
                    <textarea rows="4" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you love about this toy?" className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800 resize-none"></textarea>
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
                       className="w-full bg-white/60 p-3 border border-white rounded-2xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-container file:text-white hover:file:bg-red-800 cursor-pointer disabled:opacity-50"
                    />
                    {isUploadingReviewImage && <p className="text-xs text-primary-container font-bold mt-1">Uploading...</p>}
                    {reviewImages.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {reviewImages.map((img, idx) => (
                           <div key={idx} className="relative shrink-0">
                              <img src={resolveImage(img)} className="w-16 h-16 object-cover rounded-xl border border-zinc-200" alt={`upload-${idx}`} />
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

                  <button type="submit" disabled={isReviewLoading || isUploadingReviewImage} className="w-full py-4 mt-2 bg-primary-container text-white font-black text-lg rounded-2xl hover:bg-red-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 disabled:opacity-50">
                    {isReviewLoading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </div>
              ) : (
              <div className="card-surface p-8 rounded-[2.5rem] shadow-soft border border-white text-center sticky top-32">
                <span className="material-symbols-outlined text-[48px] text-zinc-300 mb-4 block">local_shipping</span>
                <h3 className="text-xl font-black text-zinc-800 mb-2">Delivered orders only</h3>
                <p className="text-zinc-500 font-medium text-sm mb-6">
                  You can review this product after it has been delivered to you.
                </p>
                <Link to="/shop" className="inline-block w-full py-3 bg-primary-container text-white font-black text-sm rounded-xl hover:bg-red-800 transition-all shadow-md">
                  Continue Shopping
                </Link>
              </div>
              )
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
            )}
          </div>
        </div>

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
                      <span className={`material-symbols-outlined text-[20px] transition-colors ${isRelFavorited ? 'text-red-500 filled' : 'text-zinc-400 hover:text-red-400'}`}>favorite</span>
                    </button>
                    <Link to={`/product/${relProduct._id}`} className="w-full block bg-white/50 rounded-[1.5rem] overflow-hidden relative mb-4 shadow-inner border border-white/60 z-10 isolate transform-gpu">
                      <img alt={relProduct.title} className="w-full h-auto block mix-blend-multiply group-hover:scale-110 transition-transform duration-700 transform-gpu" src={resolveImage(relProduct.img)} />
                    </Link>
                    <div className="px-2 flex flex-col flex-1">
                      <Link to={`/product/${relProduct._id}`}>
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