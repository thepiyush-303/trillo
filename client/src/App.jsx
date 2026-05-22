import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
          labels: [{ id: 'demo-label-red', name: '', color: '#c9372c' }],
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
    badges: ['1'],
    labels: []
  }
];

const listAccents = ['#55326f', '#5e4900', '#14583b', '#111600', '#164555', '#4c2f22'];
const labelColorPalette = [
  '#1f845a', '#946f00', '#b65c02', '#7f241d', '#8f3fba',
  '#216e4e', '#7f5f01', '#a54800', '#ae2e24', '#6e2f99',
  '#4bce97', '#e2b203', '#f18d13', '#f87168', '#c97cf4',
  '#0c66e4', '#0c536b', '#4c6b1f', '#943d73', '#626f86',
  '#0055cc', '#1d7f8c', '#5b7f24', '#ae4787', '#758195',
  '#579dff', '#6cc3e0', '#94c748', '#e774bb', '#8590a2'
];
const defaultInboxLabels = [
  { id: 'label-ok', name: 'ok', color: labelColorPalette[0] },
  { id: 'label-gold', name: '', color: labelColorPalette[1] },
  { id: 'label-orange', name: '', color: labelColorPalette[2] },
  { id: 'label-red-dark', name: '', color: labelColorPalette[3] },
  { id: 'label-purple', name: '', color: labelColorPalette[4] }
];

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
    badges: card.badges || [],
    labels: Array.isArray(card.labels) ? card.labels : [],
    dueDate: card.dueDate || '',
    dueTime: card.dueTime || '',
    dueReminder: card.dueReminder || '1 Day before',
    dueRecurring: card.dueRecurring || 'Never'
  }));
}

