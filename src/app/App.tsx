import { useState, useEffect } from 'react';
import { CategoryColumn } from './components/CategoryColumn';
import { TeamScore } from './components/TeamScore';
import { QuestionView } from './components/QuestionView';
import { SplashScreen } from './components/SplashScreen';
import { SetupView, GameData } from './components/SetupView';
import { WinnerView } from './components/WinnerView';
import { LuckyStrikeModal } from './components/LuckyStrikeModal';
import { BanditModal } from './components/BanditModal';
import { JeopardyTile } from './components/JeopardyTile';

const VALUES = [200, 400, 600, 800, 1000];

interface Team {
  id: number;
  name: string;
  score: number;
}

interface SelectedQuestion {
  category: string;
  value: number;
}

interface LuckyStrikeTile {
  category: string;
  value: number;
}

interface BanditTile {
  category: string;
  value: number;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [christmasMode, setChristmasMode] = useState(false);
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: 'Name 1', score: 0 },
    { id: 2, name: 'Name 2', score: 0 },
    { id: 3, name: 'Name 3', score: 0 },
    { id: 4, name: 'Name 4', score: 0 },
  ]);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null);
  const [focusedTeamId, setFocusedTeamId] = useState<number>(1);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [showWinner, setShowWinner] = useState(false);
  const [savedPlayerNames, setSavedPlayerNames] = useState<string[]>([]);
  const [showLuckyStrike, setShowLuckyStrike] = useState(false);
  const [luckyStrikeTile, setLuckyStrikeTile] = useState<LuckyStrikeTile | null>(null);
  const [luckyStrikeRevealed, setLuckyStrikeRevealed] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<SelectedQuestion | null>(null);
  const [showBandit, setShowBandit] = useState(false);
  const [banditTile, setBanditTile] = useState<BanditTile | null>(null);
  const [banditRevealed, setBanditRevealed] = useState(false);
  const [activePlayerScoreBeforeQuestion, setActivePlayerScoreBeforeQuestion] = useState<number>(0);
  const [questionsAnsweredCount, setQuestionsAnsweredCount] = useState<number>(0);

  // Set favicon
  useEffect(() => {
    const faviconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 506 555">
        <path d="M412.649 289.542C411.159 290.822 418.279 292.012 418.769 292.172C436.039 298.172 446.729 311.672 442.419 330.552C438.279 348.682 422.269 355.402 404.909 354.022C402.769 353.852 400.129 352.842 398.159 352.722C396.329 352.612 395.989 354.042 397.499 354.932C399.189 355.932 402.529 356.732 404.509 357.922C426.269 371.002 422.489 403.882 398.919 412.542C389.639 415.952 383.299 414.112 374.169 413.232C373.289 413.152 372.819 412.782 372.169 413.782L383.829 420.612C405.469 437.732 393.559 472.332 366.409 474.522C360.849 474.972 355.489 473.812 350.069 472.872C267.819 458.682 185.649 437.582 103.449 422.492C76.5888 416.472 57.7488 393.402 60.2288 365.342C68.3788 315.572 82.5988 265.802 90.5288 216.142C90.7188 214.932 90.6988 213.742 90.6688 212.532C99.2188 214.452 108.389 217.082 117.069 218.372C140.589 221.862 146.379 207.002 158.159 191.282C173.609 170.672 189.259 153.222 208.649 136.272C228.039 119.322 262.079 96.2121 269.409 70.5321C273.269 57.0221 271.219 39.1121 291.409 40.0321C310.529 40.8921 327.249 55.9121 328.679 75.2621C330.809 103.992 318.339 133.052 302.569 156.182C296.369 165.272 283.589 178.052 283.629 189.282C283.639 193.302 287.859 199.232 291.399 201.052C333.729 210.962 376.739 218.462 419.269 227.682C442.489 233.352 453.589 260.882 436.919 279.542C434.019 282.792 424.149 289.532 419.909 289.532H412.659L412.649 289.542Z" fill="#35BB71"/>
        <path d="M258.188 8.97762C269.745 1.46159 282.318 -0.419069 293.205 0.0733257L293.206 0.0723492C293.208 0.0724358 293.21 0.073239 293.212 0.0733257C293.217 0.0735908 293.223 0.0730593 293.229 0.0733257L293.228 0.0743023C331.028 1.78553 365.531 31.2566 368.569 72.3048L368.698 74.2491C370.863 111.134 356.72 145.24 340.726 170.885C368.87 176.675 396.796 181.881 427.743 188.59L428.252 188.7L428.758 188.824C471.836 199.344 500.542 249.878 476.608 292.48C483.612 306.989 485.101 323.311 481.416 339.454L481.415 339.457C477.87 354.98 469.835 367.86 458.717 377.207C460.478 399.056 452.119 421.546 435.176 436.663C438.365 473.53 410.335 511.109 369.625 514.393L369.624 514.392C357.713 515.353 346.119 512.785 343.233 512.284C301.161 505.025 259.285 496.029 218.242 487.107C176.928 478.125 136.547 469.237 96.2263 461.835L95.4607 461.694L94.7009 461.524C50.1974 451.549 15.9701 411.756 20.3835 361.82L20.5144 360.343L20.7546 358.878C25.0502 332.646 30.9141 306.603 36.4265 281.967C41.8433 257.758 46.9373 234.837 50.6482 212.189L49.4099 162.271L99.4324 173.504C108.651 175.574 113.574 177.002 118.508 178.016C119.278 176.928 120.105 175.74 121.197 174.178C122.58 172.201 124.267 169.807 126.149 167.295L126.153 167.29C143.009 144.804 160.52 125.216 182.323 106.156C187.792 101.375 194.429 96.044 199.914 91.5421C205.811 86.7017 211.275 82.1044 216.198 77.4903C227.244 67.1371 230.459 61.2556 230.945 59.5528L230.948 59.5431C231.245 58.5021 231.392 57.538 232.316 52.5899C232.979 49.044 234.314 41.8819 237.302 34.63C240.539 26.7767 246.615 16.5043 258.188 8.97762ZM291.409 40.0321C271.219 39.1121 273.269 57.0221 269.409 70.5321C262.079 96.2121 228.039 119.322 208.649 136.272L206.842 137.862C188.281 154.316 173.126 171.316 158.159 191.282C146.379 207.002 140.589 221.862 117.069 218.372C108.389 217.082 99.2188 214.452 90.6688 212.532C90.6988 213.742 90.7188 214.932 90.5288 216.142C82.5988 265.802 68.3788 315.572 60.2288 365.342C57.7488 393.402 76.5888 416.472 103.449 422.492C185.649 437.582 267.819 458.682 350.069 472.872C355.489 473.812 360.849 474.972 366.409 474.522C393.559 472.332 405.469 437.732 383.829 420.612L372.169 413.782C372.819 412.782 373.289 413.152 374.169 413.232C383.299 414.112 389.639 415.952 398.919 412.542C422.489 403.882 426.269 371.002 404.509 357.922C402.529 356.732 399.189 355.932 397.499 354.932C395.989 354.042 396.329 352.612 398.159 352.722C400.129 352.842 402.769 353.852 404.909 354.022C421.997 355.38 437.778 348.89 442.216 331.394L442.419 330.552C446.729 311.672 436.039 298.172 418.769 292.172C418.276 292.012 411.16 290.822 412.649 289.542L412.659 289.532H419.909L420.111 289.527C424.455 289.323 434.064 282.741 436.919 279.542C453.589 260.882 442.489 233.352 419.269 227.682C376.739 218.462 333.729 210.962 291.399 201.052C287.969 199.289 283.901 193.668 283.641 189.664L283.629 189.282C283.589 178.052 296.369 165.272 302.569 156.182C318.339 133.052 330.809 103.992 328.679 75.2621C327.271 56.2148 311.047 41.3631 292.303 40.0831L291.409 40.0321Z" fill="white"/>
      </svg>
    `;
    
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    favicon.type = 'image/svg+xml';
    favicon.rel = 'icon';
    favicon.href = 'data:image/svg+xml,' + encodeURIComponent(faviconSvg);
    
    if (!document.querySelector("link[rel*='icon']")) {
      document.head.appendChild(favicon);
    }
  }, []);

  const updateScore = (teamId: number, amount: number) => {
    setTeams(prevTeams =>
      prevTeams.map(team =>
        team.id === teamId
          ? { ...team, score: team.score + amount }
          : team
      )
    );
  };

  const advanceToNextPlayer = () => {
    setFocusedTeamId(prevId => {
      const currentIndex = teams.findIndex(team => team.id === prevId);
      const nextIndex = (currentIndex + 1) % teams.length;
      return teams[nextIndex].id;
    });
  };

  const markQuestionAsAnswered = () => {
    if (selectedQuestion) {
      const questionKey = `${selectedQuestion.category}-${selectedQuestion.value}`;
      setAnsweredQuestions(prev => new Set(prev).add(questionKey));
      const newCount = questionsAnsweredCount + 1;
      setQuestionsAnsweredCount(newCount);
      
      // Assign Lucky Strike tile after 5 questions answered (if not already assigned)
      if (newCount === 5 && !luckyStrikeTile && gameData) {
        const unansweredTiles: {category: string, value: number}[] = [];
        gameData.categories.forEach(cat => {
          VALUES.forEach(val => {
            const key = `${cat.title}-${val}`;
            if (!answeredQuestions.has(key) && key !== questionKey) {
              unansweredTiles.push({ category: cat.title, value: val });
            }
          });
        });
        
        if (unansweredTiles.length > 0) {
          const randomTile = unansweredTiles[Math.floor(Math.random() * unansweredTiles.length)];
          setLuckyStrikeTile(randomTile);
        }
      }
      
      // Assign Bandit tile after 10 questions answered (if not already assigned)
      if (newCount === 10 && !banditTile && gameData) {
        const unansweredTiles: {category: string, value: number}[] = [];
        gameData.categories.forEach(cat => {
          VALUES.forEach(val => {
            const key = `${cat.title}-${val}`;
            if (!answeredQuestions.has(key) && key !== questionKey) {
              // Also ensure it's not the Lucky Strike tile
              if (!luckyStrikeTile || luckyStrikeTile.category !== cat.title || luckyStrikeTile.value !== val) {
                unansweredTiles.push({ category: cat.title, value: val });
              }
            }
          });
        });
        
        if (unansweredTiles.length > 0) {
          const randomTile = unansweredTiles[Math.floor(Math.random() * unansweredTiles.length)];
          setBanditTile(randomTile);
        }
      }
    }
  };

  const isQuestionAnswered = (category: string, value: number) => {
    const questionKey = `${category}-${value}`;
    return answeredQuestions.has(questionKey);
  };

  const isTileDisabled = (category: string, value: number) => {
    // Only disable if already answered
    return isQuestionAnswered(category, value);
  };

  const handleTileClick = (category: string, value: number) => {
    // Save the active player's current score before they see the question
    const currentPlayer = teams.find(team => team.id === focusedTeamId);
    if (currentPlayer) {
      setActivePlayerScoreBeforeQuestion(currentPlayer.score);
    }

    // Lucky Strike triggers after 5 questions, Bandit triggers after 10 questions
    const luckyStrikeEnabled = questionsAnsweredCount >= 5;
    const banditEnabled = questionsAnsweredCount >= 10;

    // Check if this tile is the Bandit and hasn't been revealed yet
    if (
      banditEnabled &&
      banditTile &&
      !banditRevealed &&
      banditTile.category === category &&
      banditTile.value === value
    ) {
      // Show Bandit modal first
      setBanditRevealed(true);
      setShowBandit(true);
      // Store the selected question to show after modal closes
      setPendingQuestion({ category, value });
      return;
    }

    // Check if this tile is the Lucky Strike and hasn't been revealed yet
    if (
      luckyStrikeEnabled &&
      luckyStrikeTile &&
      !luckyStrikeRevealed &&
      luckyStrikeTile.category === category &&
      luckyStrikeTile.value === value
    ) {
      // Show Lucky Strike modal first
      setLuckyStrikeRevealed(true);
      setShowLuckyStrike(true);
      // Store the selected question to show after modal closes
      setPendingQuestion({ category, value });
    } else {
      // Regular question - just select it
      setSelectedQuestion({ category, value });
    }
  };

  // Check if all questions are answered
  useEffect(() => {
    if (gameData && !showSplash && !showSetup) {
      const totalQuestions = gameData.categories.length * VALUES.length;
      if (answeredQuestions.size === totalQuestions && answeredQuestions.size > 0) {
        setShowWinner(true);
      }
    }
  }, [answeredQuestions, gameData, showSplash, showSetup]);

  const handleRestart = () => {
    // Reset all game state
    setShowWinner(false);
    setShowSplash(true);
    setShowSetup(false);
    setGameData(null);
    setSelectedQuestion(null);
    setAnsweredQuestions(new Set());
    setFocusedTeamId(1);
    setTeams([
      { id: 1, name: 'Name 1', score: 0 },
      { id: 2, name: 'Name 2', score: 0 },
      { id: 3, name: 'Name 3', score: 0 },
      { id: 4, name: 'Name 4', score: 0 },
    ]);
    setSavedPlayerNames([]);
    setShowLuckyStrike(false);
    setLuckyStrikeTile(null);
    setLuckyStrikeRevealed(false);
    setPendingQuestion(null);
    setShowBandit(false);
    setBanditTile(null);
    setBanditRevealed(false);
    setActivePlayerScoreBeforeQuestion(0);
    setQuestionsAnsweredCount(0);
  };

  // Global keyboard listener for reset (R key)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // R key: Reset game
      if (e.key === 'r' || e.key === 'R') {
        handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showSplash]);

  return (
    <div className="h-screen w-screen bg-[#071277] overflow-hidden">
      {/* Show winner view when all questions are answered */}
      {showWinner && (
        <WinnerView teams={teams} onRestart={handleRestart} />
      )}

      {/* Show splash screen on initial load */}
      {showSplash && !showWinner && (
        <SplashScreen 
          christmasMode={christmasMode}
          onToggleChristmasMode={() => setChristmasMode(!christmasMode)}
          onComplete={() => {
            setShowSplash(false);
            setShowSetup(true);
          }} 
        />
      )}

      {/* Show setup view after splash */}
      {showSetup && !showWinner && (
        <SetupView 
          initialPlayerNames={savedPlayerNames}
          onComplete={(playerNames, gameData) => {
            // Initialize teams based on setup
            setTeams(playerNames.map((name, index) => ({
              id: index + 1,
              name: name,
              score: 0
            })));
            setGameData(gameData);
            setFocusedTeamId(1);
            setShowSetup(false);
            setSavedPlayerNames(playerNames);
            
            // Reset all wildcard-related states (don't assign tiles yet)
            setQuestionsAnsweredCount(0);
            setAnsweredQuestions(new Set());
            setLuckyStrikeRevealed(false);
            setBanditRevealed(false);
            setPendingQuestion(null);
            setShowLuckyStrike(false);
            setShowBandit(false);
            setActivePlayerScoreBeforeQuestion(0);
            setLuckyStrikeTile(null);
            setBanditTile(null);
          }} 
          onGoBack={(currentPlayerNames, currentPlayerCount) => {
            if (currentPlayerNames) {
              setSavedPlayerNames(currentPlayerNames);
            }
            setShowSetup(false);
            setShowSplash(true);
          }}
        />
      )}

      {/* Show question view if a question is selected */}
      {selectedQuestion && gameData && !showWinner && !showLuckyStrike && (
        <QuestionView
          category={selectedQuestion.category}
          value={selectedQuestion.value}
          question={gameData.questionsAndAnswers[`${selectedQuestion.category}-${selectedQuestion.value}`]?.question || "Question not found"}
          answer={gameData.questionsAndAnswers[`${selectedQuestion.category}-${selectedQuestion.value}`]?.answer || "Answer not found"}
          questionImageUrl={gameData.questionsAndAnswers[`${selectedQuestion.category}-${selectedQuestion.value}`]?.questionImageUrl}
          answerImageUrl={gameData.questionsAndAnswers[`${selectedQuestion.category}-${selectedQuestion.value}`]?.answerImageUrl}
          alternatives={gameData.questionsAndAnswers[`${selectedQuestion.category}-${selectedQuestion.value}`]?.alternatives}
          activePlayerId={focusedTeamId}
          activePlayerName={teams.find(team => team.id === focusedTeamId)?.name || "Player"}
          playerIndex={teams.findIndex(team => team.id === focusedTeamId)}
          isLuckyStrike={luckyStrikeRevealed && luckyStrikeTile?.category === selectedQuestion.category && luckyStrikeTile?.value === selectedQuestion.value}
          onGoBack={() => setSelectedQuestion(null)}
          onUpdateScore={updateScore}
          onAdvancePlayer={advanceToNextPlayer}
          onMarkAsAnswered={markQuestionAsAnswered}
        />
      )}

      {/* Show game board */}
      {!showSplash && !showSetup && !selectedQuestion && gameData && !showWinner && (
        <div className="h-screen w-screen bg-black overflow-hidden">
          <div className="flex flex-col gap-[clamp(20px,2.5vw,40px)] h-full p-5">
            {/* Game Board */}
            <div className="grid flex-1 gap-[10px] min-h-0" style={{ gridTemplateColumns: `repeat(${gameData.categories.length}, 1fr)`, gridTemplateRows: 'auto 1fr 1fr 1fr 1fr 1fr' }}>
              {/* Category Titles Row */}
              {gameData.categories.map((category) => (
                <div key={`title-${category.id}`} className="bg-[#071277] px-5 py-[22px] flex items-center justify-center">
                  <p className="font-['Roboto_Condensed',sans-serif] font-bold leading-[1.2] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] text-center text-white uppercase">
                    {category.title}
                  </p>
                </div>
              ))}
              
              {/* Question Tiles Rows */}
              {VALUES.map((value) => (
                gameData.categories.map((category) => (
                  <JeopardyTile
                    key={`${category.id}-${value}`}
                    value={value}
                    onClick={() => handleTileClick(category.title, value)}
                    isAnswered={isQuestionAnswered(category.title, value)}
                    isDisabled={isTileDisabled(category.title, value)}
                  />
                ))
              ))}
            </div>

            {/* Team Scores */}
            <div className="flex gap-[10px] shrink-0">
              {teams.map((team, index) => (
                <TeamScore
                  key={team.id}
                  name={team.name}
                  score={team.score}
                  isFocused={team.id === focusedTeamId}
                  playerIndex={index}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lucky Strike Modal */}
      {showLuckyStrike && (
        <LuckyStrikeModal 
          christmasMode={christmasMode}
          onClose={() => {
          setShowLuckyStrike(false);
          // If there's a pending question, show it now
          if (pendingQuestion) {
            setSelectedQuestion(pendingQuestion);
            setPendingQuestion(null);
          }
        }} />
      )}

      {/* Bandit Modal */}
      {showBandit && (
        <BanditModal 
          christmasMode={christmasMode}
          onClose={() => {
          setShowBandit(false);
          
          // Apply Bandit penalty: Remove all positive points gained before this question
          // If score is negative, keep it negative
          const currentPlayer = teams.find(team => team.id === focusedTeamId);
          if (currentPlayer && activePlayerScoreBeforeQuestion > 0) {
            // Set player's score back to 0 (lose all positive points)
            setTeams(prevTeams =>
              prevTeams.map(team =>
                team.id === focusedTeamId
                  ? { ...team, score: 0 }
                  : team
              )
            );
          }
          // If score was 0 or negative, no change needed
          
          // Move to next player
          setFocusedTeamId((prev) => {
            const currentIndex = teams.findIndex(team => team.id === prev);
            const nextIndex = (currentIndex + 1) % teams.length;
            return teams[nextIndex].id;
          });
          
          // Clear pending question (don't show it, return to board)
          setPendingQuestion(null);
        }} />
      )}
    </div>
  );
}