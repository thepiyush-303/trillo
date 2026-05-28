import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from './utils/api.js';
import {
  addCardToList,
  clampInboxWidth,
  createLocalBoard,
  createLocalId,
  filterInboxCards,
  findCard,
  getCardIdsForList,
  getInboxCardIds,
  getListIds,
  getSearchResults,
  hydrateBoard,
  hydrateInboxCards,
  insertInboxCard,
  isLocalId,
  mergeArchivedCards,
  moveCardInBoard,
  moveInboxCard,
  moveListInBoard,
  readCollapsedListIds,
  readInboxWidth,
  removeCard,
  replaceCard,
  replaceCardById,
  replaceInboxCard,
  replaceInboxCardById,
  sortInboxCards,
  upsertArchivedCard
} from './utils/boardState.js';
import TopBar from './components/navigation/TopBar.jsx';
import BottomDock from './components/navigation/BottomDock.jsx';
import InboxPanel from './components/inbox/InboxPanel.jsx';
import Board from './components/board/Board.jsx';
import ArchivedCardsModal from './components/modals/ArchivedCardsModal.jsx';
import CardModal from './components/modals/CardModal.jsx';

import {
  DEFAULT_BOARD_BACKGROUND,
  DEMO_BOARD,
  DEMO_INBOX_CARDS,
  defaultInboxLabels,
  listAccents
} from './config/boardConfig.js';

