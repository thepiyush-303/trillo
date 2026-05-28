import { useEffect, useState } from 'react';
import CardCoverDisplay from '../CardCoverDisplay.jsx';
import CardCoverEditor from '../CardCoverEditor.jsx';
import DueDateBadge from '../DueDateBadge.jsx';
import DueDateEditor from '../DueDateEditor.jsx';
import CardCover from '../shared/CardCover.jsx';
import { resolveCardLabel } from '../../utils/boardState.js';

// Renders the Trello-style modal used to edit card details.
function CardModal({ card, contextLabel, onClose, onSave, onArchive, onDelete, onCompleteToggle, labels = [] }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [draftLabels, setDraftLabels] = useState(card.labels || []);
  const [draftDue, setDraftDue] = useState({
    dueDate: card.dueDate || '',
    dueTime: card.dueTime || '',
    isCompleted: Boolean(card.isCompleted || card.dueDateCompleted),
    dueDateCompleted: Boolean(card.isCompleted || card.dueDateCompleted),
    dueDateReminder: card.dueDateReminder || card.dueReminder || '1 Day before',
    dueDateRecurring: card.dueDateRecurring || card.dueRecurring || 'Never',
    dueReminder: card.dueDateReminder || card.dueReminder || '1 Day before',
    dueRecurring: card.dueDateRecurring || card.dueRecurring || 'Never'
  });
  const [draftCover, setDraftCover] = useState(typeof card.cover === 'object' ? card.cover : null);
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);
  const [isDatesPanelOpen, setIsDatesPanelOpen] = useState(false);
  const [isCoverPanelOpen, setIsCoverPanelOpen] = useState(false);
  const isComplete = Boolean(card.completed || card.done);
  const modalCard = { ...card, ...draftDue, labels: draftLabels, cover: draftCover };

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setDraftLabels(card.labels || []);
    setDraftDue({
      dueDate: card.dueDate || '',
      dueTime: card.dueTime || '',
      isCompleted: Boolean(card.isCompleted || card.dueDateCompleted),
      dueDateCompleted: Boolean(card.isCompleted || card.dueDateCompleted),
      dueDateReminder: card.dueDateReminder || card.dueReminder || '1 Day before',
      dueDateRecurring: card.dueDateRecurring || card.dueRecurring || 'Never',
      dueReminder: card.dueDateReminder || card.dueReminder || '1 Day before',
      dueRecurring: card.dueDateRecurring || card.dueRecurring || 'Never'
    });
    setDraftCover(typeof card.cover === 'object' ? card.cover : null);
  }, [card]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  function toggleDraftLabel(labelId) {
    setDraftLabels((currentLabels) => (
      currentLabels.includes(labelId)
        ? currentLabels.filter((id) => id !== labelId)
        : [...currentLabels, labelId]
    ));
  }

  function saveDueDate(dateData) {
    setDraftDue({
      ...dateData,
      isCompleted: Boolean(dateData.isCompleted),
      dueDateCompleted: Boolean(dateData.isCompleted),
      dueReminder: dateData.dueDateReminder,
      dueRecurring: dateData.dueDateRecurring
    });
    setIsDatesPanelOpen(false);
  }

  function removeDueDate() {
    setDraftDue({
      dueDate: '',
      dueTime: '',
      isCompleted: false,
      dueDateCompleted: false,
      dueDateReminder: '1 Day before',
      dueDateRecurring: 'Never',
      dueReminder: '1 Day before',
      dueRecurring: 'Never'
    });
    setIsDatesPanelOpen(false);
  }

  function saveCover(cover) {
    setDraftCover(cover);
    setIsCoverPanelOpen(false);
  }

  function removeCover() {
    setDraftCover(null);
    setIsCoverPanelOpen(false);
  }

  function handleSubmit() {
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onSave(card.id, {
      title: nextTitle,
      description,
      labels: draftLabels,
      cover: draftCover,
      ...draftDue
    });
    onClose();
  }

  return (
    <div className="modal-backdrop card-detail-backdrop" onMouseDown={onClose}>
      <section className="card-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className={draftCover || typeof card.cover === 'string' ? 'card-detail-cover has-cover' : 'card-detail-cover'}>
          {draftCover && <CardCoverDisplay cover={draftCover} />}
          {!draftCover && typeof card.cover === 'string' && <CardCover variant={card.cover} />}
          <span className="modal-context-label card-detail-context">{contextLabel}</span>
          <div className="card-detail-top-actions">
            <button type="button" className="card-detail-icon-button" aria-label="Change cover" title="Cover" onClick={() => setIsCoverPanelOpen(true)}>▧</button>
            <button type="button" className="card-detail-close" aria-label="Close card" onClick={onClose}>x</button>
          </div>
        </div>

        <div className="card-detail-body">
          <main className="card-detail-main">
            <div className="card-detail-title-row">
              <button
                type="button"
                className={isComplete ? 'card-detail-complete is-complete' : 'card-detail-complete'}
                aria-label={isComplete ? 'Mark card incomplete' : 'Mark card complete'}
                onClick={() => onCompleteToggle?.(card.id)}
              />
              <input className="card-detail-title-input" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
            </div>

            <div className="card-detail-command-row">
              <button type="button" onClick={() => setIsLabelPickerOpen((isOpen) => !isOpen)}>+ Labels</button>
              <button type="button" onClick={() => setIsDatesPanelOpen(true)}>◷ Due date</button>
              <button type="button" onClick={() => setIsCoverPanelOpen(true)}>▧ Cover</button>
            </div>

            {isLabelPickerOpen && (
              <section className="card-detail-label-picker">
                <div className="popover-header"><span>Labels</span><button type="button" onClick={() => setIsLabelPickerOpen(false)}>x</button></div>
                {labels.map((label) => (
                  <label className="card-detail-label-option" key={label.id}>
                    <input type="checkbox" checked={draftLabels.includes(label.id)} onChange={() => toggleDraftLabel(label.id)} />
                    <span style={{ '--label-color': label.color }}>{label.name || 'Label'}</span>
                  </label>
                ))}
              </section>
            )}

            {(draftLabels.length > 0 || draftDue.dueDate) && (
              <div className="card-detail-fields">
                {draftLabels.length > 0 && (
                  <section>
                    <h3>Labels</h3>
                    <div className="card-detail-label-row">
                      {draftLabels.map((labelValue) => {
                        const label = resolveCardLabel(labelValue, labels);
                        return label ? <span key={label.id || label.color} style={{ '--label-color': label.color }}>{label.name || ''}</span> : null;
                      })}
                      <button type="button" onClick={() => setIsLabelPickerOpen(true)}>+</button>
                    </div>
                  </section>
                )}
                {draftDue.dueDate && (
                  <section>
                    <h3>Due date</h3>
                    <DueDateBadge card={modalCard} onEditDueDate={() => setIsDatesPanelOpen(true)} />
                  </section>
                )}
              </div>
            )}

            <label className="card-detail-description">
              <span>☰ Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a more detailed description..." />
            </label>

            <div className="card-detail-actions">
              <button type="button" className="primary-action" onClick={handleSubmit}>Save</button>
              <button type="button" className="quiet-action" onClick={onClose}>Cancel</button>
              <button type="button" className="quiet-action" onClick={() => onArchive(card.id)}>Archive</button>
              <button type="button" className="danger-action" onClick={() => onDelete(card.id)}>Delete</button>
            </div>
          </main>
        </div>

        {isCoverPanelOpen && (
          <CardCoverEditor card={modalCard} onSave={saveCover} onRemove={removeCover} onClose={() => setIsCoverPanelOpen(false)} />
        )}
        {isDatesPanelOpen && (
          <DueDateEditor card={modalCard} onClose={() => setIsDatesPanelOpen(false)} onSave={saveDueDate} onRemove={removeDueDate} />
        )}
      </section>
    </div>
  );
}

export default CardModal;
/*
File summary:
- Card detail modal component.
- Edits card title, description, labels, covers, due dates, completion, archive, and delete actions.
- Used for both Inbox and board card detail views.
*/
