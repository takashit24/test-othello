// Othello / Reversi
// Author: Codex CLI

(function(){
  'use strict';

  const SIZE = 8;
  const EMPTY = 0, BLACK = 1, WHITE = -1;
  const DIRS = [
    [-1,-1],[-1,0],[-1,1],
    [0,-1],        [0,1],
    [1,-1],[1,0],[1,1]
  ];

  // DOM elements
  const boardEl = document.getElementById('board');
  const scoreBlackEl = document.getElementById('score-black');
  const scoreWhiteEl = document.getElementById('score-white');
  const turnEl = document.getElementById('turn-indicator');
  const msgEl = document.getElementById('message');
  const toggleHints = document.getElementById('toggle-hints');
  const resetBtn = document.getElementById('reset-btn');
  const undoBtn = document.getElementById('undo-btn');
  const modeRadios = Array.from(document.querySelectorAll('input[name="mode"]'));

  // State
  let board = createBoard();
  let current = BLACK; // Black starts
  let lastMove = null; // {r,c}
  let showHints = toggleHints.checked;
  let vsCPU = modeRadios.find(r=>r.checked)?.value === 'cpu';
  let history = []; // stack of {board,current,lastMove,vsCPU}
  let busy = false; // prevent spamming clicks during AI

  // Init
  buildBoardDOM();
  newGame();

  // Event wiring
  toggleHints.addEventListener('change', () => { showHints = toggleHints.checked; render(); });
  resetBtn.addEventListener('click', () => newGame());
  undoBtn.addEventListener('click', onUndo);
  modeRadios.forEach(r=>r.addEventListener('change', () => {
    vsCPU = modeRadios.find(x=>x.checked)?.value === 'cpu';
    // Keep current game; if it's CPU's turn now, trigger move
    render();
    maybeCPUMove();
  }));

  function createBoard(){
    return Array.from({length: SIZE}, () => Array(SIZE).fill(EMPTY));
  }

  function cloneBoard(b){
    return b.map(row => row.slice());
  }

  function newGame(){
    board = createBoard();
    const mid = SIZE/2;
    board[mid-1][mid-1] = WHITE;
    board[mid][mid] = WHITE;
    board[mid-1][mid] = BLACK;
    board[mid][mid-1] = BLACK;
    current = BLACK;
    lastMove = null;
    history = [];
    msgEl.textContent = '';
    render();
  }

  function buildBoardDOM(){
    boardEl.innerHTML = '';
    for(let r=0;r<SIZE;r++){
      for(let c=0;c<SIZE;c++){
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.setAttribute('role','gridcell');
        cell.setAttribute('aria-label', `${r+1}行 ${c+1}列`);
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.addEventListener('click', onCellClick);
        boardEl.appendChild(cell);
      }
    }
  }

  function onCellClick(e){
    if(busy) return;
    const r = Number(e.currentTarget.dataset.r);
    const c = Number(e.currentTarget.dataset.c);
    playAt(r,c);
  }

  function pushHistory(){
    history.push({
      board: cloneBoard(board),
      current,
      lastMove: lastMove ? { ...lastMove } : null,
      vsCPU
    });
  }

  function onUndo(){
    if(busy) return;
    if(history.length === 0) return;
    // If vs CPU and last move was CPU's, pop once; otherwise pop twice to go back to player's turn
    const prev = history.pop();
    const wasCPUTurn = prev.current === (BLACK) ? (WHITE === -1 && vsCPU) : (BLACK === 1 && vsCPU); // not reliable
    // Simpler rule: if vsCPU and current side to move would be CPU, pop one more to return to human
    if(vsCPU){
      const sideAfterUndo = prev.current;
      const cpuSide = WHITE; // CPU plays White by default
      if(sideAfterUndo === cpuSide && history.length > 0){
        const prev2 = history.pop();
        restore(prev2);
        return render();
      }
    }
    restore(prev);
    render();
  }

  function restore(s){
    board = cloneBoard(s.board);
    current = s.current;
    lastMove = s.lastMove ? { ...s.lastMove } : null;
  }

  function inBounds(r,c){
    return r>=0 && c>=0 && r<SIZE && c<SIZE;
  }

  function getValidMoves(b, player){
    const moves = new Map(); // key: 'r,c' -> list of flips
    for(let r=0;r<SIZE;r++){
      for(let c=0;c<SIZE;c++){
        if(b[r][c] !== EMPTY) continue;
        const flips = [];
        for(const [dr,dc] of DIRS){
          const line = collectLine(b, r, c, dr, dc, player);
          if(line && line.length) flips.push(...line);
        }
        if(flips.length){
          moves.set(`${r},${c}`, flips);
        }
      }
    }
    return moves;
  }

  function collectLine(b, r, c, dr, dc, player){
    let i = r + dr, j = c + dc;
    const buf = [];
    while(inBounds(i,j) && b[i][j] === -player){
      buf.push([i,j]);
      i+=dr; j+=dc;
    }
    if(buf.length && inBounds(i,j) && b[i][j] === player){
      return buf; // valid capture line
    }
    return null;
  }

  function applyMove(b, r, c, player, flips){
    const nb = cloneBoard(b);
    nb[r][c] = player;
    for(const [i,j] of flips){
      nb[i][j] = player;
    }
    return nb;
  }

  function scoreOf(b){
    let sB = 0, sW = 0;
    for(let r=0;r<SIZE;r++){
      for(let c=0;c<SIZE;c++){
        if(b[r][c] === BLACK) sB++;
        else if(b[r][c] === WHITE) sW++;
      }
    }
    return {black: sB, white: sW};
  }

  function playAt(r,c){
    const moves = getValidMoves(board, current);
    const key = `${r},${c}`;
    if(!moves.has(key)) return; // illegal

    pushHistory();
    const flips = moves.get(key);
    board = applyMove(board, r, c, current, flips);
    lastMove = {r, c};
    current = -current;
    msgEl.textContent = '';
    render(true);

    // Handle pass or end
    const afterMoves = getValidMoves(board, current);
    if(afterMoves.size === 0){
      // pass or end
      const oppMoves = getValidMoves(board, -current);
      if(oppMoves.size === 0){
        endGame();
        return;
      } else {
        msgEl.textContent = current === BLACK ? '黒は打てないためパス' : '白は打てないためパス';
        current = -current; // pass back
        render();
      }
    }

    maybeCPUMove();
  }

  function maybeCPUMove(){
    if(!vsCPU) return;
    const cpuSide = WHITE; // CPU plays White
    if(current !== cpuSide) return;
    const moves = getValidMoves(board, current);
    if(moves.size === 0) return; // nothing to do
    busy = true;
    setTimeout(() => {
      // Greedy + positional weighting
      const best = pickAIMove(board, current, moves);
      if(best){
        const [r,c] = best;
        pushHistory();
        const flips = moves.get(`${r},${c}`);
        board = applyMove(board, r, c, current, flips);
        lastMove = {r,c};
        current = -current;
        msgEl.textContent = '';
        render(true);
        // Handle pass or end for human
        const humanMoves = getValidMoves(board, current);
        if(humanMoves.size === 0){
          const oppMoves = getValidMoves(board, -current);
          if(oppMoves.size === 0){
            endGame();
          } else {
            msgEl.textContent = current === BLACK ? '黒は打てないためパス' : '白は打てないためパス';
            current = -current;
            render();
            // might chain into CPU again if still its turn
            maybeCPUMove();
          }
        }
      }
      busy = false;
    }, 350);
  }

  // Simple positional weights favoring corners and edges
  const WEIGHTS = [
    [120,-20, 20,  5,  5, 20,-20,120],
    [-20,-40, -5, -5, -5, -5,-40,-20],
    [ 20, -5, 15,  3,  3, 15, -5, 20],
    [  5, -5,  3,  3,  3,  3, -5,  5],
    [  5, -5,  3,  3,  3,  3, -5,  5],
    [ 20, -5, 15,  3,  3, 15, -5, 20],
    [-20,-40, -5, -5, -5, -5,-40,-20],
    [120,-20, 20,  5,  5, 20,-20,120]
  ];

  function pickAIMove(b, player, moves){
    let best = null;
    let bestScore = -Infinity;
    for(const [key, flips] of moves.entries()){
      const [r,c] = key.split(',').map(Number);
      const immediate = flips.length * 10 + WEIGHTS[r][c];
      // Also consider next-turn mobility
      const nb = applyMove(b, r, c, player, flips);
      const oppMoves = getValidMoves(nb, -player).size;
      const mobility = -oppMoves * 2;
      const score = immediate + mobility;
      if(score > bestScore){
        bestScore = score;
        best = [r,c];
      }
    }
    return best;
  }

  function endGame(){
    const {black, white} = scoreOf(board);
    let result = '';
    if(black > white) result = `黒の勝ち！ ${black} - ${white}`;
    else if(white > black) result = `白の勝ち！ ${white} - ${black}`;
    else result = `引き分け！ ${black} - ${white}`;
    msgEl.textContent = result + '（新しいゲームで再開）';
  }

  function render(animate=false){
    // Update board
    const cells = Array.from(boardEl.children);
    const valid = getValidMoves(board, current);
    for(const cell of cells){
      const r = Number(cell.dataset.r), c = Number(cell.dataset.c);
      cell.innerHTML = '';
      const v = board[r][c];
      if(v !== EMPTY){
        const piece = document.createElement('div');
        piece.className = 'piece ' + (v === BLACK ? 'black' : 'white') + (animate ? ' enter' : '');
        cell.appendChild(piece);
        // last move marker
        if(lastMove && lastMove.r === r && lastMove.c === c){
          const lm = document.createElement('div');
          lm.className = 'last-move';
          lm.title = '最終手';
          cell.appendChild(lm);
        }
        if(animate){
          requestAnimationFrame(()=> piece.classList.add('show'));
        }
      } else if(showHints && valid.has(`${r},${c}`)){
        const hint = document.createElement('div');
        hint.className = 'hint ' + (current === BLACK ? 'black' : 'white');
        cell.appendChild(hint);
      }
      // Disable if game ended (no moves for both)
      const myMoves = valid.size;
      const oppMoves = getValidMoves(board, -current).size;
      const ended = (myMoves === 0 && oppMoves === 0);
      cell.classList.toggle('disabled', ended || busy);
    }

    // Update score/turn
    const {black, white} = scoreOf(board);
    scoreBlackEl.textContent = String(black);
    scoreWhiteEl.textContent = String(white);
    turnEl.textContent = (current === BLACK ? '● 黒の番' : '○ 白の番');
  }

  // Expose for console debugging (optional)
  window.__othello = { get board(){return board}, get current(){return current}, getValidMoves };
})();

