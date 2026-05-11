import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-surface relative px-6 py-24">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-surface p-12 md:p-20 rounded-[3rem] shadow-soft border border-white text-center max-w-2xl w-full relative z-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-8 mx-auto shadow-inner">
          <span className="material-symbols-outlined text-[48px]">explore_off</span>
        </div>
        
        <h1 className="text-7xl md:text-8xl font-black text-red-950 tracking-tighter mb-4 drop-shadow-sm">404</h1>
        <h2 className="text-2xl md:text-3xl font-bold text-red-900 mb-4">Oops! Page Not Found</h2>
        <p className="text-zinc-500 font-medium mb-10 max-w-md mx-auto leading-relaxed">
          The page you're looking for seems to have wandered off! It might have been moved or the URL might be incorrect.
        </p>
        
        <Link 
          to="/" 
          className="bg-red-600 text-white px-8 py-4 rounded-full font-black tracking-wide hover:bg-red-700 transition-all hover:-translate-y-1 shadow-lg shadow-red-600/30 flex items-center gap-2 w-max mx-auto"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Back to Homepage
        </Link>
      </motion.div>
    </main>
  );
};

export default NotFound;