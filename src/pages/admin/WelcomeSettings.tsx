import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Palette, MessageSquare, Type } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";

const FONT_OPTIONS = [
  { value: "barkentina", label: "Barkentina", preview: "'Barkentina', sans-serif" },
  { value: "vintage", label: "Vintage Goods", preview: "'Vintage Goods', sans-serif" },
  { value: "sackers", label: "Sackers Gothic", preview: "'Sackers Gothic', sans-serif" },
  { value: "trajan", label: "Trajan Pro", preview: "'Trajan Pro', serif" },
  { value: "playfair", label: "Playfair Display", preview: "'Playfair Display', serif" },
  { value: "inter", label: "Inter", preview: "'Inter', sans-serif" },
  { value: "poppins", label: "Poppins", preview: "'Poppins', sans-serif" },
  { value: "montserrat", label: "Montserrat", preview: "'Montserrat', sans-serif" },
  { value: "roboto", label: "Roboto", preview: "'Roboto', sans-serif" },
  { value: "oswald", label: "Oswald", preview: "'Oswald', sans-serif" },
  { value: "dancing", label: "Dancing Script", preview: "'Dancing Script', cursive" },
  { value: "pacifico", label: "Pacifico", preview: "'Pacifico', cursive" },
  { value: "lobster", label: "Lobster", preview: "'Lobster', cursive" },
  { value: "greatvibes", label: "Great Vibes", preview: "'Great Vibes', cursive" },
  { value: "satisfy", label: "Satisfy", preview: "'Satisfy', cursive" },
  { value: "sacramento", label: "Sacramento", preview: "'Sacramento', cursive" },
  { value: "allura", label: "Allura", preview: "'Allura', cursive" },
  { value: "comfortaa", label: "Comfortaa", preview: "'Comfortaa', cursive" },
  { value: "righteous", label: "Righteous", preview: "'Righteous', sans-serif" },
  { value: "orbitron", label: "Orbitron", preview: "'Orbitron', sans-serif" },
  { value: "cinzel", label: "Cinzel", preview: "'Cinzel', serif" },
  { value: "cormorant", label: "Cormorant Garamond", preview: "'Cormorant Garamond', serif" },
];

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
  backgroundImage: string;
  useBackgroundImage: boolean;
  showWeather: boolean;
  showQuickActions: boolean;
}

interface NotificationConfig {
  enabled: boolean;
  name: string;
  message: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  profileImage: string;
  nameColor: string;
  messageColor: string;
}

