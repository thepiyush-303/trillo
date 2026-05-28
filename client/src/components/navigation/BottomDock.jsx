import { useEffect, useRef, useState } from 'react';
import { getBoardBackgroundStyle } from '../../utils/boardView.js';

// Renders the floating view switcher dock from the reference board UI.
function BottomDock({ visibleViews, boards, activeBoardId, onViewToggle, onBoardSwitch }) {
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const switchRef = useRef(null);

  useEffect(() => {
    if (!isSwitchOpen) {
      return undefined;
    }

    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setIsSwitchOpen(false);
        return;
      }

      if (event.type === 'mousedown' && !switchRef.current?.contains(event.target)) {
        setIsSwitchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isSwitchOpen]);

  return (
    <nav className="bottom-dock" aria-label="Board views">
      <button className={visibleViews.inbox ? 'is-active' : ''} aria-pressed={visibleViews.inbox} onClick={() => onViewToggle('inbox')}>▣ Inbox</button>
      <button className={visibleViews.board ? 'is-active' : ''} aria-pressed={visibleViews.board} onClick={() => onViewToggle('board')}>▥ Board</button>
      <span className="dock-divider" aria-hidden="true" />
      <div className="board-switch-anchor" ref={switchRef}>
        <button type="button" aria-expanded={isSwitchOpen} onClick={() => setIsSwitchOpen((isOpen) => !isOpen)}>⇄ Switch boards</button>
        {isSwitchOpen && (
          <section className="board-switch-popover">
            <h3>Switch boards</h3>
            {boards.map((item) => (
              <button key={item.id} type="button" className={item.id === activeBoardId ? 'is-current' : ''} onClick={() => { onBoardSwitch(item.id); setIsSwitchOpen(false); }}>
                <span className="board-switch-swatch" style={getBoardBackgroundStyle(item.background)} />
                <span>{item.title}</span>
              </button>
            ))}
          </section>
        )}
      </div>
    </nav>
  );
}

export default BottomDock;
/*
File summary:
- Floating bottom view switcher.
- Toggles Inbox/Board visibility and switches between boards.
- Used by App as the persistent workspace navigation dock.
*/
