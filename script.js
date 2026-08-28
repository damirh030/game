let ysdkInstance = null;
let playerInstance = null;
let currentLang = 'ru';

let gameData = {
    currentTheme: 'matrix',
    purchasedThemes: ['matrix'],
    coins: 0,
    clickPower: 1,
    passiveIncome: 0,
    totalClicks: 0,
    chips: 0,
    lastSaveTime: Date.now(),
    upgrades: {
        mouse: { count: 0, baseCost: 80, costMultiplier: 1.15, cpcBonus: 1, cpsBonus: 0 },
        gpu: { count: 0, baseCost: 150, costMultiplier: 1.15, cpcBonus: 0, cpsBonus: 2 },
        botnet: { count: 0, baseCost: 450, costMultiplier: 1.15, cpcBonus: 0, cpsBonus: 15 }
    }
};

const attacksConfig = {
    school: { requiredCps: 5, reward: 300, duration: 5, active: false },
    bank: { requiredCps: 40, reward: 2000, duration: 15, active: false },
    pentagon: { requiredCps: 300, reward: 7000, duration: 45, active: false }
};

const themesConfig = {
    matrix: {
        '--bg-main': 'radial-gradient(circle, #0c1a10 0%, #020503 100%)',
        '--bg-shop': '#0a0f0b', '--bg-item': '#111813',
        '--neon-bright': '#00ff66', '--neon-dim': 'rgba(0, 255, 102, 0.3)',
        '--text-accent': '#88ffaa'
    },
    cyber: {
        '--bg-main': 'radial-gradient(circle, #25001c 0%, #0a000b 100%)',
        '--bg-shop': '#11001a', '--bg-item': '#1a0026',
        '--neon-bright': '#ff0055', '--neon-dim': 'rgba(255, 0, 85, 0.3)',
        '--text-accent': '#ff77aa'
    },
    toxic: {
        '--bg-main': 'radial-gradient(circle, #151a00 0%, #050800 100%)',
        '--bg-shop': '#0d1000', '--bg-item': '#171c00',
        '--neon-bright': '#a6ff00', '--neon-dim': 'rgba(166, 255, 0, 0.3)',
        '--text-accent': '#d4ff77'
    },
    blood: {
        '--bg-main': 'radial-gradient(circle, #2a0000 0%, #0a0000 100%)',
        '--bg-shop': '#120000', '--bg-item': '#1f0000',
        '--neon-bright': '#ff3333', '--neon-dim': 'rgba(255, 51, 51, 0.3)',
        '--text-accent': '#ff8888'
    }
};


function switchTab(tabName) {
    document.getElementById('tab-shop').style.display = tabName === 'shop' ? 'block' : 'none';
    document.getElementById('tab-attacks').style.display = tabName === 'attacks' ? 'block' : 'none';
    if (tabName === 'shop') {
        document.getElementById('tab-shop-btn').classList.add('active');
        document.getElementById('tab-attacks-btn').classList.remove('active');
    } else {
        document.getElementById('tab-shop-btn').classList.remove('active');
        document.getElementById('tab-attacks-btn').classList.add('active');
    }
}

function startAttack(id) {
    const attack = attacksConfig[id];
    const currentCps = getTotalPassiveIncome();

    if (currentCps < attack.requiredCps) {
        showCenterNotification("[ОТКАЗ: НЕДОСТАТОЧНО МОЩНОСТИ БОТНЕТА", "#ff0055");
        return;
    }

    if (attack.active) return;

    attack.active = true;

    const pContainer = document.querySelector(`#attack-${id} .progress-bar-container`);
    const pBar = document.getElementById(`pb-${id}`);
    const btn = document.querySelector(`#attack-${id} .hack-btn`);

    pContainer.style.display = 'block';
    btn.disabled = true;
    btn.textContent = "Взлом...";

    let elapsed = 0;
    const invtervalTime = 100;
    const totalSteps = (attack.duration * 1000) / invtervalTime;

    const timer = setInterval(() => {
        elapsed++;
        const percent = (elapsed / totalSteps) * 100;
        pBar.style.width = `${percent}%`;
        if (elapsed >= totalSteps) {
            clearInterval(timer);
            gameData.coins += attack.reward;
            updateUI();
            saveGame();
            pContainer.style.display = 'none';
            pBar.style.width = '0%';
            btn.disabled = false;
            btn.textContent = `ВЗЛОМ (${attack.duration}c)`;
            attack.active = false;

            showCenterNotification(`[СЕРВЕР ВЗЛОМАН: +${attack.reward} BTC]`, "#00ff66");
        }
    }, invtervalTime);
}


