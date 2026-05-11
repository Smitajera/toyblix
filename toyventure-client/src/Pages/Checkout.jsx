import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreateRazorpayOrderMutation, 
  useGetUserProfileQuery, 
  useCreateDemoOrderMutation, 
  useCreateCodOrderMutation, 
  useUpdateUserProfileMutation, 
  useValidateCouponMutation, 
  useVerifyRazorpayPaymentMutation} 
from "../features/api/apiSlice";
import { clearCart } from '../features/cart/cartSlice';

const resolveImage = (imgPath) => {
  if (!imgPath) return 'https://via.placeholder.com/400x400?text=No+Image';
  if (imgPath.startsWith('http') || imgPath.startsWith('data:')) return imgPath;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const baseUrl = apiBaseUrl.replace('/api', '');
  return `${baseUrl}${imgPath}`;
};

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK.'));
    document.body.appendChild(script);
  });

const createCheckoutRequestKey = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const Checkout = () => {
  const cartItems = useSelector((state) => state.cart.cartItems);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [createRazorpayOrder, { isLoading: isCreatingOrder }] = useCreateRazorpayOrderMutation();
  const [verifyRazorpayPayment, { isLoading: isVerifyingPayment }] = useVerifyRazorpayPaymentMutation();
  const [createDemoOrder, { isLoading: isCreatingDemoOrder }] = useCreateDemoOrderMutation();
  const [createCodOrder, { isLoading: isCreatingCodOrder }] = useCreateCodOrderMutation(); 
  const { data: profile } = useGetUserProfileQuery();
  const [updateProfile] = useUpdateUserProfileMutation();

  const [showPointsPopup, setShowPointsPopup] = useState(false);

  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    phone: '',
    flatNumber: '',
    street: '',
    landmark: '',
    city: '',
    pincode: '',
  });

  const handleSelectSavedAddress = (addressObj) => {
    setShippingDetails((prev) => ({
      ...prev,
      fullName: prev.fullName || profile?.name || '',
      phone: prev.phone || profile?.mobileNumber || '',
      flatNumber: addressObj.flatNumber || '',
      street: addressObj.street || '',
      landmark: addressObj.landmark || '',
      city: addressObj.city || '',
      pincode: String(addressObj.pincode || ''),
    }));
    // NEW: Added toast notification for address selection
    toast.success('Address selected!');
  };

  React.useEffect(() => {
    if (profile?.addresses?.length > 0) {
      setShippingDetails((prev) => {
        // Only auto-select if the user hasn't already started typing an address
        if (prev.street !== '') return prev; 
        
        const addressObj = profile.addresses[0];
        return {
          ...prev,
          fullName: prev.fullName || profile?.name || '',
          phone: prev.phone || profile?.mobileNumber || '',
          flatNumber: addressObj.flatNumber || '',
          street: addressObj.street || '',
          landmark: addressObj.landmark || '',
          city: addressObj.city || '',
          pincode: String(addressObj.pincode || ''),
        };
      });
    }
  }, [profile]);

  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [checkoutRequestKey] = useState(() => createCheckoutRequestKey());

  // Coupon State
  const [validateCoupon, { isLoading: isValidatingCoupon }] = useValidateCouponMutation();
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [showCouponDetails, setShowCouponDetails] = useState(false);
  
  // Gift Wrap State
  const [isGiftWrapped, setIsGiftWrapped] = useState(false);

  // Points State
  const [usePoints, setUsePoints] = useState(0);
  const userPoints = profile?.points || 0;

  React.useEffect(() => {
    if (appliedCoupon) {
      setUsePoints(0);
    }
  }, [appliedCoupon]);

  const subtotalPrice = cartItems.reduce((acc, item) => {
    const price = parseFloat(item.price) || 0;
    const qty = parseInt(item.qty, 10) || 1;
    return acc + price * qty;
  }, 0);

  const maxPointsAllowed = Math.min(userPoints, Math.floor(subtotalPrice));
  const pointsDiscount = (!appliedCoupon && usePoints > 0 && usePoints <= maxPointsAllowed) ? usePoints : 0;
  const baseTotal = appliedCoupon ? appliedCoupon.finalTotal : (subtotalPrice - pointsDiscount);
  const deliveryFee = baseTotal < 500 ? 50 : 0;
  const giftWrapFee = isGiftWrapped ? 50 : 0;
  const codFee = paymentMethod === 'cod' ? 50 : 0;
  const totalPrice = baseTotal + deliveryFee + giftWrapFee + codFee;

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) { toast.error('Please enter a promo code.'); return; }
    try {
      const result = await validateCoupon({ code: couponInput.trim(), cartTotal: subtotalPrice }).unwrap();
      setAppliedCoupon({
        code: result.code,
        discount: result.discount,
        finalTotal: result.finalTotal,
        discountType: result.discountType,
        discountValue: result.discountValue,
        terms: result.terms || {},
      });
      setShowCouponDetails(false);
      toast.success(result.message);
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid coupon code.');
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    toast('Coupon removed.', { icon: '🗑️' });
  };

  const isBusy = isCreatingOrder || isVerifyingPayment || isCreatingDemoOrder || isCreatingCodOrder; 

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const sanitizedValue = value.replace(/\D/g, '');
      if (sanitizedValue.length > 10) return;
      setShippingDetails({ ...shippingDetails, [name]: sanitizedValue });
    } else if (name === 'pincode') {
      const sanitizedValue = value.replace(/\D/g, '');
      if (sanitizedValue.length > 6) return;
      setShippingDetails({ ...shippingDetails, [name]: sanitizedValue });
    } else {
      setShippingDetails({ ...shippingDetails, [name]: value });
    }
  };

  const handleAutoSaveAddress = async () => {
    if (!profile) return;
    const { flatNumber, street, landmark, city, pincode } = shippingDetails;
    const currentAddresses = profile.addresses || [];
    
    const exists = currentAddresses.some(a => 
      a.flatNumber === flatNumber && 
      a.street === street && 
      a.city === city && 
      a.pincode === pincode
    );

    if (!exists) {
      const newAddresses = [...currentAddresses, { flatNumber, street, landmark, city, pincode }].slice(-3);
      try {
        await updateProfile({ name: profile.name, addresses: newAddresses }).unwrap();
      } catch (err) {
        console.error("Failed to auto-save address", err);
      }
    }
  };

  const launchRazorpayCheckout = async ({ order, razorpayOrder, razorpayKeyId }) => {
    await loadRazorpayScript();

    const keyId = razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyId) {
      throw new Error('Missing Razorpay key. Set VITE_RAZORPAY_KEY_ID or return it from the backend.');
    }

    const prefillPhone = shippingDetails.phone || profile?.mobileNumber || '';
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || 'null');

    const razorpay = new window.Razorpay({
      key: keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: 'ToyBlix',
      description: `Order #${String(order._id).slice(-8)}`,
      order_id: razorpayOrder.id,
      image: '/favicon.svg',
      prefill: {
        name: shippingDetails.fullName || profile?.name || '',
        contact: prefillPhone,
        email: userInfo?.email || profile?.email || '',
      },
      notes: {
        localOrderId: order._id,
        paymentPreference: paymentMethod,
      },
      theme: {
        color: '#18181b',
      },
      handler: async (response) => {
        try {
          const verification = await verifyRazorpayPayment({
            localOrderId: order._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }).unwrap();

          await handleAutoSaveAddress();
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setShowPointsPopup(true);
          setTimeout(() => {
            dispatch(clearCart());
            setShowPointsPopup(false);
            navigate('/profile');
          }, 2500);
        } catch (error) {
          toast.error(error?.data?.message || 'Payment captured, but verification failed. Please contact support.');
        }
      },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          toast.error('Payment failed, please try again later ❌');
        },
      },
    });

    razorpay.on('payment.failed', (event) => {
      const failureMessage =
        event?.error?.description || event?.error?.reason || 'Payment failed. Please try again.';
      toast.error(failureMessage);
    });

    razorpay.open();
  };

  const placeOrderHandler = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast.error('Your cart is empty. Add items before checking out.');
      navigate('/shop');
      return;
    }

    try {
      if (paymentMethod === 'cod') {
        await createCodOrder({
          orderItems: cartItems,
          shippingDetails,
          totalPrice,
          isGiftWrapped,
          deliveryFee,
          giftWrapFee,
          codFee,
          discountAmount: appliedCoupon?.discount || pointsDiscount || 0,
          paymentMethod: 'cod',
          idempotencyKey: checkoutRequestKey,
          couponCode: appliedCoupon?.code || null,
          usePoints: usePoints && !appliedCoupon,
        }).unwrap();
        
        await handleAutoSaveAddress();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setShowPointsPopup(true);
        setTimeout(() => {
          dispatch(clearCart());
          setShowPointsPopup(false);
          navigate('/profile');
        }, 2500);
        return;
      }

      if (paymentMethod === 'demo') {
        const demoOrder = await createDemoOrder({
          orderItems: cartItems,
          shippingDetails,
          totalPrice,
          isGiftWrapped,
          deliveryFee,
          giftWrapFee,
          codFee,
          discountAmount: appliedCoupon?.discount || pointsDiscount || 0,
          paymentMethod: 'demo',
          idempotencyKey: checkoutRequestKey,
          couponCode: appliedCoupon?.code || null,
          usePoints: usePoints && !appliedCoupon,
        }).unwrap();
        
        await handleAutoSaveAddress();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setShowPointsPopup(true);
        setTimeout(() => {
          dispatch(clearCart());
          setShowPointsPopup(false);
          navigate('/profile');
        }, 2500);
        return;
      }

      const checkoutSession = await createRazorpayOrder({
        orderItems: cartItems,
        shippingDetails,
        totalPrice,
        isGiftWrapped,
        deliveryFee,
        giftWrapFee,
        codFee,
        discountAmount: appliedCoupon?.discount || pointsDiscount || 0,
        paymentMethod: 'razorpay',
        idempotencyKey: checkoutRequestKey,
        usePoints: usePoints && !appliedCoupon,
      }).unwrap();

      if (checkoutSession.order?.isPaid) {
        dispatch(clearCart());
        toast.success('This checkout is already paid.');
        navigate('/profile');
        return;
      }

      await launchRazorpayCheckout(checkoutSession);
    } catch (error) {
      toast.error(error?.data?.message || error.message || 'Unable to process checkout.');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="pt-32 pb-24 min-h-screen bg-surface flex flex-col items-center justify-center px-6">
        <span className="material-symbols-outlined text-[80px] text-zinc-300 mb-6">shopping_bag</span>
        <h2 className="text-3xl font-black text-zinc-800 mb-4">Your cart is empty</h2>
        <p className="text-zinc-500 mb-8 text-center max-w-md">Looks like you haven't added any toys to your cart yet.</p>
        <Link to="/shop" className="px-8 py-4 bg-primary-container text-white font-black rounded-full hover:-translate-y-1 hover:shadow-lg transition-all">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 min-h-screen bg-surface bg-hero-glow relative fade-in">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      <div className="max-w-[1100px] mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="card-surface p-8 rounded-[2.5rem] shadow-soft">
            <div className="flex items-center gap-3 mb-6 border-b border-white pb-4">
              <span className="material-symbols-outlined text-primary-container text-[28px]">local_shipping</span>
              <h1 className="text-2xl font-black text-zinc-800">Shipping Details</h1>
            </div>

            {profile?.addresses && profile.addresses.length > 0 && (
              <div className="mb-8 p-4 bg-white/40 rounded-2xl border border-white shadow-sm">
                <p className="text-sm font-bold text-zinc-500 mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">bolt</span> Quick Select Saved Address:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.addresses.map((addr, idx) => {
                    const isSelected = shippingDetails.flatNumber === (addr.flatNumber || '') && shippingDetails.street === (addr.street || '');
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-primary-container bg-primary-container/10 shadow-md' 
                            : 'border-transparent bg-white hover:border-primary-container/30 hover:shadow-md'
                        }`}
                      >
                        <p className="font-bold text-zinc-800 text-sm line-clamp-1">{addr.flatNumber}, {addr.street}</p>
                        <p className="text-xs text-zinc-500 mt-1">{addr.city} - {addr.pincode}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <form id="checkout-form" onSubmit={placeOrderHandler} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-600 ml-1">Full Name</label>
                  <input required type="text" name="fullName" value={shippingDetails.fullName} onChange={handleInputChange} className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800" placeholder="Your Full Name" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-600 ml-1">Phone Number</label>
                  <input required type="tel" name="phone" value={shippingDetails.phone} onChange={handleInputChange} pattern="[0-9]{10}" title="Please enter a valid 10-digit phone number" maxLength="10" className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800" placeholder="Your Phone Number" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-600 ml-1">Flat / Block No.</label>
                  <input required type="text" name="flatNumber" value={shippingDetails.flatNumber} onChange={handleInputChange} className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800" placeholder="Your Flat / House No." />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-600 ml-1">Street / Locality</label>
                  <input required type="text" name="street" value={shippingDetails.street} onChange={handleInputChange} className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800" placeholder="Your Street / Locality" />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-zinc-600 ml-1">Landmark (Optional)</label>
                  <input type="text" name="landmark" value={shippingDetails.landmark} onChange={handleInputChange} className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800" placeholder="Your Landmark (Optional)" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-600 ml-1">City</label>
                  <input required type="text" name="city" value={shippingDetails.city} onChange={handleInputChange} className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800" placeholder="Your City" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-600 ml-1">Pincode</label>
                  <input required type="text" name="pincode" value={shippingDetails.pincode} onChange={handleInputChange} pattern="[0-9]{6}" title="Please enter a valid 6-digit pincode" maxLength="6" className="w-full bg-white/60 p-4 border border-white rounded-2xl focus:ring-4 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-medium text-zinc-800" placeholder="Your Pincode" />
                </div>
                <div className="md:col-span-2 flex justify-end border-t border-zinc-200/50 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setShippingDetails({
                      fullName: profile?.name || '',
                      phone: profile?.mobileNumber || '',
                      flatNumber: '', street: '', landmark: '', city: '', pincode: ''
                    })}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-primary-container transition-colors px-3 py-2 rounded-lg hover:bg-primary-container/10"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span> Clear and Enter a New Address
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="card-surface p-8 rounded-[2.5rem] shadow-soft">
            <div className="flex items-center gap-3 mb-6 border-b border-white pb-4">
              <span className="material-symbols-outlined text-primary-container text-[28px]">payments</span>
              <h1 className="text-2xl font-black text-zinc-800">Payment Options</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-2 shadow-sm hover:shadow-md ${paymentMethod === 'cod' ? 'border-primary-container bg-primary-container/5' : 'border-white bg-white/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-primary-container text-[28px]">local_mall</span>
                  <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-5 h-5 text-primary-container focus:ring-primary-container" />
                </div>
                <span className="font-black text-zinc-800 text-lg">Cash on Delivery</span>
                <span className="text-xs text-zinc-500 font-medium">Pay with cash when your package arrives at your doorstep.</span>
              </label>
              
              <label className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col gap-2 shadow-sm hover:shadow-md ${paymentMethod === 'razorpay' ? 'border-primary-container bg-primary-container/5' : 'border-white bg-white/60'}`}>
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-primary-container text-[28px]">account_balance_wallet</span>
                  <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="w-5 h-5 text-primary-container focus:ring-primary-container" />
                </div>
                <span className="font-black text-zinc-800 text-lg">Pay Online</span>
                <span className="text-xs text-zinc-500 font-medium">Securely pay via Credit/Debit Card, UPI, or NetBanking.</span>
              </label>
            </div>


          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="card-surface p-8 rounded-[2.5rem] shadow-soft sticky top-32">
            <h2 className="text-xl font-black text-zinc-800 mb-6 border-b border-white pb-4">Order Summary</h2>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {cartItems.map((item, index) => (
                <div key={index} className="flex gap-4 items-center bg-white/40 p-3 rounded-2xl border border-white">
                  <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                    <img src={resolveImage(item.image || item.img)} alt={item.title} className="w-full h-full object-cover mix-blend-multiply" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-zinc-800 line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Qty: {item.qty}</p>
                  </div>
                  <div className="font-black text-zinc-800">
                    Rs {(parseFloat(item.price) || 0) * (parseInt(item.qty, 10) || 1)}
                  </div>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div className="border-t border-white mt-6 pt-5">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">sell</span> Promo Code
              </p>
              {appliedCoupon ? (
                <div>
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                      <span className="font-black text-green-700 text-sm">{appliedCoupon.code}</span>
                      <span className="text-green-600 text-xs font-bold">- Rs {appliedCoupon.discount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setShowCouponDetails(!showCouponDetails)} className="text-green-500 hover:text-green-700 transition-colors" title="View Details">
                        <span className="material-symbols-outlined text-[18px]">{showCouponDetails ? 'expand_less' : 'info'}</span>
                      </button>
                      <button type="button" onClick={handleRemoveCoupon} className="text-red-400 hover:text-red-600 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                  {showCouponDetails && (
                    <div className="mt-2 bg-white/60 border border-zinc-200/60 rounded-xl p-4 space-y-2 text-xs">
                      <p className="font-black text-zinc-600 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">gavel</span> Terms & Conditions
                      </p>
                      <div className="space-y-1.5 text-zinc-600 font-medium">
                        <p className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[14px] text-primary-container">sell</span>
                          Discount: <strong className="text-zinc-800">{appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% off` : `Flat Rs ${appliedCoupon.discountValue} off`}</strong>
                        </p>
                        {appliedCoupon.terms.minOrderAmount > 0 && (
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-primary-container">shopping_cart</span>
                            Minimum order: <strong className="text-zinc-800">Rs {appliedCoupon.terms.minOrderAmount}</strong>
                          </p>
                        )}
                        {appliedCoupon.terms.maxDiscount && (
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-primary-container">vertical_align_top</span>
                            Max discount capped at: <strong className="text-zinc-800">Rs {appliedCoupon.terms.maxDiscount}</strong>
                          </p>
                        )}
                        {appliedCoupon.terms.expiresAt && (
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-primary-container">event</span>
                            Valid until: <strong className="text-zinc-800">{new Date(appliedCoupon.terms.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          </p>
                        )}
                        {appliedCoupon.terms.usageLimit !== null && (
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-primary-container">group</span>
                            Limited to <strong className="text-zinc-800">{appliedCoupon.terms.usageLimit}</strong> uses ({appliedCoupon.terms.usageLimit - appliedCoupon.terms.usedCount} remaining)
                          </p>
                        )}
                        {!appliedCoupon.terms.expiresAt && !appliedCoupon.terms.usageLimit && appliedCoupon.terms.minOrderAmount === 0 && !appliedCoupon.terms.maxDiscount && (
                          <p className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-green-500">check</span>
                            No restrictions. Enjoy your discount!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter code e.g. SUMMER20"
                    className="flex-1 bg-white/60 p-3 border border-white rounded-xl focus:ring-2 focus:ring-primary-container/20 outline-none transition-all shadow-inner font-bold text-sm text-zinc-800 uppercase placeholder:normal-case placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon}
                    className="px-5 py-3 bg-zinc-800 text-white font-black text-xs rounded-xl hover:bg-black transition-all disabled:opacity-50 uppercase tracking-wider"
                  >
                    {isValidatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-white mt-6 pt-5">
              <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-white bg-white/60 cursor-pointer shadow-sm hover:shadow-md transition-all">
                <input 
                  type="checkbox" 
                  checked={isGiftWrapped} 
                  onChange={(e) => setIsGiftWrapped(e.target.checked)}
                  className="w-5 h-5 text-primary-container focus:ring-primary-container rounded"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-zinc-800 tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-zinc-600">redeem</span>
                    Add a Gift Wrap (+Rs 50)
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium mt-0.5 ml-6">Beautifully wrapped toy ready to be gifted!</span>
                </div>
              </label>

              {userPoints > 0 && maxPointsAllowed > 0 && (
                <div className={`flex flex-col gap-3 p-4 rounded-2xl border-2 shadow-sm transition-all mt-3 ${appliedCoupon ? 'opacity-50 border-white bg-zinc-100' : (usePoints > 0 ? 'border-primary-container bg-primary-container/5' : 'border-white bg-white/60')}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-800 tracking-wide flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-yellow-500">toll</span>
                      Redeem Loyalty Points
                    </span>
                    <span className="text-xs font-black text-primary-container bg-white px-2 py-1 rounded-md shadow-sm border border-primary-container/20">
                      -₹{usePoints}
                    </span>
                  </div>
                  
                  <div className="px-1 mt-2">
                    <input 
                      type="range" 
                      min="0" 
                      max={maxPointsAllowed} 
                      value={usePoints} 
                      onChange={(e) => setUsePoints(Number(e.target.value))}
                      disabled={!!appliedCoupon}
                      className="w-full accent-primary-container cursor-pointer disabled:opacity-50"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-zinc-500 font-bold">0 pts</span>
                      <span className="text-[10px] text-zinc-500 font-medium">
                        {appliedCoupon ? 'Cannot be combined with promo codes.' : `Available: ${userPoints} pts`}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-bold">{maxPointsAllowed} pts max</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white mt-4 pt-4 space-y-3">
              <div className="flex justify-between text-sm font-bold text-zinc-600">
                <span>Subtotal</span>
                <span>Rs {subtotalPrice.toLocaleString('en-IN')}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>- Rs {appliedCoupon.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {usePoints > 0 && !appliedCoupon && (
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Loyalty Points Redeemed</span>
                  <span>- Rs {pointsDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {isGiftWrapped && (
                <div className="flex justify-between text-sm font-bold text-zinc-600">
                  <span>Gift Wrap</span>
                  <span>+ Rs 50</span>
                </div>
              )}
              {codFee > 0 && (
                <div className="flex justify-between text-sm font-bold text-zinc-600">
                  <span>COD Handling Fee</span>
                  <span>+ Rs 50</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-zinc-600">
                <span>Shipping {deliveryFee > 0 ? '(Under Rs 500)' : ''}</span>
                {deliveryFee === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  <span>+ Rs {deliveryFee}</span>
                )}
              </div>
              <div className="flex justify-between items-end pt-4">
                <span className="text-lg font-bold text-zinc-800">Total Due</span>
                <div className="text-right">
                  {appliedCoupon && <span className="text-sm text-zinc-400 line-through block">Rs {subtotalPrice.toLocaleString('en-IN')}</span>}
                  <span className="text-3xl font-black text-primary-container">Rs {totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isBusy}
              className={`w-full py-4 mt-8 text-white font-black text-lg rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 group ${paymentMethod === 'cod' ? 'bg-red-600 hover:bg-red-700' : 'bg-zinc-900 hover:bg-black'}`}
            >
              {isBusy ? 'Processing...' : (paymentMethod === 'cod' ? `Place Order • Rs ${totalPrice.toLocaleString('en-IN')}` : `Pay Rs ${totalPrice.toLocaleString('en-IN')}`)}
              {!isBusy && paymentMethod !== 'cod' && <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">lock</span>}
              {!isBusy && paymentMethod === 'cod' && <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">local_shipping</span>}
            </button>
            
            {paymentMethod !== 'cod' && paymentMethod !== 'demo' && (
              <div className="mt-5 p-4 bg-zinc-50/80 border border-zinc-200/60 rounded-2xl flex items-start gap-3">
                <span className="material-symbols-outlined text-green-600 text-[22px]">verified_user</span>
                <div>
                  <p className="font-black text-zinc-800 text-xs">ToyBlix does not collect card numbers or CVV.</p>
                  <p className="text-[10px] text-zinc-500 font-bold mt-1.5 leading-relaxed">
                    When you click pay, a secure hosted checkout opens so payment details stay strictly inside the payment gateway.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Points Reward Full-Screen Popup */}
      {showPointsPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 text-center max-w-sm w-full shadow-2xl relative overflow-hidden transform scale-100 animate-in zoom-in-90 duration-500">
            {/* Background elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl animate-[pulse_2s_ease-in-out_infinite]"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-400/20 rounded-full blur-3xl animate-[pulse_2s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}></div>
            
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-500/30 text-5xl animate-[bounce_1s_infinite]">
              🏆
            </div>
            
            <h2 className="text-3xl font-black text-slate-900 mb-2">Awesome!</h2>
            <p className="text-slate-600 font-medium mb-8 text-[15px] leading-snug">
              Your order is placed and you earned <span className="font-bold text-red-600">Loyalty Points</span>!
            </p>
            
            <div className="w-full bg-slate-50 py-5 rounded-2xl border border-slate-100 mb-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Points Earned</p>
              <p className="text-4xl font-black text-red-600">+10</p>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
              <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-red-600 animate-spin"></span>
              Redirecting to your orders...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;