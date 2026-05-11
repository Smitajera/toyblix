import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const Returns = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <main className="pt-40 pb-32 min-h-screen bg-white bg-hero-glow relative fade-in selection:bg-red-200 px-6">
      {/* Unified Background Pattern */}
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        <h1 className="text-5xl md:text-7xl font-black text-red-950 tracking-tighter leading-tight mb-8">Return Policy</h1>
        <p className="text-xl text-red-950/70 font-medium mb-12 leading-relaxed">
          Committed to the highest standards of safety, hygiene, and quality.
        </p>

        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-red-50 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-[40px] opacity-60 -translate-y-1/2 translate-x-1/2"></div>
          
          <h2 className="text-2xl font-black text-red-950 mb-4 relative z-10 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">health_and_safety</span>
            Strict No Return / Exchange Policy
          </h2>
          <p className="text-red-950/70 font-medium mb-6 relative z-10 leading-relaxed">
            At ToyBlix, the health and safety of your children is our absolute highest priority. Because our products are handled and played with by infants and young children, <strong>we do not accept returns or exchanges under any circumstances once a product has left our facility.</strong>
          </p>
          
          <h3 className="font-bold text-red-950 mb-3 relative z-10">Why we enforce this policy:</h3>
          <ul className="list-none space-y-3 text-red-950/70 font-medium mb-4 relative z-10">
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-red-400 text-[20px]">verified</span>
              <span><strong>Guaranteed Brand New:</strong> By refusing returns, we can confidently guarantee that every single toy you purchase from us is 100% brand-new, factory-sealed, and has never been handled or played with by another child.</span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-red-400 text-[20px]">clean_hands</span>
              <span><strong>Hygiene Protection:</strong> Toys are easily exposed to germs, allergens, and household pets. A strict no-return policy eliminates the risk of cross-contamination, ensuring absolute peace of mind for parents.</span>
            </li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold text-red-950 mb-4">Damaged or Defective Items</h2>
        <p className="text-red-950/70 font-medium leading-relaxed">
          While we cannot accept returns for change of mind, we stand fully behind the quality of our products. If your toy arrives damaged in transit or has a clear manufacturing defect straight out of the box, please contact our support team immediately at <span className="font-bold text-red-600">support@toyblix.com</span> within 48 hours of delivery. Please include clear photos of the defect, and we will happily dispatch a free replacement immediately.
        </p>
      </motion.div>
    </main>
  );
};

export default Returns;