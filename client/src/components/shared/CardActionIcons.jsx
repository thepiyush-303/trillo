function EditCardIcon() {
  return (
    <svg className="card-action-svg" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="M3.75 10.35v3.9h3.9" />
      <path d="M6.9 13.1 14.05 5.95a1.4 1.4 0 0 0 0-1.98 1.4 1.4 0 0 0-1.98 0L4.92 11.12" />
      <path d="m10.95 5.08 1.98 1.98" />
      <path d="M4.2 3.15h6.15" />
    </svg>
  );
}

function ArchiveCardIcon() {
  return (
    <svg className="card-action-svg" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="M3.4 5.3h11.2" />
      <path d="M4.45 5.3h9.1v8.05a1.2 1.2 0 0 1-1.2 1.2h-6.7a1.2 1.2 0 0 1-1.2-1.2Z" />
      <path d="M6.6 3.25h4.8l.65 2.05h-6.1Z" />
      <path d="M7.2 8.25h3.6" />
    </svg>
  );
}

export { EditCardIcon, ArchiveCardIcon };
/*
File summary:
- Shared SVG icon components for card actions.
- Exports edit and archive icons used by inbox and board card controls.
- Use this instead of duplicating action SVGs in feature components.
*/
