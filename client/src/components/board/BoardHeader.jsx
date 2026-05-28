import { useEffect, useRef, useState } from 'react';
import InlineTitle from '../shared/InlineTitle.jsx';
import BoardBackgroundEditor from './BoardBackgroundEditor.jsx';

// Renders board title and board-level action controls.
function BoardHeader({ board, onBoardTitleChange, onBoardBackgroundChange, onArchivedCardsOpen, archivedCardsCount = 0 }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBackgroundEditorOpen, setIsBackgroundEditorOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    // Closes the board menu when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        return;
      }

      if (event.type === 'mousedown' && !menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isMenuOpen]);

  // Opens the archived card modal from the board menu.
  function openArchivedCards(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    onArchivedCardsOpen();
  }

  // Keeps keyboard activation working while mouse activation opens before menu dismissal can interfere.
  function handleArchivedCardsClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (event.detail === 0) {
      openArchivedCards(event);
    }
  }

  // Opens the board background picker from the menu.
  function openBackgroundEditor(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    setIsBackgroundEditorOpen(true);
  }

  return (
    <header className="board-header">
      <div className="board-title-group">
        <InlineTitle value={board.title} label="Board title" onSave={onBoardTitleChange} heading />
      </div>
      <div className="board-menu-anchor" ref={menuRef}>
        <button className="icon-button" aria-label="Open board menu" onClick={() => setIsMenuOpen((isOpen) => !isOpen)}>...</button>
        {isMenuOpen && (
          <section className="board-menu-popover">
            <header><span>Menu</span><button onClick={() => setIsMenuOpen(false)}>×</button></header>
            <button>☷ Sort <span>›</span></button>
            <button type="button" onMouseDown={openArchivedCards} onClick={handleArchivedCardsClick}>▱ View archived cards <span>{archivedCardsCount}</span></button>
            <button>＋ Add from <span>›</span></button>
            <button type="button" onMouseDown={openBackgroundEditor} onClick={openBackgroundEditor}>▣ Change background <span>›</span></button>
            <button>⚙ Settings <span>›</span></button>
          </section>
        )}
      </div>
      {isBackgroundEditorOpen && (
        <BoardBackgroundEditor
          background={board.background}
          onSelect={onBoardBackgroundChange}
          onClose={() => setIsBackgroundEditorOpen(false)}
        />
      )}
    </header>
  );
}

export default BoardHeader;
/*
File summary:
- Board header and board menu component.
- Handles board title editing, background menu, and archived cards access.
- Used at the top of the board workspace.
*/
