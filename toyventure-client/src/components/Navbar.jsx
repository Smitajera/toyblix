import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Logo from './Logo';
import ConfirmModal from './ConfirmModal';
import { useGetAllOrdersQuery, useGetAllContactMessagesQuery } from '../features/api/apiSlice';

const searchPlaceholderPhrases = [
  'Browse toys...',
  'Find gifts...',
  'Explore puzzles...',
  'Search STEM kits...',
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isShopMegaOpen, setIsShopMegaOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderCharCount, setPlaceholderCharCount] = useState(1);
  const [shouldFocusMobileSearch, setShouldFocusMobileSearch] = useState(false);
  const megaMenuTimeout = useRef(null);
  const mobileSearchInputRef = useRef(null);

  const handleMegaEnter = useCallback(() => {
    clearTimeout(megaMenuTimeout.current);
    setIsShopMegaOpen(true);
  }, []);

  const handleMegaLeave = useCallback(() => {
    megaMenuTimeout.current = setTimeout(() => setIsShopMegaOpen(false), 200);
  }, []);

  useEffect(() => {
    return () => clearTimeout(megaMenuTimeout.current);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen || !shouldFocusMobileSearch) return;

    mobileSearchInputRef.current?.focus();
    setShouldFocusMobileSearch(false);
  }, [isMobileMenuOpen, shouldFocusMobileSearch]);
  
  const navigate = useNavigate();
  const location = useLocation();

  const cartItemsRaw = useSelector((state) => state.cart.cartItems);
  const wishlistItemsRaw = useSelector((state) => state.wishlist?.wishlistItems || []);

  const userInfoData = sessionStorage.getItem('userInfo');
  const userInfo = (userInfoData && userInfoData !== 'null' && userInfoData !== 'undefined') 
                   ? JSON.parse(userInfoData) 
                   : null;

  const cartItemsCount = userInfo ? cartItemsRaw.length : 0;
  const wishlistItemsCount = userInfo ? wishlistItemsRaw.length : 0;
  const isAdmin = userInfo?.role === 'admin';

  const [latestOrderId, setLatestOrderId] = useState(null);
  const [latestMessageId, setLatestMessageId] = useState(null);

  const { data: adminOrders } = useGetAllOrdersQuery(undefined, { skip: !isAdmin, pollingInterval: 5000 });
  const { data: adminMessages } = useGetAllContactMessagesQuery(undefined, { skip: !isAdmin, pollingInterval: 5000 });

  const [lastReadTimestamp, setLastReadTimestamp] = useState(() => parseInt(localStorage.getItem('adminNotificationsReadAt')) || 0);

  const pendingOrdersCount = adminOrders?.filter(o => {
    const isPending = !['delivered', 'fulfilled', 'cancelled'].includes(o.orderStatus);
    const isNew = new Date(o.createdAt).getTime() > lastReadTimestamp;
    return isPending && isNew;
  }).length || 0;

  const unreadMessagesCount = adminMessages?.filter(m => {
    return new Date(m.createdAt).getTime() > lastReadTimestamp;
  }).length || 0;

  const totalNotifications = pendingOrdersCount + unreadMessagesCount;

  const handleNotificationClick = () => {
    const now = Date.now();
    setLastReadTimestamp(now);
    localStorage.setItem('adminNotificationsReadAt', now.toString());
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
    setIsNotifOpen(false);
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchInput(params.get('search') || '');
  }, [location.search]);

  useEffect(() => {
    const currentPhrase = searchPlaceholderPhrases[placeholderIndex];
    const isFullPhrase = placeholderCharCount >= currentPhrase.length;

    const timeout = setTimeout(() => {
      if (isFullPhrase) {
        setPlaceholderIndex((current) => (current + 1) % searchPlaceholderPhrases.length);
        setPlaceholderCharCount(1);
      } else {
        setPlaceholderCharCount((current) => current + 1);
      }
    }, isFullPhrase ? 1300 : 90);

    return () => clearTimeout(timeout);
  }, [placeholderIndex, placeholderCharCount]);

  useEffect(() => {
    if (isAdmin && adminOrders && adminOrders.length > 0) {
      const topOrderId = adminOrders[0]._id;
      if (latestOrderId && topOrderId !== latestOrderId) {
        import('react-hot-toast').then(({ default: toast }) => {
          toast("New Order Arrived! 🚚", {
            duration: 6000, position: 'top-right',
            style: { border: '1px solid #fee2e2', padding: '16px', color: '#7f1d1d', fontWeight: '900', backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.1), 0 8px 10px -6px rgba(220, 38, 38, 0.1)' },
            icon: '📦'
          });
        });
      }
      setLatestOrderId(topOrderId);
    }
  }, [adminOrders, isAdmin, latestOrderId]);

  useEffect(() => {
    if (isAdmin && adminMessages && adminMessages.length > 0) {
      const topMessageId = adminMessages[0]._id;
      if (latestMessageId && topMessageId !== latestMessageId) {
        import('react-hot-toast').then(({ default: toast }) => {
          toast("New Customer Message! 💬", {
            duration: 6000, position: 'top-right',
            style: { border: '1px solid #fee2e2', padding: '16px', color: '#7f1d1d', fontWeight: '900', backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.1), 0 8px 10px -6px rgba(220, 38, 38, 0.1)' },
            icon: '💌'
          });
        });
      }
      setLatestMessageId(topMessageId);
    }
  }, [adminMessages, isAdmin, latestMessageId]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('token');
    setIsProfileDropdownOpen(false);
    setIsLogoutModalOpen(false);
    navigate('/auth');
    window.location.reload();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchInput.trim();

    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/shop');
    }

    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
    setIsNotifOpen(false);
    setIsShopMegaOpen(false);
  };

  const handleClearSearch = () => {
    setSearchInput('');

    if (location.pathname === '/shop') {
      const params = new URLSearchParams(location.search);
      params.delete('search');
      const queryString = params.toString();
      navigate(queryString ? `/shop?${queryString}` : '/shop');
    }
  };

  const handleMobileSearchClick = () => {
    setIsMobileMenuOpen(true);
    setIsProfileDropdownOpen(false);
    setIsNotifOpen(false);
    setIsShopMegaOpen(false);
    setShouldFocusMobileSearch(true);
  };

  const navLinks = isAdmin
    ? [
        { name: 'Dashboard', path: '/admin' },
        { name: 'Catalog', path: '/admin/catalog' },
        { name: 'Profile', path: '/profile' },
      ]
    : [
        { name: 'Home', path: '/' },
        { name: 'Shop', path: '/shop' },
        { name: 'About', path: '/about' },
        { name: 'Contact', path: '/contact' },
      ];

  const animatedSearchPlaceholder = searchPlaceholderPhrases[placeholderIndex]
    .slice(0, placeholderCharCount);

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-500 ease-in-out ${isScrolled ? 'pt-4 pb-2' : 'py-6'}`}>
        <div className="max-w-[1536px] mx-auto px-4 sm:px-8 relative">
          
          {/* Main Navbar Bar - Solid Red background when scrolled (Darker Red-700) */}
          <div className={`relative flex items-center justify-between rounded-full transition-all duration-500 ease-in-out ${
            isScrolled 
            ? 'bg-red-700 shadow-lg shadow-red-700/30 px-6 py-3' 
            : 'bg-transparent px-2'
          }`}>
            
            {/* Left: Logo - FIXED with shrink-0 */}
            <Link to="/" className="flex items-center gap-2 group z-20 shrink-0">
              <Logo className={`w-9 h-9 md:w-10 md:h-10 transition-transform duration-300 group-hover:scale-105 ${isScrolled ? 'text-white' : 'text-slate-900'}`} />
              <span className={`font-black text-2xl tracking-tight transition-colors duration-300 ${isScrolled ? 'text-white' : 'text-slate-900'}`}>
                Toy<span className={isScrolled ? 'text-red-200' : 'text-red-600'}>Blix</span>
              </span>
            </Link>

            {/* Middle: Desktop Links */}
            <div className={`hidden md:flex items-center gap-1 p-1 rounded-full transition-colors duration-300 ${isScrolled ? 'bg-red-800/50 shadow-inner' : 'bg-transparent'}`}>
              {navLinks.map((link) => (
                link.name === 'Shop' && !isAdmin ? (
                  <div
                    key={link.name}
                    className="relative"
                    onMouseEnter={handleMegaEnter}
                    onMouseLeave={handleMegaLeave}
                  >
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        if (isShopMegaOpen) handleMegaLeave();
                        else handleMegaEnter();
                      }}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-1 ${
                        location.pathname === link.path 
                        ? (isScrolled ? 'bg-white text-red-700 shadow-md' : 'bg-red-600 text-white shadow-md shadow-red-600/30')
                        : isScrolled
                          ? 'text-red-50 hover:text-white hover:bg-red-600'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {link.name}
                      <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${isShopMegaOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                  </div>
                ) : (
                  <Link 
                    key={link.name} 
                    to={link.path} 
                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                      location.pathname === link.path 
                      ? (isScrolled ? 'bg-white text-red-700 shadow-md' : 'bg-red-600 text-white shadow-md shadow-red-600/30')
                      : isScrolled
                        ? 'text-red-50 hover:text-white hover:bg-red-600'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                )
              ))}
            </div>

            {/* Desktop Search */}
            {!isAdmin && (
              <form
                onSubmit={handleSearchSubmit}
                className={`group hidden lg:flex items-center h-12 flex-1 max-w-[280px] xl:max-w-[340px] rounded-full border p-1.5 pl-3 transition-all duration-300 focus-within:ring-4 ${
                  isScrolled
                    ? 'bg-white border-white/80 shadow-lg shadow-red-950/10 focus-within:ring-white/20'
                    : 'bg-white/95 border-slate-200 shadow-sm shadow-slate-200/60 focus-within:border-red-200 focus-within:ring-red-100/60'
                }`}
              >
                <button
                  type="submit"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${isScrolled ? 'text-red-600 hover:bg-red-50' : 'text-slate-400 hover:bg-red-50 hover:text-red-600 group-focus-within:text-red-600'}`}
                  title="Search"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </button>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={animatedSearchPlaceholder}
                  className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 text-sm font-bold text-slate-800 shadow-none outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    title="Clear search"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </form>
            )}

            {/* Right: Icons & Profile */}
            <div className="flex items-center gap-1 sm:gap-2 z-20 shrink-0">
              
              {/* Desktop Support Number */}
              <a href="tel:+919601697603" className={`hidden xl:flex items-center border rounded-full py-1.5 px-4 transition-colors duration-300 hover:opacity-80 shrink-0 ${isScrolled ? 'bg-red-800/50 border-red-700/50' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0 ${isScrolled ? 'bg-white/20' : 'bg-red-500/20'}`}>
                  <span className={`material-symbols-outlined text-[18px] ${isScrolled ? 'text-white' : 'text-red-600'}`}>phone_in_talk</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isScrolled ? 'text-red-200' : 'text-red-600/80'}`}>24/7 Support:</span>
                  <span className={`text-sm font-black leading-none ${isScrolled ? 'text-white' : 'text-red-700'}`}>+91 9601697603</span>
                </div>
              </a>
              
              {/* Favorites Icon */}
              <Link to="/favorites" className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 hidden sm:flex shrink-0 ${
                isScrolled ? 'text-white hover:bg-red-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}>
                <span className="material-symbols-outlined text-[22px]">favorite</span>
                {wishlistItemsCount > 0 && (
                  <span className={`absolute top-0 right-0 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center border-2 box-content ${
                    isScrolled ? 'bg-white text-red-700 border-red-700' : 'bg-red-600 text-white border-white'
                  }`}>
                    {wishlistItemsCount}
                  </span>
                )}
              </Link>

              {/* Admin Notifications Bell */}
              {isAdmin && (
                <div className="relative hidden sm:block">
                  <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    isScrolled ? 'text-white hover:bg-red-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`} title="Admin Alerts">
                    <span className="material-symbols-outlined text-[22px]">notifications</span>
                    {totalNotifications > 0 && (
                      <span className={`absolute top-0 right-0 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center border-2 box-content ${
                        isScrolled ? 'bg-white text-red-700 border-red-700' : 'bg-red-600 text-white border-white'
                      }`}>
                        {totalNotifications}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Panel */}
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-4 w-[340px] bg-white/95 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden animate-[fadeIn_0.2s_ease-out] z-50 p-2">
                      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-600 text-[18px]">notifications_active</span> Alerts
                        </h3>
                        {totalNotifications > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalNotifications} new</span>
                            <button onClick={handleNotificationClick} className="text-[10px] font-bold text-slate-400 hover:text-red-600 transition-colors underline decoration-dotted underline-offset-2">Mark all read</button>
                          </div>
                        )}
                      </div>

                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                        {adminOrders?.filter(o => !['delivered','fulfilled','cancelled'].includes(o.orderStatus) && new Date(o.createdAt).getTime() > lastReadTimestamp).slice(0, 5).map(order => (
                          <Link key={order._id} to="/admin" onClick={() => { setIsNotifOpen(false); handleNotificationClick(); }} className="flex items-center gap-3 p-3 mb-1 rounded-2xl hover:bg-red-50 transition-colors">
                            <div className="w-10 h-10 bg-red-100 text-red-700 rounded-xl flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[18px]">package_2</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">New Order #{String(order._id).slice(-6)}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Rs {order.totalPrice?.toLocaleString('en-IN')} 
                              </p>
                            </div>
                          </Link>
                        ))}

                        {totalNotifications === 0 && (
                          <div className="px-5 py-8 text-center">
                            <span className="material-symbols-outlined text-[32px] text-slate-300 block mb-2">done_all</span>
                            <p className="text-xs font-medium text-slate-500">All caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Search Button */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={handleMobileSearchClick}
                  className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 shrink-0 ${
                    isScrolled ? 'text-white hover:bg-red-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title="Search"
                >
                  <span className="material-symbols-outlined text-[22px]">search</span>
                </button>
              )}

              {/* Cart Icon */}
              <Link to="/cart" className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 shrink-0 ${
                isScrolled ? 'text-white hover:bg-red-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}>
                <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
                {cartItemsCount > 0 && (
                  <span className={`absolute top-0 right-0 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center border-2 box-content ${
                    isScrolled ? 'bg-white text-red-700 border-red-700' : 'bg-red-600 text-white border-white'
                  }`}>
                    {cartItemsCount}
                  </span>
                )}
              </Link>

              {/* Profile / Auth Button */}
              <div className="relative ml-1 z-50 flex items-center">
                {userInfo ? (
                  <>
                    <button 
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className={`flex items-center gap-2 border pl-1.5 pr-3 py-1.5 rounded-full transition-colors duration-300 outline-none ${
                        isScrolled 
                        ? 'bg-red-800 border-red-600 hover:bg-red-900 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isScrolled ? 'bg-white text-red-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''} ${
                        isScrolled ? 'text-white' : 'text-slate-500'
                      }`}>
                        expand_more
                      </span>
                    </button>

                    {/* Profile Dropdown - FIXED with top-full mt-2 to open downwards */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-3xl border border-white shadow-xl shadow-slate-200/50 overflow-hidden animate-[fadeIn_0.2s_ease-out] z-50 p-2">
                        <div className="px-4 py-4 border-b border-slate-50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Signed in</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{userInfo.name || 'User'}</p>
                        </div>
                        
                        <div className="py-2 space-y-1">
                          {!isAdmin && (
                            <Link 
                              to="/profile" 
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-600 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">person</span>
                              My Account
                            </Link>
                          )}
                          
                          <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 rounded-2xl hover:bg-red-50 transition-colors text-left"
                          >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // FIXED: Added whitespace-nowrap and shrink-0 to prevent text jumping on scroll
                  <Link to="/auth" className={`flex h-10 w-10 items-center justify-center gap-2 rounded-full p-0 font-bold text-sm transition-colors duration-300 relative z-50 whitespace-nowrap shrink-0 md:h-auto md:w-auto md:px-5 md:py-2.5 ${
                    isScrolled ? 'bg-white text-red-700 hover:bg-red-50 shadow-sm' : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}>
                    <span className="material-symbols-outlined text-[20px] md:text-[18px]">login</span>
                    <span className="hidden md:inline">Log In</span>
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ml-1 z-50 relative shrink-0 ${
                  isScrolled ? 'bg-red-800 text-white hover:bg-red-900' : 'bg-slate-50 text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  {isMobileMenuOpen ? 'close' : 'menu_open'}
                </span>
              </button>

            </div>
          </div>

          {/* ==================== SHOP MEGA MENU ==================== */}
          {isShopMegaOpen && !isAdmin && (
            <div
              className="hidden md:block absolute left-0 right-0 top-full mt-2 z-[60] animate-[fadeIn_0.2s_ease-out]"
              onMouseEnter={handleMegaEnter}
              onMouseLeave={handleMegaLeave}
            >
              <div className="bg-white/[0.97] backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-200/60 border border-white overflow-hidden">
                <div className="flex">
                  {/* Column 1: Shop by Age */}
                  <div className="flex-1 p-7 border-r border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">child_care</span>
                      Shop by Age
                    </h4>
                    <div className="space-y-1">
                      {[
                        { label: '0-12 Months', value: '0-12 MO' },
                        { label: '12-36 Months', value: '12-36 MO' },
                        { label: '2-5 Years', value: '2-5 YRS' },
                        { label: '5-7 Years', value: '5-7 YRS' },
                        { label: '7-10 Years', value: '7-10 YRS' },
                        { label: '10-14 Years', value: '10-14 YRS' },
                        { label: '14+ Years', value: '14+ YRS' },
                      ].map((age) => (
                        <Link
                          key={age.value}
                          to={`/shop?age=${encodeURIComponent(age.value)}`}
                          onClick={() => setIsShopMegaOpen(false)}
                          className="block px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          {age.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Toy Categories */}
                  <div className="flex-1 p-7 border-r border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">toys</span>
                      Toy Categories
                    </h4>
                    <div className="space-y-1">
                      {[
                        'Soft Toys', 'Wooden Wonders', 'Remote Control Cars', 'Arts & Crafts',
                        'Mind Puzzles', 'Metal Machines', 'Outdoor Adventures', 'Educational Games', 'Building & STEM'
                      ].map((tag) => (
                        <Link
                          key={tag}
                          to={`/shop?tag=${encodeURIComponent(tag)}`}
                          onClick={() => setIsShopMegaOpen(false)}
                          className="block px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Shop by Price */}
                  <div className="flex-1 p-7 border-r border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">currency_rupee</span>
                      Shop by Price
                    </h4>
                    <div className="space-y-1">
                      {[
                        { label: 'Under ₹299', path: '/shop?maxPrice=299' },
                        { label: 'Under ₹499', path: '/shop?maxPrice=499' },
                        { label: 'Under ₹999', path: '/shop?maxPrice=999' },
                        { label: 'Under ₹1,999', path: '/shop?maxPrice=1999' },
                        { label: 'Under ₹2,999', path: '/shop?maxPrice=2999' },
                        { label: 'Above ₹3,000', path: '/shop?minPrice=3000' },
                      ].map((price) => (
                        <Link
                          key={price.label}
                          to={price.path}
                          onClick={() => setIsShopMegaOpen(false)}
                          className="block px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          {price.label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Column 4: Featured / Quick Links */}
                  <div className="w-56 bg-gradient-to-br from-red-50 to-orange-50 p-7">
                    <Link
                      to="/shop"
                      onClick={() => setIsShopMegaOpen(false)}
                      className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white text-center font-black text-sm rounded-2xl shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5 mb-5"
                    >
                      🛍️ Shop All
                    </Link>
                    <div className="space-y-1">
                      <Link
                        to="/shop?sort=newest"
                        onClick={() => setIsShopMegaOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-white hover:text-red-600 hover:shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px] text-orange-500">new_releases</span>
                        New Arrivals
                      </Link>
                      <Link
                        to="/shop?sort=rating_desc"
                        onClick={() => setIsShopMegaOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-white hover:text-red-600 hover:shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px] text-amber-500">star</span>
                        Best Sellers
                      </Link>
                      <Link
                        to="/shop?sort=price_asc"
                        onClick={() => setIsShopMegaOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-white hover:text-red-600 hover:shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px] text-green-500">local_offer</span>
                        Budget Picks
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-[110%] left-4 right-4 bg-white/95 backdrop-blur-xl border border-white rounded-3xl shadow-xl shadow-slate-200/50 p-4 flex flex-col gap-2 animate-[slideDown_0.3s_ease-out] z-40">
              {!isAdmin && (
                <form onSubmit={handleSearchSubmit} className="group mb-2 flex items-center rounded-2xl border border-red-100 bg-red-50/70 p-1.5 pl-2 shadow-inner focus-within:bg-white focus-within:ring-4 focus-within:ring-red-100/70">
                  <button
                    type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-white"
                    title="Search"
                  >
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </button>
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={animatedSearchPlaceholder}
                    className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 text-sm font-bold text-slate-800 shadow-none outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </form>
              )}
              {navLinks.map((link) => (
                link.name === 'Shop' && !isAdmin ? (
                  <div key={link.name} className="flex flex-col gap-1">
                    <button 
                      onClick={() => setIsShopMegaOpen(!isShopMegaOpen)}
                      className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${
                        location.pathname === link.path || isShopMegaOpen
                        ? 'bg-red-50 text-red-600 shadow-sm'
                        : 'text-slate-600 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      {link.name}
                      <span className={`material-symbols-outlined text-[20px] opacity-30 transition-transform ${isShopMegaOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {isShopMegaOpen && (
                      <div className="flex flex-col gap-1 pl-4 pr-2 py-2 border-l-2 border-red-100 ml-4">
                        <Link to="/shop" onClick={() => { setIsMobileMenuOpen(false); setIsShopMegaOpen(false); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-600">Shop All</Link>
                        <Link to="/shop?sort=newest" onClick={() => { setIsMobileMenuOpen(false); setIsShopMegaOpen(false); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-600">New Arrivals</Link>
                        <Link to="/shop?sort=rating_desc" onClick={() => { setIsMobileMenuOpen(false); setIsShopMegaOpen(false); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-600">Best Sellers</Link>
                        <Link to="/shop?sort=price_asc" onClick={() => { setIsMobileMenuOpen(false); setIsShopMegaOpen(false); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-600">Budget Picks</Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link 
                    key={link.name} 
                    to={link.path} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${
                      location.pathname === link.path 
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                      : 'text-slate-600 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    {link.name}
                    <span className="material-symbols-outlined text-[20px] opacity-30">chevron_right</span>
                  </Link>
                )
              ))}
              <Link 
                to="/favorites" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-5 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between ${
                  location.pathname === '/favorites' 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                  : 'text-slate-600 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">favorite</span> Favorites
                </div>
                {wishlistItemsCount > 0 && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">{wishlistItemsCount}</span>}
              </Link>
            </div>
          )}

        </div>
      </nav>

      {/* Overlay to close dropdowns on outside click */}
      {(isProfileDropdownOpen || isMobileMenuOpen || isNotifOpen) && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-sm"
          onClick={() => {
            setIsProfileDropdownOpen(false);
            setIsMobileMenuOpen(false);
            setIsNotifOpen(false);
            setIsShopMegaOpen(false);
          }}
        />
      )}
      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        title="Log Out?"
        message="You'll need to sign in again to access your account and cart."
        confirmText="Log Out"
        cancelText="Stay"
        variant="danger"
        icon="logout"
      />
    </>
  );
};

export default Navbar;
