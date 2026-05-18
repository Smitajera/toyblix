import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCart, setPendingItem } from '../features/cart/cartSlice';
import { useGetProductsQuery, useSubscribeNewsletterMutation } from '../features/api/apiSlice';
import useToyCategories from '../hooks/useToyCategories';
import ComboShowcase from '../components/ComboShowcase';
import toast from 'react-hot-toast';
import { useState } from 'react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || API_BASE_URL.replace(/\/api\/?$/, '');

const MagneticButton = ({ children, className, variant = 'dark', onClick }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouse = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    x.set((clientX - (left + width / 2)) * 0.3);
    y.set((clientY - (top + height / 2)) * 0.3);
  };

  const reset = () => { x.set(0); y.set(0); };

  const baseStyles = "relative overflow-hidden group px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2";
  const variants = {
    dark: "bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-xl hover:shadow-red-600/30",
    light: "bg-white text-red-600 border border-red-100 hover:border-red-300 hover:bg-red-50 shadow-sm",
  };

  return (
    <motion.button onClick={onClick} ref={ref} onMouseMove={handleMouse} onMouseLeave={reset} style={{ x: springX, y: springY }} className={`${baseStyles} ${variants[variant]} ${className} will-change-transform transform-gpu`}>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { categories: runningCategories } = useToyCategories();

  const [email, setEmail] = useState('');
  const [subscribeNewsletter, { isLoading: isSubscribing }] = useSubscribeNewsletterMutation();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await subscribeNewsletter({ email }).unwrap();
      toast.success('Thanks for subscribing!', { icon: '🎉' });
      setEmail('');
    } catch (err) {
      toast.error('Failed to subscribe. Please try again.');
    }
  };

  const { scrollYProgress } = useScroll(); 
  const heroY = useTransform(scrollYProgress, [0, 0.2], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  // Fetching Live Popular Data from the DB limit 7 
  const { data: popularData, isLoading: isLoadingPopular } = useGetProductsQuery({ isPopular: 'true', limit: 7 });
  const popularProducts = popularData?.products || [];

  const { data: bestSellingData, isLoading: isLoadingBestSelling } = useGetProductsQuery({ isBestSelling: 'true', limit: 7 });
  const bestSellingProducts = bestSellingData?.products || [];

  const { data: limitedEditionData, isLoading: isLoadingLimitedEdition } = useGetProductsQuery({ isLimitedEdition: 'true', limit: 4 });
  const limitedEditionProducts = limitedEditionData?.products || [];

  const resolveImage = (imgSrc) => {
    if (!imgSrc) return '';
    return imgSrc.startsWith('/uploads') ? `${ASSET_BASE_URL}${imgSrc}` : imgSrc;
  };

  const heroBanners = [
    { id: 1, image: '/assets/banner-1.jpg', alt: 'Joy Moments', },
    { id: 2, image: '/assets/banner-2.jpg', alt: 'Dino Adventure',  },
    { id: 3, image: '/assets/banner-3.jpg', alt: 'playing kids', },
    { id: 4, image: '/assets/banner-4.jpg', alt: 'Construction', }, 
    { id: 5, image: '/assets/banner-5.jpg', alt: 'Creative Play', }, 
    { id: 6, image: '/assets/banner-6.jpg', alt: 'Chefs', }, 
  ];

  const categories = [
    { name: "Imaginative Play", desc: "Let their stories unfold", size: "md:col-span-2 md:row-span-2 h-[400px] md:h-[500px]", img: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=1200&auto=format&fit=crop", link: "/shop?tag=Action%20Figures" },
    { name: "Building & STEM", desc: "Engineer the future", size: "md:col-span-1 md:row-span-1 h-[240px]", img: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?q=80&w=800&auto=format&fit=crop", link: "/shop?tag=Educational%20Games" },
    { name: "Creative Arts", desc: "Unleash inner artists", size: "md:col-span-1 md:row-span-1 h-[240px]", img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop", link: "/shop?tag=Arts%20%26%20Crafts" },
  ];

  const shopByAgeData = [
    { age: "0-12 MO", label: "Infants", sublabel: "Newborn to First Steps", color: "text-red-400", bgColor: "bg-red-50", borderColor: "border-red-100", radius: "40% 60% 70% 30% / 40% 50% 60% 50%", icon: "🍼" },
    { age: "12-36 MO", label: "Toddlers", sublabel: "Walking & Exploring", color: "text-red-500", bgColor: "bg-red-50", borderColor: "border-red-200", radius: "50% 50% 30% 70% / 60% 30% 70% 40%", icon: "🧸" },
    { age: "2-5 YRS", label: "Preschool", sublabel: "Creative & Curious", color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200", radius: "70% 30% 50% 50% / 30% 40% 60% 70%", icon: "🎨" },
    { age: "5-7 YRS", label: "Kindergarten", sublabel: "School Ready", color: "text-red-700", bgColor: "bg-red-100", borderColor: "border-red-300", radius: "30% 70% 60% 40% / 50% 60% 40% 50%", icon: "🎒" },
    { age: "7-10 YRS", label: "Grade School", sublabel: "Full of Energy", color: "text-red-700", bgColor: "bg-red-100", borderColor: "border-red-300", radius: "60% 40% 40% 60% / 40% 60% 50% 50%", icon: "⚽" },
    { age: "10-14 YRS", label: "Tweens", sublabel: "Finding Their Style", color: "text-red-800", bgColor: "bg-red-100", borderColor: "border-red-300", radius: "45% 55% 55% 45% / 55% 45% 55% 45%", icon: "🎧" },
    { age: "14+ YRS", label: "Teens", sublabel: "Young Adults", color: "text-rose-800", bgColor: "bg-rose-100", borderColor: "border-rose-400", radius: "50% 50% 40% 60% / 40% 50% 60% 50%", icon: "🛍️" },
  ];

  const reviews = [
    { text: "The wooden blocks are incredible. My daughter plays with them for hours, and they look beautiful in the living room.", author: "Sarah Jenkins" },
    { text: "Finally, toys that don't break after a week. You can feel the quality the moment you unbox them.", author: "Mark D." },
    { text: "Love the mission. It feels good to buy toys that are safe for my kids and the planet.", author: "Elena R." },
    { text: "The perfect gifts! The packaging is gorgeous, and the toys are durable enough to withstand my two wild toddlers.", author: "James T." },
  ];
  const reviewCards = reviews.map((review, index) => ({
    ...review,
    product: popularProducts.length > 0 ? popularProducts[index % popularProducts.length] : null,
  }));
  const infiniteReviews = [...reviewCards, ...reviewCards];

  const infiniteCategories = [...runningCategories, ...runningCategories];

  const handleAddToCart = (product) => {
    const userInfoData = sessionStorage.getItem('userInfo');
    const userInfo = (userInfoData && userInfoData !== 'null' && userInfoData !== 'undefined') ? JSON.parse(userInfoData) : null;

    if (!userInfo) {
      dispatch(setPendingItem({ ...product, qty: 1 }));
      navigate('/cart');
    } else {
      dispatch(addToCart({ ...product, qty: 1 }));
      toast.success('Added to your cart 🎒', { style: { border: '1px solid #fecaca', color: '#450a0a' } });
    }
  };

  return (
    <main className="bg-white text-red-950 min-h-screen font-sans overflow-x-hidden selection:bg-red-100 relative fade-in">
      
      {/* ================= HERO SECTION WITH SLIDER ================= */}
      <motion.section style={{ y: heroY, opacity: heroOpacity }} className="relative min-h-[90vh] flex items-center justify-center px-6 z-10 pt-28 pb-16 pointer-events-auto will-change-transform transform-gpu bg-red-50">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full max-w-[1440px] mx-auto">
          <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }} className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left z-20">
            <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="mb-8 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold uppercase tracking-widest">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span></span>
              Fresh Arrivals
            </motion.div>
            <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="text-5xl md:text-7xl font-black tracking-tighter text-red-950 leading-[1.05] mb-6">
              Dive into the <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 pr-2 pb-1 inline-block">Universe of Play.</span>
            </motion.h1>
            <motion.p variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="text-lg text-red-950/60 font-medium max-w-lg mb-10 leading-relaxed">
              Step into a world of minimal, sustainable, and wonderfully engaging toys designed to nurture creativity.
            </motion.p>
            <motion.div variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link to="/shop" className="w-full sm:w-auto"><MagneticButton variant="dark" className="w-full justify-center">Start Exploring <span className="material-symbols-outlined text-sm">arrow_forward</span></MagneticButton></Link>
            </motion.div>
          </motion.div>

          <div className="lg:col-span-7 relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[8/5] flex items-center justify-center">
            <Swiper modules={[Pagination, Autoplay]} spaceBetween={20} slidesPerView={1} loop={true} speed={1000} autoplay={{ delay: 2000, disableOnInteraction: false }} pagination={{ clickable: true, dynamicBullets: true }} className="w-full h-full hero-swiper rounded-[2rem] shadow-2xl shadow-red-900/10 border-4 border-white">
              {heroBanners.map((banner) => (
                <SwiperSlide key={banner.id} className="overflow-hidden rounded-[2rem] cursor-pointer bg-red-50">
                  <Link to={banner.link || '/shop'} className="w-full h-full block">
                    <img src={banner.image} alt={banner.alt} className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700 ease-out" loading="eager" />
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </motion.section>

      {/* ================= INFINITE CATEGORY STRIP ================= */}
      <section className="py-5 bg-red-600 border-y border-red-700 overflow-hidden relative z-20 flex">
        <div className="flex gap-8 w-max px-4 will-change-transform transform-gpu" style={{ animation: "marquee-fast 20s linear infinite" }}>
          <style>{`@keyframes marquee-fast { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }`}</style>
          {infiniteCategories.map((cat, idx) => (
            <div key={idx} onClick={() => navigate(`/shop?tag=${encodeURIComponent(cat)}`)} className="flex items-center gap-8 shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="text-white font-black uppercase tracking-widest text-sm md:text-base whitespace-nowrap">{cat}</span>
              <span className="material-symbols-outlined text-red-300 text-sm">star</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SHOP BY AGE ================= */}
      <section className="bg-amber-100 py-24 relative z-20 border-b border-amber-200">
        <div className="max-w-[1440px] mx-auto px-6 text-center mb-16">
          <h2 className="text-red-600 font-bold uppercase tracking-widest text-xs mb-3">Find The Perfect Toy</h2>
          <h3 className="text-4xl md:text-5xl font-black text-red-950 tracking-tighter">Shop by Age</h3>
        </div>
        <div className="px-6 pb-12 max-w-[1440px] mx-auto">
          <style>{`
            .age-swiper .swiper-pagination-bullet {
              transition: all 0.3s ease;
              background-color: #d1d5db;
              opacity: 1;
            }
            .age-swiper .swiper-pagination-bullet-active {
              width: 24px;
              border-radius: 12px;
              background-color: #dc2626;
            }
            .age-swiper .swiper-slide {
              width: auto;
              padding: 10px 6px;
            }
            .age-swiper.swiper {
              overflow: visible !important;
            }
            .age-swiper-wrapper {
              overflow: hidden;
              padding: 16px 24px;
            }
          `}</style>
          <div className="age-swiper-wrapper">
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={'auto'}
            pagination={{ clickable: true }}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            breakpoints={{
              768: { spaceBetween: 32 }
            }}
            className="age-swiper pb-16"
          >
            {shopByAgeData.map((item, idx) => (
              <SwiperSlide key={idx}>
                <motion.div onClick={() => navigate(`/shop?age=${encodeURIComponent(item.age)}`)} whileHover={{ scale: 1.05 }} className={`w-[200px] h-[200px] md:w-64 md:h-64 ${item.bgColor} border ${item.borderColor} shadow-sm hover:shadow-xl hover:shadow-red-900/10 flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-300 ${item.color}`} style={{ borderRadius: item.radius }}>
                   <span className="text-4xl md:text-5xl mb-3">{item.icon}</span>
                   <h4 className="font-black text-2xl md:text-3xl tracking-tight leading-none text-center">{item.age}</h4>
                   <p className="font-bold text-red-950/60 text-sm mt-2 uppercase tracking-wider">{item.label}</p>
                   <p className="font-medium text-red-950/40 text-xs mt-1 text-center">{item.sublabel}</p>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
          </div>
        </div>
      </section>

      {/* ================= LIMITED EDITION SETS ================= */}
      <section className="bg-violet-100 py-12 relative z-20 border-b border-violet-200">
        <div className="max-w-[1440px] mx-auto px-6 text-center mb-16">
          <h2 className="text-violet-600 font-bold uppercase tracking-widest text-xs mb-3">Exclusive</h2>
          <h3 className="text-4xl md:text-5xl font-black text-violet-950 tracking-tighter">Limited-edition Sets</h3>
        </div>
        <div className="px-6 max-w-[1440px] mx-auto">
          {isLoadingLimitedEdition ? (
            <div className="animate-pulse bg-violet-100/50 h-96 rounded-[2rem]"></div>
          ) : limitedEditionProducts.length === 0 ? (
            <div className="text-center py-12 text-violet-950/50 font-bold">No Limited Edition Sets available right now.</div>
          ) : (
            <Swiper
              modules={[Autoplay, Pagination]}
              autoplay={{ delay: 3500, disableOnInteraction: false }}
              spaceBetween={16}
              slidesPerView={1.2}
              breakpoints={{
                640: { slidesPerView: 2.2 },
                1024: { slidesPerView: 4 }
              }}
              className="pb-4"
            >
              {limitedEditionProducts.map((product, idx) => (
                <SwiperSlide key={product._id} className="h-auto">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="group relative w-full aspect-[9/16] cursor-pointer bg-slate-100 border border-slate-100/60 shadow-sm hover:shadow-2xl rounded-[2rem] overflow-hidden transition-all duration-500 isolate transform-gpu [backface-visibility:hidden]" onClick={() => navigate(`/product/${product._id}`)}>
                    <div className="absolute top-3 left-3 z-10 bg-white/95 shadow-sm border border-slate-100 text-violet-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                      Limited Edition
                    </div>
                    
                    {product.videoUrl ? (
                        <video src={resolveImage(product.videoUrl)} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-0" />
                    ) : (
                        <img loading="lazy" decoding="async" src={resolveImage(product.img)} alt={product.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-0" />
                    )}

                    {/* Bottom Info Block + Add to Cart */}
                    <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-2 z-20">
                      {/* Add to Cart button (always visible at bottom) */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} 
                        className="w-full py-2.5 rounded-[1rem] backdrop-blur-md shadow-2xl flex items-center justify-center gap-2 font-black transition-all text-sm bg-black/80 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 duration-300"
                      >
                        <span className="material-symbols-outlined text-[18px]">shopping_cart</span> Add to Cart
                      </button>

                      {/* Product Info Block */}
                      <div className="bg-[#eaf4d3] backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-3 shadow-lg">
                        <div className="w-11 h-11 bg-white rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-white/50">
                           <img src={resolveImage(product.img)} alt={product.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="font-bold text-slate-800 text-[11px] leading-tight truncate">{product.title}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-emerald-700 font-black text-[11px]">Club: ₹{product.price}</span>
                            {product.oldPrice > 0 && <span className="text-slate-400 font-medium line-through text-[10px]">₹{product.oldPrice}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </section>

      <ComboShowcase />

      {/* ================= EXPLORE POPULAR TOY SET ================= */}
      <section className="bg-emerald-100 py-12 px-6 relative z-20 border-b border-emerald-200">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end text-center md:text-left mb-16 gap-8">
            <div>
              <h2 className="text-emerald-600 font-bold uppercase tracking-widest text-xs mb-3">Editor's Picks</h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-emerald-950">Explore Popular Sets</h3>
            </div>
            <Link to="/shop?isPopular=true" className="text-emerald-600 font-bold uppercase tracking-widest text-xs border border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100 px-6 py-3 rounded-full transition-all duration-300">See All Favorites</Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingPopular ? (
              [1, 2, 3, 4].map((i) => <div key={i} className="bg-emerald-100/50 animate-pulse border border-emerald-200 rounded-[2rem] h-96"></div>)
            ) : popularProducts.length === 0 ? (
               <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-center py-12 text-emerald-950/50 font-bold">No items have been marked as Popular by the Admin yet.</div>
            ) : (
              <>
              {popularProducts.map((product, idx) => {
                const hoverImage = (product.images && product.images.length > 1 && product.images[1] !== product.img) ? product.images[1] : null;
                return (
                <motion.div key={product._id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="group relative flex flex-col cursor-pointer bg-white border border-slate-100/60 shadow-sm hover:shadow-2xl rounded-[2rem] overflow-hidden hover:-translate-y-2 transition-all duration-500 isolate transform-gpu [backface-visibility:hidden]" onClick={() => navigate(`/product/${product._id}`)}>
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
                      <div className="absolute top-3 left-3 z-10 bg-white/95 shadow-sm border border-slate-100 text-emerald-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                        {product.tag || 'Popular'}
                      </div>
                      {hoverImage ? (
                        <>
                          <img loading="lazy" decoding="async" src={resolveImage(product.img)} alt={product.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:opacity-0 group-hover:scale-105" />
                          <img loading="lazy" decoding="async" src={resolveImage(hoverImage)} alt={`${product.title} alternate`} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-0 scale-105 group-hover:opacity-100 group-hover:scale-100" />
                        </>
                      ) : (
                        <img loading="lazy" decoding="async" src={resolveImage(product.img)} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center px-4 pb-3 transition-all duration-300 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 z-30">
                        <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} className="w-full py-3 rounded-[1rem] backdrop-blur-md shadow-xl flex items-center justify-center gap-2 font-black transition-all text-sm bg-black text-white hover:bg-red-600">
                          <span className="material-symbols-outlined text-[18px]">shopping_cart</span> Add to Cart
                        </button>
                      </div>
                    </div>
                  <div className="p-6 flex flex-col gap-2 text-center">
                    <h3 className="font-bold text-slate-800 text-[14px] leading-snug hover:text-red-600 transition-colors line-clamp-2">{product.title}</h3>
                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                      <span className="text-red-600 font-black text-base">₹{product.price}</span>
                      {product.oldPrice > 0 && <span className="text-slate-400 font-medium line-through text-xs">₹{product.oldPrice}</span>}
                      {product.oldPrice > product.price && <span className="text-emerald-600 font-bold text-[10px] tracking-wider uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
              <Link to="/shop?isPopular=true" className="group bg-red-600 border border-red-500 rounded-[2rem] overflow-hidden hover:shadow-xl hover:shadow-red-900/20 transition-all duration-500 flex flex-col items-center justify-center cursor-pointer min-h-[20rem]">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-white text-3xl">arrow_forward</span>
                </div>
                <h3 className="text-xl font-black text-white">More Products</h3>
                <p className="text-red-100 font-medium mt-2 text-sm">View all popular sets</p>
              </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================= BEST SELLING PICKS ================= */}
      <section className="bg-sky-100 py-12 px-6 relative z-20 border-b border-sky-200">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end text-center md:text-left mb-16 gap-8">
            <div>
              <h2 className="text-sky-600 font-bold uppercase tracking-widest text-xs mb-3">Top Rated</h2>
              <h3 className="text-4xl md:text-5xl font-black tracking-tighter text-sky-950">Best Selling Picks</h3>
            </div>
            <Link to="/shop?isBestSelling=true" className="text-sky-600 font-bold uppercase tracking-widest text-xs border border-sky-200 hover:border-sky-400 hover:bg-sky-100 px-6 py-3 rounded-full transition-all duration-300">See Top Sellers</Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingBestSelling ? (
              [1, 2, 3, 4].map((i) => <div key={i} className="bg-sky-100/50 animate-pulse border border-sky-200 rounded-[2rem] h-96"></div>)
               ) : (
              <>
              {bestSellingProducts.map((product, idx) => {
                const hoverImage = (product.images && product.images.length > 1 && product.images[1] !== product.img) ? product.images[1] : null;
                return (
                <motion.div key={product._id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="group relative flex flex-col cursor-pointer bg-white border border-slate-100/60 shadow-sm hover:shadow-2xl rounded-[2rem] overflow-hidden hover:-translate-y-2 transition-all duration-500 isolate transform-gpu [backface-visibility:hidden]" onClick={() => navigate(`/product/${product._id}`)}>
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100">
                      <div className="absolute top-3 left-3 z-10 bg-white/95 shadow-sm border border-slate-100 text-sky-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                        {product.tag || 'Best Seller'}
                      </div>
                      {hoverImage ? (
                        <>
                          <img loading="lazy" decoding="async" src={resolveImage(product.img)} alt={product.title} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:opacity-0 group-hover:scale-105" />
                          <img loading="lazy" decoding="async" src={resolveImage(hoverImage)} alt={`${product.title} alternate`} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-0 scale-105 group-hover:opacity-100 group-hover:scale-100" />
                        </>
                      ) : (
                        <img loading="lazy" decoding="async" src={resolveImage(product.img)} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center px-4 pb-3 transition-all duration-300 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 z-30">
                        <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} className="w-full py-3 rounded-[1rem] backdrop-blur-md shadow-xl flex items-center justify-center gap-2 font-black transition-all text-sm bg-black text-white hover:bg-red-600">
                          <span className="material-symbols-outlined text-[18px]">shopping_cart</span> Add to Cart
                        </button>
                      </div>
                    </div>
                  <div className="px-4 py-4 flex flex-col gap-2 text-center">
                    <h3 className="font-bold text-slate-800 text-[14px] leading-snug hover:text-red-600 transition-colors line-clamp-2">{product.title}</h3>
                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                      <span className="text-red-600 font-black text-base">₹{product.price}</span>
                      {product.oldPrice > 0 && <span className="text-slate-400 font-medium line-through text-xs">₹{product.oldPrice}</span>}
                      {product.oldPrice > product.price && <span className="text-emerald-600 font-bold text-[10px] tracking-wider uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% OFF</span>}
                    </div>
                  </div>
                </motion.div>
                );
            })}
              <Link to="/shop?isBestSelling=true" className="group bg-red-600 border border-red-500 rounded-[2rem] overflow-hidden hover:shadow-xl hover:shadow-red-900/20 transition-all duration-500 flex flex-col items-center justify-center cursor-pointer min-h-[20rem]">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-white text-3xl">arrow_forward</span>
                </div>
                <h3 className="text-xl font-black text-white">More Products</h3>
                <p className="text-red-100 font-medium mt-2 text-sm">View all top sellers</p>
              </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================= EDITORIAL PARALLAX ================= */}
      <section className="py-24 px-6 max-w-[1440px] mx-auto relative z-20">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative h-[70vh] rounded-[3rem] overflow-hidden">
          <motion.div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800&auto=format&fit=crop')" }} initial={{ scale: 1.1 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: "easeOut" }}></motion.div>
          <div className="absolute inset-0 bg-red-950/10"></div>
          
          {/* FIX: Centered box and text on mobile */}
          <div className="absolute inset-0 p-6 md:p-16 flex flex-col justify-end items-center md:items-start">
            <div className="bg-white/95 backdrop-blur-xl border border-white p-8 md:p-14 rounded-[2rem] max-w-xl shadow-2xl shadow-red-950/20 text-center md:text-left">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6 leading-tight text-red-950">
                The Art of <br /><span className="text-red-600">Unplugged</span> Joy.
              </h2>
              <p className="text-red-950/70 font-medium mb-8 leading-relaxed">
                In a world of screens, we champion the physical. Toys that demand touch, inspire storytelling, and withstand the test of time.
              </p>
              <Link to="/about" className="flex justify-center md:justify-start">
                <MagneticButton variant="dark" className="w-max">Read Our Manifesto</MagneticButton>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================= INFINITE MARQUEE ================= */}
      <section className="py-24 relative z-20 overflow-hidden bg-white border-t border-red-50">
        <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-center mb-16 text-red-950 px-6">Loved by Families</h2>
        <div className="relative w-full flex items-center">
          <div className="absolute left-0 top-0 w-24 md:w-48 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-24 md:w-48 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
          <div className="flex gap-6 w-max px-6 will-change-transform transform-gpu py-4" style={{ animation: "marquee 40s linear infinite" }}>
            <style>{`@keyframes marquee { 0% { transform: translateX(-50%); } 100% { transform: translateX(0%); } }`}</style>
            {infiniteReviews.map((review, idx) => (
              <div key={idx} className="w-[85vw] max-w-[320px] md:w-[400px] md:max-w-none shrink-0 bg-red-50/30 border border-red-100 p-8 md:p-10 rounded-[2rem]">
                {review.product && (
                  <Link
                    to={`/product/${review.product._id}`}
                    className="mb-6 flex items-center gap-3 rounded-2xl bg-white/80 p-3 shadow-inner border border-white hover:border-red-200 hover:shadow-md transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-red-50 shrink-0">
                      <img
                        src={resolveImage(review.product.img)}
                        alt={review.product.title}
                        className="w-full h-full object-cover mix-blend-multiply"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Loved Product</p>
                      <h4 className="font-black text-red-950 line-clamp-2 hover:text-red-600 transition-colors">
                        {review.product.title}
                      </h4>
                    </div>
                  </Link>
                )}
                <div className="flex text-red-500 mb-6">{[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}</div>
                <p className="text-red-950/70 font-medium mb-8 leading-relaxed line-clamp-4">"{review.text}"</p>
                <p className="font-bold text-red-950 text-sm tracking-wide">{review.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PREMIUM STORE FEATURES ================= */}
      <section className="py-24 relative z-20 overflow-hidden bg-[#eff6ff]">
        <div className="absolute inset-0 z-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-100 via-[#eff6ff] to-[#eff6ff]"></div>
        
        <div className="max-w-[1440px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { 
                icon: '🌍', 
                badge: '📦',
                title: 'National Delivery', 
                subtitle: 'Fast and reliable delivery across India within 3-5 business days' 
              },
              { 
                icon: '🎖️', 
                badge: '✨',
                title: 'Best Quality', 
                subtitle: 'Premium-quality toys carefully selected for safety, durability, and joyful play' 
              },
              { 
                icon: '🎁', 
                badge: '🔥',
                title: 'Best Offers', 
                subtitle: 'Exclusive deals and special discounts you won\'t find anywhere else' 
              },
              { 
                icon: '↩️', 
                badge: '🛡️',
                title: '7 Days Exchange/ Returns', 
                subtitle: 'Hassle-free 7-day exchange or replacement for a worry-free shopping experience' 
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 30 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.5, delay: idx * 0.1 }} 
                className="flex flex-col items-start p-8 rounded-3xl bg-white/60 backdrop-blur-md border border-white/80 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-500 group"
              >
                <div className="relative mb-8 group-hover:-translate-y-2 transition-transform duration-500">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100/50 flex items-center justify-center text-4xl shadow-inner border border-blue-50">
                    {feature.icon}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg shadow-md border border-slate-50">
                    {feature.badge}
                  </div>
                </div>
                <h4 className="font-black text-slate-800 text-xl tracking-tight mb-3">{feature.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed text-sm">{feature.subtitle}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= NEWSLETTER SECTION ================= */}
      <section className="py-20 px-6 max-w-[1200px] mx-auto relative z-20">
        <div className="bg-red-950 border border-red-900/50 rounded-3xl p-10 md:p-14 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-xl relative overflow-hidden">
          
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-red-600/30 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="max-w-lg relative z-10 text-center lg:text-left">
            <h3 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
              Stay Connected
            </h3>
            <p className="text-white/80 text-base leading-relaxed">
              Join our newsletter for the latest toy drops, exclusive offers, and playful updates directly to your inbox.
            </p>
          </div>
          
          <form
            onSubmit={handleSubscribe}
            className="flex w-full lg:w-auto bg-white rounded-full p-1.5 flex-grow max-w-md shadow-2xl relative z-10"
          >
            <input
              type="email"
              placeholder="Enter your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-red-950 placeholder:text-red-950/40 px-6 py-4 text-base font-bold rounded-full outline-none"
            />
            <button 
              type="submit" 
              disabled={isSubscribing}
              className="bg-red-600 text-white font-bold px-8 py-4 rounded-full hover:bg-red-700 active:scale-95 transition-all shadow-md whitespace-nowrap disabled:opacity-50"
            >
              {isSubscribing ? 'Wait...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>

    </main>
  );
};

export default Home;