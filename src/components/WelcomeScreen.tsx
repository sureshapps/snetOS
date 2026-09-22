import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Fingerprint, Flashlight, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import startupSound from "@/assets/startup-sound.wav";

interface WelcomeScreenProps {
  onComplete: () => void;
}

interface WelcomeConfig {
  enabled: boolean;
  text: string;
  subtext: string;
  duration: number;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  mainTextFont: string;
  subtextFont: string;
  mainTextSize: number;
  subtextSize: number;
  mainTextColor: string;
  subtextColor: string;
  textShadow: boolean;
  textShadowColor: string;
  textShadowBlur: number;
  backgroundImage?: string;
  useBackgroundImage?: boolean;
  showQuickActions?: boolean;
  // Lock screen fonts
  quoteFont?: string;
  // Simple clock: one font, plain colors, no glow
  clockFont?: string;
  clockTimeColor?: string;
  clockSecondsColor?: string;
  clockAmPmColor?: string;
  clockDateColor?: string;
  clockDateAccentColor?: string;
  // Fingerprint unlock colors
  fingerprintIdleColor?: string;
  fingerprintScanColorFrom?: string;
  fingerprintScanColorMid?: string;
  fingerprintScanColorTo?: string;
  // Daily quote
  showQuote?: boolean;
  quoteApiUrl?: string;
}

const FONT_MAP: Record<string, string> = {
  barkentina: "'Barkentina', sans-serif",
  vintage: "'Vintage Goods', sans-serif",
  sackers: "'Sackers Gothic', sans-serif",
  trajan: "'Trajan Pro', serif",
  playfair: "'Playfair Display', serif",
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  roboto: "'Roboto', sans-serif",
  oswald: "'Oswald', sans-serif",
  dancing: "'Dancing Script', cursive",
  pacifico: "'Pacifico', cursive",
  lobster: "'Lobster', cursive",
  greatvibes: "'Great Vibes', cursive",
  satisfy: "'Satisfy', cursive",
  sacramento: "'Sacramento', cursive",
  allura: "'Allura', cursive",
  comfortaa: "'Comfortaa', cursive",
  righteous: "'Righteous', sans-serif",
  orbitron: "'Orbitron', sans-serif",
  cinzel: "'Cinzel', serif",
  cormorant: "'Cormorant Garamond', serif",
  fredoka: "'Fredoka', sans-serif",
  baloo2: "'Baloo 2', sans-serif",
  quicksand: "'Quicksand', sans-serif",
  nunito: "'Nunito', sans-serif",
};

interface DailyQuote {
  text: string;
  author: string;
}

// Used when no Quote API is configured, or the configured one fails —
// cycles by day-of-year so it still "changes daily automatically".
const FALLBACK_QUOTES: DailyQuote[] = [
  { text: "The happiness of your life depends on the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "What we think, we become.", author: "Buddha" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Do the best you can until you know better. Then do better.", author: "Maya Angelou" },
];

const QUOTE_CACHE_KEY = "lockscreen_daily_quote";