function updateThemeButtons() {
    const names = { cyber: 'CYBERPUNK', toxic: 'TOXIC', blood: 'MALWARE' };

    for (let id in names) {
        const btn = document.getElementById(`theme-${id}`);
        if (!btn) continue;

        if (gameData.purchasedThemes.includes(id)) {
            btn.style.background = 'var(--bg-item)';
            btn.style.color = 'var(--text-main)';
            btn.style.border = '1px solid var(--neon-bright)';

            if (gameData.currentTheme === id) {
                btn.textContent = `[ АКТИВНО ]`;
                btn.style.background = 'var(--neon-dim)';
                btn.style.color = 'var(--neon-bright)';
            } else {
                btn.textContent = `ПРИМЕНИТЬ`;
            }
        }
    }
}

function applyTheme(themeName) {
    const theme = themesConfig[themeName];
    if (!theme) return;
    const root = document.documentElement;

    for (let property in theme) {
        root.style.setProperty(property, theme[property]);
    }

    gameData.currentTheme = themeName;
    saveGame();
    updateThemeButtons();
}

function buyTheme(themeName, cost) {
    if (!gameData.purchasedThemes) gameData.purchasedThemes = ['matrix'];

    if (gameData.purchasedThemes.includes(themeName)) {
        applyTheme(themeName);
        return;
    }

    if (gameData.coins >= cost) {
        gameData.coins -= cost;
        gameData.purchasedThemes.push(themeName);
        applyTheme(themeName);
        updateUI();
    } else {
        showCenterNotification("[ОТКАЗ: НЕДОСТАТОЧНО BTC ДЛЯ СМЕНЫ ИНТЕРФЕЙСА]", "#ff0055");
    }
}


const hackerPhrases = ["+1 BTC", "0x7FFF", "BYPASS", "ACCESS_GRANTED", "NET_HIT", "PROXY_OK"];
const ranks = [
    { minIncome: 0, name: "РАНГ: SCRIPT_KIDDIE" },
    { minIncome: 10, name: "РАНГ: ЮНЫЙ_ВЗЛОМЩИК" },
    { minIncome: 100, name: "РАНГ: БЕЛЫЙ_ШЛЯПНИК" },
    { minIncome: 1000, name: "РАНГ: КИБЕР_ПРИЗРАК" },
    { minIncome: 10000, name: "РАНГ: АРХИТЕКТОР_МАТРИЦЫ" }
];

const systemLogs = [
    "INITIALIZING EXPLOIT BUFFER...", "CONNECTING TO PROXY_NODE_4...", 
    "OVERRIDING SECURITY PROTOCOL...", "INJECTING PACKET TO PORT 80...",
    "BRUTEFORCING ENCRYPTION KEY...", "BYPASSING FIREWALL... SUCCESS",
    "DOWNLOADING DATABASE MANIFEST...", "CLEANING UP SYSTEM LOGS...",
    "EXTRACTING SHA-256 HASH...", "DECRYPTING ROOT PRIVILEGES..."
];

const coinsDisplay = document.getElementById('coins-count');
const incomeDisplay = document.getElementById('income-count');
const clickBtn = document.getElementById('hacker-node');
const rankDisplay = document.getElementById('hacker-rank');
const chipsPanel = document.getElementById('chips-panel');
const chipsDisplay = document.getElementById('chips-count');
const prestigeBonusDisplay = document.getElementById('prestige-bonus');
const prestigeBtn = document.getElementById('prestige-btn');
const pendingChipsDisplay = document.getElementById('pending-chips');


