import type { SupabaseClient } from '@supabase/supabase-js';
import type { CurrentUser, Order, OrderStats, DraftOrder, StockNotification, CelestialState } from '@/types';
import { sanitizePlainName, validateName } from './security';
import { logWarn } from './logger';

const SCENERY_BY_STATE: Record<string, string> = {
  dawn: `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
           <path d="M0,42 Q80,18 170,30 T340,24 Q375,32 400,38 L400,100 L0,100 Z" fill="#2E1537" opacity="0.45" />
           <path d="M0,54 Q100,32 210,44 T400,42 L400,100 L0,100 Z" fill="#3D1C2E" opacity="0.75" />
           
           <polygon points="35,100 45,35 55,100" fill="#240D1D" />
           <polygon points="48,100 58,24 68,100" fill="#1C0916" />
           <polygon points="60,100 70,40 80,100" fill="#240D1D" />
           
           <polygon points="310,100 322,30 334,100" fill="#240D1D" />
           <polygon points="325,100 336,18 347,100" fill="#1C0916" />
           <polygon points="340,100 350,34 360,100" fill="#240D1D" />
           
           <path d="M0,64 Q120,48 250,58 T400,56 L400,100 L0,100 Z" fill="#180713" />
         </svg>`,

  morning: `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
              <path d="M0,45 Q75,18 150,30 T320,20 Q365,28 400,34 L400,100 L0,100 Z" fill="#2B6F96" opacity="0.35" />
              <path d="M0,58 Q110,36 220,48 T400,44 L400,100 L0,100 Z" fill="#1B4D24" opacity="0.75" />
              
              <polygon points="26,100 38,42 50,100" fill="#143F1F" />
              <polygon points="42,100 52,28 62,100" fill="#0E2F16" />
              <polygon points="54,100 66,46 78,100" fill="#143F1F" />
              
              <rect x="278" y="58" width="38" height="26" fill="#452A1D" rx="1.5" />
              <polygon points="270,58 297,34 324,58" fill="#78350F" />
              <rect x="310" y="36" width="5" height="12" fill="#3E2215" />
              <path d="M312,34 Q315,28 311,22 Q308,16 313,10" stroke="rgba(255,255,255,0.4)" stroke-width="1.8" fill="none" stroke-linecap="round" />
              <rect x="291" y="64" width="12" height="12" fill="#FEF08A" rx="1.5" />
              <line x1="297" y1="64" x2="297" y2="76" stroke="#452A1D" stroke-width="1" />
              <line x1="291" y1="70" x2="303" y2="70" stroke="#452A1D" stroke-width="1" />
              
              <path d="M250,80 L275,80 M254,74 L254,84 M262,74 L262,84 M270,74 L270,84" stroke="#452A1D" stroke-width="1.5" stroke-linecap="round" />

              <polygon points="334,100 346,36 358,100" fill="#143F1F" />
              <polygon points="348,100 358,22 368,100" fill="#0E2F16" />
              
              <path d="M0,66 Q130,50 260,60 T400,58 L400,100 L0,100 Z" fill="#0A2411" />
            </svg>`,

  noon: `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
           <path d="M0,44 Q80,22 170,34 T350,28 Q380,36 400,40 L400,100 L0,100 Z" fill="#22C55E" opacity="0.35" />
           <path d="M0,56 Q110,34 230,46 T400,44 L400,100 L0,100 Z" fill="#16A34A" opacity="0.75" />
           
           <path d="M195,50 Q175,66 210,80 T185,100" stroke="#67E8F9" stroke-width="8" fill="none" opacity="0.55" stroke-linecap="round" />
           
           <path d="M 28,100 Q 36,28 46,100" stroke="#15803D" stroke-width="4" fill="none" stroke-linecap="round" />
           <path d="M 42,100 Q 50,18 60,100" stroke="#166534" stroke-width="3.5" fill="none" stroke-linecap="round" />
           <circle cx="50" cy="28" r="5.5" fill="#FEF08A" />
           <circle cx="34" cy="46" r="4" fill="#F472B6" />
           <circle cx="58" cy="52" r="4.5" fill="#FACC15" />

           <path d="M 324,100 Q 332,30 342,100" stroke="#15803D" stroke-width="4" fill="none" stroke-linecap="round" />
           <circle cx="332" cy="36" r="5.5" fill="#FEF08A" />
           <path d="M 336,100 Q 344,22 354,100" stroke="#166534" stroke-width="3.5" fill="none" stroke-linecap="round" />
           <circle cx="344" cy="28" r="5" fill="#FEF08A" />
           <circle cx="356" cy="48" r="4" fill="#F472B6" />
           
           <path d="M0,64 Q120,48 240,58 T400,56 L400,100 L0,100 Z" fill="#14532D" />
         </svg>`,

  sunset: `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
             <path d="M0,40 Q90,16 180,28 T360,24 Q385,30 400,36 L400,100 L0,100 Z" fill="#5B1D42" opacity="0.45" />
             <path d="M0,52 Q100,30 210,42 T400,40 L400,100 L0,100 Z" fill="#65220C" opacity="0.75" />
             
             <polygon points="35,100 45,34 55,100" fill="#451406" />
             <polygon points="46,100 56,22 66,100" fill="#330E04" />
             
             <path d="M 320,100 Q 328,48 322,22" stroke="#2B0C03" stroke-width="4.5" fill="none" stroke-linecap="round" />
             <path d="M 322,22 Q 302,12 292,24" stroke="#2B0C03" stroke-width="3" fill="none" stroke-linecap="round" />
             <path d="M 322,22 Q 344,12 354,24" stroke="#2B0C03" stroke-width="3" fill="none" stroke-linecap="round" />
             <path d="M 322,22 Q 304,32 298,42" stroke="#2B0C03" stroke-width="2.6" fill="none" stroke-linecap="round" />
             <path d="M 322,22 Q 342,32 350,42" stroke="#2B0C03" stroke-width="2.6" fill="none" stroke-linecap="round" />
             <circle cx="322,22" r="4" fill="#F97316" />
             
             <path d="M0,64 Q120,48 250,58 T400,56 L400,100 L0,100 Z" fill="#240A03" />
           </svg>`,

  night: `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
            <path d="M0,42 Q80,18 170,30 T340,24 Q375,32 400,38 L400,100 L0,100 Z" fill="#0E1738" opacity="0.55" />
            <path d="M0,54 Q100,32 210,44 T400,42 L400,100 L0,100 Z" fill="#0B1522" opacity="0.8" />
            
            <polygon points="20,100 36,36 52,100" fill="#070D16" />
            <polygon points="40,100 54,22 68,100" fill="#04080F" />
            <polygon points="56,100 70,40 84,100" fill="#070D16" />
            
            <rect x="258" y="64" width="30" height="20" fill="#070D16" rx="1.5" />
            <polygon points="252,64 273,44 294,64" fill="#0A121F" />
            <rect x="268" y="68" width="9" height="9" fill="#FEF08A" rx="1" opacity="0.9" />

            <polygon points="310,100 326,32 342,100" fill="#070D16" />
            <polygon points="330,100 344,18 358,100" fill="#04080F" />
            <polygon points="348,100 362,38 376,100" fill="#070D16" />
            
            <path d="M0,66 Q120,50 240,60 T400,58 L400,100 L0,100 Z" fill="#03060B" />
          </svg>`,

  rain: `<svg viewBox="0 0 400 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;">
           <path d="M0,40 Q90,18 180,30 T360,26 Q385,32 400,38 L400,100 L0,100 Z" fill="#1F2937" opacity="0.5" />
           <path d="M0,52 Q100,30 220,42 T400,40 L400,100 L0,100 Z" fill="#18202C" opacity="0.8" />
           
           <path d="M 52,100 Q 58,58 64,30" stroke="#090E16" stroke-width="4.5" stroke-linecap="round" fill="none" />
           <polygon points="64,30 46,44 76,40" fill="#090E16" />
           <polygon points="61,40 40,56 78,52" fill="#090E16" />
           <polygon points="58,52 34,70 82,66" fill="#090E16" />
           
           <path d="M 334,100 Q 328,52 320,26" stroke="#090E16" stroke-width="4.5" stroke-linecap="round" fill="none" />
           <polygon points="320,26 304,38 334,35" fill="#090E16" />
           <polygon points="322,35 298,50 338,47" fill="#090E16" />
           <polygon points="326,47 292,66 344,62" fill="#090E16" />

           <g transform="translate(196, 26)">
             <path d="M 0,22 Q 18,6 36,22 Q 18,18 0,22 Z" fill="#060910" />
             <path d="M 18,6 L 18,32 Q 18,35 15,35" stroke="#060910" stroke-width="2" fill="none" stroke-linecap="round" />
             <circle cx="16" cy="25" r="3.6" fill="#060910" />
             <path d="M 11,28 L 22,28 L 24,45 L 9,45 Z" fill="#060910" />
             <path d="M 13,45 L 9,58 M 20,45 L 25,56" stroke="#060910" stroke-width="2.6" stroke-linecap="round" fill="none" />
           </g>

           <path d="M0,64 Q110,48 220,66 T400,58 L400,100 L0,100 Z" fill="#0B0F19" />
         </svg>`,
};

