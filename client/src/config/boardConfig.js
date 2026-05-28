export const DEFAULT_BOARD_BACKGROUND = {
  type: 'color',
  value: 'linear-gradient(135deg, #4b3b78 0%, #854c89 100%)'
};

export const boardBackgroundPhotoOptions = [
  { id: 'snowfield', label: 'Snow field', url: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1400&q=80' },
  { id: 'iceberg', label: 'Iceberg', url: 'https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1400&q=80' },
  { id: 'starscape', label: 'Starscape', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80' },
  { id: 'mountain', label: 'Mountain', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80' },
  { id: 'coast', label: 'Coast', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80' },
  { id: 'forest', label: 'Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=80' }
];

export const boardBackgroundColorOptions = [
  'linear-gradient(135deg, #17345a 0%, #0c536b 100%)',
  'linear-gradient(135deg, #0c66e4 0%, #6cc3e0 100%)',
  'linear-gradient(135deg, #5e4db2 0%, #c9377c 100%)',
  'linear-gradient(135deg, #8f3f65 0%, #f87168 100%)',
  'linear-gradient(135deg, #1f845a 0%, #6cc3e0 100%)',
  'linear-gradient(135deg, #946f00 0%, #f18d13 100%)',
  '#0c66e4', '#1f845a', '#946f00', '#ae2e24', '#5e4db2', '#c9377c', '#0c536b', '#626f86'
];

export const DEMO_BOARD = {
  id: 'demo-board',
  title: 'My Trello board',
  background: DEFAULT_BOARD_BACKGROUND,
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

export const DEMO_INBOX_CARDS = [
  {
    id: 'demo-inbox-1',
    title: 'Test email from May 2026',
    description: 'Captured task waiting to be organized.',
    badges: ['1'],
    labels: []
  }
];

export const listAccents = ['#55326f', '#5e4900', '#14583b', '#111600', '#164555', '#4c2f22'];
export const listColorOptions = ['#1f845a', '#946f00', '#b65c02', '#ae2e24', '#8f3fba', '#0c66e4', '#1d7f8c', '#4c6b1f', '#943d73', '#626f86'];
export const labelColorPalette = [
  '#1f845a', '#946f00', '#b65c02', '#7f241d', '#8f3fba',
  '#216e4e', '#7f5f01', '#a54800', '#ae2e24', '#6e2f99',
  '#4bce97', '#e2b203', '#f18d13', '#f87168', '#c97cf4',
  '#0c66e4', '#0c536b', '#4c6b1f', '#943d73', '#626f86',
  '#0055cc', '#1d7f8c', '#5b7f24', '#ae4787', '#758195',
  '#579dff', '#6cc3e0', '#94c748', '#e774bb', '#8590a2'
];
export const defaultInboxLabels = [
  { id: 'label-ok', name: 'ok', color: labelColorPalette[0] },
  { id: 'label-gold', name: '', color: labelColorPalette[1] },
  { id: 'label-orange', name: '', color: labelColorPalette[2] },
  { id: 'label-red-dark', name: '', color: labelColorPalette[3] },
  { id: 'label-purple', name: '', color: labelColorPalette[4] }
];
/*
File summary:
- Shared frontend configuration and demo data.
- Defines palettes, default board backgrounds, seed board data, and fallback inbox cards.
- Use this for UI defaults that should not live inside components.
*/
