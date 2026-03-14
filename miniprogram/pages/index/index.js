const { SudokuEngine } = require('../../utils/sudoku');

Page({
  data: {
    difficulty: 'medium',
    puzzle: [],
    board: [],
    solution: [],
    notes: [],
    selected: null,
    notesMode: false,
    isComplete: false,
    isPaused: false,
    timerSeconds: 0,
    timerDisplay: '00:00',
    boardFlat: [],
    numPad: [],
    progress: 0,
    loading: false,
    showVictory: false,
    victoryTime: '00:00',
    victoryDifficulty: 'Medium'
  },

  onLoad() {
    this.engine = new SudokuEngine();
    this.init('medium');
  },

  onUnload() {
    this.clearTimer();
  },

  init(difficulty) {
    this.setData({ loading: true });

    const { puzzle, solution } = this.engine.generatePuzzle(difficulty);
    const board = this.engine.copyGrid(puzzle);
    const notes = this.createEmptyNotes();

    this.setData({
      difficulty,
      puzzle,
      board,
      solution,
      notes,
      selected: null,
      notesMode: false,
      isComplete: false,
      isPaused: false,
      timerSeconds: 0,
      timerDisplay: '00:00',
      showVictory: false,
      loading: true
    }, () => {
      this.refreshBoardView();
      this.updateRemainingCounts();
      this.updateProgress();
    });

    this.clearTimer();
    this.startTimer();

    setTimeout(() => this.setData({ loading: false }), 80);
  },

  createEmptyNotes() {
    return Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => [])
    );
  },

  startTimer() {
    this.clearTimer();
    this.timer = setInterval(() => {
      if (!this.data.isPaused && !this.data.isComplete) {
        const next = this.data.timerSeconds + 1;
        this.setData({ timerSeconds: next, timerDisplay: this.formatTime(next) });
      }
    }, 1000);
  },

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  },

  refreshBoardView() {
    const { board, puzzle, selected, notes } = this.data;
    const flat = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        const given = puzzle[r][c] !== 0;
        const isSelected = selected && selected.row === r && selected.col === c;
        const highlighted = selected && !isSelected && (
          selected.row === r ||
          selected.col === c ||
          (Math.floor(selected.row / 3) === Math.floor(r / 3) &&
            Math.floor(selected.col / 3) === Math.floor(c / 3))
        );
        const sameNumber = selected && board[selected.row][selected.col] !== 0 && val === board[selected.row][selected.col];
        const conflict = val !== 0 && this.engine.isConflict(board, r, c, val);
        const boxBorderRight = (c + 1) % 3 === 0 && c !== 8;
        const boxBorderBottom = (r + 1) % 3 === 0 && r !== 8;
        const notesGrid = Array.from({ length: 9 }, (_, i) =>
          notes[r][c].includes(i + 1) ? i + 1 : ''
        );

        flat.push({
          row: r,
          col: c,
          val,
          given,
          isSelected,
          highlighted,
          sameNumber,
          conflict,
          hasNotes: notes[r][c].length > 0 && val === 0,
          notesGrid,
          boxBorderRight,
          boxBorderBottom
        });
      }
    }

    this.setData({ boardFlat: flat });
  },

  updateRemainingCounts() {
    const counts = Array(10).fill(0);
    this.data.board.forEach(row => row.forEach(v => { if (v) counts[v]++; }));
    const numPad = Array.from({ length: 9 }, (_, i) => ({
      num: i + 1,
      remaining: 9 - counts[i + 1]
    }));
    this.setData({ numPad });
  },

  updateProgress() {
    const { board, solution } = this.data;
    let correct = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0 && board[r][c] === solution[r][c]) correct++;
      }
    }
    const progress = Math.round((correct / 81) * 100);
    this.setData({ progress });
  },

  handleCellTap(e) {
    if (this.data.isPaused || this.data.isComplete) return;
    const row = Number(e.currentTarget.dataset.row);
    const col = Number(e.currentTarget.dataset.col);
    this.setData({ selected: { row, col } }, () => this.refreshBoardView());
  },

  handleNumTap(e) {
    const num = Number(e.currentTarget.dataset.num);
    this.inputNumber(num);
  },

  inputNumber(num) {
    const { selected, puzzle, notesMode, isComplete, isPaused } = this.data;
    if (!selected || isComplete || isPaused) return;
    const { row, col } = selected;
    if (puzzle[row][col] !== 0) return;

    const board = this.data.board.map(r => [...r]);
    const notes = this.data.notes.map(r => r.map(cell => [...cell]));

    if (notesMode) {
      const set = new Set(notes[row][col]);
      if (set.has(num)) set.delete(num); else set.add(num);
      notes[row][col] = Array.from(set).sort();
      this.setData({ notes }, () => this.refreshBoardView());
      return;
    }

    notes[row][col] = [];

    if (board[row][col] === num) {
      board[row][col] = 0;
      this.setData({ board, notes }, () => {
        this.refreshBoardView();
        this.updateRemainingCounts();
        this.updateProgress();
      });
      return;
    }

    const correct = num === this.data.solution[row][col];
    board[row][col] = num;

    if (correct) {
      this.clearRelatedNotes(notes, row, col, num);
    }

    this.setData({ board, notes }, () => {
      this.refreshBoardView();
      this.updateRemainingCounts();
      this.updateProgress();
      this.checkComplete();
    });
  },

  clearRelatedNotes(notes, row, col, num) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 9; i++) {
      notes[row][i] = notes[row][i].filter(n => n !== num);
      notes[i][col] = notes[i][col].filter(n => n !== num);
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        notes[r][c] = notes[r][c].filter(n => n !== num);
      }
    }
  },

  handleErase() {
    const { selected, puzzle, isComplete, isPaused } = this.data;
    if (!selected || isComplete || isPaused) return;
    const { row, col } = selected;
    if (puzzle[row][col] !== 0) return;

    const board = this.data.board.map(r => [...r]);
    const notes = this.data.notes.map(r => r.map(cell => [...cell]));
    board[row][col] = 0;
    notes[row][col] = [];

    this.setData({ board, notes }, () => {
      this.refreshBoardView();
      this.updateRemainingCounts();
      this.updateProgress();
    });
  },

  toggleNotesMode() {
    this.setData({ notesMode: !this.data.notesMode });
  },

  handleHint() {
    if (this.data.isComplete || this.data.isPaused) return;
    const empties = [];
    const { board } = this.data;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) empties.push([r, c]);
      }
    }
    if (!empties.length) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];

    const newBoard = board.map(row => [...row]);
    const notes = this.data.notes.map(row => row.map(cell => [...cell]));
    newBoard[r][c] = this.data.solution[r][c];
    this.clearRelatedNotes(notes, r, c, newBoard[r][c]);

    this.setData({ board: newBoard, notes, selected: { row: r, col: c } }, () => {
      this.refreshBoardView();
      this.updateRemainingCounts();
      this.updateProgress();
      this.checkComplete();
    });
    wx.showToast({ title: '已填入提示', icon: 'none' });
  },

  handlePause() {
    const isPaused = !this.data.isPaused;
    this.setData({ isPaused });
  },

  handleNewGame() {
    this.init(this.data.difficulty);
  },

  handleRestart() {
    const board = this.engine.copyGrid(this.data.puzzle);
    const notes = this.createEmptyNotes();
    this.setData({
      board,
      notes,
      selected: null,
      isComplete: false,
      isPaused: false,
      timerSeconds: 0,
      timerDisplay: '00:00',
      showVictory: false
    }, () => {
      this.refreshBoardView();
      this.updateRemainingCounts();
      this.updateProgress();
    });
    this.clearTimer();
    this.startTimer();
  },

  handleDiffTap(e) {
    const diff = e.currentTarget.dataset.diff;
    if (diff === this.data.difficulty) return;
    this.init(diff);
  },

  handleVictoryNew() {
    this.init(this.data.difficulty);
  },

  handleVictoryClose() {
    this.setData({ showVictory: false });
  },

  checkComplete() {
    if (this.engine.isBoardComplete(this.data.board, this.data.solution)) {
      this.setData({
        isComplete: true,
        showVictory: true,
        victoryTime: this.data.timerDisplay,
        victoryDifficulty: this.data.difficulty.charAt(0).toUpperCase() + this.data.difficulty.slice(1)
      });
      this.clearTimer();
    }
  }
});
