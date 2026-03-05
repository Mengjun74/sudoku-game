/**
 * Sudoku App - UI & Game Logic
 * Depends on: sudoku.js (SudokuEngine)
 */

const engine = new SudokuEngine();

// ---- Game State ----
let state = {
    puzzle: null,          // original puzzle (0 = empty)
    solution: null,        // complete solution
    board: null,           // current user board
    notes: null,           // notes[row][col] = Set of numbers
    selected: null,        // { row, col }
    notesMode: false,
    difficulty: 'medium',

    timerSeconds: 0,
    timerInterval: null,
    isComplete: false,
    isPaused: false,
};

// ---- DOM Refs ----
const boardEl = document.getElementById('board');
const timerEl = document.getElementById('timer-value');


const victoryOverlay = document.getElementById('victory-overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const toastEl = document.getElementById('toast');
const confettiCanvas = document.getElementById('confetti-canvas');

// ---- Initialization ----
async function init(difficulty = state.difficulty) {
    showLoading(true);
    state.difficulty = difficulty;

    // Small delay so loading screen renders
    await sleep(60);

    const { puzzle, solution } = engine.generatePuzzle(difficulty);
    state.puzzle = puzzle;
    state.solution = solution;
    state.board = engine.copyGrid(puzzle);
    state.notes = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set())
    );
    state.selected = null;
    state.notesMode = false;

    state.isComplete = false;
    state.isPaused = false;

    stopTimer();
    state.timerSeconds = 0;
    updateTimer();
    startTimer();

    renderBoard();
    updateNumPad();

    updateNotesBtn();
    updateDiffTabs();

    victoryOverlay.classList.remove('show');
    showLoading(false);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Board Rendering ----
function renderBoard() {
    boardEl.innerHTML = '';

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.tabIndex = 0;

            const val = state.board[r][c];
            const isGiven = state.puzzle[r][c] !== 0;

            if (isGiven) {
                cell.classList.add('given');
                cell.innerHTML = `<span>${val}</span>`;
            } else if (val !== 0) {
                const span = document.createElement('span');
                span.className = 'user-num';
                span.textContent = val;
                cell.appendChild(span);
            } else {
                // Render notes
                const noteSet = state.notes[r][c];
                if (noteSet.size > 0) {
                    const grid = document.createElement('div');
                    grid.className = 'notes-grid';
                    for (let n = 1; n <= 9; n++) {
                        const s = document.createElement('span');
                        if (noteSet.has(n)) {
                            s.textContent = n;
                            s.className = 'active-note';
                        }
                        grid.appendChild(s);
                    }
                    cell.appendChild(grid);
                }
            }

            cell.addEventListener('click', () => selectCell(r, c));
            cell.addEventListener('keydown', handleKeyDown);
            boardEl.appendChild(cell);
        }
    }

    applyHighlights();
}

// ---- Cell Selection & Highlights ----
function selectCell(row, col) {
    if (state.isComplete) return;
    state.selected = { row, col };
    applyHighlights();
    // Focus the cell for keyboard input
    const cell = getCellEl(row, col);
    if (cell) cell.focus();
}

function applyHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected', 'highlighted', 'same-number');
    });

    if (!state.selected) return;
    const { row, col } = state.selected;
    const selectedVal = state.board[row][col];

    document.querySelectorAll('.cell').forEach(cell => {
        const r = +cell.dataset.row;
        const c = +cell.dataset.col;

        if (r === row && c === col) {
            cell.classList.add('selected');
        } else if (
            r === row || c === col ||
            (Math.floor(r / 3) === Math.floor(row / 3) &&
                Math.floor(c / 3) === Math.floor(col / 3))
        ) {
            cell.classList.add('highlighted');
        }

        // Highlight same number
        if (selectedVal !== 0 && state.board[r][c] === selectedVal) {
            cell.classList.add('same-number');
        }
    });
}

function getCellEl(row, col) {
    return boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

// ---- Input Handling ----
function handleKeyDown(e) {
    if (!state.selected || state.isComplete) return;

    if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        inputNumber(parseInt(e.key));
        return;
    }

    const moves = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
    };

    if (moves[e.key]) {
        e.preventDefault();
        const [dr, dc] = moves[e.key];
        const newRow = Math.max(0, Math.min(8, state.selected.row + dr));
        const newCol = Math.max(0, Math.min(8, state.selected.col + dc));
        selectCell(newRow, newCol);
        return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        eraseCell();
    }

    if (e.key === 'n' || e.key === 'N') {
        toggleNotesMode();
    }
}

