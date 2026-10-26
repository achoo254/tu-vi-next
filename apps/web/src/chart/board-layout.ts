/**
 * Where each palace sits on the traditional 4 × 4 board: Tỵ Ngọ Mùi Thân along the top, Dần Sửu Tý Hợi
 * along the bottom, the centre 2 × 2 for the chart's details. Shared by the screen and the PNG export.
 */

/** [row, column], 0-based, by branch index (0 = Tý … 11 = Hợi). */
export const BOARD_POSITION: ReadonlyArray<readonly [number, number]> = [
  [3, 2], // Tý
  [3, 1], // Sửu
  [3, 0], // Dần
  [2, 0], // Mão
  [1, 0], // Thìn
  [0, 0], // Tỵ
  [0, 1], // Ngọ
  [0, 2], // Mùi
  [0, 3], // Thân
  [1, 3], // Dậu
  [2, 3], // Tuất
  [3, 3], // Hợi
];

export function boardPosition(branchIndex: number): readonly [number, number] {
  const position = BOARD_POSITION[branchIndex];
  if (!position) throw new RangeError(`no board position for branch ${branchIndex}`);
  return position;
}

/**
 * Palaces in reading order for the narrow-screen list: Mệnh first, then the palace sequence (Huynh Đệ,
 * Phu Thê…), which runs backwards through the branches.
 */
export function listOrder<T extends { branchIndex: number; isSoulPalace: boolean }>(palaces: readonly T[]): T[] {
  const soul = palaces.find((p) => p.isSoulPalace)?.branchIndex ?? 0;
  return [...palaces].sort((a, b) => ((soul - a.branchIndex + 12) % 12) - ((soul - b.branchIndex + 12) % 12));
}