export function computeCelestialState(hour: number, isForceRain: boolean, cardWidth: number): CelestialState {
  const cardW = cardWidth || 320;
  const xMin = 18;
  const xMax = cardW - 62;
  const yMin = 20;
  const yMax = 110;
  const midX = (xMin + xMax) / 2;
  const factor = (yMax - yMin) / Math.pow(midX - xMin, 2);

  let state = 'noon';
  let posX = xMin;
  let posY = yMax;
  let celestial: CelestialState['celestial'] = 'sun';
  let birdsVisible = true;

  if (isForceRain) {
    state = 'rain';
    celestial = 'none';
    birdsVisible = false;
  } else if (hour >= 5 && hour < 19) {
    celestial = 'sun';
    birdsVisible = true;
    const dayProgress = (hour - 5) / 14;
    posX = xMax - dayProgress * (xMax - xMin);
    posY = yMin + factor * Math.pow(posX - midX, 2);
    if (hour >= 5 && hour < 7) state = 'dawn';
    else if (hour >= 7 && hour < 11) state = 'morning';
    else if (hour >= 11 && hour < 15) state = 'noon';
    else state = 'sunset';
  } else {
    celestial = 'moon';
    birdsVisible = false;
    let nightHour = hour - 19;
    if (nightHour < 0) nightHour += 24;
    const nightProgress = nightHour / 10;
    posX = xMax - nightProgress * (xMax - xMin);
    posY = yMin + factor * Math.pow(posX - midX, 2);
    state = 'night';
  }

  return {
    state,
    posX,
    posY,
    celestial,
    birdsVisible,
    sceneryHtml: SCENERY_BY_STATE[state] || '',
  };
}

