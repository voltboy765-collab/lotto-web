// ===================================
// 전역 변수
// ===================================
let isRunning = false;
let isPaused = false;
let animationId = null;
let currentSpeed = 100; // milliseconds (보통 속도)
let currentBatchSize = 1;
let currentSpeedKey = 'normal';

// 통계
let weeks = 0;
let totalTickets = 0;
let currentTryInWeek = 0;

// 번호
let winningNumbers = [];
let currentNumbers = [];
const TICKETS_PER_WEEK = 5;
const JACKPOT_PROBABILITY = 1 / 8145060;
const TARGET_FAST_SECONDS = 5;
const EXPECTED_TICKETS_TO_WIN = Math.round(1 / JACKPOT_PROBABILITY);
const FAST_DELAY_MS = 16;
const FAST_BATCH_SIZE = Math.ceil((EXPECTED_TICKETS_TO_WIN / TARGET_FAST_SECONDS) * (FAST_DELAY_MS / 1000));

// 속도 설정
const speeds = {
    slow: { delay: 1000, batch: 1 },   // 1초에 1번
    normal: { delay: 100, batch: 1 },  // 1초에 10번
    fast: { delay: FAST_DELAY_MS, batch: FAST_BATCH_SIZE } // 기대값 기준 약 5초 목표
};

// ===================================
// DOM 요소
// ===================================
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const speedControls = document.getElementById('speedControls');
const speedButtons = document.querySelectorAll('.btn-speed');

const weeksDisplay = document.getElementById('weeks');
const ticketsDisplay = document.getElementById('tickets');
const costDisplay = document.getElementById('cost');

const winningNumbersDisplay = document.getElementById('winningNumbers');
const currentNumbersDisplay = document.getElementById('currentNumbers');
const tryCounterDisplay = document.getElementById('tryCounter');

const resultBox = document.getElementById('resultBox');
const resultMessage = document.getElementById('resultMessage');
const resultNumbers = document.getElementById('resultNumbers');
const resultWeeks = document.getElementById('resultWeeks');
const resultTickets = document.getElementById('resultTickets');
const resultCost = document.getElementById('resultCost');
const resultTime = document.getElementById('resultTime');

// ===================================
// 유틸리티 함수
// ===================================

// 1-45 사이의 중복 없는 6개 번호 생성 (오름차순)
function generateLottoNumbers() {
    const numbers = [];
    while (numbers.length < 6) {
        const num = Math.floor(Math.random() * 45) + 1;
        if (!numbers.includes(num)) {
            numbers.push(num);
        }
    }
    return numbers.sort((a, b) => a - b);
}

// 두 배열이 완전히 같은지 확인
function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

// 숫자를 천 단위 콤마로 포맷
function formatNumber(num) {
    return num.toLocaleString('ko-KR');
}

// 원 단위로 포맷
function formatCurrency(num) {
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '억';
    } else if (num >= 10000) {
        return (num / 10000).toFixed(0) + '만';
    }
    return formatNumber(num);
}

// 주수를 년/월로 변환
function formatTimeFromWeeks(weeks) {
    const years = Math.floor(weeks / 52);
    const months = Math.floor((weeks % 52) / 4);
    
    if (years > 0) {
        return months > 0 ? `${formatNumber(years)}년 ${months}개월` : `${formatNumber(years)}년`;
    } else if (months > 0) {
        return `${months}개월`;
    } else {
        return `${weeks}주`;
    }
}

// 로또 공 HTML 생성
function createBallsHTML(numbers) {
    return numbers.map(num => `<div class="ball">${num}</div>`).join('');
}

// ===================================
// 디스플레이 업데이트
// ===================================

function updateDisplay() {
    const displayTry = currentTryInWeek === 0 ? TICKETS_PER_WEEK : currentTryInWeek;

    weeksDisplay.textContent = formatNumber(weeks);
    ticketsDisplay.textContent = formatNumber(totalTickets);
    costDisplay.textContent = formatCurrency(totalTickets * 1000);
    
    winningNumbersDisplay.innerHTML = createBallsHTML(winningNumbers);
    currentNumbersDisplay.innerHTML = createBallsHTML(currentNumbers);
    tryCounterDisplay.textContent = `${TICKETS_PER_WEEK}장 중 ${displayTry}번째 시도`;
}

