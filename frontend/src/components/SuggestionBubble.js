import React, { useMemo } from 'react';
import '../styles/SuggestionBubble.css';

const SuggestionBubble = ({
  show,
  suggestions,
  position,
  selectedIndex,
  onSelect,
  currentWord,
  editorRef,
}) => {
  // Memoize the highlighted suggestions to optimize rendering
  const highlightedSuggestions = useMemo(() => {
    return suggestions.map(suggestion => {
      if (!currentWord) return suggestion;

      // Find and highlight matched substrings (case-insensitive)
      const regex = new RegExp(`(${currentWord})`, 'gi');
      const parts = suggestion.split(regex);

      return parts.map((part, idx) =>
        regex.test(part) ? (
          <span key={idx} className="matched-text">
            {part}
          </span>
        ) : (
          <span key={idx}>{part}</span>
        )
      );
    });
  }, [suggestions, currentWord]);

  // Determine visibility based on caret position and editor visibility
  const isVisible = position?.isVisible !== false && show && suggestions.length > 0;
  
  // Check if the editor itself is in the viewport
  const isEditorVisible = editorRef?.current ? (
    editorRef.current.offsetParent !== null && 
    editorRef.current.getBoundingClientRect().top < window.innerHeight &&
    editorRef.current.getBoundingClientRect().bottom > 0
  ) : true;

  if (!isVisible || !isEditorVisible) return null;

  // Calculate position with adjustments for viewport
  let displayX = position?.x || 0;
  let displayY = position?.y || 0;

  // Add offset from caret
  const offsetX = 8;
  const offsetY = 8;
  
  displayX += offsetX;
  displayY += offsetY;
  
  // Get bubble dimensions
  const bubbleWidth = 280;
  const bubbleHeight = 240;
  
  // Viewport boundaries
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;
  
  // Adjust X position if bubble goes off the right edge
  if (displayX + bubbleWidth > viewportWidth + scrollX) {
    displayX = Math.max(10, viewportWidth + scrollX - bubbleWidth - 10);
  }
  
  // Adjust Y position if bubble goes off the bottom
  if (displayY + bubbleHeight > viewportHeight + scrollY) {
    displayY = position.y - bubbleHeight - 10; // Show above caret instead
  }
  
  // Ensure it doesn't go off the top
  if (displayY < scrollY + 10) {
    displayY = scrollY + 10;
  }
  
  // Ensure it doesn't go off the left
  if (displayX < scrollX + 10) {
    displayX = scrollX + 10;
  }

  return (
    <div
      className="suggestion-bubble"
      style={{
        left: `${displayX}px`,
        top: `${displayY}px`,
      }}
      role="listbox"
      aria-label="Word suggestions"
    >
      <ul className="suggestion-list">
        {highlightedSuggestions.map((highlighted, index) => (
          <li
            key={index}
            className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(suggestions[index], e);
            }}
            onMouseEnter={() => {
              // Parent component handles this through selectedIndex prop
            }}
            role="option"
            aria-selected={selectedIndex === index}
          >
            {highlighted}
          </li>
        ))}
      </ul>
      <div className="suggestion-hint">
        {suggestions.length > 0 && (
          <small>↑ ↓ to navigate, Enter to select, Esc to dismiss</small>
        )}
      </div>
    </div>
  );
};

export default SuggestionBubble;
