import React from 'react';
import Logo from './Logo'; // <-- Imports your actual Navbar logo

const Loader = ({ fullScreen = true, text = "Loading" }) => {
  // Smooth, modern animations
  const customStyles = `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.8; filter: drop-shadow(0 4px 6px rgba(249, 115, 22, 0.2)); }
      50% { opacity: 1; filter: drop-shadow(0 8px 15px rgba(249, 115, 22, 0.5)); }
    }
    
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  `;

  const content = (
    <div className="flex flex-col items-center justify-center space-y-10 animate-[fadeIn_0.5s_ease-in-out]">
      <style>{customStyles}</style>

      {/* 🚀 Real ToyBlix Logo Display */}
      <div className="relative flex flex-col items-center justify-center animate-float mt-4">
        
        {/* Ambient Orange Background Glow */}
        <div className="absolute w-40 h-40 bg-orange-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

        {/* The Brand Logo (Scaled up slightly to look good as a center loader) */}
        <div className="relative z-10 animate-pulse-glow transform scale-125 mb-2 flex items-center justify-center">
           <Logo />
        </div>
        
      </div>

      {/* 🏷️ Loading Text & Bouncing Dots */}
      <div className="flex flex-col items-center space-y-4">
        <span className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs">
          {text}
        </span>
        
        <div className="flex space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-300 animate-bounce shadow-sm" style={{ animationDelay: '0s' }}></div>
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce shadow-sm" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-bounce shadow-sm" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>

    </div>
  );

  // Frosted Glass Overlay for full screen
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all duration-500">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-12">
      {content}
    </div>
  );
};

export default Loader;