const BOARD_ROWS = 8;
const BOARD_COLS = 6;
const MAX_LEVEL = 10;

let boardState = Array(BOARD_ROWS * BOARD_COLS).fill(null);
let score = 0;
let draggedIndex = null;

// 모바일 터치 드래그용 상태 변수
let touchDragIndex = null;
let activeDragImage = null;

const themeConfig = {
    flower: { bg: 'images/bg_flower.png' },
    ocean: { bg: 'images/bg_ocean.png' },
    space: { bg: 'images/bg_space.png' }
};

const sounds = {
    pop: new Audio('sounds/pop.mp3'),
    merge: new Audio('sounds/merge.mp3'),
    clear_flower: new Audio('sounds/clear_flower.mp3'),
    clear_ocean: new Audio('sounds/clear_ocean.mp3'),
    clear_space: new Audio('sounds/clear_space.mp3')
};

function playSound(soundKey) {
    if (sounds[soundKey]) {
        sounds[soundKey].currentTime = 0;
        sounds[soundKey].play().catch(e => console.log("Audio play error:", e));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initBoard();
    loadGameState();
    document.getElementById('reset-btn').addEventListener('click', resetBoard);
});

function initBoard() {
    const board = document.getElementById('merge-board');
    board.innerHTML = '';
    
    for (let i = 0; i < BOARD_ROWS * BOARD_COLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        
        // PC 마우스 드래그 이벤트
        cell.addEventListener('dragover', (e) => e.preventDefault());
        cell.addEventListener('drop', (e) => handleDrop(e, i));
        
        board.appendChild(cell);
    }
}

function saveGameState() {
    const gameState = { boardState: boardState, score: score };
    localStorage.setItem('keep_merging_save', JSON.stringify(gameState));
}

function loadGameState() {
    const savedData = localStorage.getItem('keep_merging_save');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            boardState = parsedData.boardState || Array(BOARD_ROWS * BOARD_COLS).fill(null);
            score = parsedData.score || 0;
            document.getElementById('score-value').innerText = score;
        } catch (e) {
            console.error("데이터 로드 실패:", e);
        }
    }
    renderBoard();
}

function spawnItem(category) {
    const SPAWN_COUNT = 5;
    let spawnedAny = false;
    const maxSpawnLevel = score >= 10000 ? 5 : 3;

    for (let i = 0; i < SPAWN_COUNT; i++) {
        const emptyIndices = boardState
            .map((val, idx) => val === null ? idx : null)
            .filter(val => val !== null);

        if (emptyIndices.length === 0) {
            if (!spawnedAny) alert("머지판이 꽉 찼습니다!");
            break;
        }

        const targetIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const randomLevel = Math.floor(Math.random() * maxSpawnLevel) + 1;

        boardState[targetIndex] = { category: category, level: randomLevel };
        spawnedAny = true;
    }

    if (spawnedAny) {
        playSound('pop');
        renderBoard();
        saveGameState();
    }
}

function spawnRandom() {
    const SPAWN_COUNT = 5;
    const categories = ['flower', 'ocean', 'space'];
    let spawnedAny = false;
    const maxSpawnLevel = score >= 10000 ? 5 : 3;

    for (let i = 0; i < SPAWN_COUNT; i++) {
        const emptyIndices = boardState
            .map((val, idx) => val === null ? idx : null)
            .filter(val => val !== null);

        if (emptyIndices.length === 0) {
            if (!spawnedAny) alert("머지판이 꽉 찼습니다!");
            break;
        }

        const targetIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomLevel = Math.floor(Math.random() * maxSpawnLevel) + 1;

        boardState[targetIndex] = { category: randomCategory, level: randomLevel };
        spawnedAny = true;
    }

    if (spawnedAny) {
        playSound('pop');
        renderBoard();
        saveGameState();
    }
}

