import { useEffect, useMemo, useState } from 'react';

const DEMO_BOARD = {
  id: 'demo-board',
  title: 'My Trello board',
  members: [
    { id: 1, initials: 'PB', color: '#7c5cff' },
    { id: 2, initials: 'AM', color: '#22a06b' }
  ],
  lists: [
    {
      id: 'demo-list-1',
      title: 'Trello Starter Guide',
      accent: '#55326f',
      cards: [
        {
          id: 'demo-card-1',
          title: 'New to Trello? Start here',
          description: 'A starter card for learning the board flow.',
          cover: 'starter',
          labels: ['Guide'],
          badges: ['0/3'],
          members: ['PB']
        },
        {
          id: 'demo-card-2',
          title: 'Capture from email, Slack, and Teams',
          description: 'Collect work from different places into one board.',
          cover: 'capture',
          badges: ['1', '0/6']
        },
        {
          id: 'demo-card-3',
          title: 'Dive into Trello basics',
          description: 'Review basic list and card organization.',
          cover: 'basics'
        }
      ]
    },
    {
      id: 'demo-list-2',
      title: 'Today',
      accent: '#5e4900',
      cards: [
        { id: 'demo-card-4', title: 'Eat by 8', description: '' },
        { id: 'demo-card-5', title: 'Start using Trello', description: '', done: true },
        {
          id: 'demo-card-6',
          title: 'See it, send it, save it for later',
          description: '',
          badges: ['2']
        }
      ]
    },
    { id: 'demo-list-3', title: 'This Week', accent: '#14583b', cards: [] },
    { id: 'demo-list-4', title: 'Later', accent: '#111600', cards: [] }
  ]
};

const DEMO_INBOX_CARDS = [
  {
    id: 'demo-inbox-1',
    title: 'Test email from May 2026',
    description: 'Captured task waiting to be organized.',
    badges: ['1']
  }
];

const listAccents = ['#55326f', '#5e4900', '#14583b', '#111600', '#164555', '#4c2f22'];

// Calls the backend API and parses the JSON response when present.
async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Creates a temporary id for local fallback updates.
function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Checks whether an entity id was created only in the browser.
function isLocalId(id) {
  return String(id).startsWith('demo-') || String(id).startsWith('list-') || String(id).startsWith('card-') || String(id).startsWith('inbox-');
}

// Adds display accents to lists that came from the API without UI-only styling.
function hydrateBoard(rawBoard) {
  return {
    ...rawBoard,
    members: rawBoard.members?.length ? rawBoard.members : DEMO_BOARD.members,
    lists: rawBoard.lists.map((list, index) => ({
      ...list,
      accent: list.accent || listAccents[index % listAccents.length],
      cards: list.cards || []
    }))
  };
}

// Adds default display fields to inbox cards that came from the API.
function hydrateInboxCards(rawInboxCards) {
  return rawInboxCards.map((card) => ({
    ...card,
    badges: card.badges || []
  }));
}

// Finds a card and returns the card with its parent list id.
function findCard(board, cardId) {
  for (const list of board.lists) {
    const card = list.cards.find((item) => item.id === cardId);

    if (card) {
      return { card, listId: list.id };
    }
  }

  return null;
}

// Adds one card to a target list in the board state.
function addCardToList(board, listId, card) {
  return {
    ...board,
    lists: board.lists.map((list) =>
      list.id === listId ? { ...list, cards: [...list.cards, card] } : list
    )
  };
}

// Moves an existing board card before a target card or to the end of a list.
function moveCardInBoard(board, cardId, sourceListId, targetListId, targetCardId = null) {
  const sourceList = board.lists.find((list) => list.id === sourceListId);
  const movingCard = sourceList?.cards.find((card) => card.id === cardId);

  if (!movingCard || cardId === targetCardId) {
    return board;
  }

  return {
    ...board,
    lists: board.lists.map((list) => {
      const withoutMovingCard = list.cards.filter((card) => card.id !== cardId);

      if (list.id !== targetListId) {
        return list.id === sourceListId ? { ...list, cards: withoutMovingCard } : list;
      }

      const insertIndex = targetCardId
        ? withoutMovingCard.findIndex((card) => card.id === targetCardId)
        : withoutMovingCard.length;
      const safeIndex = insertIndex === -1 ? withoutMovingCard.length : insertIndex;
      const nextCards = [...withoutMovingCard];
      nextCards.splice(safeIndex, 0, movingCard);

      return { ...list, cards: nextCards };
    })
  };
}

