import { useState } from 'react';

interface FourthWallIntroProps {
  onShatter: () => void;
}

export function FourthWallIntro({ onShatter }: FourthWallIntroProps) {
  const [isShattered, setIsShattered] = useState(false);

  const handleClick = () => {
    setIsShattered(true);
    setTimeout(() => {
      onShatter();
    }, 600);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        fixed inset-0 z-[100] cursor-pointer
        bg-background/70 backdrop-blur-md
        flex flex-col items-center justify-center
        transition-all duration-600
        ${isShattered ? 'animate-shatter pointer-events-none' : ''}
      `}
    >
      <div className="text-center space-y-6">
        {/* Main message */}
        <h1 className="font-ui text-4xl md:text-6xl font-bold tracking-[0.3em] uppercase text-primary animate-pulse-soft">
          [ THE FOURTH WALL IS ACTIVE ]
        </h1>
        
        {/* Subtext */}
        <p className="font-ui text-lg md:text-xl tracking-[0.2em] uppercase text-dust">
          [ Click to Shatter ]
        </p>
        
        {/* Decorative lines */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="w-16 h-px bg-primary/30" />
          <div className="w-2 h-2 rotate-45 border border-primary/50" />
          <div className="w-16 h-px bg-primary/30" />
        </div>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-primary/30" />
      <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-primary/30" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-primary/30" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-primary/30" />
    </div>
  );
}
