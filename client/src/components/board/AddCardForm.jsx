import { useEffect, useState } from 'react';

// Renders a compact add-card form inside a list.
function AddCardForm({ listId, onCardCreate, openSignal = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (openSignal > 0) {
      setIsOpen(true);
    }
  }, [openSignal]);

  // Submits the new card title when valid.
  function handleSubmit(event) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onCardCreate(listId, nextTitle);
    setTitle('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button className="add-card-button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setIsOpen(true)}>
        <span>+</span>
        Add a card
      </button>
    );
  }

  return (
    <form className="add-card-form" onPointerDown={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
      <textarea value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Enter a title or paste a link" />
      <div className="add-card-actions">
        <button type="submit" className="primary-action">Add card</button>
        <button type="button" className="composer-close-button" aria-label="Cancel add card" onClick={() => setIsOpen(false)}>×</button>
      </div>
    </form>
  );
}

export default AddCardForm;
/*
File summary:
- Board card composer component.
- Handles local form state and focus behavior for adding cards to a list.
- Used inside every expanded BoardList.
*/