const WelcomeSettings = () => {
  const [config, setConfig] = useState<WelcomeConfig>({
    enabled: true,
    text: "Hello",
    subtext: "Welcome to my portfolio",
    duration: 5000,
    gradientFrom: "#2563eb",
    gradientVia: "#9333ea",
    gradientTo: "#f97316",
    mainTextFont: "vintage",
    subtextFont: "sackers",
    mainTextSize: 72,
    subtextSize: 20,
    mainTextColor: "#ffffff",
    subtextColor: "#ffffff",
    textShadow: true,
    textShadowColor: "#000000",
    textShadowBlur: 10,
    backgroundImage: "",
    useBackgroundImage: false,
    showWeather: true,
    showQuickActions: true,
  });
  
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    enabled: true,
    name: "John Smith",
    message: "Welcome! Hope you're having a great day.",
    gradientFrom: "#2563eb",
    gradientVia: "#9333ea",
    gradientTo: "#f97316",
    profileImage: "",
    nameColor: "#ffffff",
    messageColor: "#ffffffb3",
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [welcomeRes, notificationRes] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "welcome").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "welcome_notification").maybeSingle(),
      ]);

      if (welcomeRes.data?.value) {
        setConfig({ ...config, ...(welcomeRes.data.value as unknown as WelcomeConfig) });
      }
      if (notificationRes.data?.value) {
        setNotificationConfig({ ...notificationConfig, ...(notificationRes.data.value as unknown as NotificationConfig) });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert welcome settings
      const { error: welcomeError } = await supabase
        .from("app_settings")
        .upsert({ 
          key: "welcome", 
          value: JSON.parse(JSON.stringify(config)) 
        }, { onConflict: "key" });

      if (welcomeError) throw welcomeError;

      // Upsert notification settings
      const { error: notificationError } = await supabase
        .from("app_settings")
        .upsert({ 
          key: "welcome_notification", 
          value: JSON.parse(JSON.stringify(notificationConfig)) 
        }, { onConflict: "key" });

      if (notificationError) throw notificationError;

      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getFontFamily = (fontKey: string) => {
    return FONT_OPTIONS.find(f => f.value === fontKey)?.preview || "'Inter', sans-serif";
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <AdminHeader title="Welcome Settings" description="Customize welcome screen and notification" />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Welcome Screen Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Welcome Screen
              </CardTitle>
              <CardDescription className="text-white/60">
                Configure the welcome animation screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white/80">Enable Welcome Screen</Label>
                  <p className="text-white/40 text-sm">Show welcome animation on app load</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Main Text</Label>
                <Input
                  value={config.text}
                  onChange={(e) => setConfig({ ...config, text: e.target.value })}
                  placeholder="Hello"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Subtext</Label>
                <Input
                  value={config.subtext}
                  onChange={(e) => setConfig({ ...config, subtext: e.target.value })}
                  placeholder="Welcome to my portfolio"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">
                  Duration: {(config.duration / 1000).toFixed(1)}s
                </Label>
                <Slider
                  value={[config.duration]}
                  onValueChange={([value]) => setConfig({ ...config, duration: value })}
                  min={2000}
                  max={10000}
                  step={500}
                  className="py-2"
                />
              </div>

              {/* Font Settings */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Font Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/80 text-sm">Main Text Font</Label>
                      <Select
                        value={config.mainTextFont}
                        onValueChange={(value) => setConfig({ ...config, mainTextFont: value })}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <span style={{ fontFamily: font.preview }}>{font.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80 text-sm">Main Text Size: {config.mainTextSize}px</Label>
                      <Slider
                        value={[config.mainTextSize]}
                        onValueChange={([value]) => setConfig({ ...config, mainTextSize: value })}
                        min={32}
                        max={120}
                        step={4}
                        className="py-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/80 text-sm">Subtext Font</Label>
                      <Select
                        value={config.subtextFont}
                        onValueChange={(value) => setConfig({ ...config, subtextFont: value })}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              <span style={{ fontFamily: font.preview }}>{font.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80 text-sm">Subtext Size: {config.subtextSize}px</Label>
                      <Slider
                        value={[config.subtextSize]}
                        onValueChange={([value]) => setConfig({ ...config, subtextSize: value })}
                        min={12}
                        max={48}
                        step={2}
                        className="py-2"
                      />
                    </div>
                  </div>
                  
                  {/* Text Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/80 text-sm">Main Text Color</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.mainTextColor}
                          onChange={(e) => setConfig({ ...config, mainTextColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={config.mainTextColor}
                          onChange={(e) => setConfig({ ...config, mainTextColor: e.target.value })}
                          className="bg-white/10 border-white/20 text-white flex-1 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80 text-sm">Subtext Color</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.subtextColor}
                          onChange={(e) => setConfig({ ...config, subtextColor: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={config.subtextColor}
                          onChange={(e) => setConfig({ ...config, subtextColor: e.target.value })}
                          className="bg-white/10 border-white/20 text-white flex-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Text Shadow */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/80 text-sm">Text Shadow</Label>
                      <Switch
                        checked={config.textShadow}
                        onCheckedChange={(checked) => setConfig({ ...config, textShadow: checked })}
                      />
                    </div>
                    {config.textShadow && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/60 text-xs">Shadow Color</Label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={config.textShadowColor}
                              onChange={(e) => setConfig({ ...config, textShadowColor: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer"
                            />
                            <Input
                              value={config.textShadowColor}
                              onChange={(e) => setConfig({ ...config, textShadowColor: e.target.value })}
                              className="bg-white/10 border-white/20 text-white flex-1 text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/60 text-xs">Blur: {config.textShadowBlur}px</Label>
                          <Slider
                            value={[config.textShadowBlur]}
                            onValueChange={([value]) => setConfig({ ...config, textShadowBlur: value })}
                            min={0}
                            max={30}
                            step={1}
                            className="py-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label className="text-white/80">Gradient Colors</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">From</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.gradientFrom}
                        onChange={(e) => setConfig({ ...config, gradientFrom: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.gradientFrom}
                        onChange={(e) => setConfig({ ...config, gradientFrom: e.target.value })}
                        className="bg-white/10 border-white/20 text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Via</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.gradientVia}
                        onChange={(e) => setConfig({ ...config, gradientVia: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.gradientVia}
                        onChange={(e) => setConfig({ ...config, gradientVia: e.target.value })}
                        className="bg-white/10 border-white/20 text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">To</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.gradientTo}
                        onChange={(e) => setConfig({ ...config, gradientTo: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={config.gradientTo}
                        onChange={(e) => setConfig({ ...config, gradientTo: e.target.value })}
                        className="bg-white/10 border-white/20 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Background Image Settings */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Background Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white/80 text-sm">Use Background Image</Label>
                      <p className="text-white/40 text-xs">Replace gradient with an image</p>
                    </div>
                    <Switch
                      checked={config.useBackgroundImage}
                      onCheckedChange={(checked) => setConfig({ ...config, useBackgroundImage: checked })}
                    />
                  </div>
                  
                  {config.useBackgroundImage && (
                    <div className="space-y-2">
                      <Label className="text-white/80 text-sm">Image URL</Label>
                      <Input
                        value={config.backgroundImage}
                        onChange={(e) => setConfig({ ...config, backgroundImage: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                        className="bg-white/10 border-white/20 text-white"
                      />
                      {config.backgroundImage && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-white/20 aspect-video">
                          <img 
                            src={config.backgroundImage} 
                            alt="Background preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text fill="%23999" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">Invalid URL</text></svg>';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lock Screen Elements */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Lock Screen Elements
                  </CardTitle>
                  <CardDescription className="text-white/60 text-xs">
                    Shown on the lock screen face, after the intro text finishes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white/80 text-sm">Show Weather</Label>
                      <p className="text-white/40 text-xs">Live temperature and conditions below the clock</p>
                    </div>
                    <Switch
                      checked={config.showWeather}
                      onCheckedChange={(checked) => setConfig({ ...config, showWeather: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white/80 text-sm">Show Flashlight &amp; Camera</Label>
                      <p className="text-white/40 text-xs">Quick action buttons at the bottom of the lock screen</p>
                    </div>
                    <Switch
                      checked={config.showQuickActions}
                      onCheckedChange={(checked) => setConfig({ ...config, showQuickActions: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Welcome Screen Preview */}
              <div className="space-y-2">
                <Label className="text-white/80">Preview</Label>
                <div 
                  className="aspect-[9/16] max-h-48 rounded-xl overflow-hidden border border-white/20 flex flex-col items-center justify-center relative"
                  style={{
                    background: config.useBackgroundImage && config.backgroundImage 
                      ? undefined 
                      : `linear-gradient(to bottom right, ${config.gradientFrom}, ${config.gradientVia}, ${config.gradientTo})`
                  }}
                >
                  {config.useBackgroundImage && config.backgroundImage && (
                    <>
                      <img 
                        src={config.backgroundImage} 
                        alt="Background" 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </>
                  )}
                  {config.enabled ? (
                    <div className="relative z-10 flex flex-col items-center">
                      <p 
                        className="mb-1" 
                        style={{ 
                          fontFamily: getFontFamily(config.mainTextFont),
                          fontSize: `${Math.min(config.mainTextSize / 3, 24)}px`,
                          color: config.mainTextColor || "#ffffff",
                          textShadow: config.textShadow ? `0 2px ${config.textShadowBlur / 3}px ${config.textShadowColor}` : "none"
                        }}
                      >
                        {config.text || "Hello"}
                      </p>
                      <p 
                        className="tracking-wider uppercase"
                        style={{ 
                          fontFamily: getFontFamily(config.subtextFont),
                          fontSize: `${Math.min(config.subtextSize / 2, 12)}px`,
                          color: config.subtextColor || "#ffffff",
                          textShadow: config.textShadow ? `0 2px ${config.textShadowBlur / 3}px ${config.textShadowColor}` : "none"
                        }}
                      >
                        {config.subtext || "Welcome"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm relative z-10">Disabled</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Welcome Notification
              </CardTitle>
              <CardDescription className="text-white/60">
                Configure the notification that appears after home screen loads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white/80">Enable Notification</Label>
                  <p className="text-white/40 text-sm">Show welcome notification popup</p>
                </div>
                <Switch
                  checked={notificationConfig.enabled}
                  onCheckedChange={(checked) => setNotificationConfig({ ...notificationConfig, enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Name</Label>
                <Input
                  value={notificationConfig.name}
                  onChange={(e) => setNotificationConfig({ ...notificationConfig, name: e.target.value })}
                  placeholder="John Smith"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Message</Label>
                <Input
                  value={notificationConfig.message}
                  onChange={(e) => setNotificationConfig({ ...notificationConfig, message: e.target.value })}
                  placeholder="Welcome! Hope you're having a great day."
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              {/* Profile Image URL */}
              <div className="space-y-2">
                <Label className="text-white/80">Profile Image URL</Label>
                <Input
                  value={notificationConfig.profileImage}
                  onChange={(e) => setNotificationConfig({ ...notificationConfig, profileImage: e.target.value })}
                  placeholder="https://example.com/avatar.jpg (leave empty for default)"
                  className="bg-white/10 border-white/20 text-white"
                />
                <p className="text-white/40 text-xs">Leave empty to use default app icon</p>
              </div>

              {/* Font Colors */}
              <div className="space-y-3">
                <Label className="text-white/80">Text Colors</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Name Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={notificationConfig.nameColor}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, nameColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={notificationConfig.nameColor}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, nameColor: e.target.value })}
                        className="bg-white/10 border-white/20 text-white flex-1 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/60 text-xs">Message Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={notificationConfig.messageColor?.replace(/[a-f0-9]{2}$/i, '') || notificationConfig.messageColor}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, messageColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={notificationConfig.messageColor}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, messageColor: e.target.value })}
                        className="bg-white/10 border-white/20 text-white flex-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-white/80">Gradient Colors</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">From</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={notificationConfig.gradientFrom}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, gradientFrom: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={notificationConfig.gradientFrom}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, gradientFrom: e.target.value })}
                        className="bg-white/10 border-white/20 text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">Via</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={notificationConfig.gradientVia}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, gradientVia: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={notificationConfig.gradientVia}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, gradientVia: e.target.value })}
                        className="bg-white/10 border-white/20 text-white text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/60 text-xs">To</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={notificationConfig.gradientTo}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, gradientTo: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={notificationConfig.gradientTo}
                        onChange={(e) => setNotificationConfig({ ...notificationConfig, gradientTo: e.target.value })}
                        className="bg-white/10 border-white/20 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Preview */}
              <div className="space-y-2">
                <Label className="text-white/80">Preview</Label>
                <div 
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{
                    background: `linear-gradient(to bottom right, ${notificationConfig.gradientFrom}e6, ${notificationConfig.gradientVia}e6, ${notificationConfig.gradientTo}e6)`
                  }}
                >
                  <span className="text-xs text-white/70 font-medium pt-0.5">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex-shrink-0 overflow-hidden">
                    {notificationConfig.profileImage && (
                      <img src={notificationConfig.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: notificationConfig.nameColor }}>
                      {notificationConfig.name || "Name"}
                    </div>
                    <div className="text-xs" style={{ color: notificationConfig.messageColor }}>
                      {notificationConfig.message || "Message"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      <div className="mt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {saving ? "Saving..." : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default WelcomeSettings;
