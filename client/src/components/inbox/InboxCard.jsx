import { useEffect, useRef, useState } from 'react';
import CardCoverDisplay from '../CardCoverDisplay.jsx';
import CardCoverEditor from '../CardCoverEditor.jsx';
import DueDateBadge from '../DueDateBadge.jsx';
import DueDateEditor from '../DueDateEditor.jsx';
import { ArchiveCardIcon, EditCardIcon } from '../shared/CardActionIcons.jsx';
import { readDragPayload, resolveCardLabel } from '../../utils/boardState.js';
import LabelEditor from './LabelEditor.jsx';

// Renders one draggable Inbox card with hover edit behavior.
function InboxCard({
  card,
  labels,
  onInboxUpdate,
  onInboxOpen,
  onInboxArchive,
  onInboxDrop,
  onInboxCompleteToggle,
  onInboxLabelToggle,
  onInboxLabelRename,
  onInboxLabelCreate,
  isHighlighted = false
}) {
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [isLabelPanelOpen, setIsLabelPanelOpen] = useState(false);
  const [isCoverPanelOpen, setIsCoverPanelOpen] = useState(false);
  const [isDatesPanelOpen, setIsDatesPanelOpen] = useState(false);
  const [isCompletionCelebrating, setIsCompletionCelebrating] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title);
  const quickEditRef = useRef(null);
  const wasCompleteRef = useRef(Boolean(card.completed || card.done));

  useEffect(() => {
    setDraftTitle(card.title);
  }, [card.title]);

  useEffect(() => {
    const isCompleteNow = Boolean(card.completed || card.done);

    if (isCompleteNow && !wasCompleteRef.current) {
      setIsCompletionCelebrating(true);
      const timeoutId = window.setTimeout(() => setIsCompletionCelebrating(false), 760);
      wasCompleteRef.current = isCompleteNow;
      return () => window.clearTimeout(timeoutId);
    }

    wasCompleteRef.current = isCompleteNow;
    return undefined;
  }, [card.completed, card.done]);

  useEffect(() => {
    if (!isQuickEditing) {
      return undefined;
    }

    // Closes the quick editor when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setIsQuickEditing(false);
        return;
      }

      if (event.type === 'mousedown' && !quickEditRef.current?.contains(event.target)) {
        setIsQuickEditing(false);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isQuickEditing]);

  // Saves the quick editor title when it is valid.
  function saveQuickEdit() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setDraftTitle(card.title);
      setIsQuickEditing(false);
      return;
    }

    if (nextTitle !== card.title) {
      onInboxUpdate(card.id, { title: nextTitle, description: card.description || '' });
    }

    setIsQuickEditing(false);
  }

  // Stores the Inbox card drag payload for Inbox and board drop zones.
  function handleDragStart(event) {
    const payload = JSON.stringify({ type: 'inbox-card', cardId: card.id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', payload);
    event.dataTransfer.setData('text/plain', payload);
  }

  // Drops another Inbox card before this card.
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    onInboxDrop(readDragPayload(event), card.id);
  }

  // Opens the quick editor without starting a drag or opening the card modal.
  function handleEditClick(event) {
    event.stopPropagation();
    setIsQuickEditing(true);
  }

  // Saves a selected cover on this Inbox card.
  function handleCoverSave(cover) {
    onInboxUpdate(card.id, { cover });
  }

  // Removes the cover from this Inbox card.
  function handleCoverRemove() {
    onInboxUpdate(card.id, { cover: null });
  }

  // Saves due date fields from the shared date editor.
  function handleDueDateSave(dateData) {
    onInboxUpdate(card.id, {
      ...dateData,
      dueDateCompleted: Boolean(dateData.isCompleted),
      dueReminder: dateData.dueDateReminder,
      dueRecurring: dateData.dueDateRecurring
    });
  }

  // Clears due date fields from the Inbox card.
  function handleDueDateRemove() {
    onInboxUpdate(card.id, {
      dueDate: '',
      dueTime: '',
      isCompleted: false,
      dueDateCompleted: false,
      dueDateReminder: '1 Day before',
      dueDateRecurring: 'Never',
      dueReminder: '1 Day before',
      dueRecurring: 'Never'
    });
  }

  const dueDateCard = { ...card, isCompleted: Boolean(card.isCompleted || card.dueDateCompleted) };
  const cardCover = typeof card.cover === 'object' ? card.cover : null;
  const isComplete = Boolean(card.completed || card.done);
  const completeButtonClassName = [
    'inbox-complete-dot',
    isComplete ? 'is-complete' : '',
    isCompletionCelebrating ? 'is-celebrating' : ''
  ].filter(Boolean).join(' ');

  if (isQuickEditing) {
    return (
      <>
        <article className="inbox-card inbox-card-editing" ref={quickEditRef}>
          {cardCover && <CardCoverDisplay cover={cardCover} />}
          {card.labels?.length > 0 && (
            <div className="inbox-edit-label-strip">
              {card.labels.map((labelValue) => {
                const label = resolveCardLabel(labelValue, labels);
                return label ? <span key={label.id || label.color} style={{ '--label-color': label.color }}>{label.name}</span> : null;
              })}
            </div>
          )}
          <textarea value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} autoFocus />
          <button className="primary-action inbox-save-button" onClick={saveQuickEdit}>Save</button>
          <div className="inbox-quick-menu">
            <button onClick={() => onInboxOpen(card.id)}>▤ Open card</button>
            <button onClick={() => setIsLabelPanelOpen(true)}>🏷 Edit labels</button>
            <button onClick={() => setIsCoverPanelOpen(true)}>▧ Change cover</button>
            <button onClick={() => setIsDatesPanelOpen(true)}>◷ Edit dates</button>
            <button onClick={() => onInboxArchive(card.id)}><ArchiveCardIcon /> Archive</button>
          </div>
          {isLabelPanelOpen && (
            <LabelEditor
              card={card}
              labels={labels}
              onClose={() => setIsLabelPanelOpen(false)}
              onLabelToggle={onInboxLabelToggle}
              onLabelRename={onInboxLabelRename}
              onLabelCreate={onInboxLabelCreate}
            />
          )}
        </article>
        {isCoverPanelOpen && (
          <CardCoverEditor card={card} onSave={handleCoverSave} onRemove={handleCoverRemove} onClose={() => setIsCoverPanelOpen(false)} />
        )}
        {isDatesPanelOpen && (
          <DueDateEditor card={dueDateCard} placement="side" onClose={() => setIsDatesPanelOpen(false)} onSave={handleDueDateSave} onRemove={handleDueDateRemove} />
        )}
      </>
    );
  }

  return (
    <>
      <article
        className={[cardCover ? 'inbox-card draggable-card has-cover' : 'inbox-card draggable-card', isHighlighted ? 'is-search-highlight' : ''].filter(Boolean).join(' ')}
        data-inbox-card-id={card.id}
        draggable
        onDragStart={handleDragStart}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onDoubleClick={() => onInboxOpen(card.id)}
      >
        {cardCover && <CardCoverDisplay cover={cardCover} />}
        <div className="inbox-card-main">
          {card.labels?.length > 0 && (
            <div className="inbox-label-strip">
              {card.labels.map((labelValue) => {
                const label = resolveCardLabel(labelValue, labels);
                return label ? <span key={label.id || label.color} style={{ '--label-color': label.color }}>{label.name}</span> : null;
              })}
            </div>
          )}
          <div className="inbox-title-row">
            <button
              className={completeButtonClassName}
              aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
              aria-pressed={isComplete}
              onClick={(event) => {
                event.stopPropagation();
                onInboxCompleteToggle(card.id);
              }}
            />
            <p className={isComplete ? 'inbox-card-title is-done' : 'inbox-card-title'}>{card.title}</p>
          </div>
          {card.dueDate && (
            <div className="inbox-due-row">
              <DueDateBadge
                card={dueDateCard}
                onEditDueDate={() => setIsDatesPanelOpen(true)}
              />
            </div>
          )}
        </div>
        {isComplete && (
          <button
            className="inbox-archive-button"
            aria-label="Archive card"
            onClick={(event) => {
              event.stopPropagation();
              onInboxArchive(card.id);
            }}
          >
            <ArchiveCardIcon />
          </button>
        )}
        <button className="inbox-edit-button" aria-label="Edit card" onClick={handleEditClick}><EditCardIcon /></button>
      </article>
      {isCoverPanelOpen && (
        <CardCoverEditor card={card} onSave={handleCoverSave} onRemove={handleCoverRemove} onClose={() => setIsCoverPanelOpen(false)} />
      )}
      {isDatesPanelOpen && (
        <DueDateEditor card={dueDateCard} placement="side" onClose={() => setIsDatesPanelOpen(false)} onSave={handleDueDateSave} onRemove={handleDueDateRemove} />
      )}
    </>
  );
}

export default InboxCard;
/*
File summary:
- Single draggable Inbox card component.
- Handles completion, quick edit, labels, covers, due dates, archive, and drop targeting.
- Used by InboxPanel for each active Inbox card.
*/
