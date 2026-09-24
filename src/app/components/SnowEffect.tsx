import { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  size: number;
  delay: number;
}

export function SnowEffect() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Generate 50 snowflakes with random properties
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 50; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 10 + Math.random() * 20, // 10-30 seconds
        size: 2 + Math.random() * 4, // 2-6px
        delay: Math.random() * 5, // 0-5 seconds delay
      });
    }
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute animate-snow-fall"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            backgroundColor: 'white',
            borderRadius: '50%',
            opacity: 0.8,
            animationDuration: `${flake.animationDuration}s`,
            animationDelay: `${flake.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