const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const fetchDailyQuote = async (apiUrl?: string): Promise<DailyQuote> => {
  const todayKey = new Date().toDateString();

  // Return the cached quote for today if we already picked one
  try {
    const cachedRaw = localStorage.getItem(QUOTE_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached.date === todayKey && cached.quote?.text) {
        return cached.quote as DailyQuote;
      }
    }
  } catch {
    // ignore malformed cache
  }

  let quote: DailyQuote | null = null;

  if (apiUrl) {
    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        const item = Array.isArray(data) ? data[0] : data;
        const text = item?.content || item?.quote || item?.text || item?.q || "";
        const author = item?.author || item?.a || item?.by || "Unknown";
        if (text) {
          quote = { text, author };
        }
      }
    } catch (err) {
      console.error("Quote API fetch failed, falling back to built-in quotes:", err);
    }
  }

  if (!quote) {
    const index = getDayOfYear(new Date()) % FALLBACK_QUOTES.length;
    quote = FALLBACK_QUOTES[index];
  }

  try {
    localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify({ date: todayKey, quote }));
  } catch {
    // storage full / unavailable — not critical
  }

  return quote;
};

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const [config, setConfig] = useState<WelcomeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSlider, setShowSlider] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Daily quote
  const [quote, setQuote] = useState<DailyQuote | null>(null);

  // Background image load state — if the configured image fails to load
  // (bad URL, CORS/hotlink block, deleted file) we fall back to the gradient
  // instead of silently showing nothing.
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [bgImageError, setBgImageError] = useState(false);

  // Fingerprint scan-to-unlock
  const [isScanning, setIsScanning] = useState(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flashlight (torch) state
  const [torchOn, setTorchOn] = useState(false);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'welcome')
        .single();
      
      if (data?.value) {
        setConfig(data.value as unknown as WelcomeConfig);
      } else {
        // No settings found, skip welcome screen
        onComplete();
      }
      setIsLoading(false);
    };
    loadSettings();
  }, [onComplete]);

  // Play startup sound when welcome screen is shown
  useEffect(() => {
    if (!isLoading && config?.enabled) {
      audioRef.current = new Audio(startupSound);
      audioRef.current.play().catch(console.error);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isLoading, config?.enabled]);

  // Show slider after text animation completes
  useEffect(() => {
    if (isLoading || !config?.enabled) return;
    
    // Calculate time for text animation (based on text length)
    const textAnimationTime = (config.text.length * 100) + 1000;
    
    const timer = setTimeout(() => {
      setShowSlider(true);
    }, textAnimationTime);

    return () => clearTimeout(timer);
  }, [config, isLoading]);

  // Load (and daily-cache) the quote once the lock face is about to show
  useEffect(() => {
    if (!showSlider || config?.showQuote === false || quote) return;
    fetchDailyQuote(config?.quoteApiUrl).then(setQuote);
  }, [showSlider, config?.showQuote, config?.quoteApiUrl, quote]);

  // Reset load/error state whenever the configured background image changes,
  // and eagerly preload it so we know if it's actually reachable.
  useEffect(() => {
    setBgImageLoaded(false);
    setBgImageError(false);

    if (!config?.useBackgroundImage || !config?.backgroundImage) return;

    const img = new Image();
    img.onload = () => setBgImageLoaded(true);
    img.onerror = () => {
      console.error("Welcome screen background image failed to load:", config.backgroundImage);
      setBgImageError(true);
    };
    img.src = config.backgroundImage;
  }, [config?.useBackgroundImage, config?.backgroundImage]);

  // Cleanup the torch track and any pending scan timeout on unmount
  useEffect(() => {
    return () => {
      if (torchTrackRef.current) {
        torchTrackRef.current.stop();
        torchTrackRef.current = null;
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const startScan = () => {
    setIsScanning(true);
    scanTimeoutRef.current = setTimeout(() => {
      handleUnlock();
    }, 900);
  };

  const cancelScan = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setIsScanning(false);
  };

  const toggleFlashlight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!torchOn) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };

        if (!capabilities?.torch) {
          track.stop();
          alert("Flashlight isn't supported on this device or browser.");
          return;
        }

        await track.applyConstraints({ advanced: [{ torch: true } as any] });
        torchTrackRef.current = track;
        setTorchOn(true);
      } else {
        if (torchTrackRef.current) {
          try {
            await torchTrackRef.current.applyConstraints({ advanced: [{ torch: false } as any] });
          } catch {
            // ignore — we're stopping the track anyway
          }
          torchTrackRef.current.stop();
          torchTrackRef.current = null;
        }
        setTorchOn(false);
      }
    } catch (err) {
      console.error("Flashlight error:", err);
      alert("Couldn't access the flashlight on this device.");
    }
  };

  const openCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  // Don't render anything until settings are loaded
  if (isLoading || !config || !config.enabled) return null;

  const getTextShadow = () => {
    if (!config.textShadow) return "none";
    return `0 4px ${config.textShadowBlur}px ${config.textShadowColor}`;
  };

  const toTwoDigit = (num: number) => (num < 10 ? "0" : "") + num;

  const hours24 = currentTime.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const hrMin = `${toTwoDigit(hours12)}:${toTwoDigit(currentTime.getMinutes())}`;
  const secondsStr = toTwoDigit(currentTime.getSeconds());
  const ampm = hours24 >= 12 ? "PM" : "AM";

  const weekdayAbbr = currentTime.toLocaleDateString("en-US", { weekday: "short" });
  const monthAbbr = currentTime.toLocaleDateString("en-US", { month: "short" });
  const dayNum = currentTime.getDate();
  const year = currentTime.getFullYear();

  const showQuickActions = config.showQuickActions !== false;
  const showQuote = config.showQuote !== false;

  const clockFontFamily = FONT_MAP[config.clockFont || "roboto"] || "'Roboto', sans-serif";
  const quoteFontFamily = FONT_MAP[config.quoteFont || "comfortaa"] || "'Comfortaa', cursive";

  const clockTimeColor = config.clockTimeColor || "#ffffff";
  const clockSecondsColor = config.clockSecondsColor || "#4a4848";
  const clockAmPmColor = config.clockAmPmColor || "#F44336";
  const clockDateColor = config.clockDateColor || "#5a5a5a";
  const clockDateAccentColor = config.clockDateAccentColor || "#ffffff";

  const fingerprintIdleColor = config.fingerprintIdleColor || "#ffffff99";
  const fingerprintScanFrom = config.fingerprintScanColorFrom || "#b455f0";
  const fingerprintScanMid = config.fingerprintScanColorMid || "#ff2fb0";
  const fingerprintScanTo = config.fingerprintScanColorTo || "#ff3b3b";

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isUnlocking ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background - Image or Gradient. This single layer sits behind both the
          welcome-text phase and the lock-screen/clock phase below, since both
          are rendered inside this same fixed full-screen container. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom right, ${config.gradientFrom}, ${config.gradientVia}, ${config.gradientTo})`
        }}
      />
      {config.useBackgroundImage && config.backgroundImage && !bgImageError && (
        <>
          <img
            src={config.backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: bgImageLoaded ? 1 : 0 }}
            onLoad={() => setBgImageLoaded(true)}
            onError={() => {
              console.error("Welcome screen background image failed to load:", config.backgroundImage);
              setBgImageError(true);
            }}
          />
          <div className="absolute inset-0 bg-black/20" />
        </>
      )}

      {/* Animated Welcome Text (only before the lock face appears) */}
      {!showSlider && (
        <motion.div
          className="liquid-glass relative z-10 flex flex-col items-center gap-2 rounded-[36px] px-10 py-8"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="liquid-glass-sheen" />
          <div 
            className="tracking-wide"
            style={{ 
              fontFamily: FONT_MAP[config.mainTextFont] || "'Vintage Goods', sans-serif",
              fontSize: `${config.mainTextSize}px`,
              color: config.mainTextColor || "#ffffff",
              textShadow: getTextShadow()
            }}
          >
            {config.text.split("").map((letter, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </div>
          
          <motion.div
            className="tracking-[0.3em] uppercase"
            style={{ 
              fontFamily: FONT_MAP[config.subtextFont] || "'Sackers Gothic', sans-serif",
              fontSize: `${config.subtextSize}px`,
              color: config.subtextColor || "#ffffff",
              textShadow: getTextShadow()
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.8,
              ease: "easeOut"
            }}
          >
            {config.subtext}
          </motion.div>
        </motion.div>
      )}

      {/* Simple Clock: hour:min, seconds + AM/PM, two-tone date */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            className="absolute top-16 z-20 flex flex-col items-center px-8 text-center"
            style={{ fontFamily: clockFontFamily }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Hour : Minute */}
            <div
              style={{
                fontSize: "clamp(64px, 22vw, 100px)",
                lineHeight: 1,
                color: clockTimeColor,
              }}
            >
              {hrMin}
            </div>

            {/* Seconds + AM/PM */}
            <div
              style={{
                fontSize: "clamp(36px, 13vw, 60px)",
                marginTop: "clamp(-20px, -6vw, -12px)",
                fontWeight: "bold",
                color: clockAmPmColor,
              }}
            >
              <span
                style={{
                  fontSize: "clamp(78px, 28vw, 130px)",
                  fontWeight: "bold",
                  color: clockSecondsColor,
                }}
              >
                {secondsStr}
              </span>{" "}
              {ampm}
            </div>

            {/* Date */}
            <div
              style={{
                fontSize: "clamp(16px, 6vw, 29px)",
                textTransform: "uppercase",
                marginTop: "clamp(-10px, -3vw, -6px)",
                color: clockDateColor,
              }}
            >
              {weekdayAbbr}{" "}
              <span style={{ fontWeight: 800, color: clockDateAccentColor }}>
                {monthAbbr} {dayNum}
              </span>{" "}
              {year}
            </div>

            {/* Daily Quote */}
            {showQuote && quote && (
              <motion.div
                className="text-center max-w-xs sm:max-w-sm mt-3 text-white/90 text-sm sm:text-base leading-snug"
                style={{ fontFamily: quoteFontFamily, textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                "{quote.text}" — {quote.author}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fingerprint scan-to-unlock */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            className="absolute bottom-28 z-20 flex flex-col items-center select-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Gradient definition for the scanning state, reused via stroke="url(#...)" */}
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                <linearGradient id="fingerprint-scan-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={fingerprintScanFrom} />
                  <stop offset="50%" stopColor={fingerprintScanMid} />
                  <stop offset="100%" stopColor={fingerprintScanTo} />
                </linearGradient>
              </defs>
            </svg>

            <button
              type="button"
              className="cursor-pointer touch-none p-2"
              onMouseDown={startScan}
              onMouseUp={cancelScan}
              onMouseLeave={cancelScan}
              onTouchStart={startScan}
              onTouchEnd={cancelScan}
              aria-label="Scan fingerprint to unlock"
            >
              <motion.div
                animate={{ scale: isScanning ? [1, 1.06, 1] : 1 }}
                transition={{ duration: 0.8, repeat: isScanning ? Infinity : 0, ease: "easeInOut" }}
              >
                <Fingerprint
                  className="w-16 h-16 sm:w-20 sm:h-20 transition-colors duration-300"
                  strokeWidth={1.5}
                  stroke={isScanning ? "url(#fingerprint-scan-gradient)" : fingerprintIdleColor}
                />
              </motion.div>
            </button>

            <p
              className="text-sm mt-1 transition-colors duration-300"
              style={{
                color: isScanning ? fingerprintScanMid : "rgba(255,255,255,0.85)",
                textShadow: "0 1px 6px rgba(0,0,0,0.3)",
              }}
            >
              {isScanning ? "Unlocked..." : "scan to unlock"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flashlight / Camera quick actions */}
      <AnimatePresence>
        {showSlider && showQuickActions && (
          <>
            <motion.button
              type="button"
              onClick={toggleFlashlight}
              className="absolute bottom-10 left-8 z-20 w-14 h-14 rounded-full flex items-center justify-center bg-black/70 border border-white/10"
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Flashlight className={`w-6 h-6 ${torchOn ? "text-yellow-300" : "text-white"}`} />
            </motion.button>

            <motion.button
              type="button"
              onClick={openCamera}
              className="absolute bottom-10 right-8 z-20 w-14 h-14 rounded-full flex items-center justify-center bg-black/70 border border-white/10"
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Camera className="w-6 h-6 text-white" />
            </motion.button>

            {/* Hidden input: on mobile, capture="environment" opens the native camera UI */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                e.target.value = "";
              }}
            />
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WelcomeScreen;
