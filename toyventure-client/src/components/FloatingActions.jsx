import React, { useState, useRef, useEffect } from 'react';
import { useGetUserProfileQuery, useGetMyOrdersQuery, useSubmitContactMessageMutation } from '../features/api/apiSlice';

const BOT_TYPING_DELAY = 500; // Faster response feel for AI

const MENU_ITEMS = [
  { id: 'track',    label: 'Track My Order',  icon: 'local_shipping',  requiresAuth: true  },
  { id: 'delivery', label: 'Delivery Info',   icon: 'info',            requiresAuth: false },
  { id: 'howto',    label: 'How To Order',    icon: 'help_outline',    requiresAuth: false },
  { id: 'payment',  label: 'Payment Info',    icon: 'payments',        requiresAuth: false },
  { id: 'contact',  label: 'Contact Support', icon: 'call',            requiresAuth: false },
];

// Renders a "Main Menu" block inside the chat
const MainMenuBlock = ({ onSelect, isLoggedIn, disabled }) => (
  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm overflow-hidden w-full max-w-[90%]">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 pt-3 pb-2">Quick Actions</p>
    <div className="divide-y divide-slate-100">
      {MENU_ITEMS.map((item) => (
        <button
          key={item.id}
          disabled={disabled}
          onClick={() => onSelect(item)}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left group disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px] text-blue-500 shrink-0">{item.icon}</span>
          <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 flex-1">{item.label}</span>
          {item.requiresAuth && !isLoggedIn && (
            <span className="material-symbols-outlined text-[13px] text-slate-300">lock</span>
          )}
          <span className="material-symbols-outlined text-[15px] text-slate-300 group-hover:text-blue-400">chevron_right</span>
        </button>
      ))}
    </div>
  </div>
);

const FloatingActions = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages]     = useState([]);
  const [inputText, setInputText]   = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auth check
  const userInfoRaw = sessionStorage.getItem('userInfo');
  const userInfo    = userInfoRaw ? JSON.parse(userInfoRaw) : null;
  const isLoggedIn  = !!userInfo;

  const { data: profile }    = useGetUserProfileQuery(undefined, { skip: !isLoggedIn });
  const { data: ordersData } = useGetMyOrdersQuery(undefined,    { skip: !isLoggedIn });
  const orders = ordersData || [];

  const [submitMessage] = useSubmitContactMessageMutation();

  // Init messages once on open
 useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      setMessages([
        { id: 0, type: 'bot-text', text: `Hi! 👋 I'm the ToyBlix chatbot. How can I help you today?` },
        { id: 1, type: 'bot-menu' },
      ]);
    }
  }, [isChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);
