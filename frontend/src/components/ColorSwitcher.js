import React from 'react';
import '../styles/ColorSwitcher.css';

const ColorSwitcher = ({ 
  currentColor, 
  onColorChange 
}) => {
  const colors = [
    { code: '#eaaeb4', name: 'rose', label: 'Rose' },
    { code: '#ffbe89', name: 'peach', label: 'Peach' },
    { code: '#ffd484', name: 'sunny', label: 'Sunny' },
    { code: '#cdeab3', name: 'mint', label: 'Mint' },
    { code: '#91dcd7', name: 'aqua', label: 'Aqua' },
    { code: '#b0b2e4', name: 'lavender', label: 'Lavender' },
  ];

  return (
    <div className="color-switcher-container">
      <label htmlFor="color-group" className="color-label">
        Notepad Color:
      </label>
      <div className="color-buttons-group" id="color-group" role="group" aria-label="Notepad color selection">
        {colors.map(color => (
          <button
            key={color.name}
            className={`color-button ${currentColor === color.code ? 'active' : ''}`}
            style={{ backgroundColor: color.code }}
            onClick={() => onColorChange(color.code)}
            title={`Change to ${color.label}`}
            aria-label={`${color.label} (${color.code})`}
            aria-pressed={currentColor === color.code}
          >
            {currentColor === color.code && (
              <span className="checkmark" aria-hidden="true">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ColorSwitcher;
