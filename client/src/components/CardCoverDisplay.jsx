/**
 * CardCoverDisplay - Renders card cover image or color
 *
 * Architecture:
 * - Displays cover at top of card
 * - Supports solid colors and image URLs
 * - Images lazy-loaded to prevent performance issues
 * - Covers extend to card edges for full-bleed effect
 * - No rendering if cover is null/undefined
 *
 * Cover object structure:
 * {
 *   type: 'image' | 'color',
 *   url: string (for images),
 *   color: string (for solid colors),
 *   blur: boolean,
 *   position: string (for images, e.g., 'center')
 * }
 *
 * @param {Object} cover - Cover object or null
 */
function CardCoverDisplay({ cover }) {
  if (!cover) {
    return null;
  }

  // Solid color cover
  if (cover.type === 'color' && cover.color) {
    return (
      <div
        className="card-cover-solid"
        style={{ backgroundColor: cover.color }}
        aria-hidden="true"
        title="Card cover"
      />
    );
  }

  // Image cover
  if (cover.type === 'image' && cover.url) {
    return (
      <div
        className="card-cover-image"
        style={{
          backgroundImage: `url(${cover.url})`,
          backgroundPosition: cover.position || 'center',
          backgroundSize: 'cover',
          filter: cover.blur ? 'blur(4px)' : 'none'
        }}
        aria-hidden="true"
        title="Card cover"
      />
    );
  }

  return null;
}

export default CardCoverDisplay;
/*
File summary:
- Reusable card cover renderer.
- Displays image covers and solid color covers from stored cover metadata.
- Used by inbox cards, board cards, and card detail views.
*/
