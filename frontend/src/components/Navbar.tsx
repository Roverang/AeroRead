import { Sun, Moon, Github, Archive, Edit3 } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  currentView?: 'archive' | 'input';
  onViewSwitch?: (view: 'archive' | 'input') => void;
}

export function Navbar({ currentView, onViewSwitch }: NavbarProps) {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    // Theme toggle visual only - full implementation would use next-themes
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-primary/30">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-ui text-xl font-bold tracking-[0.15em] uppercase text-primary">
            AEROREAD
          </span>
          <span className="hidden sm:inline-block text-dust text-xs font-ui tracking-wider">
            // SCENARIO READER
          </span>
        </div>
        
        {/* View Switcher (only show if onViewSwitch is provided) */}
        {onViewSwitch && (
          <div className="flex items-center gap-1 literary-panel p-1 rounded-none">
            <button
              onClick={() => onViewSwitch('archive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none transition-all duration-200 ${
                currentView === 'archive' 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-dust hover:text-primary'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="ui-label text-[10px]">ARCHIVE</span>
            </button>
            <button
              onClick={() => onViewSwitch('input')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none transition-all duration-200 ${
                currentView === 'input' 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-dust hover:text-primary'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="ui-label text-[10px]">QUICK READ</span>
            </button>
          </div>
        )}
        
        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 literary-panel rounded-none hover:literary-panel-active transition-all duration-200"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-primary" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
          </button>
          
          {/* GitHub Link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 literary-panel rounded-none hover:literary-panel-active transition-all duration-200"
            aria-label="View on GitHub"
          >
            <Github className="w-4 h-4 text-primary" />
          </a>
        </div>
      </div>
    </header>
  );
}
