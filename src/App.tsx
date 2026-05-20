import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  KeyRound, 
  ChevronRight, 
  Sparkles, 
  Lock, 
  Unlock, 
  Volume2, 
  VolumeX, 
  X, 
  MapPin, 
  Heart, 
  ArrowRight 
} from "lucide-react";

// Web Audio API Birthday Chime Helper & MP3 background playlist controller
class GreetingMelody {
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private playlist = [
    "/Something Just Like This.mp3",
    "/There is a light that never goes out.mp3"
  ];
  private currentTrackIndex = 0;
  private intervalId: any = null;

  constructor() {
    this.currentTrackIndex = parseInt(localStorage.getItem("bg_music_track_index") || "0", 10);
    if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.playlist.length) {
      this.currentTrackIndex = 0;
    }
  }

  public playTone(freq: number, duration: number, type: OscillatorType = "sine") {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  public playSparkle() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 987.77];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.05);
        gain.gain.setValueAtTime(0.03, now + index * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.05 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.05);
        osc.stop(now + index * 0.05 + 1.2);
      });
    } catch (e) {}
  }

  private initAudio() {
    if (this.audio) return;

    this.currentTrackIndex = parseInt(localStorage.getItem("bg_music_track_index") || "0", 10);
    if (this.currentTrackIndex < 0 || this.currentTrackIndex >= this.playlist.length) {
      this.currentTrackIndex = 0;
    }

    const savedTime = parseFloat(localStorage.getItem("bg_music_track_time") || "0");

    this.audio = new Audio(this.playlist[this.currentTrackIndex]);
    this.audio.volume = 0.15; // Mellow ambient volume, not too high!
    this.audio.currentTime = savedTime;

    this.audio.addEventListener("ended", () => {
      this.nextTrack();
    });

    this.intervalId = setInterval(() => {
      if (this.audio && !this.audio.paused) {
        localStorage.setItem("bg_music_track_time", this.audio.currentTime.toString());
      }
    }, 1000);
  }

  private nextTrack() {
    if (!this.audio) return;
    this.audio.pause();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    localStorage.setItem("bg_music_track_index", this.currentTrackIndex.toString());
    localStorage.setItem("bg_music_track_time", "0");

    this.audio.src = this.playlist[this.currentTrackIndex];
    this.audio.currentTime = 0;
    if (this.isPlaying) {
      this.audio.play().catch(e => console.log("Next track play prevented", e));
    }
  }

  public startMelody() {
    this.initAudio();
    if (!this.audio) return;

    this.isPlaying = true;
    localStorage.setItem("bg_music_muted", "false");
    this.audio.play().catch(error => {
      console.log("Audio play deferred awaiting user tap event:", error);
    });
  }

  public stopMelody() {
    this.isPlaying = false;
    localStorage.setItem("bg_music_muted", "true");
    if (this.audio) {
      this.audio.pause();
      localStorage.setItem("bg_music_track_time", this.audio.currentTime.toString());
    }
  }

  public cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.audio) {
      this.audio.pause();
      localStorage.setItem("bg_music_track_time", this.audio.currentTime.toString());
      this.audio = null;
    }
  }
}

// Sparkle emitter particle background for active greeting
interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  color: string;
}

// Falling petals configuration for the immersive transition
interface FallingPetal {
  id: number;
  left: string;
  delay: number;
  duration: number;
  scale: number;
  rotateStart: number;
  rotateEnd: number;
  xOffset: number;
}

