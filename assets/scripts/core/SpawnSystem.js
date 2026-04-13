const { Board } = require("./Board");

class SpawnSystem {
  constructor(randomFn = Math.random) {
    if (typeof randomFn !== "function") {
      throw new TypeError("randomFn must be a function");
    }

    this.randomFn = randomFn;
  }

  spawnOne(board) {
    if (!(board instanceof Board)) {
      throw new TypeError("board must be an instance of Board");
    }

    const emptyCells = board.getEmptyCells();

    if (emptyCells.length === 0) {
      return {
        success: false,
        position: null,
        level: null,
      };
    }

    const index = Math.floor(this.randomFn() * emptyCells.length);
    const position = emptyCells[index];
    const level = 1;

    board.setCell(position.x, position.y, level);

    return {
      success: true,
      position,
      level,
    };
  }
}

const spawnSystem = new SpawnSystem();

module.exports = {
  SpawnSystem,
  spawnSystem,
};
