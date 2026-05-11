import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const ShippingInfo = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <main className="pt-40 pb-32 min-h-screen bg-white bg-hero-glow relative fade-in selection:bg-red-200 px-6">
      {/* Unified Background Pattern */}
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        <h1 className="text-5xl md:text-7xl font-black text-red-950 tracking-tighter leading-tight mb-8">Shipping Information</h1>
        <p className="text-xl text-red-950/70 font-medium mb-16 leading-relaxed">
          We know they can't wait to play. We pack and ship all orders with care and speed.
        </p>

        <div className="max-w-none font-medium">
          <h2 className="text-2xl font-bold text-red-950 mt-10 mb-4">Processing Time</h2>
          <p className="text-red-950/70 mb-8 leading-relaxed">
            All orders are processed and dispatched within 1-2 business days. Orders placed on weekends or public holidays will be processed on the next available business day. We work diligently to ensure your magical toys leave our warehouse as quickly as possible.
          </p>

          <h2 className="text-2xl font-bold text-red-950 mb-4">Order Tracking</h2>
          <p className="text-red-950/70 leading-relaxed">
            Once your order has been handed over to our shipping partners, you will receive a confirmation email containing your unique tracking number. You can also view live tracking updates directly from your ToyBlix account dashboard. Please note that it may take up to 24 hours for tracking information to become active on the courier's website.
          </p>
        </div>
      </motion.div>
    </main>
  );
};

export default ShippingInfo;