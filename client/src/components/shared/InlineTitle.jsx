import { useEffect, useState } from 'react';

// Renders an editable title that saves on blur or Enter.
function InlineTitle({ value, label, onSave, heading = false }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Saves the title when it is non-empty and changed.
  function commitTitle() {
    const nextTitle = draft.trim();

    if (!nextTitle) {
      setDraft(value);
      return;
    }

    if (nextTitle !== value) {
      onSave(nextTitle);
    }
  }

  // Handles keyboard save and cancel behavior for title inputs.
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }

    if (event.key === 'Escape') {
      setDraft(value);
      event.currentTarget.blur();
    }
  }

  return (
    <input
      className={heading ? 'inline-title inline-title-board' : 'inline-title'}
      aria-label={label}
      value={draft}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitTitle}
      onKeyDown={handleKeyDown}
    />
  );
}

export default InlineTitle;
/*
File summary:
- Reusable inline editable title input.
- Saves valid changes on blur/Enter and cancels with Escape.
- Used for board and list title editing.
*/
