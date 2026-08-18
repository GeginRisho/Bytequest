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
  { index: 2, type: 'trap', label: 'Bug Trap B (Knockback)', description: 'Bug knocked you back 2 spaces!' },
  { index: 3, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 4, type: 'treasure', label: 'Treasure Glade', description: 'Double reward or safe bonus!' },
  { index: 5, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 6, type: 'trap', label: 'Bramble Pit', description: 'Random trap penalty!' },
  { index: 7, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 8, type: 'boss', label: 'Guardian Sphinx', description: 'Harder cross-topic Boss Question!' },
  { index: 9, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 10, type: 'treasure', label: 'Lost Vault', description: 'Double reward or safe bonus!' },
  { index: 11, type: 'trap', label: 'Bug Trap A (Skip Turn)', description: 'Bug caught you! Skip next turn' },
  { index: 12, type: 'trap', label: 'Quicksand', description: 'Random trap penalty!' },
  { index: 13, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 14, type: 'question', label: 'Scroll of Knowledge', description: 'Standard Question' },
  { index: 15, type: 'treasure', label: 'Royal Cache', description: 'Double reward or safe bonus!' },
  { index: 16, type: 'boss', label: 'Ancient Dragon', description: 'Final Boss Question!' },
  { index: 17, type: 'finish', label: 'Final Treasure', description: 'The Golden Cup of CS Mastery!' }
];

export const getTilePositions = (tiles: Tile[], isMobile: boolean) => {
  const isNarrowMobile = typeof window !== 'undefined' && window.innerWidth < 420;
  if (isNarrowMobile) {
    const leftX = 28;
    const rightX = 72;
    return tiles.map((tile, i) => {
      const x = i % 2 === 0 ? leftX : rightX;
      const y = 92 - i * (84 / (tiles.length - 1));
      return { x, y };
    });
  } else if (isMobile) {
    // 2 columns, bottom to top serpentine
    return tiles.map((tile, i) => {
      if (i === 0) {
        return { x: 50, y: 90 };
      }
      if (i === 17) {
        return { x: 50, y: 10 };
      }
      const row = Math.floor((i - 1) / 2) + 1;
      const isReversedRow = row % 2 === 1; // row 1, 3, 5, 7 are reversed (left-right-left)
      const colIndex = (i - 1) % 2;
      const x = isReversedRow ? (1 - colIndex) * 60 + 20 : colIndex * 60 + 20;
      const y = 90 - row * (80 / 9);
      return { x, y };
    });
  } else {
    // Desktop: 6 columns, bottom to top serpentine
    const columns = 6;
    return tiles.map((tile, i) => {
      const row = Math.floor(i / columns);
      const isReversedRow = row % 2 === 1; // row 1 is reversed
      const colIndex = i % columns;
      const x = isReversedRow ? (columns - 1 - colIndex) * 16 + 10 : colIndex * 16 + 10;
      const y = 85 - row * 34; // 85% at bottom, 51% middle, 17% top
      return { x, y };
    });
  }
};

export const TILE_COORDS_DESKTOP = getTilePositions(BOARD_TILES, false);
export const TILE_COORDS_MOBILE = getTilePositions(BOARD_TILES, true);

export const PRESET_COLORS = [
  { name: 'Emerald Green', value: 'bg-emerald-500 text-white border-emerald-300', hex: '#10B981' },
  { name: 'Royal Blue', value: 'bg-blue-600 text-white border-blue-400', hex: '#3B82F6' },
  { name: 'Cyber Purple', value: 'bg-purple-600 text-white border-purple-400', hex: '#8B5CF6' },
  { name: 'Crimson Red', value: 'bg-red-600 text-white border-red-400', hex: '#EF4444' }
];

export const PRESET_AVATARS = [
  { icon: '🧙', label: 'Wizard' },
  { icon: '🤠', label: 'Explorer' },
  { icon: '👑', label: 'King' },
  { icon: '🦊', label: 'Fox' },
  { icon: '🦖', label: 'Dino' },
  { icon: '🦄', label: 'Unicorn' }
];

export const SAFE_TILES = [0, 3, 8];

export const getTileHexClass = (tIdx: number): string => {
  if (tIdx === 17) return 'hex-gold'; // Victory Crown
  if ([3, 8].includes(tIdx)) return 'hex-green'; // XP Reward
  if ([6, 12, 16].includes(tIdx)) return 'hex-orange'; // Challenge
  if ([2, 11].includes(tIdx)) return 'hex-red'; // Bug Trap
  if ([4, 9, 15].includes(tIdx)) return 'hex-gold'; // Treasure
  if ([14].includes(tIdx)) return 'hex-purple'; // Boss Battle
  return 'hex-blue'; // Question / START
};

export const getTileSymbol = (tIdx: number): string => {
  if (tIdx === 0) return '🏁';
  if (tIdx === 17) return '👑';
  if ([3, 8].includes(tIdx)) return 'XP';
  if ([6, 12, 16].includes(tIdx)) return '🎯';
  if (tIdx === 11) return '⏳';
  if (tIdx === 2) return '↩️';
  if ([4, 9, 15].includes(tIdx)) return '💰';
  if ([14].includes(tIdx)) return '👾';
  return '❓';
};

export const getArrowColor = (idx: number): string => {
  return '#FFD700'; // Simple high-contrast gold for the few helper direction arrows
};

export const getPCBPath = (coords: { x: number; y: number }[]): string => {
  if (coords.length === 0) return '';
  const isNarrowMobile = typeof window !== 'undefined' && window.innerWidth < 420;
  if (isNarrowMobile) {
    // Straight line segments for crisp zigzag
    return coords.reduce((d, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`), '');
  }

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    if (Math.abs(dx) > 1 && Math.abs(dy) > 1) {
      if (Math.abs(dx) > Math.abs(dy)) {
        const signX = Math.sign(dx);
        const turnX = p0.x + dx - Math.abs(dy) * signX;
        d += ` L ${turnX} ${p0.y} L ${p1.x} ${p1.y}`;
      } else {
        const signY = Math.sign(dy);
        const turnY = p0.y + dy - Math.abs(dx) * signY;
        d += ` L ${p0.x} ${turnY} L ${p1.x} ${p1.y}`;
      }
    } else {
      d += ` L ${p1.x} ${p1.y}`;
    }
  }
  return d;
};

export const getPCBVias = (coords: { x: number; y: number }[]): { x: number; y: number }[] => {
  const isNarrowMobile = typeof window !== 'undefined' && window.innerWidth < 420;
  if (isNarrowMobile) {
    // Return all intermediate nodes as via bends
    return coords.slice(1, -1);
  }

  const vias: { x: number; y: number }[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    if (Math.abs(dx) > 1 && Math.abs(dy) > 1) {
      if (Math.abs(dx) > Math.abs(dy)) {
        const signX = Math.sign(dx);
        const turnX = p0.x + dx - Math.abs(dy) * signX;
        vias.push({ x: turnX, y: p0.y });
      } else {
        const signY = Math.sign(dy);
        const turnY = p0.y + dy - Math.abs(dx) * signY;
        vias.push({ x: p0.x, y: turnY });
      }
    }
  }
  return vias;
};
