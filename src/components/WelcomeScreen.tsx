import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Flashlight, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import startupSound from "@/assets/startup-sound.wav";
import SlideToUnlock from "./SlideToUnlock";

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
  showWeather?: boolean;
  showQuickActions?: boolean;
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
};

// Reused from WeatherWidget so the lock screen shows the same live conditions
const OPENWEATHER_API_KEY = "4d8fb5b93d4af21d66a2948710284366";

interface LockWeather {
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
}

const mapIconToCondition = (iconCode: string): string => {
  const code = iconCode.substring(0, 2);
  switch (code) {
    case "01": return "sunny";
    case "02": case "03": case "04": return "cloudy";
    case "09": case "10": return "rainy";
    case "11": return "storm";
    case "13": return "snow";
    case "50": return "windy";
    default: return "sunny";
  }
};

const getWeatherIcon = (condition: string, size = 16) => {
  switch (condition) {
    case "sunny":
      return <Sun size={size} className="text-yellow-300 drop-shadow" />;
    case "cloudy":
      return <Cloud size={size} className="text-white/90 drop-shadow" />;
    case "rainy":
      return <CloudRain size={size} className="text-blue-200 drop-shadow" />;
    case "snow":
      return <CloudSnow size={size} className="text-white drop-shadow" />;
    case "storm":
      return <CloudLightning size={size} className="text-yellow-200 drop-shadow" />;
    case "windy":
      return <Wind size={size} className="text-gray-200 drop-shadow" />;
    default:
      return <Cloud size={size} className="text-white/90 drop-shadow" />;
  }
};

const conditionLabel = (condition: string) => {
  switch (condition) {
    case "sunny": return "Sunny";
    case "cloudy": return "Partly Cloudy";
    case "rainy": return "Rainy";
    case "snow": return "Snow";
    case "storm": return "Thunderstorm";
    case "windy": return "Windy";
    default: return "Partly Cloudy";
  }
};

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const [config, setConfig] = useState<WelcomeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSlider, setShowSlider] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Live weather for the lock screen
  const [weather, setWeather] = useState<LockWeather | null>(null);

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

  // Fetch live weather once the lock screen face is about to show
  useEffect(() => {
    if (!showSlider || config?.showWeather === false || weather) return;

    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`
          );
          if (!res.ok) return;
          const data = await res.json();
          setWeather({
            temp: Math.round(data.main.temp),
            tempMin: Math.round(data.main.temp_min),
            tempMax: Math.round(data.main.temp_max),
            condition: mapIconToCondition(data.weather[0].icon),
          });
        } catch (err) {
          console.error("Lock screen weather fetch failed:", err);
        }
      },
      () => {
        // Location denied/unavailable — silently skip, weather section just won't render
      },
      { timeout: 10000 }
    );
  }, [showSlider, config?.showWeather, weather]);

  // Cleanup the torch track if the component unmounts while the flashlight is on
  useEffect(() => {
    return () => {
      if (torchTrackRef.current) {
        torchTrackRef.current.stop();
        torchTrackRef.current = null;
      }
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      onComplete();
    }, 500);
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

  const weekday = currentTime.toLocaleDateString("en-US", { weekday: "short" });
  const month = currentTime.toLocaleDateString("en-US", { month: "short" });
  const dateLabel = `${weekday} ${currentTime.getDate()} ${month}`;
  const timeLabel = currentTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

  const showWeather = config.showWeather !== false;
  const showQuickActions = config.showQuickActions !== false;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isUnlocking ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background - Image or Gradient */}
      {config.useBackgroundImage && config.backgroundImage ? (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${config.backgroundImage})`
            }}
          />
          <div className="absolute inset-0 bg-black/20" />
        </>
      ) : (
        <div 
          className="absolute inset-0" 
          style={{
            background: `linear-gradient(to bottom right, ${config.gradientFrom}, ${config.gradientVia}, ${config.gradientTo})`
          }}
        />
      )}

      {/* Liquid Glass: drifting colour blobs that the glass panels refract/blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="liquid-blob w-[60vw] h-[60vw] -top-[15vw] -left-[10vw]"
          style={{ background: config.gradientFrom, animationDelay: "0s" }}
        />
        <div
          className="liquid-blob w-[55vw] h-[55vw] top-1/3 -right-[15vw]"
          style={{ background: config.gradientVia, animationDelay: "4s" }}
        />
        <div
          className="liquid-blob w-[50vw] h-[50vw] -bottom-[15vw] left-1/4"
          style={{ background: config.gradientTo, animationDelay: "8s" }}
        />
        {/* Thin frosted tint over everything so the whole screen reads as one glass surface */}
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: "blur(2px) saturate(115%)",
            WebkitBackdropFilter: "blur(2px) saturate(115%)",
            background: "rgba(255,255,255,0.02)",
          }}
        />
      </div>

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

      {/* iOS-style Lock Screen face: date, time, weather */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            className="absolute top-16 z-20 flex flex-col items-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Date */}
            <div 
              className="text-lg sm:text-xl font-semibold text-white mb-1"
              style={{
                fontFamily: "'iPhone', sans-serif",
                textShadow: "0 1px 10px rgba(0,0,0,0.3)"
              }}
            >
              {dateLabel}
            </div>

            {/* Time — iOS 27-style liquid glass numerals */}
            <div className="relative">
              <div
                className="
                  text-[100px]
                  sm:text-[120px]
                  md:text-[140px]
                  font-light
                  leading-[0.9]
                "
                style={{
                  fontFamily: "'iPhone Lite', sans-serif",
                  letterSpacing: '1px',
                  background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.72) 45%, rgba(255,255,255,0.95) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow: "0 8px 40px rgba(0,0,0,0.4)",
                  filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.3))",
                }}
              >  
                {timeLabel}
              </div>
              {/* Specular sheen sweeping across the glass numerals */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)",
                  mixBlendMode: "overlay",
                }}
                animate={{ x: ["-70%", "70%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
              />
            </div>

            {/* Weather */}
            {showWeather && weather && (
              <motion.div
                className="liquid-glass flex flex-col items-center mt-4 text-white rounded-[24px] px-6 py-3"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="liquid-glass-sheen" />
                <div className="flex items-center gap-2 text-lg font-medium" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}>
                  {getWeatherIcon(weather.condition, 18)}
                  <span>{weather.temp}°</span>
                </div>
                <div className="text-sm text-white/90" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>
                  {conditionLabel(weather.condition)}
                </div>
                <div className="text-xs text-white/70" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>
                  H:{weather.tempMax}° L:{weather.tempMin}°
                </div>
              </motion.div>
            )}
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
              className="liquid-glass absolute bottom-24 left-8 z-20 w-14 h-14 rounded-full flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="liquid-glass-sheen" />
              <Flashlight className={`w-6 h-6 ${torchOn ? "text-yellow-300" : "text-white"}`} />
            </motion.button>

            <motion.button
              type="button"
              onClick={openCamera}
              className="liquid-glass absolute bottom-24 right-8 z-20 w-14 h-14 rounded-full flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="liquid-glass-sheen" />
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

      {/* Home indicator / swipe-up to unlock */}
      <AnimatePresence>
        {showSlider && (
          <motion.div
            className="liquid-glass absolute bottom-2 z-20 rounded-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <SlideToUnlock onUnlock={handleUnlock} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WelcomeScreen;
