import { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { getBoardBackgroundStyle } from '../../utils/boardView.js';
import BoardHeader from './BoardHeader.jsx';
import SortableBoardList from './SortableBoardList.jsx';
import AddListForm from './AddListForm.jsx';

// Renders the active board and its horizontal list canvas.
function Board({
  board,
  labels,
  onBoardTitleChange,
  onBoardBackgroundChange,
  onListCreate,
  onListUpdate,
  onListDelete,
  onListDuplicate,
  onListMoveRight,
  onListSort,
  onListMoveCardsRight,
  onListArchiveCards,
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
  collapsedListIds,
  highlightedCard
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
    <section className="board-shell" style={getBoardBackgroundStyle(board.background)}>
      <BoardHeader board={board} onBoardTitleChange={onBoardTitleChange} onBoardBackgroundChange={onBoardBackgroundChange} onArchivedCardsOpen={onArchivedCardsOpen} archivedCardsCount={archivedCardsCount} />
      <div className="board-canvas">
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
                  onListDuplicate={onListDuplicate}
                  onListMoveRight={onListMoveRight}
                  onListSort={onListSort}
                  onListMoveCardsRight={onListMoveCardsRight}
                  onListArchiveCards={onListArchiveCards}
                  onListCollapseToggle={onListCollapseToggle}
                  onCardCreate={onCardCreate}
                  onCardOpen={onCardOpen}
                  onCardDrop={onCardDrop}
                  onCardUpdate={onCardUpdate}
                  onCardCompleteToggle={onCardCompleteToggle}
                  onCardArchive={onCardArchive}
                  labels={labels}
                  highlightedCard={highlightedCard}
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

export default Board;
/*
File summary:
- Main board workspace component.
- Renders board header, sortable lists, archived modal entry points, and add-list flow.
- Used by App when the Board view is visible.
*/