function showResult() {
    const totalCost = totalTickets * 1000;
    
    resultMessage.textContent = `${formatNumber(weeks)}주 만에 1등 당첨!`;
    resultNumbers.innerHTML = createBallsHTML(winningNumbers);
    resultWeeks.textContent = `${formatNumber(weeks)}주`;
    resultTickets.textContent = `${formatNumber(totalTickets)}장`;
    resultCost.textContent = `${formatCurrency(totalCost)}원`;
    resultTime.textContent = formatTimeFromWeeks(weeks);
    
    resultBox.style.display = 'block';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===================================
// 시뮬레이션 로직
// ===================================

function startSimulation() {
    if (isRunning) return;
    
    // 초기화
    weeks = 0;
    totalTickets = 0;
    currentTryInWeek = 0;
    isRunning = true;
    isPaused = false;
    
    // 시작 시에는 아직 회차 전이므로 빈 값으로 초기화
    winningNumbers = [];
    currentNumbers = [];
    
    // 결과 박스 숨기기
    resultBox.style.display = 'none';
    
    // UI 업데이트
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'block';
    speedControls.style.display = 'flex';
    
    // 시뮬레이션 시작
    runSimulation();
}

function runSimulation() {
    if (!isRunning || isPaused) return;

    let matched = false;

    for (let i = 0; i < currentBatchSize; i++) {
        // 이번 주 시작: 회차가 바뀔 때마다 당첨번호도 새로 생성
        if (currentTryInWeek === 0) {
            weeks++;
            currentTryInWeek = 1;
            winningNumbers = generateLottoNumbers();
        }

        totalTickets++;

        if (currentSpeedKey === 'fast') {
            // fast 모드: 실제 1등 확률(1/8,145,060)로 대량 확률 시뮬레이션
            if (Math.random() < JACKPOT_PROBABILITY) {
                currentNumbers = [...winningNumbers];
                matched = true;
                break;
            }
            // 화면에는 마지막 시도 번호만 표시
            if (i === currentBatchSize - 1) {
                currentNumbers = generateLottoNumbers();
            }
        } else {
            currentNumbers = generateLottoNumbers();
            if (arraysEqual(currentNumbers, winningNumbers)) {
                matched = true;
                break;
            }
        }

        if (currentTryInWeek >= TICKETS_PER_WEEK) {
            currentTryInWeek = 0;
        } else {
            currentTryInWeek++;
        }
    }

    updateDisplay();

    if (matched) {
        stopSimulation();
        showResult();
        return;
    }

    animationId = setTimeout(runSimulation, currentSpeed);
}

function pauseSimulation() {
    if (!isRunning) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseBtn.innerHTML = '▶️ 재개';
        if (animationId) {
            clearTimeout(animationId);
        }
    } else {
        pauseBtn.innerHTML = '⏸️ 일시정지';
        runSimulation();
    }
}

function stopSimulation() {
    isRunning = false;
    isPaused = false;
    
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
    
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'none';
    speedControls.style.display = 'none';
}

function resetSimulation() {
    // 상태 초기화
    isRunning = false;
    isPaused = false;
    weeks = 0;
    totalTickets = 0;
    currentTryInWeek = 0;
    winningNumbers = [];
    currentNumbers = [];
    
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
    
    // UI 초기화
    winningNumbersDisplay.innerHTML = createBallsHTML([0, 0, 0, 0, 0, 0].map(() => '?'));
    currentNumbersDisplay.innerHTML = createBallsHTML([0, 0, 0, 0, 0, 0].map(() => '-'));
    
    weeksDisplay.textContent = '0';
    ticketsDisplay.textContent = '0';
    costDisplay.textContent = '0';
    tryCounterDisplay.textContent = `${TICKETS_PER_WEEK}장 중 1번째 시도`;
    
    // 버튼 상태
    startBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
    speedControls.style.display = 'none';
    resultBox.style.display = 'none';
    
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================
// 이벤트 리스너
// ===================================

startBtn.addEventListener('click', startSimulation);
pauseBtn.addEventListener('click', pauseSimulation);
restartBtn.addEventListener('click', resetSimulation);

// 속도 조절
speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const speed = btn.dataset.speed;
        currentSpeed = speeds[speed].delay;
        currentBatchSize = speeds[speed].batch;
        currentSpeedKey = speed;
        
        // 활성화 표시
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ===================================
// 초기화
// ===================================

// 초기 화면 설정
winningNumbersDisplay.innerHTML = createBallsHTML([0, 0, 0, 0, 0, 0].map(() => '?'));
currentNumbersDisplay.innerHTML = createBallsHTML([0, 0, 0, 0, 0, 0].map(() => '-'));

// 페이지 로드 시 환영 메시지 (선택사항)
console.log('🎰 로또 시뮬레이터가 준비되었습니다!');
console.log('매주 5장씩 구매하면 얼마나 걸릴까요?');
