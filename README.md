# Full-Stack Auto-Suggestion Text Editor

A complete full-stack text editor with auto-suggestions powered by advanced DSA algorithms and a cute, pastel-themed React frontend.

## Architecture

### Backend (Pure C)
- **Trie Data Structure**: Efficient storage and retrieval of dictionary words
- **Levenshtein Distance Algorithm**: Dynamic Programming implementation with keyboard-aware error weights
- **QWERTY Graph**: Precomputed distance matrix for keyboard layout errors
- **Min-Heap**: Fixed-size priority queue for Top-5 suggestions
- **REST API**: HTTP server exposing `/suggest?word=yourword` endpoint

### Frontend (React + Tailwind)
- **ContentEditable Editor**: Smooth text input with caret tracking
- **Floating Suggestions**: Animated bubble positioned near cursor
- **Multi-Page Support**: Create and navigate between notes
- **Cute Pastel Theme**: Google Keep-inspired UI with soft colors
- **Responsive Design**: Works on desktop and mobile

## Features

### DSA Algorithms Implemented
1. **Trie Traversal** with recursive DP row passing
2. **Levenshtein Distance** with keyboard-aware costs
3. **BFS-based QWERTY Distance** for typo detection
4. **Min-Heap Ranking** for Top-K suggestions

### User Experience
1. Real-time auto-suggestions as you type
2. Keyboard navigation (arrow keys, Enter, Tab, Esc)
3. Multi-page note management
4. Smooth animations and transitions
5. Responsive pastel-themed UI

## Color Palette

- App background: `#F7F8FC`
- Editor card background: `#FFFFFF`
- Primary accent (buttons): `#B8C0FF`
- Secondary accent: `#FFD6E8`
- Suggestion bubble: `#E8FFF5`
- Primary text: `#3A3A3A`
- Secondary text: `#6B6B6B`
- Soft borders: `#E0E0E0`

## Typography

- Global fallback: `monospace`
- UI elements (buttons, labels): `"Candy Beans"` / `"Comic Neue"` / `"Baloo 2"`
- User input text: `"Courier New"` / `"Times New Roman"`

## How to Run

### Backend
```bash
cd c:\PROJECTS\DSA_EL
gcc -o spell_engine.exe spell_engine.c -lws2_32
./spell_engine.exe
```

### Frontend
```bash
cd c:\PROJECTS\DSA_EL\frontend
npm install
npm start
```

The backend will be available at `http://localhost:8080/suggest?word=yourword`
The frontend will be available at `http://localhost:3000` (or alternative port)

## API Endpoint

- **GET** `/suggest?word=YOURWORD`
- Returns JSON: `{ "suggestions": ["word1", "word2", ...] }`

## Files Structure

- `spell_engine.c`: Complete C backend with Trie, DP, Heap, and HTTP server
- `allword.txt`: Dictionary file with 89,000+ words
- `frontend/`: React application with Tailwind CSS