import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import EditorCanvas from './components/EditorCanvas';
import Toolbar from './components/Toolbar';
import PageManager from './components/PageManager';
import ColorSwitcher from './components/ColorSwitcher';
import ExportButton from './components/ExportButton';

function App() {
  // ==========================================
  // MULTI-PAGE STATE MANAGEMENT
  // ==========================================
  const [pages, setPages] = useState([{ id: 1, content: '', color: '#eaaeb4' }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [editorBgColor, setEditorBgColor] = useState('#eaaeb4');
  const [darkMode, setDarkMode] = useState(false);
  const [nextPageId, setNextPageId] = useState(2);

  // ==========================================
  // SUGGESTION STATE
  // ==========================================
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionPosition, setSuggestionPosition] = useState({ x: 0, y: 0 });
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [currentWord, setCurrentWord] = useState('');

  const editorRef = useRef(null);
  const suggestionTimerRef = useRef(null);
  const isReplacingWord = useRef(false);

  // ==========================================
  // PAGE MANAGEMENT FUNCTIONS
  // ==========================================

  const currentPage = pages[currentPageIndex];

  const updatePageContent = useCallback((content) => {
    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[currentPageIndex].content = content;
      return newPages;
    });
  }, [currentPageIndex]);

  const updatePageColor = useCallback((color) => {
    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[currentPageIndex].color = color;
      return newPages;
    });
    setEditorBgColor(color);
  }, [currentPageIndex]);

  const handleAddPage = useCallback(() => {
    const newPage = { id: nextPageId, content: '', color: '#eaaeb4' };
    setPages(prevPages => [...prevPages, newPage]);
    setNextPageId(prev => prev + 1);
    setCurrentPageIndex(pages.length);
  }, [pages.length, nextPageId]);

  const handleDeletePage = useCallback((pageIndex) => {
    if (pages.length > 1) {
      setPages(prevPages => prevPages.filter((_, i) => i !== pageIndex));
      const newIndex = Math.min(pageIndex, pages.length - 2);
      setCurrentPageIndex(newIndex);
      setEditorBgColor(pages[newIndex].color);
    }
  }, [pages]);

  const handlePageChange = useCallback((pageNumber) => {
    const newIndex = pageNumber - 1;
    setCurrentPageIndex(newIndex);
    setEditorBgColor(pages[newIndex].color);
    setShowSuggestions(false);
  }, [pages]);

  // ==========================================
  // IMPROVED CARET POSITION HELPERS
  // ==========================================

  const saveCaretPosition = useCallback((element) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return {
      offset: preCaretRange.toString().length,
      range: range.cloneRange()
    };
  }, []);

  const restoreCaretPosition = useCallback((element, offset) => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    let currentPos = 0;
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node = walker.nextNode();
    while (node) {
      const nodeLength = node.textContent.length;
      if (currentPos + nodeLength >= offset) {
        const localOffset = Math.min(offset - currentPos, nodeLength);
        range.setStart(node, localOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
      currentPos += nodeLength;
      node = walker.nextNode();
    }

    // Fallback: place at end
    if (element.childNodes.length > 0) {
      const lastChild = element.childNodes[element.childNodes.length - 1];
      const lastNode = lastChild.nodeType === Node.TEXT_NODE 
        ? lastChild 
        : lastChild.lastChild || lastChild;
      
      try {
        const endOffset = lastNode.nodeType === Node.TEXT_NODE 
          ? lastNode.textContent.length 
          : 0;
        range.setStart(lastNode, endOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      } catch (e) {
        console.error('Error placing caret at end:', e);
      }
    }
    
    return false;
  }, []);

  // ==========================================
  // SUGGESTION POSITIONING (Real-time Caret Tracking)
  // ==========================================

  const getCaretCoordinates = useCallback(() => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editor = editorRef.current;
    if (!editor) return null;
    
    const editorRect = editor.getBoundingClientRect();

    // Calculate position relative to the page (fixed positioning)
    let caretX = rect.left;
    let caretY = rect.bottom;

    // Check if caret is within viewport and visible
    const isVisible = 
      rect.top >= 0 && 
      rect.bottom <= window.innerHeight &&
      rect.left >= 0 &&
      rect.right <= window.innerWidth;

    return {
      x: caretX,
      y: caretY,
      isVisible,
      viewportRect: rect,
    };
  }, []);

  // ==========================================
  // IMPROVED WORD DETECTION
  // ==========================================

  const getWordAtCaret = useCallback((element) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return { word: '', offset: 0, wordStart: 0, wordEnd: 0 };

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    const textBeforeCaret = preCaretRange.toString();
    const caretOffset = textBeforeCaret.length;
    
    const fullText = element.textContent || '';
    
    // Find word boundaries
    let wordStart = caretOffset;
    let wordEnd = caretOffset;
    
    // Move backwards to find word start
    while (wordStart > 0 && /[a-zA-Z]/.test(fullText[wordStart - 1])) {
      wordStart--;
    }
    
    // Move forwards to find word end
    while (wordEnd < fullText.length && /[a-zA-Z]/.test(fullText[wordEnd])) {
      wordEnd++;
    }
    
    const word = fullText.substring(wordStart, caretOffset);
    
    return { word, offset: caretOffset, wordStart, wordEnd };
  }, []);

  // ==========================================
  // ENHANCED WORD REPLACEMENT WITH FORMATTING PRESERVATION
  // ==========================================

  const replaceWordAtCaret = useCallback((editor, newWord) => {
    if (isReplacingWord.current) return false;
    isReplacingWord.current = true;

    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) {
        isReplacingWord.current = false;
        return false;
      }

      const range = selection.getRangeAt(0);
      const { word, wordStart, wordEnd } = getWordAtCaret(editor);
      
      if (!word || word.length === 0) {
        isReplacingWord.current = false;
        return false;
      }

      // Calculate new caret position (after new word + space)
      const fullText = editor.textContent || '';
      const beforeWord = fullText.substring(0, wordStart);
      const newCaretPosition = beforeWord.length + newWord.length + 1;

      // Find all text nodes and locate the target node
      const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let currentPos = 0;
      let targetNode = null;
      let nodeStartOffset = 0;
      const textNodes = [];

      let node = walker.nextNode();
      while (node) {
        textNodes.push({ node, start: currentPos, end: currentPos + node.textContent.length });
        
        if (currentPos <= wordStart && wordStart < currentPos + node.textContent.length) {
          targetNode = node;
          nodeStartOffset = currentPos;
        }
        
        currentPos += node.textContent.length;
        node = walker.nextNode();
      }

      if (!targetNode) {
        isReplacingWord.current = false;
        return false;
      }

      // Handle word replacement within the text node
      const nodeText = targetNode.textContent;
      const wordStartInNode = wordStart - nodeStartOffset;
      const wordEndInNode = Math.min(wordEnd - nodeStartOffset, nodeText.length);
      
      // Check if word spans multiple nodes (edge case)
      const wordSpansMultipleNodes = wordEnd > nodeStartOffset + nodeText.length;
      
      if (wordSpansMultipleNodes) {
        // Complex case: word spans multiple text nodes (rare with our word detection)
        // Fall back to simple replacement
        const textContent = editor.textContent;
        const newText = textContent.substring(0, wordStart) + newWord + ' ' + textContent.substring(wordEnd);
        
        // Preserve formatting by using innerHTML manipulation
        editor.textContent = newText;
        restoreCaretPosition(editor, newCaretPosition);
        updatePageContent(editor.innerHTML);
        isReplacingWord.current = false;
        return true;
      }

      // Standard case: word is within a single text node
      const beforeInNode = nodeText.substring(0, wordStartInNode);
      const afterInNode = nodeText.substring(wordEndInNode);
      
      // Replace text preserving the parent element's formatting
      targetNode.textContent = beforeInNode + newWord + ' ' + afterInNode;

      // Position caret after the replaced word and space
      const newRange = document.createRange();
      const localCaretPos = wordStartInNode + newWord.length + 1;
      
      try {
        // Ensure we don't exceed text length
        const safeCaretPos = Math.min(localCaretPos, targetNode.textContent.length);
        newRange.setStart(targetNode, safeCaretPos);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        console.error('Error positioning caret after replacement:', e);
        // Fallback: position at end of replaced word
        try {
          newRange.setStart(targetNode, wordStartInNode + newWord.length);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (fallbackError) {
          // Ultimate fallback: use offset-based restoration
          restoreCaretPosition(editor, newCaretPosition);
        }
      }

      // Update content while preserving all formatting
      updatePageContent(editor.innerHTML);
      isReplacingWord.current = false;
      return true;

    } catch (error) {
      console.error('Error in word replacement:', error);
      isReplacingWord.current = false;
      return false;
    }
  }, [getWordAtCaret, updatePageContent, restoreCaretPosition]);

  // ==========================================
  // INPUT HANDLING AND SUGGESTION FETCHING
  // ==========================================

  const fetchSuggestions = useCallback(async (word) => {
    try {
      const response = await fetch(`/suggest?word=${encodeURIComponent(word)}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions.slice(0, 5));
        setSelectedSuggestionIndex(-1);

        const coords = getCaretCoordinates();
        if (coords) {
          setSuggestionPosition(coords);
        }

        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setShowSuggestions(false);
    }
  }, [getCaretCoordinates]);

  const handleInput = useCallback((e) => {
    if (isReplacingWord.current) return;
    
    const editor = e.currentTarget;
    
    // Update page content
    updatePageContent(editor.innerHTML);
    
    // Get word at caret
    const { word } = getWordAtCaret(editor);
    setCurrentWord(word);

    // Clear any pending suggestion timers
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    // Fetch suggestions if word is long enough
    if (word && word.length >= 2) {
      suggestionTimerRef.current = setTimeout(() => {
        fetchSuggestions(word);
      }, 200);
    } else {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, [getWordAtCaret, updatePageContent, fetchSuggestions]);

  const insertSuggestion = useCallback((suggestion, event) => {
    const editor = editorRef.current;

    event?.preventDefault();
    event?.stopPropagation();

    if (!editor) return;

    // Ensure editor has focus
    editor.focus();

    // Replace word using improved logic
    const replaced = replaceWordAtCaret(editor, suggestion);
    
    if (replaced) {
      // Hide suggestions immediately
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      setCurrentWord('');
      
      // Clear any pending suggestion timers
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    }
  }, [replaceWordAtCaret]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    document.execCommand('insertText', false, text);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const handleFormatApplied = useCallback(() => {
    const content = editorRef.current?.innerHTML || '';
    updatePageContent(content);
  }, [updatePageContent]);

  // ==========================================
  // ENHANCED FORMATTING WITH SELECTION PRESERVATION
  // ==========================================

  const applyFormatWithCaret = useCallback((command, value = null) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const isCollapsed = range.collapsed;

    // Save selection state
    let startOffset = 0;
    let endOffset = 0;
    
    try {
      // Calculate offsets relative to editor
      const preStartRange = range.cloneRange();
      preStartRange.selectNodeContents(editor);
      preStartRange.setEnd(range.startContainer, range.startOffset);
      startOffset = preStartRange.toString().length;

      const preEndRange = range.cloneRange();
      preEndRange.selectNodeContents(editor);
      preEndRange.setEnd(range.endContainer, range.endOffset);
      endOffset = preEndRange.toString().length;
    } catch (e) {
      console.error('Error calculating selection offsets:', e);
    }

    // Special handling for list commands
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      try {
        // Check if already in a list
        const inList = document.queryCommandState(command);
        document.execCommand(command, false, value);
        
        // For lists, we don't need to restore exact position
        // Just ensure editor is focused
        requestAnimationFrame(() => {
          editor.focus();
          updatePageContent(editor.innerHTML);
        });
        return;
      } catch (error) {
        console.error('Error applying list format:', error);
      }
    }

    // Apply formatting command
    try {
      const success = document.execCommand(command, false, value);
      
      if (!success) {
        console.warn(`execCommand ${command} returned false`);
      }

      // Restore selection after formatting
      requestAnimationFrame(() => {
        try {
          editor.focus();

          // Rebuild selection from saved offsets
          const walker = document.createTreeWalker(
            editor,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          let currentPos = 0;
          let startNode = null;
          let endNode = null;
          let startPos = 0;
          let endPos = 0;
          let found = false;

          let node = walker.nextNode();
          while (node && (!startNode || !endNode)) {
            const nodeLength = node.textContent.length;
            
            if (!startNode && currentPos + nodeLength >= startOffset) {
              startNode = node;
              startPos = startOffset - currentPos;
            }
            
            if (!endNode && currentPos + nodeLength >= endOffset) {
              endNode = node;
              endPos = endOffset - currentPos;
            }
            
            currentPos += nodeLength;
            node = walker.nextNode();
          }

          // Restore the selection/caret
          if (startNode && endNode) {
            const newRange = document.createRange();
            const safeStartPos = Math.min(startPos, startNode.textContent.length);
            const safeEndPos = Math.min(endPos, endNode.textContent.length);
            
            newRange.setStart(startNode, safeStartPos);
            newRange.setEnd(endNode, safeEndPos);
            
            selection.removeAllRanges();
            selection.addRange(newRange);
            found = true;
          }

          // If we couldn't restore exact selection, position caret at saved offset
          if (!found && isCollapsed) {
            restoreCaretPosition(editor, startOffset);
          }

          // Update content
          updatePageContent(editor.innerHTML);
        } catch (error) {
          console.error('Error restoring selection after format:', error);
          updatePageContent(editor.innerHTML);
        }
      });
    } catch (error) {
      console.error('Error executing format command:', error);
      updatePageContent(editor.innerHTML);
    }
  }, [restoreCaretPosition, updatePageContent]);

  // ==========================================
  // KEYBOARD NAVIGATION FOR SUGGESTIONS
  // ==========================================

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
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, suggestions, selectedSuggestionIndex, insertSuggestion]);

  // ==========================================
  // SUGGESTION POSITIONING UPDATES (Scroll/Resize)
  // ==========================================

  useEffect(() => {
    const updateSuggestionPosition = () => {
      if (showSuggestions) {
        const coords = getCaretCoordinates();
        if (coords) {
          setSuggestionPosition(coords);
        }
      }
    };

    // Listen to window scroll and resize
    window.addEventListener('scroll', updateSuggestionPosition, true);
    window.addEventListener('resize', updateSuggestionPosition);
    
    return () => {
      window.removeEventListener('scroll', updateSuggestionPosition, true);
      window.removeEventListener('resize', updateSuggestionPosition);
    };
  }, [showSuggestions, getCaretCoordinates]);

  // ==========================================
  // CLEANUP AND SIDE EFFECTS
  // ==========================================

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

  // Update color when page changes
  useEffect(() => {
    setEditorBgColor(currentPage.color);
  }, [currentPageIndex, currentPage.color]);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Header with Dark Mode Toggle */}
      <div className="app-header">
        <div className="header-content">
          <button
            className="dark-mode-toggle"
            onClick={toggleDarkMode}
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="app-main">
        {/* Color Switcher - Top Bar */}
        <ColorSwitcher
          currentColor={editorBgColor}
          onColorChange={updatePageColor}
        />

        {/* Toolbar for Formatting */}
        <Toolbar
          editorRef={editorRef}
          onFormatApplied={handleFormatApplied}
          applyFormat={applyFormatWithCaret}
        />

        {/* Page Manager Navigation */}
        <PageManager
          currentPage={currentPageIndex + 1}
          totalPages={pages.length}
          onPageChange={handlePageChange}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
        />

        {/* Editor Canvas with Content */}
        <EditorCanvas
          ref={editorRef}
          editorRef={editorRef}
          content={currentPage.content}
          onInput={handleInput}
          onPaste={handlePaste}
          backgroundColor={editorBgColor}
          showSuggestions={showSuggestions}
          suggestions={suggestions}
          suggestionPosition={suggestionPosition}
          selectedSuggestionIndex={selectedSuggestionIndex}
          onSelectSuggestion={insertSuggestion}
          currentWord={currentWord}
        />

        {/* Export Button */}
        <div className="export-container">
          <ExportButton
            pageContent={currentPage.content}
            pageNumber={currentPageIndex + 1}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="app-footer">
        <p className="footer-text">
          Powered by Trie + Heap algorithm • Multi-page notepad with formatting
        </p>
      </div>
    </div>
  );
}

export default App;