// Reads the ordered card ids for one list from the board state.
function getCardIdsForList(board, listId) {
  return board.lists.find((list) => list.id === listId)?.cards.map((card) => card.id) || [];
}

// Reads the drag payload stored by a draggable card.
function readDragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData('application/json'));
  } catch (error) {
    return null;
  }
}

// Replaces a card inside the board state.
function replaceCard(board, updatedCard) {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => (card.id === updatedCard.id ? { ...card, ...updatedCard } : card))
    }))
  };
}

// Replaces a temporary card id after the API creates the permanent card.
function replaceCardById(board, temporaryId, createdCard) {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => (card.id === temporaryId ? { ...createdCard } : card))
    }))
  };
}

// Removes a card from the board state.
function removeCard(board, cardId) {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => card.id !== cardId)
    }))
  };
}

// Replaces one inbox card inside the inbox state.
function replaceInboxCard(inboxCards, updatedCard) {
  return inboxCards.map((card) => (card.id === updatedCard.id ? { ...card, ...updatedCard } : card));
}

// Replaces a temporary inbox id after the API creates the permanent inbox card.
function replaceInboxCardById(inboxCards, temporaryId, createdCard) {
  return inboxCards.map((card) => (card.id === temporaryId ? { ...createdCard, badges: [] } : card));
}