function renderBoard() {
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach((cell, index) => {
        cell.innerHTML = '';
        const itemData = boardState[index];
        
        if (itemData) {
            const img = document.createElement('img');
            img.src = `images/${itemData.category}_${itemData.level}.png`;
            img.onerror = function() {
                this.src = `https://via.placeholder.com/60?text=${itemData.category}+${itemData.level}`;
            };
            img.className = 'item';
            img.draggable = true;
            
            // PC 드래그 시작
            img.addEventListener('dragstart', () => { draggedIndex = index; });

            // 📱 모바일 터치 이벤트 핸들러 등록
            img.addEventListener('touchstart', (e) => handleTouchStart(e, index), { passive: false });
            img.addEventListener('touchmove', handleTouchMove, { passive: false });
            img.addEventListener('touchend', handleTouchEnd, { passive: false });

            cell.appendChild(img);

            // 레벨 배지
            const badge = document.createElement('span');
            badge.className = 'level-badge';
            badge.innerText = itemData.level;
            cell.appendChild(badge);
        }
    });
}

/* 📱 모바일 터치 처리 함수 모음 */
function handleTouchStart(e, index) {
    e.preventDefault();
    touchDragIndex = index;
    const touch = e.touches[0];
    const targetImg = e.target;

    // 모바일 터치 중 따라다닐 잔상(임시 이미지) 생성
    activeDragImage = targetImg.cloneNode(true);
    activeDragImage.style.position = 'fixed';
    activeDragImage.style.pointerEvents = 'none';
    activeDragImage.style.zIndex = '1000';
    activeDragImage.style.width = targetImg.offsetWidth + 'px';
    activeDragImage.style.height = targetImg.offsetHeight + 'px';
    activeDragImage.style.opacity = '0.8';
    
    updateTouchImagePosition(touch);
    document.body.appendChild(activeDragImage);
}

function handleTouchMove(e) {
    if (!activeDragImage) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateTouchImagePosition(touch);
}

function handleTouchEnd(e) {
    if (touchDragIndex === null) return;
    e.preventDefault();

    const touch = e.changedTouches[0];
    if (activeDragImage) {
        activeDragImage.remove();
        activeDragImage = null;
    }

    // 손가락이 떼어진 위치의 셀 요소 탐색
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    const cell = dropTarget ? dropTarget.closest('.cell') : null;

    if (cell) {
        const targetIndex = parseInt(cell.dataset.index, 10);
        executeMergeOrMove(touchDragIndex, targetIndex);
    }

    touchDragIndex = null;
}

function updateTouchImagePosition(touch) {
    if (activeDragImage) {
        activeDragImage.style.left = (touch.clientX - activeDragImage.offsetWidth / 2) + 'px';
        activeDragImage.style.top = (touch.clientY - activeDragImage.offsetHeight / 2) + 'px';
    }
}

/* PC 마우스 드롭 핸들러 */
function handleDrop(e, targetIndex) {
    e.preventDefault();
    if (draggedIndex === null) return;
    executeMergeOrMove(draggedIndex, targetIndex);
    draggedIndex = null;
}

/* 머지 및 이동 공통 로직 */
function executeMergeOrMove(fromIndex, toIndex) {
    if (fromIndex === null || fromIndex === toIndex) return;

    const sourceItem = boardState[fromIndex];
    const targetItem = boardState[toIndex];

    if (!sourceItem) return;

    if (targetItem === null) {
        boardState[toIndex] = sourceItem;
        boardState[fromIndex] = null;
    } else if (
        sourceItem.category === targetItem.category && 
        sourceItem.level === targetItem.level
    ) {
        if (sourceItem.level === MAX_LEVEL) {
            const soundName = `clear_${sourceItem.category}`;
            playSound(soundName);
            addScore(2000);
            changeTheme(sourceItem.category);
            boardState[toIndex] = null;
            boardState[fromIndex] = null;
        } else {
            boardState[toIndex] = {
                category: sourceItem.category,
                level: sourceItem.level + 1
            };
            boardState[fromIndex] = null;
            playSound('merge');
            addScore((sourceItem.level + 1) * 10);
        }
    }

    renderBoard();
    saveGameState();
}

function addScore(pts) {
    score += pts;
    document.getElementById('score-value').innerText = score;
}

function changeTheme(category) {
    const theme = themeConfig[category];
    if (!theme) return;

    const stage = document.getElementById('game-stage');
    stage.style.backgroundImage = `url('${theme.bg}')`;
}

function resetBoard() {
    if (confirm("머지판을 초기화하시겠습니까?")) {
        boardState = Array(BOARD_ROWS * BOARD_COLS).fill(null);
        score = 0;
        document.getElementById('score-value').innerText = score;
        localStorage.removeItem('keep_merging_save');
        renderBoard();
    }
}
