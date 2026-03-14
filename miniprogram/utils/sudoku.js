/**
 * Sudoku Core Logic for WeChat Mini Program
 */
class SudokuEngine {
  constructor() {
    this.SIZE = 9;
    this.BOX = 3;
  }

  emptyGrid() {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  }

  copyGrid(grid) {
    return grid.map(row => [...row]);
  }

  isValid(grid, row, col, num) {
    if (grid[row].includes(num)) return false;
    for (let r = 0; r < 9; r++) {
      if (grid[r][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (grid[r][c] === num) return false;
      }
    }
    return true;
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  fillGrid(grid) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (this.isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (this.fillGrid(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  countSolutions(grid, limit = 2) {
    let count = 0;
    const solve = (g) => {
      if (count >= limit) return;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (g[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (this.isValid(g, row, col, num)) {
                g[row][col] = num;
                solve(g);
                g[row][col] = 0;
              }
            }
            return;
          }
        }
      }
      count++;
    };
    solve(this.copyGrid(grid));
    return count;
  }

  generatePuzzle(difficulty = 'medium') {
    const cluesMap = {
      easy: 36,
      medium: 28,
      hard: 22,
      expert: 17,
    };
    const targetClues = cluesMap[difficulty] || 28;

    const solution = this.emptyGrid();
    this.fillGrid(solution);

    const puzzle = this.copyGrid(solution);
    const cells = this.shuffle(
      Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
    );

    let removed = 0;
    const totalToRemove = 81 - targetClues;

    for (const [r, c] of cells) {
      if (removed >= totalToRemove) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      if (difficulty !== 'expert' && this.countSolutions(puzzle) !== 1) {
        puzzle[r][c] = backup;
      } else {
        removed++;
      }
    }

    return { puzzle, solution };
  }

  solve(grid) {
    const g = this.copyGrid(grid);
    const doSolve = (gridToSolve) => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (gridToSolve[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (this.isValid(gridToSolve, row, col, num)) {
                gridToSolve[row][col] = num;
                if (doSolve(gridToSolve)) return true;
                gridToSolve[row][col] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };
    return doSolve(g) ? g : null;
  }

  isBoardComplete(grid, solution) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  isConflict(grid, row, col, num) {
    const original = grid[row][col];
    grid[row][col] = 0;
    const result = !this.isValid(grid, row, col, num);
    grid[row][col] = original;
    return result;
  }
}

module.exports = { SudokuEngine };
