// ===============================
// Constants
// ===============================

const cellWidth = 50;
const cellHeight = 50;

const INITIAL_SPEED = 200;   // ms per tick, lower = faster
const MIN_SPEED = 70;        // fastest the snake can go
const SPEED_STEP = 5;        // ms shaved off per fruit eaten
const POINTS_PER_FRUIT = 10;

const DIRECTIONS = Object.freeze({
    UP: "up",
    DOWN: "down",
    LEFT: "left",
    RIGHT: "right"
});

const GAME_STATE = Object.freeze({
    START: "start",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "gameover"
});

const HIGH_SCORE_KEY = "snake-terminal-highscore";

const BOOT_LINES = [
    "> INIT SNAKE.EXE ...",
    "> LOADING GRID ......... OK",
    "> ALLOCATING MEMORY ..... OK",
    "> AWAITING INPUT ........ READY"
];


// ===============================
// DOM Elements
// ===============================

const board = document.querySelector(".board");
const scoreEl = document.getElementById("score");
const highscoreEl = document.getElementById("highscore");
const timeEl = document.getElementById("time");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayScoreBox = document.getElementById("overlayScore");
const finalScoreEl = document.getElementById("finalScore");
const finalHighScoreEl = document.getElementById("finalHighScore");
const overlayButton = document.getElementById("overlayButton");
const bootText = document.getElementById("bootText");

const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

let cols = Math.floor(board.clientWidth / cellWidth);
let rows = Math.floor(board.clientHeight / cellHeight);


// ===============================
// Game State
// ===============================

let direction = DIRECTIONS.RIGHT;
let nextDirection = DIRECTIONS.RIGHT;

const cells = {};
let snake = [];

let fruit = null;
let gameTimer = null;
let bootTimer = null;
let clockTimer = null;
let currentSpeed = INITIAL_SPEED;
let score = 0;
let elapsedSeconds = 0;
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
let state = GAME_STATE.START;
let resizeTimer = null;


// ===============================
// Initialization
// ===============================

createBoard();
highscoreEl.textContent = highScore;
showStartScreen();


// ===============================
// Render
// ===============================

function render() {
    Object.values(cells).forEach(cell => {
        cell.classList.remove("fill", "head", "fruit");
    });

    snake.forEach(({ x, y }, index) => {
        const cell = cells[`${x},${y}`];
        if (!cell) return;
        cell.classList.add(index === 0 ? "head" : "fill");
    });

    if (fruit) {
        const cell = cells[`${fruit.x},${fruit.y}`];
        if (cell) cell.classList.add("fruit");
    }
}

function updateHud() {
    scoreEl.textContent = score;
    highscoreEl.textContent = highScore;
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function updateClockDisplay() {
    timeEl.textContent = formatTime(elapsedSeconds);
}

function startClock() {
    clearInterval(clockTimer);
    elapsedSeconds = 0;
    updateClockDisplay();
    clockTimer = setInterval(() => {
        elapsedSeconds++;
        updateClockDisplay();
    }, 1000);
}

function pauseClock() {
    clearInterval(clockTimer);
}

function resumeClock() {
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
        elapsedSeconds++;
        updateClockDisplay();
    }, 1000);
}

function stopClock() {
    clearInterval(clockTimer);
}


// ===============================
// Board / fruit setup
// ===============================

function computeGridSize() {
    cols = Math.floor(board.clientWidth / cellWidth);
    rows = Math.floor(board.clientHeight / cellHeight);
}

function createBoard() {
    board.innerHTML = "";
    Object.keys(cells).forEach(key => delete cells[key]);
    computeGridSize();

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            board.appendChild(cell);

            cells[`${i},${j}`] = cell;
        }
    }
}

function generateFruit() {
    let isOnSnake = true;
    let x, y;

    while (isOnSnake) {
        x = Math.floor(Math.random() * rows);
        y = Math.floor(Math.random() * cols);

        isOnSnake = snake.some(segment =>
            segment.x === x &&
            segment.y === y
        );
    }

    fruit = { x, y };
}

function getNextHead() {
    const currentHead = snake[0];

    switch (nextDirection) {
        case DIRECTIONS.LEFT:
            return { x: currentHead.x, y: currentHead.y - 1 };
        case DIRECTIONS.RIGHT:
            return { x: currentHead.x, y: currentHead.y + 1 };
        case DIRECTIONS.UP:
            return { x: currentHead.x - 1, y: currentHead.y };
        case DIRECTIONS.DOWN:
            return { x: currentHead.x + 1, y: currentHead.y };
    }
}


// ===============================
// Game Loop
// ===============================

function update() {
    direction = nextDirection;
    const head = getNextHead();

    if (
        head.x < 0 ||
        head.x >= rows ||
        head.y < 0 ||
        head.y >= cols
    ) {
        gameOver();
        return;
    }

    const willEat =
        head.x === fruit.x &&
        head.y === fruit.y;

    const snakeBody = willEat
        ? snake
        : snake.slice(0, -1);

    const hitSelf = snakeBody.some(segment =>
        segment.x === head.x &&
        segment.y === head.y
    );

    if (hitSelf) {
        gameOver();
        return;
    }

    snake.unshift(head);

    if (willEat) {
        score += POINTS_PER_FRUIT;
        currentSpeed = Math.max(MIN_SPEED, currentSpeed - SPEED_STEP);
        generateFruit();
        updateHud();
    } else {
        snake.pop();
    }

    render();
    scheduleNextTick();
}

