function CardCover({ variant }) {
  return (
    <div className={`card-cover card-cover-${variant}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export default CardCover;
/*
File summary:
- Decorative fallback/tutorial card cover component.
- Renders local CSS-driven cover variants for seeded demo cards.
- Used when demo cards reference string cover variants.
*/