const RAINY_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];

const DISTRICT_COORDS: Record<string, { lat: number; lon: number }> = {
  'ঢাকা': { lat: 23.811, lon: 90.412 }, 'ঢাকা সিটি': { lat: 23.811, lon: 90.412 },
  'চট্টগ্রাম': { lat: 22.356, lon: 91.784 }, 'চট্টগ্রাম সিটি': { lat: 22.356, lon: 91.784 },
  'সিলেট': { lat: 24.897, lon: 91.872 }, 'খুলনা': { lat: 22.845, lon: 89.540 },
  'রাজশাহী': { lat: 24.374, lon: 88.601 }, 'ময়মনসিংহ': { lat: 24.746, lon: 90.407 },
  'বরিশাল': { lat: 22.701, lon: 90.353 }, 'রংপুর': { lat: 25.745, lon: 89.275 },
  'কুমিল্লা': { lat: 23.461, lon: 91.188 }, 'নারায়ণগঞ্জ': { lat: 23.623, lon: 90.500 },
  'গাজীপুর': { lat: 24.002, lon: 90.412 }, 'টাঙ্গাইল': { lat: 24.252, lon: 89.917 },
  'ফরিদপুর': { lat: 23.599, lon: 89.842 }, 'মাদারীপুর': { lat: 23.164, lon: 90.200 },
  'যশোর': { lat: 23.167, lon: 89.217 }, 'বগুড়া': { lat: 24.851, lon: 89.371 },
  'নোয়াখালী': { lat: 22.869, lon: 91.100 }, 'কক্সবাজার': { lat: 21.453, lon: 92.010 },
  'পটুয়াখালী': { lat: 22.357, lon: 90.330 }, 'ঝিনাইদহ': { lat: 23.100, lon: 89.153 },
  'নেত্রকোনা': { lat: 24.876, lon: 90.724 }, 'কিশোরগঞ্জ': { lat: 24.444, lon: 90.778 },
  'মুন্সিগঞ্জ': { lat: 23.552, lon: 90.531 }, 'শরীয়তপুর': { lat: 23.199, lon: 90.373 },
  'ফেনী': { lat: 23.023, lon: 91.398 }, 'ব্রাহ্মণবাড়িয়া': { lat: 23.960, lon: 91.111 },
  'চাঁদপুর': { lat: 23.234, lon: 90.669 }, 'লক্ষ্মীপুর': { lat: 22.942, lon: 90.841 },
  'নীলফামারী': { lat: 25.931, lon: 88.856 }, 'ঠাকুরগাঁও': { lat: 26.032, lon: 88.459 },
  'পঞ্চগড়': { lat: 26.338, lon: 88.558 }, 'দিনাজপুর': { lat: 25.627, lon: 88.636 },
  'জয়পুরহাট': { lat: 25.097, lon: 89.037 }, 'নওগাঁ': { lat: 24.802, lon: 88.938 },
  'চাঁপাইনবাবগঞ্জ': { lat: 24.597, lon: 88.281 }, 'নাটোর': { lat: 24.420, lon: 88.989 },
  'পাবনা': { lat: 24.006, lon: 89.246 }, 'সিরাজগঞ্জ': { lat: 24.454, lon: 89.699 },
  'কুষ্টিয়া': { lat: 23.901, lon: 89.121 }, 'মেহেরপুর': { lat: 23.759, lon: 88.632 },
  'চুয়াডাঙ্গা': { lat: 23.648, lon: 88.841 }, 'মাগুরা': { lat: 23.487, lon: 89.419 },
  'নড়াইল': { lat: 23.172, lon: 89.500 }, 'বাগেরহাট': { lat: 22.660, lon: 89.785 },
  'সাতক্ষীরা': { lat: 22.718, lon: 89.071 }, 'পিরোজপুর': { lat: 22.579, lon: 89.972 },
  'ঝালকাঠি': { lat: 22.643, lon: 90.197 }, 'বরগুনা': { lat: 22.152, lon: 90.122 },
  'ভোলা': { lat: 22.688, lon: 90.651 }, 'সুনামগঞ্জ': { lat: 24.881, lon: 91.395 },
  'হবিগঞ্জ': { lat: 24.375, lon: 91.415 }, 'মৌলভীবাজার': { lat: 24.483, lon: 91.777 },
  'খাগড়াছড়ি': { lat: 23.119, lon: 91.984 }, 'রাঙামাটি': { lat: 22.732, lon: 92.294 },
  'বান্দরবান': { lat: 22.190, lon: 92.218 }, 'শেরপুর': { lat: 25.018, lon: 90.017 },
  'জামালপুর': { lat: 24.934, lon: 89.944 }, 'গোপালগঞ্জ': { lat: 23.004, lon: 89.826 },
  'রাজবাড়ী': { lat: 23.757, lon: 89.644 }, 'মানিকগঞ্জ': { lat: 23.864, lon: 90.006 },
  'নরসিংদী': { lat: 23.921, lon: 90.716 }, 'গাজীপুর সিটি': { lat: 24.002, lon: 90.412 },
};