// NEW: Generate a truly unique ID so React never crashes on rapid messages
  const generateId = () => Date.now() + Math.random().toString(36).substring(2, 9);

  // Update these to use the new generateId() function
  const addUserMsg = (text) => setMessages(prev => [...prev, { id: generateId(), type: 'user-text', text }]);
  const addBotText = (text) => setMessages(prev => [...prev, { id: generateId(), type: 'bot-text', text }]);
  const addBackMenu = () => setMessages(prev => [...prev, { id: generateId(), type: 'back-menu' }]);
  const addMainMenu = () => setMessages(prev => [...prev, { id: generateId(), type: 'bot-menu' }]);

  const handleBackToMenu = () => {
    addMainMenu();
  };

  // Process sending a message to the Gemini AI Backend
  const sendToAI = async (text) => {
    setIsBotTyping(true);
    
    // Extract history for Gemini (only text messages, ignore menus)
    const history = messages
        .filter(m => m.type === 'bot-text' || m.type === 'user-text')
        .map(m => ({
            sender: m.type === 'bot-text' ? 'bot' : 'user',
            text: m.text
        }));

    try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiBaseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history })
        });

        const data = await response.json();
        
        setIsBotTyping(false);
        
        if (data.reply) {
            addBotText(data.reply);
        }

        // If the bot triggered the handoff protocol
        if (data.needsHuman) {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    type: 'bot-handoff',
                    text: `I think a human can handle this much better than I can! Please reach out to our team directly on WhatsApp.`
                }]);
            }, 800);
        }

    } catch (error) {
        setIsBotTyping(false);
        addBotText("Oops! My circuits are a bit crossed right now. Please try again later or contact support directly.");
    }
  };

  const handleMenuSelect = async (item) => {
    addUserMsg(item.label);

    // Auth gate for private queries
    if (item.requiresAuth && !isLoggedIn) {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot-auth-prompt',
          text: `🔒 To view this information, please log in first:`,
        }]);
      }, BOT_TYPING_DELAY);
      return;
    }

    // 1. Frontend Logic: Order Tracking
    if (item.id === 'track') {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        if (orders.length === 0) {
          addBotText(`📦 You haven't placed any orders yet. Visit our Shop to start shopping!`);
        } else {
          const latest   = orders[0];
          const orderId  = String(latest._id).slice(-8).toUpperCase();
          const status   = latest.orderStatus?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Processing';
          const date     = latest.createdAt
            ? new Date(latest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
          addBotText(`📦 Your latest order:\n\nOrder #${orderId}\nStatus: ${status}\nDate: ${date}\n\nFor full history, visit your Profile page.`);
        }
        addBackMenu();
      }, BOT_TYPING_DELAY);
      return;
    }


    // 3. Frontend Logic: Explicit Contact Us (Sends Email)
    if (item.id === 'contact') {
      setIsBotTyping(true);
      try {
        const name  = userInfo?.name  || 'Guest User';
        const email = userInfo?.email || 'guest@toyblix.com';
        await submitMessage({ name, email, message: '[Contact Request via Live Chat Menu]' }).unwrap();
      } catch (_) { /* silent */ }
      setTimeout(() => {
        setIsBotTyping(false);
        addBotText(`✅ Our support team has been notified and will email you shortly!\n\nFor an instant response, you can also use the WhatsApp button.`);
        addBackMenu();
      }, BOT_TYPING_DELAY);
      return;
    }

    // 4. AI Logic: Route general FAQ menu clicks to Gemini
    await sendToAI(`Please explain your ${item.label.toLowerCase()}`);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isBotTyping) return;
    
    setInputText('');
    addUserMsg(text);
    
    // Route typed messages to Gemini
    await sendToAI(text);
  };

  const renderText = (text) =>
    text.split('\n').map((line, i, arr) => (
      <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
    ));

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-4 items-end">

      {/* ── Chat Window ── */}
      {isChatOpen && (
        <div
          className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: '520px', animation: 'slideUp 0.3s ease-out' }}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-blue-200 shrink-0 shadow-inner">
                <span className="text-blue-600 font-black text-[11px] tracking-tight">TB</span>
              </div>
              <div>
                {/* Update the title here */}
                <h3 className="font-bold text-sm leading-tight">ToyBlix chatbot</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-medium">Online & Ready</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-white hover:text-blue-200 transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
            {messages.map((msg) => {
              
              if (msg.type === 'bot-menu') {
                return (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                      <span className="material-symbols-outlined text-[13px] text-blue-600">smart_toy</span>
                    </div>
                    <MainMenuBlock
                      onSelect={handleMenuSelect}
                      isLoggedIn={isLoggedIn}
                      disabled={isBotTyping}
                    />
                  </div>
                );
              }

              if (msg.type === 'bot-auth-prompt') {
                return (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                      <span className="material-symbols-outlined text-[13px] text-blue-600">lock</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm p-3 max-w-[85%]">
                      <p className="text-xs text-slate-700 mb-3 font-medium">{msg.text}</p>
                      <div className="flex gap-2 flex-wrap">
                        <a
                          href="/auth"
                          className="flex items-center gap-1.5 bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full hover:bg-blue-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">login</span>
                          Login
                        </a>
                        <button
                          onClick={handleBackToMenu}
                          className="flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">arrow_back</span>
                          Menu
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (msg.type === 'bot-handoff') {
                return (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-1">
                      <span className="material-symbols-outlined text-[13px] text-orange-600">support_agent</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm p-3 max-w-[85%]">
                      <p className="text-xs text-slate-700 mb-3">{msg.text}</p>
                      <button
                          onClick={() => window.open('https://wa.me/919925819695', '_blank')}
                          className="flex items-center gap-1.5 w-full justify-center bg-[#25D366] text-white text-[11px] font-bold px-3 py-2 rounded-xl hover:bg-[#128C7E] transition-colors"
                      >
                          <span className="material-symbols-outlined text-[14px]">chat</span>
                          Chat on WhatsApp
                      </button>
                    </div>
                  </div>
                );
              }

              if (msg.type === 'back-menu') {
                return (
                  <div key={msg.id} className="flex justify-center mt-2 mb-2">
                    <button
                      onClick={handleBackToMenu}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 border border-slate-200 bg-white px-4 py-1.5 rounded-full hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">apps</span>
                      Show Options
                    </button>
                  </div>
                );
              }

              if (msg.type === 'bot-text') {
                return (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                      <span className="material-symbols-outlined text-[13px] text-blue-600">smart_toy</span>
                    </div>
                    <div className="bg-white border border-slate-200 text-slate-700 text-[13px] font-medium p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] leading-relaxed">
                      {renderText(msg.text)}
                    </div>
                  </div>
                );
              }

              if (msg.type === 'user-text') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-blue-600 text-white text-[13px] font-medium p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[80%] leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Typing indicator */}
            {isBotTyping && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                  <span className="material-symbols-outlined text-[13px] text-blue-600">smart_toy</span>
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-[38px]">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Text Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex-shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isBotTyping}
                placeholder="Ask me anything..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 pl-4 pr-12 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={isBotTyping || !inputText.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px] ml-0.5">send</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Floating Buttons ── */}
      <div className="flex flex-col gap-3">
        {/* WhatsApp */}
        <button
          onClick={() => window.open('https://wa.me/919925819695', '_blank')}
          className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 hover:bg-[#128C7E] hover:scale-110 transition-all group relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
          </svg>
          <span className="absolute right-full mr-3 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">WhatsApp Us</span>
        </button>

        {/* Live Chat */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-110 transition-all group relative"
        >
          <span className="material-symbols-outlined text-[28px]">{isChatOpen ? 'close' : 'smart_toy'}</span>
          <span className="absolute right-full mr-3 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Live Chat AI</span>
        </button>
      </div>
    </div>
  );
};

export default FloatingActions;