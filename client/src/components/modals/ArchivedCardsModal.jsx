import { useEffect, useState } from 'react';

// Renders archived board cards with restore and delete actions.
function ArchivedCardsModal({ cards, onClose, onRestore, onDelete }) {
  const [search, setSearch] = useState('');
  const visibleCards = cards.filter((card) => card.title.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    // Closes the archived cards modal when the user presses Escape.
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop archived-modal-backdrop" onMouseDown={onClose}>
      <section className="archived-cards-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>Inbox - Archived Cards</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>
        <label className="archived-search">
          <span>⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search archived cards" />
        </label>
        <p className="archive-period">Past 7 days</p>
        <div className="archived-card-results">
          {visibleCards.length === 0 && <p className="empty-state">No archived cards.</p>}
          {visibleCards.map((card) => (
            <article className="archived-card-item" key={card.id}>
              <p><span className="archived-check">✓</span>{card.title}</p>
              <small>▱ Archived</small>
              <div>
                <button onClick={() => onRestore(card.id)}>Restore</button>
                <span>•</span>
                <button onClick={() => onDelete(card.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ArchivedCardsModal;
/*
File summary:
- Archived cards modal component.
- Shows searchable archived board cards with restore/delete actions.
- Used by App/Board when the archive view is opened.
*/