window.onload = function() {
    if (typeof YaGames !== 'undefined') {
        YaGames.init().then(ysdk => {
            console.log('Яндекс SDK готов.');
            ysdkInstance = ysdk;
            currentLang = ysdk.environment.i18n.lang;
            console.log('Язык интерфейса Яндекса:', currentLang);
            
            return ysdk.getPlayer({ scopes: false });
        }).then(player => {
            playerInstance = player;
            return playerInstance.getData();
        }).then(data => {
            if (data && data.gameData) {
                gameData = data.gameData;
            }
            initGame();
        }).catch(err => {
            console.error('Ошибка SDK, играем локально:', err);
            loadLocalData();
            initGame();
        });
    } else {
        loadLocalData();
        initGame();
    }
};

function loadLocalData() {
    const local = localStorage.getItem('hacker_clicker_v3');
    if (local) {
        const parsed = JSON.parse(local);
        gameData = Object.assign(gameData, parsed);
    } 
}

function initGame() {
    calculateOfflineIncome();
    updateUI();
    startPassiveIncome();
    applyTheme(gameData.currentTheme || 'matrix');
    updateThemeButtons();
    setInterval(generateBackgroundLog, 1200);
}

function saveGame() {
    gameData.lastSaveTime = Date.now();
    if (playerInstance) {
        playerInstance.setData({ gameData: gameData }).catch(err => console.error(err));
    } else {
        localStorage.setItem('hacker_clicker_v3', JSON.stringify(gameData));
    }
}

function calculateOfflineIncome() {
    if (gameData.passiveIncome > 0) {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - gameData.lastSaveTime) / 1000);
        const cappedSeconds = Math.min(diffInSeconds, 43200);

        if (cappedSeconds > 60) {
            const earned = cappedSeconds * getTotalPassiveIncome();
            gameData.coins += earned;
            setTimeout(() => {
                showCenterNotification(`[ СИСТЕМА МАЙНИЛА В СЕТИ: +${Math.floor(earned)} BTC ]`, "#00ffff");
            }, 1000);
        }
    }
}


function getUpgradeCost(type) {
    const upg = gameData.upgrades[type];
    return Math.floor(upg.baseCost * Math.pow(upg.costMultiplier, upg.count));
}


function getPrestigeMultiplier() {
    return 1 + (gameData.chips * 0.10);
}

function getTotalClickPower() {
    return Math.floor(gameData.clickPower * getPrestigeMultiplier());
}

function getTotalPassiveIncome() {
    return Math.floor(gameData.passiveIncome * getPrestigeMultiplier());
}

function getPendingChips() {
    if (gameData.coins < 5000) return 0;
    return Math.floor(Math.sqrt(gameData.coins / 5000));
}

function updateUI() {
    const currentChips = gameData.chips || 0;
    const activePassiveIncome = getTotalPassiveIncome();

    coinsDisplay.textContent = Math.floor(gameData.coins);
    incomeDisplay.textContent = activePassiveIncome;

    for (let type in gameData.upgrades) {
        const btn = document.getElementById(`cost-${type}`);
        if (btn) btn.textContent = `${getUpgradeCost(type)} BTC`;
    }

    let currentRank = ranks[0].name;
    for (let r of ranks) {
        if (activePassiveIncome >= r.minIncome) {
            currentRank = r.name;
        }
    }
    rankDisplay.textContent = currentRank;

    if (currentChips > 0) {
        chipsPanel.style.display = "block";
        chipsDisplay.textContent = currentChips;
        prestigeBonusDisplay.textContent = currentChips * 10;
        document.querySelector('.node-text').textContent = `<POWER: ${getTotalClickPower()}>`;
    } else {
        document.querySelector('.node-text').textContent = `<RUN_EXPLOIT>`;
    }

    const pendingChips = getPendingChips();
    if (pendingChips > 0) {
        prestigeBtn.style.display = "inline-block";
        pendingChipsDisplay.textContent = pendingChips;
    } else {
        prestigeBtn.style.display = "none";
    }
}


function startPassiveIncome() {
    let saveCounter = 0;
    setInterval(() => {
        gameData.coins += getTotalPassiveIncome();
        updateUI();

        saveCounter++;
        if (saveCounter >= 10) {
            saveGame();
            saveCounter = 0;
        }
    }, 1000);
}

