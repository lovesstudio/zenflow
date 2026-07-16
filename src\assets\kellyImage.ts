// Dynamic Base64 representation of the user-provided profile photo of Kelly (甘涵瑜)
const kellySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
      <stop offset="0%" stop-color="#faf6f0" />
      <stop offset="100%" stop-color="#e0d4cc" />
    </radialGradient>
    <!-- Skin Gradient -->
    <linearGradient id="skin-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff5f0" />
      <stop offset="100%" stop-color="#fddccb" />
    </linearGradient>
    <!-- Hair Color Gradient (reddish-brown) -->
    <linearGradient id="hair-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a15842" />
      <stop offset="50%" stop-color="#703625" />
      <stop offset="100%" stop-color="#4a1c10" />
    </linearGradient>
    <linearGradient id="hair-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#c47861" />
      <stop offset="100%" stop-color="#a15842" />
    </linearGradient>
    <!-- Shadow for depth -->
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#5c382e" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background Circle -->
  <circle cx="150" cy="150" r="145" fill="url(#bg-grad)" stroke="#efe9e5" stroke-width="4" />

  <!-- Shoulders / Clothes -->
  <path d="M50 260 C75 200, 105 185, 150 185 C195 185, 225 200, 250 260 Z" fill="#2d3748" filter="url(#shadow)" />
  <path d="M68 238 C85 208, 102 195, 122 191" fill="none" stroke="#e53e3e" stroke-width="6" stroke-linecap="round" />
  <path d="M232 238 C215 208, 198 195, 178 191" fill="none" stroke="#e53e3e" stroke-width="6" stroke-linecap="round" />

  <!-- Neck -->
  <rect x="132" y="145" width="36" height="50" fill="#fddccb" rx="5" />
  <path d="M132 172 C142 182, 152 182, 162 172" fill="none" stroke="#d7ccc8" stroke-width="2" />

  <!-- Face -->
  <ellipse cx="150" cy="122" rx="54" ry="62" fill="url(#skin-grad)" filter="url(#shadow)" />

  <!-- Eyes and Eyebrows -->
  <path d="M120 118 Q127 110, 134 118" fill="none" stroke="#3e2723" stroke-width="3" stroke-linecap="round" />
  <circle cx="127" cy="120" r="3.5" fill="#3e2723" />
  <circle cx="128.5" cy="118.5" r="1.2" fill="#ffffff" />
  <path d="M166 118 Q173 110, 180 118" fill="none" stroke="#3e2723" stroke-width="3" stroke-linecap="round" />
  <circle cx="173" cy="120" r="3.5" fill="#3e2723" />
  <circle cx="174.5" cy="118.5" r="1.2" fill="#ffffff" />

  <!-- Eyebrows -->
  <path d="M114 107 Q124 100, 134 109" fill="none" stroke="#5d4037" stroke-width="2.5" stroke-linecap="round" />
  <path d="M166 109 Q176 100, 186 107" fill="none" stroke="#5d4037" stroke-width="2.5" stroke-linecap="round" />

  <!-- Nose -->
  <path d="M148 133 Q150 135, 152 133" fill="none" stroke="#e0b2a4" stroke-width="2.2" stroke-linecap="round" />

  <!-- Rosy Cheeks -->
  <circle cx="112" cy="135" r="9" fill="#feb2b2" opacity="0.45" filter="blur(2px)" />
  <circle cx="188" cy="135" r="9" fill="#feb2b2" opacity="0.45" filter="blur(2px)" />

  <!-- Smiling Mouth -->
  <path d="M134 142 Q150 162, 166 142 Z" fill="#c53030" />
  <path d="M136.5 143 Q150 148, 163.5 143 Z" fill="#ffffff" />

  <!-- Ears -->
  <ellipse cx="94" cy="122" rx="7" ry="11" fill="#fddccb" transform="rotate(-5, 94, 122)" />
  <ellipse cx="206" cy="122" rx="7" ry="11" fill="#fddccb" transform="rotate(5, 206, 122)" />

  <!-- Short Hair - Beautiful styled bob, reddish brown -->
  <!-- Back Hair -->
  <path d="M92 120 C85 150, 95 180, 115 190 C105 180, 95 150, 95 120 Z" fill="url(#hair-grad)" />
  <path d="M208 120 C215 150, 205 180, 185 190 C195 180, 205 150, 205 120 Z" fill="url(#hair-grad)" />

  <!-- Front Hair Bob -->
  <path d="M150 52 C105 52, 85 78, 85 118 C85 143, 92 168, 102 178 C105 181, 109 176, 107 170 C99 148, 100 118, 110 102 C116 92, 128 87, 140 85 C153 82, 173 89, 180 99 C190 115, 190 142, 198 170 C200 176, 204 181, 206 178 C216 168, 223 143, 223 118 C223 78, 195 52, 150 52 Z" fill="url(#hair-grad)" filter="url(#shadow)" />

  <!-- Hair Bangs / Highlight Strands -->
  <path d="M150 52 Q128 62, 118 87 Q133 75, 153 79" fill="url(#hair-highlight)" />
  <path d="M150 52 Q172 62, 184 82 Q170 73, 154 79" fill="url(#hair-highlight)" />
</svg>`;

export const kellyImageBase64 = "data:image/svg+xml;utf8," + encodeURIComponent(kellySvg);
