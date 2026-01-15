import React, { useEffect } from 'react';
import '../styles/EditorCanvas.css';
import SuggestionBubble from './SuggestionBubble';

const EditorCanvas = ({
  content,
  onInput,
  onKeyDown,
  onPaste,
  backgroundColor,
  editorRef,
  showSuggestions,
  suggestions,
  suggestionPosition,
  selectedSuggestionIndex,
  onSelectSuggestion,
  currentWord,
}) => {
  // Update content when it changes (e.g., page switch)
  useEffect(() => {
    if (editorRef.current && content !== undefined) {
      // Only update if content is different from current innerHTML
      if (editorRef.current.innerHTML !== content) {
        const selection = window.getSelection();
        const hadFocus = document.activeElement === editorRef.current;
        
        // Save caret position as character offset
        let caretOffset = 0;
        if (selection.rangeCount > 0 && hadFocus) {
          const range = selection.getRangeAt(0);
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(editorRef.current);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          caretOffset = preCaretRange.toString().length;
        }
        
        // Update content
        editorRef.current.innerHTML = content;
        
        // Restore caret position if editor had focus
        if (hadFocus && caretOffset > 0) {
          try {
            const walker = document.createTreeWalker(
              editorRef.current,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );

            let currentPos = 0;
            let node = walker.nextNode();
            
            while (node) {
              const nodeLength = node.textContent.length;
              if (currentPos + nodeLength >= caretOffset) {
                const range = document.createRange();
                const offset = Math.min(caretOffset - currentPos, nodeLength);
                range.setStart(node, offset);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                break;
              }
              currentPos += nodeLength;
              node = walker.nextNode();
            }
          } catch (e) {
            console.error('Error restoring caret:', e);
          }
        }
      }
    }
  }, [content, editorRef]);

  const handleKeyDown = (e) => {
    // Allow natural key behavior for typing
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleInput = (e) => {
    if (onInput) {
      onInput(e);
    }
  };

  const handlePasteEvent = (e) => {
    if (onPaste) {
      onPaste(e);
    }
  };

  return (
    <div className="editor-canvas-container">
      {/* Spiral Binding (Pure CSS) */}
      <div className="spiral-binding">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="spiral-hole"></div>
        ))}
      </div>

      {/* Paper-like editor with formatting support */}
      <div 
        className="paper-background" 
        style={{ backgroundColor }}
      >
        {/* Position relative container for suggestion bubble */}
        <div className="editor-relative-container" style={{ position: 'relative' }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning={true}
            className="paper-editor"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePasteEvent}
            dir="ltr"
            spellCheck="false"
            role="textbox"
            aria-label="Note editor area"
            aria-multiline="true"
            style={{ minHeight: '500px' }}
          >
          </div>

          {/* Suggestion Bubble inside editor container */}
          <SuggestionBubble
            show={showSuggestions}
            suggestions={suggestions}
            position={suggestionPosition}
            selectedIndex={selectedSuggestionIndex}
            onSelect={onSelectSuggestion}
            currentWord={currentWord}
            editorRef={editorRef}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorCanvas;
