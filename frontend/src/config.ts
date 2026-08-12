// ==========================================
// SHARED CONFIGURATIONS & THEME PRESETS
// ==========================================

export interface Tile {
  index: number;
  type: 'start' | 'question' | 'treasure' | 'trap' | 'boss' | 'finish';
  label: string;
  description: string;
}

export const BOARD_TILES: Tile[] = [
  { index: 0, type: 'start', label: 'Start Camp', description: 'Begin the treasure hunt here!' },
  { index: 1, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 2, type: 'trap', label: 'Snare Trap', description: 'Random trap penalty!' },
  { index: 3, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 4, type: 'treasure', label: 'Treasure Glade', description: 'Double reward or safe bonus!' },
  { index: 5, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 6, type: 'trap', label: 'Bramble Pit', description: 'Random trap penalty!' },
  { index: 7, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 8, type: 'boss', label: 'Guardian Sphinx', description: 'Harder cross-topic Boss Question!' },
  { index: 9, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 10, type: 'treasure', label: 'Lost Vault', description: 'Double reward or safe bonus!' },
  { index: 11, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 12, type: 'trap', label: 'Quicksand', description: 'Random trap penalty!' },
  { index: 13, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 14, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 15, type: 'treasure', label: 'Royal Cache', description: 'Double reward or safe bonus!' },
  { index: 16, type: 'boss', label: 'Ancient Dragon', description: 'Final Boss Question!' },
  { index: 17, type: 'finish', label: 'Final Treasure', description: 'The Golden Cup of CS Mastery!' }
];

export const getSnakeCoords = (count: number = 18) => {
  const coords = [];
  const cols = 6;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0
      ? i % cols
      : cols - 1 - (i % cols);
    coords.push({
      x: 8.33 + col * 16.66,
      y: 16.66 + row * 33.33
    });
  }
  return coords;
};

export const TILE_COORDS_DESKTOP = getSnakeCoords(18);
export const TILE_COORDS_MOBILE = getSnakeCoords(18);

export const PRESET_COLORS = [
  { name: 'Emerald Green', value: 'bg-emerald-500 text-white border-emerald-300', hex: '#10B981' },
  { name: 'Crimson Red', value: 'bg-red-500 text-white border-red-300', hex: '#EF4444' },
  { name: 'Amber Gold', value: 'bg-amber-500 text-white border-amber-300', hex: '#F59E0B' },
  { name: 'Royal Blue', value: 'bg-blue-600 text-white border-blue-400', hex: '#2563EB' }
];

export const PRESET_AVATARS = [
  { icon: '🧙', label: 'Wizard' },
  { icon: '🤠', label: 'Explorer' },
  { icon: '👑', label: 'King' },
  { icon: '🦊', label: 'Fox' },
  { icon: '🦖', label: 'Dino' },
  { icon: '🦄', label: 'Unicorn' }
];

export const SAFE_TILES = [0, 4, 10, 15];