// Renders the Trello-style application shell for the current milestone.
function App() {
  const [board, setBoard] = useState(DEMO_BOARD);
  const [inboxCards, setInboxCards] = useState(DEMO_INBOX_CARDS);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [status, setStatus] = useState('Using local demo data until the API is connected.');

  useEffect(() => {
    loadInitialBoard(setBoard, setStatus);
    loadInitialInbox(setInboxCards);
  }, []);

  const selectedCard = useMemo(() => findCard(board, selectedCardId), [board, selectedCardId]);

  // Updates the board title locally and through the API when available.
  async function handleBoardTitleChange(title) {
    const previousBoard = board;
    setBoard({ ...board, title });

    try {
      if (!isLocalId(board.id)) {
        await apiRequest(`/boards/${board.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title })
        });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save board title. Check the API connection.');
    }
  }

  // Adds a new list locally and through the API when available.
  async function handleListCreate(title) {
    const localList = {
      id: createLocalId('list'),
      title,
      accent: listAccents[board.lists.length % listAccents.length],
      cards: []
    };
    setBoard({ ...board, lists: [...board.lists, localList] });

    try {
      if (!isLocalId(board.id)) {
        const data = await apiRequest(`/boards/${board.id}/lists`, {
          method: 'POST',
          body: JSON.stringify({ title })
        });
        setBoard((current) => ({
          ...current,
          lists: current.lists.map((list) => (list.id === localList.id ? data.list : list))
        }));
      }
    } catch (error) {
      setStatus('List was added locally, but the API save failed.');
    }
  }

  // Renames a list locally and through the API when available.
  async function handleListUpdate(listId, title) {
    const previousBoard = board;
    setBoard({
      ...board,
      lists: board.lists.map((list) => (list.id === listId ? { ...list, title } : list))
    });

    try {
      if (!isLocalId(listId)) {
        await apiRequest(`/lists/${listId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title })
        });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save list title. Check the API connection.');
    }
  }

  // Deletes a list locally and through the API when available.
  async function handleListDelete(listId) {
    const previousBoard = board;
    setBoard({ ...board, lists: board.lists.filter((list) => list.id !== listId) });

    try {
      if (!isLocalId(listId)) {
        await apiRequest(`/lists/${listId}`, { method: 'DELETE' });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not delete list. Check the API connection.');
    }
  }

  // Adds a new card locally and through the API when available.
  async function handleCardCreate(listId, title) {
    const localCard = { id: createLocalId('card'), title, description: '' };
    setBoard(addCardToList(board, listId, localCard));

    try {
      if (!isLocalId(listId)) {
        const data = await apiRequest(`/lists/${listId}/cards`, {
          method: 'POST',
          body: JSON.stringify({ title })
        });
        setBoard((current) => replaceCardById(current, localCard.id, data.card));
      }
    } catch (error) {
      setStatus('Card was added locally, but the API save failed.');
    }
  }

  // Saves card title and description locally and through the API when available.
  async function handleCardUpdate(cardId, updates) {
    const previousBoard = board;
    const existing = findCard(board, cardId)?.card;
    const updatedCard = { ...existing, ...updates };
    setBoard(replaceCard(board, updatedCard));

    try {
      if (!isLocalId(cardId)) {
        const data = await apiRequest(`/cards/${cardId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: updatedCard.title, description: updatedCard.description })
        });
        setBoard((current) => replaceCard(current, data.card));
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save card. Check the API connection.');
    }
  }

  // Archives a card locally and through the API when available.
  async function handleCardArchive(cardId) {
    const previousBoard = board;
    setBoard(removeCard(board, cardId));
    setSelectedCardId(null);

    try {
      if (!isLocalId(cardId)) {
        await apiRequest(`/cards/${cardId}/archive`, { method: 'PATCH' });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not archive card. Check the API connection.');
    }
  }

  // Deletes a card locally and through the API when available.
  async function handleCardDelete(cardId) {
    const previousBoard = board;
    setBoard(removeCard(board, cardId));
    setSelectedCardId(null);

    try {
      if (!isLocalId(cardId)) {
        await apiRequest(`/cards/${cardId}`, { method: 'DELETE' });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not delete card. Check the API connection.');
    }
  }

  // Adds a new inbox card locally and through the API when available.
  async function handleInboxCreate(title) {
    const localInboxCard = { id: createLocalId('inbox'), title, description: '', badges: [] };
    setInboxCards((current) => [...current, localInboxCard]);

    try {
      const data = await apiRequest('/inbox-cards', {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      setInboxCards((current) => replaceInboxCardById(current, localInboxCard.id, data.inboxCard));
    } catch (error) {
      setStatus('Inbox card was added locally, but the API save failed.');
    }
  }

  // Updates one inbox card locally and through the API when available.
  async function handleInboxUpdate(inboxCardId, updates) {
    const previousInboxCards = inboxCards;
    const existing = inboxCards.find((card) => card.id === inboxCardId);
    const updatedCard = { ...existing, ...updates };
    setInboxCards(replaceInboxCard(inboxCards, updatedCard));

    try {
      if (!isLocalId(inboxCardId)) {
        const data = await apiRequest(`/inbox-cards/${inboxCardId}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: updatedCard.title, description: updatedCard.description })
        });
        setInboxCards((current) => replaceInboxCard(current, data.inboxCard));
      }
    } catch (error) {
      setInboxCards(previousInboxCards);
      setStatus('Could not save Inbox card. Check the API connection.');
    }
  }

  // Deletes one inbox card locally and through the API when available.
  async function handleInboxDelete(inboxCardId) {
    const previousInboxCards = inboxCards;
    setInboxCards(inboxCards.filter((card) => card.id !== inboxCardId));

    try {
      if (!isLocalId(inboxCardId)) {
        await apiRequest(`/inbox-cards/${inboxCardId}`, { method: 'DELETE' });
      }
    } catch (error) {
      setInboxCards(previousInboxCards);
      setStatus('Could not delete Inbox card. Check the API connection.');
    }
  }

  // Converts an inbox card into a board card in the selected list.
  async function handleInboxConvert(inboxCardId, listId) {
    const inboxCard = inboxCards.find((card) => card.id === inboxCardId);

    if (!inboxCard || !listId) {
      return;
    }

    const previousBoard = board;
    const previousInboxCards = inboxCards;
    const localCard = {
      id: createLocalId('card'),
      title: inboxCard.title,
      description: inboxCard.description || ''
    };

    setBoard(addCardToList(board, listId, localCard));
    setInboxCards(inboxCards.filter((card) => card.id !== inboxCardId));

    try {
      if (!isLocalId(inboxCardId) && !isLocalId(listId)) {
        const data = await apiRequest(`/inbox-cards/${inboxCardId}/convert`, {
          method: 'POST',
          body: JSON.stringify({ listId })
        });
        setBoard((current) => replaceCardById(current, localCard.id, data.card));
      }
    } catch (error) {
      setBoard(previousBoard);
      setInboxCards(previousInboxCards);
      setStatus('Could not convert Inbox card. Check the API connection.');
    }
  }

  // Handles dropping Inbox cards or board cards into a list position.
  async function handleCardDrop(draggedItem, targetListId, targetCardId = null) {
    if (!draggedItem || !targetListId) {
      return;
    }

    if (draggedItem.type === 'inbox-card') {
      await handleInboxConvert(draggedItem.cardId, targetListId);
      return;
    }

    if (draggedItem.type !== 'board-card') {
      return;
    }

    const previousBoard = board;
    const nextBoard = moveCardInBoard(board, draggedItem.cardId, draggedItem.listId, targetListId, targetCardId);
    setBoard(nextBoard);

    try {
      if (!isLocalId(draggedItem.cardId) && !isLocalId(draggedItem.listId) && !isLocalId(targetListId)) {
        await apiRequest('/cards/reorder', {
          method: 'PATCH',
          body: JSON.stringify({
            sourceListId: draggedItem.listId,
            targetListId,
            sourceCardIds: getCardIdsForList(nextBoard, draggedItem.listId),
            targetCardIds: getCardIdsForList(nextBoard, targetListId)
          })
        });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save card order. Check the API connection.');
    }
  }

  return (
    <main className="app-shell">
      <TopBar />
      <section className="workspace">
        <InboxPanel
          cards={inboxCards}
          onInboxCreate={handleInboxCreate}
          onInboxUpdate={handleInboxUpdate}
        />
        <Board
          board={board}
          status={status}
          onBoardTitleChange={handleBoardTitleChange}
          onListCreate={handleListCreate}
          onListUpdate={handleListUpdate}
          onListDelete={handleListDelete}
          onCardCreate={handleCardCreate}
          onCardOpen={setSelectedCardId}
          onCardDrop={handleCardDrop}
        />
      </section>
      <BottomDock />
      {selectedCard && (
        <CardModal
          card={selectedCard.card}
          onClose={() => setSelectedCardId(null)}
          onSave={handleCardUpdate}
          onArchive={handleCardArchive}
          onDelete={handleCardDelete}
        />
      )}
    </main>
  );
}

