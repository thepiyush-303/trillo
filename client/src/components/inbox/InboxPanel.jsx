import { useEffect, useRef, useState } from 'react';
import AddInboxForm from './AddInboxForm.jsx';
import ConsolidatePanel from './ConsolidatePanel.jsx';
import InboxCard from './InboxCard.jsx';
import InboxFilterPanel from './InboxFilterPanel.jsx';
import InboxMenu from './InboxMenu.jsx';
import { readDragPayload } from '../../utils/boardState.js';

// Renders the quick-capture Inbox sidebar.
function InboxPanel({
  cards,
  labels,
  archivedCards,
  sortDirection,
  filters,
  backgroundIndex,
  isConsolidateOpen,
  onConsolidateToggle,
  onInboxCreate,
  onInboxUpdate,
  onInboxOpen,
  onInboxArchive,
  onInboxDrop,
  onInboxCompleteToggle,
  onInboxLabelToggle,
  onInboxLabelRename,
  onInboxLabelCreate,
  onSortToggle,
  onBackgroundChange,
  onFiltersChange,
  highlightedCard
}) {
  const [openPanel, setOpenPanel] = useState(null);
  const popoverRef = useRef(null);
  const panelActionsRef = useRef(null);

  useEffect(() => {
    if (!openPanel) {
      return undefined;
    }

    // Closes the Inbox popover when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setOpenPanel(null);
        return;
      }

      if (
        event.type === 'mousedown' &&
        !popoverRef.current?.contains(event.target) &&
        !panelActionsRef.current?.contains(event.target)
      ) {
        setOpenPanel(null);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [openPanel]);

  // Allows Inbox cards to be dropped at the end of the Inbox.
  function handleInboxListDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    onInboxDrop(readDragPayload(event));
  }

  // Toggles one Inbox header popover at a time.
  function togglePanel(panelName) {
    setOpenPanel((currentPanel) => (currentPanel === panelName ? null : panelName));
  }

  return (
    <aside
      className={`inbox-panel inbox-background-${backgroundIndex}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleInboxListDrop}
    >
      <div className="panel-title-row">
        <h2>Inbox</h2>
        <div className="panel-actions" ref={panelActionsRef}>
          <button className="icon-button" aria-label="Filter inbox" onClick={() => togglePanel('filter')}>≡</button>
          <button className="icon-button" aria-label="More inbox actions" onClick={() => togglePanel('menu')}>...</button>
        </div>
      </div>

      {openPanel && (
        <div ref={popoverRef}>
          {openPanel === 'menu' && (
            <InboxMenu
              archivedCards={archivedCards}
              sortDirection={sortDirection}
              onClose={() => setOpenPanel(null)}
              onSortToggle={onSortToggle}
              onBackgroundChange={onBackgroundChange}
            />
          )}
          {openPanel === 'filter' && (
            <InboxFilterPanel filters={filters} onClose={() => setOpenPanel(null)} onFiltersChange={onFiltersChange} />
          )}
        </div>
      )}

      <AddInboxForm onInboxCreate={onInboxCreate} />

      <div className="inbox-list" onDragOver={(event) => event.preventDefault()} onDrop={handleInboxListDrop}>
        {cards.length === 0 && <p className="empty-state">No cards match.</p>}
        {cards.map((card) => (
          <InboxCard
            key={card.id}
            card={card}
            labels={labels}
            onInboxUpdate={onInboxUpdate}
            onInboxOpen={onInboxOpen}
            onInboxArchive={onInboxArchive}
            onInboxDrop={onInboxDrop}
            onInboxCompleteToggle={onInboxCompleteToggle}
            onInboxLabelToggle={onInboxLabelToggle}
            onInboxLabelRename={onInboxLabelRename}
            onInboxLabelCreate={onInboxLabelCreate}
            isHighlighted={highlightedCard?.type === 'inbox' && highlightedCard.id === card.id}
          />
        ))}
      </div>

      <button className="inbox-footer" onClick={onConsolidateToggle}>
        <span className="footer-icon-cluster" aria-hidden="true"><i>✉</i><i>●</i><i>▣</i><i>◉</i><i>◆</i></span>
        <span>Consolidate your to-dos</span>
        <span aria-hidden="true">⌃</span>
      </button>
      {isConsolidateOpen && <ConsolidatePanel onClose={onConsolidateToggle} />}
    </aside>
  );
}

export default InboxPanel;
/*
File summary:
- Main Inbox sidebar component.
- Wires Inbox header controls, filters, card list, add form, and consolidation entry.
- Used by App when the Inbox view is visible.
*/
