// Converts a saved board background into inline CSS for the board shell.
export function getBoardBackgroundStyle(background) {
  if (!background || typeof background !== 'object') {
    return undefined;
  }

  if (background.type === 'image' && background.url) {
    return {
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.14), rgba(0, 0, 0, 0.2)), url("' + background.url + '")',
      backgroundPosition: background.position || 'center',
      backgroundSize: 'cover'
    };
  }

  if (background.type === 'color' && background.value) {
    return { background: background.value };
  }

  return undefined;
}
/*
File summary:
- View helper utilities for board presentation.
- Converts stored background metadata into React inline style objects.
- Use this wherever board background previews or shells need consistent styling.
*/
