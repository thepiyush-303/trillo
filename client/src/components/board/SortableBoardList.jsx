import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BoardList from './BoardList.jsx';

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

export default SortableBoardList;
/*
File summary:
- dnd-kit wrapper for sortable board lists.
- Connects list components to horizontal drag attributes and transform styles.
- Used inside the board list SortableContext.
*/
