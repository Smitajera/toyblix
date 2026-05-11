// toyventure-client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Import Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import FloatingActions from './components/FloatingActions';
import AdminRoute from './components/AdminRoute'; // <-- IMPORT THE NEW GUARD HERE

// Import Main Pages
import Home from './Pages/Home';
import Shop from './Pages/Shop';
import ProductDetail from './Pages/ProductDetail';
import Cart from './Pages/Cart';
import Checkout from './Pages/Checkout';
import Auth from './Pages/Auth';
import Profile from './Pages/Profile';
import SafetyStandards from './Pages/SafetyStandards';
import Favorites from './Pages/Favorites';
import NotFound from './Pages/NotFound';

// Import Info Pages
import About from './Pages/About';
import Contact from './Pages/Contact';
import ShippingInfo from './Pages/ShippingInfo';
import Returns from './Pages/Returns';
import PrivacyPolicy from './Pages/PrivacyPolicy';
import Terms from './Pages/Terms';

// Import Admin Pages
import AdminDashboard from './Pages/AdminDashboard';
import AdminCatalog from './Pages/AdminCatalog';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop /> 
      
      <Toaster 
        position="bottom-right" 
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{ 
          className: 'mb-4 md:mb-8 mr-4 font-bold text-sm shadow-2xl shadow-red-900/10 rounded-[1.25rem] border border-red-50 bg-white text-red-950 px-6 py-4', 
          duration: 4000,
          success: {
            icon: <span className="material-symbols-outlined text-green-500 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>,
          },
          error: {
            icon: <span className="material-symbols-outlined text-red-600 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>,
          }
        }} 
      />

      <FloatingActions />
      <Navbar />

      <main className="flex-grow">
        <Routes>
          {/* Core Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/safety-standards" element={<SafetyStandards />} />
          
          {/* Information & Legal Routes */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shipping" element={<ShippingInfo />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          
          {/* SECURED ADMIN ROUTES */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/catalog" element={<AdminCatalog />} />
          </Route>
          
          {/* Catch-all route for 404 pages (MUST be at the bottom) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;