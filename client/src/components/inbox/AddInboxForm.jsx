import { useState } from 'react';

// Renders the expanded composer that adds a quick Inbox card.
function AddInboxForm({ onInboxCreate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  // Submits the new Inbox card title when valid.
  function handleSubmit(event) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onInboxCreate(nextTitle);
    setTitle('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button className="inbox-add-placeholder" onClick={() => setIsOpen(true)}>
        Add a card
      </button>
    );
  }

  return (
    <form className="inbox-composer" onSubmit={handleSubmit}>
      <textarea value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Enter a title" />
      <div className="form-actions">
        <button type="submit" className="primary-action">Add card</button>
        <button type="button" className="quiet-link" onClick={() => setIsOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export default AddInboxForm;
/*
File summary:
- Inbox card composer component.
- Handles local form state for adding quick Inbox cards.
- Used inside the Inbox panel card list.
*/
