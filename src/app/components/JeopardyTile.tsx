interface JeopardyTileProps {
  value: number;
  onClick?: () => void;
  isAnswered?: boolean;
  isDisabled?: boolean;
}

export function JeopardyTile({ value, onClick, isAnswered, isDisabled }: JeopardyTileProps) {
  return (
    <button 
      className={`flex-1 min-h-0 flex items-center justify-center p-5 ${
        isAnswered ? 'bg-[#071277]/60 cursor-default' : 'bg-[#071277] cursor-pointer'
      }`}
      onClick={isAnswered ? undefined : onClick}
      disabled={isAnswered}
    >
      <p className={`font-['Roboto_Condensed',sans-serif] font-bold leading-[normal] text-[clamp(1.125rem,min(5.5vw,7.5vh),4.75rem)] text-center uppercase ${
        isAnswered ? 'text-[#4354F1] line-through' : 'text-[#fdc065]'
      }`}>
        {value}
      </p>
    </button>
  );
}