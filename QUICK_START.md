# 🚀 Quick Start Guide

## Two-Terminal Setup

### Terminal 1: Start Backend
```bash
cd c:\PROJECTS\DSA_EL
gcc -o spell_engine spell_engine.c -lws2_32 -lm
.\spell_engine
```

Expected output:
```
========================================
   SMART SPELL CHECKER WITH QWERTY API
========================================

Loading dictionary...
Dictionary loaded! Total words: <count>

Server listening on http://localhost:8080/suggest?word=yourword
```

### Terminal 2: Start Frontend
```bash
cd c:\PROJECTS\DSA_EL\frontend
npm install  # First time only
npm start
```

The app opens automatically at `http://localhost:3000`

## Testing the App

1. **Type a word** (2+ characters): "helo"
2. **See suggestions**: "hello", "held", "help", etc.
3. **Navigate**: Use ↑ ↓ arrow keys
4. **Select**: Press Enter or click
5. **Change color**: Click a color button
6. **Toggle dark mode**: Click moon icon

## Key Features to Try

### Suggestion System
- Typos: "wrld" → "world", "wirld", etc.
- Incomplete: "hel" → "hello", "help", "held"
- Substitutions: "teh" → "the", "tea", "tech"

### Color Palette
- Rose, Peach, Sunny, Mint, Aqua, Lavender

### Keyboard Shortcuts
- **↑/↓**: Navigate suggestions
- **Enter/Tab**: Select suggestion
- **Esc**: Dismiss suggestions
- **Ctrl+Z/Y**: Undo/Redo (built-in)

## Architecture Overview

```
User Types → Input Handler (150ms debounce)
    ↓
Extract Word Before Caret
    ↓
Fetch /suggest?word=xxx (via proxy to localhost:8080)
    ↓
C Backend (Trie + Levenshtein + Min-Heap)
    ↓
Return Top 5 Suggestions
    ↓
Display Floating Bubble Near Caret
    ↓
Keyboard Navigation & Selection
```

## File Structure

```
Components:
├── NotepadEditor.js      - Spiral binding + paper texture
├── ColorSwitcher.js      - 6 pastel color buttons
└── SuggestionBubble.js   - Smart suggestion display

Styles:
├── NotepadEditor.css     - Paper/spiral CSS
├── ColorSwitcher.css     - Color button styles
├── SuggestionBubble.css  - Suggestion styling
└── App.css               - Global app layout

Backend:
└── spell_engine.c        - Trie + HTTP server
```

## Performance Notes

- **Debounce**: 150ms to prevent excessive backend calls
- **Max Suggestions**: 5 at a time (Top-K via Min-Heap)
- **Caret Tracking**: Sub-millisecond positioning
- **Memory**: Efficient Trie structure
- **Responsive**: Works on mobile/tablet/desktop

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Port 8080 in use? Kill process or use different port |
| No suggestions | Check backend console, ensure port 8080 accessible |
| Styling broken | Clear cache, restart both servers |
| Slow suggestions | Check network tab in DevTools for backend latency |

## Next Steps

1. ✅ Read through [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
2. ✅ Explore component code for design patterns
3. ✅ Modify colors/styling to your preference
4. ✅ Extend with additional features:
   - Save notes to localStorage
   - Export as PDF
   - Collaborative editing
   - Custom dictionaries

## Architecture Diagram

```
Frontend (React)           Backend (C)
━━━━━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━
┌─────────────────────┐    ┌──────────────┐
│   NotepadEditor     │    │    Trie      │
│  ┌──────────────┐   │    │   Store      │
│  │ Spiral       │   │    │  Dictionary  │
│  │ Binding      │   │    │              │
│  └──────────────┘   │    └──────────────┘
│  ┌──────────────┐   │    ┌──────────────┐
│  │ Paper        │   │    │ Levenshtein │
│  │ Texture      │   │    │ Distance    │
│  └──────────────┘   │    │ QWERTY      │
│                     │    │ Aware       │
│ ┌─────────────────┐ │    └──────────────┘
│ │ColorSwitcher   │ │    ┌──────────────┐
│ │6 Pastel Colors │ │    │ Min-Heap     │
│ └─────────────────┘ │    │ Top-K        │
│                     │    │ Selection    │
│ ┌─────────────────┐ │    └──────────────┘
│ │Suggestion       │ │          ▲
│ │Bubble           │◄──HTTP───→│
│ │- Highlighting  │ │  /suggest │
│ │- Navigation    │ │           │
│ └─────────────────┘ │    ┌──────────────┐
└─────────────────────┘    │ allword.txt  │
                           │ (Dictionary) │
                           └──────────────┘
```

---

**Made with ✍️ and 💻 for Digital Notepad v1.0**