// Loads the first API board or keeps demo data when the backend is unavailable.
async function loadInitialBoard(setBoard, setStatus) {
  try {
    const boardsData = await apiRequest('/boards');
    let boardSummary = boardsData.boards[0];

    if (!boardSummary) {
      const createData = await apiRequest('/boards', {
        method: 'POST',
        body: JSON.stringify({ title: 'My Trello board' })
      });
      boardSummary = createData.board;
    }

    const boardData = await apiRequest(`/boards/${boardSummary.id}`);
    const hydratedBoard = hydrateBoard(boardData.board);

    if (hydratedBoard.lists.length === 0) {
      setBoard({ ...DEMO_BOARD, id: boardSummary.id, title: hydratedBoard.title });
      setStatus('API is connected, but the database has no seeded lists yet. Using demo board layout.');
      return;
    }

    setBoard(hydratedBoard);
    setStatus('Connected to API. Changes will persist when PostgreSQL is running.');
  } catch (error) {
    setStatus('Using local demo data until the API is connected.');
  }
}

// Loads active inbox cards or keeps demo inbox data when unavailable.
async function loadInitialInbox(setInboxCards) {
  try {
    const inboxData = await apiRequest('/inbox-cards');
    setInboxCards(hydrateInboxCards(inboxData.inboxCards));
  } catch (error) {
    setInboxCards(DEMO_INBOX_CARDS);
  }
}

// Renders the dark global navigation bar.
function TopBar() {
  return (
    <header className="top-bar">
      <div className="top-left">
        <button className="icon-button" aria-label="Open app switcher">
          <span className="grid-icon" />
        </button>
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
        </div>
        <span className="brand-name">Trello</span>
      </div>

      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Search" />
      </label>

      <button className="create-button">Create</button>

      <div className="top-actions">
        <span className="trial-pill">14 days left</span>
        <button className="icon-button" aria-label="Announcements">◌</button>
        <button className="icon-button" aria-label="Notifications">♢</button>
        <button className="icon-button" aria-label="Help">?</button>
        <UserAvatar initials="PB" />
      </div>
    </header>
  );
}

// Renders the quick-capture Inbox sidebar.
function InboxPanel({ cards, onInboxCreate, onInboxUpdate }) {
  return (
    <aside className="inbox-panel">
      <div className="panel-title-row">
        <h2>Inbox</h2>
        <div className="panel-actions">
          <button className="icon-button" aria-label="Filter inbox">≡</button>
          <button className="icon-button" aria-label="More inbox actions">...</button>
        </div>
      </div>

      <AddInboxForm onInboxCreate={onInboxCreate} />

      <div className="inbox-list">
        {cards.length === 0 && <p className="empty-state">Inbox is clear.</p>}
        {cards.map((card) => (
          <InboxCard
            key={card.id}
            card={card}
            onInboxUpdate={onInboxUpdate}
          />
        ))}
      </div>

      <button className="inbox-footer">Consolidate your to-dos</button>
    </aside>
  );
}