async function getWeatherCode(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    const code = data.current_weather.weathercode;
    try {
      localStorage.setItem('vc_weather_cache', JSON.stringify({ code, lat, lon, ts: Date.now() }));
    } catch {
      // storage full/blocked
    }
    return code;
  } catch {
    return null;
  }
}

export async function fetchIsRaining(supabase: SupabaseClient, currentUser: CurrentUser | null): Promise<boolean> {
  try {
    const cached = localStorage.getItem('vc_weather_cache');
    if (cached) {
      try {
        const obj = JSON.parse(cached);
        if (obj.ts && Date.now() - obj.ts < 7200000) return RAINY_CODES.includes(obj.code);
      } catch {
        // corrupt cache entry
      }
    }
    let lat = 23.811;
    let lon = 90.412;
    try {
      let userDistrict: string | null = null;

      if (currentUser?.id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('district')
            .eq('id', currentUser.id)
            .maybeSingle();
          if (profile?.district) userDistrict = profile.district;
        } catch {
          // profiles fallback
        }
      }

      if (!userDistrict) {
        const orders = JSON.parse(localStorage.getItem('vc_orders') || '[]');
        if (orders.length) {
          const latest = orders[orders.length - 1];
          userDistrict = latest.district || latest.customer_district || latest.customer?.district || null;
        }
      }
      if (!userDistrict && currentUser?.id) {
        try {
          const { data } = await supabase
            .from('orders')
            .select('customer_district')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (data && data.length && data[0].customer_district) userDistrict = data[0].customer_district;
        } catch {
          // no orders table access
        }
      }
      if (userDistrict) {
        const dn = userDistrict.trim();
        if (DISTRICT_COORDS[dn]) {
          lat = DISTRICT_COORDS[dn].lat;
          lon = DISTRICT_COORDS[dn].lon;
        } else {
          const found = Object.keys(DISTRICT_COORDS).find((k) => dn.includes(k) || k.includes(dn));
          if (found) {
            lat = DISTRICT_COORDS[found].lat;
            lon = DISTRICT_COORDS[found].lon;
          }
        }
      }
    } catch {
      // district lookup failed
    }
    const code = await getWeatherCode(lat, lon);
    return code !== null && RAINY_CODES.includes(code);
  } catch {
    return false;
  }
}

