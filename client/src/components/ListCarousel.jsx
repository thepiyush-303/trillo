import { useEffect, useRef, useState } from 'react';

/**
 * ListCarousel - Mobile-first list navigation component
 *
 * On mobile (< 768px), displays lists as a horizontally scrollable carousel
 * allowing users to swipe between lists. On desktop, hidden.
 *
 * Architecture:
 * - Uses CSS scroll-snap for smooth, natural mobile scrolling
 * - Snap-to-list behavior prevents partial list visibility
 * - Tracks active list index to show indicator
 * - Maintains list height to match desktop card stack behavior
 *
 * @param {Array} lists - Array of list objects with { id, title, cards, ... }
 * @param {number} activeListIndex - Currently visible list index (0-based)
 * @param {Function} onListChange - Callback when user scrolls to new list: (index) => void
 */
function ListCarousel({ lists, activeListIndex = 0, onListChange }) {
  const carouselRef = useRef(null);
  const [scrollPos, setScrollPos] = useState(0);

  // Track scroll position and snap to list boundaries
  const handleScroll = (event) => {
    const element = event.target;
    const containerWidth = element.offsetWidth;
    const scrollLeft = element.scrollLeft;

    // Calculate which list is most visible
    const newIndex = Math.round(scrollLeft / containerWidth);

    // Only trigger callback when crossing list boundary to avoid excessive re-renders
    if (newIndex !== activeListIndex) {
      onListChange(newIndex);
    }

    setScrollPos(scrollLeft);
  };

  // Auto-scroll to active list when index changes externally
  useEffect(() => {
    if (carouselRef.current) {
      const containerWidth = carouselRef.current.offsetWidth;
      carouselRef.current.scrollTo({
        left: activeListIndex * containerWidth,
        behavior: 'smooth'
      });
    }
  }, [activeListIndex]);

  if (lists.length === 0) {
    return <div className="list-carousel-empty">No lists</div>;
  }

  return (
    <>
      {/* Mobile carousel - only visible on mobile */}
      <div
        className="list-carousel-container"
        ref={carouselRef}
        onScroll={handleScroll}
        role="region"
        aria-label="Board lists carousel"
      >
        <div className="list-carousel">
          {lists.map((list, index) => (
            <div
              key={list.id}
              className={`carousel-list ${index === activeListIndex ? 'is-active' : ''}`}
              data-list-id={list.id}
            >
              <div className="carousel-list-header">
                <h3 className="carousel-list-title">{list.title}</h3>
                <small className="carousel-list-count">{list.cards?.length || 0}</small>
              </div>
              <div
                className="card-stack"
                style={{ '--list-accent': list.accent }}
              >
                {list.cards?.length > 0 ? (
                  list.cards.map((card) => (
                    <div key={card.id} className="carousel-card-preview">
                      <p>{card.title}</p>
                    </div>
                  ))
                ) : (
                  <p className="empty-list">No cards</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carousel indicator dots - shows which list is active */}
      <div className="carousel-indicators">
        {lists.map((list, index) => (
          <button
            key={list.id}
            className={`carousel-dot ${index === activeListIndex ? 'is-active' : ''}`}
            aria-label={`Go to ${list.title}`}
            onClick={() => {
              onListChange(index);
            }}
            title={list.title}
          />
        ))}
      </div>
    </>
  );
}

export default ListCarousel;
/*
File summary:
- Reusable carousel for navigating board lists.
- Tracks scroll/active list state and exposes list-change interactions.
- Use when a compact list-switching UI is needed.
*/
