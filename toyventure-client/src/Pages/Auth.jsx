import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, clearPendingItem } from '../features/cart/cartSlice';
import { 
    useSendOtpMutation, 
    useVerifyOtpMutation, 
    useUpdateUserProfileMutation 
} from '../features/api/apiSlice';

const Auth = () => {
  const [step, setStep] = useState(1); 
  
  const [identifier, setIdentifier] = useState(''); 
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  
  // State for Terms and Conditions agreement
  const [agreeTerms, setAgreeTerms] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Access the pending item from Redux
  const pendingItem = useSelector((state) => state.cart.pendingItem);

  const [sendOtp, { isLoading: isSending }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateUserProfileMutation();

  const redirect = new URLSearchParams(location.search).get('redirect') || '/';

  useEffect(() => {
    setIdentifier('');
    setOtp('');

    const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect]);

  const isPhone = /^\d+$/.test(identifier);

  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    if (/^\d+$/.test(val) && val.length > 10) return; 
    setIdentifier(val);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!agreeTerms) {
      toast.error('Please agree to the Terms of Service to continue.');
      return;
    }

    if (isPhone && identifier.length < 10) {
      toast.error('Mobile number must be exactly 10 digits.');
      return;
    }

    try {
      const payload = isPhone ? { mobileNumber: identifier } : { email: identifier };
      const res = await sendOtp(payload).unwrap();
      
      // EXPLICIT NOTIFICATION: "OTP sent successfully!"
      toast.success('OTP sent! ✉️');
      setStep(2); 
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    try {
      const payload = isPhone ? { mobileNumber: identifier, otp } : { email: identifier, otp };
      
      const res = await verifyOtp(payload).unwrap();
      
      sessionStorage.setItem('userInfo', JSON.stringify(res));
      sessionStorage.setItem('token', res.token); 
      
      if (res.isNewUser) {
          setStep(3);
          toast.success("OTP Verified! Let's set up your profile.");
      } else {
          // Handle Pending Item for Existing Users
          if (pendingItem) {
              dispatch(addToCart(pendingItem));
              dispatch(clearPendingItem());
          }

          const firstName = res.name ? res.name.split(' ')[0] : 'User';
          toast.success(`Welcome back, ${firstName}! 🌟`);
          setTimeout(() => {
              navigate(redirect);
              window.location.reload(); 
          }, 1000);
      }

    } catch (err) {
      toast.error(err?.data?.message || 'Invalid or Expired OTP. Please check the code and try again.');
      setOtp('');
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
        toast.error("Please enter your name.");
        return;
    }

    try {
        await updateProfile({ name }).unwrap();

        const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
        userInfo.name = name;
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));

        // Handle Pending Item for New Users
        if (pendingItem) {
            dispatch(addToCart(pendingItem));
            dispatch(clearPendingItem());
        }

        toast.success('Successfully registered! 🎉');
        
        setTimeout(() => {
            navigate(redirect);
            window.location.reload(); 
        }, 1000);
    } catch (err) {
        toast.error(err?.data?.message || 'Failed to save name. You can update it later in your profile.');
        setTimeout(() => { navigate(redirect); window.location.reload(); }, 1500);
    }
  };

  return (
    <main className="pt-32 pb-24 min-h-screen bg-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 doodle-bg opacity-30 pointer-events-none z-0"></div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-50 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>

      <div className="bg-white/90 backdrop-blur-md p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-red-950/5 w-full max-w-md relative z-10 border border-red-50 animate-[fadeIn_0.3s_ease-out]">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
             <span className="material-symbols-outlined text-[32px]">
               {step === 1 ? 'waving_hand' : (step === 2 ? 'dialpad' : 'person')}
             </span>
          </div>
          
          <h1 className="text-3xl font-black text-red-950 tracking-tight">
            {step === 1 && 'Login or Sign Up'}
            {step === 2 && 'Verification'}
            {step === 3 && 'Almost Done!'}
          </h1>
          
          <p className="text-red-950/50 font-bold mt-2 text-sm">
            {step === 1 && 'Enter your email or mobile number and log in with a secure OTP to continue.'}
            {step === 2 && `Enter the 6-digit code sent to ${identifier}`}
            {step === 3 && 'What should we call you?'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
            <div className="space-y-2">
              <label className="text-xs font-bold text-red-950/60 uppercase tracking-widest ml-1">Email or Mobile Number</label>
              <input 
                type="text" 
                required 
                value={identifier} 
                onChange={handleIdentifierChange} 
                placeholder="" 
                className="w-full bg-red-50/30 p-4 border border-red-50 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition-all shadow-inner font-bold text-red-950" 
              />
            </div>

            <div className="flex items-start gap-3 mt-4 bg-red-50/30 p-3 rounded-xl border border-red-50/50">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-red-600 bg-white border-red-200 rounded focus:ring-red-500 focus:ring-2 cursor-pointer transition-colors"
              />
              <label htmlFor="terms" className="text-[11px] font-bold text-red-950/60 leading-snug cursor-pointer">
                By continuing, I confirm that I have read and agree to ToyBlix's{' '}
                <Link to="/terms" className="text-red-600 hover:text-red-800 hover:underline transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" className="text-red-600 hover:text-red-800 hover:underline transition-colors">
                  Privacy Policy
                </Link>.
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isSending || !identifier || !agreeTerms} 
              className="w-full py-4 mt-2 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 group"
            >
              {isSending ? 'Sending OTP...' : 'Continue with OTP'}
              {!isSending && <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
            <div className="space-y-2">
              <label className="text-xs font-bold text-red-950/60 uppercase tracking-widest ml-1">Secure OTP Code</label>
              <input 
                type="text" 
                required 
                maxLength="6"
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                placeholder="••••••" 
                className="w-full bg-red-50/30 p-4 border border-red-50 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition-all shadow-inner font-black text-red-950 text-center text-2xl tracking-[0.5em]" 
              />
            </div>

            <button type="submit" disabled={isVerifying || otp.length < 6} className="w-full py-4 mt-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
              {isVerifying ? 'Verifying...' : 'Verify & Continue'}
              {!isVerifying && <span className="material-symbols-outlined text-[20px]">verified_user</span>}
            </button>

            <div className="text-center mt-4">
              <button type="button" onClick={() => { setStep(1); setOtp(''); }} className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">
                &larr; Change {isPhone ? 'mobile number' : 'email'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleCompleteProfile} className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
            <div className="space-y-2">
              <label className="text-xs font-bold text-red-950/60 uppercase tracking-widest ml-1">Your Full Name</label>
              <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name" 
                  className="w-full bg-red-50/30 p-4 border border-red-50 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none transition-all shadow-inner font-bold text-red-950" 
              />
            </div>

            <button type="submit" disabled={isUpdatingProfile} className="w-full py-4 mt-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
              {isUpdatingProfile ? 'Saving...' : 'Complete Setup'}
              {!isUpdatingProfile && <span className="material-symbols-outlined text-[20px]">check_circle</span>}
            </button>
          </form>
        )}

      </div>
    </main>
  );
};

export default Auth;