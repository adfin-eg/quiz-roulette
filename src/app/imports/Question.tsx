function QuestionDisplay() {
  return (
    <div className="bg-[#071277] h-[1080px] overflow-clip relative shrink-0 uppercase w-[1920px]" data-name="question-display">
      <div className="absolute flex flex-col font-['Eczar',sans-serif] font-medium h-[984px] justify-center leading-[0] left-[calc(50%+0.5px)] text-[100px] text-center text-white top-1/2 translate-x-[-50%] translate-y-[-50%] w-[1149px]">
        <p className="leading-[112px]">What is jeopardy?</p>
      </div>
      <p className="absolute font-['Roboto_Condensed',sans-serif] font-bold leading-[normal] left-1/2 text-[#fdc065] text-[24px] text-center text-nowrap top-[calc(50%+492px)] translate-x-[-50%] whitespace-pre">Press space to see the answer</p>
      <p className="absolute font-['Roboto_Condensed',sans-serif] font-bold leading-[normal] left-[calc(50%-928px)] text-[#fdc065] text-[24px] text-nowrap top-[calc(50%-508px)] whitespace-pre">go back</p>
    </div>
  );
}

export default function Question() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="Question">
      <QuestionDisplay />
    </div>
  );
}