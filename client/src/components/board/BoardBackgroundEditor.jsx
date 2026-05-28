import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_BOARD_BACKGROUND,
  boardBackgroundColorOptions,
  boardBackgroundPhotoOptions
} from '../../config/boardConfig.js';

// Renders the Trello-like board background picker.
function BoardBackgroundEditor({ background, onSelect, onClose }) {
  const [view, setView] = useState('overview');
  const panelRef = useRef(null);

  useEffect(() => {
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

  function selectBackground(nextBackground) {
    onSelect(nextBackground);
    onClose();
  }

  function isSelected(nextBackground) {
    if (!background || background.type !== nextBackground.type) {
      return false;
    }

    return nextBackground.type === 'image'
      ? background.url === nextBackground.url
      : background.value === nextBackground.value;
  }

  return (
    <section className="modal-backdrop board-background-backdrop">
      <div className="board-background-panel" ref={panelRef}>
        <div className="background-editor-header">
          <button aria-label="Back" onClick={() => (view === 'overview' ? onClose() : setView('overview'))}>‹</button>
          <span>{view === 'overview' ? 'Change background' : view === 'photos' ? 'Photos' : 'Colors'}</span>
          <button aria-label="Close" onClick={onClose}>x</button>
        </div>

        {view === 'overview' && (
          <>
            <div className="background-editor-feature-grid">
              <button className="background-feature-card background-feature-photos" onClick={() => setView('photos')}>
                <span>Photos</span>
              </button>
              <button className="background-feature-card background-feature-colors" onClick={() => setView('colors')}>
                <span>Colors</span>
              </button>
            </div>
            <div className="background-editor-divider" />
            <button className="background-remove-button" onClick={() => selectBackground(DEFAULT_BOARD_BACKGROUND)}>Reset background</button>
          </>
        )}

        {view === 'photos' && (
          <div className="background-photo-grid">
            {boardBackgroundPhotoOptions.map((photo) => {
              const nextBackground = { type: 'image', url: photo.url, position: 'center' };

              return (
                <button
                  key={photo.id}
                  className={isSelected(nextBackground) ? 'background-photo-option is-selected' : 'background-photo-option'}
                  style={{ backgroundImage: 'url("' + photo.url + '")' }}
                  onClick={() => selectBackground(nextBackground)}
                  aria-label={'Use ' + photo.label + ' background'}
                />
              );
            })}
          </div>
        )}

        {view === 'colors' && (
          <div className="background-color-grid">
            {boardBackgroundColorOptions.map((value) => {
              const nextBackground = { type: 'color', value };

              return (
                <button
                  key={value}
                  className={isSelected(nextBackground) ? 'background-color-option is-selected' : 'background-color-option'}
                  style={{ background: value }}
                  onClick={() => selectBackground(nextBackground)}
                  aria-label="Use color background"
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default BoardBackgroundEditor;
/*
File summary:
- Board background picker component.
- Lets users select image/color backgrounds or reset the board background.
- Used by BoardHeader menu actions.
*/
