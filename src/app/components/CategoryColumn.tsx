import { JeopardyTile } from './JeopardyTile';

interface CategoryColumnProps {
  title: string;
  values: number[];
  onTileClick?: (value: number) => void;
  isQuestionAnswered?: (value: number) => boolean;
  isTileDisabled?: (value: number) => boolean;
}

export function CategoryColumn({ title, values, onTileClick, isQuestionAnswered, isTileDisabled }: CategoryColumnProps) {
  return (
    <div className="flex-1 flex flex-col gap-[10px] min-h-0 h-full">
      {/* Category Title */}
      <div className="bg-[#071277] px-5 py-[22px] shrink-0 flex items-center justify-center min-h-[4rem]">
        <p className="font-['Roboto_Condensed',sans-serif] font-bold leading-[1.2] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] text-center text-white uppercase">
          {title}
        </p>
      </div>

      {/* Tiles */}
      <div className="flex-1 flex flex-col gap-[10px] min-h-0">
        {values.map((value) => (
          <JeopardyTile 
            key={value} 
            value={value} 
            onClick={() => onTileClick?.(value)}
            isAnswered={isQuestionAnswered?.(value)}
            isDisabled={isTileDisabled?.(value)}
          />
        ))}
      </div>
    </div>
  );
}