// Renders the Trello-style application shell for the current milestone.
function App() {
  const [board, setBoard] = useState(DEMO_BOARD);
  const [boards, setBoards] = useState([DEMO_BOARD]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedCard, setHighlightedCard] = useState(null);
  const skipCollapsedPersistRef = useRef(false);
  const [status, setStatus] = useState('Using local demo data until the API is connected.');

  useEffect(() => {
    loadInitialBoard(setBoard, setBoards, setStatus);
    loadInitialInbox(setInboxCards, setInboxLabels);
  }, []);

  useEffect(() => {
    setBoards((currentBoards) => {
      const boardExists = currentBoards.some((item) => item.id === board.id);

      if (!boardExists) {
        return [...currentBoards, board];
      }

      return currentBoards.map((item) => (item.id === board.id ? board : item));
    });
  }, [board]);

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

  const searchResults = useMemo(() => getSearchResults(searchQuery, board, inboxCards), [searchQuery, board, inboxCards]);

  // Highlights and scrolls to a card selected from global search.
  function handleSearchResultSelect(result) {
    setSearchQuery('');
    setHighlightedCard({ type: result.type, id: result.cardId });
    setVisibleViews((current) => ({
      ...current,
      inbox: result.type === 'inbox' ? true : current.inbox,
      board: result.type === 'board' ? true : current.board
    }));

    window.setTimeout(() => {
      const selector = result.type === 'inbox'
        ? `[data-inbox-card-id="${result.cardId}"]`
        : `[data-board-card-id="${result.cardId}"]`;
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 80);

    window.setTimeout(() => {
      setHighlightedCard((current) => (current?.type === result.type && current?.id === result.cardId ? null : current));
    }, 2600);
  }

  // Creates and opens a new board locally first, then replaces it with the saved API board.
  async function handleBoardCreate(boardDraft) {
    const nextBoard = createLocalBoard(boardDraft);
    setBoards((currentBoards) => currentBoards.map((item) => (item.id === board.id ? board : item)).concat(nextBoard));
    setBoard(nextBoard);
    setArchivedBoardCards([]);
    setVisibleViews((current) => ({ ...current, board: true }));

    try {
      const data = await apiRequest('/boards', {
        method: 'POST',
        body: JSON.stringify({ title: nextBoard.title, background: nextBoard.background })
      });
      const savedBoard = hydrateBoard(data.board);
      setBoards((currentBoards) => currentBoards.map((item) => (item.id === nextBoard.id ? savedBoard : item)));
      setBoard(savedBoard);
      setStatus('Board created and saved.');
    } catch (error) {
      setStatus('Board was created locally, but the API save failed.');
    }
  }

  // Switches the active board while preserving the shared Inbox.
  async function handleBoardSwitch(boardId) {
    const nextBoard = boards.find((item) => item.id === boardId);

    if (!nextBoard || nextBoard.id === board.id) {
      return;
    }

    const previousBoard = board;
    setBoards((currentBoards) => currentBoards.map((item) => (item.id === board.id ? board : item)));
    setBoard(nextBoard);
    setSelectedCardId(null);
    setVisibleViews((current) => ({ ...current, board: true }));

    try {
      if (!isLocalId(boardId)) {
        const loadedBoard = await loadBoardById(boardId);
        setBoard(loadedBoard);
        setBoards((currentBoards) => currentBoards.map((item) => (item.id === loadedBoard.id ? loadedBoard : item)));
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not load selected board. Check the API connection.');
    }
  }

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

  // Saves the selected board background locally and through the API when available.
  async function handleBoardBackgroundChange(background) {
    const previousBoard = board;
    setBoard({ ...board, background });

    try {
      if (!isLocalId(board.id)) {
        const data = await apiRequest('/boards/' + board.id + '/background', {
          method: 'PATCH',
          body: JSON.stringify({ background })
        });
        setBoard((current) => ({ ...current, background: data.board.background || background }));
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save board background. Check the API connection.');
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
          body: JSON.stringify({ title, accent: localList.accent })
        });
        setBoard((current) => ({
          ...current,
          lists: current.lists.map((list) => (list.id === localList.id ? { ...data.list, accent: data.list.accent || localList.accent, cards: [] } : list))
        }));
      }
    } catch (error) {
      setStatus('List was added locally, but the API save failed.');
    }
  }

  // Updates a list locally and persists title changes through the API when available.
  async function handleListUpdate(listId, updates) {
    const previousBoard = board;
    const normalizedUpdates = typeof updates === 'string' ? { title: updates } : updates;
    setBoard({
      ...board,
      lists: board.lists.map((list) => (list.id === listId ? { ...list, ...normalizedUpdates } : list))
    });

    try {
      if (!isLocalId(listId)) {
        const payload = {};

        if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'title')) {
          payload.title = normalizedUpdates.title;
        }

        if (Object.prototype.hasOwnProperty.call(normalizedUpdates, 'accent')) {
          payload.accent = normalizedUpdates.accent;
        }

        if (Object.keys(payload).length > 0) {
          const data = await apiRequest(`/lists/${listId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
          setBoard((current) => ({
            ...current,
            lists: current.lists.map((list) => (list.id === listId ? { ...list, ...data.list, cards: list.cards } : list))
          }));
        }
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save list changes. Check the API connection.');
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

  // Creates a local copy of a list and its cards next to the original.
  function handleListDuplicate(listId) {
    const sourceIndex = board.lists.findIndex((list) => list.id === listId);

    if (sourceIndex === -1) {
      return;
    }

    const sourceList = board.lists[sourceIndex];
    const copiedList = {
      ...sourceList,
      id: createLocalId('list'),
      title: `${sourceList.title} copy`,
      cards: sourceList.cards.map((card) => ({ ...card, id: createLocalId('card') }))
    };
    const nextLists = [...board.lists];
    nextLists.splice(sourceIndex + 1, 0, copiedList);
    setBoard({ ...board, lists: nextLists });
    setStatus('List copied locally.');
  }

  // Moves a list one position to the right, matching Trello's quick move behavior.
  function handleListMoveRight(listId) {
    const sourceIndex = board.lists.findIndex((list) => list.id === listId);

    if (sourceIndex === -1 || sourceIndex === board.lists.length - 1) {
      return;
    }

    handleListReorder(listId, board.lists[sourceIndex + 1].id);
  }

  // Sorts cards inside a list by the selected criterion and persists the new order.
  async function handleListSort(listId, sortMode = 'title') {
    const previousBoard = board;
    const nextBoard = {
      ...board,
      lists: board.lists.map((list) => {
        if (list.id !== listId) {
          return list;
        }

        const cards = [...list.cards].sort((first, second) => {
          if (sortMode === 'completed') {
            return Number(Boolean(second.completed || second.done)) - Number(Boolean(first.completed || first.done));
          }

          return first.title.localeCompare(second.title, undefined, { sensitivity: 'base' });
        });

        return { ...list, cards };
      })
    };
    setBoard(nextBoard);

    try {
      const cardIds = getCardIdsForList(nextBoard, listId);

      if (!isLocalId(listId) && cardIds.every((cardId) => !isLocalId(cardId))) {
        await apiRequest('/cards/reorder', {
          method: 'PATCH',
          body: JSON.stringify({
            sourceListId: listId,
            targetListId: listId,
            sourceCardIds: cardIds,
            targetCardIds: cardIds
          })
        });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save sorted card order. Check the API connection.');
    }
  }

  // Moves all cards from a list into the next list to the right.
  async function handleListMoveCardsRight(listId) {
    const sourceIndex = board.lists.findIndex((list) => list.id === listId);

    if (sourceIndex === -1 || sourceIndex === board.lists.length - 1) {
      setStatus('There is no list to the right to move cards into.');
      return;
    }

    const sourceList = board.lists[sourceIndex];

    if (sourceList.cards.length === 0) {
      return;
    }

    const previousBoard = board;
    const targetList = board.lists[sourceIndex + 1];
    const nextBoard = {
      ...board,
      lists: board.lists.map((list) => {
        if (list.id === sourceList.id) {
          return { ...list, cards: [] };
        }

        if (list.id === targetList.id) {
          return { ...list, cards: [...list.cards, ...sourceList.cards.map((card) => ({ ...card, listId: targetList.id }))] };
        }

        return list;
      })
    };
    setBoard(nextBoard);

    try {
      const movedCardIds = sourceList.cards.map((card) => card.id);

      if (!isLocalId(sourceList.id) && !isLocalId(targetList.id) && movedCardIds.every((cardId) => !isLocalId(cardId))) {
        await apiRequest('/cards/reorder', {
          method: 'PATCH',
          body: JSON.stringify({
            sourceListId: sourceList.id,
            targetListId: targetList.id,
            sourceCardIds: [],
            targetCardIds: getCardIdsForList(nextBoard, targetList.id)
          })
        });
      }
    } catch (error) {
      setBoard(previousBoard);
      setStatus('Could not save moved cards. Check the API connection.');
    }
  }

  // Archives all cards in a list and persists the archive rows when possible.
  async function handleListArchiveCards(listId) {
    const sourceList = board.lists.find((list) => list.id === listId);

    if (!sourceList || sourceList.cards.length === 0) {
      return;
    }

    const previousBoard = board;
    const archivedCards = sourceList.cards.map((card) => ({
      ...card,
      archived: true,
      archive: {
        originalListId: listId,
        originalPosition: card.position,
        archivedAt: new Date().toISOString()
      }
    }));

    setArchivedBoardCards((cards) => archivedCards.reduce((nextCards, card) => upsertArchivedCard(nextCards, card), cards));
    setBoard({
      ...board,
      lists: board.lists.map((list) => (list.id === listId ? { ...list, cards: [] } : list))
    });

    try {
      const serverCards = sourceList.cards.filter((card) => !isLocalId(card.id));
      await Promise.all(serverCards.map((card) => apiRequest(`/cards/${card.id}/archive`, { method: 'PATCH' })));
    } catch (error) {
      setBoard(previousBoard);
      setArchivedBoardCards((cards) => cards.filter((card) => !archivedCards.some((archivedCard) => String(archivedCard.id) === String(card.id))));
      setStatus('Could not archive all cards. Check the API connection.');
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
          body: JSON.stringify({
            title: updatedCard.title,
            description: updatedCard.description || '',
            dueDate: updatedCard.dueDate || '',
            dueTime: updatedCard.dueTime || '',
            dueDateCompleted: Boolean(updatedCard.isCompleted || updatedCard.dueDateCompleted),
            dueDateReminder: updatedCard.dueDateReminder || updatedCard.dueReminder || '1 Day before',
            dueDateRecurring: updatedCard.dueDateRecurring || updatedCard.dueRecurring || 'Never',
            cover: updatedCard.cover || null,
            labels: updatedCard.labels || [],
            completed: Boolean(updatedCard.completed || updatedCard.done),
            done: Boolean(updatedCard.completed || updatedCard.done)
          })
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

  // Toggles the completed state on a board card and saves it when possible.
  async function handleCardCompleteToggle(cardId) {
    const existing = findCard(board, cardId)?.card;

    if (!existing) {
      return;
    }

    const isComplete = !(existing.completed || existing.done);
    await handleCardUpdate(cardId, { completed: isComplete, done: isComplete });
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
            description: updatedCard.description || '',
            labels: updatedCard.labels || [],
            dueDate: updatedCard.dueDate || '',
            dueTime: updatedCard.dueTime || '',
            dueDateCompleted: Boolean(updatedCard.isCompleted || updatedCard.dueDateCompleted),
            dueDateReminder: updatedCard.dueDateReminder || updatedCard.dueReminder || '1 Day before',
            dueDateRecurring: updatedCard.dueDateRecurring || updatedCard.dueRecurring || 'Never',
            cover: updatedCard.cover || null,
            completed: Boolean(updatedCard.completed || updatedCard.done),
            done: Boolean(updatedCard.completed || updatedCard.done)
          })
        });
        const savedCard = hydrateInboxCards([data.inboxCard])[0];
        setInboxCards((current) => replaceInboxCard(current, {
          ...savedCard,
          badges: updatedCard.badges || savedCard.badges,
          completed: Boolean(updatedCard.completed || updatedCard.done),
          done: Boolean(updatedCard.completed || updatedCard.done),
          dueDate: updatedCard.dueDate || '',
          dueTime: updatedCard.dueTime || '',
          isCompleted: Boolean(updatedCard.isCompleted || updatedCard.dueDateCompleted),
          dueDateCompleted: Boolean(updatedCard.isCompleted || updatedCard.dueDateCompleted),
          dueDateReminder: updatedCard.dueDateReminder || updatedCard.dueReminder || '1 Day before',
          dueDateRecurring: updatedCard.dueDateRecurring || updatedCard.dueRecurring || 'Never',
          dueReminder: updatedCard.dueDateReminder || updatedCard.dueReminder || '1 Day before',
          dueRecurring: updatedCard.dueDateRecurring || updatedCard.dueRecurring || 'Never',
          cover: updatedCard.cover || null
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
      completed: Boolean(foundCard.card.completed || foundCard.card.done),
      done: Boolean(foundCard.card.completed || foundCard.card.done),
      dueDate: foundCard.card.dueDate || '',
      dueTime: foundCard.card.dueTime || '',
      isCompleted: Boolean(foundCard.card.isCompleted || foundCard.card.dueDateCompleted),
      dueDateCompleted: Boolean(foundCard.card.isCompleted || foundCard.card.dueDateCompleted),
      dueDateReminder: foundCard.card.dueDateReminder || foundCard.card.dueReminder || '1 Day before',
      dueDateRecurring: foundCard.card.dueDateRecurring || foundCard.card.dueRecurring || 'Never',
      dueReminder: foundCard.card.dueDateReminder || foundCard.card.dueReminder || '1 Day before',
      dueRecurring: foundCard.card.dueDateRecurring || foundCard.card.dueRecurring || 'Never',
      cover: foundCard.card.cover || null
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
            labels: localInboxCard.labels,
            dueDate: localInboxCard.dueDate,
            dueTime: localInboxCard.dueTime,
            dueDateCompleted: localInboxCard.dueDateCompleted,
            dueDateReminder: localInboxCard.dueDateReminder,
            dueDateRecurring: localInboxCard.dueDateRecurring,
            cover: localInboxCard.cover,
            completed: localInboxCard.completed,
            done: localInboxCard.done
          })
        });
        createdInboxCard = hydrateInboxCards([data.inboxCard])[0];
        setInboxCards((current) => replaceInboxCardById(current, localInboxCard.id, {
          ...createdInboxCard,
          badges: localInboxCard.badges,
          completed: localInboxCard.completed,
          done: localInboxCard.done,
          dueDate: localInboxCard.dueDate,
          dueTime: localInboxCard.dueTime,
          isCompleted: localInboxCard.isCompleted,
          dueDateCompleted: localInboxCard.dueDateCompleted,
          dueDateReminder: localInboxCard.dueDateReminder,
          dueDateRecurring: localInboxCard.dueDateRecurring,
          dueReminder: localInboxCard.dueReminder,
          dueRecurring: localInboxCard.dueRecurring,
          cover: localInboxCard.cover
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
      const isComplete = !Boolean(inboxCard.completed || inboxCard.done);
      handleInboxUpdate(inboxCardId, { ...inboxCard, completed: isComplete, done: isComplete });
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
      completed: Boolean(inboxCard.completed || inboxCard.done),
      done: Boolean(inboxCard.completed || inboxCard.done),
      dueDate: inboxCard.dueDate || '',
      dueTime: inboxCard.dueTime || '',
      isCompleted: Boolean(inboxCard.isCompleted || inboxCard.dueDateCompleted),
      dueDateCompleted: Boolean(inboxCard.isCompleted || inboxCard.dueDateCompleted),
      dueDateReminder: inboxCard.dueDateReminder || inboxCard.dueReminder || '1 Day before',
      dueDateRecurring: inboxCard.dueDateRecurring || inboxCard.dueRecurring || 'Never',
      dueReminder: inboxCard.dueDateReminder || inboxCard.dueReminder || '1 Day before',
      dueRecurring: inboxCard.dueDateRecurring || inboxCard.dueRecurring || 'Never',
      cover: inboxCard.cover || null
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
      {visibleViews.board && (
        <TopBar
          searchQuery={searchQuery}
          searchResults={searchResults}
          onSearchChange={setSearchQuery}
          onSearchResultSelect={handleSearchResultSelect}
          onBoardCreate={handleBoardCreate}
        />
      )}
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
            highlightedCard={highlightedCard}
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
            onBoardBackgroundChange={handleBoardBackgroundChange}
            onListCreate={handleListCreate}
            onListUpdate={handleListUpdate}
            onListDelete={handleListDelete}
            onListDuplicate={handleListDuplicate}
            onListMoveRight={handleListMoveRight}
            onListSort={handleListSort}
            onListMoveCardsRight={handleListMoveCardsRight}
            onListArchiveCards={handleListArchiveCards}
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
            highlightedCard={highlightedCard}
          />
        )}
      </section>
      <BottomDock visibleViews={visibleViews} boards={boards} activeBoardId={board.id} onViewToggle={handleViewToggle} onBoardSwitch={handleBoardSwitch} />
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
          onCompleteToggle={handleCardCompleteToggle}
          labels={inboxLabels}
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
          onCompleteToggle={handleInboxCompleteToggle}
          labels={inboxLabels}
        />
      )}
    </main>
  );
}

// Loads a full API board with lists and cards.
async function loadBoardById(boardId) {
  const boardData = await apiRequest(`/boards/${boardId}`);
  return hydrateBoard(boardData.board);
}

// Loads the first API board or keeps demo data when the backend is unavailable.
async function loadInitialBoard(setBoard, setBoards, setStatus) {
  try {
    const boardsData = await apiRequest('/boards');
    let boardSummaries = boardsData.boards || [];
    let boardSummary = boardSummaries[0];

    if (!boardSummary) {
      const createData = await apiRequest('/boards', {
        method: 'POST',
        body: JSON.stringify({ title: 'My Trello board', background: DEFAULT_BOARD_BACKGROUND })
      });
      boardSummary = createData.board;
      boardSummaries = [boardSummary];
    }

    setBoards(boardSummaries.map((summary) => hydrateBoard(summary)));
    const hydratedBoard = await loadBoardById(boardSummary.id);
    setBoard(hydratedBoard);
    setBoards((currentBoards) => currentBoards.map((item) => (item.id === hydratedBoard.id ? hydratedBoard : item)));
    setStatus('Connected to API. Changes will persist when PostgreSQL is running.');
  } catch (error) {
    setStatus('Using local demo data until the API is connected.');
  }
}

// Loads archived board cards from the API.
async function loadArchivedBoardCards(boardId, setArchivedBoardCards, setStatus) {
  if (isLocalId(boardId)) {
    return;
  }

  try {
    const data = await apiRequest(`/boards/${boardId}/archived-cards`);
    setArchivedBoardCards((current) => mergeArchivedCards(data.cards || [], current));
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

export default App;
/*
File summary:
- Top-level application orchestration component.
- Owns board/inbox state, API event handlers, and high-level layout wiring.
- Use feature modules for UI details so this file stays focused on flow coordination.
*/
