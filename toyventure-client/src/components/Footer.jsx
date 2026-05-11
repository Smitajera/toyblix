import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useSubscribeNewsletterMutation } from '../features/api/apiSlice';
import toast from 'react-hot-toast';

// Ensure this path matches where you saved your background image
import footerBg from "../assets/footer-bg.png";

const Footer = () => {
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

  return (
    <footer className="relative pt-24 mt-auto w-full flex-shrink-0 bg-[#fdf5f5] overflow-hidden min-h-[auto] md:min-h-[35vw]">

      <style>{`
        @keyframes float-cloud {
          0% { transform: translateX(-10%); }
          50% { transform: translateX(10%); }
          100% { transform: translateX(-10%); }
        }
        .cloud-animate {
          animation: float-cloud 20s ease-in-out infinite;
        }
        .cloud-animate-slow {
          animation: float-cloud 30s ease-in-out infinite reverse;
        }

        .footer-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: url(${footerBg});
          background-repeat: no-repeat;
          background-position: bottom center;
          background-size: 100% auto; /* Mobile: scale to width so kids aren't chopped off */
          pointer-events: none;
        }
        @media (min-width: 768px) {
          .footer-bg {
            background-size: cover; /* Desktop: cover so it spans full ultra-wide width */
          }
        }
      `}</style>

      {/* ================= BACKGROUND IMAGE — single, correct layer ================= */}
      <div className="footer-bg" aria-hidden="true"></div>



      {/* ================= CLOUDS ================= */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-80">
        <svg className="absolute top-[10%] left-[10%] w-32 cloud-animate" viewBox="0 0 120 60">
          <g fill="#ffffff"><circle cx="30" cy="35" r="20" /><circle cx="55" cy="25" r="25" /><circle cx="85" cy="35" r="20" /><rect x="30" y="35" width="55" height="20" /></g>
        </svg>
        <svg className="absolute top-[20%] right-[15%] w-24 cloud-animate-slow" viewBox="0 0 100 50">
          <g fill="#ffffff"><circle cx="25" cy="30" r="15" /><circle cx="50" cy="20" r="20" /><circle cx="75" cy="30" r="15" /><rect x="25" y="30" width="50" height="15" /></g>
        </svg>
        <svg className="absolute top-[5%] left-[60%] w-40 cloud-animate" viewBox="0 0 140 70" style={{ animationDelay: '-5s' }}>
          <g fill="#ffffff"><circle cx="35" cy="40" r="22" /><circle cx="70" cy="28" r="28" /><circle cx="105" cy="40" r="22" /><rect x="35" y="40" width="70" height="20" /></g>
        </svg>
        <svg className="absolute top-[30%] left-[5%] w-20 cloud-animate-slow" viewBox="0 0 80 40" style={{ animationDelay: '-10s' }}>
          <g fill="#ffffff"><circle cx="20" cy="25" r="10" /><circle cx="40" cy="15" r="15" /><circle cx="60" cy="25" r="10" /><rect x="20" y="25" width="40" height="10" /></g>
        </svg>
        <svg className="absolute top-[15%] right-[40%] w-48 cloud-animate" viewBox="0 0 160 80" style={{ animationDelay: '-15s' }}>
          <g fill="#ffffff"><circle cx="40" cy="50" r="25" /><circle cx="80" cy="30" r="30" /><circle cx="120" cy="50" r="25" /><rect x="40" y="50" width="80" height="25" /></g>
        </svg>
      </div>

      {/* ================= CONTENT ================= */}
      {/* pb-32 on mobile perfectly matches the smaller image height (100% auto), preventing a huge gap. pb-[350px] on desktop. */}
      <div className="relative z-20 max-w-[1300px] mx-auto px-6 lg:px-8 pb-32 md:pb-[350px]">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12">

          {/* Brand Column */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-6 bg-red-600 px-4 py-2 rounded-xl shadow-md inline-flex">
              <Logo className="w-8 h-8 text-white" />
              <span className="text-white font-black text-2xl tracking-tight">ToyBlix</span>
            </div>
            <p className="text-slate-700 text-sm font-bold mb-8 leading-relaxed max-w-sm">
              Welcome to ToyBlix Collections, your #1 source for A-Z products with the best discounts 🎁
            </p>

            <div className="space-y-4 text-sm font-bold text-slate-600">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-red-500 bg-white shadow-sm p-2 rounded-full text-[18px]">location_on</span>
                <p className="pt-1 leading-snug">D-12, yoginagar society, section D, <br /> Bapasitaram chowk to yogichowk road, Surat, <br /> Gujarat, 395006</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-red-500 bg-white shadow-sm p-2 rounded-full text-[18px]">call</span>
                <p>+91 9601697603</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-red-500 bg-white shadow-sm p-2 rounded-full text-[18px]">mail</span>
                <p>toyblix@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Popular searches */}
          <div className="lg:col-span-3 lg:pl-4">
            <h4 className="text-slate-900 font-black mb-8 uppercase text-xs tracking-widest drop-shadow-sm">Popular searches</h4>
            <ul className="space-y-5 text-slate-600 text-sm font-bold">
              <li><Link to="/shop?tag=Soft%20Toys" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Soft Toys</Link></li>
              <li><Link to="/shop?tag=Wooden%20Wonders" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Wooden Wonders</Link></li>
              <li><Link to="/shop?tag=Remote%20Control%20Cars" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Remote Control Cars</Link></li>
              <li><Link to="/shop?tag=Arts%20%26%20Crafts" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Arts & Crafts</Link></li>
              <li><Link to="/shop?tag=Educational%20Games" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Educational Games</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div className="lg:col-span-3">
            <h4 className="text-slate-900 font-black mb-8 uppercase text-xs tracking-widest drop-shadow-sm">Customer Support</h4>
            <ul className="space-y-5 text-slate-600 text-sm font-bold">
              <li><Link to="/about" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Contact Us</Link></li>
              <li><Link to="/shipping" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Shipping Policy</Link></li>
              <li><Link to="/terms" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Terms & Condition</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-red-600 hover:translate-x-1 inline-block transition-all">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Social Links Column */}
          <div className="lg:col-span-4 lg:pl-8">
            <div className="flex items-center gap-4">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-110 transition-all border border-slate-100">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-pink-600 hover:scale-110 transition-all border border-slate-100">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </a>
              <a href="https://www.youtube.com/@toyblix" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-red-600 hover:scale-110 transition-all border border-slate-100">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* COPYRIGHT & RED STRIP */}
      <div className="relative z-30 w-full bg-[#E51B24] text-white font-bold py-4 border-t-2 border-red-700">
        <div className="max-w-[1300px] mx-auto px-6 lg:px-8 text-center">
          <p className="text-[12px] opacity-90">© {new Date().getFullYear()} ToyBlix. All Rights Reserved by TOYBLIX INDIA</p>
        </div>
      </div>

    </footer>
  );
};

export default Footer;