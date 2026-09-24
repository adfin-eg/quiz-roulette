interface TeamScoreProps {
  name: string;
  score: number;
  isFocused?: boolean;
  playerIndex: number;
}

export function TeamScore({ name, score, isFocused, playerIndex }: TeamScoreProps) {
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

  const playerColor = playerColors[playerIndex] || '#707EFF';

  return (
    <div className="flex-1">
      <div 
        className={`bg-[#071277] w-full flex flex-col items-center justify-center gap-1 px-4 pt-3 pb-[22px] transition-all ${
          isFocused ? 'border-4 border-white' : 'border-4 border-transparent'
        }`}
      >
        <p className="font-['Roboto_Condensed',sans-serif] font-bold leading-[normal] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] text-center text-white uppercase whitespace-nowrap pt-[4px] pr-[0px] pb-[0px] pl-[0px]">
          {score}
        </p>
        <p 
          className="font-['Roboto_Condensed',sans-serif] font-bold leading-[normal] text-[clamp(0.875rem,min(1.5vw,2vh),1.125rem)] text-center uppercase overflow-hidden text-ellipsis whitespace-nowrap w-full"
          style={{ color: playerColor }}
        >
          {name}
        </p>
      </div>
    </div>
  );
}