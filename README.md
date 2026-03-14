# 数独 · Sudoku

A sleek, fully featured Sudoku game built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies.

![Preview](https://img.shields.io/badge/status-playable-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **4 Difficulty Levels** | Easy, Medium, Hard, Expert |
| ✏️ **Notes Mode** | Toggle pencil-mark mode to jot candidate numbers in any cell |
| 💡 **Hint** | Reveals a random correct cell when you're stuck |
| ⏸ **Pause / Resume** | Blurs the board and freezes the timer |
| ↺ **Restart** | Resets the current puzzle to its original state |
| 🎲 **New Game** | Generates a fresh puzzle at the current difficulty |
| ⏱ **Live Timer** | Tracks elapsed time per puzzle |
| 📊 **Progress Bar** | Shows percentage of correctly filled cells |
| 🔢 **Remaining Counter** | Each number button shows how many placements are left |
| 🏆 **Victory Screen** | Confetti + summary card when you finish |

| 🖊️ **Conflict Highlighting** | Wrong entries shown in red immediately |

---

## 🕹️ Controls

### Mouse / Touch
- **Click a cell** to select it
- **Click a number** in the numpad to place it
- **Click ⌫ Erase** to clear the selected cell

### Keyboard
| Key | Action |
|---|---|
| `1` – `9` | Place / toggle number |
| `0`, `Backspace`, `Delete` | Erase cell |
| `Arrow keys` / `W A S D` | Navigate cells |
| `N` | Toggle Notes mode |

---

## 🗂️ Project Structure

```
sudoku-game/
├── index.html   # Layout and markup
├── style.css    # Premium dark UI (CSS variables, animations)
├── app.js       # Game state, rendering, and event handling
└── sudoku.js    # Puzzle generator and solver engine (SudokuEngine)
```

---

## 🚀 Running Locally

No build step needed — open `index.html` directly in any modern browser:

```bash
# Option A: just open the file
start index.html

# Option B: serve with a local dev server (e.g. VS Code Live Server, npx serve, etc.)
npx serve .
```

## 📱 微信小程序版本

- 代码路径：`miniprogram/`，项目配置：`project.config.json`
- 在微信开发者工具中选择“导入项目”，指向本仓库根目录即可预览运行
- 入口页面：`pages/index/index`（复用原 SudokuEngine，支持难度切换、计时、草稿、提示、暂停、重置/新局与胜利弹层）

---

## 🧠 How It Works

- **`SudokuEngine`** (`sudoku.js`) generates a complete valid grid via backtracking, then removes cells according to difficulty to create the puzzle.
- **`app.js`** manages all game state (board, notes, timer) and re-renders the board on every user action.
- Highlights propagate automatically: selecting a cell highlights its **row**, **column**, and **3×3 box**, plus all cells containing the **same number**.
- Notes are automatically cleared from related cells when you correctly place a number.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
