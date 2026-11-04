import styles from "./Results.module.css";

export default function ElectionNightIllustration() {
  const ink = "#17252a";
  const skin = "#edb889";
  const shadow = "#ce9069";
  return (
    <figure className={styles.illustration}>
      <svg viewBox="28 0 328 289" className={styles.referee} aria-hidden="true" focusable="false">
        <defs>
          <pattern id="ref-halftone" width="5.5" height="5.5" patternUnits="userSpaceOnUse">
            <circle cx="2.75" cy="2.75" r="1" fill={ink} opacity=".28" />
          </pattern>
          <clipPath id="ref-sun"><ellipse cx="194" cy="161" rx="120" ry="110" /></clipPath>
          <path id="ref-jersey" d="M154 178 Q150 185 140 187 L119 169 94 188 Q106 221 126 229 L123 269 Q172 286 204 282 Q235 281 261 268 L258 229 Q282 218 290 188 L265 169 244 187 Q232 185 229 179 L209 171 177 171Z" />
          <clipPath id="ref-stripes"><use href="#ref-jersey" /></clipPath>
          <g id="ref-arm" stroke={ink} strokeWidth="3.3" strokeLinejoin="round" strokeLinecap="round">
            <path fill={skin} d="M103 190 Q83 159 74 122 Q71 108 83 98 Q115 75 151 65 L218 37 Q225 34 228 27 L235 16 Q237 13 240 14 Q243 16 241 20 L238 26 258 9 Q262 6 265 9 Q267 12 263 16 L251 27 267 15 Q271 12 273 16 Q275 19 271 22 L256 34 271 25 Q275 23 277 26 Q278 29 274 32 L260 42 272 36 Q276 34 277 38 Q277 41 272 44 L252 57 Q242 63 233 62 L165 99 Q139 113 116 119 Q125 143 133 168 L127 186Z" />
            <path fill={shadow} stroke="none" d="M80 121 Q94 126 117 116 Q137 107 163 93 L232 58 Q244 60 258 49 L274 39 252 55 Q242 61 232 60 L163 98 Q135 113 114 118 Q126 151 132 171 L116 178 Q105 166 100 150 Q94 133 80 121Z" />
            <g fill="none" strokeWidth="1.8">
              <path d="M89 110 Q100 107 108 108 M110 127 Q116 134 118 143 M151 77 Q164 71 173 69 M225 48 Q231 42 237 41 M243 34 250 28" />
              <path d="m100 141 3 5 m0-9 3 5" opacity=".55" />
            </g>
          </g>
        </defs>

        {/* A two-ink sun and a few motion marks leave the paper visible around the drawing. */}
        <ellipse cx="194" cy="161" rx="120" ry="110" fill="var(--yellow)" />
        <path clipPath="url(#ref-sun)" fill="url(#ref-halftone)" d="M42 215 Q190 185 316 63 L344 296H42Z" />
        <g stroke={ink} fill="none" strokeLinecap="round" strokeWidth="2.5">
          <path d="m54 111 12 6 m-17 5 13 2 m257-35 10-11 m-6 20 13-5" />
          <path d="m107 49-8-11 m16 7-3-10" stroke="#a7790a" />
        </g>
        <use href="#ref-arm" />
        <use href="#ref-arm" transform="translate(384 0) scale(-1 1)" />

        {/* Stripes follow the shoulders, then straighten down the jersey. */}
        <use href="#ref-jersey" fill="#faf8e9" stroke={ink} strokeWidth="4" strokeLinejoin="round" />
        <g clipPath="url(#ref-stripes)" fill={ink}>
          <path d="m90 175 10-10 46 48-10 13z m17-9 9-8 43 44-9 12z m31 19 13 3-5 97-17-4z m30-5 12 2 1 108-14-3z m36 0 12-1 11 107-15 4z m31 4 12-3 18 94-16 6z m17 19 39-44 10 8-41 49z m14 13 40-41 10 8-41 45z" />
          <path d="M95 185 119 165 124 170 98 192z m165-16 6-6 29 22-4 8z" />
        </g>
        <path d="M172 161 173 178 190 195 211 176 209 157Z" fill={skin} stroke={ink} strokeWidth="3" />
        <path d="m172 173 18 15 20-17-4-10-30 2z" fill={shadow} />
        <path d="m172 175 18 17-9 10-19-22z m38-2-20 19 9 9 22-22z" fill="#c4d0cd" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />

        {/* Head, cap and expression. */}
        <g stroke={ink} strokeLinejoin="round" strokeLinecap="round">
          <path d="M158 126 Q151 121 150 129 Q149 140 157 144 L163 145 M223 124 Q232 117 233 127 Q235 137 224 143 L219 142" fill={skin} strokeWidth="3" />
          <path d="M157 114 Q159 94 183 91 Q216 85 226 107 L222 144 Q221 155 207 167 Q200 174 189 173 Q178 173 168 163 Q160 155 158 144Z" fill={skin} strokeWidth="3.5" />
          <path d="M158 116 Q172 125 201 117 Q212 115 222 108 L222 123 Q216 129 213 143 Q212 159 197 170 Q209 168 218 156 Q223 149 224 133L226 108Z" fill={shadow} stroke="none" />
          <path fill={ink} strokeWidth="2" d="M158 116 165 119 165 131 160 134z m64-9-8 10 3 13 6-5z" />
          <path d="M156 111 Q153 87 169 77 Q181 69 199 72 Q216 75 222 93 L224 104 Q200 118 158 119Z" fill={ink} strokeWidth="3" />
          <path d="M169 81 Q161 94 166 108 M195 77 Q202 84 203 96" stroke="#607075" strokeWidth="2" fill="none" />
          <path d="M155 111 Q183 108 208 99 Q220 95 233 98 Q242 100 233 106 Q218 115 202 117 Q175 122 155 117Z" fill="#344548" strokeWidth="3" />
          <path d="M164 115 Q200 114 224 104" fill="none" stroke="#e9ce4b" strokeWidth="1.6" />
          <path d="m169 130 10-2 m19-1 10-3" fill="none" strokeWidth="3.4" />
          <path d="M169 135q5-3 11-1 m17-1q5-4 12-2" fill="none" strokeWidth="1.9" />
          <path d="M175 134v3 m28-5v3" strokeWidth="3.5" />
          <path d="m190 133-3 11q3 3 8 0 m-17 10q11-4 24-3 m-16 8q5 2 10-1" fill="none" strokeWidth="2" />
          <path d="m166 148 4 2 m37-5 4-3 m-34 18 2 2 m2-1 2 2" fill="none" strokeWidth="1.3" stroke="#845d48" />
        </g>
        <text x="184" y="101" textAnchor="middle" transform="rotate(-9 184 98)" fill="#ffe137" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" letterSpacing="1">EMS</text>

        {/* A whistle and breast pocket finish the uniform at small sizes. */}
        <path d="M167 183 Q172 211 190 227 Q207 208 215 183" stroke="#c4d0cd" strokeWidth="5" fill="none" />
        <path d="M167 183 Q172 211 190 227 Q207 208 215 183" stroke={ink} strokeWidth="2" fill="none" />
        <path d="M188 225q4-4 8 1l11-2 1 5-8 3q0 7-7 8-7 1-9-5-1-6 4-10z" fill="#f6d64b" stroke={ink} strokeWidth="2.4" />
        <circle cx="191.5" cy="232.5" r="2.8" fill="none" stroke={ink} strokeWidth="1.4" />
        <path d="m229 223 16-2 1 12-7 5-9-3z" fill="#c3d3d5" stroke={ink} strokeWidth="2" />
        <path d="m233 226 8-1" stroke={ink} strokeWidth="1.6" />
      </svg>
      <figcaption className={styles.artCaption}>
        <span className={styles.artDate}>Election night <b>·</b> Nov. 3, 2026</span>
        <span className={styles.artWords}>Too close <em>to call</em></span>
      </figcaption>
    </figure>
  );
}
