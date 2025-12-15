import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext'; // Importar ThemeContext
import styles from './MinesweeperGame.module.css'; // Importar CSS Modules

const COINS = ['ETH', 'LTC', 'DOGE', 'ADA']; // Criptomonedas seguras
const MINE_COIN = 'BTC'; // Criptomoneda que representa una mina

const MinesweeperGame = () => {
  console.log("MinesweeperGame se está renderizando"); // Debugging
  const { darkMode } = useContext(ThemeContext);
  const [board, setBoard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [minesCount, setMinesCount] = useState(15);
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [revealedCells, setRevealedCells] = useState(0);

  useEffect(() => {
    initializeGame();
  }, [rows, cols, minesCount]);

  const initializeGame = () => {
    const newBoard = Array(rows).fill(0).map(() => Array(cols).fill({
      value: '', // 'BTC' para mina, 'ETH', 'LTC', etc. para seguras o un número para adyacentes
      isRevealed: false,
      isFlagged: false,
    }));

    // Colocar minas (BTC)
    let minesPlaced = 0;
    while (minesPlaced < minesCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (newBoard[r][c].value !== MINE_COIN) {
        newBoard[r][c].value = MINE_COIN;
        minesPlaced++;
      }
    }

    // Calcular valores de celdas adyacentes
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c].value === MINE_COIN) continue;

        let adjacentMines = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].value === MINE_COIN) {
              adjacentMines++;
            }
          }
        }
        newBoard[r][c].value = adjacentMines === 0 ? COINS[Math.floor(Math.random() * COINS.length)] : adjacentMines.toString();
      }
    }

    setBoard(newBoard);
    setGameOver(false);
    setWin(false);
    setRevealedCells(0);
  };

  const revealCell = (r, c) => {
    if (gameOver || win || board[r][c].isRevealed || board[r][c].isFlagged) return;

    const newBoard = JSON.parse(JSON.stringify(board)); // Deep copy
    let newRevealedCells = revealedCells;

    const currentCell = newBoard[r][c];

    if (currentCell.value === MINE_COIN) {
      currentCell.isRevealed = true;
      setBoard(newBoard);
      setGameOver(true);
      return;
    }

    const queue = [{ r, c }];
    while (queue.length > 0) {
      const { r: currR, c: currC } = queue.shift();

      if (currR < 0 || currR >= rows || currC < 0 || currC >= cols || newBoard[currR][currC].isRevealed || newBoard[currR][currC].isFlagged) {
        continue;
      }

      newBoard[currR][currC].isRevealed = true;
      newRevealedCells++;

      if (newBoard[currR][currC].value.match(/^\d+$/)) { // Si es un número (minas adyacentes)
        continue; // No expandir si hay minas adyacentes
      }

      // Expandir a celdas adyacentes si es una celda vacía (sin minas adyacentes)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          queue.push({ r: currR + dr, c: currC + dc });
        }
      }
    }

    setBoard(newBoard);
    setRevealedCells(newRevealedCells);

    // Comprobar victoria
    if (newRevealedCells === (rows * cols) - minesCount) {
      setWin(true);
      setGameOver(true);
    }
  };

  const handleCellClick = (r, c) => {
    if (!gameOver && !win) {
      revealCell(r, c);
    }
  };

  const handleRightClick = (e, r, c) => {
    e.preventDefault();
    if (gameOver || win || board[r][c].isRevealed) return;

    const newBoard = JSON.parse(JSON.stringify(board));
    newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
    setBoard(newBoard);
  };

  const renderCellContent = (cell) => {
    if (cell.isFlagged) {
      return '🚩'; // Bandera
    }
    if (!cell.isRevealed) {
      return '';
    }

    if (cell.value === MINE_COIN) {
      return '💣'; // Bomba (BTC)
    }

    if (cell.value.match(/^\d+$/)) { // Si es un número
      const numMines = parseInt(cell.value);
      // Podríamos asignar un color o estilo diferente según el número
      return numMines > 0 ? numMines : ''; // Mostrar número si es > 0, o vacío
    }

    // Es una criptomoneda segura
    return cell.value;
  };

  return (
    <div className={`${styles.minesweeperContainer} ${darkMode ? styles.dark : styles.light}`}>
      <h1 className={styles.gameTitle}>Buscaminas Crypto</h1>
      <p className={styles.gameDescription}>
        ¡Encuentra las criptomonedas seguras y evita el {MINE_COIN}!
        Haz clic izquierdo para revelar, clic derecho para marcar con una bandera.
      </p>

      {gameOver && (
        <div className={styles.gameStateMessage}>
          {win ? (
            <span className={styles.winMessage}>¡Ganaste! 🎉 Todas las criptos a salvo.</span>
          ) : (
            <span className={styles.loseMessage}>¡Perdiste! 💥 Encontraste una BTC (mina).</span>
          )}
          <button onClick={initializeGame} className={styles.resetButton}>Jugar de Nuevo</button>
        </div>
      )}

      <div className={styles.board}>
        {board.map((row, rIdx) => (
          <div key={rIdx} className={styles.row}>
            {row.map((cell, cIdx) => (
              <div
                key={cIdx}
                className={`${styles.cell} ${cell.isRevealed ? styles.revealed : ''} ${cell.isFlagged ? styles.flagged : ''} ${gameOver && cell.value === MINE_COIN && !cell.isFlagged ? styles.mine : ''}`}
                onClick={() => handleCellClick(rIdx, cIdx)}
                onContextMenu={(e) => handleRightClick(e, rIdx, cIdx)}
              >
                {renderCellContent(cell)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MinesweeperGame;
