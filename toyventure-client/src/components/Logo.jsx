import React from 'react';

const Logo = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative flex items-center justify-center transform transition-transform duration-300 hover:-translate-y-1 hover:scale-110 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <defs>
          {/* Changed from Orange to Red colors for the fur */}
          <linearGradient id="teddy-fur" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#EF4444" /> {/* Red-500 */}
            <stop offset="100%" stopColor="#DC2626" /> {/* Red-600 */}
          </linearGradient>
          
          {/* Kept snout amber/creamy to ensure the face is visible against the red */}
          <linearGradient id="teddy-snout" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#FFFBEB" /> {/* Amber-50 */}
            <stop offset="100%" stopColor="#FDE68A" /> {/* Amber-200 */}
          </linearGradient>
        </defs>

        <g>
          {/* Ears */}
          <circle cx="22" cy="28" r="14" fill="url(#teddy-fur)" />
          <circle cx="78" cy="28" r="14" fill="url(#teddy-fur)" />
          
          {/* Inner Ears */}
          <circle cx="22" cy="28" r="7" fill="#FCA5A5" opacity="0.9" /> {/* Red-300 */}
          <circle cx="78" cy="28" r="7" fill="#FCA5A5" opacity="0.9" />

          {/* Main Face */}
          <ellipse cx="50" cy="55" rx="38" ry="32" fill="url(#teddy-fur)" />
          
          {/* Blush */}
          <ellipse cx="23" cy="58" rx="6" ry="4" fill="#F87171" opacity="0.6" />
          <ellipse cx="77" cy="58" rx="6" ry="4" fill="#F87171" opacity="0.6" />

          {/* Snout */}
          <ellipse cx="50" cy="65" rx="16" ry="13" fill="url(#teddy-snout)" />
          
          {/* Nose */}
          <ellipse cx="50" cy="59" rx="7" ry="5" fill="#451A03" />
          {/* Nose Shine */}
          <ellipse cx="52" cy="57.5" rx="2" ry="1.5" fill="#FFFFFF" opacity="0.7" transform="rotate(-15 52 57)" />

          {/* Mouth */}
          <path d="M50 64 V 68 M44 67 Q 47 73 50 68 Q 53 73 56 67" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Left Eye */}
          <circle cx="33" cy="45" r="5" fill="#451A03" />
          {/* Left Eye Sparkles */}
          <circle cx="31.5" cy="43.5" r="2" fill="#FFFFFF" />
          <circle cx="34.5" cy="46.5" r="0.8" fill="#FFFFFF" />

          {/* Right Eye */}
          <circle cx="67" cy="45" r="5" fill="#451A03" />
          {/* Right Eye Sparkles */}
          <circle cx="65.5" cy="43.5" r="2" fill="#FFFFFF" />
          <circle cx="68.5" cy="46.5" r="0.8" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
};

export default Logo;