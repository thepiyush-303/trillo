// Renders the Inbox consolidation helper panel.
function ConsolidatePanel({ onClose }) {
  return (
    <section className="consolidate-panel">
      <button className="consolidate-minimize" onClick={onClose}>Minimize⌄</button>
      <h3>Consolidate your to-dos</h3>
      <p>Email it, say it, forward it - however it comes, get it into Trello fast.</p>
      <div className="consolidate-icons" aria-hidden="true">
        <span>✉</span>
        <span>📱</span>
        <span>●</span>
        <span>◉</span>
        <span>▣</span>
      </div>
      <p className="privacy-note">▢ Inbox is only visible to you</p>
    </section>
  );
}

export default ConsolidatePanel;
/*
File summary:
- Inbox consolidation helper panel.
- Displays guidance/metadata for organizing captured tasks.
- Used when the Inbox footer consolidation control is open.
*/