export function formatLiveTimeDate(now: Date, lang: 'bn' | 'en' = 'bn'): string {
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours || 12;
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const monthStr = lang === 'en' ? monthsEn[now.getMonth()] : monthsBn[now.getMonth()];
  return `${hours}:${minutes} ${ampm} — ${now.getDate()} ${monthStr} ${now.getFullYear()}`;
}

export function getFirstName(fullName?: string | null, lang: 'bn' | 'en' = 'bn'): string {
  if (!fullName) return lang === 'en' ? 'User' : 'কাস্টমার';
  const clean = fullName.trim();
  if (!clean) return lang === 'en' ? 'User' : 'কাস্টমার';
  const parts = clean.split(/\s+/);
  return parts[0] || (lang === 'en' ? 'User' : 'কাস্টমার');
}

export function getGreeting(user: CurrentUser | null, now: Date, lang: 'bn' | 'en' = 'bn'): string {
  const firstName = getFirstName(user?.name, lang);
  const day = now.getDay(); // 0 = Sunday, 5 = Friday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeVal = hour + minute / 60;

  if (lang === 'en') {
    if (day === 5) {
      if (timeVal >= 5 && timeVal < 14) {
        return `Hi ${firstName}, Happy Friday & Jumma Mubarak 🕌`;
      }
      if (timeVal >= 14 && timeVal < 23) {
        return `Hi ${firstName}, Happy Friday & Weekend Vibes ✨`;
      }
    }

    if (timeVal >= 5 && timeVal < 8) {
      return `Hi ${firstName}, Good Morning, Breakfast Time ☕`;
    }
    if (timeVal >= 8 && timeVal < 12) {
      return `Hi ${firstName}, Good Morning, Productive Day Ahead ✨`;
    }
    if (timeVal >= 12 && timeVal < 14.5) {
      return `Hi ${firstName}, Good Afternoon, Lunch Time 🍱`;
    }
    if (timeVal >= 14.5 && timeVal < 17.5) {
      return `Hi ${firstName}, Good Afternoon, Tea Break Time 🍵`;
    }
    if (timeVal >= 17.5 && timeVal < 20) {
      return `Hi ${firstName}, Good Evening, Relax & Unwind 🌆`;
    }
    if (timeVal >= 20 && timeVal < 23) {
      return `Hi ${firstName}, Good Night, Dinner Time 🍽️`;
    }
    return `Hi ${firstName}, Late Night Owl, Rest Well 😴`;
  }

  // Bengali Greetings
  if (day === 5) {
    if (timeVal >= 5 && timeVal < 14) {
      return `জুম্মা মোবারক ও শুভ শুক্রবার, ${firstName} 🕌`;
    }
    if (timeVal >= 14 && timeVal < 23) {
      return `শুভ শুক্রবার ও ছুটির শুভেচ্ছা, ${firstName} ✨`;
    }
  }

  if (timeVal >= 5 && timeVal < 8) {
    return `শুভ সকাল, ${firstName} — নাস্তার সময় ☕`;
  }
  if (timeVal >= 8 && timeVal < 12) {
    return `শুভ সকাল, ${firstName} — সুন্দর একটি দিনের শুভেচ্ছা ✨`;
  }
  if (timeVal >= 12 && timeVal < 14.5) {
    return `শুভ দুপুর, ${firstName} — দুপুরের খাবারের সময় 🍱`;
  }
  if (timeVal >= 14.5 && timeVal < 17.5) {
    return `শুভ বিকাল, ${firstName} — চা বিরতির সময় 🍵`;
  }
  if (timeVal >= 17.5 && timeVal < 20) {
    return `শুভ সন্ধ্যা, ${firstName} — কিছুটা রিল্যাক্স করার সময় 🌆`;
  }
  if (timeVal >= 20 && timeVal < 23) {
    return `শুভ রাত্রি, ${firstName} — রাতের খাবারের সময় 🍽️`;
  }
  return `দেরি রাতের শুভেচ্ছা, ${firstName} — ভালো ঘুম দিন 😴`;
}