function inputNumber(num) {
    if (!state.selected || state.isComplete) return;
    const { row, col } = state.selected;
    if (state.puzzle[row][col] !== 0) return; // given cell

    if (state.notesMode) {
        // Toggle note
        const noteSet = state.notes[row][col];
        if (noteSet.has(num)) noteSet.delete(num);
        else noteSet.add(num);
        // Don't clear number when adding notes
        renderBoard();
        applyHighlights();
        return;
    }

    // Clear notes for this cell
    state.notes[row][col].clear();

    if (state.board[row][col] === num) {
        // Pressing same number again erases
        state.board[row][col] = 0;
        renderBoard();
        applyHighlights();
        updateNumPad();
        updateProgress();
        return;
    }

    const correct = num === state.solution[row][col];
    state.board[row][col] = num;

    if (!correct) {
        // silent — wrong entries shown in blue, no feedback
    } else {
        // Clear notes in same row/col/box for this number
        clearRelatedNotes(row, col, num);
    }

    renderBoard();
    applyHighlights();
    updateNumPad();
    updateProgress();
    checkComplete();
}

function clearRelatedNotes(row, col, num) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 9; i++) {
        state.notes[row][i].delete(num);
        state.notes[i][col].delete(num);
    }
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            state.notes[r][c].delete(num);
        }
    }
}

function eraseCell() {
    if (!state.selected) return;
    const { row, col } = state.selected;
    if (state.puzzle[row][col] !== 0) return;

    state.board[row][col] = 0;
    state.notes[row][col].clear();
    renderBoard();
    applyHighlights();
    updateNumPad();
    updateProgress();
}

function isConflict(row, col, val) {
    if (val === 0) return false;
    // Check row
    for (let c = 0; c < 9; c++) {
        if (c !== col && state.board[row][c] === val) return true;
    }
    // Check col
    for (let r = 0; r < 9; r++) {
        if (r !== row && state.board[r][col] === val) return true;
    }
    // Check box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if ((r !== row || c !== col) && state.board[r][c] === val) return true;
        }
    }
    return false;
}

// ---- UI Updates ----
function updateNumPad() {
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (state.board[r][c]) counts[state.board[r][c]]++;

    document.querySelectorAll('.num-btn').forEach(btn => {
        const n = +btn.dataset.num;
        const rem = 9 - counts[n];
        const badge = btn.querySelector('.rem-badge');
        badge.textContent = rem;
        btn.classList.toggle('remaining-zero', rem === 0);
    });
}





function updateTimer() {
    const m = Math.floor(state.timerSeconds / 60).toString().padStart(2, '0');
    const s = (state.timerSeconds % 60).toString().padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
}

function startTimer() {
    stopTimer();
    state.timerInterval = setInterval(() => {
        if (!state.isPaused && !state.isComplete) {
            state.timerSeconds++;
            updateTimer();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateNotesBtn() {
    const btn = document.getElementById('notes-btn');
    btn.classList.toggle('active', state.notesMode);
    btn.querySelector('.label').textContent = state.notesMode ? 'Notes ON' : 'Notes';
}

function updateDiffTabs() {
    document.querySelectorAll('.diff-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.diff === state.difficulty);
    });
}

// ---- Feature: Hint ----
function giveHint() {
    if (state.isComplete) return;
    // Find an unfilled correct cell
    const empties = [];
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (state.board[r][c] === 0) empties.push([r, c]);

    if (empties.length === 0) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    state.board[r][c] = state.solution[r][c];
    state.notes[r][c].clear();
    clearRelatedNotes(r, c, state.solution[r][c]);

    selectCell(r, c);
    renderBoard();
    applyHighlights();
    updateNumPad();
    updateProgress();
    checkComplete();
    showToast('💡 Hint placed!');
}



// ---- Completion Check ----
function checkComplete() {
    if (engine.isBoardComplete(state.board, state.solution)) {
        state.isComplete = true;
        stopTimer();

        // Flash all cells
        document.querySelectorAll('.cell').forEach((cell, i) => {
            setTimeout(() => cell.classList.add('completed-flash'), i * 8);
        });

        setTimeout(() => showVictory(), 900);
    }
}

// ---- Victory Screen ----
function showVictory() {
    const m = Math.floor(state.timerSeconds / 60).toString().padStart(2, '0');
    const s = (state.timerSeconds % 60).toString().padStart(2, '0');
    document.getElementById('v-time').textContent = `${m}:${s}`;

    document.getElementById('v-difficulty').textContent =
        state.difficulty.charAt(0).toUpperCase() + state.difficulty.slice(1);

    victoryOverlay.classList.add('show');
    startConfetti();
}

// ---- Confetti ----
function startConfetti() {
    const canvas = confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: -10,
        r: Math.random() * 8 + 4,
        color: ['#58a6ff', '#a371f7', '#3fb950', '#f85149', '#d29922'][Math.floor(Math.random() * 5)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 8,
        opacity: 1,
    }));

    let frame;
    const loop = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
            if (p.y > canvas.height + 20) return;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.angle += p.spin;
            p.opacity = Math.max(0, 1 - (p.y / canvas.height) * 0.6);

            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate((p.angle * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.5);
            ctx.restore();
        });
        if (alive) frame = requestAnimationFrame(loop);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    if (frame) cancelAnimationFrame(frame);
    loop();
}