// Renders the form that adds a quick Inbox card.
function AddInboxForm({ onInboxCreate }) {
  const [title, setTitle] = useState('');

  // Submits the new Inbox card title when valid.
  function handleSubmit(event) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onInboxCreate(nextTitle);
    setTitle('');
  }

  return (
    <form className="inbox-add-form" onSubmit={handleSubmit}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a card" />
    </form>
  );
}

// Renders one editable draggable Inbox card preview.
function InboxCard({ card, onInboxUpdate }) {
  const [draftTitle, setDraftTitle] = useState(card.title);

  useEffect(() => {
    setDraftTitle(card.title);
  }, [card.title]);

  // Saves the Inbox card title when it changes.
  function commitTitle() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setDraftTitle(card.title);
      return;
    }

    if (nextTitle !== card.title) {
      onInboxUpdate(card.id, { title: nextTitle, description: card.description || '' });
    }
  }

  // Handles keyboard save and cancel behavior for Inbox title editing.
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }

    if (event.key === 'Escape') {
      setDraftTitle(card.title);
      event.currentTarget.blur();
    }
  }

  // Stores the Inbox card drag payload for list drop zones.
  function handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'inbox-card', cardId: card.id }));
  }

  return (
    <article className="inbox-card draggable-card" draggable onDragStart={handleDragStart}>
      <input
        className="inbox-title-input"
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={handleKeyDown}
        aria-label="Inbox card title"
      />
      <div className="card-badges">
        <span>✉</span>
        <span>≡</span>
        {card.badges?.map((badge) => (
          <span key={badge}>⌕ {badge}</span>
        ))}
      </div>
    </article>
  );
}
// Renders the active board and its horizontal list canvas.
function Board({
  board,
  status,
  onBoardTitleChange,
  onListCreate,
  onListUpdate,
  onListDelete,
  onCardCreate,
  onCardOpen,
  onCardDrop
}) {
  return (
    <section className="board-shell">
      <BoardHeader board={board} onBoardTitleChange={onBoardTitleChange} />
      <div className="board-canvas">
        <p className="board-status">{status}</p>
        <div className="list-row">
          {board.lists.map((list) => (
            <BoardList
              key={list.id}
              list={list}
              onListUpdate={onListUpdate}
              onListDelete={onListDelete}
              onCardCreate={onCardCreate}
              onCardOpen={onCardOpen}
              onCardDrop={onCardDrop}
            />
          ))}
          <AddListForm onListCreate={onListCreate} />
        </div>
      </div>
    </section>
  );
}

// Renders board title and board-level action controls.
function BoardHeader({ board, onBoardTitleChange }) {
  return (
    <header className="board-header">
      <div className="board-title-group">
        <InlineTitle value={board.title} label="Board title" onSave={onBoardTitleChange} heading />
        <button className="icon-button" aria-label="Board view options">▥</button>
        <button className="icon-button" aria-label="Open board menu">⌄</button>
      </div>

      <div className="board-actions">
        {board.members.map((member) => (
          <UserAvatar key={member.id} initials={member.initials} color={member.color} />
        ))}
        <button className="icon-button" aria-label="Automation">⚡</button>
        <button className="icon-button" aria-label="Filter cards">≡</button>
        <button className="share-button">Share</button>
        <button className="icon-button" aria-label="More board actions">...</button>
      </div>
    </header>
  );
}

// Renders an editable title that saves on blur or Enter.
function InlineTitle({ value, label, onSave, heading = false }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Saves the title when it is non-empty and changed.
  function commitTitle() {
    const nextTitle = draft.trim();

    if (!nextTitle) {
      setDraft(value);
      return;
    }

    if (nextTitle !== value) {
      onSave(nextTitle);
    }
  }

  // Handles keyboard save and cancel behavior for title inputs.
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }

    if (event.key === 'Escape') {
      setDraft(value);
      event.currentTarget.blur();
    }
  }

  return (
    <input
      className={heading ? 'inline-title inline-title-board' : 'inline-title'}
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitTitle}
      onKeyDown={handleKeyDown}
    />
  );
}

