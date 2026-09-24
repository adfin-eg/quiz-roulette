import { motion } from 'motion/react';

interface FallingPiece {
  id: number;
  color: string;
  width: number;
  height: number;
  startX: number;
  duration: number;
  delay: number;
  rotation: number;
}

// Muted colors for a "loading" vibe instead of "party"
const COLORS = [
  '#5A6FFF', // Brighter blue
  '#7B8AFF', // Light brighter blue
  '#9BA9FF', // Very light blue
  '#4D5DC8', // Dark blue
  '#6C7BDE', // Medium blue
  '#808EFF', // Accent blue
];

const generateFallingPieces = (count: number): FallingPiece[] => {
  const pieces: FallingPiece[] = [];
  
  for (let i = 0; i < count; i++) {
    // Vary the size slightly (small rectangles)
    const isWide = Math.random() > 0.5;
    
    pieces.push({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: isWide ? 16 : 12,
      height: isWide ? 12 : 20,
      startX: Math.random() * 100,
      duration: 2.5 + Math.random() * 1.5, // 2.5-4 seconds
      delay: -(Math.random() * 3.5), // Negative delay to start mid-animation
      rotation: (Math.random() - 0.5) * 90, // -45 to +45 degrees
    });
  }
  
  return pieces;
};

export function ConfettiRainLoading() {
  const pieces = generateFallingPieces(25);

  return (
    <div className="absolute inset-0 z-50 bg-[#071277] overflow-hidden flex items-center justify-center">
      {/* Falling confetti rain */}
      {pieces.map((piece) => {
        return (
          <motion.div
            key={piece.id}
            className="absolute"
            initial={{
              top: '-10%',
              left: `${piece.startX}%`,
            }}
            animate={{
              top: '110%',
            }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              willChange: 'transform',
              transform: `translateZ(0) rotate(${piece.rotation}deg)`,
              opacity: 0.85,
            }}
          />
        );
      })}

      {/* Loading text and content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="text-center">
          <p className="font-['Eczar',sans-serif] font-medium text-[clamp(2rem,5vw,4rem)] text-white normal-case">
            Loading quiz
            <span className="inline-block ml-1">
              <span className="inline-block animate-pulse" style={{ animationDelay: '0s' }}>.</span>
              <span className="inline-block animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="inline-block animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}