// ---- Toast ----
let toastTimeout;
function showToast(msg, type = 'info') {
    toastEl.textContent = msg;
    toastEl.style.borderColor = type === 'error' ? 'var(--error)' : 'var(--cell-box-border)';
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ---- Loading ----
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('fade-out');
        loadingOverlay.style.display = 'flex';
    } else {
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => { loadingOverlay.style.display = 'none'; }, 500);
    }
}

// ---- Pause / Resume ----
function togglePause() {
    state.isPaused = !state.isPaused;
    const btn = document.getElementById('pause-btn');
    btn.querySelector('.label').textContent = state.isPaused ? 'Resume' : 'Pause';
    btn.querySelector('.icon').textContent = state.isPaused ? '▶' : '⏸';
    btn.classList.toggle('active', state.isPaused);

    // Blur board when paused
    boardEl.style.filter = state.isPaused ? 'blur(8px)' : '';
    boardEl.style.pointerEvents = state.isPaused ? 'none' : '';
}

// ---- Notes Mode ----
function toggleNotesMode() {
    state.notesMode = !state.notesMode;
    updateNotesBtn();
}

// ---- Wire Up Events ----
document.querySelectorAll('.diff-tab').forEach(tab => {
    tab.addEventListener('click', () => init(tab.dataset.diff));
});

document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => inputNumber(+btn.dataset.num));
});

document.querySelector('.erase-btn').addEventListener('click', eraseCell);
document.getElementById('notes-btn').addEventListener('click', toggleNotesMode);
document.getElementById('hint-btn').addEventListener('click', giveHint);

document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('new-game-btn').addEventListener('click', () => init());
document.getElementById('restart-btn').addEventListener('click', () => {
    state.board = engine.copyGrid(state.puzzle);
    state.notes = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set())
    );

    state.timerSeconds = 0;
    state.isComplete = false;
    state.isPaused = false;
    boardEl.style.filter = '';
    boardEl.style.pointerEvents = '';
    stopTimer();
    startTimer();
    renderBoard();
    updateNumPad();
    updateProgress();

    updateNotesBtn();
    victoryOverlay.classList.remove('show');
});

document.getElementById('victory-new-btn').addEventListener('click', () => {
    victoryOverlay.classList.remove('show');
    init();
});

document.getElementById('victory-close-btn').addEventListener('click', () => {
    victoryOverlay.classList.remove('show');
});

// Click outside board to deselect
document.addEventListener('click', (e) => {
    if (!e.target.closest('#board') && !e.target.closest('.numpad') && !e.target.closest('.side-panel')) {
        state.selected = null;
        applyHighlights();
    }
});

// Keyboard fallback (when no cell focused)
document.addEventListener('keydown', (e) => {
    if (!state.selected) return;
    if (e.target.classList.contains('cell')) return; // already handled
    handleKeyDown(e);
});

window.addEventListener('resize', () => {
    if (state.isComplete) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
});

// ---- Start ----
init('medium');
