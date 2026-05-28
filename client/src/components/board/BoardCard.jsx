import { useEffect, useRef, useState } from 'react';
import CardCoverDisplay from '../CardCoverDisplay.jsx';
import CardCoverEditor from '../CardCoverEditor.jsx';
import DueDateBadge from '../DueDateBadge.jsx';
import DueDateEditor from '../DueDateEditor.jsx';
import CardCover from '../shared/CardCover.jsx';
import UserAvatar from '../shared/UserAvatar.jsx';
import { ArchiveCardIcon, EditCardIcon } from '../shared/CardActionIcons.jsx';
import { readDragPayload, resolveCardLabel } from '../../utils/boardState.js';

// Renders one compact card preview in a list.
function BoardCard({ card, listId, labels, onCardOpen, onCardDrop, onCardUpdate, onCardCompleteToggle, onCardArchive, isHighlighted = false }) {
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [isCoverPanelOpen, setIsCoverPanelOpen] = useState(false);
  const [isDatesPanelOpen, setIsDatesPanelOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title);
  const quickEditRef = useRef(null);

  useEffect(() => {
    setDraftTitle(card.title);
  }, [card.title]);

  useEffect(() => {
    if (!isQuickEditing) {
      return undefined;
    }

    // Closes the board quick editor when the user clicks outside it or presses Escape.
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

  // Stores the board card drag payload for list and Inbox drop zones.
  function handleDragStart(event) {
    const payload = JSON.stringify({ type: 'board-card', cardId: card.id, listId });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', payload);
    event.dataTransfer.setData('text/plain', payload);
  }

  // Drops another draggable card before this card.
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    onCardDrop(readDragPayload(event), listId, card.id);
  }

  // Toggles the list card completion state without opening the modal.
  function handleCompleteClick(event) {
    event.stopPropagation();
    onCardCompleteToggle(card.id);
  }

  // Opens the board quick editor without opening the card modal.
  function handleEditClick(event) {
    event.stopPropagation();
    setIsQuickEditing(true);
  }

  // Archives a board card without opening the modal.
  function handleArchiveClick(event) {
    event.stopPropagation();
    onCardArchive(card.id);
  }

  // Saves a selected cover on this card.
  function handleCoverSave(cover) {
    onCardUpdate(card.id, { cover });
  }

  // Removes the cover from this card.
  function handleCoverRemove() {
    onCardUpdate(card.id, { cover: null });
  }

  // Saves due date fields from the date editor.
  function handleDueDateSave(dateData) {
    onCardUpdate(card.id, {
      ...dateData,
      dueDateCompleted: Boolean(dateData.isCompleted),
      dueReminder: dateData.dueDateReminder,
      dueRecurring: dateData.dueDateRecurring
    });
  }

  // Clears due date fields from the card.
  function handleDueDateRemove() {
    onCardUpdate(card.id, {
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

  // Saves the board quick editor title when it is valid.
  function saveQuickEdit() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setDraftTitle(card.title);
      setIsQuickEditing(false);
      return;
    }

    if (nextTitle !== card.title) {
      onCardUpdate(card.id, { title: nextTitle, description: card.description || '' });
    }

    setIsQuickEditing(false);
  }

  const cardLabels = card.labels?.length > 0 && (
    <div className="label-row">
      {card.labels.map((label) => {
        const labelValue = resolveCardLabel(label, labels);
        return labelValue ? (
          <span
            className={labelValue.name ? 'label-chip has-name' : 'label-chip'}
            key={labelValue.id || labelValue.name || labelValue.color}
            style={{ '--label-color': labelValue.color || '#579dff' }}
            title={labelValue.name || 'Card label'}
          >
            {labelValue.name}
          </span>
        ) : null;
      })}
    </div>
  );
  const dueDateCard = { ...card, isCompleted: Boolean(card.isCompleted || card.dueDateCompleted) };
  const cardCover = typeof card.cover === 'object' ? card.cover : null;

  if (isQuickEditing) {
    return (
      <>
        <article className="board-card board-card-editing" ref={quickEditRef}>
          {cardCover && <CardCoverDisplay cover={cardCover} />}
          {!cardCover && typeof card.cover === 'string' && <CardCover variant={card.cover} />}
          {cardLabels}
          <textarea value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} autoFocus />
          <button className="primary-action inbox-save-button" onClick={saveQuickEdit}>Save</button>
          <div className="inbox-quick-menu board-quick-menu">
            <button onClick={() => onCardOpen(card.id)}>▤ Open card</button>
            <button onClick={() => setIsCoverPanelOpen(true)}>▧ Change cover</button>
            <button onClick={() => setIsDatesPanelOpen(true)}>◷ Edit dates</button>
            <button onClick={handleArchiveClick}><ArchiveCardIcon /> Archive</button>
          </div>
        </article>
        {isCoverPanelOpen && (
          <CardCoverEditor card={card} onSave={handleCoverSave} onRemove={handleCoverRemove} onClose={() => setIsCoverPanelOpen(false)} />
        )}
        {isDatesPanelOpen && (
          <DueDateEditor card={dueDateCard} onClose={() => setIsDatesPanelOpen(false)} onSave={handleDueDateSave} onRemove={handleDueDateRemove} />
        )}
      </>
    );
  }

  const hasImageCover = cardCover?.type === 'image' || typeof card.cover === 'string';
  const hasSolidCover = cardCover?.type === 'color';
  const isComplete = Boolean(card.completed || card.done);
  const boardCardClassName = [
    'board-card draggable-card',
    hasImageCover || hasSolidCover ? 'has-cover' : '',
    hasImageCover ? 'has-image-cover' : '',
    hasSolidCover ? 'has-solid-cover' : '',
    isHighlighted ? 'is-search-highlight' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <article className={boardCardClassName} data-board-card-id={card.id} draggable role="button" tabIndex="0" onPointerDown={(event) => event.stopPropagation()} onDragStart={handleDragStart} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => onCardOpen(card.id)} onKeyDown={(event) => event.key === 'Enter' && onCardOpen(card.id)}>
      {(card.completed || card.done) && (
        <button className="card-archive-button" aria-label="Archive card" onClick={handleArchiveClick}><ArchiveCardIcon /></button>
      )}
      <button className="card-edit-button" aria-label="Edit card" onClick={handleEditClick}><EditCardIcon /></button>
      {cardCover && <CardCoverDisplay cover={cardCover} />}
      {!cardCover && typeof card.cover === 'string' && <CardCover variant={card.cover} />}
      {cardLabels}
      <div className="card-title-row">
        <button className={isComplete ? 'board-complete-dot is-complete' : 'board-complete-dot'} aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'} aria-pressed={isComplete} onClick={handleCompleteClick} />
        <p className={isComplete ? 'card-title is-done' : 'card-title'}>{card.title}</p>
      </div>
      {card.dueDate && (
        <div className="card-meta-row">
          <DueDateBadge
            card={dueDateCard}
            onEditDueDate={() => setIsDatesPanelOpen(true)}
          />
        </div>
      )}
      {(card.description || card.badges || card.members) && (
        <div className="card-footer">
          <div className="card-badges">
            {card.description && <span>☰</span>}
            {card.badges?.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
          <div className="mini-members">
            {card.members?.map((member) => (
              <UserAvatar key={member} initials={member} small />
            ))}
          </div>
        </div>
      )}
      </article>
      {isCoverPanelOpen && (
        <CardCoverEditor card={card} onSave={handleCoverSave} onRemove={handleCoverRemove} onClose={() => setIsCoverPanelOpen(false)} />
      )}
      {isDatesPanelOpen && (
        <DueDateEditor card={dueDateCard} onClose={() => setIsDatesPanelOpen(false)} onSave={handleDueDateSave} onRemove={handleDueDateRemove} />
      )}
    </>
  );
}

export default BoardCard;
/*
File summary:
- Single draggable board card component.
- Handles completion, quick edit, covers, due dates, archive, and drop targeting.
- Used by BoardList for each card in a list.
*/
