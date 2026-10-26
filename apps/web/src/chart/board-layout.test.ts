import { describe, expect, it } from 'vitest';
import { BOARD_POSITION, listOrder } from './board-layout';

describe('board layout', () => {
  it('puts the 12 palaces on the ring of the 4 × 4 board, leaving the centre free', () => {
    const cells = BOARD_POSITION.map(([row, column]) => `${row},${column}`);
    expect(new Set(cells).size).toBe(12);
    for (const [row, column] of BOARD_POSITION) expect(row === 0 || row === 3 || column === 0 || column === 3).toBe(true);
    // Tý bottom (third column), Ngọ top (second column), Dần bottom-left, Thân top-right.
    expect(BOARD_POSITION[0]).toEqual([3, 2]);
    expect(BOARD_POSITION[6]).toEqual([0, 1]);
    expect(BOARD_POSITION[2]).toEqual([3, 0]);
    expect(BOARD_POSITION[8]).toEqual([0, 3]);
  });

  it('lists palaces from Mệnh, then backwards through the branches', () => {
    const palaces = Array.from({ length: 12 }, (_, branchIndex) => ({ branchIndex, isSoulPalace: branchIndex === 6 }));
    expect(listOrder(palaces).map((p) => p.branchIndex)).toEqual([6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7]);
  });
});
