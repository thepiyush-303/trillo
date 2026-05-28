// Renders the Inbox overflow menu popover.
function InboxMenu({ archivedCards, sortDirection, onClose, onSortToggle, onBackgroundChange }) {
  return (
    <section className="inbox-popover inbox-menu-popover">
      <div className="popover-header"><span>Menu</span><button onClick={onClose}>×</button></div>
      <button onClick={onSortToggle}>☷ Sort <span>{sortDirection === 'asc' ? 'A-Z' : sortDirection === 'desc' ? 'Z-A' : ''}</span></button>
      <details>
        <summary>▱ View archived cards <span>{archivedCards.length}</span></summary>
        <div className="archived-list">
          {archivedCards.length === 0 && <p>No archived cards.</p>}
          {archivedCards.map((card) => <p key={card.id}>{card.title}</p>)}
        </div>
      </details>
      <button onClick={onBackgroundChange}>▣ Change background</button>
    </section>
  );
}

export default InboxMenu;
/*
File summary:
- Inbox overflow menu component.
- Shows archived Inbox items, sort controls, and background controls.
- Used from the Inbox panel header menu.
*/