const transitionPetals: FallingPetal[] = Array.from({ length: 45 }).map((_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  delay: Math.random() * 2.0,
  duration: Math.random() * 2.5 + 1.5,
  scale: Math.random() * 0.7 + 0.35,
  rotateStart: Math.random() * 360,
  rotateEnd: Math.random() * 360 + 360,
  xOffset: (Math.random() - 0.5) * 150,
}));

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorShake, setErrorShake] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<GreetingMelody | null>(null);

  // Lazy instantiate audio engine
  useEffect(() => {
    localStorage.setItem("bg_music_track_index", "0");
    localStorage.setItem("bg_music_track_time", "0");
    audioRef.current = new GreetingMelody();
    return () => {
      audioRef.current?.stopMelody();
    };
  }, []);

  // Sync background music with mute button
  useEffect(() => {
    if (isUnlocked && !isMuted) {
      audioRef.current?.startMelody();
    } else {
      audioRef.current?.stopMelody();
    }
  }, [isUnlocked, isMuted]);

  // Handle ambient floating canvas particles (embers & hibiscus-like pink spots)
  useEffect(() => {
    if (!isUnlocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Initial fill
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 1.5,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -(Math.random() * 0.8 + 0.3),
        alpha: Math.random() * 0.6 + 0.2,
        color: Math.random() > 0.4 ? "#E30B5C" : "#F46093",
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create starry backdrop aura
      particles.forEach((p, index) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Reset if offscreen
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        // Draw soft glowing circular embers
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Subtle decorative ambient overlay curves representing draft breeze
      ctx.save();
      ctx.strokeStyle = "rgba(227, 11, 92, 0.03)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.7);
      ctx.bezierCurveTo(
        canvas.width * 0.3, canvas.height * 0.6,
        canvas.width * 0.7, canvas.height * 0.8,
        canvas.width, canvas.height * 0.5
      );
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isUnlocked]);

  // Native Web Crypto SHA-256 password hash checking
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(passwordInput.trim().toLowerCase());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Target hashes for "istillloveyoumoreez" (both user-provided format and standard node/webcrypto lowercase SHA-256)
      const acceptedHashes = [
        "11b2397c125bb7e273ff32cf2b6045d6255dd9f920f269a88f723659228d578f", // User-requested string representation
        "b01a028e7fc277c29e97f3c6434374dee510af1a42e1f517050d95d3c1aa6045"  // Standard lowercase SHA-256 for "istillloveyoumoreez"
      ];

      if (acceptedHashes.includes(hashHex)) {
        setIsUnlocked(true);
        // Turn sound on for an amazing immersive experience immediately
        setIsMuted(false);
      } else {
        // Trigger CSS Shake animation
        setErrorShake(true);
        setTimeout(() => setErrorShake(false), 500);
      }
    } catch (err) {
      console.error("Crypto API error", err);
    }
  };

  // Hibiscus Flower Clicked → Fade out to black & redirect to manga.html
  const handleFlowerClick = () => {
    audioRef.current?.playTone(880, 0.8, "sine");
    audioRef.current?.playTone(1320, 0.8, "sine");
    setIsFadingOut(true);

    // Smooth page fade out transition to black and redirect
    setTimeout(() => {
      window.location.href = "manga.html";
    }, 3000);
  };

  // Sparkle melody helper on hover
  const triggerSparkleHover = () => {
    if (!isMuted && isUnlocked) {
      audioRef.current?.playSparkle();
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0F0F0F] text-[#F5F5F5] flex flex-col justify-between overflow-hidden font-serif select-none">
      
      {/* Decorative ambient glowing background circles */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-raspberry/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-raspberry/5 blur-[120px] pointer-events-none" />

      {/* Primary header branding bar */}
      <header className="px-6 py-6 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-raspberry fill-raspberry/20" />
          <span className="font-serif tracking-widest text-xs uppercase text-stone-400">
            {"Hi Durie <3"}
          </span>
        </div>
        
        {/* Ambient Volume controls */}
        {isUnlocked && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2.5 rounded-full border border-white/[0.08] bg-[#141414] text-raspberry hover:bg-raspberry/10 hover:border-raspberry/50 transition-all cursor-pointer flex items-center justify-center"
            title={isMuted ? "Enable Ambient Melody" : "Mute Sound"}
            id="audio-toggle-btn"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </header>

      {/* Main Core View Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative w-full h-full">
        
        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            /* STATE 1: THE GATEWAY (MINIMALIST LOCK SCREEN) */
            <motion.div
              key="lock-gateway"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full max-w-sm flex flex-col items-center justify-center z-20"
              id="state-gateway-wrapper"
            >
              <div className="mb-12 text-center">
                <div className="w-12 h-[1px] bg-white opacity-20 mx-auto mb-6"></div>
                <p className="text-[10px] tracking-[0.4em] text-white opacity-40 uppercase">Private Access</p>
              </div>

              {/* Password submission form */}
              <form 
                onSubmit={handlePasswordSubmit} 
                className="w-64 flex flex-col items-center gap-6"
                id="password-form"
              >
                <div className={`w-full border-b transition-all duration-300 ${
                  errorShake 
                    ? "border-raspberry animate-shake" 
                    : "border-white border-opacity-10 hover:border-raspberry focus-within:border-raspberry focus-within:shadow-[0_1px_0_#E30B5C]"
                }`}>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent py-3 text-center text-xl tracking-[0.5em] focus:outline-none placeholder-white placeholder-opacity-10 text-white"
                    id="password-input-field"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-4 px-8 py-2 text-[11px] tracking-[0.2em] uppercase border border-white border-opacity-10 hover:border-raspberry hover:text-raspberry transition-all duration-300 cursor-pointer"
                  id="submit-password-btn"
                >
                  Unlock
                </button>

                {/* Sub-hint alert indicator feedback */}
                {errorShake && (
                  <p className="text-[10px] text-amber-500 tracking-wider text-center font-mono uppercase opacity-90 animate-pulse">
                    Access Denied
                  </p>
                )}
              </form>
            </motion.div>
          ) : (
            /* STATE 2: THE GREETING (UNLOCKED IMMERSIVE STATE) */
            <motion.div
              key="birthday-greeting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="w-full max-w-3xl flex flex-col items-center justify-center relative text-center"
              id="state-greeting-wrapper"
            >
              {/* Overlay Interactive Dynamic Particle Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
              />

              {/* Elevated content elements */}
              <div className="z-10 relative flex flex-col items-center select-none cursor-default px-4">
                
                {/* Micro heading layout */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-3 flex items-center gap-1.5 bg-[#141414] border border-white/10 px-4 py-1.5 rounded-full"
                >
                  <Sparkles className="w-3.5 h-3.5 text-raspberry animate-spin" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-[0.25em] uppercase font-mono text-white/60">
                    The Gathering Bloom
                  </span>
                </motion.div>

                {/* Elegant Colored and Thematic Birthday Typography */}
                <motion.h2
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="font-serif text-5xl md:text-7xl font-semibold mb-4 tracking-wider leading-none bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-[#E30B5C] to-rose-300 drop-shadow-[0_2px_15px_rgba(227,11,92,0.3)]"
                >
                  Happy Birthday
                </motion.h2>

                <p className="font-serif text-lg md:text-xl text-pink-200/90 tracking-wide font-light max-w-lg mb-10 leading-relaxed text-center">
                  My beloved baby
                </p>

                {/* HIGH-QUALITY HIBISCUS SVG CONTAINER (Interactive & Pulsating) */}
                <div className="relative mb-12 group cursor-pointer" id="hibiscus-flower-interactive">
                  {/* Subtle breathing glow backdrops under the flower */}
                  <div className="absolute inset-0 rounded-full bg-raspberry/10 filter blur-[40px] group-hover:bg-raspberry/20 transition-all duration-700 pointer-events-none scale-90" />
                  
                  {/* Elegant decorative golden vector circle frame framing the flower */}
                  <div className="absolute -inset-4 rounded-full border border-raspberry/10 group-hover:scale-105 group-hover:border-raspberry/30 transition-all duration-700 pointer-events-none" />
                  <div className="absolute -inset-8 rounded-full border border-raspberry/5 group-hover:scale-110 transition-all duration-700 pointer-events-none" />

                  {/* Pulsating highly elegant SVG Hibiscus flower */}
                  <div
                    onClick={handleFlowerClick}
                    onMouseEnter={triggerSparkleHover}
                    className="relative z-10 animate-pulse-gentle group-hover:scale-105 transition-all duration-500 cursor-pointer"
                    title="A gentle touch unfolds the chronicle"
                    id="hibiscus-flower-svg-trigger"
                  >
                    <svg
                      width="260"
                      height="260"
                      viewBox="0 0 500 500"
                      className="mx-auto transform transition-transform group-hover:rotate-6 duration-700"
                    >
                      <defs>
                        {/* Petal gradients for rich velvet rose textures */}
                        <radialGradient id="petalGrad1" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ff4d80" />
                          <stop offset="65%" stopColor="#E30B5C" />
                          <stop offset="100%" stopColor="#8d0537" />
                        </radialGradient>
                        <radialGradient id="petalGrad2" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ff5a92" />
                          <stop offset="55%" stopColor="#E30B5C" />
                          <stop offset="100%" stopColor="#6e0027" />
                        </radialGradient>
                        <radialGradient id="stamenGlow" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ffd700" />
                          <stop offset="40%" stopColor="#E30B5C" />
                          <stop offset="100%" stopColor="#0d0105" />
                        </radialGradient>
                        <linearGradient id="antherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fff275" />
                          <stop offset="100%" stopColor="#ffa600" />
                        </linearGradient>
                        <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="8" stdDeviation="15" floodColor="#820030" floodOpacity="0.5" />
                        </filter>
                      </defs>

                      {/* Drop shadows and backplates */}
                      <g filter="url(#shadowFilter)">
                        
                        {/* 5 Petals of the Hibiscus Flower designed with beautiful biological organic curvature */}
                        {/* Petal B (Top Left) */}
                        <path
                          d="M250,250 C180,120 120,160 140,240 C155,290 200,310 250,250 Z"
                          fill="url(#petalGrad2)"
                          transform="rotate(0 250 250)"
                          className="opacity-95"
                        />
                        {/* Petal C (Top Right) */}
                        <path
                          d="M250,250 C360,180 320,120 270,140 C220,155 200,200 250,250 Z"
                          fill="url(#petalGrad1)"
                          transform="rotate(72 250 250)"
                          className="opacity-95"
                        />
                        {/* Petal D (Bottom Right) */}
                        <path
                          d="M250,250 C380,320 340,380 290,320 C250,270 240,240 250,250 Z"
                          fill="url(#petalGrad2)"
                          transform="rotate(144 250 250)"
                          className="opacity-95"
                        />
                        {/* Petal E (Bottom Left) */}
                        <path
                          d="M250,250 C180,380 120,340 180,290 C220,250 240,240 250,250 Z"
                          fill="url(#petalGrad1)"
                          transform="rotate(216 250 250)"
                          className="opacity-95"
                        />
                        {/* Petal A (Left Centre overlapping) */}
                        <path
                          d="M250,250 C120,280 80,220 140,180 C180,150 220,200 250,250 Z"
                          fill="url(#petalGrad2)"
                          transform="rotate(288 250 250)"
                          className="opacity-95"
                        />

                        {/* Overlapping Petal center core vein networks for realism */}
                        <path d="M250,250 Q210,190 190,205" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                        <path d="M250,250 Q290,170 275,175" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                        <path d="M250,250 Q310,290 295,295" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                        <path d="M250,250 Q190,310 205,295" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                        <path d="M250,250 Q160,210 175,200" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />

                        {/* Deep Flower Heart */}
                        <circle cx="250" cy="250" r="32" fill="url(#stamenGlow)" className="opacity-90" />
                        <circle cx="250" cy="250" r="16" fill="#4d0019" />

                        {/* Master Pistil / Long Crimson Stamen Column, graceful and bent slightly */}
                        <path
                          d="M250,250 C290,210 380,180 410,140"
                          stroke="url(#petalGrad1)"
                          strokeWidth="11"
                          strokeLinecap="round"
                          fill="none"
                        />
                        
                        {/* Intricate detailed Stamen vein line */}
                        <path
                          d="M255,245 C295,205 382,178 408,139"
                          stroke="#ff5a92"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          className="opacity-80"
                        />

                        {/* Pollen anthers cluster radiating from column tip */}
                        <g>
                          {/* Main stigma pads (tips at the very end of stamen column) */}
                          <circle cx="415" cy="135" r="75" fill="none" /> {/* bounding space */}
                          
                          {/* Center stigma heads (flower recepticle points) */}
                          <circle cx="415" cy="133" r="7" fill="#8d0537" />
                          <circle cx="425" cy="138" r="6" fill="#8d0537" />
                          <circle cx="410" cy="145" r="6" fill="#8d0537" />
                          <circle cx="422" cy="128" r="5" fill="#a00841" />
                          <circle cx="403" cy="135" r="5" fill="#a00841" />

                          {/* Radiant anthers (golden pollen spots on thin threads) */}
                          {/* Thread 1 */}
                          <path d="M370,180 Q365,165 355,160" stroke="#f23d80" strokeWidth="2" fill="none" />
                          <circle cx="355" cy="160" r="5" fill="url(#antherGrad)" />
                          {/* Thread 2 */}
                          <path d="M380,170 Q382,150 376,145" stroke="#f23d80" strokeWidth="2" fill="none" />
                          <circle cx="376" cy="145" r="5.5" fill="url(#antherGrad)" />
                          {/* Thread 3 */}
                          <path d="M390,160 Q400,143 400,138" stroke="#f23d80" strokeWidth="2" fill="none" />
                          <circle cx="400" cy="138" r="5" fill="url(#antherGrad)" />
                          {/* Thread 4 */}
                          <path d="M360,190 Q347,185 342,185" stroke="#f23d80" strokeWidth="2" fill="none" />
                          <circle cx="342" cy="185" r="4.5" fill="url(#antherGrad)" />
                          {/* Thread 5 */}
                          <path d="M385,165 Q395,178 398,185" stroke="#f23d80" strokeWidth="2" fill="none" />
                          <circle cx="398" cy="185" r="5" fill="url(#antherGrad)" />
                          {/* Thread 6 */}
                          <path d="M350,200 Q335,195 330,205" stroke="#f23d80" strokeWidth="2" fill="none" />
                          <circle cx="330" cy="205" r="4.5" fill="url(#antherGrad)" />
                          {/* Thread 7 */}
                          <path d="M365,182 Q354,178 348,170" stroke="#f23d80" strokeWidth="2" fill="none" />
                          <circle cx="348" cy="170" r="4.8" fill="url(#antherGrad)" />
                        </g>

                      </g>
                    </svg>
                  </div>

                  {/* Ripple pulse hover effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-raspberry/40 rounded-full scale-50 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-1000 pointer-events-none" />
                </div>

                {/* Custom Heartfelt Message Block */}
                <p className="mt-6 text-stone-300 max-w-md text-sm md:text-base leading-relaxed tracking-wide font-light text-center px-4 opacity-95">
                  I hope you have wonderful joyus day today! Enjoy tons and eat alots! Tell me how was your day in the end! Click the hibiscus and enjoy my negative creativity 😭❤️
                </p>



              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Core bottom page footer details */}
      <footer className="px-6 py-6 text-center text-stone-600 text-[10px] tracking-wider font-mono border-t border-white/[0.04] z-10 bg-[#0F0F0F]">
        <div>
          <span>From me to you </span>
          <span className="text-raspberry font-sans">•</span>
          <span> May 21, 2026</span>
        </div>
      </footer>

      {/* Black screen fadeout curtain overlay to transition seamlessly to manga.html */}
      <AnimatePresence>
        {isFadingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 bg-[#0A0A0A] z-50 flex flex-col items-center justify-center text-center overflow-hidden"
            id="fadeout-transition-curtain"
          >
            {/* 1. Falling Petals Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {transitionPetals.map((petal) => (
                <motion.div
                  key={petal.id}
                  initial={{ 
                    y: "-10vh", 
                    x: 0, 
                    rotate: petal.rotateStart, 
                    opacity: 0, 
                    scale: petal.scale 
                  }}
                  animate={{ 
                    y: "110vh", 
                    x: petal.xOffset, 
                    rotate: petal.rotateEnd, 
                    opacity: [0, 0.85, 0.85, 0], 
                    scale: petal.scale 
                  }}
                  transition={{ 
                    delay: petal.delay, 
                    duration: petal.duration, 
                    ease: "linear",
                    repeat: Infinity 
                  }}
                  className="absolute"
                  style={{ left: petal.left }}
                >
                  <div className="w-5.5 h-7.5 bg-gradient-to-tr from-[#E30B5C] via-[#FA5F8F] to-pink-300 rounded-full rounded-br-none shadow-[0_2px_8px_rgba(227,11,92,0.25)] filter blur-[0.4px]" />
                </motion.div>
              ))}
            </div>

            {/* 2. Zooming-in Blooming Hibiscus Flower Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0.9],
                scale: [0.8, 1.2, 2.4, 4.2], 
                rotate: 25 
              }}
              transition={{ 
                duration: 3.0, 
                ease: [0.25, 1, 0.5, 1]
              }}
              className="relative z-0 pointer-events-none flex items-center justify-center"
            >
              <svg
                width="280"
                height="280"
                viewBox="0 0 500 500"
                className="transform"
              >
                <defs>
                  {/* Petal gradients for rich velvet rose textures */}
                  <radialGradient id="petalGrad1_trans" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff4d80" />
                    <stop offset="65%" stopColor="#E30B5C" />
                    <stop offset="100%" stopColor="#8d0537" />
                  </radialGradient>
                  <radialGradient id="petalGrad2_trans" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff5a92" />
                    <stop offset="55%" stopColor="#E30B5C" />
                    <stop offset="100%" stopColor="#6e0027" />
                  </radialGradient>
                  <radialGradient id="stamenGlow_trans" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="40%" stopColor="#E30B5C" />
                    <stop offset="100%" stopColor="#0d0105" />
                  </radialGradient>
                  <linearGradient id="antherGrad_trans" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff275" />
                    <stop offset="100%" stopColor="#ffa600" />
                  </linearGradient>
                  <filter id="shadowFilter_trans" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="8" stdDeviation="15" floodColor="#820030" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Drop shadows and backplates */}
                <g filter="url(#shadowFilter_trans)">
                  
                  {/* 5 Petals of the Hibiscus Flower */}
                  {/* Petal B (Top Left) */}
                  <path
                    d="M250,250 C180,120 120,160 140,240 C155,290 200,310 250,250 Z"
                    fill="url(#petalGrad2_trans)"
                    transform="rotate(0 250 250)"
                    className="opacity-95"
                  />
                  {/* Petal C (Top Right) */}
                  <path
                    d="M250,250 C360,180 320,120 270,140 C220,155 200,200 250,250 Z"
                    fill="url(#petalGrad1_trans)"
                    transform="rotate(72 250 250)"
                    className="opacity-95"
                  />
                  {/* Petal D (Bottom Right) */}
                  <path
                    d="M250,250 C380,320 340,380 290,320 C250,270 240,240 250,250 Z"
                    fill="url(#petalGrad2_trans)"
                    transform="rotate(144 250 250)"
                    className="opacity-95"
                  />
                  {/* Petal E (Bottom Left) */}
                  <path
                    d="M250,250 C180,380 120,340 180,290 C220,250 240,240 250,250 Z"
                    fill="url(#petalGrad1_trans)"
                    transform="rotate(216 250 250)"
                    className="opacity-95"
                  />
                  {/* Petal A (Left Centre overlapping) */}
                  <path
                    d="M250,250 C120,280 80,220 140,180 C180,150 220,200 250,250 Z"
                    fill="url(#petalGrad2_trans)"
                    transform="rotate(288 250 250)"
                    className="opacity-95"
                  />

                  {/* Overlapping Petal center core vein networks */}
                  <path d="M250,250 Q210,190 190,205" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                  <path d="M250,250 Q290,170 275,175" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                  <path d="M250,250 Q310,290 295,295" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                  <path d="M250,250 Q190,310 205,295" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />
                  <path d="M250,250 Q160,210 175,200" stroke="#ffe0eb" strokeWidth="2" fill="none" className="opacity-40" />

                  {/* Deep Flower Heart */}
                  <circle cx="250" cy="250" r="32" fill="url(#stamenGlow_trans)" className="opacity-90" />
                  <circle cx="250" cy="250" r="16" fill="#4d0019" />

                  {/* Master Pistil / Long Crimson Stamen Column */}
                  <path
                    d="M250,250 C290,210 380,180 410,140"
                    stroke="url(#petalGrad1_trans)"
                    strokeWidth="11"
                    strokeLinecap="round"
                    fill="none"
                  />
                  
                  {/* Intricate detailed Stamen vein line */}
                  <path
                    d="M255,245 C295,205 382,178 408,139"
                    stroke="#ff5a92"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    className="opacity-80"
                  />

                  {/* Pollen anthers cluster radiating from column tip */}
                  <g>
                    <circle cx="415" cy="135" r="75" fill="none" />
                    
                    <circle cx="415" cy="133" r="7" fill="#8d0537" />
                    <circle cx="425" cy="138" r="6" fill="#8d0537" />
                    <circle cx="410" cy="145" r="6" fill="#8d0537" />
                    <circle cx="422" cy="128" r="5" fill="#a00841" />
                    <circle cx="403" cy="135" r="5" fill="#a00841" />

                    {/* Radiant anthers */}
                    <path d="M370,180 Q365,165 355,160" stroke="#f23d80" strokeWidth="2" fill="none" />
                    <circle cx="355" cy="160" r="5" fill="url(#antherGrad_trans)" />
                    <path d="M380,170 Q382,150 376,145" stroke="#f23d80" strokeWidth="2" fill="none" />
                    <circle cx="376" cy="145" r="5.5" fill="url(#antherGrad_trans)" />
                    <path d="M390,160 Q400,143 400,138" stroke="#f23d80" strokeWidth="2" fill="none" />
                    <circle cx="400" cy="138" r="5" fill="url(#antherGrad_trans)" />
                    <path d="M360,190 Q347,185 342,185" stroke="#f23d80" strokeWidth="2" fill="none" />
                    <circle cx="342" cy="185" r="4.5" fill="url(#antherGrad_trans)" />
                    <path d="M385,165 Q395,178 398,185" stroke="#f23d80" strokeWidth="2" fill="none" />
                    <circle cx="398" cy="185" r="5" fill="url(#antherGrad_trans)" />
                    <path d="M350,200 Q335,195 330,205" stroke="#f23d80" strokeWidth="2" fill="none" />
                    <circle cx="330" cy="205" r="4.5" fill="url(#antherGrad_trans)" />
                    <path d="M365,182 Q354,178 348,170" stroke="#f23d80" strokeWidth="2" fill="none" />
                    <circle cx="348" cy="170" r="4.8" fill="url(#antherGrad_trans)" />
                  </g>
                </g>
              </svg>
            </motion.div>

            {/* Subtle, beautiful text loader fading away */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 0.7, 0] }}
              transition={{ duration: 2.8, times: [0, 0.3, 1] }}
              className="absolute bottom-16 z-20"
            >
              <p className="font-serif text-[12px] tracking-[0.4em] uppercase text-pink-200/50">
                Letting the celebration bloom
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
