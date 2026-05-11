import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const SafetyStandards = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <main className="pt-52 pb-32 min-h-screen bg-white relative px-6">
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-6xl font-black text-red-950 tracking-tighter mb-8">Safety Standards</h1>
        <div className="prose prose-xl prose-red text-red-950/70 space-y-12">
          <section>
            <h2 className="text-3xl font-bold text-red-900 mb-4">1. Material Excellence</h2>
            <p>We use only the finest natural materials. Our wood is sourced from sustainably managed forests (FSC Certified), ensuring it's durable and safe for small hands.</p>
          </section>

          <section className="bg-red-50 p-8 rounded-[2rem] border border-red-100">
            <h2 className="text-3xl font-bold text-red-900 mb-4">2. Non-Toxic Finishes</h2>
            <p>All paints and finishes used on ToyBlix products are water-based and strictly tested for heavy metals. Our toys are 100% free from Lead, Phthalates, and BPA.</p>
          </section>

          <section>
            <h2 className="text-3xl font-bold text-red-900 mb-4">3. Rigorous Testing</h2>
            <p>Before any toy reaches your home, it undergoes 'Torque', 'Tension', and 'Drop' tests to ensure no small parts can break off and create choking hazards.</p>
          </section>
        </div>
      </motion.div>
    </main>
  );
};

export default SafetyStandards;