// Formats an ISO date value into a compact month/day card badge.
function formatCardDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Converts a May 2026 calendar day number into an ISO date string.
function buildMayDate(day) {
  return `2026-05-${String(day).padStart(2, '0')}`;
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

// Adds one card to a target list in the board state and keeps saved positions ordered.
function addCardToList(board, listId, card) {
  return {
    ...board,
    lists: board.lists.map((list) => {
      if (String(list.id) !== String(listId)) {
        return list;
      }

      const cards = [...list.cards, card].sort((first, second) => {
        const firstPosition = Number.isFinite(Number(first.position)) ? Number(first.position) : Number.MAX_SAFE_INTEGER;
        const secondPosition = Number.isFinite(Number(second.position)) ? Number(second.position) : Number.MAX_SAFE_INTEGER;
        return firstPosition - secondPosition;
      });

      return { ...list, cards };
    })
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

// Moves a board list before another list in the board state.
function moveListInBoard(board, listId, targetListId) {
  if (listId === targetListId) {
    return board;
  }

  const sourceIndex = board.lists.findIndex((list) => list.id === listId);
  const targetIndex = board.lists.findIndex((list) => list.id === targetListId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return board;
  }

  const nextLists = [...board.lists];
  const [movingList] = nextLists.splice(sourceIndex, 1);
  nextLists.splice(targetIndex, 0, movingList);

  return { ...board, lists: nextLists };
}

// Reads ordered list ids for persistence.
function getListIds(board) {
  return board.lists.map((list) => list.id);
}

// Reads the browser-local collapse state for one board.
function readCollapsedListIds(boardId) {
  try {
    return JSON.parse(localStorage.getItem(`trello-collapsed-lists:${boardId}`) || '[]');
  } catch (error) {
    return [];
  }
}

// Keeps the Inbox width inside usable desktop bounds.
function clampInboxWidth(width) {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const maxWidth = Math.max(260, Math.min(520, viewportWidth - 560));
  return Math.min(Math.max(width, 240), maxWidth);
}

// Reads the browser-local Inbox panel width.
function readInboxWidth() {
  try {
    return clampInboxWidth(Number(localStorage.getItem('trello-inbox-width')) || 290);
  } catch (error) {
    return 290;
  }
}

// Reads the drag payload stored by a draggable card.
function readDragPayload(event) {
  const payload = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
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
      cards: list.cards.map((card) => (card.id === temporaryId ? { ...card, ...createdCard } : card))
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

// Adds or replaces one archived card without duplicating it in the archive list.
function upsertArchivedCard(archivedCards, archivedCard) {
  return [archivedCard, ...archivedCards.filter((card) => String(card.id) !== String(archivedCard.id))];
}

// Replaces a temporary inbox id after the API creates the permanent inbox card.
function replaceInboxCardById(inboxCards, temporaryId, createdCard) {
  return inboxCards.map((card) => (card.id === temporaryId ? hydrateInboxCards([{ ...createdCard, badges: [] }])[0] : card));
}

// Inserts one Inbox card before a target Inbox card or at the end.
function insertInboxCard(inboxCards, card, targetInboxCardId = null) {
  const insertIndex = targetInboxCardId
    ? inboxCards.findIndex((item) => item.id === targetInboxCardId)
    : inboxCards.length;
  const safeIndex = insertIndex === -1 ? inboxCards.length : insertIndex;
  const nextCards = [...inboxCards];
  nextCards.splice(safeIndex, 0, card);
  return nextCards;
}

// Resolves a label value that may be an Inbox label id or a board label object.
function resolveCardLabel(label, labels) {
  if (typeof label === 'string') {
    return labels.find((item) => item.id === label) || { id: label, name: label, color: '#579dff' };
  }

  if (label && typeof label === 'object') {
    return {
      id: label.id || label.color || label.name,
      name: label.name || '',
      color: label.color || '#579dff'
    };
  }

  return null;
}

// Moves an Inbox card before a target Inbox card or to the end.
function moveInboxCard(inboxCards, inboxCardId, targetInboxCardId = null) {
  if (inboxCardId === targetInboxCardId) {
    return inboxCards;
  }

  const movingCard = inboxCards.find((card) => card.id === inboxCardId);

  if (!movingCard) {
    return inboxCards;
  }

  const cardsWithoutMoving = inboxCards.filter((card) => card.id !== inboxCardId);
  const insertIndex = targetInboxCardId
    ? cardsWithoutMoving.findIndex((card) => card.id === targetInboxCardId)
    : cardsWithoutMoving.length;
  const safeIndex = insertIndex === -1 ? cardsWithoutMoving.length : insertIndex;
  const nextCards = [...cardsWithoutMoving];
  nextCards.splice(safeIndex, 0, movingCard);

  return nextCards;
}

// Reads ordered Inbox card ids for persistence.
function getInboxCardIds(inboxCards) {
  return inboxCards.map((card) => card.id);
}

// Filters Inbox cards using keyword and status controls.
function filterInboxCards(inboxCards, filters) {
  return inboxCards.filter((card) => {
    const matchesKeyword = card.title.toLowerCase().includes(filters.keyword.trim().toLowerCase());
    const matchesComplete = !filters.completeOnly || card.completed;
    const matchesIncomplete = !filters.incompleteOnly || !card.completed;

    return matchesKeyword && matchesComplete && matchesIncomplete;
  });
}

// Sorts Inbox cards by title in the requested direction.
function sortInboxCards(inboxCards, direction) {
  return [...inboxCards].sort((first, second) => {
    const result = first.title.localeCompare(second.title);
    return direction === 'desc' ? -result : result;
  });
}

// Renders the Trello-style application shell for the current milestone.
function App() {
  const [board, setBoard] = useState(DEMO_BOARD);
  const [inboxCards, setInboxCards] = useState(DEMO_INBOX_CARDS);
  const [inboxLabels, setInboxLabels] = useState(defaultInboxLabels);
  const [archivedInboxCards, setArchivedInboxCards] = useState([]);
  const [archivedBoardCards, setArchivedBoardCards] = useState([]);
  const [isArchivedBoardOpen, setIsArchivedBoardOpen] = useState(false);
  const [inboxSortDirection, setInboxSortDirection] = useState('none');
  const [inboxFilters, setInboxFilters] = useState({ keyword: '', completeOnly: false, incompleteOnly: false });
  const [inboxBackgroundIndex, setInboxBackgroundIndex] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [selectedInboxCardId, setSelectedInboxCardId] = useState(null);
  const [isConsolidateOpen, setIsConsolidateOpen] = useState(false);
  const [collapsedListIds, setCollapsedListIds] = useState(() => readCollapsedListIds(DEMO_BOARD.id));
  const [inboxWidth, setInboxWidth] = useState(readInboxWidth);
  const [visibleViews, setVisibleViews] = useState({ inbox: true, board: true });
  const skipCollapsedPersistRef = useRef(false);
  const [status, setStatus] = useState('Using local demo data until the API is connected.');

  useEffect(() => {
    loadInitialBoard(setBoard, setStatus);
    loadInitialInbox(setInboxCards, setInboxLabels);
  }, []);

  useEffect(() => {
    skipCollapsedPersistRef.current = true;
    setCollapsedListIds(readCollapsedListIds(board.id));
    loadArchivedBoardCards(board.id, setArchivedBoardCards, setStatus);
  }, [board.id]);

  useEffect(() => {
    if (skipCollapsedPersistRef.current) {
      skipCollapsedPersistRef.current = false;
      return;
    }

    localStorage.setItem(`trello-collapsed-lists:${board.id}`, JSON.stringify(collapsedListIds));
  }, [board.id, collapsedListIds]);

  useEffect(() => {
    localStorage.setItem('trello-inbox-width', String(inboxWidth));
  }, [inboxWidth]);

  const selectedCard = useMemo(() => findCard(board, selectedCardId), [board, selectedCardId]);
  const selectedInboxCard = useMemo(
    () => inboxCards.find((card) => card.id === selectedInboxCardId),
    [inboxCards, selectedInboxCardId]
  );
  const visibleInboxCards = useMemo(() => {
    const filteredCards = filterInboxCards(inboxCards, inboxFilters);
    return inboxSortDirection === 'none' ? filteredCards : sortInboxCards(filteredCards, inboxSortDirection);
  }, [inboxCards, inboxFilters, inboxSortDirection]);

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

  // Toggles a list between the expanded and collapsed Trello-style states.
  function handleListCollapseToggle(listId) {
    setCollapsedListIds((current) =>
      current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId]
    );
  }

  // Reorders lists horizontally and persists the new list positions through the API.
  async function handleListReorder(sourceListId, targetListId) {
    if (!sourceListId || !targetListId || sourceListId === targetListId) {
      return;
    }

    const previousBoard = board;
    const nextBoard = moveListInBoard(board, sourceListId, targetListId);
    setBoard(nextBoard);

    try {
      if (!isLocalId(board.id) && !isLocalId(sourceListId) && !isLocalId(targetListId)) {
        await apiRequest(`/boards/${board.id}/lists/reorder`, {
          method: 'PATCH',
          body: JSON.stringify({ listIds: getListIds(nextBoard) })
        });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save list order. Check the API connection.');
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

  // Loads archived board cards from the API and opens the archive modal.
  async function handleArchivedBoardOpen() {
    setIsArchivedBoardOpen(true);
    await loadArchivedBoardCards(board.id, setArchivedBoardCards, setStatus);
  }

  // Restores one archived board card back to its original list.
  async function handleCardRestore(cardId) {
    const archivedCard = archivedBoardCards.find((card) => card.id === cardId);

    if (!archivedCard) {
      return;
    }

    setArchivedBoardCards((cards) => cards.filter((card) => card.id !== cardId));

    try {
      if (!isLocalId(cardId)) {
        const data = await apiRequest(`/cards/${cardId}/restore`, { method: 'PATCH' });
        setBoard((current) => addCardToList(current, data.card.listId, data.card));
        return;
      }

      const targetListId = archivedCard.archive?.originalListId || archivedCard.listId;
      const targetPosition = archivedCard.archive?.originalPosition || archivedCard.position;
      setBoard((current) => addCardToList(current, targetListId, { ...archivedCard, listId: targetListId, position: targetPosition, archived: false }));
    } catch (error) {
      setArchivedBoardCards((cards) => [archivedCard, ...cards]);
      setStatus('Could not restore archived card. Check the API connection.');
    }
  }

  // Permanently deletes one archived board card.
  async function handleArchivedCardDelete(cardId) {
    const archivedCard = archivedBoardCards.find((card) => card.id === cardId);
    setArchivedBoardCards((cards) => cards.filter((card) => card.id !== cardId));

    try {
      if (!isLocalId(cardId)) {
        await apiRequest(`/cards/${cardId}`, { method: 'DELETE' });
      }
    } catch (error) {
      if (archivedCard) {
        setArchivedBoardCards((cards) => [archivedCard, ...cards]);
      }
      setStatus('Could not delete archived card. Check the API connection.');
    }
  }

  // Toggles the visual completed state on a board card.
  function handleCardCompleteToggle(cardId) {
    const existing = findCard(board, cardId)?.card;

    if (!existing) {
      return;
    }

    const isComplete = !(existing.completed || existing.done);
    setBoard(replaceCard(board, { ...existing, completed: isComplete, done: isComplete }));
  }

  // Archives a card locally and through the API when available.
  async function handleCardArchive(cardId) {
    const previousBoard = board;
    const cardLocation = findCard(board, cardId);

    if (!cardLocation) {
      return;
    }

    const localArchivedCard = {
      ...cardLocation.card,
      archived: true,
      archive: {
        originalListId: cardLocation.listId,
        originalPosition: cardLocation.card.position,
        archivedAt: new Date().toISOString()
      }
    };

    setBoard(removeCard(board, cardId));
    setArchivedBoardCards((cards) => upsertArchivedCard(cards, localArchivedCard));
    setSelectedCardId(null);

    try {
      if (!isLocalId(cardId)) {
        const data = await apiRequest(`/cards/${cardId}/archive`, { method: 'PATCH' });
        setArchivedBoardCards((cards) => upsertArchivedCard(cards, data.card));
      }
    } catch (error) {
      setBoard(previousBoard);
      setArchivedBoardCards((cards) => cards.filter((card) => String(card.id) !== String(cardId)));
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
    const localInboxCard = { id: createLocalId('inbox'), title, description: '', badges: [], labels: [], completed: false };
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
          body: JSON.stringify({
            title: updatedCard.title,
            description: updatedCard.description,
            labels: updatedCard.labels || []
          })
        });
        const savedCard = hydrateInboxCards([data.inboxCard])[0];
        setInboxCards((current) => replaceInboxCard(current, {
          ...savedCard,
          badges: updatedCard.badges || savedCard.badges,
          completed: updatedCard.completed || false,
          dueDate: updatedCard.dueDate || '',
          dueTime: updatedCard.dueTime || '',
          dueReminder: updatedCard.dueReminder || '1 Day before',
          dueRecurring: updatedCard.dueRecurring || 'Never'
        }));
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

  // Archives one Inbox card locally and removes it from active Inbox results.
  async function handleInboxArchive(inboxCardId) {
    const inboxCard = inboxCards.find((card) => card.id === inboxCardId);

    if (inboxCard) {
      setArchivedInboxCards((current) => [...current, inboxCard]);
    }

    await handleInboxDelete(inboxCardId);
    setSelectedInboxCardId(null);
  }

  // Saves Inbox card modal edits locally and through the API when available.
  async function handleInboxModalSave(inboxCardId, updates) {
    await handleInboxUpdate(inboxCardId, updates);
  }

  // Moves a board card back into Inbox and removes it from its source list.
  async function handleBoardCardToInbox(cardId, targetInboxCardId = null) {
    const foundCard = findCard(board, cardId);

    if (!foundCard) {
      return;
    }

    const previousBoard = board;
    const previousInboxCards = inboxCards;
    const localInboxCard = {
      id: createLocalId('inbox'),
      title: foundCard.card.title,
      description: foundCard.card.description || '',
      badges: foundCard.card.badges || [],
      labels: foundCard.card.labels || [],
      completed: foundCard.card.completed || foundCard.card.done || false,
      dueDate: foundCard.card.dueDate || '',
      dueTime: foundCard.card.dueTime || '',
      dueReminder: foundCard.card.dueReminder || '1 Day before',
      dueRecurring: foundCard.card.dueRecurring || 'Never'
    };

    setBoard(removeCard(board, cardId));
    setInboxCards((current) => insertInboxCard(current, localInboxCard, targetInboxCardId));
    let createdInboxCard = null;

    try {
      if (!isLocalId(cardId)) {
        const data = await apiRequest('/inbox-cards', {
          method: 'POST',
          body: JSON.stringify({
            title: localInboxCard.title,
            description: localInboxCard.description,
            labels: localInboxCard.labels
          })
        });
        createdInboxCard = hydrateInboxCards([data.inboxCard])[0];
        setInboxCards((current) => replaceInboxCardById(current, localInboxCard.id, {
          ...createdInboxCard,
          badges: localInboxCard.badges,
          completed: localInboxCard.completed,
          dueDate: localInboxCard.dueDate,
          dueTime: localInboxCard.dueTime,
          dueReminder: localInboxCard.dueReminder,
          dueRecurring: localInboxCard.dueRecurring
        }));

        await apiRequest(`/cards/${cardId}/archive`, { method: 'PATCH' });
      }
    } catch (error) {
      setStatus('Card moved to Inbox locally, but the API save failed.');
    }
  }

  // Reorders Inbox cards locally and through the API when available.
  async function handleInboxDrop(draggedItem, targetInboxCardId = null) {
    if (!draggedItem) {
      return;
    }

    if (draggedItem.type === 'board-card') {
      await handleBoardCardToInbox(draggedItem.cardId, targetInboxCardId);
      return;
    }

    if (draggedItem.type !== 'inbox-card') {
      return;
    }

    const previousInboxCards = inboxCards;
    const nextInboxCards = moveInboxCard(inboxCards, draggedItem.cardId, targetInboxCardId);
    setInboxCards(nextInboxCards);

    try {
      if (!isLocalId(draggedItem.cardId)) {
        await apiRequest('/inbox-cards/reorder', {
          method: 'PATCH',
          body: JSON.stringify({ inboxCardIds: getInboxCardIds(nextInboxCards) })
        });
      }
    } catch (error) {
      setInboxCards(previousInboxCards);
      setStatus('Could not save Inbox order. Check the API connection.');
    }
  }

  // Toggles the completed status on an Inbox card.
  function handleInboxCompleteToggle(inboxCardId) {
    const inboxCard = inboxCards.find((card) => card.id === inboxCardId);

    if (inboxCard) {
      handleInboxUpdate(inboxCardId, { ...inboxCard, completed: !inboxCard.completed });
    }
  }

  // Toggles Inbox title sorting between ascending and descending.
  function handleInboxSortToggle() {
    setInboxSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
  }

  // Cycles the Inbox background color option.
  function handleInboxBackgroundChange() {
    setInboxBackgroundIndex((index) => (index + 1) % 4);
  }

  // Toggles a label on one Inbox card and persists the selection.
  async function handleInboxLabelToggle(inboxCardId, labelId) {
    const inboxCard = inboxCards.find((card) => card.id === inboxCardId);

    if (!inboxCard) {
      return;
    }

    const currentLabels = inboxCard.labels || [];
    const nextLabels = currentLabels.includes(labelId)
      ? currentLabels.filter((id) => id !== labelId)
      : [...currentLabels, labelId];

    await handleInboxUpdate(inboxCardId, { labels: nextLabels });
  }

  // Renames one available Inbox label and saves it to the API.
  async function handleInboxLabelRename(labelId, name) {
    const previousLabels = inboxLabels;
    setInboxLabels((labels) => labels.map((label) => (label.id === labelId ? { ...label, name } : label)));

    try {
      if (!isLocalId(labelId)) {
        const data = await apiRequest(`/inbox-labels/${labelId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name })
        });
        setInboxLabels((labels) => labels.map((label) => (label.id === labelId ? data.label : label)));
      }
    } catch (error) {
      setInboxLabels(previousLabels);
      setStatus('Could not save Inbox label. Check the API connection.');
    }
  }

  // Creates a new available Inbox label when its color is not already used.
  async function handleInboxLabelCreate(labelDraft) {
    const isColorUsed = inboxLabels.some((label) => label.color === labelDraft.color);

    if (isColorUsed || !labelDraft.color) {
      return;
    }

    const label = {
      id: createLocalId('label'),
      name: labelDraft.name.trim() || 'New label',
      color: labelDraft.color
    };

    setInboxLabels((labels) => [...labels, label]);

    try {
      const data = await apiRequest('/inbox-labels', {
        method: 'POST',
        body: JSON.stringify({ name: label.name, color: label.color })
      });
      setInboxLabels((labels) => labels.map((item) => (item.id === label.id ? data.label : item)));
    } catch (error) {
      setInboxLabels((labels) => labels.filter((item) => item.id !== label.id));
      setStatus('Could not create Inbox label. Check the API connection.');
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
      description: inboxCard.description || '',
      labels: inboxCard.labels || [],
      completed: inboxCard.completed || false
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

  // Toggles Inbox and Board visibility from the floating dock while keeping at least one view visible.
  function handleViewToggle(viewName) {
    setVisibleViews((current) => {
      const next = { ...current, [viewName]: !current[viewName] };
      return next.inbox || next.board ? next : current;
    });
  }

  // Starts resizing the Inbox panel until the pointer is released.
  function handleInboxResizeStart(event) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = inboxWidth;

    function handlePointerMove(moveEvent) {
      setInboxWidth(clampInboxWidth(startWidth + moveEvent.clientX - startX));
    }

    function handlePointerUp() {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.classList.remove('is-resizing-workspace');
    }

    document.body.classList.add('is-resizing-workspace');
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
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

  const workspaceClassName = [
    'workspace',
    visibleViews.inbox && !visibleViews.board ? 'workspace-inbox-only' : '',
    visibleViews.board && !visibleViews.inbox ? 'workspace-board-only' : ''
  ].filter(Boolean).join(' ');

  return (
    <main className={visibleViews.board ? 'app-shell' : 'app-shell app-shell-inbox-only'}>
      {visibleViews.board && <TopBar />}
      <section className={workspaceClassName} style={{ '--inbox-width': `${inboxWidth}px` }}>
        {visibleViews.inbox && (
          <InboxPanel
            cards={visibleInboxCards}
            labels={inboxLabels}
            archivedCards={archivedInboxCards}
            sortDirection={inboxSortDirection}
            filters={inboxFilters}
            backgroundIndex={inboxBackgroundIndex}
            isConsolidateOpen={isConsolidateOpen}
            onConsolidateToggle={() => setIsConsolidateOpen((isOpen) => !isOpen)}
            onInboxCreate={handleInboxCreate}
            onInboxUpdate={handleInboxUpdate}
            onInboxOpen={setSelectedInboxCardId}
            onInboxArchive={handleInboxArchive}
            onInboxDrop={handleInboxDrop}
            onInboxCompleteToggle={handleInboxCompleteToggle}
            onInboxLabelToggle={handleInboxLabelToggle}
            onInboxLabelRename={handleInboxLabelRename}
            onInboxLabelCreate={handleInboxLabelCreate}
            onSortToggle={handleInboxSortToggle}
            onBackgroundChange={handleInboxBackgroundChange}
            onFiltersChange={setInboxFilters}
          />
        )}
        {visibleViews.inbox && visibleViews.board && (
          <div
            className="workspace-resizer"
            role="separator"
            aria-label="Resize Inbox panel"
            aria-orientation="vertical"
            tabIndex="0"
            onPointerDown={handleInboxResizeStart}
          />
        )}
        {visibleViews.board && (
          <Board
            board={board}
            status={status}
            onBoardTitleChange={handleBoardTitleChange}
            onListCreate={handleListCreate}
            onListUpdate={handleListUpdate}
            onListDelete={handleListDelete}
            onListCollapseToggle={handleListCollapseToggle}
            onListReorder={handleListReorder}
            onCardCreate={handleCardCreate}
            onCardOpen={setSelectedCardId}
            onCardDrop={handleCardDrop}
            onCardUpdate={handleCardUpdate}
            onCardCompleteToggle={handleCardCompleteToggle}
            onCardArchive={handleCardArchive}
            onArchivedCardsOpen={handleArchivedBoardOpen}
            archivedCardsCount={archivedBoardCards.length}
            labels={inboxLabels}
            collapsedListIds={collapsedListIds}
          />
        )}
      </section>
      <BottomDock visibleViews={visibleViews} onViewToggle={handleViewToggle} />
      {isArchivedBoardOpen && (
        <ArchivedCardsModal
          cards={archivedBoardCards}
          onClose={() => setIsArchivedBoardOpen(false)}
          onRestore={handleCardRestore}
          onDelete={handleArchivedCardDelete}
        />
      )}
      {selectedCard && (
        <CardModal
          card={selectedCard.card}
          contextLabel="On board"
          onClose={() => setSelectedCardId(null)}
          onSave={handleCardUpdate}
          onArchive={handleCardArchive}
          onDelete={handleCardDelete}
        />
      )}
      {selectedInboxCard && (
        <CardModal
          card={selectedInboxCard}
          contextLabel="In your Inbox"
          onClose={() => setSelectedInboxCardId(null)}
          onSave={handleInboxModalSave}
          onArchive={handleInboxArchive}
          onDelete={handleInboxDelete}
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

// Loads archived board cards from the API.
async function loadArchivedBoardCards(boardId, setArchivedBoardCards, setStatus) {
  if (isLocalId(boardId)) {
    setArchivedBoardCards([]);
    return;
  }

  try {
    const data = await apiRequest(`/boards/${boardId}/archived-cards`);
    setArchivedBoardCards(data.cards || []);
  } catch (error) {
    setStatus('Could not load archived cards. Check the API connection.');
  }
}

// Loads active inbox cards or keeps demo inbox data when unavailable.
async function loadInitialInbox(setInboxCards, setInboxLabels) {
  try {
    const [inboxData, labelData] = await Promise.all([
      apiRequest('/inbox-cards'),
      apiRequest('/inbox-labels')
    ]);
    setInboxCards(hydrateInboxCards(inboxData.inboxCards));
    setInboxLabels(labelData.labels?.length ? labelData.labels : defaultInboxLabels);
  } catch (error) {
    setInboxCards(DEMO_INBOX_CARDS);
    setInboxLabels(defaultInboxLabels);
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
        <button className="icon-button" aria-label="Announcements">◌</button>
        <button className="icon-button" aria-label="Notifications">♢</button>
        <button className="icon-button" aria-label="Help">?</button>
        <UserAvatar initials="PB" />
      </div>
    </header>
  );
}

// Renders the quick-capture Inbox sidebar.
function InboxPanel({
  cards,
  labels,
  archivedCards,
  sortDirection,
  filters,
  backgroundIndex,
  isConsolidateOpen,
  onConsolidateToggle,
  onInboxCreate,
  onInboxUpdate,
  onInboxOpen,
  onInboxArchive,
  onInboxDrop,
  onInboxCompleteToggle,
  onInboxLabelToggle,
  onInboxLabelRename,
  onInboxLabelCreate,
  onSortToggle,
  onBackgroundChange,
  onFiltersChange
}) {
  const [openPanel, setOpenPanel] = useState(null);
  const popoverRef = useRef(null);
  const panelActionsRef = useRef(null);

  useEffect(() => {
    if (!openPanel) {
      return undefined;
    }

    // Closes the Inbox popover when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setOpenPanel(null);
        return;
      }

      if (
        event.type === 'mousedown' &&
        !popoverRef.current?.contains(event.target) &&
        !panelActionsRef.current?.contains(event.target)
      ) {
        setOpenPanel(null);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [openPanel]);

  // Allows Inbox cards to be dropped at the end of the Inbox.
  function handleInboxListDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    onInboxDrop(readDragPayload(event));
  }

  // Toggles one Inbox header popover at a time.
  function togglePanel(panelName) {
    setOpenPanel((currentPanel) => (currentPanel === panelName ? null : panelName));
  }

  return (
    <aside
      className={`inbox-panel inbox-background-${backgroundIndex}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleInboxListDrop}
    >
      <div className="panel-title-row">
        <h2>Inbox</h2>
        <div className="panel-actions" ref={panelActionsRef}>
          <button className="icon-button" aria-label="Filter inbox" onClick={() => togglePanel('filter')}>≡</button>
          <button className="icon-button" aria-label="More inbox actions" onClick={() => togglePanel('menu')}>...</button>
        </div>
      </div>

      {openPanel && (
        <div ref={popoverRef}>
          {openPanel === 'menu' && (
            <InboxMenu
              archivedCards={archivedCards}
              sortDirection={sortDirection}
              onClose={() => setOpenPanel(null)}
              onSortToggle={onSortToggle}
              onBackgroundChange={onBackgroundChange}
            />
          )}
          {openPanel === 'filter' && (
            <InboxFilterPanel filters={filters} onClose={() => setOpenPanel(null)} onFiltersChange={onFiltersChange} />
          )}
        </div>
      )}

      <AddInboxForm onInboxCreate={onInboxCreate} />

      <div className="inbox-list" onDragOver={(event) => event.preventDefault()} onDrop={handleInboxListDrop}>
        {cards.length === 0 && <p className="empty-state">No cards match.</p>}
        {cards.map((card) => (
          <InboxCard
            key={card.id}
            card={card}
            labels={labels}
            onInboxUpdate={onInboxUpdate}
            onInboxOpen={onInboxOpen}
            onInboxArchive={onInboxArchive}
            onInboxDrop={onInboxDrop}
            onInboxCompleteToggle={onInboxCompleteToggle}
            onInboxLabelToggle={onInboxLabelToggle}
            onInboxLabelRename={onInboxLabelRename}
            onInboxLabelCreate={onInboxLabelCreate}
          />
        ))}
      </div>

      <button className="inbox-footer" onClick={onConsolidateToggle}>
        <span className="footer-icon-cluster" aria-hidden="true"><i>✉</i><i>●</i><i>▣</i><i>◉</i><i>◆</i></span>
        <span>Consolidate your to-dos</span>
        <span aria-hidden="true">⌃</span>
      </button>
      {isConsolidateOpen && <ConsolidatePanel onClose={onConsolidateToggle} />}
    </aside>
  );
}

// Renders the Inbox overflow menu popover.
function InboxMenu({ archivedCards, sortDirection, onClose, onSortToggle, onBackgroundChange }) {
  return (
    <section className="inbox-popover inbox-menu-popover">
      <div className="popover-header"><span>Menu</span><button onClick={onClose}>×</button></div>
      <button onClick={onSortToggle}>☷ Sort <span>{sortDirection === 'asc' ? 'A-Z' : sortDirection === 'desc' ? 'Z-A' : ''}</span></button>
      <details>
        <summary>▱ View archived cards <span>{archivedCards.length}</span></summary>
        <div className="archived-list">
          {archivedCards.length === 0 && <p>No archived cards.</p>}
          {archivedCards.map((card) => <p key={card.id}>{card.title}</p>)}
        </div>
      </details>
      <button onClick={onBackgroundChange}>▣ Change background</button>
    </section>
  );
}

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

// Renders the expanded composer that adds a quick Inbox card.
function AddInboxForm({ onInboxCreate }) {
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button className="inbox-add-placeholder" onClick={() => setIsOpen(true)}>
        Add a card
      </button>
    );
  }

  return (
    <form className="inbox-composer" onSubmit={handleSubmit}>
      <textarea value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Enter a title" />
      <div className="form-actions">
        <button type="submit" className="primary-action">Add card</button>
        <button type="button" className="quiet-link" onClick={() => setIsOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

// Renders one draggable Inbox card with hover edit behavior.
function InboxCard({
  card,
  labels,
  onInboxUpdate,
  onInboxOpen,
  onInboxArchive,
  onInboxDrop,
  onInboxCompleteToggle,
  onInboxLabelToggle,
  onInboxLabelRename,
  onInboxLabelCreate
}) {
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [isLabelPanelOpen, setIsLabelPanelOpen] = useState(false);
  const [isDatesPanelOpen, setIsDatesPanelOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title);
  const quickEditRef = useRef(null);

  useEffect(() => {
    setDraftTitle(card.title);
  }, [card.title]);

  useEffect(() => {
    if (!isQuickEditing) {
      return undefined;
    }

    // Closes the quick editor when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setIsQuickEditing(false);
        return;
      }

      if (event.type === 'mousedown' && !quickEditRef.current?.contains(event.target)) {
        setIsQuickEditing(false);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isQuickEditing]);

  // Saves the quick editor title when it is valid.
  function saveQuickEdit() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setDraftTitle(card.title);
      setIsQuickEditing(false);
      return;
    }

    if (nextTitle !== card.title) {
      onInboxUpdate(card.id, { title: nextTitle, description: card.description || '' });
    }

    setIsQuickEditing(false);
  }

  // Stores the Inbox card drag payload for Inbox and board drop zones.
  function handleDragStart(event) {
    const payload = JSON.stringify({ type: 'inbox-card', cardId: card.id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', payload);
    event.dataTransfer.setData('text/plain', payload);
  }

  // Drops another Inbox card before this card.
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    onInboxDrop(readDragPayload(event), card.id);
  }

  // Opens the quick editor without starting a drag or opening the card modal.
  function handleEditClick(event) {
    event.stopPropagation();
    setIsQuickEditing(true);
  }

  if (isQuickEditing) {
    return (
      <article className="inbox-card inbox-card-editing" ref={quickEditRef}>
        {card.labels?.length > 0 && (
          <div className="inbox-edit-label-strip">
            {card.labels.map((labelValue) => {
              const label = resolveCardLabel(labelValue, labels);
              return label ? <span key={label.id || label.color} style={{ '--label-color': label.color }}>{label.name}</span> : null;
            })}
          </div>
        )}
        <textarea value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} autoFocus />
        <button className="primary-action inbox-save-button" onClick={saveQuickEdit}>Save</button>
        <div className="inbox-quick-menu">
          <button onClick={() => onInboxOpen(card.id)}>▤ Open card</button>
          <button onClick={() => setIsLabelPanelOpen(true)}>🏷 Edit labels</button>
          <button onClick={() => setIsDatesPanelOpen(true)}>◷ Edit dates</button>
          <button onClick={() => onInboxArchive(card.id)}><ArchiveCardIcon /> Archive</button>
        </div>
        {isLabelPanelOpen && (
          <LabelEditor
            card={card}
            labels={labels}
            onClose={() => setIsLabelPanelOpen(false)}
            onLabelToggle={onInboxLabelToggle}
            onLabelRename={onInboxLabelRename}
            onLabelCreate={onInboxLabelCreate}
          />
        )}
        {isDatesPanelOpen && (
          <DatesEditor
            card={card}
            onClose={() => setIsDatesPanelOpen(false)}
            onSave={(dateData) => onInboxUpdate(card.id, dateData)}
            onRemove={() => onInboxUpdate(card.id, { dueDate: '', dueTime: '', dueReminder: '1 Day before', dueRecurring: 'Never' })}
          />
        )}
      </article>
    );
  }

  return (
    <article
      className="inbox-card draggable-card"
      draggable
      onDragStart={handleDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onDoubleClick={() => onInboxOpen(card.id)}
    >
      <button
        className={card.completed ? 'inbox-complete-dot is-complete' : 'inbox-complete-dot'}
        aria-label="Mark complete"
        onClick={(event) => {
          event.stopPropagation();
          onInboxCompleteToggle(card.id);
        }}
      />
      <div className="inbox-card-main">
        {card.labels?.length > 0 && (
          <div className="inbox-label-strip">
            {card.labels.map((labelValue) => {
              const label = resolveCardLabel(labelValue, labels);
              return label ? <span key={label.id || label.color} style={{ '--label-color': label.color }}>{label.name}</span> : null;
            })}
          </div>
        )}
        <p className="inbox-card-title">{card.title}</p>
        {card.dueDate && (
          <span className="inbox-due-badge">◷ {formatCardDate(card.dueDate)}{card.dueTime ? ` · ${card.dueTime}` : ''}</span>
        )}
      </div>
      {card.completed && (
        <button
          className="inbox-archive-button"
          aria-label="Archive card"
          onClick={(event) => {
            event.stopPropagation();
            onInboxArchive(card.id);
          }}
        >
          <ArchiveCardIcon />
        </button>
      )}
      <button className="inbox-edit-button" aria-label="Edit card" onClick={handleEditClick}><EditCardIcon /></button>
    </article>
  );
}

// Renders the label picker used by the Inbox quick editor.
function LabelEditor({ card, labels, onClose, onLabelToggle, onLabelRename, onLabelCreate }) {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const usedColors = labels.map((label) => label.color);
  const firstAvailableColor = labelColorPalette.find((color) => !usedColors.includes(color)) || '';
  const [selectedColor, setSelectedColor] = useState(firstAvailableColor);
  const panelRef = useRef(null);

  useEffect(() => {
    // Closes the label editor when the user clicks outside it or presses Escape.
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

  const visibleLabels = labels.filter((label) => label.name.toLowerCase().includes(search.trim().toLowerCase()));

  // Creates a new label from the selected title and color.
  function handleCreateLabel() {
    if (!selectedColor || usedColors.includes(selectedColor)) {
      return;
    }

    onLabelCreate({ name: newLabelName, color: selectedColor });
    setNewLabelName('');
    setSelectedColor(labelColorPalette.find((color) => ![...usedColors, selectedColor].includes(color)) || '');
    setIsCreating(false);
  }

  if (isCreating) {
    return (
      <section className="label-editor label-create-editor" ref={panelRef}>
        <div className="popover-header"><button onClick={() => setIsCreating(false)}>‹</button><span>Create label</span><button onClick={onClose}>×</button></div>
        <div className="label-preview-area">
          <span className="label-preview" style={{ '--label-color': selectedColor || '#626f86' }}>{newLabelName || 'Label preview'}</span>
        </div>
        <label className="label-create-field">
          <span>Title</span>
          <input value={newLabelName} onChange={(event) => setNewLabelName(event.target.value)} autoFocus />
        </label>
        <p className="label-section-title">Select a color</p>
        <div className="label-color-grid">
          {labelColorPalette.map((color) => {
            const isUsed = usedColors.includes(color);
            return (
              <button
                key={color}
                className={selectedColor === color ? 'label-color-swatch is-selected' : 'label-color-swatch'}
                style={{ '--label-color': color }}
                disabled={isUsed}
                title={isUsed ? 'Color already used' : color}
                onClick={() => setSelectedColor(color)}
              >
                {selectedColor === color && !isUsed ? '✓' : ''}
              </button>
            );
          })}
        </div>
        <button className="remove-color-button" onClick={() => setSelectedColor('')}>× Remove color</button>
        <button className="primary-action create-label-button" disabled={!selectedColor} onClick={handleCreateLabel}>Create</button>
      </section>
    );
  }

  return (
    <section className="label-editor" ref={panelRef}>
      <div className="popover-header"><span>Labels</span><button onClick={onClose}>×</button></div>
      <input className="label-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search labels..." />
      <p className="label-section-title">Labels</p>
      <div className="label-option-list">
        {visibleLabels.map((label) => (
          <div className="label-option" key={label.id}>
            <input type="checkbox" checked={card.labels?.includes(label.id) || false} onChange={() => onLabelToggle(card.id, label.id)} />
            <input className="label-name-input" value={label.name} onChange={(event) => onLabelRename(label.id, event.target.value)} style={{ '--label-color': label.color }} placeholder="Label title" />
            <span>✎</span>
          </div>
        ))}
      </div>
      <button className="create-new-label-button" onClick={() => setIsCreating(true)} disabled={!firstAvailableColor}>Create a new label</button>
      {!firstAvailableColor && <p className="no-colors-left">All label colors are already in use.</p>}
    </section>
  );
}

// Renders the due-date picker used by the Inbox quick editor.
function DatesEditor({ card, onClose, onSave, onRemove }) {
  const [hasDueDate, setHasDueDate] = useState(Boolean(card.dueDate));
  const [selectedDate, setSelectedDate] = useState(card.dueDate || '2026-05-23');
  const [selectedTime, setSelectedTime] = useState(card.dueTime || '6:46 PM');
  const [recurring, setRecurring] = useState(card.dueRecurring || 'Never');
  const [reminder, setReminder] = useState(card.dueReminder || '1 Day before');
  const panelRef = useRef(null);
  const calendarRows = [
    [{ day: 26, muted: true }, { day: 27, muted: true }, { day: 28, muted: true }, { day: 29, muted: true }, { day: 30, muted: true }, { day: 1 }, { day: 2 }],
    [{ day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }, { day: 7 }, { day: 8 }, { day: 9 }],
    [{ day: 10 }, { day: 11 }, { day: 12 }, { day: 13 }, { day: 14 }, { day: 15 }, { day: 16 }],
    [{ day: 17 }, { day: 18 }, { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 }, { day: 23 }],
    [{ day: 24 }, { day: 25 }, { day: 26 }, { day: 27 }, { day: 28 }, { day: 29 }, { day: 30 }],
    [{ day: 31 }, { day: 1, muted: true }, { day: 2, muted: true }, { day: 3, muted: true }, { day: 4, muted: true }, { day: 5, muted: true }, { day: 6, muted: true }]
  ];

  useEffect(() => {
    // Closes the dates editor when the user clicks outside it or presses Escape.
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

  // Selects a visible May 2026 calendar date and enables the due date field.
  function selectCalendarDay(day) {
    setSelectedDate(buildMayDate(day));
    setHasDueDate(true);
  }

  // Saves the selected due date fields on the active card.
  function saveDates() {
    onSave({
      dueDate: hasDueDate ? selectedDate : '',
      dueTime: hasDueDate ? selectedTime : '',
      dueReminder: reminder,
      dueRecurring: recurring
    });
    onClose();
  }

  // Clears the active card due date and closes the popover.
  function removeDates() {
    onRemove();
    onClose();
  }

  return (
    <section className="dates-editor" ref={panelRef}>
      <div className="popover-header"><span>Dates</span><button onClick={onClose}>×</button></div>
      <div className="dates-month-header">
        <button aria-label="Previous year">«</button>
        <button aria-label="Previous month">‹</button>
        <strong>May 2026</strong>
        <button aria-label="Next month">›</button>
        <button aria-label="Next year">»</button>
      </div>
      <div className="dates-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="dates-calendar">
        {calendarRows.flat().map((dateCell, index) => {
          const isoDate = dateCell.muted ? '' : buildMayDate(dateCell.day);
          const className = [
            'calendar-day',
            dateCell.muted ? 'is-muted' : '',
            isoDate === '2026-05-22' ? 'is-today' : '',
            selectedDate === isoDate ? 'is-selected' : ''
          ].filter(Boolean).join(' ');

          return (
            <button
              key={dateCell.day + '-' + index}
              className={className}
              disabled={dateCell.muted}
              onClick={() => selectCalendarDay(dateCell.day)}
            >
              {dateCell.day}
            </button>
          );
        })}
      </div>
      <label className="dates-field-label">Start date</label>
      <div className="date-input-row is-disabled">
        <input type="checkbox" disabled />
        <input placeholder="M/D/YYYY" disabled />
      </div>
      <label className="dates-field-label">Due date</label>
      <div className="date-input-row">
        <input type="checkbox" checked={hasDueDate} onChange={(event) => setHasDueDate(event.target.checked)} />
        <input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setHasDueDate(true); }} />
        <select value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)}>
          {['9:00 AM', '12:00 PM', '3:00 PM', '6:46 PM', '9:00 PM'].map((time) => <option key={time}>{time}</option>)}
        </select>
      </div>
      <label className="dates-field-label">Recurring</label>
      <select className="dates-full-select" value={recurring} onChange={(event) => setRecurring(event.target.value)}>
        {['Never', 'Daily', 'Weekly', 'Monthly'].map((option) => <option key={option}>{option}</option>)}
      </select>
      <label className="dates-field-label">Set due date reminder</label>
      <select className="dates-full-select" value={reminder} onChange={(event) => setReminder(event.target.value)}>
        {['At time of due date', '5 Minutes before', '1 Hour before', '1 Day before', '2 Days before'].map((option) => <option key={option}>{option}</option>)}
      </select>
      <p className="dates-help">Reminders will be sent to all members and watchers of this card.</p>
      <button className="primary-action dates-save-button" onClick={saveDates}>Save</button>
      <button className="dates-remove-button" onClick={removeDates}>Remove</button>
    </section>
  );
}

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

// Renders the active board and its horizontal list canvas.
function Board({
  board,
  status,
  labels,
  onBoardTitleChange,
  onListCreate,
  onListUpdate,
  onListDelete,
  onListCollapseToggle,
  onListReorder,
  onCardCreate,
  onCardOpen,
  onCardDrop,
  onCardUpdate,
  onCardCompleteToggle,
  onCardArchive,
  onArchivedCardsOpen,
  archivedCardsCount,
  collapsedListIds
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const listIds = useMemo(() => board.lists.map((list) => list.id), [board.lists]);

  // Persists the final horizontal list order once a drag lands over another list.
  function handleDragEnd(event) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    onListReorder(active.id, over.id);
  }

  return (
    <section className="board-shell">
      <BoardHeader board={board} onBoardTitleChange={onBoardTitleChange} onArchivedCardsOpen={onArchivedCardsOpen} archivedCardsCount={archivedCardsCount} />
      <div className="board-canvas">
        <p className="board-status">{status}</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            <div className="list-row">
              {board.lists.map((list) => (
                <SortableBoardList
                  key={list.id}
                  list={list}
                  isCollapsed={collapsedListIds.includes(list.id)}
                  onListUpdate={onListUpdate}
                  onListDelete={onListDelete}
                  onListCollapseToggle={onListCollapseToggle}
                  onCardCreate={onCardCreate}
                  onCardOpen={onCardOpen}
                  onCardDrop={onCardDrop}
                  onCardUpdate={onCardUpdate}
                  onCardCompleteToggle={onCardCompleteToggle}
                  onCardArchive={onCardArchive}
                  labels={labels}
                />
              ))}
              <AddListForm onListCreate={onListCreate} />
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </section>
  );
}

// Renders board title and board-level action controls.
function BoardHeader({ board, onBoardTitleChange, onArchivedCardsOpen, archivedCardsCount = 0 }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    // Closes the board menu when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        return;
      }

      if (event.type === 'mousedown' && !menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isMenuOpen]);

  // Opens the archived card modal from the board menu.
  function openArchivedCards(event) {
    event.stopPropagation();
    setIsMenuOpen(false);
    onArchivedCardsOpen();
  }

  return (
    <header className="board-header">
      <div className="board-title-group">
        <InlineTitle value={board.title} label="Board title" onSave={onBoardTitleChange} heading />
      </div>
      <div className="board-menu-anchor" ref={menuRef}>
        <button className="icon-button" aria-label="Open board menu" onClick={() => setIsMenuOpen((isOpen) => !isOpen)}>...</button>
        {isMenuOpen && (
          <section className="board-menu-popover">
            <header><span>Menu</span><button onClick={() => setIsMenuOpen(false)}>×</button></header>
            <button>☷ Sort <span>›</span></button>
            <button type="button" onMouseDown={(event) => event.stopPropagation()} onClick={openArchivedCards}>▱ View archived cards <span>{archivedCardsCount}</span></button>
            <button>＋ Add from <span>›</span></button>
            <button>▣ Change background <span>›</span></button>
            <button>⚙ Settings <span>›</span></button>
          </section>
        )}
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
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitTitle}
      onKeyDown={handleKeyDown}
    />
  );
}

// Connects one board list to the sortable horizontal list row.
function SortableBoardList(props) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: props.list.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <BoardList
      {...props}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
      setSortableNodeRef={setNodeRef}
      sortableStyle={style}
    />
  );
}

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
  onListCollapseToggle,
  onCardCreate,
  onCardOpen,
  onCardDrop,
  onCardUpdate,
  onCardCompleteToggle,
  onCardArchive,
  labels
}) {
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
        <button
          className="icon-button list-more-button"
          aria-label={`More actions for ${list.title}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          ...
        </button>
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
              <BoardCard key={card.id} card={card} listId={list.id} labels={labels} onCardOpen={onCardOpen} onCardDrop={onCardDrop} onCardUpdate={onCardUpdate} onCardCompleteToggle={onCardCompleteToggle} onCardArchive={onCardArchive} />
            ))}
          </div>

          <AddCardForm listId={list.id} onCardCreate={onCardCreate} />
        </>
      )}
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
      <button className="add-card-button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setIsOpen(true)}>
        <span>+</span>
        Add a card
      </button>
    );
  }

  return (
    <form className="add-card-form" onPointerDown={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
      <textarea value={title} onChange={(event) => setTitle(event.target.value)} autoFocus placeholder="Enter a title or paste a link" />
      <div className="add-card-actions">
        <button type="submit" className="primary-action">Add card</button>
        <button type="button" className="composer-close-button" aria-label="Cancel add card" onClick={() => setIsOpen(false)}>×</button>
      </div>
    </form>
  );
}

// Renders one compact card preview in a list.
function BoardCard({ card, listId, labels, onCardOpen, onCardDrop, onCardUpdate, onCardCompleteToggle, onCardArchive }) {
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title);
  const quickEditRef = useRef(null);

  useEffect(() => {
    setDraftTitle(card.title);
  }, [card.title]);

  useEffect(() => {
    if (!isQuickEditing) {
      return undefined;
    }

    // Closes the board quick editor when the user clicks outside it or presses Escape.
    function handleDismiss(event) {
      if (event.key === 'Escape') {
        setIsQuickEditing(false);
        return;
      }

      if (event.type === 'mousedown' && !quickEditRef.current?.contains(event.target)) {
        setIsQuickEditing(false);
      }
    }

    document.addEventListener('mousedown', handleDismiss);
    document.addEventListener('keydown', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleDismiss);
      document.removeEventListener('keydown', handleDismiss);
    };
  }, [isQuickEditing]);

  // Stores the board card drag payload for list and Inbox drop zones.
  function handleDragStart(event) {
    const payload = JSON.stringify({ type: 'board-card', cardId: card.id, listId });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', payload);
    event.dataTransfer.setData('text/plain', payload);
  }

  // Drops another draggable card before this card.
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    onCardDrop(readDragPayload(event), listId, card.id);
  }

  // Toggles the list card completion state without opening the modal.
  function handleCompleteClick(event) {
    event.stopPropagation();
    onCardCompleteToggle(card.id);
  }

  // Opens the board quick editor without opening the card modal.
  function handleEditClick(event) {
    event.stopPropagation();
    setIsQuickEditing(true);
  }

  // Archives a board card without opening the modal.
  function handleArchiveClick(event) {
    event.stopPropagation();
    onCardArchive(card.id);
  }

  // Saves the board quick editor title when it is valid.
  function saveQuickEdit() {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setDraftTitle(card.title);
      setIsQuickEditing(false);
      return;
    }

    if (nextTitle !== card.title) {
      onCardUpdate(card.id, { title: nextTitle, description: card.description || '' });
    }

    setIsQuickEditing(false);
  }

  const cardLabels = card.labels?.length > 0 && (
    <div className="label-row">
      {card.labels.map((label) => {
        const labelValue = resolveCardLabel(label, labels);
        return labelValue ? (
          <span
            className={labelValue.name ? 'label-chip has-name' : 'label-chip'}
            key={labelValue.id || labelValue.name || labelValue.color}
            style={{ '--label-color': labelValue.color || '#579dff' }}
            title={labelValue.name || 'Card label'}
          >
            {labelValue.name}
          </span>
        ) : null;
      })}
    </div>
  );

  if (isQuickEditing) {
    return (
      <article className="board-card board-card-editing" ref={quickEditRef}>
        {cardLabels}
        <textarea value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} autoFocus />
        <button className="primary-action inbox-save-button" onClick={saveQuickEdit}>Save</button>
        <div className="inbox-quick-menu board-quick-menu">
          <button onClick={() => onCardOpen(card.id)}>▤ Open card</button>
          <button onClick={handleArchiveClick}><ArchiveCardIcon /> Archive</button>
        </div>
      </article>
    );
  }

  return (
    <article className="board-card draggable-card" draggable role="button" tabIndex="0" onPointerDown={(event) => event.stopPropagation()} onDragStart={handleDragStart} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onClick={() => onCardOpen(card.id)} onKeyDown={(event) => event.key === 'Enter' && onCardOpen(card.id)}>
      <button className={card.completed || card.done ? 'board-complete-dot is-complete' : 'board-complete-dot'} aria-label="Mark complete" onClick={handleCompleteClick} />
      {(card.completed || card.done) && (
        <button className="card-archive-button" aria-label="Archive card" onClick={handleArchiveClick}><ArchiveCardIcon /></button>
      )}
      <button className="card-edit-button" aria-label="Edit card" onClick={handleEditClick}><EditCardIcon /></button>
      {card.cover && <CardCover variant={card.cover} />}
      {cardLabels}
      <p className={card.completed || card.done ? 'card-title is-done' : 'card-title'}>{card.title}</p>
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

// Renders archived board cards with restore and delete actions.
function ArchivedCardsModal({ cards, onClose, onRestore, onDelete }) {
  const [search, setSearch] = useState('');
  const visibleCards = cards.filter((card) => card.title.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    // Closes the archived cards modal when the user presses Escape.
    function handleEscape(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop archived-modal-backdrop" onMouseDown={onClose}>
      <section className="archived-cards-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>Inbox - Archived Cards</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>
        <label className="archived-search">
          <span>⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search archived cards" />
        </label>
        <p className="archive-period">Past 7 days</p>
        <div className="archived-card-results">
          {visibleCards.length === 0 && <p className="empty-state">No archived cards.</p>}
          {visibleCards.map((card) => (
            <article className="archived-card-item" key={card.id}>
              <p><span className="archived-check">✓</span>{card.title}</p>
              <small>▱ Archived</small>
              <div>
                <button onClick={() => onRestore(card.id)}>Restore</button>
                <span>•</span>
                <button onClick={() => onDelete(card.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// Renders the modal used to edit card title and description.
function CardModal({ card, contextLabel, onClose, onSave, onArchive, onDelete }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
  }, [card]);

  useEffect(() => {
    // Closes the card modal when the user presses Escape.
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
        <span className="modal-context-label">{contextLabel}</span>
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

// Renders the card edit icon used by Inbox and board card hover controls.
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

// Renders the archive icon used by card archive hover controls.
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

// Renders the floating view switcher dock from the reference board UI.
function BottomDock({ visibleViews, onViewToggle }) {
  return (
    <nav className="bottom-dock" aria-label="Board views">
      <button
        className={visibleViews.inbox ? 'is-active' : ''}
        aria-pressed={visibleViews.inbox}
        onClick={() => onViewToggle('inbox')}
      >
        ▣ Inbox
      </button>
      <button
        className={visibleViews.board ? 'is-active' : ''}
        aria-pressed={visibleViews.board}
        onClick={() => onViewToggle('board')}
      >
        ▥ Board
      </button>
      <span className="dock-divider" aria-hidden="true" />
      <button>⇄ Switch boards</button>
    </nav>
  );
}

export default App;
