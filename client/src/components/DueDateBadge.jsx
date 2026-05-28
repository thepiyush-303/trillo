import { getDueDateBadgeStyle, formatCardDate } from '../utils/dateUtils';

/**
 * DueDateBadge - Displays due date with color-coded urgency indicator
 *
 * Architecture:
 * - Shows due date in badge format (e.g., "May 23")
 * - Color indicates urgency: green (complete) → red (overdue) → orange → yellow → grey
 * - Checkbox allows marking due date as complete without opening modal
 * - Edit button opens date picker for modifications
 * - Integrates with date utilities for consistent badge logic
 *
 * @param {Object} card - Card object with dueDate, dueTime, isCompleted
 * @param {Function} onToggleComplete - Callback to toggle completion: () => void
 * @param {Function} onEditDueDate - Callback to open editor: () => void
 */
function DueDateBadge({ card, onEditDueDate }) {
  // Guard: no due date, don't render
  if (!card.dueDate) {
    return null;
  }

  const badgeStyle = getDueDateBadgeStyle(card.dueDate, card.dueTime, card.dueDateReminder || card.dueReminder);
  const formattedDate = formatCardDate(card.dueDate);

  return (
    <div className="due-date-badge-group">
      {badgeStyle.showBell && <span className={`due-date-bell due-date-${badgeStyle.color}`} title={badgeStyle.tooltip} aria-hidden="true">🔔</span>}
      <button
        className={`due-date-badge due-date-${badgeStyle.color}`}
        aria-label="Edit due date"
        onClick={(e) => {
          e.stopPropagation();
          onEditDueDate();
        }}
        title={badgeStyle.tooltip}
      >
        <span className="due-date-clock" aria-hidden="true">◷</span>
        <span className="due-date-text">{formattedDate}</span>
      </button>
    </div>
  );
}

export default DueDateBadge;
/*
File summary:
- Compact due-date badge component.
- Displays date status styling and opens editing when clicked.
- Used on inbox cards, board cards, and detail surfaces.
*/
