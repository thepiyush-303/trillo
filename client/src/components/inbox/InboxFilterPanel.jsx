// Renders the Inbox filter popover.
function InboxFilterPanel({ filters, onClose, onFiltersChange }) {
  // Updates one filter field while preserving the other filters.
  function updateFilter(name, value) {
    onFiltersChange({ ...filters, [name]: value });
  }

  return (
    <section className="inbox-popover inbox-filter-popover">
      <div className="popover-header"><span>Filter</span><button onClick={onClose}>×</button></div>
      <label className="filter-field">
        <span>Keyword</span>
        <input value={filters.keyword} onChange={(event) => updateFilter('keyword', event.target.value)} placeholder="Enter a keyword" />
        <small>Search card names.</small>
      </label>
      <fieldset>
        <legend>Card created</legend>
        <label><input type="checkbox" disabled /> Created in the last week</label>
        <label><input type="checkbox" disabled /> Created in the last two weeks</label>
        <label><input type="checkbox" disabled /> Created in the last month</label>
      </fieldset>
      <fieldset>
        <legend>Card status</legend>
        <label><input type="checkbox" checked={filters.completeOnly} onChange={(event) => updateFilter('completeOnly', event.target.checked)} /> Marked as complete</label>
        <label><input type="checkbox" checked={filters.incompleteOnly} onChange={(event) => updateFilter('incompleteOnly', event.target.checked)} /> Not marked as complete</label>
      </fieldset>
      <fieldset>
        <legend>Due date</legend>
        <label><input type="checkbox" disabled /> No dates</label>
        <label><input type="checkbox" disabled /> Overdue</label>
        <label><input type="checkbox" disabled /> Due in the next day</label>
        <label><input type="checkbox" disabled /> Due in the next week</label>
        <label><input type="checkbox" disabled /> Due in the next month</label>
      </fieldset>
    </section>
  );
}

export default InboxFilterPanel;
/*
File summary:
- Inbox filter popover component.
- Controls keyword and status filter values for Inbox cards.
- Used by InboxPanel to narrow visible Inbox content.
*/