clickBtn.addEventListener('click', (e) => {
    const power = getTotalClickPower();
    gameData.coins += power;
    gameData.totalClicks++;
    updateUI();
    checkClickAchievements();

    const floatTxt = document.createElement('div');
    floatTxt.className = 'floating-text';
    floatTxt.textContent = Math.random() > 0.4 ? `+${power} BTC` : hackerPhrases[Math.floor(Math.random() * hackerPhrases.length)];
    floatTxt.style.left = `${e.pageX}px`;
    floatTxt.style.top = `${e.pageY}px`;
    document.body.appendChild(floatTxt);
    setTimeout(() => floatTxt.remove(), 800);
});



function checkClickAchievements() {
    if (gameData.totalClicks === 100) {
        showCenterNotification("[ ДОСТИЖЕНИЕ: НАЧИНАЮЩИЙ КЛИКЕР (100 кликов) ]", "#ffff00");
    } else if (gameData.totalClicks === 1000) {
        showCenterNotification("[ ДОСТИЖЕНИЕ:КИБЕР-ПАЛЕЦ (1000 кликов) ]", "#ffff00");
    }
}

function buyUpgrade(type) {
    const cost = getUpgradeCost(type);
    if (gameData.coins >= cost) {
        gameData.coins -= cost;
        gameData.upgrades[type].count++;

        gameData.clickPower += gameData.upgrades[type].cpcBonus;
        gameData.passiveIncome += gameData.upgrades[type].cpsBonus;

        updateUI();
        saveGame();
    } else {
        showCenterNotification("[ ОТКАЗ В ДОСТУПЕ: НЕДОСТАТОЧНО BTC ]", "#ff0055");
    }
}

function triggerPrestige() {
    const chipsToGet = getPendingChips();
    if (chipsToGet > 0) {
        if (confirm(`Вы уверены, что хотите сбросить систему? Вы потеряете все BTC и улучшения, но получите ${chipsToGet} Квантовых чипов.`)) {
            gameData.chips += chipsToGet;
            gameData.coins = 0;
            gameData.clickPower = 1;
            gameData.passiveIncome = 0;
            for (let type in gameData.upgrades) {
                gameData.upgrades[type].count = 0;
            }

            prestigeBtn.style.display = "none";
            showCenterNotification("[ СИСТЕМА УСПЕШНО ПЕРЕЗАГРУЖЕНА ]", "#00ffff");
            updateUI();
            saveGame();
        }
    }
}

function showRewardAd() {
    if (ysdkInstance) {
        ysdkInstance.adv.showRewardedVideo({
            callbacks: {
                onRewarded: () => grantAdReward(),
                onError: (e) => console.error(e)
            }
        });
    } else {
        grantAdReward();
    }
}

function grantAdReward() {
    const bonusCoins = Math.max(getTotalPassiveIncome() * 15, 30);
    gameData.coins += bonusCoins;
    updateUI();
    saveGame();
    showCenterNotification(`[ СИСТЕМА УСКОРЕНА: +${bonusCoins} BTC ]`, "#ffaa00");
}

function showCenterNotification(text, shadowColor) {
    const alertBox = document.createElement('div');
    alertBox.className = 'ad-floating-text';
    alertBox.style.textShadow = `0 0 10px ${shadowColor}, 0 0 20px ${shadowColor}`;
    alertBox.textContent = text;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 2500);
}


function generateBackgroundLog() {
    const bgContainer = document.getElementById('matrix-bg');
    if (!bgContainer) return;

    const line = document.createElement('div');
    line.className = 'matrix-line';
    
    const hexAddress = "0x" + Math.floor(Math.random() * 65535).toString(16).toUpperCase();
    const randomLog = systemLogs[Math.floor(Math.random() * systemLogs.length)];
    line.textContent = `[${hexAddress}] ${randomLog}`;

    bgContainer.appendChild(line);

    if (bgContainer.children.length > 25) {
        bgContainer.removeChild(bgContainer.firstChild);
    }
}

document.addEventListener('contextmenu', event => event.preventDefault());