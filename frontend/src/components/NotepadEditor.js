import React, { useRef, useEffect } from 'react';
import '../styles/NotepadEditor.css';

const NotepadEditor = ({
  content,
  onInput,
  onKeyDown,
  onPaste,
  backgroundColor,
  editorRef
}) => {
  return (
    <div className="notepad-container">
      {/* Spiral Binding (Pure CSS) */}
      <div className="spiral-binding">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="spiral-hole"></div>
        ))}
      </div>

      {/* Paper-like editor */}
      <div 
        className="paper-background" 
        style={{ backgroundColor }}
      >
        <div
          ref={editorRef}
          contentEditable
          className="paper-editor"
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          suppressContentEditableWarning={true}
          dir="ltr"
          spellCheck="false"
          role="textbox"
          aria-label="Note editor area"
          aria-multiline="true"
        >
        </div>
      </div>
    </div>
  );
};

export default NotepadEditor;
