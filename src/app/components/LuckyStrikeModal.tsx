import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import Illustration from '../imports/Illustration-81-490';
import ChristmasIllustration from '../imports/Illustration-114-175';

interface LuckyStrikeModalProps {
  christmasMode?: boolean;
  onClose: () => void;
}

export function LuckyStrikeModal({ christmasMode, onClose }: LuckyStrikeModalProps) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  useEffect(() => {
    // Trigger confetti celebration
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, scalar: 1.5 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="relative w-[90vw] max-w-[800px] aspect-[1330/965] animate-in fade-in zoom-in duration-300"
      >
        {christmasMode ? <ChristmasIllustration /> : <Illustration />}
      </div>
    </div>
  );
}