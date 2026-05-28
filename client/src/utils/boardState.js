import { DEFAULT_BOARD_BACKGROUND, DEMO_BOARD, listAccents } from '../config/boardConfig.js';

export function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isLocalId(id) {
  return String(id).startsWith('demo-') || String(id).startsWith('board-') || String(id).startsWith('list-') || String(id).startsWith('card-') || String(id).startsWith('inbox-');
}

export function hydrateBoard(rawBoard) {
  return {
    ...rawBoard,
    background: rawBoard.background || DEFAULT_BOARD_BACKGROUND,
    members: rawBoard.members?.length ? rawBoard.members : DEMO_BOARD.members,
    lists: rawBoard.lists.map((list, index) => ({
      ...list,
      accent: list.accent || listAccents[index % listAccents.length],
      cards: (list.cards || []).map((card) => ({
        ...card,
        completed: Boolean(card.completed || card.done),
        done: Boolean(card.completed || card.done),
        labels: Array.isArray(card.labels) ? card.labels : [],
        cover: card.cover || null
      }))
    }))
  };
}

export function hydrateInboxCards(rawInboxCards) {
  return rawInboxCards.map((card) => ({
    ...card,
    badges: card.badges || [],
    labels: Array.isArray(card.labels) ? card.labels : [],
    dueDate: card.dueDate || '',
    dueTime: card.dueTime || '',
    isCompleted: Boolean(card.isCompleted || card.dueDateCompleted),
    dueDateCompleted: Boolean(card.isCompleted || card.dueDateCompleted),
    completed: Boolean(card.completed || card.done),
    done: Boolean(card.completed || card.done),
    dueDateReminder: card.dueDateReminder || card.dueReminder || '1 Day before',
    dueDateRecurring: card.dueDateRecurring || card.dueRecurring || 'Never',
    dueReminder: card.dueDateReminder || card.dueReminder || '1 Day before',
    dueRecurring: card.dueDateRecurring || card.dueRecurring || 'Never',
    cover: card.cover || null
  }));
}

export function buildMayDate(day) {
  return `2026-05-${String(day).padStart(2, '0')}`;
}

export function findCard(board, cardId) {
  for (const list of board.lists) {
    const card = list.cards.find((item) => item.id === cardId);

    if (card) {
      return { card, listId: list.id };
    }
  }

  return null;
}

export function addCardToList(board, listId, card) {
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

export function moveCardInBoard(board, cardId, sourceListId, targetListId, targetCardId = null) {
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

export function getCardIdsForList(board, listId) {
  return board.lists.find((list) => list.id === listId)?.cards.map((card) => card.id) || [];
}

export function moveListInBoard(board, listId, targetListId) {
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

export function getListIds(board) {
  return board.lists.map((list) => list.id);
}

export function readCollapsedListIds(boardId) {
  try {
    return JSON.parse(localStorage.getItem(`trello-collapsed-lists:${boardId}`) || '[]');
  } catch (error) {
    return [];
  }
}

export function clampInboxWidth(width) {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const maxWidth = Math.max(260, Math.min(520, viewportWidth - 560));
  return Math.min(Math.max(width, 240), maxWidth);
}

export function readInboxWidth() {
  try {
    return clampInboxWidth(Number(localStorage.getItem('trello-inbox-width')) || 290);
  } catch (error) {
    return 290;
  }
}

export function createLocalBoard({ title, background }) {
  return {
    id: createLocalId('board'),
    title: title.trim(),
    background: background || DEFAULT_BOARD_BACKGROUND,
    members: DEMO_BOARD.members,
    lists: []
  };
}

export function getSearchResults(query, board, inboxCards) {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return [];
  }

  const inboxResults = inboxCards
    .filter((card) => !card.archived && card.title.toLowerCase().includes(needle))
    .map((card) => ({
      id: `inbox-${card.id}`,
      type: 'inbox',
      cardId: card.id,
      title: card.title,
      location: 'Inbox'
    }));

  const boardResults = board.lists.flatMap((list) =>
    list.cards
      .filter((card) => !card.archived && card.title.toLowerCase().includes(needle))
      .map((card) => ({
        id: `board-${card.id}`,
        type: 'board',
        cardId: card.id,
        title: card.title,
        location: list.title
      }))
  );

  return [...inboxResults, ...boardResults].slice(0, 8);
}

export function readDragPayload(event) {
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

export function replaceCard(board, updatedCard) {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => (card.id === updatedCard.id ? { ...card, ...updatedCard } : card))
    }))
  };
}

export function replaceCardById(board, temporaryId, createdCard) {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => (card.id === temporaryId ? { ...card, ...createdCard } : card))
    }))
  };
}

export function removeCard(board, cardId) {
  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => card.id !== cardId)
    }))
  };
}

export function replaceInboxCard(inboxCards, updatedCard) {
  return inboxCards.map((card) => (card.id === updatedCard.id ? { ...card, ...updatedCard } : card));
}

export function upsertArchivedCard(archivedCards, archivedCard) {
  return [archivedCard, ...archivedCards.filter((card) => String(card.id) !== String(archivedCard.id))];
}

export function mergeArchivedCards(loadedCards, existingCards = []) {
  const loadedIds = new Set(loadedCards.map((card) => String(card.id)));
  const optimisticCards = existingCards.filter((card) => !loadedIds.has(String(card.id)));

  return [...optimisticCards, ...loadedCards];
}

export function replaceInboxCardById(inboxCards, temporaryId, createdCard) {
  return inboxCards.map((card) => (card.id === temporaryId ? hydrateInboxCards([{ ...createdCard, badges: [] }])[0] : card));
}

export function insertInboxCard(inboxCards, card, targetInboxCardId = null) {
  const insertIndex = targetInboxCardId
    ? inboxCards.findIndex((item) => item.id === targetInboxCardId)
    : inboxCards.length;
  const safeIndex = insertIndex === -1 ? inboxCards.length : insertIndex;
  const nextCards = [...inboxCards];
  nextCards.splice(safeIndex, 0, card);
  return nextCards;
}

export function resolveCardLabel(label, labels) {
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

export function moveInboxCard(inboxCards, inboxCardId, targetInboxCardId = null) {
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

export function getInboxCardIds(inboxCards) {
  return inboxCards.map((card) => card.id);
}

export function filterInboxCards(inboxCards, filters) {
  return inboxCards.filter((card) => {
    const matchesKeyword = card.title.toLowerCase().includes(filters.keyword.trim().toLowerCase());
    const matchesComplete = !filters.completeOnly || card.completed;
    const matchesIncomplete = !filters.incompleteOnly || !card.completed;

    return matchesKeyword && matchesComplete && matchesIncomplete;
  });
}

export function sortInboxCards(inboxCards, direction) {
  return [...inboxCards].sort((first, second) => {
    const result = first.title.localeCompare(second.title);
    return direction === 'desc' ? -result : result;
  });
}
/*
File summary:
- Pure frontend state helpers for boards, lists, cards, and inbox items.
- Handles hydration, drag ordering, archive merges, local ids, filtering, and sorting.
- Use this to keep App event handlers smaller and easier to reason about.
*/
