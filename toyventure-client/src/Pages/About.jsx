import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <main className="pt-32 pb-24 min-h-screen bg-slate-50 text-slate-900 relative selection:bg-red-200 selection:text-red-900 overflow-hidden">
      {/* Ambient Red Glow Background Effects (Light Mode Adjusted) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-red-400/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-red-300/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-20 fade-in">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-slate-900">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 pr-2 pb-1 inline-block">ToyBlix</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed">
            We believe that play is the serious work of childhood. Our mission is to ignite imagination and bring joy to kids of all ages with toys that inspire, educate, and entertain.
          </p>
        </div>

        {/* Mission & Vision Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {/* Mission Card */}
          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-200 hover:border-red-300 transition-colors duration-500 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 border border-red-100 group-hover:scale-110 transition-transform duration-500 shadow-sm">
              <span className="material-symbols-outlined text-3xl">rocket_launch</span>
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900">Our Mission</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              To provide a curated selection of the highest quality toys that foster creativity, build foundational skills, and create unforgettable family moments. Every toy we select passes rigorous fun and safety tests.
            </p>
          </div>

          {/* Vision Card */}
          <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-200 hover:border-red-300 transition-colors duration-500 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 border border-red-100 group-hover:scale-110 transition-transform duration-500 shadow-sm">
              <span className="material-symbols-outlined text-3xl">visibility</span>
            </div>
            <h2 className="text-3xl font-black mb-4 text-slate-900">Our Vision</h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              To become the ultimate destination for parents and gift-givers, where discovering the perfect toy is as magical and exciting as playing with it. We're building a world where imagination has no limits.
            </p>
          </div>
        </div>

        {/* Why Choose Us Grid */}
        <div className="mb-24">
          <h2 className="text-4xl font-black text-center mb-12 text-slate-900">Why Choose <span className="text-red-600">Us?</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: 'verified_user', title: '100% Safe & Certified', desc: "All toys meet or exceed global safety standards. Your child's safety is our #1 priority." },
              { icon: 'local_shipping', title: 'Lightning Fast Delivery', desc: 'Partnered with premium couriers to ensure your gifts arrive exactly when you need them.' },
              { icon: 'support_agent', title: '24/7 Happiness Support', desc: 'Our dedicated team is always ready to help you find the perfect toy or resolve any issues.' }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 text-center hover:-translate-y-2 hover:shadow-lg transition-all duration-300 shadow-sm">
                <div className="w-14 h-14 bg-slate-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                  <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-800">{feature.title}</h3>
                <p className="text-sm text-slate-500 font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bold CTA Section (Kept Dark/Red for maximum contrast and pop!) */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-[3rem] p-12 text-center border border-red-500/50 shadow-2xl shadow-red-500/20 relative overflow-hidden group">
            {/* Dot Pattern Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]"></div>
            
            <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6 text-white drop-shadow-md">Ready to bring the fun home?</h2>
            <p className="text-red-100 font-medium mb-8 max-w-2xl mx-auto text-lg">
                Explore our latest collection of action figures, educational sets, and magical playsets. The perfect adventure is just a click away.
            </p>
            <Link to="/shop" className="inline-flex items-center gap-2 bg-white text-red-700 font-black px-8 py-4 rounded-full text-lg hover:scale-105 shadow-lg hover:shadow-xl transition-all duration-300">
                Explore the Catalog <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            </div>
        </div>

      </div>
    </main>
  );
};

export default About;