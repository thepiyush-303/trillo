import { useEffect, useRef, useState } from 'react';
import { formatDateToISO, formatTimeToInput } from '../utils/dateUtils';

/**
 * DueDateEditor - Calendar-based due date picker modal
 *
 * Architecture:
 * - Self-contained modal with calendar and date/time/reminder fields
 * - Calendar auto-generates for the displayed month
 * - Quick-select buttons (Today, Tomorrow, Next week) for speed
 * - Persists to card on Save
 * - Dismissible via Escape key or clicking outside
 * - Supports recurring dates and reminders
 *
 * Date model:
 * - dueDate: ISO 8601 string (YYYY-MM-DD), empty if disabled
 * - dueTime: Time string (e.g., "9:00 AM")
 * - dueDateReminder: Notification timing (e.g., "1 Day before")
 * - dueDateRecurring: Recurrence pattern (Never, Daily, Weekly, Monthly)
 *
 * @param {Object} card - Card object with due date fields
 * @param {Function} onClose - Callback to close editor: () => void
 * @param {Function} onSave - Callback to save: (dateData) => void
 * @param {Function} onRemove - Callback to clear due date: () => void
 */
function DueDateEditor({ card, onClose, onSave, onRemove, placement = 'modal' }) {
  // State management
  const [hasDueDate, setHasDueDate] = useState(Boolean(card.dueDate));
  const [selectedDate, setSelectedDate] = useState(card.dueDate || formatDateToISO(new Date()));
  const [selectedTime, setSelectedTime] = useState(card.dueTime || formatTimeToInput(new Date()));
  const [recurring, setRecurring] = useState(card.dueDateRecurring || card.dueRecurring || 'Never');
  const [reminder, setReminder] = useState(card.dueDateReminder || card.dueReminder || '1 Day before');

  // Track current calendar month for navigation
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || new Date()));

  const panelRef = useRef(null);

  /**
   * Generate calendar grid for the current month
   * Returns array of weeks, where each week is array of day numbers or null
   */
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks = [];
    let week = new Array(7).fill(null);
    let dayCounter = 1;

    // Fill starting empty days (days from previous month)
    for (let i = startingDayOfWeek; i < 7 && dayCounter <= daysInMonth; i++) {
      week[i] = dayCounter++;
    }
    weeks.push([...week]);

    // Fill remaining weeks
    while (dayCounter <= daysInMonth) {
      week = new Array(7).fill(null);
      for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
        week[i] = dayCounter++;
      }
      weeks.push([...week]);
    }

    return weeks;
  };

  const weeks = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Navigation handlers for calendar month switching
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToPreviousYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth()));
  };

  const goToNextYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth()));
  };

  /**
   * Select a calendar day and enable due date
   */
  const selectCalendarDay = (day) => {
    const isoDate = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(isoDate);
    setHasDueDate(true);
  };

  /**
   * Save due date configuration
   */
  const handleSave = () => {
    onSave({
      dueDate: hasDueDate ? selectedDate : '',
      dueTime: hasDueDate ? selectedTime : '',
      dueDateReminder: reminder,
      dueDateRecurring: recurring
    });
    onClose();
  };

  // Dismiss on Escape or outside click
  useEffect(() => {
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.type === 'mousedown' && !panelRef.current?.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [onClose]);

  // Check if a date is today for highlighting
  const isDateToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  // Check if a date is the selected date
  const isDateSelected = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  return (
    <section className={`due-date-editor modal-backdrop due-date-editor-${placement}`} onClick={onClose}>
      <div className="due-date-editor-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className="popover-header">
          <span>Dates</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Calendar section */}
        <div className="calendar-section">
          {/* Month navigation */}
          <div className="calendar-header">
            <button onClick={goToPreviousYear} title="Previous year" aria-label="Previous year">«</button>
            <button onClick={goToPreviousMonth} title="Previous month" aria-label="Previous month">‹</button>
            <span className="month-year">{monthName}</span>
            <button onClick={goToNextMonth} title="Next month" aria-label="Next month">›</button>
            <button onClick={goToNextYear} title="Next year" aria-label="Next year">»</button>
          </div>

          {/* Weekday headers */}
          <div className="weekday-row">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <span key={day} className="weekday">{day}</span>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="calendar-grid">
            {weeks.map((week, weekIndex) =>
              week.map((day, dayIndex) => {
                const isToday = day && isDateToday(day);
                const isSelected = day && isDateSelected(day);

                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    className={`calendar-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                    disabled={!day}
                    onClick={() => day && selectCalendarDay(day)}
                  >
                    {day}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <label className="dates-field-label">Start date</label>
        <div className="date-input-row is-disabled">
          <input type="checkbox" disabled />
          <input placeholder="M/D/YYYY" disabled />
        </div>
        <label className="dates-field-label">Due date</label>

        <div className="date-time-section">
              <div className="date-input-row due-date-input-row">
                <input
                  type="checkbox"
                  checked={hasDueDate}
                  onChange={(e) => setHasDueDate(e.target.checked)}
                  aria-label="Set due date"
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setHasDueDate(true); }}
                />
                <input
                  type="text"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  placeholder="9:00 AM"
                  aria-label="Due time"
                />
              </div>

              {/* Recurring pattern */}
              <label className="field-label">
                <span>Recurring</span>
                <select value={recurring} onChange={(e) => setRecurring(e.target.value)}>
                  <option>Never</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </label>

              {/* Reminder timing */}
              <label className="field-label">
                <span>Reminder</span>
                <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
                  <option>At time of due date</option>
                  <option>5 Minutes before</option>
                  <option>1 Hour before</option>
                  <option>1 Day before</option>
                </select>
              </label>
            </div>

        {/* Action buttons */}
        <div className="due-date-actions">
          <button className="primary-action" onClick={handleSave}>
            Save due date
          </button>
          {hasDueDate && (
            <button
              type="button"
              className="quiet-action"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default DueDateEditor;
/*
File summary:
- Due-date editor popover/modal component.
- Manages date, time, reminder, recurrence, and completion draft values.
- Used by cards that support scheduling metadata.
*/