function mapOrderRow(o: Record<string, any>): Order {
  return {
    id: o.id,
    orderNum: o.order_num || o.orderNum || o.id,
    date: o.created_at || o.date,
    customer: o.customer || { name: o.customer_name || '', phone: o.customer_phone || '' },
    items: o.items || [],
    status: o.status || 'pending',
    total: o.total || 0,
    userId: o.user_id,
    custEmail: o.customer_email,
  };
}

export async function fetchMyOrders(supabase: SupabaseClient, currentUser: CurrentUser | null): Promise<Order[]> {
  if (!currentUser) return [];
  try {
    let q = supabase
      .from('orders')
      .select('id, order_num, created_at, customer_name, customer_phone, status, total, items, user_id, customer_email')
      .not('status', 'in', '(cancelled,rejected)')
      .order('created_at', { ascending: false });
    if (currentUser.id) q = q.eq('user_id', currentUser.id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(mapOrderRow);
  } catch (e) {
    logWarn('[Vangcur] fetchMyOrders ব্যর্থ হয়েছে:', e);
    try {
      const all: Order[] = JSON.parse(localStorage.getItem('vc_orders') || '[]');
      return all
        .filter((o) => o.userId === currentUser?.id || o.custEmail === currentUser?.email)
        .filter((o) => o.status !== 'cancelled' && o.status !== 'rejected');
    } catch {
      return [];
    }
  }
}

export function orderStats(orders: Order[]): OrderStats {
  const total = orders.length;
  const running = orders.filter((o) => ['pending', 'confirmed', 'shipped'].includes(o.status)).length;
  const completed = orders.filter((o) => o.status === 'delivered').length;
  return { total, running, completed };
}

export async function updateProfileName(supabase: SupabaseClient, currentUser: CurrentUser, newName: string): Promise<boolean> {
  const cleanName = sanitizePlainName(newName || '').trim();
  if (!validateName(cleanName)) {
    logWarn('[Vangcur] Invalid name rejected in updateProfileName:', newName);
    return false;
  }

  try {
    const { error } = await supabase.auth.updateUser({ data: { name: cleanName } });
    if (error) throw error;
  } catch (e) {
    logWarn('[Vangcur] auth.updateUser:', e);
  }
  try {
    await supabase.from('profiles').upsert({ id: currentUser.id, name: cleanName, updated_at: new Date().toISOString() });
  } catch {
    // profiles table fallback
  }
  return true;
}

export function getStockNotifications(): StockNotification[] {
  const items: StockNotification[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('vc_sn_')) {
        const d = JSON.parse(localStorage.getItem(k) || '{}');
        if (d.prodId) items.push({ ...d, key: k });
      }
    }
  } catch {
    // localStorage unavailable
  }
  return items;
}

