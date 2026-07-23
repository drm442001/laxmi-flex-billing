"use client";

import type { SVGProps } from "react";

// All SVG icons used in the app. Each matches the old emoji semantically.
// All icons use currentColor so they inherit the surrounding text color.

type P = SVGProps<SVGSVGElement> & { size?: number | string };
const base = (size: number, props: P) => ({
  width: props.size ?? size,
  height: props.size ?? size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: `inline-block align-[-0.15em] ${props.className || ""}`,
});

const Doc       = (p: P) => (<svg {...base(16,p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>);
const Clipboard = (p: P) => (<svg {...base(16,p)}><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6M9 18h6"/></svg>);
const Calc      = (p: P) => (<svg {...base(16,p)}><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><line x1="8" x2="8" y1="14" y2="18"/><line x1="12" x2="12" y1="14" y2="18"/><line x1="8" x2="16" y1="14" y2="14"/></svg>);
const Eye       = (p: P) => (<svg {...base(16,p)}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>);
const Save      = (p: P) => (<svg {...base(16,p)}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>);
const Printer   = (p: P) => (<svg {...base(16,p)}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>);
const Trash     = (p: P) => (<svg {...base(16,p)}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>);
const User      = (p: P) => (<svg {...base(16,p)}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const Users     = (p: P) => (<svg {...base(16,p)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const Plus      = (p: P) => (<svg {...base(16,p)}><path d="M12 5v14M5 12h14"/></svg>);
const Pencil    = (p: P) => (<svg {...base(14,p)}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>);
const Search    = (p: P) => (<svg {...base(16,p)}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>);
const Settings  = (p: P) => (<svg {...base(16,p)}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>);
const Logout    = (p: P) => (<svg {...base(16,p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>);
const Download  = (p: P) => (<svg {...base(16,p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>);
const Upload    = (p: P) => (<svg {...base(16,p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>);
const Check     = (p: P) => (<svg {...base(14,p)}><polyline points="20 6 9 17 4 12"/></svg>);
const X         = (p: P) => (<svg {...base(14,p)}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);
const Menu      = (p: P) => (<svg {...base(18,p)}><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>);
const Cash      = (p: P) => (<svg {...base(16,p)}><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>);
const Bank      = (p: P) => (<svg {...base(16,p)}><path d="m3 10 9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8"/><path d="M3 20h18"/><path d="M3 22h18"/></svg>);
const Money     = (p: P) => (<svg {...base(16,p)}><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>);
const Wallet    = (p: P) => (<svg {...base(16,p)}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/><circle cx="16" cy="14" r="1"/></svg>);
const Card      = (p: P) => (<svg {...base(16,p)}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>);
const Chart     = (p: P) => (<svg {...base(16,p)}><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-6"/></svg>);
const TrendUp   = (p: P) => (<svg {...base(16,p)}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>);
const TrendDown = (p: P) => (<svg {...base(16,p)}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>);
const Phone     = (p: P) => (<svg {...base(14,p)}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>);
const Mail      = (p: P) => (<svg {...base(14,p)}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>);
const MapPin    = (p: P) => (<svg {...base(14,p)}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>);
const Alert     = (p: P) => (<svg {...base(14,p)}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>);
const Bulb      = (p: P) => (<svg {...base(14,p)}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>);
const Sun       = (p: P) => (<svg {...base(16,p)}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>);
const Moon      = (p: P) => (<svg {...base(16,p)}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>);
const Package   = (p: P) => (<svg {...base(14,p)}><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>);
const Building  = (p: P) => (<svg {...base(15,p)}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>);
const Clock     = (p: P) => (<svg {...base(14,p)}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
const Shield    = (p: P) => (<svg {...base(14,p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
const Trophy    = (p: P) => (<svg {...base(14,p)}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>);
const Flame     = (p: P) => (<svg {...base(14,p)}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>);
const Crown     = (p: P) => (<svg {...base(14,p)}><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M4.3 16h15.4"/></svg>);
const Folder    = (p: P) => (<svg {...base(14,p)}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>);
const Book      = (p: P) => (<svg {...base(14,p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>);
const Notebook  = (p: P) => (<svg {...base(14,p)}><path d="M2 6h4M2 10h4M2 14h4M2 18h4"/><rect width="16" height="18" x="4" y="3" rx="2"/></svg>);
const Note      = (p: P) => (<svg {...base(14,p)}><path d="M14 2H6a2 2 0 0 0-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 0 0-2-2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>);
const Cart      = (p: P) => (<svg {...base(16,p)}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>);
const Rupee     = (p: P) => (<svg {...base(14,p)}><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a4 4 0 0 0 0-8"/><path d="M6 13h4"/></svg>);
// Fallbacks for less-used icons
const Lock      = (p: P) => (<svg {...base(16,p)}><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
const Hourglass = Clock;
const Calendar  = (p: P) => (<svg {...base(16,p)}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>);
const Stopwatch = Clock;
const Party     = (p: P) => (<svg {...base(16,p)}><path d="M5.8 11.3 2 22l10.7-3.8"/><path d="M13 13 19 5l-2 4 2 4-4-2Z"/><circle cx="7" cy="13" r="3"/></svg>);
const Tag       = (p: P) => (<svg {...base(14,p)}><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>);
const Info      = (p: P) => (<svg {...base(14,p)}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>);
const Star      = (p: P) => (<svg {...base(14,p)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>);
const Target    = (p: P) => (<svg {...base(14,p)}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>);
const Home      = (p: P) => (<svg {...base(16,p)}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const Door      = Logout;
const Mobile    = (p: P) => (<svg {...base(16,p)}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>);
const Gift      = (p: P) => (<svg {...base(14,p)}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>);
const Gem       = (p: P) => (<svg {...base(14,p)}><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>);
const Laptop    = (p: P) => (<svg {...base(16,p)}><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>);
const Camera    = (p: P) => (<svg {...base(14,p)}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>);
const Key       = (p: P) => (<svg {...base(14,p)}><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>);
const Compass   = (p: P) => (<svg {...base(14,p)}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>);
const Briefcase = (p: P) => (<svg {...base(14,p)}><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>);
const Receipt   = (p: P) => (<svg {...base(14,p)}><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>);
const Box       = Package;
const Scissors  = (p: P) => (<svg {...base(14,p)}><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>);
const Pin       = MapPin;
const Bookmark  = (p: P) => (<svg {...base(14,p)}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>);
const Bell      = (p: P) => (<svg {...base(14,p)}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>);
const BellOff   = (p: P) => (<svg {...base(14,p)}><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/></svg>);
const Chat      = (p: P) => (<svg {...base(14,p)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const Megaphone = (p: P) => (<svg {...base(14,p)}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>);
const Battery   = (p: P) => (<svg {...base(14,p)}><rect width="16" height="10" x="2" y="7" rx="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>);
const Plug      = (p: P) => (<svg {...base(14,p)}><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/></svg>);
const RupeeCircle = (p: P) => (<svg {...base(14,p)}><circle cx="12" cy="12" r="10"/><path d="M8 7h8M8 10h6a3 3 0 0 1 0 6H9l3 3"/><path d="M8 13h4"/></svg>);
const Scale     = (p: P) => (<svg {...base(14,p)}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>);
const Wrench    = (p: P) => (<svg {...base(14,p)}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const Hammer    = (p: P) => (<svg {...base(14,p)}><path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25a2.3 2.3 0 0 1-.49-2.33l.05-.16a3.09 3.09 0 0 0-.86-3.17l-.62-.62a3.09 3.09 0 0 0-3.17-.86l-.16.05a2.3 2.3 0 0 1-2.33-.49L10.83 1.6a1 1 0 0 0-1.4 0L6 5a1 1 0 0 0 0 1.4l6.77 6.78a1 1 0 0 0 1.4 0l3.47-3.47"/></svg>);
const Tool      = Wrench;
const Nut       = (p: P) => (<svg {...base(14,p)}><path d="M12 2v3M4.2 5l2 2.2M4.2 19l2-2.2M12 22v-3M19.8 5l-2 2.2M19.8 19l-2-2.2M2 12h3M19 12h3"/><circle cx="12" cy="12" r="4"/></svg>);
const Broom     = (p: P) => (<svg {...base(14,p)}><path d="m12 14 4-4 4.5 4.5a2.12 2.12 0 1 1-3 3L12 14Z"/><path d="m11 13 3.5-3.5a5.5 5.5 0 0 0-7.8-7.8l-.5.5a4.95 4.95 0 0 0 .4 7.4l2.6 2.6"/><path d="m16 17-2 2-6.5-6.5-2.6-2.6A4.95 4.95 0 0 0 2 10.8c.4 1.1 1.4 2.2 2.5 3.3l6.7 6.7"/></svg>);
const Inbox     = (p: P) => (<svg {...base(16,p)}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>);
const Outbox    = Upload;
const Ledger    = Notebook;
const Medal1    = (p: P) => (<svg {...base(14,p)}><path d="M7 3h10v5a5 5 0 0 1-10 0V3z"/><path d="M11 10v3"/><path d="M7 13h10"/><path d="M8 22h8"/><path d="M12 13v9"/></svg>);
const Medal2    = Medal1;
const Medal3    = Medal1;
const Scroll    = (p: P) => (<svg {...base(14,p)}><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/></svg>);
const ThumbUp   = (p: P) => (<svg {...base(14,p)}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4-8a2.27 2.27 0 0 1 4 1Z"/></svg>);
const Bolt      = (p: P) => (<svg {...base(14,p)}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const Barber    = (p: P) => (<svg {...base(14,p)}><path d="M6 2v20M18 2v20M9 6h3M12 6h3M9 12h3M12 12h3M9 18h3M12 18h3"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/></svg>);
const Telescope = (p: P) => (<svg {...base(14,p)}><path d="m10.065 12.51-4.2-2.708 1.25-4.065L14 10.4l1.03-1.03 3.5 3.5-1.03 1.03-4.665-2.613-2.77 1.225z"/><path d="m14 18.5 2.5-7M9.5 14l-1 7M5 18l1-4"/><path d="M12 14v5"/></svg>);
const Microscope= (p: P) => (<svg {...base(14,p)}><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M8 6h4"/><path d="M13 10V6a3 3 0 0 0-3-3H8"/></svg>);
const Pill      = (p: P) => (<svg {...base(14,p)}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>);
const Syringe   = (p: P) => (<svg {...base(14,p)}><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m14 4 6 6"/><path d="m5 19-3 3"/></svg>);
const Dna       = (p: P) => (<svg {...base(14,p)}><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/><path d="m7 18 2.5 2.5"/><path d="m3.5 14.5 5.5.5"/><path d="m20 9 .5.5"/><path d="m6.5 12.5 5.5.5"/></svg>);
const Thermo    = (p: P) => (<svg {...base(14,p)}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>);
const Toilet    = (p: P) => (<svg {...base(14,p)}><path d="M7 2h10M10 14v7M14 14v7M4 4h16"/><path d="M4 10h16a2 2 0 0 0 0-4H4a2 2 0 0 0 0 4Z"/><path d="M14 10h-1l-.5-6"/></svg>);
const Water     = (p: P) => (<svg {...base(14,p)}><path d="M12 2.69 5.64 9.05a9 9 0 1 0 12.73 0Z"/></svg>);
const Shower    = (p: P) => (<svg {...base(14,p)}><path d="m4 4 16 16"/><path d="M9 7 7 9"/><path d="M15 7h2"/><path d="M12 4v6"/><path d="M20 16a4 4 0 0 0-8 0"/><path d="M16 20a4 4 0 0 0 0-8"/><circle cx="7" cy="17" r="1"/><circle cx="11" cy="17" r="1"/></svg>);
const Bath      = (p: P) => (<svg {...base(14,p)}><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5H4"/><line x1="0" x2="24" y1="12" y2="12"/><line x1="6" x2="6" y1="20" y2="22"/><line x1="18" x2="18" y1="20" y2="22"/></svg>);
const Beads     = (p: P) => (<svg {...base(14,p)}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="12" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/></svg>);
const Undo      = (p: P) => (<svg {...base(14,p)}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>);

export const E: {
  Doc: typeof Doc; Clipboard: typeof Clipboard; Calc: typeof Calc; Eye: typeof Eye;
  Save: typeof Save; Printer: typeof Printer; Trash: typeof Trash; User: typeof User;
  Users: typeof Users; Plus: typeof Plus; Pencil: typeof Pencil; Search: typeof Search;
  Settings: typeof Settings; Logout: typeof Logout; Download: typeof Download;
  Upload: typeof Upload; Check: typeof Check; X: typeof X; Menu: typeof Menu;
  Cash: typeof Cash; Bank: typeof Bank; Money: typeof Money; Wallet: typeof Wallet;
  Card: typeof Card; Chart: typeof Chart; TrendUp: typeof TrendUp; TrendDown: typeof TrendDown;
  Phone: typeof Phone; Mail: typeof Mail; MapPin: typeof MapPin; Alert: typeof Alert;
  Bulb: typeof Bulb; Sun: typeof Sun; Moon: typeof Moon; Package: typeof Package;
  Building: typeof Building; Clock: typeof Clock; Shield: typeof Shield; Trophy: typeof Trophy;
  Flame: typeof Flame; Crown: typeof Crown; Folder: typeof Folder; Book: typeof Book;
  Notebook: typeof Notebook; Cart: typeof Cart; Rupee: typeof Rupee; Lock: typeof Lock;
  Hourglass: typeof Hourglass; Calendar: typeof Calendar; Stopwatch: typeof Stopwatch;
  Party: typeof Party; Tag: typeof Tag; Info: typeof Info; Star: typeof Star; Target: typeof Target;
  Home: typeof Home; Door: typeof Door; Mobile: typeof Mobile; Gift: typeof Gift; Gem: typeof Gem;
  Laptop: typeof Laptop; Camera: typeof Camera; Key: typeof Key; Compass: typeof Compass;
  Briefcase: typeof Briefcase; Receipt: typeof Receipt; Box: typeof Box; Scissors: typeof Scissors;
  Pin: typeof Pin; Bookmark: typeof Bookmark; Bell: typeof Bell; BellOff: typeof BellOff;
  Chat: typeof Chat; Megaphone: typeof Megaphone; Battery: typeof Battery; Plug: typeof Plug;
  RupeeCircle: typeof RupeeCircle; Scale: typeof Scale; Wrench: typeof Wrench; Hammer: typeof Hammer;
  Tool: typeof Tool; Nut: typeof Nut; Broom: typeof Broom; Inbox: typeof Inbox; Outbox: typeof Outbox;
  Ledger: typeof Ledger; Medal1: typeof Medal1; Medal2: typeof Medal2; Medal3: typeof Medal3;
  Scroll: typeof Scroll; ThumbUp: typeof ThumbUp; Bolt: typeof Bolt; Barber: typeof Barber;
  Telescope: typeof Telescope; Microscope: typeof Microscope; Pill: typeof Pill; Syringe: typeof Syringe;
  Dna: typeof Dna; Thermo: typeof Thermo; Toilet: typeof Toilet; Water: typeof Water;
  Shower: typeof Shower; Bath: typeof Bath; Beads: typeof Beads; Note: typeof Note;
  Undo: typeof Undo;
  Warn: typeof Alert; Books: typeof Book; Gear: typeof Settings;
} = {
  Doc, Clipboard, Calc, Eye, Save, Printer, Trash, User, Users, Plus, Pencil,
  Search, Settings, Logout, Download, Upload, Check, X, Menu, Cash, Bank, Money,
  Wallet, Card, Chart, TrendUp, TrendDown, Phone, Mail, MapPin, Alert, Bulb, Sun,
  Moon, Package, Building, Clock, Shield, Trophy, Flame, Crown, Folder, Book,
  Notebook, Cart, Rupee, Lock, Hourglass, Calendar, Stopwatch, Party, Tag, Info,
  Star, Target, Home, Door, Mobile, Gift, Gem, Laptop, Camera, Key, Compass,
  Briefcase, Receipt, Box, Scissors, Pin, Bookmark, Bell, BellOff, Chat, Megaphone,
  Battery, Plug, RupeeCircle, Scale, Wrench, Hammer, Tool, Nut, Broom, Inbox, Outbox,
  Ledger, Medal1, Medal2, Medal3, Scroll, ThumbUp, Bolt, Barber, Telescope,
  Microscope, Pill, Syringe, Dna, Thermo, Toilet, Water, Shower, Bath, Beads, Note,
  Undo,
  Warn: Alert, Books: Book, Gear: Settings,
};
