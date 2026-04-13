class Board {
  static SIZE = 4;

  static MIN_LEVEL = 0;

  static MAX_LEVEL = 6;

  constructor() {
    this.initBoard();
  }

  initBoard() {
    this.grid = Array.from({ length: Board.SIZE }, () =>
      Array(Board.SIZE).fill(0)
    );
    return this.grid;
  }

  getCell(x, y) {
    this.#assertCoordinate(x, y);
    return this.grid[y][x];
  }

  setCell(x, y, level) {
    this.#assertCoordinate(x, y);
    this.#assertLevel(level);
    this.grid[y][x] = level;
  }

  getEmptyCells() {
    const emptyCells = [];

    for (let y = 0; y < Board.SIZE; y += 1) {
      for (let x = 0; x < Board.SIZE; x += 1) {
        if (this.grid[y][x] === 0) {
          emptyCells.push({ x, y });
        }
      }
    }

    return emptyCells;
  }

  move(fromX, fromY, toX, toY) {
    if (!this.#isValidCoordinate(fromX, fromY) || !this.#isValidCoordinate(toX, toY)) {
      return { success: false, merged: false, newLevel: 0 };
    }

    if (fromX === toX && fromY === toY) {
      return { success: false, merged: false, newLevel: 0 };
    }

    const fromLevel = this.grid[fromY][fromX];
    const toLevel = this.grid[toY][toX];

    if (fromLevel === 0) {
      return { success: false, merged: false, newLevel: 0 };
    }

    if (toLevel === 0) {
      this.grid[toY][toX] = fromLevel;
      this.grid[fromY][fromX] = 0;
      return { success: true, merged: false, newLevel: 0 };
    }

    if (fromLevel !== toLevel) {
      return { success: false, merged: false, newLevel: 0 };
    }

    if (fromLevel >= Board.MAX_LEVEL) {
      return { success: false, merged: false, newLevel: 0 };
    }

    const newLevel = fromLevel + 1;
    this.grid[toY][toX] = newLevel;
    this.grid[fromY][fromX] = 0;

    return { success: true, merged: true, newLevel };
  }

  #assertCoordinate(x, y) {
    if (!this.#isValidCoordinate(x, y)) {
      throw new RangeError(`Invalid coordinate: (${x}, ${y})`);
    }
  }

  #assertLevel(level) {
    if (
      !Number.isInteger(level) ||
      level < Board.MIN_LEVEL ||
      level > Board.MAX_LEVEL
    ) {
      throw new RangeError(`Invalid level: ${level}`);
    }
  }

  #isValidCoordinate(x, y) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < Board.SIZE &&
      y >= 0 &&
      y < Board.SIZE
    );
  }
}

module.exports = { Board };
