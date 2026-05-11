import React, { useState } from 'react';
import toast from 'react-hot-toast'; // IMPORTED TOAST
import { useSubmitContactMessageMutation } from '../features/api/apiSlice';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');
  
  const [submitMessage, { isLoading }] = useSubmitContactMessageMutation();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitMessage(formData).unwrap();
      setStatus('Thanks for reaching out! We will get back to you soon.');
      // NEW: Added toast notification for form submission
      toast.success('Message sent successfully!', { icon: '✉️' });
      setFormData({ name: '', email: '', message: '' }); // Clear form
    } catch (err) {
      setStatus('Sorry, something went wrong. Please try again.');
      toast.error('Failed to send message. Please try again later.');
    }
  };

  return (
    <main className="pt-28 pb-24 min-h-screen bg-surface bg-hero-glow relative fade-in selection:bg-red-200">
      {/* Unified Background Pattern */}
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      <div className="max-w-[1100px] mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        
        {/* Contact Information */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-black text-red-950 mb-6 tracking-tight">
            Let's <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 italic pr-2 pb-1 inline-block">Connect!</span>
          </h1>
          <p className="text-red-950/70 font-medium text-lg mb-10 leading-relaxed">
            Have a question about an order, a specific toy, or just want to say hello? Our friendly team at ToyBlix is always here to help you out.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">location_on</span>
              </div>
              <div>
                <h4 className="font-bold text-red-950">Our Store</h4>
                <p className="text-sm font-medium text-red-950/60">ToyBlix (Akshar-Toys) YogiChowk-Katargam, Surat, Gujarat</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">call</span>
              </div>
              <div>
                <h4 className="font-bold text-red-950">Phone Support</h4>
                <p className="text-sm font-medium text-red-950/60">+91 9898528152 / +91 9974530204 (Mon-Sun, 9AM-10PM)</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">mail</span>
              </div>
              <div>
                <h4 className="font-bold text-red-950">Email Us</h4>
                <p className="text-sm font-medium text-red-950/60">toyblix@gmail.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white/90 backdrop-blur-md p-8 md:p-10 rounded-[3rem] shadow-xl border border-white">
          <h3 className="text-2xl font-black text-red-950 mb-8">Send us a message</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-red-950/70 ml-1">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Your Full Name" className="w-full bg-red-50/50 p-4 border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition-all font-medium text-red-950 shadow-inner" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-red-950/70 ml-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Your Email Adress" className="w-full bg-red-50/50 p-4 border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition-all font-medium text-red-950 shadow-inner" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-red-950/70 ml-1">Your Message</label>
              <textarea name="message" value={formData.message} onChange={handleChange} required rows="5" placeholder="How can we help you today?" className="w-full bg-red-50/50 p-4 border border-red-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition-all font-medium text-red-950 resize-none shadow-inner"></textarea>
            </div>

            {status && (
              <p className={`font-bold text-sm p-3 rounded-xl shadow-sm ${status.includes('wrong') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {status}
              </p>
            )}

            <button type="submit" disabled={isLoading} className="w-full py-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50">
              {isLoading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>

      {/* INTERACTIVE STORE LOCATION MAPS */}
      <div className="max-w-[1100px] mx-auto px-6 relative z-10">
        <h3 className="text-2xl font-black text-red-950 mb-6 text-center">Visit Our Stores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Yogichowk Branch Map */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-red-950 px-4 text-center md:text-left">Yogichowk Branch</h4>
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-[3rem] shadow-sm border border-red-50 overflow-hidden h-[300px] md:h-[400px]">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3574.064227363709!2d72.89185187508632!3d21.21791008047915!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04f3d785b0825%3A0x9ee7f5c29584ecae!2sAkshar%20Toy%20Yogichowk%20Surat!5e1!3m2!1sen!2sin!4v1776581600141!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-[2.5rem] opacity-90 transition-all duration-500 shadow-inner"
              ></iframe>
            </div>
          </div>
          
          {/* Katargam Branch Map */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-red-950 px-4 text-center md:text-left">Katargam Branch</h4>
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-[3rem] shadow-sm border border-red-50 overflow-hidden h-[300px] md:h-[400px]">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d57179.97113758508!2d72.83169615703196!3d21.23095583857503!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be04f001385d785%3A0x86b62011ae8f2f31!2sAkshar%20Toy%20Katargam%20Surat.!5e1!3m2!1sen!2sin!4v1776581687373!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-[2.5rem] opacity-90 transition-all duration-500 shadow-inner"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Contact;