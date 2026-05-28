import { listColorOptions } from '../../config/boardConfig.js';

// Renders a Trello-style menu for list-level actions.
function ListActionsPopover({
  list,
  menuRef,
  position,
  onClose,
  onAddCard,
  onCopyList,
  onMoveList,
  onMoveCards,
  onSortByTitle,
  onWatchToggle,
  onColorSelect,
  onRemoveColor,
  onArchiveList,
  onArchiveCards
}) {
  return (
    <section
      className="list-actions-popover"
      ref={menuRef}
      style={{ top: position.top, left: position.left, width: position.width }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="list-actions-header">
        <span>List actions</span>
        <button type="button" aria-label="Close list actions" onClick={onClose}>x</button>
      </header>

      <div className="list-actions-group">
        <button type="button" onClick={onAddCard}>Add card</button>
        <button type="button" onClick={onCopyList}>Copy list</button>
        <button type="button" onClick={onMoveList}>Move list</button>
        <button type="button" onClick={onMoveCards}>Move all cards in this list</button>
        <button type="button" onClick={onSortByTitle}>Sort by</button>
        <button type="button" onClick={onWatchToggle}>{list.watched ? 'Unwatch' : 'Watch'}</button>
      </div>

      <div className="list-actions-section">
        <div className="list-actions-section-title">
          <span>Change list color</span>
          <strong>PREMIUM</strong>
          <span aria-hidden="true">⌃</span>
        </div>
        <div className="list-color-grid">
          {listColorOptions.map((color) => (
            <button
              key={color}
              type="button"
              className={list.accent === color ? 'list-color-option is-selected' : 'list-color-option'}
              style={{ '--list-color-option': color }}
              aria-label={`Use ${color} list color`}
              onClick={() => onColorSelect(color)}
            >
              {list.accent === color ? '✓' : ''}
            </button>
          ))}
        </div>
        <button type="button" className="list-remove-color" onClick={onRemoveColor}>× Remove color</button>
      </div>

      <div className="list-actions-section">
        <div className="list-actions-section-title">
          <span>Automation</span>
          <span aria-hidden="true">⌃</span>
        </div>
        <button type="button">When a card is added to the list</button>
        <button type="button" onClick={onSortByTitle}>Every day, sort list by</button>
        <button type="button" onClick={onSortByTitle}>Every Monday, sort list by</button>
        <button type="button">Create a rule</button>
      </div>

      <div className="list-actions-group is-danger-zone">
        <button type="button" onClick={onArchiveList}>Archive this list</button>
        <button type="button" onClick={onArchiveCards}>Archive all cards in this list</button>
      </div>
    </section>
  );
}

export default ListActionsPopover;
/*
File summary:
- List actions menu component.
- Provides list move, copy, sort, watch, color, archive, and bulk-card actions.
- Used by BoardList from the list header menu.
*/
