import { useEffect, useState } from 'react';

export interface SystemMessageData {
  id: string;
  text: string;
  type: 'constellation' | 'achievement' | 'system';
}

interface SystemMessageProps {
  message: SystemMessageData | null;
  onDismiss: () => void;
}

export function SystemMessage({ message, onDismiss }: SystemMessageProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      // Slide in
      setIsVisible(true);
      
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 500); // Wait for animation to complete
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div 
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]
        max-w-lg w-[90%]
        transition-all duration-500 ease-out
        ${isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8 pointer-events-none'
        }
      `}
    >
      <div className="
        bg-gradient-to-r from-[#0f172a] to-[#1e293b]
        border-l-4 border-primary
        rounded-none p-4
        shadow-lg
      ">
        <p className="font-reader text-sm text-foreground leading-relaxed">
          {message.text}
        </p>
      </div>
    </div>
  );
}