export function removeStockNotification(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // storage unavailable
  }
}

export function clearAllStockNotifications(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('vc_sn_')) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage unavailable
  }
}

const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

function getLocalDraft(): DraftOrder | null {
  try {
    const raw = localStorage.getItem('vc_abandoned_draft');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchDrafts(supabase: SupabaseClient, currentUser: CurrentUser | null): Promise<DraftOrder[]> {
  let drafts: DraftOrder[] = [];
  if (currentUser) {
    try {
      const { data, error } = await supabase
        .from('abandoned_checkouts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (!error && data && data.length) {
        drafts = data.map((row: Record<string, any>) => ({
          id: row.draft_id || `dr_sb_${row.id}`,
          _sbId: row.id,
          name: row.customer_name,
          phone: row.customer_phone,
          dist: row.customer_district,
          addr: row.customer_address,
          email: row.customer_email,
          items: row.items,
          ship: row.shipping,
          createdAt: new Date(row.created_at).getTime(),
        }));
      }
    } catch {
      // abandoned_checkouts fallback
    }
  }
  if (!drafts.length) {
    const local = getLocalDraft();
    if (local) drafts = [local];
  }
  return drafts.filter((d) => Date.now() - d.createdAt <= FIFTEEN_DAYS);
}

export async function deleteDraft(supabase: SupabaseClient, currentUser: CurrentUser | null, draftId: string, sbId?: number): Promise<void> {
  const local = getLocalDraft();
  if (local && local.id === draftId) {
    try {
      localStorage.removeItem('vc_abandoned_draft');
    } catch {
      // storage unavailable
    }
  }
  if (currentUser?.id) {
    try {
      if (sbId) {
        await supabase.from('abandoned_checkouts').delete().eq('id', sbId).eq('user_id', currentUser.id);
      } else {
        await supabase.from('abandoned_checkouts').delete().eq('draft_id', draftId).eq('user_id', currentUser.id);
      }
    } catch {
      // delete failed
    }
  }
}

export async function deleteAllDrafts(supabase: SupabaseClient, currentUser: CurrentUser | null): Promise<void> {
  try {
    localStorage.removeItem('vc_abandoned_draft');
  } catch {
    // storage unavailable
  }
  if (currentUser?.id) {
    try {
      await supabase.from('abandoned_checkouts').delete().eq('user_id', currentUser.id);
    } catch {
      // delete failed
    }
  }
}
