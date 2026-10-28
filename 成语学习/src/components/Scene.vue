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

    <template v-else-if="scene === 'scene-pond'">
      <rect width="800" height="1200" fill="#BDD9F2"/>
      <circle cx="660" cy="150" r="66" fill="#F5B841"/>
      <ellipse cx="180" cy="200" rx="96" ry="34" fill="#FFFFFF"/>
      <ellipse cx="290" cy="180" rx="66" ry="26" fill="#FFFFFF"/>
      <path d="M0 520 Q200 460 400 512 T800 500 V1200 H0 Z" fill="#6FA8DC"/>
      <path d="M0 860 Q220 800 460 852 T800 840 V1200 H0 Z" fill="#4A7FB5"/>
      <path d="M60 600 q60 -18 120 0" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.7"/>
      <path d="M600 580 q60 -18 120 0" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.55"/>
      <path d="M120 940 q80 -22 160 0" fill="none" stroke="#BDD9F2" stroke-width="7" opacity="0.6"/>
      <ellipse cx="210" cy="700" rx="164" ry="62" fill="#5E8C61"/>
      <ellipse cx="210" cy="688" rx="124" ry="42" fill="#7CA982"/>
      <path d="M210 688 L92 710 M210 688 L328 710 M210 688 L160 738 M210 688 L262 736" stroke="#5E8C61" stroke-width="5" fill="none"/>
      <path d="M470 660 q-6 -110 34 -170" fill="none" stroke="#5E8C61" stroke-width="10" stroke-linecap="round"/>
      <path d="M504 490 q46 -30 34 34 q-40 26 -34 -34 z" fill="#C8E6A0" stroke="#5E8C61" stroke-width="4"/>
      <path d="M510 474 L532 420 L540 478 Z" fill="#C8E6A0" stroke="#5E8C61" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="536" cy="384" rx="7" ry="30" fill="#E8604C" transform="rotate(24 536 384)"/>
      <circle cx="548" cy="360" r="9" fill="#E8604C"/>
      <circle cx="551" cy="357" r="2.6" fill="#3D3A36"/>
      <ellipse cx="510" cy="368" rx="40" ry="13" fill="#FFFFFF" opacity="0.75" transform="rotate(-22 510 368)"/>
      <ellipse cx="564" cy="396" rx="36" ry="12" fill="#FFFFFF" opacity="0.7" transform="rotate(16 564 396)"/>
      <path d="M532 414 q10 26 -6 44" fill="none" stroke="#E8604C" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="640" cy="1040" rx="176" ry="68" fill="#5E8C61"/>
      <ellipse cx="640" cy="1026" rx="134" ry="46" fill="#7CA982"/>
      <circle cx="120" cy="790" r="9" fill="#F5B8B8"/>
      <circle cx="330" cy="820" r="7" fill="#F5B8B8"/>
      <circle cx="620" cy="760" r="8" fill="#FFFFFF"/>
      <circle cx="700" cy="820" r="6" fill="#F5B8B8"/>
    </template>

    <template v-else-if="scene === 'scene-fishing'">
      <rect width="800" height="1200" fill="#BDD9F2"/>
      <g stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.75">
        <path d="M120 120 l-26 96"/><path d="M240 60 l-26 96"/><path d="M360 140 l-26 96"/>
        <path d="M480 70 l-26 96"/><path d="M600 150 l-26 96"/><path d="M720 80 l-26 96"/>
        <path d="M180 300 l-26 96"/><path d="M420 340 l-26 96"/><path d="M660 320 l-26 96"/>
        <path d="M80 480 l-26 96"/><path d="M300 520 l-26 96"/><path d="M540 500 l-26 96"/><path d="M760 520 l-26 96"/>
      </g>
      <path d="M60 300 q80 -34 160 0" fill="none" stroke="#FFFFFF" stroke-width="7" opacity="0.6"/>
      <path d="M500 240 q90 -36 180 0" fill="none" stroke="#FFFFFF" stroke-width="7" opacity="0.55"/>
      <path d="M0 560 Q160 380 340 540 T800 500 V760 H0 Z" fill="#7CA982"/>
      <path d="M420 620 Q600 420 800 600 V780 H420 Z" fill="#5E8C61"/>
      <g fill="none" stroke-linecap="round">
        <path d="M250 250 q22 -18 44 0 q22 -18 44 0" stroke="#3D3A36" stroke-width="11"/>
        <path d="M250 250 q22 -18 44 0 q22 -18 44 0" stroke="#FFFFFF" stroke-width="6"/>
        <path d="M356 196 q17 -14 34 0 q17 -14 34 0" stroke="#3D3A36" stroke-width="9"/>
        <path d="M356 196 q17 -14 34 0 q17 -14 34 0" stroke="#FFFFFF" stroke-width="5"/>
        <path d="M152 330 q15 -12 30 0 q15 -12 30 0" stroke="#3D3A36" stroke-width="8"/>
        <path d="M152 330 q15 -12 30 0 q15 -12 30 0" stroke="#FFFFFF" stroke-width="4.5"/>
      </g>
      <path d="M0 60 q120 60 200 160" fill="none" stroke="#A9744F" stroke-width="12" stroke-linecap="round"/>
      <path d="M96 116 q60 20 90 66" fill="none" stroke="#A9744F" stroke-width="8" stroke-linecap="round"/>
      <circle cx="60" cy="76" r="17" fill="#F5B8B8"/><circle cx="96" cy="116" r="20" fill="#F5B8B8"/>
      <circle cx="140" cy="140" r="15" fill="#F5B8B8"/><circle cx="130" cy="100" r="12" fill="#FFFFFF"/>
      <circle cx="170" cy="168" r="17" fill="#F5B8B8"/><circle cx="186" cy="184" r="11" fill="#FFFFFF"/>
      <path d="M0 620 Q200 570 400 616 T800 600 V1200 H0 Z" fill="#6FA8DC"/>
      <path d="M0 880 Q220 830 460 876 T800 860 V1200 H0 Z" fill="#4A7FB5"/>
      <path d="M80 700 q70 -18 140 0" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.6"/>
      <path d="M540 690 q70 -18 140 0" fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.55"/>
      <path d="M120 1010 q80 -20 160 0" fill="none" stroke="#BDD9F2" stroke-width="7" opacity="0.6"/>
      <path d="M240 800 Q400 870 560 800 L520 850 Q400 902 280 850 Z" fill="#A9744F" stroke="#3D3A36" stroke-width="5" stroke-linejoin="round"/>
      <rect x="196" y="816" width="386" height="16" rx="8" fill="#8B5A3C" stroke="#3D3A36" stroke-width="4"/>
      <path d="M360 796 q-8 -60 22 -78 q26 -16 44 8 l14 70 z" fill="#5E8C61" stroke="#3D3A36" stroke-width="5" stroke-linejoin="round"/>
      <path d="M352 796 q34 -22 76 0 l-6 22 q-32 14 -64 0 z" fill="#7CA982" stroke="#3D3A36" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="392" cy="700" r="22" fill="#F8D8B8" stroke="#3D3A36" stroke-width="5"/>
      <path d="M356 690 Q392 656 428 690 Z" fill="#4A7FB5" stroke="#3D3A36" stroke-width="5" stroke-linejoin="round"/>
      <ellipse cx="392" cy="692" rx="46" ry="10" fill="#4A7FB5" stroke="#3D3A36" stroke-width="5"/>
      <path d="M424 710 q40 26 34 86" fill="none" stroke="#3D3A36" stroke-width="3"/>
      <path d="M452 796 l14 20 l-20 6 z" fill="#F09A4A" stroke="#3D3A36" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="470" cy="1000" rx="62" ry="26" fill="#F09A4A" stroke="#3D3A36" stroke-width="5"/>
      <path d="M532 1000 L576 972 L576 1028 Z" fill="#E8604C" stroke="#3D3A36" stroke-width="5" stroke-linejoin="round"/>
      <path d="M452 980 q10 20 0 40 M480 978 q10 22 0 44" fill="none" stroke="#A9744F" stroke-width="5"/>
      <circle cx="436" cy="992" r="5" fill="#3D3A36"/>
      <circle cx="200" cy="1140" r="9" fill="#F5B8B8"/>
      <circle cx="640" cy="1150" r="8" fill="#FFFFFF"/>
    </template>

    <rect width="800" height="1200" fill="#FFF7E6" opacity="0.45"/>
  </svg>
</template>
