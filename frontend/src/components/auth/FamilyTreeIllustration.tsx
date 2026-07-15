export function FamilyTreeIllustration() {
  return (
    <svg
      viewBox="0 0 480 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full max-w-md"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tree-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="100%" stopColor="#f5f0e8" />
        </linearGradient>
        <linearGradient id="node-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#faf8f5" />
        </linearGradient>
      </defs>

      <rect width="480" height="400" rx="24" fill="url(#tree-bg)" />

      {/* Decorative circles */}
      <circle cx="60" cy="60" r="40" fill="#d1fae5" opacity="0.4" />
      <circle cx="420" cy="340" r="60" fill="#e8dfd0" opacity="0.5" />
      <circle cx="400" cy="80" r="24" fill="#a7f3d0" opacity="0.3" />

      {/* Connector lines */}
      <path
        d="M240 120 L240 160 M160 200 L320 200 M160 200 L160 240 M320 200 L320 240 M120 280 L200 280 M280 280 L360 280 M120 280 L120 320 M200 280 L200 320 M280 280 L280 320 M360 280 L360 320"
        stroke="#8b9a6b"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Generation 1 - Grandparent */}
      <g transform="translate(200, 72)">
        <rect width="80" height="48" rx="12" fill="url(#node-grad)" stroke="#d4c4a8" strokeWidth="1.5" />
        <circle cx="40" cy="18" r="10" fill="#d1fae5" />
        <rect x="24" y="32" width="32" height="4" rx="2" fill="#e8dfd0" />
        <rect x="28" y="40" width="24" height="3" rx="1.5" fill="#f0f1f3" />
      </g>

      {/* Generation 2 - Parents */}
      <g transform="translate(120, 168)">
        <rect width="80" height="48" rx="12" fill="url(#node-grad)" stroke="#d4c4a8" strokeWidth="1.5" />
        <circle cx="40" cy="18" r="10" fill="#a7f3d0" />
        <rect x="24" y="32" width="32" height="4" rx="2" fill="#e8dfd0" />
        <rect x="28" y="40" width="24" height="3" rx="1.5" fill="#f0f1f3" />
      </g>
      <g transform="translate(280, 168)">
        <rect width="80" height="48" rx="12" fill="url(#node-grad)" stroke="#d4c4a8" strokeWidth="1.5" />
        <circle cx="40" cy="18" r="10" fill="#6ee7b7" />
        <rect x="24" y="32" width="32" height="4" rx="2" fill="#e8dfd0" />
        <rect x="28" y="40" width="24" height="3" rx="1.5" fill="#f0f1f3" />
      </g>

      {/* Generation 3 - Children */}
      {[80, 160, 240, 320].map((x) => (
        <g key={x} transform={`translate(${x}, 288)`}>
          <rect width="80" height="48" rx="12" fill="url(#node-grad)" stroke="#d4c4a8" strokeWidth="1.5" />
          <circle cx="40" cy="18" r="10" fill="#d1fae5" />
          <rect x="24" y="32" width="32" height="4" rx="2" fill="#e8dfd0" />
          <rect x="28" y="40" width="24" height="3" rx="1.5" fill="#f0f1f3" />
        </g>
      ))}

      {/* Leaf accents */}
      <path
        d="M30 200 Q40 180 50 200 Q40 220 30 200"
        fill="#6b7c4e"
        opacity="0.3"
      />
      <path
        d="M450 180 Q460 160 470 180 Q460 200 450 180"
        fill="#6b7c4e"
        opacity="0.3"
      />
    </svg>
  );
}
