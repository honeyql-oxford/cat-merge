const { Board } = require("./Board");

class GameOverChecker {
  isGameOver(board) {
    if (!(board instanceof Board)) {
      throw new TypeError("board must be an instance of Board");
    }

    if (board.getEmptyCells().length > 0) {
      return false;
    }

    return !this.#hasMergeablePair(board);
  }

  #hasMergeablePair(board) {
    const seenLevels = new Set();

    for (let y = 0; y < Board.SIZE; y += 1) {
      for (let x = 0; x < Board.SIZE; x += 1) {
        const level = board.getCell(x, y);

        if (level <= Board.MIN_LEVEL || level >= Board.MAX_LEVEL) {
          continue;
        }

        if (seenLevels.has(level)) {
          return true;
        }

        seenLevels.add(level);
      }
    }

    return false;
  }
}

const gameOverChecker = new GameOverChecker();

module.exports = {
  GameOverChecker,
  gameOverChecker,
};
