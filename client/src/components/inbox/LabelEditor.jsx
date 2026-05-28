import { useEffect, useRef, useState } from 'react';
import { labelColorPalette } from '../../config/boardConfig.js';

// Renders the label picker used by the Inbox quick editor.
function LabelEditor({ card, labels, onClose, onLabelToggle, onLabelRename, onLabelCreate }) {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const usedColors = labels.map((label) => label.color);
  const firstAvailableColor = labelColorPalette.find((color) => !usedColors.includes(color)) || '';
  const [selectedColor, setSelectedColor] = useState(firstAvailableColor);
  const panelRef = useRef(null);

  useEffect(() => {
    // Closes the label editor when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.type === 'mousedown' && !panelRef.current?.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [onClose]);

  const visibleLabels = labels.filter((label) => label.name.toLowerCase().includes(search.trim().toLowerCase()));

  // Creates a new label from the selected title and color.
  function handleCreateLabel() {
    if (!selectedColor || usedColors.includes(selectedColor)) {
      return;
    }

    onLabelCreate({ name: newLabelName, color: selectedColor });
    setNewLabelName('');
    setSelectedColor(labelColorPalette.find((color) => ![...usedColors, selectedColor].includes(color)) || '');
    setIsCreating(false);
  }

  if (isCreating) {
    return (
      <section className="label-editor label-create-editor" ref={panelRef}>
        <div className="popover-header"><button onClick={() => setIsCreating(false)}>‹</button><span>Create label</span><button onClick={onClose}>×</button></div>
        <div className="label-preview-area">
          <span className="label-preview" style={{ '--label-color': selectedColor || '#626f86' }}>{newLabelName || 'Label preview'}</span>
        </div>
        <label className="label-create-field">
          <span>Title</span>
          <input value={newLabelName} onChange={(event) => setNewLabelName(event.target.value)} autoFocus />
        </label>
        <p className="label-section-title">Select a color</p>
        <div className="label-color-grid">
          {labelColorPalette.map((color) => {
            const isUsed = usedColors.includes(color);
            return (
              <button
                key={color}
                className={selectedColor === color ? 'label-color-swatch is-selected' : 'label-color-swatch'}
                style={{ '--label-color': color }}
                disabled={isUsed}
                title={isUsed ? 'Color already used' : color}
                onClick={() => setSelectedColor(color)}
              >
                {selectedColor === color && !isUsed ? '✓' : ''}
              </button>
            );
          })}
        </div>
        <button className="remove-color-button" onClick={() => setSelectedColor('')}>× Remove color</button>
        <button className="primary-action create-label-button" disabled={!selectedColor} onClick={handleCreateLabel}>Create</button>
      </section>
    );
  }

  return (
    <section className="label-editor" ref={panelRef}>
      <div className="popover-header"><span>Labels</span><button onClick={onClose}>×</button></div>
      <input className="label-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search labels..." />
      <p className="label-section-title">Labels</p>
      <div className="label-option-list">
        {visibleLabels.map((label) => (
          <div className="label-option" key={label.id}>
            <input type="checkbox" checked={card.labels?.includes(label.id) || false} onChange={() => onLabelToggle(card.id, label.id)} />
            <input className="label-name-input" value={label.name} onChange={(event) => onLabelRename(label.id, event.target.value)} style={{ '--label-color': label.color }} placeholder="Label title" />
            <span>✎</span>
          </div>
        ))}
      </div>
      <button className="create-new-label-button" onClick={() => setIsCreating(true)} disabled={!firstAvailableColor}>Create a new label</button>
      {!firstAvailableColor && <p className="no-colors-left">All label colors are already in use.</p>}
    </section>
  );
}

export default LabelEditor;
/*
File summary:
- Inbox label picker/editor component.
- Supports toggling, renaming, and creating label colors for a card.
- Used by Inbox card quick-edit flows.
*/
