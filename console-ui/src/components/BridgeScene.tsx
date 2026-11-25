import React from 'react';

/**
 * Decorative hero artwork for the LeeWay Device Bridge landing page.
 * Pure inline SVG — no external image host and no third-party AI service.
 */
const windows = (x: number, y: number, cols: number, rows: number, step = 13) =>
  Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return <rect key={i} x={x + col * step} y={y + row * step} width="2.5" height="2.5" rx="0.6" fill="#22d3ee" opacity={(i * 7) % 5 === 0 ? 0.55 : 0.16} />;
  });

const nodes = [
  { x: 292, y: 214 },
  { x: 462, y: 176 },
  { x: 680, y: 132 },
  { x: 892, y: 178 },
  { x: 1040, y: 210 },
  { x: 1178, y: 230 },
];

export function BridgeScene() {
  return (
    <svg
      className="bridge-scene"
      viewBox="0 0 1365 400"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="LeeWay Device Bridge linking smartwatch, laptop, desktop, tablet, phone and speaker across a glowing bridge"
    >
      <defs>
        <linearGradient id="lw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#031d26" />
          <stop offset="55%" stopColor="#062a33" />
          <stop offset="100%" stopColor="#04141b" />
        </linearGradient>
        <linearGradient id="lw-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="55%" stopColor="#164e63" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
        <linearGradient id="lw-deck" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0e7490" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="lw-globe" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <filter id="lw-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1365" height="400" fill="url(#lw-sky)" />

      {/* dotted data lattice */}
      {Array.from({ length: 34 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 12} x2="1365" y2={i * 12} stroke="#22d3ee" strokeOpacity="0.035" strokeWidth="1" />
      ))}
      {Array.from({ length: 70 }, (_, i) => (
        <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="400" stroke="#22d3ee" strokeOpacity="0.025" strokeWidth="1" />
      ))}

      {/* global data dome */}
      <ellipse cx="682" cy="118" rx="330" ry="128" fill="url(#lw-globe)" />
      <ellipse cx="682" cy="118" rx="330" ry="128" fill="none" stroke="#22d3ee" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="1 7" />
      <ellipse cx="682" cy="118" rx="330" ry="128" fill="none" stroke="#22d3ee" strokeOpacity="0.12" strokeWidth="1" />
      {[0.35, 0.62, 0.84].map((k) => (
        <ellipse key={k} cx="682" cy="118" rx={330 * k} ry="128" fill="none" stroke="#22d3ee" strokeOpacity="0.18" strokeDasharray="2 8" />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const t = (i / 11) * Math.PI;
        return (
          <path
            key={i}
            d={`M ${682 - 330 * Math.cos(t)} 118 Q 682 ${118 - 128 * Math.sin(t) * 1.5} ${682 + 330 * Math.cos(t)} 118`}
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.16"
            strokeDasharray="1 7"
          />
        );
      })}

      {/* skyline */}
      <g opacity="0.9">
        <rect x="0" y="182" width="52" height="118" fill="#062b36" />
        <rect x="58" y="150" width="38" height="150" fill="#073340" />
        <rect x="102" y="206" width="64" height="94" fill="#062b36" />
        <rect x="172" y="168" width="42" height="132" fill="#073340" />
        <rect x="220" y="224" width="56" height="76" fill="#062b36" />
        {windows(10, 196, 3, 8)}
        {windows(66, 164, 2, 11)}
        {windows(110, 218, 4, 6)}
        {windows(180, 180, 2, 9)}
      </g>
      <g opacity="0.9">
        <rect x="1240" y="176" width="50" height="124" fill="#062b36" />
        <rect x="1296" y="146" width="40" height="154" fill="#073340" />
        <rect x="1340" y="210" width="25" height="90" fill="#062b36" />
        {windows(1250, 190, 3, 9)}
        {windows(1304, 158, 2, 11)}
      </g>

      {/* network arcs */}
      {nodes.slice(0, -1).map((node, i) => {
        const next = nodes[i + 1];
        const midX = (node.x + next.x) / 2;
        const lift = 48 + i * 7;
        return (
          <path
            key={i}
            d={`M ${node.x} ${node.y} Q ${midX} ${Math.min(node.y, next.y) - lift} ${next.x} ${next.y}`}
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.45"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />
        );
      })}
      {nodes.map((node, i) => (
        <g key={i}>
          <circle cx={node.x} cy={node.y} r="7" fill="#22d3ee" opacity="0.12" />
          <circle cx={node.x} cy={node.y} r="2.4" fill="#67e8f9" filter="url(#lw-glow)" />
        </g>
      ))}

      {/* bridge structure */}
      <path d="M 60 292 Q 330 168 600 292 Z" fill="#052832" stroke="#0e7490" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M 600 292 Q 860 168 1130 292 Z" fill="#052832" stroke="#0e7490" strokeOpacity="0.5" strokeWidth="2" />
      {[140, 210, 280, 350, 420, 490, 560].map((x) => (
        <line key={`a${x}`} x1={x} y1={292 - 74 * Math.sin(((x - 60) / 540) * Math.PI)} x2={x} y2="292" stroke="#22d3ee" strokeOpacity="0.18" />
      ))}
      {[660, 730, 800, 870, 940, 1010, 1080].map((x) => (
        <line key={`b${x}`} x1={x} y1={292 - 74 * Math.sin(((1130 - x) / 530) * Math.PI)} x2={x} y2="292" stroke="#22d3ee" strokeOpacity="0.18" />
      ))}
      <rect x="0" y="290" width="1365" height="9" fill="url(#lw-deck)" filter="url(#lw-glow)" />
      <rect x="0" y="299" width="1365" height="4" fill="#0e7490" opacity="0.55" />
      {Array.from({ length: 44 }, (_, i) => (
        <circle key={i} cx={24 + i * 31} cy="294" r="1.6" fill="#a5f3fc" opacity="0.8" filter="url(#lw-glow)" />
      ))}

      {/* devices */}
      {/* watch */}
      <g>
        <rect x="270" y="182" width="44" height="58" rx="14" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.7" />
        <rect x="276" y="190" width="32" height="40" rx="8" fill="url(#lw-screen)" />
        <path d="M 280 220 Q 292 202 304 220" fill="none" stroke="#67e8f9" strokeWidth="1.4" />
        <rect x="278" y="168" width="28" height="12" rx="5" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.4" />
        <rect x="278" y="242" width="28" height="12" rx="5" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.4" />
      </g>
      {/* laptop */}
      <g>
        <rect x="404" y="150" width="116" height="76" rx="6" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.8" />
        <rect x="411" y="157" width="102" height="62" rx="3" fill="url(#lw-screen)" />
        <path d="M 418 202 Q 442 168 462 190 T 506 172" fill="none" stroke="#67e8f9" strokeWidth="1.6" opacity="0.9" />
        <path d="M 386 228 L 538 228 L 528 236 L 396 236 Z" fill="#09303c" stroke="#0e7490" />
      </g>
      {/* desktop */}
      <g>
        <rect x="612" y="98" width="150" height="96" rx="8" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.85" />
        <rect x="620" y="106" width="134" height="80" rx="4" fill="url(#lw-screen)" />
        <path d="M 626 168 Q 662 116 692 150 T 750 128" fill="none" stroke="#67e8f9" strokeWidth="2" opacity="0.9" />
        <rect x="678" y="194" width="18" height="18" fill="#09303c" />
        <rect x="646" y="212" width="82" height="7" rx="3" fill="#0b3b49" stroke="#0e7490" />
      </g>
      {/* tablet */}
      <g>
        <rect x="846" y="146" width="94" height="70" rx="7" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.8" />
        <rect x="853" y="153" width="80" height="56" rx="3" fill="url(#lw-screen)" />
        <path d="M 858 196 Q 880 162 900 184 T 930 168" fill="none" stroke="#67e8f9" strokeWidth="1.5" opacity="0.9" />
      </g>
      {/* phone */}
      <g>
        <rect x="1018" y="184" width="48" height="84" rx="10" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.8" />
        <rect x="1024" y="192" width="36" height="66" rx="5" fill="url(#lw-screen)" />
        <path d="M 1030 244 Q 1042 214 1054 236" fill="none" stroke="#67e8f9" strokeWidth="1.3" />
        <circle cx="1042" cy="188" r="1.4" fill="#67e8f9" />
      </g>
      {/* speaker / hub */}
      <g>
        <rect x="1148" y="216" width="60" height="44" rx="16" fill="#0b3b49" stroke="#22d3ee" strokeOpacity="0.7" />
        <circle cx="1178" cy="238" r="10" fill="none" stroke="#67e8f9" strokeOpacity="0.8" />
        <circle cx="1178" cy="238" r="3" fill="#67e8f9" />
        <circle cx="1163" cy="238" r="1.4" fill="#67e8f9" opacity="0.7" />
        <circle cx="1193" cy="238" r="1.4" fill="#67e8f9" opacity="0.7" />
      </g>

      {/* device base glows */}
      {nodes.map((node, i) => (
        <ellipse key={`g${i}`} cx={node.x} cy="258" rx="34" ry="6" fill="#22d3ee" opacity="0.16" filter="url(#lw-glow)" />
      ))}

      {/* water reflection */}
      <rect x="0" y="304" width="1365" height="96" fill="#04141b" opacity="0.72" />
      {Array.from({ length: 28 }, (_, i) => (
        <rect
          key={i}
          x={(i * 97) % 1300}
          y={310 + i * 3}
          width={40 + ((i * 37) % 120)}
          height="1.4"
          rx="0.7"
          fill="#22d3ee"
          opacity={i % 3 === 0 ? 0.3 : 0.12}
        />
      ))}
      {nodes.map((node, i) => (
        <rect key={`r${i}`} x={node.x - 28} y={310 + (i % 4) * 9} width="56" height="2" rx="1" fill="#22d3ee" opacity="0.3" />
      ))}
    </svg>
  );
}
