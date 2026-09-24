import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import ThumbsDown from '../imports/Vector-26-7';
import ThumbsUp from '../imports/Vector-26-11';
import LuckyStrikeIcon from '../imports/Vector-53-230';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface QuestionViewProps {
  category: string;
  value: number;
  question: string;
  answer: string;
  questionImageUrl?: string;
  answerImageUrl?: string;
  alternatives?: string[];
  activePlayerId: number;
  activePlayerName: string;
  playerIndex: number;
  isLuckyStrike?: boolean;
  onGoBack: () => void;
  onUpdateScore: (teamId: number, amount: number) => void;
  onAdvancePlayer: () => void;
  onMarkAsAnswered: () => void;
}

const WRONG_RESPONSES = ["Oops...", "Ouch :/", "Whoopsie...", "Try again...", "Aw, beans…"];
const CORRECT_RESPONSES = ["Woo-hoo!", "Nailed it!", "Niiice!", "Level up!", "High five!"];

export function QuestionView({ category, value, question, answer, questionImageUrl, answerImageUrl, alternatives, activePlayerId, activePlayerName, playerIndex, isLuckyStrike, onGoBack, onUpdateScore, onAdvancePlayer, onMarkAsAnswered }: QuestionViewProps) {
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [answered, setAnswered] = useState(false);
  
  // Player colors (1-8)
  const playerColors = [
    '#08FF8C', // 1 - bright green
    '#FF3FDF', // 2 - bright pink
    '#FFFF28', // 3 - bright yellow
    '#FF6600', // 4 - orange
    '#00FFFF', // 5 - cyan
    '#96A0FF', // 6 - light purple
    '#08FF8C', // 7 - bright green
    '#FC3402', // 8 - red-orange
  ];

  const playerColor = playerColors[playerIndex] || '#fdc065';
  
  // Pick random responses when component mounts
  const wrongText = useMemo(() => WRONG_RESPONSES[Math.floor(Math.random() * WRONG_RESPONSES.length)], []);
  const correctText = useMemo(() => CORRECT_RESPONSES[Math.floor(Math.random() * CORRECT_RESPONSES.length)], []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Allow space, enter, or right arrow to show answer
      if ((e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') && !showingAnswer) {
        e.preventDefault(); // Prevent page scroll
        setShowingAnswer(true);
      }
      
      // When showing answer, use arrow keys for wrong/right
      if (showingAnswer) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleWrong({ stopPropagation: () => {} } as React.MouseEvent);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleCorrect({ stopPropagation: () => {} } as React.MouseEvent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showingAnswer, activePlayerId, value]);

  const handleClick = () => {
    if (!showingAnswer) {
      setShowingAnswer(true);
    }
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showingAnswer) {
      setShowingAnswer(false);
    } else {
      onGoBack();
    }
  };

  const handleWrong = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (answered) return; // Prevent multiple clicks
    setAnswered(true);
    
    // Lucky Strike: always lose normal value (not doubled)
    onUpdateScore(activePlayerId, -value);
    onAdvancePlayer();
    onMarkAsAnswered();
    onGoBack();
  };

  const handleCorrect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (answered) return; // Prevent multiple clicks
    setAnswered(true);
    
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

    // Lucky Strike: double the points for correct answer
    const scoreValue = isLuckyStrike ? value * 2 : value;
    onUpdateScore(activePlayerId, scoreValue);
    onAdvancePlayer();
    onMarkAsAnswered();
    
    // Delay returning to game board to show confetti on answer page
    setTimeout(() => {
      onGoBack();
    }, 1600);
  };

  return (
    <div 
      className="bg-[#071277] h-screen w-screen overflow-hidden relative uppercase flex items-center justify-center"
      onClick={handleClick}
    >
      {/* Player Name */}
      {!showingAnswer && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <p 
            className="font-['Roboto_Condensed',sans-serif] font-bold text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase"
            style={{ color: playerColor }}
          >
            {activePlayerName}
          </p>
        </div>
      )}

      {/* Question/Answer Text or Image */}
      <div className="flex flex-col justify-center items-center px-8 max-w-[1200px] w-full p-[0px]">
        {/* Lucky Strike Icon */}
        {isLuckyStrike && !showingAnswer && (
          <div className="w-[clamp(5.5rem,10.8vw,8.1rem)] aspect-[413/366] mb-[clamp(1.5rem,4vh,4rem)] animate-in fade-in zoom-in duration-500">
            <LuckyStrikeIcon />
          </div>
        )}
        
        {/* Display text and/or image */}
        {showingAnswer ? (
          <div className="flex flex-col items-center w-full gap-[clamp(1.5rem,3vh,3rem)]">
            {answer && (
              <p className="font-['Eczar',sans-serif] font-medium leading-[1.3] text-[clamp(1rem,5vw,5rem)] text-center text-white p-[0px] normal-case">
                {answer}
              </p>
            )}
            {answerImageUrl && (
              <ImageWithFallback 
                src={answerImageUrl} 
                alt="Answer" 
                className="w-auto object-contain max-w-full mb-[clamp(2rem,6vh,5rem)]"
                style={{ 
                  maxHeight: 'clamp(200px, 35vh, 600px)'
                }}
              />
            )}
            
            {/* Thumbs buttons - adaptive positioning */}
            <div 
              className="flex gap-[clamp(3rem,20vw,24rem)] items-end flex-shrink-0"
              style={{ 
                marginTop: answerImageUrl ? 'clamp(2rem, 5vh, 4rem)' : 'clamp(6rem, 12vh, 10rem)' 
              }}
            >
              <button className="w-[clamp(50px,8vw,80px)] aspect-[506/555] flex-shrink-0 cursor-pointer transition-transform hover:scale-110 active:scale-95 relative top-[2px]" onClick={handleWrong}>
                <ThumbsDown />
              </button>
              <button className="w-[clamp(50px,8vw,80px)] aspect-[506/555] flex-shrink-0 cursor-pointer transition-transform hover:scale-110 active:scale-95" onClick={handleCorrect}>
                <ThumbsUp />
              </button>
            </div>
          </div>
        ) : (
          <>
            {question && (
              <p className="font-['Eczar',sans-serif] font-medium leading-[1.3] text-[clamp(1rem,5vw,5rem)] text-center text-white p-[0px] normal-case mb-12">
                {question}
              </p>
            )}
            {alternatives && alternatives.length > 0 && (
              <div className="w-full gap-4 grid grid-cols-1 md:grid-cols-2 max-w-[450px] md:max-w-[900px] mb-12">
                {alternatives.map((alt, index) => {
                  // Split the alternative into letter and text (e.g., "A) Red" -> ["A)", "Red"])
                  const match = alt.match(/^([A-D]\))\s*(.*)$/);
                  const letter = match?.[1] || '';
                  const text = match?.[2] || alt;
                  
                  return (
                    <p key={index} className="text-white text-left text-[24px] font-['Roboto_Condensed',sans-serif] normal-case border-2 border-[#707EFF] px-6 py-4 rounded-lg">
                      <span className="text-[#fdc065]">{letter}</span> {text}
                    </p>
                  );
                })}
              </div>
            )}
            {questionImageUrl && (
              <ImageWithFallback 
                src={questionImageUrl} 
                alt="Question" 
                className="w-auto object-contain max-w-full mb-[clamp(2rem,6vh,5rem)]"
                style={{ 
                  maxHeight: 'clamp(200px, 35vh, 600px)'
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      {!showingAnswer && (
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase text-center whitespace-nowrap">
          PRESS <span className="text-white">[SPACE]</span> TO SEE ANSWER
        </p>
      )}
    </div>
  );
}