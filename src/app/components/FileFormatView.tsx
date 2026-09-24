import React from 'react';
import { X, Download } from 'lucide-react';
import { useEffect } from 'react';
import Vector from '../imports/Vector-43-468';

interface FileFormatViewProps {
  onBack: () => void;
  onDownloadTemplate: (e: React.MouseEvent) => void;
}

export function FileFormatView({ onBack, onDownloadTemplate }: FileFormatViewProps) {
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onBack]);

  return (
    <div className="w-full h-screen flex flex-col bg-[#071277] relative overflow-hidden">
      {/* Header - Fixed at top */}
      <p className="absolute left-1/2 -translate-x-1/2 top-8 font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase">
        SETUP
      </p>

      {/* Main Content - Takes remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        {/* Vector Icon */}
        <div className="w-[clamp(150px,20vw,300px)] h-[clamp(88.5px,11.84vw,177.6px)] mb-[clamp(4rem,10vh,8rem)] -rotate-[15deg]">
          <Vector />
        </div>
        
        {/* Instruction Text */}
        <p className="text-white text-center mb-[clamp(1.5rem,4vh,3rem)] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] font-normal">
          Load your own quiz using Excel. Download the template to get started.
        </p>
        
        {/* Get Template Button */}
        <div className="flex justify-center pb-[60px]">
          <button
            className="px-6 py-4 bg-[#071277] border-2 border-[#707EFF] text-white hover:bg-[#707EFF] hover:border-[#707EFF] hover:text-[#FFFFFF] focus:bg-[#707EFF] focus:border-[#707EFF] focus:text-[#FFFFFF] active:bg-[#707EFF] active:border-[#707EFF] active:text-[#FFFFFF] font-['Roboto_Condensed',sans-serif] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] rounded-lg outline-none transition-all cursor-pointer uppercase flex items-center justify-center gap-2"
            onClick={onDownloadTemplate}
          >
            <Download size={20} strokeWidth={2.5} />
            GET TEMPLATE
          </button>
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <button 
          className="flex items-center gap-2 p-4 -m-4 cursor-pointer" 
          onClick={onBack}
        >
          <X className="text-[#fdc065]" size={24} strokeWidth={3} />
          <p className="font-['Roboto_Condensed',sans-serif] font-bold text-[#fdc065] text-[clamp(1.125rem,min(2vw,2.5vh),1.5rem)] uppercase whitespace-nowrap">
            CLOSE
          </p>
        </button>
      </div>
    </div>
  );
}