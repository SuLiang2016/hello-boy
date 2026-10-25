<script setup>
// 首页场景件：整屏插画，卡片浮在上面
defineProps({
  scene: { type: String, default: '' },
})
</script>

<template>
  <svg v-if="scene" viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <template v-if="scene === 'scene-starry'">
      <rect width="800" height="1200" fill="#4A7FB5"/>
      <circle cx="640" cy="180" r="74" fill="#FFF7E6"/>
      <circle cx="612" cy="158" r="16" fill="#F5B841"/>
      <circle cx="150" cy="130" r="5" fill="#FFFFFF"/>
      <circle cx="260" cy="210" r="4" fill="#F5B841"/>
      <circle cx="410" cy="90" r="6" fill="#FFFFFF"/>
      <circle cx="540" cy="270" r="4" fill="#FFFFFF"/>
      <circle cx="720" cy="350" r="5" fill="#F5B841"/>
      <circle cx="90" cy="330" r="4" fill="#FFFFFF"/>
      <circle cx="330" cy="360" r="3" fill="#FFFFFF"/>
      <circle cx="470" cy="470" r="4" fill="#F5B841"/>
      <circle cx="700" cy="540" r="3" fill="#FFFFFF"/>
      <path d="M0 760 Q140 660 300 740 T620 720 T800 770 V1200 H0 Z" fill="#5E8C61"/>
      <path d="M0 880 Q180 800 380 870 T800 860 V1200 H0 Z" fill="#3D3A36"/>
      <circle cx="180" cy="1010" r="54" fill="#F5B841"/>
      <path d="M250 1080 L270 920 L290 1080 Z" fill="#5E8C61"/>
      <path d="M560 1050 L590 900 L620 1050 Z" fill="#7CA982"/>
    </template>

    <template v-else-if="scene === 'scene-meadow'">
      <rect width="800" height="1200" fill="#BDD9F2"/>
      <circle cx="650" cy="170" r="70" fill="#F5B841"/>
      <ellipse cx="210" cy="230" rx="90" ry="38" fill="#FFFFFF"/>
      <ellipse cx="320" cy="210" rx="70" ry="30" fill="#FFFFFF"/>
      <ellipse cx="590" cy="360" rx="80" ry="30" fill="#FFFFFF"/>
      <path d="M0 720 Q180 600 380 700 T800 680 V1200 H0 Z" fill="#C8E6A0"/>
      <path d="M0 880 Q220 760 440 850 T800 830 V1200 H0 Z" fill="#7CA982"/>
      <path d="M0 1040 Q260 960 520 1030 T800 1010 V1200 H0 Z" fill="#5E8C61"/>
      <rect x="120" y="820" width="26" height="150" rx="10" fill="#A9744F"/>
      <circle cx="133" cy="790" r="76" fill="#7CA982"/>
      <circle cx="86" cy="820" r="44" fill="#5E8C61"/>
      <circle cx="180" cy="820" r="44" fill="#5E8C61"/>
      <circle cx="500" cy="1080" r="12" fill="#E8604C"/>
      <circle cx="540" cy="1120" r="10" fill="#F5B841"/>
      <circle cx="580" cy="1070" r="11" fill="#FFFFFF"/>
      <circle cx="640" cy="1120" r="10" fill="#F5B8B8"/>
      <circle cx="690" cy="1060" r="12" fill="#F09A4A"/>
    </template>

    <template v-else-if="scene === 'scene-undersea'">
      <rect width="800" height="1200" fill="#6FA8DC"/>
      <path d="M0 240 Q200 160 400 240 T800 220 V1200 H0 Z" fill="#4A7FB5"/>
      <path d="M0 620 Q180 540 380 610 T800 590 V1200 H0 Z" fill="#4A7FB5"/>
      <path d="M0 1000 Q220 920 460 990 T800 970 V1200 H0 Z" fill="#BDD9F2"/>
      <path d="M80 1200 Q60 900 110 800 Q150 900 130 1200 Z" fill="#5E8C61"/>
      <path d="M140 1200 Q170 940 220 860 Q240 980 200 1200 Z" fill="#7CA982"/>
      <path d="M660 1200 Q640 920 690 830 Q730 940 710 1200 Z" fill="#5E8C61"/>
      <ellipse cx="380" cy="540" rx="66" ry="34" fill="#F09A4A"/>
      <path d="M314 540 L270 500 L270 580 Z" fill="#F5B841"/>
      <circle cx="402" cy="530" r="5" fill="#3D3A36"/>
      <ellipse cx="580" cy="840" rx="50" ry="26" fill="#F5B841"/>
      <path d="M630 840 L668 810 L668 870 Z" fill="#E8604C"/>
      <circle cx="566" cy="832" r="4" fill="#3D3A36"/>
      <circle cx="220" cy="430" r="10" fill="#FFFFFF"/>
      <circle cx="260" cy="360" r="7" fill="#FFFFFF"/>
      <circle cx="180" cy="300" r="5" fill="#FFFFFF"/>
      <circle cx="640" cy="360" r="8" fill="#FFFFFF"/>
      <circle cx="590" cy="300" r="5" fill="#FFFFFF"/>
    </template>

    <template v-else-if="scene === 'scene-forest'">
      <rect width="800" height="1200" fill="#C8E6A0"/>
      <circle cx="140" cy="150" r="62" fill="#F5B841"/>
      <path d="M0 780 Q180 680 360 760 T800 740 V1200 H0 Z" fill="#7CA982"/>
      <path d="M0 980 Q220 900 460 970 T800 950 V1200 H0 Z" fill="#5E8C61"/>
      <rect x="150" y="760" width="30" height="220" rx="12" fill="#A9744F"/>
      <path d="M165 400 L60 760 H270 Z" fill="#5E8C61"/>
      <path d="M165 540 L80 760 H250 Z" fill="#7CA982"/>
      <rect x="590" y="820" width="26" height="180" rx="10" fill="#8B5A3C"/>
      <path d="M603 500 L500 820 H706 Z" fill="#5E8C61"/>
      <path d="M603 630 L520 820 H686 Z" fill="#7CA982"/>
      <ellipse cx="400" cy="1090" rx="90" ry="26" fill="#3D3A36" opacity="0.15"/>
      <rect x="384" y="1010" width="20" height="62" rx="8" fill="#FFF7E6"/>
      <path d="M356 1020 Q394 960 432 1020 Z" fill="#E8604C"/>
      <circle cx="374" cy="1004" r="7" fill="#FFFFFF"/>
      <circle cx="410" cy="990" r="5" fill="#FFFFFF"/>
      <circle cx="300" cy="1100" r="9" fill="#F5B8B8"/>
      <circle cx="500" cy="1120" r="8" fill="#F5B841"/>
    </template>

    <template v-else-if="scene === 'scene-castle'">
      <rect width="800" height="1200" fill="#BDD9F2"/>
      <circle cx="670" cy="170" r="72" fill="#F5B841"/>
      <ellipse cx="170" cy="210" rx="102" ry="38" fill="#FFFFFF"/>
      <ellipse cx="282" cy="190" rx="72" ry="30" fill="#FFFFFF"/>
      <ellipse cx="610" cy="350" rx="82" ry="30" fill="#FFFFFF"/>
      <path d="M80 640 Q400 230 720 640" fill="none" stroke="#E8604C" stroke-width="26"/>
      <path d="M122 640 Q400 300 678 640" fill="none" stroke="#F5B841" stroke-width="26"/>
      <path d="M164 640 Q400 366 636 640" fill="none" stroke="#C8E6A0" stroke-width="26"/>
      <path d="M206 640 Q400 430 594 640" fill="none" stroke="#6FA8DC" stroke-width="26"/>
      <path d="M248 640 Q400 492 552 640" fill="none" stroke="#A67AB5" stroke-width="26"/>
      <path d="M0 760 Q200 700 400 750 T800 740 V1200 H0 Z" fill="#C8E6A0"/>
      <path d="M0 940 Q220 870 440 930 T800 920 V1200 H0 Z" fill="#7CA982"/>
      <rect x="336" y="660" width="128" height="260" fill="#FFF7E6" stroke="#3D3A36" stroke-width="4"/>
      <path d="M336 660 L400 574 L464 660 Z" fill="#E8604C" stroke="#3D3A36" stroke-width="4"/>
      <rect x="382" y="740" width="36" height="66" rx="18" fill="#6FA8DC" stroke="#3D3A36" stroke-width="4"/>
      <rect x="352" y="700" width="30" height="42" rx="6" fill="#BDD9F2" stroke="#3D3A36" stroke-width="3"/>
      <rect x="418" y="700" width="30" height="42" rx="6" fill="#BDD9F2" stroke="#3D3A36" stroke-width="3"/>
      <rect x="250" y="730" width="80" height="190" fill="#FFF7E6" stroke="#3D3A36" stroke-width="4"/>
      <path d="M250 730 L290 664 L330 730 Z" fill="#F09A4A" stroke="#3D3A36" stroke-width="4"/>
      <rect x="470" y="730" width="80" height="190" fill="#FFF7E6" stroke="#3D3A36" stroke-width="4"/>
      <path d="M470 730 L510 664 L550 730 Z" fill="#F09A4A" stroke="#3D3A36" stroke-width="4"/>
      <rect x="278" y="780" width="24" height="38" rx="10" fill="#BDD9F2" stroke="#3D3A36" stroke-width="3"/>
      <rect x="498" y="780" width="24" height="38" rx="10" fill="#BDD9F2" stroke="#3D3A36" stroke-width="3"/>
      <path d="M400 574 L400 526" stroke="#3D3A36" stroke-width="4"/>
      <path d="M400 526 L446 538 L400 552 Z" fill="#E8604C"/>
      <path d="M290 664 L290 620" stroke="#3D3A36" stroke-width="4"/>
      <path d="M290 620 L330 630 L290 642 Z" fill="#6FA8DC"/>
      <path d="M510 664 L510 620" stroke="#3D3A36" stroke-width="4"/>
      <path d="M510 620 L550 630 L510 642 Z" fill="#6FA8DC"/>
      <path d="M368 920 Q400 860 432 920 L432 1000 L368 1000 Z" fill="#A9744F"/>
      <circle cx="200" cy="860" r="46" fill="#5E8C61"/>
      <circle cx="150" cy="890" r="30" fill="#7CA982"/>
      <circle cx="590" cy="850" r="40" fill="#5E8C61"/>
      <circle cx="640" cy="880" r="28" fill="#7CA982"/>
      <circle cx="120" cy="1030" r="11" fill="#F5B8B8"/>
      <circle cx="170" cy="1070" r="9" fill="#F5B841"/>
      <circle cx="660" cy="1040" r="10" fill="#E8604C"/>
      <circle cx="710" cy="1080" r="8" fill="#FFFFFF"/>
    </template>

    <rect width="800" height="1200" fill="#FFF7E6" opacity="0.45"/>
  </svg>
</template>