// Renders one board list column with editable list and card controls.
function BoardList({ list, onListUpdate, onListDelete, onCardCreate, onCardOpen, onCardDrop }) {
  // Allows cards to be dropped at the end of this list.
  function handleListDrop(event) {
    event.preventDefault();
    onCardDrop(readDragPayload(event), list.id);
  }

  return (
    <section className="board-list" style={{ '--list-accent': list.accent }} onDragOver={(event) => event.preventDefault()} onDrop={handleListDrop}>
      <div className="list-header">
        <InlineTitle
          value={list.title}
          label={`${list.title} title`}
          onSave={(title) => onListUpdate(list.id, title)}
        />
        <button className="icon-button danger-button" aria-label={`Delete ${list.title}`} onClick={() => onListDelete(list.id)}>
          ×
        </button>
      </div>

      <div className="card-stack">
        {list.cards.map((card) => (
          <BoardCard key={card.id} card={card} listId={list.id} onCardOpen={onCardOpen} onCardDrop={onCardDrop} />
        ))}
      </div>

      <AddCardForm listId={list.id} onCardCreate={onCardCreate} />
    </section>
  );
}

// Renders a compact add-list form at the end of the board.
function AddListForm({ onListCreate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  // Submits the new list title when valid.
  function handleSubmit(event) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onListCreate(nextTitle);
    setTitle('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button className="add-list-button" onClick={() => setIsOpen(true)}>
        + Add another list
      </button>
    );
  }

  return (
    <form className="add-list-form" onSubmit={handleSubmit}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Enter list title..." />
      <div className="form-actions">
        <button type="submit" className="primary-action">Add list</button>
        <button type="button" className="quiet-action" onClick={() => setIsOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// Renders a compact add-card form inside a list.
function AddCardForm({ listId, onCardCreate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');

  // Submits the new card title when valid.
  function handleSubmit(event) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onCardCreate(listId, nextTitle);
    setTitle('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button className="add-card-button" onClick={() => setIsOpen(true)}>
        <span>+</span>
        Add a card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Enter a title for this card..." />
      <div className="form-actions">
        <button type="submit" className="primary-action">Add card</button>
        <button type="button" className="quiet-action" onClick={() => setIsOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// Renders one compact card preview in a list.
function BoardCard({ card, listId, onCardOpen, onCardDrop }) {
  // Stores the board card drag payload for list and card drop zones.
  function handleDragStart(event) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'board-card', cardId: card.id, listId }));
  }

  // Drops another draggable card before this card.
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    onCardDrop(readDragPayload(event), listId, card.id);
  }

  return (
    <article className="board-card draggable-card" draggable role="button" tabIndex="0" onDragStart={handleDragStart} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => onCardOpen(card.id)} onKeyDown={(event) => event.key === 'Enter' && onCardOpen(card.id)}>
      {card.cover && <CardCover variant={card.cover} />}
      {card.labels && (
        <div className="label-row">
          {card.labels.map((label) => (
            <span className="label-chip" key={label}>{label}</span>
          ))}
        </div>
      )}
      <p className={card.done ? 'card-title is-done' : 'card-title'}>
        {card.done && <span className="done-dot">✓</span>}
        {card.title}
      </p>
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
  );
}

// Renders the modal used to edit card title and description.
function CardModal({ card, onClose, onSave, onArchive, onDelete }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
  }, [card]);

  // Saves card modal edits and closes the modal.
  function handleSubmit(event) {
    event.preventDefault();
    const nextTitle = title.trim();

    if (!nextTitle) {
      return;
    }

    onSave(card.id, { title: nextTitle, description });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card-modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <input className="modal-title-input" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          <button type="button" className="icon-button" aria-label="Close card" onClick={onClose}>×</button>
        </div>

        <label className="modal-field">
          <span>Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a more detailed description..." />
        </label>

        <div className="modal-actions">
          <button type="submit" className="primary-action">Save</button>
          <button type="button" className="quiet-action" onClick={() => onArchive(card.id)}>Archive</button>
          <button type="button" className="danger-action" onClick={() => onDelete(card.id)}>Delete</button>
        </div>
      </form>
    </div>
  );
}

// Renders a decorative card cover that stands in for seeded tutorial media.
function CardCover({ variant }) {
  return (
    <div className={`card-cover card-cover-${variant}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

// Renders a reusable circular user avatar.
function UserAvatar({ initials, color = '#6e5dc6', small = false }) {
  return (
    <span className={small ? 'user-avatar user-avatar-small' : 'user-avatar'} style={{ '--avatar-color': color }}>
      {initials}
    </span>
  );
}

// Renders the floating view switcher dock from the reference board UI.
function BottomDock() {
  return (
    <nav className="bottom-dock" aria-label="Board views">
      <button>▣ Inbox</button>
      <button>□ Planner</button>
      <button className="is-active">▥ Board</button>
      <button>⇄ Switch boards</button>
    </nav>
  );
}

export default App;
