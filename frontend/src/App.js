import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [pages, setPages] = useState([{ id: 1, content: '', title: 'Note 1' }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionPosition, setSuggestionPosition] = useState({ x: 0, y: 0 });
  const [darkMode, setDarkMode] = useState(false);
  const [editorBgColor, setEditorBgColor] = useState('#FFFFFF');
  
  const editorRef = useRef(null);
  const suggestionTimerRef = useRef(null);
  
  const currentPage = pages[currentPageIndex];
  
  const getTextBeforeCaret = () => {
    const el = editorRef.current;
    if (!el) return '';

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';

    const range = selection.getRangeAt(0);
    // Ensure the caret is inside our editor
    if (!el.contains(range.startContainer)) return '';

    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString();
  };

  const getLastWord = (textBeforeCaret) => {
    // Match the last contiguous alphabetic token (dictionary is a-z)
    const m = textBeforeCaret.match(/([A-Za-z]+)$/);
    return m ? m[1].toLowerCase() : '';
  };

  // Handle text input in the editor
  const handleInput = (e) => {
    const content = editorRef.current.innerHTML;
    setPages(prev => {
      const newPages = [...prev];
      newPages[currentPageIndex] = { ...newPages[currentPageIndex], content };
      return newPages;
    });
    
    // Extract current word being typed
    const textBeforeCaret = getTextBeforeCaret();
    const lastWord = getLastWord(textBeforeCaret);

    // Clear previous timer
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    // Only fetch if there's a meaningful word
    if (lastWord && lastWord.length >= 1) {
      suggestionTimerRef.current = setTimeout(() => {
        fetchSuggestions(lastWord);
      }, 120);
    } else {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };
  
  // Handle keydown events for proper text editing in the editor
  const handleEditorKeyDown = (e) => {
    // Allow all keyboard inputs - don't prevent default for normal typing
    // Only handle special cases when suggestions are showing
    
    if (showSuggestions && suggestions.length > 0) {
      // Let the global handler manage suggestion navigation
      return;
    }
    
    // Handle Enter key - create new line (browser handles this naturally)
    // Handle Delete and Backspace - browser handles naturally
    // Handle Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+Z, Ctrl+Y - browser handles naturally
    // All other keys are allowed - no restrictions
  };
  
  // Handle paste events to ensure proper text insertion
  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    document.execCommand('insertText', false, text);
  };
  
  // Sync editor content when page changes
  useEffect(() => {
    if (editorRef.current && currentPage) {
      // Only update if content is different to avoid cursor jumping
      if (editorRef.current.innerHTML !== currentPage.content) {
        editorRef.current.innerHTML = currentPage.content || '';
      }
    }
  }, [currentPageIndex, currentPage]);
  
  // Fetch suggestions from backend API
  const fetchSuggestions = async (word) => {
    try {
      // Use CRA proxy (package.json "proxy") so we don't hardcode host/port
      const response = await fetch(`/suggest?word=${encodeURIComponent(word)}`);
      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions.slice(0, 5));
        
        // Position suggestion bubble near caret
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          // Fallback: if rect is empty (sometimes for collapsed ranges), anchor to editor
          if (rect && (rect.left || rect.top || rect.bottom || rect.right)) {
            setSuggestionPosition({ x: rect.left, y: rect.bottom + 10 });
          } else {
            const editorRect = editorRef.current.getBoundingClientRect();
            setSuggestionPosition({ x: editorRect.left + 16, y: editorRect.top + 40 });
          }
        }
        
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setShowSuggestions(false);
    }
  };
  
  // Insert a suggestion into the editor
  const insertSuggestion = (suggestion, event) => {
    const editor = editorRef.current;
    
    // Debug logging
    console.log('Inserting suggestion:', suggestion);
    
    // Prevent default behavior if event is provided
    event?.preventDefault();
    event?.stopPropagation();
    
    // Get current selection
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      console.log('No selection found');
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    // Verify we're inside the editor
    if (!editor.contains(range.commonAncestorContainer)) {
      console.warn('Selection is outside editor');
      return;
    }
    
    // Get text content and find word boundaries
    const editorText = editor.textContent || '';
    const caretOffset = getCaretCharacterOffsetWithin(editor);
    
    console.log('Editor text:', editorText);
    console.log('Caret offset:', caretOffset);
    
    // Find the start of current word (search backwards for non-letter characters)
    let wordStart = caretOffset;
    while (wordStart > 0 && /[a-zA-Z]/.test(editorText[wordStart - 1])) {
      wordStart--;
    }
    
    // Find the end of current word (search forwards for non-letter characters)
    let wordEnd = caretOffset;
    while (wordEnd < editorText.length && /[a-zA-Z]/.test(editorText[wordEnd])) {
      wordEnd++;
    }
    
    console.log('Word boundaries:', wordStart, 'to', wordEnd);
    console.log('Word to replace:', editorText.substring(wordStart, wordEnd));
    
    // If we have a word to replace
    if (wordStart < wordEnd) {
      try {
        // Create new text content
        const beforeWord = editorText.substring(0, wordStart);
        const afterWord = editorText.substring(wordEnd);
        const newTextContent = beforeWord + suggestion + ' ' + afterWord;
        
        console.log('New text content:', newTextContent);
        
        // Update editor content
        editor.textContent = newTextContent;
        
        // Set cursor position after the inserted word
        const newCaretPos = wordStart + suggestion.length + 1; // +1 for space
        console.log('Setting cursor to position:', newCaretPos);
        setCaretPosition(editor, newCaretPos);
        
      } catch (error) {
        console.error('Error inserting suggestion:', error);
        // Fallback: simple replacement
        document.execCommand('insertText', false, suggestion + ' ');
      }
    } else {
      console.log('No word to replace found');
    }
    
    setShowSuggestions(false);
    editor.focus();
  };
  
  // Helper function to get caret offset within element
  const getCaretCharacterOffsetWithin = (element) => {
    let caretOffset = 0;
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
    
    return caretOffset;
  };
  
  // Helper function to set caret position
  const setCaretPosition = (element, position) => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    // Find the text node and offset
    let currentPos = 0;
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node = walker.nextNode();
    while (node && currentPos + node.textContent.length < position) {
      currentPos += node.textContent.length;
      node = walker.nextNode();
    }
    
    if (node) {
      const offset = position - currentPos;
      range.setStart(node, Math.min(offset, node.textContent.length));
      range.collapse(true);
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };
  
  // Insert a bullet point when . button is clicked
  const insertBulletPoint = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = document.createTextNode('\u2022  '); // Bullet point + spaces
      range.insertNode(textNode);
      
      // Move cursor after the bullet point
      const newRange = document.createRange();
      newRange.setStart(textNode, textNode.textContent.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    editorRef.current.focus();
  };
  
  // Formatting functions
  const formatText = (command, value = null) => {
    if (command === 'backgroundColor') {
      setEditorBgColor(value);
      editorRef.current.style.backgroundColor = value;
    } else {
      document.execCommand(command, false, value);
    }
    editorRef.current.focus();
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const saveAsTxt = () => {
    const content = editorRef.current.innerHTML;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const printDocument = () => {
    window.print();
  };
  
  const toggleBold = () => {
    formatText('bold');
  };
  
  const toggleItalic = () => {
    formatText('italic');
  };
  
  const insertBulletList = () => {
    formatText('insertUnorderedList');
  };
  
  // Create a new page
  const createNewPage = () => {
    const newPageId = pages.length > 0 ? Math.max(...pages.map(p => p.id)) + 1 : 1;
    const newPage = { id: newPageId, content: '', title: `Note ${newPageId}` };
    setPages(prev => [...prev, newPage]);
    setCurrentPageIndex(pages.length);
  };
  
  // Navigate to a different page
  const goToPage = (index) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPageIndex(index);
    }
  };
  
  // State for selected suggestion index
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const indexToUse = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
          insertSuggestion(suggestions[indexToUse], e);
          setSelectedSuggestionIndex(-1);
        } else if (e.key === 'Escape') {
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSuggestions, suggestions, selectedSuggestionIndex]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  return (
    <div className={`min-h-screen flex flex-col items-center py-10 px-4 ${darkMode ? 'bg-gray-900' : 'bg-editor-bg'}`}>
      {/* Top Navigation Bar */}
      <div className="nav-container">
        <button 
          onClick={createNewPage}
          className="nav-button primary-button"
        >
          <span>+</span>
          <span>New Page</span>
        </button>
        
        <div className="nav-arrows">
          <button 
            onClick={() => goToPage(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
            className={`nav-arrow ${currentPageIndex === 0 ? 'disabled' : ''}`}
          >
            ←
          </button>
          <button 
            onClick={() => goToPage(Math.min(pages.length - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === pages.length - 1}
            className={`nav-arrow ${currentPageIndex === pages.length - 1 ? 'disabled' : ''}`}
          >
            →
          </button>
        </div>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="formatting-toolbar">
        {/* Text Formatting Group */}
        <div className="toolbar-group">
          <button className="format-button" onClick={() => formatText('bold')} title="Bold (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button className="format-button" onClick={() => formatText('italic')} title="Italic (Ctrl+I)">
            <em>I</em>
          </button>
          <button className="format-button" onClick={() => formatText('underline')} title="Underline">
            <u>U</u>
          </button>
          <button className="format-button" onClick={() => formatText('strikeThrough')} title="Strikethrough">
            <s>S</s>
          </button>
        </div>
        
        {/* Font Group */}
        <div className="toolbar-group">
          <select className="format-button" onChange={(e) => formatText('fontName', e.target.value)} title="Font Family">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times NR</option>
            <option value="Courier New">Courier</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
          
          <select className="format-button" onChange={(e) => formatText('fontSize', e.target.value)} title="Font Size">
            {[8, 12, 16, 20, 24, 32, 48].map(size => (
              <option key={size} value={size}>{size}pt</option>
            ))}
          </select>
        </div>
        
        {/* Alignment Group */}
        <div className="toolbar-group">
          <button className="format-button" onClick={() => formatText('justifyLeft')} title="Align Left">L</button>
          <button className="format-button" onClick={() => formatText('justifyCenter')} title="Align Center">C</button>
          <button className="format-button" onClick={() => formatText('justifyRight')} title="Align Right">R</button>
          <button className="format-button" onClick={() => formatText('justifyFull')} title="Justify">J</button>
        </div>
        
        {/* Color Group */}
        <div className="toolbar-group">
          <input 
            type="color" 
            className="format-button color-picker" 
            onChange={(e) => formatText('foreColor', e.target.value)}
            title="Text Color"
          />
          
          <button className="format-button" onClick={insertBulletPoint} title="Bullet Point">•</button>
        </div>
        
        {/* Utility Group */}
        <div className="toolbar-group">
          <button className="format-button" onClick={() => formatText('undo')} title="Undo">↺</button>
          <button className="format-button" onClick={() => formatText('redo')} title="Redo">↻</button>
          <button className="format-button" onClick={toggleDarkMode} title="Dark Mode">🌙</button>
          <button className="format-button" onClick={saveAsTxt} title="Save TXT">💾</button>
        </div>
      </div>
      
      {/* Editor Card */}
      <div className="editor-card">
        <div 
          ref={editorRef}
          contentEditable
          className="editor-content"
          onInput={handleInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          suppressContentEditableWarning={true}
          dir="ltr"
          spellCheck="false"
          style={{ backgroundColor: editorBgColor }}
        >
        </div>
      </div>
      
      {/* Floating Suggestion Bubble */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="suggestion-bubble"
          style={{ left: suggestionPosition.x, top: suggestionPosition.y }}
        >
          <ul className="suggestion-list">
            {suggestions.slice(0, 5).map((suggestion, index) => (
              <li 
                key={index}
                onClick={(e) => {
                  console.log('Suggestion clicked:', suggestion);
                  e.preventDefault();
                  e.stopPropagation();
                  insertSuggestion(suggestion, e);
                  setSelectedSuggestionIndex(-1);
                }}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                className={`suggestion-item ${selectedSuggestionIndex === index ? 'selected' : ''}`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Page indicator */}
      <div className="page-indicator">
        Page {currentPageIndex + 1} of {pages.length}
      </div>
    </div>
  );
}

export default App;