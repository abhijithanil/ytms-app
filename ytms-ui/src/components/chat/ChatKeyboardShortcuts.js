// Create this as a new file: ChatKeyboardShortcuts.js
import { useEffect } from 'react';

const ChatKeyboardShortcuts = ({ 
  onSearchToggle, 
  onScrollToBottom, 
  onNavigateSearch, 
  searchActive,
  onEscapePress 
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        // Only allow Escape to close search when in input
        if (event.key === 'Escape' && searchActive && onEscapePress) {
          onEscapePress();
        }
        return;
      }

      // Prevent default for our shortcuts
      switch (event.key) {
        case '/':
          event.preventDefault();
          if (onSearchToggle) onSearchToggle();
          break;
        
        case 'Escape':
          event.preventDefault();
          if (onEscapePress) onEscapePress();
          break;
        
        case 'End':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (onScrollToBottom) onScrollToBottom();
          }
          break;
        
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (onSearchToggle) onSearchToggle();
          }
          break;
        
        case 'ArrowDown':
          if (searchActive && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (onNavigateSearch) onNavigateSearch('next');
          }
          break;
        
        case 'ArrowUp':
          if (searchActive && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (onNavigateSearch) onNavigateSearch('prev');
          }
          break;
        
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearchToggle, onScrollToBottom, onNavigateSearch, searchActive, onEscapePress]);

  return null; // This component doesn't render anything
};

export default ChatKeyboardShortcuts;