function scheduleNextTick() {
    clearTimeout(gameTimer);
    if (state !== GAME_STATE.PLAYING) return;
    gameTimer = setTimeout(update, currentSpeed);
}

function gameOver() {
    state = GAME_STATE.GAME_OVER;
    clearTimeout(gameTimer);
    stopClock();

    if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    }

    showGameOverScreen();
}


// ===============================
// Game setup / control flow
// ===============================

function resetState() {
    direction = DIRECTIONS.RIGHT;
    nextDirection = DIRECTIONS.RIGHT;
    snake = [{ x: Math.floor(rows / 2), y: 1 }];
    score = 0;
    currentSpeed = INITIAL_SPEED;

    generateFruit();
    updateHud();
    render();
}

function startGame() {
    clearTimeout(bootTimer);
    resetState();
    state = GAME_STATE.PLAYING;
    hideOverlay();
    setPauseIndicator(true, "[ SPACE ] PAUSE");
    startClock();
    scheduleNextTick();
}

function togglePause() {
    if (state === GAME_STATE.PLAYING) {
        state = GAME_STATE.PAUSED;
        clearTimeout(gameTimer);
        pauseClock();
        showPauseScreen();
        setPauseIndicator(true, "[ SPACE ] RESUME");
    } else if (state === GAME_STATE.PAUSED) {
        state = GAME_STATE.PLAYING;
        hideOverlay();
        resumeClock();
        setPauseIndicator(true, "[ SPACE ] PAUSE");
        scheduleNextTick();
    }
}

function setPauseIndicator(active, label) {
    pauseBtn.textContent = label;
    pauseBtn.setAttribute("aria-disabled", active ? "false" : "true");
}

function handlePrimaryAction() {
    if (state === GAME_STATE.START || state === GAME_STATE.GAME_OVER) {
        startGame();
    } else if (state === GAME_STATE.PLAYING || state === GAME_STATE.PAUSED) {
        togglePause();
    }
}


// ===============================
// Overlay screens
// ===============================

function typeBootText() {
    bootText.textContent = "";
    let i = 0;

    function next() {
        if (i >= BOOT_LINES.length) return;
        bootText.textContent += BOOT_LINES[i] + "\n";
        i++;
        bootTimer = setTimeout(next, 180);
    }

    next();
}

function showStartScreen() {
    state = GAME_STATE.START;
    overlay.hidden = false;
    overlay.classList.remove("overlay--gameover", "overlay--paused");
    overlayScoreBox.hidden = true;
    overlayTitle.textContent = "SNAKE.EXE";
    overlayMessage.textContent = "A terminal classic";
    overlayButton.textContent = "[ SPACE / ENTER TO START ]";
    setPauseIndicator(false, "[ SPACE ] PAUSE");
    typeBootText();
}

function showGameOverScreen() {
    overlay.hidden = false;
    overlay.classList.add("overlay--gameover");
    overlay.classList.remove("overlay--paused");
    bootText.textContent = "";
    overlayTitle.textContent = "GAME OVER";
    overlayMessage.textContent = "The snake has met its end.";
    overlayScoreBox.hidden = false;
    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = highScore;
    overlayButton.textContent = "[ SPACE / ENTER TO RESTART ]";
    setPauseIndicator(false, "[ SPACE ] PAUSE");
}

function showPauseScreen() {
    overlay.hidden = false;
    overlay.classList.add("overlay--paused");
    overlay.classList.remove("overlay--gameover");
    bootText.textContent = "";
    overlayTitle.textContent = "PAUSED";
    overlayMessage.textContent = "The snake awaits...";
    overlayScoreBox.hidden = false;       
    finalScoreEl.textContent = score;   
    finalHighScoreEl.textContent = highScore; 
    overlayButton.textContent = "[ PRESS SPACE TO RESUME ]";
}

function hideOverlay() {
    overlay.hidden = true;
    overlay.classList.remove("overlay--gameover", "overlay--paused");
}


// ===============================
// Event Listeners
// ===============================

document.addEventListener("keydown", (event) => {

    if (event.code === "Space") {
        event.preventDefault();
        handlePrimaryAction();
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        startGame();
        return;
    }

    if (state !== GAME_STATE.PLAYING) return;

    switch (event.key) {

        case "ArrowUp":
            if (direction !== DIRECTIONS.DOWN) {
                nextDirection = DIRECTIONS.UP;
            }
            break;

        case "ArrowDown":
            if (direction !== DIRECTIONS.UP) {
                nextDirection = DIRECTIONS.DOWN;
            }
            break;

        case "ArrowLeft":
            if (direction !== DIRECTIONS.RIGHT) {
                nextDirection = DIRECTIONS.LEFT;
            }
            break;

        case "ArrowRight":
            if (direction !== DIRECTIONS.LEFT) {
                nextDirection = DIRECTIONS.RIGHT;
            }
            break;
    }

});

overlayButton.addEventListener("click", handlePrimaryAction);

window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 200);
});

function handleResize() {
    const newCols = Math.floor(board.clientWidth / cellWidth);
    const newRows = Math.floor(board.clientHeight / cellHeight);

    if (newCols === cols && newRows === rows) return;

    clearTimeout(gameTimer);
    stopClock();
    createBoard();

    showStartScreen();
}