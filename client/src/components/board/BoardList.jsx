import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import InlineTitle from '../shared/InlineTitle.jsx';
import { listAccents } from '../../config/boardConfig.js';
import { readDragPayload } from '../../utils/boardState.js';
import AddCardForm from './AddCardForm.jsx';
import BoardCard from './BoardCard.jsx';
import ListActionsPopover from './ListActionsPopover.jsx';

// Renders one board list column with editable list and card controls.
function BoardList({
  list,
  isCollapsed,
  isDragging,
  dragAttributes,
  dragListeners,
  setSortableNodeRef,
  sortableStyle,
  onListUpdate,
  onListDelete,
  onListDuplicate,
  onListMoveRight,
  onListSort,
  onListMoveCardsRight,
  onListArchiveCards,
  onListCollapseToggle,
  onCardCreate,
  onCardOpen,
  onCardDrop,
  onCardUpdate,
  onCardCompleteToggle,
  onCardArchive,
  labels,
  highlightedCard
}) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [actionsPosition, setActionsPosition] = useState(null);
  const [addCardSignal, setAddCardSignal] = useState(0);
  const menuRef = useRef(null);
  const actionButtonRef = useRef(null);

  useEffect(() => {
    if (!isActionsOpen) {
      return undefined;
    }

    function closeActions() {
      setIsActionsOpen(false);
    }

    function updateActionsPosition() {
      const buttonRect = actionButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      const menuWidth = Math.min(306, window.innerWidth - 32);
      const left = Math.min(Math.max(16, buttonRect.right - menuWidth), window.innerWidth - menuWidth - 16);
      const top = Math.min(buttonRect.bottom + 8, window.innerHeight - 96);
      setActionsPosition({ top, left, width: menuWidth });
    }

    function handleDismiss(event) {
      if (event.key === 'Escape') {
        closeActions();
        return;
      }

      if (event.type === 'mousedown' && !menuRef.current?.contains(event.target) && !actionButtonRef.current?.contains(event.target)) {
        closeActions();
      }
    }

    updateActionsPosition();
    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);
    window.addEventListener('resize', updateActionsPosition);
    window.addEventListener('scroll', updateActionsPosition, true);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
      window.removeEventListener('resize', updateActionsPosition);
      window.removeEventListener('scroll', updateActionsPosition, true);
    };
  }, [isActionsOpen]);

  function requestAddCard() {
    setIsActionsOpen(false);
    setAddCardSignal((signal) => signal + 1);
  }

  // Allows cards to be dropped at the end of this list.
  function handleListDrop(event) {
    event.preventDefault();
    onCardDrop(readDragPayload(event), list.id);
  }

  const listClassName = [
    'board-list',
    isCollapsed ? 'board-list-collapsed' : '',
    isDragging ? 'is-dragging' : ''
  ].filter(Boolean).join(' ');

  return (
    <section
      className={listClassName}
      ref={setSortableNodeRef}
      style={{ ...sortableStyle, '--list-accent': list.accent }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleListDrop}
      {...dragAttributes}
      {...dragListeners}
    >
      <div className="list-header">
        <InlineTitle
          value={list.title}
          label={`${list.title} title`}
          onSave={(title) => onListUpdate(list.id, title)}
        />
        <button
          className="icon-button list-collapse-button"
          aria-label={isCollapsed ? `Expand ${list.title}` : `Collapse ${list.title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onListCollapseToggle(list.id);
          }}
        >
          <span className={isCollapsed ? 'list-expand-icon' : 'list-collapse-icon'} aria-hidden="true">
            {isCollapsed ? (
              <svg viewBox="0 0 20 16" focusable="false">
                <path d="M8 4 4 8l4 4" />
                <path d="M12 4l4 4-4 4" />
                <path d="M4 8h12" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 16" focusable="false">
                <path d="M3 8h5" />
                <path d="m6 5 3 3-3 3" />
                <path d="M17 8h-5" />
                <path d="m14 5-3 3 3 3" />
              </svg>
            )}
          </span>
        </button>
        <div className="list-actions-anchor" ref={menuRef}>
          <button
            ref={actionButtonRef}
            className={isActionsOpen ? 'icon-button list-more-button is-active' : 'icon-button list-more-button'}
            aria-label={`More actions for ${list.title}`}
            aria-expanded={isActionsOpen}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              const nextIsOpen = !isActionsOpen;
              if (nextIsOpen) {
                const buttonRect = event.currentTarget.getBoundingClientRect();
                const menuWidth = Math.min(306, window.innerWidth - 32);
                setActionsPosition({
                  top: Math.min(buttonRect.bottom + 8, window.innerHeight - 96),
                  left: Math.min(Math.max(16, buttonRect.right - menuWidth), window.innerWidth - menuWidth - 16),
                  width: menuWidth
                });
              }
              setIsActionsOpen(nextIsOpen);
            }}
          >
            ...
          </button>
          {isActionsOpen && actionsPosition && createPortal(
            <ListActionsPopover
              list={list}
              menuRef={menuRef}
              position={actionsPosition}
              onClose={() => setIsActionsOpen(false)}
              onAddCard={requestAddCard}
              onCopyList={() => { onListDuplicate(list.id); setIsActionsOpen(false); }}
              onMoveList={() => { onListMoveRight(list.id); setIsActionsOpen(false); }}
              onMoveCards={() => { onListMoveCardsRight(list.id); setIsActionsOpen(false); }}
              onSortByTitle={() => { onListSort(list.id, 'title'); setIsActionsOpen(false); }}
              onWatchToggle={() => onListUpdate(list.id, { watched: !list.watched })}
              onColorSelect={(accent) => onListUpdate(list.id, { accent })}
              onRemoveColor={() => onListUpdate(list.id, { accent: listAccents[3] })}
              onArchiveList={() => { onListDelete(list.id); setIsActionsOpen(false); }}
              onArchiveCards={() => { onListArchiveCards(list.id); setIsActionsOpen(false); }}
            />,
            document.body
          )}
        </div>
      </div>

      {isCollapsed ? (
        <button
          className="collapsed-list-body"
          onClick={(event) => {
            event.stopPropagation();
            onListCollapseToggle(list.id);
          }}
          aria-label={`Expand ${list.title}`}
        >
          <span>{list.title}</span>
          <small>{list.cards.length}</small>
        </button>
      ) : (
        <>
          <div className="card-stack" onPointerDown={(event) => event.stopPropagation()}>
            {list.cards.map((card) => (
              <BoardCard key={card.id} card={card} listId={list.id} labels={labels} onCardOpen={onCardOpen} onCardDrop={onCardDrop} onCardUpdate={onCardUpdate} onCardCompleteToggle={onCardCompleteToggle} onCardArchive={onCardArchive} isHighlighted={highlightedCard?.type === 'board' && highlightedCard.id === card.id} />
            ))}
          </div>

          <AddCardForm listId={list.id} onCardCreate={onCardCreate} openSignal={addCardSignal} />
        </>
      )}
    </section>
  );
}

export default BoardList;
/*
File summary:
- Single board list component.
- Renders list header/actions, card stack, drop zone, collapsed state, and card composer.
- Used by Board for every list on the active board.
*/
