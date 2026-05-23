import { useEffect, useMemo, useRef, useState } from 'react';

export const coverImageOptions = [
  { id: 'space', label: 'Space', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80' },
  { id: 'stars', label: 'Stars', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80' },
  { id: 'ice', label: 'Ice', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80' },
  { id: 'mountains', label: 'Mountains', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80' },
  { id: 'coast', label: 'Coast', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80' },
  { id: 'forest', label: 'Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80' }
];

export const coverColorOptions = [
  '#0c66e4', '#1f845a', '#946f00', '#b65c02', '#ae2e24',
  '#5e4db2', '#c9377c', '#0c536b', '#4c6b1f', '#626f86'
];

function normalizeCover(cover) {
  if (!cover || typeof cover !== 'object') {
    return null;
  }

  if (cover.type === 'image' && cover.url) {
    return { type: 'image', url: cover.url, position: cover.position || 'center', blur: Boolean(cover.blur) };
  }

  if (cover.type === 'color' && cover.color) {
    return { type: 'color', color: cover.color };
  }

  return null;
}

function coversMatch(first, second) {
  if (!first || !second || first.type !== second.type) {
    return false;
  }

  return first.type === 'image' ? first.url === second.url : first.color === second.color;
}

function CardCoverEditor({ card, onSave, onRemove, onClose }) {
  const currentCover = useMemo(() => normalizeCover(card.cover), [card.cover]);
  const [mode, setMode] = useState(currentCover?.type === 'color' ? 'colors' : 'photos');
  const [selectedCover, setSelectedCover] = useState(currentCover || { type: 'image', url: coverImageOptions[0].url, position: 'center', blur: false });
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

  const previewStyle = selectedCover.type === 'image'
    ? { backgroundImage: 'url("' + selectedCover.url + '")', backgroundPosition: selectedCover.position || 'center' }
    : { background: selectedCover.color };

  function applyCover() {
    onSave(selectedCover);
    onClose();
  }

  function removeCover() {
    onRemove();
    onClose();
  }

  return (
    <section className="modal-backdrop cover-editor-backdrop">
      <div className="cover-editor-panel" ref={panelRef}>
        <div className="popover-header cover-editor-header">
          <span>Change cover</span>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        <div className="cover-editor-preview" style={previewStyle} aria-hidden="true" />

        <div className="cover-editor-tabs" role="tablist" aria-label="Cover type">
          <button className={mode === 'photos' ? 'is-active' : ''} onClick={() => setMode('photos')}>Photos</button>
          <button className={mode === 'colors' ? 'is-active' : ''} onClick={() => setMode('colors')}>Colors</button>
        </div>

        {mode === 'photos' && (
          <div className="cover-photo-grid">
            {coverImageOptions.map((photo) => {
              const cover = { type: 'image', url: photo.url, position: 'center', blur: false };

              return (
                <button
                  key={photo.id}
                  className={coversMatch(selectedCover, cover) ? 'cover-photo-option is-selected' : 'cover-photo-option'}
                  style={{ backgroundImage: 'url("' + photo.url + '")' }}
                  onClick={() => setSelectedCover(cover)}
                  aria-label={'Use ' + photo.label + ' cover'}
                />
              );
            })}
          </div>
        )}

        {mode === 'colors' && (
          <div className="cover-color-grid">
            {coverColorOptions.map((color) => {
              const cover = { type: 'color', color };

              return (
                <button
                  key={color}
                  className={coversMatch(selectedCover, cover) ? 'cover-color-option is-selected' : 'cover-color-option'}
                  style={{ background: color }}
                  onClick={() => setSelectedCover(cover)}
                  aria-label={'Use ' + color + ' cover'}
                />
              );
            })}
          </div>
        )}

        <div className="cover-editor-actions">
          <button className="primary-action" onClick={applyCover}>Apply cover</button>
          <button className="quiet-action" onClick={removeCover}>Remove cover</button>
        </div>
      </div>
    </section>
  );
}

export default CardCoverEditor;
