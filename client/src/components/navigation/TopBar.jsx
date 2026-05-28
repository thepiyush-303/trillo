import { useEffect, useRef, useState } from 'react';
import { DEFAULT_BOARD_BACKGROUND, boardBackgroundColorOptions, boardBackgroundPhotoOptions } from '../../config/boardConfig.js';
import { getBoardBackgroundStyle } from '../../utils/boardView.js';
import UserAvatar from '../shared/UserAvatar.jsx';

// Renders the dark global navigation bar.
function TopBar({ searchQuery, searchResults, onSearchChange, onSearchResultSelect, onBoardCreate }) {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const createRef = useRef(null);
  const hasSearchQuery = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!isCreateMenuOpen && !isCreatePanelOpen) {
      return undefined;
    }

    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setIsCreateMenuOpen(false);
        setIsCreatePanelOpen(false);
        return;
      }

      if (event.type === 'mousedown' && !createRef.current?.contains(event.target)) {
        setIsCreateMenuOpen(false);
        setIsCreatePanelOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isCreateMenuOpen, isCreatePanelOpen]);

  return (
    <header className="top-bar">
      <div className="top-left">
        <button className="icon-button app-switcher-button" aria-label="Open app switcher">
          <span className="grid-icon" />
        </button>
        <div className="brand-mark" aria-hidden="true"><span /><span /></div>
        <span className="brand-name">Trello</span>
      </div>

      <div className="top-center">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input type="search" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search" />
          {hasSearchQuery && (
            <section className="search-results-popover">
              <h3>Cards</h3>
              {searchResults.length === 0 ? (
                <p>No matching active cards</p>
              ) : (
                searchResults.map((result) => (
                  <button key={result.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSearchResultSelect(result)}>
                    <span>{result.title}</span>
                    <small>{result.location}</small>
                  </button>
                ))
              )}
            </section>
          )}
        </label>

        <div className="create-anchor" ref={createRef}>
          <button className="create-button" onClick={() => { setIsCreateMenuOpen((isOpen) => !isOpen); setIsCreatePanelOpen(false); }}>Create</button>
          {isCreateMenuOpen && (
            <section className="create-menu-popover">
              <button type="button" onClick={() => { setIsCreateMenuOpen(false); setIsCreatePanelOpen(true); }}>
                <span className="create-menu-icon">▥</span>
                <span>
                  <strong>Create board</strong>
                  <small>A board is made up of cards ordered on lists. Use it to manage projects, track information, or organize anything.</small>
                </span>
              </button>
            </section>
          )}
          {isCreatePanelOpen && (
            <CreateBoardPanel
              onClose={() => setIsCreatePanelOpen(false)}
              onCreate={(boardDraft) => {
                onBoardCreate(boardDraft);
                setIsCreatePanelOpen(false);
              }}
            />
          )}
        </div>
      </div>

      <div className="top-actions"><UserAvatar initials="PB" /></div>
    </header>
  );
}

// Renders the Trello-like create board panel opened from the global Create button.
function CreateBoardPanel({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [background, setBackground] = useState(DEFAULT_BOARD_BACKGROUND);
  const canCreate = title.trim().length > 0;

  function submitBoard(event) {
    event.preventDefault();

    if (canCreate) {
      onCreate({ title, background });
    }
  }

  return (
    <form className="create-board-panel" onSubmit={submitBoard}>
      <header>
        <button type="button" aria-label="Back" onClick={onClose}>‹</button>
        <span>Create board</span>
        <button type="button" aria-label="Close" onClick={onClose}>×</button>
      </header>

      <div className="create-board-preview" style={getBoardBackgroundStyle(background)}>
        <div className="preview-list" />
        <div className="preview-list is-tall" />
        <div className="preview-list" />
      </div>

      <label className="create-board-label">Background</label>
      <div className="create-background-grid">
        {boardBackgroundPhotoOptions.slice(0, 4).map((photo) => {
          const option = { type: 'image', url: photo.url, position: 'center' };
          const selected = background.type === 'image' && background.url === photo.url;

          return <button key={photo.id} type="button" className={selected ? 'create-background-option is-selected' : 'create-background-option'} style={{ backgroundImage: `url("${photo.url}")` }} onClick={() => setBackground(option)} aria-label={`Use ${photo.label} background`} />;
        })}
      </div>
      <div className="create-background-grid is-colors">
        {boardBackgroundColorOptions.slice(0, 6).map((value) => {
          const option = { type: 'color', value };
          const selected = background.type === 'color' && background.value === value;

          return <button key={value} type="button" className={selected ? 'create-background-option is-selected' : 'create-background-option'} style={{ background: value }} onClick={() => setBackground(option)} aria-label="Use board color" />;
        })}
      </div>

      <label className="create-board-label" htmlFor="new-board-title">Board title <span>*</span></label>
      <input id="new-board-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
      <button type="submit" className="create-board-submit" disabled={!canCreate}>Create</button>
    </form>
  );
}

export default TopBar;
/*
File summary:
- Global top navigation bar.
- Contains search, board creation menu, create-board panel, and user avatar display.
- Used once by App to provide application-wide navigation actions.
*/
