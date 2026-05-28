// Date utility functions for card features
// These are shared across due dates, badges, and displays

/**
 * Format an ISO date (YYYY-MM-DD) into a compact badge format (e.g., "May 23")
 * @param {string} dateValue - ISO date string or empty
 * @returns {string} Formatted date or empty string
 */
export function formatCardDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


export function formatTimeToInput(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

/**
 * Calculate due date badge style (color and status) based on current date and completion
 * Returns: { color: string, status: string }
 * Colors: 'green' (complete) | 'red' (overdue) | 'orange' (today) | 'yellow' (soon) | 'grey' (later)
 * @param {string} dueDate - ISO date string
 * @param {boolean} isCompleted - Whether due date is marked complete
 * @returns {object} Badge style object
 */
export function getDueDateBadgeStyle(dueDate, dueTime = '', reminder = '1 Day before') {
  if (!dueDate) {
    return { color: 'default', status: 'none', showBell: false, tooltip: '' };
  }

  const formattedDate = formatCardDate(dueDate);
  const dueAt = parseDueDateTime(dueDate, dueTime);
  const diffMs = dueAt.getTime() - Date.now();
  const reminderMs = parseReminderMs(reminder);

  if (diffMs < 0) {
    return { color: 'red', status: 'overdue', showBell: true, tooltip: 'This card is recently overdue!' };
  }

  if (reminderMs > 0 && diffMs <= reminderMs) {
    return { color: 'yellow', status: 'due-reminder', showBell: true, tooltip: buildReminderTooltip(diffMs) };
  }

  return { color: 'grey', status: 'due-later', showBell: false, tooltip: `This card is due on ${formattedDate}.` };
}

function parseDueDateTime(dueDate, dueTime = '') {
  const time = parseTime(dueTime);
  const fallbackTime = { hours: 23, minutes: 59 };
  const selectedTime = time || fallbackTime;
  return new Date(`${dueDate}T${String(selectedTime.hours).padStart(2, '0')}:${String(selectedTime.minutes).padStart(2, '0')}:00`);
}


function parseReminderMs(reminder) {
  const value = String(reminder || '').toLowerCase();

  if (value.includes('time of due date')) {
    return 0;
  }

  const amount = Number(value.match(/\d+/)?.[0] || 0);

  if (value.includes('minute')) {
    return amount * 60 * 1000;
  }

  if (value.includes('hour')) {
    return amount * 60 * 60 * 1000;
  }

  if (value.includes('day')) {
    return amount * 24 * 60 * 60 * 1000;
  }

  return 0;
}

function buildReminderTooltip(diffMs) {
  const oneHourMs = 60 * 60 * 1000;

  if (diffMs <= oneHourMs) {
    return 'This card is due in less than one hour.';
  }

  return 'This card is due in less than twenty-four hours.';
}

function parseTime(timeValue) {
  const match = String(timeValue || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) {
    hours += 12;
  }

  if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
}

/**
 * Format Date object to ISO string (YYYY-MM-DD)
 * @param {Date} date - JavaScript Date object
 * @returns {string} ISO date string
 */
export function formatDateToISO(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Get number of days between two dates
 * Positive = dueDate is in future, Negative = dueDate is in past
 * @param {string} dueDate - ISO date string
 * @returns {number} Days until due date
 */
export function getDaysUntilDue(dueDate) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDay = new Date(`${dueDate}T00:00:00`);
  return Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is today
 * @param {string} dateValue - ISO date string
 * @returns {boolean}
 */
export function isToday(dateValue) {
  if (!dateValue) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateValue === today;
}
/*
File summary:
- Date and reminder utilities used by due-date UI.
- Formats dates/times and computes badge styles for overdue/upcoming states.
- Use this to keep date parsing and display rules consistent.
*/
