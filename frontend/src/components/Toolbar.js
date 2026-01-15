import React, { useCallback, useState, useEffect } from 'react';
import '../styles/Toolbar.css';

function Toolbar({ editorRef, onFormatApplied, applyFormat }) {
  // State to track toggle formats
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  // Function to save current selection
  const saveSelection = useCallback(() => {
    if (!editorRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const end = preCaretRange.toString().length;

    return { start, end, range };
  }, [editorRef]);

  // Function to restore selection
  const restoreSelection = useCallback((savedSelection) => {
    if (!savedSelection || !editorRef.current) return;

    const { start, end } = savedSelection;
    let charIndex = 0;
    let stop = false;

    const traverseNodes = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharIndex = charIndex + node.textContent.length;
        if (!stop) {
          if (start >= charIndex && start <= nextCharIndex) {
            savedSelection.range.setStart(node, start - charIndex);
          }
          if (end >= charIndex && end <= nextCharIndex) {
            savedSelection.range.setEnd(node, end - charIndex);
            stop = true;
          }
        }
        charIndex = nextCharIndex;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          if (stop) break;
          traverseNodes(node.childNodes[i]);
        }
      }
    };

    traverseNodes(editorRef.current);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedSelection.range);
  }, [editorRef]);

  // Update active formats based on editor state
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const updateActiveFormats = () => {
      try {
        // Get current selection state for each format
        setActiveFormats(prev => ({
          ...prev,
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikethrough: document.queryCommandState('strikethrough'),
          justifyLeft: document.queryCommandState('justifyLeft'),
          justifyCenter: document.queryCommandState('justifyCenter'),
          justifyRight: document.queryCommandState('justifyRight'),
          insertUnorderedList: document.queryCommandState('insertUnorderedList'),
          insertOrderedList: document.queryCommandState('insertOrderedList'),
        }));
      } catch (e) {
        // If queryCommandState fails, keep current states
      }
    };

    // Listen for selection changes
    editor.addEventListener('mouseup', updateActiveFormats);
    editor.addEventListener('keyup', updateActiveFormats);
    editor.addEventListener('input', updateActiveFormats);

    // Initial update
    updateActiveFormats();

    return () => {
      editor.removeEventListener('mouseup', updateActiveFormats);
      editor.removeEventListener('keyup', updateActiveFormats);
      editor.removeEventListener('input', updateActiveFormats);
    };
  }, [editorRef]);

  // Force update active formats after format is applied
  const updateAllFormatStates = useCallback(() => {
    if (!editorRef.current) return;
    
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikethrough'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch (e) {
      // If queryCommandState fails, keep current states
    }
  }, [editorRef]);

  // Use custom applyFormat if provided, otherwise use default
  const handleFormat = useCallback((command, value = null) => {
    // Ensure editor exists and is focused
    const editor = editorRef.current;
    if (!editor) {
      console.error('Editor reference is not available');
      return;
    }

    // Make sure editor has focus
    editor.focus();
    
    // Small delay to ensure focus is properly set before applying formatting
    setTimeout(() => {
      // Save current selection
      const savedSelection = saveSelection();

      if (applyFormat) {
        applyFormat(command, value);
      } else {
        // Execute the command
        document.execCommand(command, false, value);
        onFormatApplied?.();
      }

      // Restore the selection
      if (savedSelection) {
        setTimeout(() => {
          restoreSelection(savedSelection);
        }, 0);
      }

      // For all formats, update the state after a brief delay
      setTimeout(() => {
        updateAllFormatStates();
      }, 50);
    }, 10); // Small delay to ensure editor is focused
  }, [applyFormat, editorRef, onFormatApplied, saveSelection, restoreSelection, updateAllFormatStates]);

  const isFormatActive = useCallback((command) => {
    // For known formats, use our state
    if (Object.keys(activeFormats).includes(command)) {
      return activeFormats[command];
    }

    // For other formats (like fontSize), use queryCommandState
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }, [activeFormats]);

  return (
    <div className="toolbar">
      {/* Text Style Group */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${isFormatActive('bold') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('bold');
          }}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          className={`toolbar-btn ${isFormatActive('italic') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('italic');
          }}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <em>I</em>
        </button>
        <button
          className={`toolbar-btn ${isFormatActive('underline') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('underline');
          }}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <u>U</u>
        </button>
        <button
          className={`toolbar-btn ${isFormatActive('strikethrough') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('strikethrough');
          }}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <s>S</s>
        </button>
      </div>

      {/* Divider */}
      <div className="toolbar-divider"></div>

      {/* Font Size Group */}
      <div className="toolbar-group">
        <select
          className="toolbar-select font-size-select"
          onChange={(e) => {
            handleFormat('fontSize', e.target.value);
          }}
          defaultValue="3"
          aria-label="Font size"
        >
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Extra Large</option>
        </select>
      </div>

      {/* Divider */}
      <div className="toolbar-divider"></div>

      {/* Text Alignment Group */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${isFormatActive('justifyLeft') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('justifyLeft');
          }}
          title="Align Left"
          aria-label="Align left"
        >
          ≡←
        </button>
        <button
          className={`toolbar-btn ${isFormatActive('justifyCenter') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('justifyCenter');
          }}
          title="Align Center"
          aria-label="Align center"
        >
          ≡
        </button>
        <button
          className={`toolbar-btn ${isFormatActive('justifyRight') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('justifyRight');
          }}
          title="Align Right"
          aria-label="Align right"
        >
          ≡→
        </button>
      </div>

      {/* Divider */}
      <div className="toolbar-divider"></div>

      {/* List Group */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${isFormatActive('insertUnorderedList') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('insertUnorderedList');
          }}
          title="Bullet List"
          aria-label="Bullet list"
        >
          ●
        </button>
        <button
          className={`toolbar-btn ${isFormatActive('insertOrderedList') ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFormat('insertOrderedList');
          }}
          title="Numbered List"
          aria-label="Numbered list"
        >
          1.
        </button>
        <button
          className={`toolbar-btn`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Insert a line break using a more reliable method
            const editor = editorRef.current;
            if (editor) {
              const savedSelection = saveSelection();
              
              editor.focus();
              document.execCommand('insertHTML', false, '<br>');
              onFormatApplied?.();
              
              // Restore selection after a small delay
              if (savedSelection) {
                setTimeout(() => {
                  restoreSelection(savedSelection);
                }, 0);
              }
              
              // Update format states after insertion
              setTimeout(() => {
                updateAllFormatStates();
              }, 50);
            }
          }}
          title="Line Break"
          aria-label="Line break"
        >
          ↵
        </button>
      </div>
    </div>
  );
}

export default Toolbar;