import { useEffect, useState } from 'react';
import Vector from '../imports/Vector';
import ChristmasVector from '../imports/Vector-114-337';
import { Switch } from './ui/switch';
import { Snowflake } from 'lucide-react';
import confetti, { type Shape } from 'canvas-confetti';

interface SplashScreenProps {
  christmasMode: boolean;
  onToggleChristmasMode: () => void;
  onComplete: () => void;
}

export function SplashScreen({ christmasMode, onToggleChristmasMode, onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  const handleStart = () => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete();
    }, 200);
  };

  // Trigger sparkle effect when Christmas mode is enabled
  useEffect(() => {
    if (!christmasMode) return;

    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 10,
      shapes: ['star'] as Shape[],
      colors: ['#FFFFFF', '#FDC065', '#FFD700'],
      scalar: 0.6
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      confetti({
        ...defaults,
        particleCount: 3,
        origin: {
          x: randomInRange(0.1, 0.9),
          y: randomInRange(0.1, 0.9)
        }
      });
    }, 100);

    // Clear interval after animation completes
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [christmasMode]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        handleStart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div 
      className={`fixed inset-0 bg-[#071277] flex items-center justify-center transition-opacity duration-200 cursor-pointer overflow-hidden ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleStart}
    >
      {/* Top Center Text */}
      <p className="absolute left-1/2 -translate-x-1/2 top-8 font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase z-30">
        <span className="text-white">TEAM</span> HAWKEYE<span className="text-white">'S</span>
      </p>

      {/* Static Confetti Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Left Cluster */}
        <div className="absolute top-[13%] left-[9%] w-3 h-6 bg-[#FF1493] rotate-[25deg]" />
        <div className="absolute top-[22%] left-[12%] w-4 h-4 bg-[#00FFFF] rotate-[-15deg]" />
        <div className="absolute top-[11%] left-[16%] w-3 h-5 bg-[#FFFF00] rotate-[45deg]" />
        <div className="absolute top-[27%] left-[7%] w-4 h-3 bg-[#00FF00] rotate-[-30deg]" />
        <div className="absolute top-[17%] left-[14%] w-3 h-4 bg-[#FF6600] rotate-[60deg]" />
        
        {/* Top Right Cluster */}
        <div className="absolute top-[15%] right-[10%] w-4 h-5 bg-[#FF00FF] rotate-[-25deg]" />
        <div className="absolute top-[22%] right-[8%] w-3 h-3 bg-[#0000FF] rotate-[35deg]" />
        <div className="absolute top-[10%] right-[15%] w-4 h-6 bg-[#FF0000] rotate-[-45deg]" />
        <div className="absolute top-[28%] right-[12%] w-3 h-4 bg-[#00FF88] rotate-[20deg]" />
        <div className="absolute top-[17%] right-[5%] w-4 h-4 bg-[#FFAA00] rotate-[-50deg]" />
        
        {/* Middle Left */}
        <div className="absolute top-[45%] left-[5%] w-3 h-5 bg-[#FF1493] rotate-[15deg]" />
        <div className="absolute top-[50%] left-[8%] w-4 h-3 bg-[#00FFFF] rotate-[-40deg]" />
        <div className="absolute top-[55%] left-[3%] w-3 h-6 bg-[#FFFF00] rotate-[55deg]" />
        
        {/* Middle Right */}
        <div className="absolute top-[45%] right-[5%] w-4 h-5 bg-[#00FF00] rotate-[-20deg]" />
        <div className="absolute top-[52%] right-[8%] w-3 h-4 bg-[#FF6600] rotate-[40deg]" />
        <div className="absolute top-[48%] right-[3%] w-4 h-4 bg-[#FF00FF] rotate-[-35deg]" />
        
        {/* Bottom Left Cluster */}
        <div className="absolute bottom-[18%] left-[9%] w-3 h-5 bg-[#0000FF] rotate-[30deg]" />
        <div className="absolute bottom-[26%] left-[13%] w-4 h-4 bg-[#FF0000] rotate-[-25deg]" />
        <div className="absolute bottom-[13%] left-[17%] w-3 h-6 bg-[#00FF88] rotate-[50deg]" />
        <div className="absolute bottom-[31%] left-[6%] w-4 h-3 bg-[#FFAA00] rotate-[-15deg]" />
        
        {/* Bottom Right Cluster */}
        <div className="absolute bottom-[22%] right-[14%] w-4 h-6 bg-[#FF1493] rotate-[-30deg]" />
        <div className="absolute bottom-[16%] right-[9%] w-3 h-3 bg-[#00FFFF] rotate-[25deg]" />
        <div className="absolute bottom-[29%] right-[11%] w-4 h-5 bg-[#FFFF00] rotate-[-45deg]" />
        <div className="absolute bottom-[19%] right-[6%] w-3 h-4 bg-[#00FF00] rotate-[35deg]" />
        
        {/* Around Center (Behind Logo) */}
        <div className="absolute top-[35%] left-[20%] w-3 h-4 bg-[#FF6600] rotate-[20deg] opacity-70" />
        <div className="absolute top-[40%] left-[25%] w-4 h-3 bg-[#FF00FF] rotate-[-35deg] opacity-60" />
        <div className="absolute top-[38%] right-[22%] w-3 h-5 bg-[#0000FF] rotate-[45deg] opacity-70" />
        <div className="absolute top-[42%] right-[28%] w-4 h-4 bg-[#FF0000] rotate-[-20deg] opacity-60" />
      </div>

      <div className={`${christmasMode ? 'w-[min(90vw,648px)]' : 'w-[min(90vw,600px)]'} ${christmasMode ? 'aspect-[783/565]' : 'aspect-[745/551]'} animate-[zoomIn_0.7s_cubic-bezier(0.34,1.56,0.64,1)_0.15s_backwards] -translate-y-[4%] relative z-10 transition-all duration-300 hover:scale-105`}>
        {christmasMode ? <ChristmasVector /> : <Vector />}
      </div>
      
      {/* Some confetti in front of logo */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-[32%] left-[30%] w-3 h-5 bg-[#00FFFF] rotate-[40deg]" />
        <div className="absolute top-[36%] right-[32%] w-4 h-4 bg-[#FFFF00] rotate-[-30deg]" />
        <div className="absolute top-[60%] left-[35%] w-3 h-4 bg-[#FF1493] rotate-[25deg]" />
        <div className="absolute top-[58%] right-[38%] w-4 h-3 bg-[#00FF00] rotate-[-40deg]" />
      </div>

      {/* Christmas Mode Toggle - moves below logo on small screens */}
      <div 
        className="absolute z-30 pointer-events-auto flex items-center gap-4 scale-125 
                   max-[600px]:bottom-32 max-[600px]:left-1/2 max-[600px]:-translate-x-1/2
                   min-[601px]:bottom-[2.15rem] min-[601px]:left-16"
        onClick={(e) => e.stopPropagation()}
      >
        <Snowflake className="w-6 h-6 text-white" />
        <Switch 
          checked={christmasMode}
          onCheckedChange={onToggleChristmasMode}
          aria-label="Toggle Christmas Mode"
          className="data-[state=checked]:bg-[#707EFF] data-[state=unchecked]:bg-black ring-2 ring-white ring-offset-2 ring-offset-[#071277]"
        />
      </div>
      
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase text-center whitespace-nowrap z-30">
        PRESS <span className="text-white">[SPACE]</span> TO START
      </p>
    </div>
  );
}