import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import TrophyVector from '../imports/Vector-10-254';

interface Team {
  id: number;
  name: string;
  score: number;
}

interface WinnerViewProps {
  teams: Team[];
  onRestart: () => void;
}

export function WinnerView({ teams, onRestart }: WinnerViewProps) {
  const [isConfettiPlaying, setIsConfettiPlaying] = useState(true);
  const [showContent, setShowContent] = useState(false);
  
  // Find the winner (highest score)
  const winner = teams.reduce((prev, current) => 
    current.score > prev.score ? current : prev
  );

  // Check if there's a tie
  const topScore = winner.score;
  const winners = teams.filter(team => team.score === topScore);
  const isTie = winners.length > 1;

  // Convert name to title case (capitalize first letter only, preserve rest)
  const toTitleCase = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Format multiple winner names with commas and ampersand
  const formatWinnerNames = (winners: Team[]) => {
    const names = winners.map(w => toTitleCase(w.name));
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(' & ');
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  };

  useEffect(() => {
    // Wait before showing content
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    // Trigger confetti celebration after delay
    const confettiTimer = setTimeout(() => {
      const duration = 5000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, scalar: 2 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          setIsConfettiPlaying(false);
          return clearInterval(interval);
        }

        const particleCount = 100 * (timeLeft / duration);
        
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
    }, 500);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(confettiTimer);
    };
  }, []);

  const handleClick = () => {
    onRestart();
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R') {
      if (e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
      }
      onRestart();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div 
      className="bg-[#071277] h-screen w-screen overflow-hidden relative flex items-center justify-center cursor-pointer"
      onClick={handleClick}
    >
      {/* Top Text */}
      <p className="absolute left-1/2 -translate-x-1/2 top-8 font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase">
        THE <span className="text-white">WINNER</span> IS
      </p>

      {/* Winner Text */}
      <div className="flex flex-col justify-center items-center px-8 max-w-[1200px] w-full -translate-y-[10%] gap-10">
        {showContent && (
          <>
            <div 
              className="w-[120px] h-[130px]"
              style={{
                animation: isConfettiPlaying ? 'rock 1s ease-in-out infinite' : 'none',
              }}
            >
              <TrophyVector />
            </div>
            <p className="font-['Eczar',sans-serif] font-medium leading-[1.12] text-[clamp(3rem,8vw,8rem)] text-center text-white p-[0px]">
              {isTie ? formatWinnerNames(winners) : toTitleCase(winner.name)}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes rock {
          0%, 100% {
            transform: rotate(-8deg);
          }
          50% {
            transform: rotate(8deg);
          }
        }
      `}</style>

      {/* Instructions */}
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase text-center whitespace-nowrap">
        PRESS <span className="text-white">[R]</span> TO RESTART
      </p>
    </div>
  );
}