import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import Illustration from '../imports/Illustration-68-111';
import ChristmasIllustration from '../imports/Illustration-113-507';

interface BanditModalProps {
  christmasMode?: boolean;
  onClose: () => void;
}

export function BanditModal({ christmasMode, onClose }: BanditModalProps) {
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
    // Trigger smoke effect
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 3;
      
      // Create smoke-like particles from bottom
      confetti({
        particleCount,
        startVelocity: randomInRange(10, 25),
        spread: randomInRange(50, 90),
        angle: randomInRange(60, 120),
        origin: { x: randomInRange(0.1, 0.3), y: 0.9 },
        colors: ['#CCD3D2'],
        ticks: 200,
        gravity: randomInRange(-0.3, -0.1),
        scalar: randomInRange(1.2, 2.5),
        drift: randomInRange(-0.5, 0.5),
        shapes: ['circle'],
        zIndex: 9999,
      });
      confetti({
        particleCount,
        startVelocity: randomInRange(10, 25),
        spread: randomInRange(50, 90),
        angle: randomInRange(60, 120),
        origin: { x: randomInRange(0.7, 0.9), y: 0.9 },
        colors: ['#CCD3D2'],
        ticks: 200,
        gravity: randomInRange(-0.3, -0.1),
        scalar: randomInRange(1.2, 2.5),
        drift: randomInRange(-0.5, 0.5),
        shapes: ['circle'],
        zIndex: 9999,
      });
      // Center smoke
      confetti({
        particleCount: 2,
        startVelocity: randomInRange(15, 30),
        spread: randomInRange(40, 80),
        angle: 90,
        origin: { x: 0.5, y: 0.9 },
        colors: ['#CCD3D2'],
        ticks: 200,
        gravity: randomInRange(-0.3, -0.1),
        scalar: randomInRange(1.5, 3),
        drift: randomInRange(-0.3, 0.3),
        shapes: ['circle'],
        zIndex: 9999,
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="relative w-[90vw] max-w-[800px] aspect-[1346/919] animate-in fade-in zoom-in duration-300"
      >
        {christmasMode ? <ChristmasIllustration /> : <Illustration />}
      </div>
    </div>
  );
}