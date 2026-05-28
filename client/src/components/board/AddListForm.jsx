import { useState } from 'react';

// Renders a compact add-list form at the end of the board.
function AddListForm({ onListCreate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  // Submits the new list title when valid.
  function handleSubmit(event) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onListCreate(nextTitle);
    setTitle('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button className="add-list-button" onClick={() => setIsOpen(true)}>
        + Add another list
      </button>
    );
  }

  return (
    <form className="add-list-form" onSubmit={handleSubmit}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Enter list title..." />
      <div className="form-actions">
        <button type="submit" className="primary-action">Add list</button>
        <button type="button" className="quiet-action" onClick={() => setIsOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export default AddListForm;
/*
File summary:
- Board list composer component.
- Handles local form state for creating new lists.
- Used at the end of the board list row.
*/
