const BOARD_ROWS = 8;
const BOARD_COLS = 6;
const MAX_LEVEL = 10;

let boardState = Array(BOARD_ROWS * BOARD_COLS).fill(null);
let score = 0;
let draggedIndex = null;

// 테마 배경 설정
const themeConfig = {
    flower: { bg: 'images/bg_flower.png' },
    ocean: { bg: 'images/bg_ocean.png' },
    space: { bg: 'images/bg_space.png' }
};

// 효과음 객체 생성
const sounds = {
    pop: new Audio('sounds/pop.mp3'),
    merge: new Audio('sounds/merge.mp3'),
    clear_flower: new Audio('sounds/clear_flower.mp3'),
    clear_ocean: new Audio('sounds/clear_ocean.mp3'),
    clear_space: new Audio('sounds/clear_space.mp3')
};

// 🔊 메모리 누수 없는 최적화된 오디오 재생 함수
function playSound(soundKey) {
    if (sounds[soundKey]) {
        sounds[soundKey].currentTime = 0; // 재생 위치를 처음으로 리셋하여 재사용
        sounds[soundKey].play().catch(e => console.log("Audio play error:", e));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initBoard();
    loadGameState(); // 저장된 데이터 불러오기
    document.getElementById('reset-btn').addEventListener('click', resetBoard);
});

function initBoard() {
    const board = document.getElementById('merge-board');
    board.innerHTML = '';
    
    for (let i = 0; i < BOARD_ROWS * BOARD_COLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        
        cell.addEventListener('dragover', (e) => e.preventDefault());
        cell.addEventListener('drop', (e) => handleDrop(e, i));
        
        board.appendChild(cell);
    }
}

// 💾 자동 저장 기능
function saveGameState() {
    const gameState = {
        boardState: boardState,
        score: score
    };
    localStorage.setItem('keep_merging_save', JSON.stringify(gameState));
}

// 📂 불러오기 기능
function loadGameState() {
    const savedData = localStorage.getItem('keep_merging_save');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            boardState = parsedData.boardState || Array(BOARD_ROWS * BOARD_COLS).fill(null);
            score = parsedData.score || 0;
            document.getElementById('score-value').innerText = score;
        } catch (e) {
            console.error("저장된 데이터를 불러오는 데 실패했습니다.", e);
        }
    }
    renderBoard();
    
}

// 특정 카테고리 5개 생성 (꽃, 바다, 우주 생성기)
function spawnItem(category) {
    const SPAWN_COUNT = 5;
    let spawnedAny = false;
    const maxSpawnLevel = score >= 10000 ? 5 : 3;

    for (let i = 0; i < SPAWN_COUNT; i++) {
        const emptyIndices = boardState
            .map((val, idx) => val === null ? idx : null)
            .filter(val => val !== null);

        if (emptyIndices.length === 0) {
            if (!spawnedAny) {
                alert("머지판이 꽉 찼습니다!");
            }
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

// ❓❔ 올랜덤 생성기 함수 (아이템 하나마다 카테고리를 완전히 무작위 결정!)
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
            if (!spawnedAny) {
                alert("머지판이 꽉 찼습니다!");
            }
            break;
        }

        const targetIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        
        // 🎲 매 아이템마다 카테고리와 레벨을 각각 랜덤 지정
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
            // 1. 아이템 이미지 생성
            const img = document.createElement('img');
            img.src = `images/${itemData.category}_${itemData.level}.png`;
            img.onerror = function() {
                this.src = `https://via.placeholder.com/60?text=${itemData.category}+${itemData.level}`;
            };
            img.className = 'item';
            img.draggable = true;

            img.addEventListener('dragstart', () => { draggedIndex = index; });

            cell.appendChild(img);

            // 2. 🔢 오른쪽 아래에 붙을 레벨 숫자 태그 생성
            const badge = document.createElement('span');
            badge.className = 'level-badge';
            badge.innerText = itemData.level;
            cell.appendChild(badge);
        }
    });
}

// 드래그 앤 드롭 머지 처리
function handleDrop(e, targetIndex) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const sourceItem = boardState[draggedIndex];
    const targetItem = boardState[targetIndex];

    if (!sourceItem) return;

    if (targetItem === null) {
        boardState[targetIndex] = sourceItem;
        boardState[draggedIndex] = null;
    } else if (
        sourceItem.category === targetItem.category && 
        sourceItem.level === targetItem.level
    ) {
        if (sourceItem.level === MAX_LEVEL) {
            // 10단계 + 10단계 소멸
            const soundName = `clear_${sourceItem.category}`;
            playSound(soundName);

            addScore(2000);
            changeTheme(sourceItem.category);

            boardState[targetIndex] = null;
            boardState[draggedIndex] = null;
        } else {
            // 일반 레벨업 머지
            boardState[targetIndex] = {
                category: sourceItem.category,
                level: sourceItem.level + 1
            };
            boardState[draggedIndex] = null;

            playSound('merge');
            addScore((sourceItem.level + 1) * 10);
        }
    }

    draggedIndex = null;
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
    if (confirm("머지판을 초기화하시겠습니까? (저장된 정보도 삭제됩니다)")) {
        boardState = Array(BOARD_ROWS * BOARD_COLS).fill(null);
        score = 0;
        document.getElementById('score-value').innerText = score;
        localStorage.removeItem('keep_merging_save');
        renderBoard();
    }
}
