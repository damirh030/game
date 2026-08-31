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
    level: 1,
    export: 0,
    skills: {
        overclock: { unlocked: false, active: false, cooldown: false },
        ddos: { unlocked: false, active: false, cooldown: false }
    },
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

    const shopZone = document.querySelector('.shop-zone');
    if (shopZone) {
        shopZone.classList.remove('tab-content-animate');
        void shopZone.offsetWidth;
        shopZone.classList.add('tab-content-animate');
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


window.onload = function () {
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

            if (gameData.level === undefined || isNaN(gameData.level)) {
                gameData.level = 1;
            }

            if (gameData.exp === undefined || isNaN(gameData.exp)) {
                gameData.exp = 0;
            }

            if (!gameData.skills) {
                gameData.skills = {
                    overclock: { unlocked: false, active: false, cooldown: false },
                    ddos: { unlocked: false, active: false, cooldown: false }
                };
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

    if (gameData.level === undefined || isNaN(gameData.level)) {
        gameData.level = 1;
    }

    if (gameData.exp === undefined || isNaN(gameData.exp)) {
        gameData.exp = 0;
    }

    if (!gameData.skills) {
        gameData.skills = {
            overclock: { unlocked: false, active: false, cooldown: false },
            ddos: { unlocked: false, active: false, cooldown: false }
        };
    }
}

function initGame() {
    calculateOfflineIncome();
    updateUI();
    startPassiveIncome();
    applyTheme(gameData.currentTheme || 'matrix');
    updateThemeButtons();
    setInterval(generateBackgroundLog, 1200);
    checkSkillsUnlock();
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
    let power = gameData.clickPower || 1;

    if (gameData.skills && gameData.skills.overclock && gameData.skills.overclock.active === true) {
        power = power * 2;
    }
    const prestigeMult = (typeof getPrestigeMultiplier === 'function') ? getPrestigeMultiplier() : 1;

    return Math.floor(power * prestigeMult);
}

function getTotalPassiveIncome() {
    let baseIncome = gameData.passiveIncome;
    if (gameData.skills && gameData.skills.ddos && gameData.skills.ddos.active) {
        baseIncome *= 3;
    }
    return Math.floor(gameData.passiveIncome * getPrestigeMultiplier());
}

function getPendingChips() {
    if (gameData.coins < 5000) return 0;
    return Math.floor(Math.sqrt(gameData.coins / 5000));
}

function getRequiredExp() {
    return gameData.level * 50;
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

    if (document.getElementById('hacker-lvl')) {
        document.getElementById('hacker-lvl').textContent = `LVL: ${gameData.level}`;
    }
    if (document.getElementById('lvl-exp')) {
        document.getElementById('lvl-exp').textContent = `EXP: ${gameData.exp}/${getRequiredExp()}`;
    }

    const progressBar = document.getElementById('lvl-progress-bar');
    if (progressBar) {
        const percentage = (gameData.exp / getRequiredExp()) * 100;
        progressBar.style.width = `${percentage}%`;
    }

    const oBtn = document.getElementById('skill-overclock');
    const dBtn = document.getElementById('skill-ddos');
    if (oBtn && dBtn && gameData.skills) {

        if (!gameData.skills.overclock.unlocked) { oBtn.className = "buy-btn skill-btn locked"; oBtn.querySelector('.skill-status').textContent = "[БЛОК: LVL 3]"; }
        else if (gameData.skills.overclock.active) { oBtn.className = "buy-btn skill-btn active-buff"; oBtn.querySelector('.skill-status').textContent = "[АКТИВЕН...]"; }
        else if (gameData.skills.overclock.cooldown) { oBtn.className = "buy-btn skill-btn cooldown"; oBtn.querySelector('.skill-status').textContent = "[ПЕРЕЗАГР...]"; }
        else { oBtn.className = "buy-btn skill-btn"; oBtn.querySelector('.skill-status').textContent = "[ГОТОВ]"; }


        if (!gameData.skills.ddos.unlocked) { dBtn.className = "buy-btn skill-btn locked"; dBtn.querySelector('.skill-status').textContent = "[БЛОК: LVL 5]"; }
        else if (gameData.skills.ddos.active) { dBtn.className = "buy-btn skill-btn active-buff"; dBtn.querySelector('.skill-status').textContent = "[АТАКА...]"; }
        else if (gameData.skills.ddos.cooldown) { dBtn.className = "buy-btn skill-btn cooldown"; dBtn.querySelector('.skill-status').textContent = "[ПЕРЕЗАГР...]"; }
        else { dBtn.className = "buy-btn skill-btn"; dBtn.querySelector('.skill-status').textContent = "[ГОТОВ]"; }
    }

    const wireL = document.getElementById('wire-left');
    const wireR = document.getElementById('wire-right');
    if (wireL) {
        const gpuCount = gameData.upgrades.gpu.count || 0;
        if (gpuCount > 0) {
            const newWidth = Math.min(40 + (gpuCount * 15), 200);
            wireL.style.width = `${newWidth}px`;
            wireL.style.background = 'var(--neon-bright)';
            wireL.style.boxShadow = '0 0 10px var(--neon-bright)';
        } else {
            wireL.style.width = '40px';
            wireL.style.background = '#111';
            wireL.style.boxShadow = 'none';
        }
    }

    if (wireR) {
        const botnetCount = gameData.upgrades.botnet.count || 0;
        if (botnetCount > 0) {
            const newWidth = Math.min(40 + (botnetCount * 15), 200);
            wireR.style.width = `${newWidth}px`;
            wireR.style.background = 'var(--neon-bright)';
            wireR.style.boxShadow = '0 0 10px var(--neon-bright)';
        } else {
            wireR.style.width = '40px';
            wireR.style.background = '#111';
            wireR.style.boxShadow = 'none';
        }
    }
}

function spawnExploit() {
    const exploitBtn = document.getElementById('exploit-btn');
    const prestigeBtn = document.getElementById('prestige-btn');
    const adWrapper = document.querySelector('.ad-wrapper');

    if (!exploitBtn) return;
    exploitBtn.style.setProperty('display', 'block', 'important');

    if (typeof showCenterNotification === 'function') {
        showCenterNotification("[ ! ] ОБНАРУЖЕНА УЯЗВИМОСТЬ В СЕТИ БАНКА [ ! ]", "#ff0055");
    }
    if (typeof playHackerSound === 'function') {
        playHackerSound('levelup');
    }
    if (adWrapper) {
        adWrapper.style.setProperty('display', 'none', 'important');
    }

    if (prestigeBtn) {
        prestigeBtn.style.setProperty('display', 'none', 'important');
    }

    setTimeout(() => {
        const currentExploitBtn = document.getElementById('exploit-btn');
        if (currentExploitBtn) {
            currentExploitBtn.style.setProperty('display', 'none', 'important');
        }
        if (currentAdWrapper = document.querySelector('.ad-wrapper')) {
            currentAdWrapper.style.setProperty('display', 'block', 'important');
        }
        if (typeof updateUI === 'function') updateUI();
    }, 7000);
}

function triggerExploitClick() {
    const power = (typeof getTotalClickPower === 'function') ? getTotalClickPower() : (gameData.clickPower || 1);
    const bonus = power * 5;
    gameData.coins += bonus;

    if (typeof showCenterNotification === 'function') {
        showCenterNotification(`[ ВЗЛОМ: +${bonus} BTC ]`, "#ff0055");
    }
    if (typeof playHackerSound === 'function') playHackerSound('click');
    if (typeof updateUI === 'function') updateUI();
}


function startPassiveIncome() {
    setInterval(() => {
        const income = getTotalPassiveIncome();
        if (income > 0) {
            gameData.coins += income / 10;
            updateUI();
        }
    }, 100);
}

clickBtn.addEventListener('click', (e) => {
    if (e.target && typeof e.target.blur === 'function') {
        e.target.blur();
    }

    playHackerSound('click');
    gameData.exp++;
    const expNeeded = getRequiredExp();

    if (gameData.exp >= expNeeded) {
        gameData.exp = 0;
        gameData.level++;
        playHackerSound('levelup')
        showCenterNotification(`[ПОВЫШЕНИЕ УРОВНЯ: ВЫ LVL ${gameData.level}]`, "#ffff00");
        checkSkillsUnlock();
    }

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

function showCenterNotification(text, color = "var(--neon-bright)") {
    if (text.includes("ДОСТИЖЕНИЕ") || text.includes("РАЗБЛОКИРОВАН")) {
        playHackerSound('achievement');
    }

    let container = document.getElementById('notification-stack');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-stack';
        container.style.position = 'fixed';
        container.style.top = '25%';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.zIndex = '9999';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.style.fontFamily = "'VT323', monospace";
    notification.style.fontSize = '1.6rem';
    notification.style.color = color;
    notification.style.background = 'rgba(0, 5, 0, 0.9)';
    notification.style.border = `2px solid ${color}`;
    notification.style.padding = '8px 20px';
    notification.style.borderRadius = '4px';
    notification.style.textShadow = `0 0 8px ${color}`;
    notification.style.boxShadow = `0 0 15px rgba(0,0,0,0.5)`;
    notification.style.textAlign = 'center';
    notification.style.whiteSpace = 'nowrap';
    notification.style.animation = 'fadeNotify 3s forwards';

    notification.textContent = text;
    container.appendChild(notification);
    setTimeout(() => {
        notification.remove();
        if (container.children.length === 0) {
            container.remove();
        }
    }, 3000);
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

function checkSkillsUnlock() {
    if (!gameData.skills) return;
    if (gameData.level >= 3 && !gameData.skills.overclock.unlocked) {
        gameData.skills.overclock.unlocked = true;
        showCenterNotification("[ РАЗБЛОКИРОВАН НАВЫК: ОВЕРКЛОКИНГ (LVL 3) ]", "#00ffff");
    }
    if (gameData.level >= 5 && !gameData.skills.ddos.unlocked) {
        gameData.skills.ddos.unlocked = true;
        showCenterNotification("[ РАЗБЛОКИРОВАН НАВЫК: DDOS-ШТОРМ (LVL 5) ]", "#00ffff");
    }
    updateUI();
}

function triggerOverclock() {
    if (!gameData.skills || !gameData.skills.overclock.unlocked) return;
    if (gameData.skills.overclock.active || gameData.skills.overclock.cooldown) return;
    gameData.skills.overclock.active = true;
    gameData.skills.overclock.cooldown = true;
    updateUI();

    if (typeof showCenterNotification === 'function') {
        showCenterNotification("[АКТИВИРОВАН ОВЕРКЛОКИНГ: КЛИК Х2 НА 15 СЕКУНД!]", "#00ffff");
    }
    if (typeof playHackerSound === 'function') playHackerSound('achievement');

    setTimeout(() => {
        gameData.skills.overclock.active = false;

        updateUI();

        if (typeof showCenterNotification === 'function') {
            showCenterNotification("[ДЕЙСТВИЕ ОВЕРКЛОКИНГА ЗАВЕРШЕНО]", "#ffaa00");
        }
    }, 15000);

    setTimeout(() => {
        gameData.skills.overclock.cooldown = false;

        updateUI();

        if (typeof showCenterNotification === 'function') {
            showCenterNotification("[ОВЕРКЛОКИНГ ГОТОВ К ИСПОЛЬЗОВАНИЮ]", "#00ff66");
        }
    }, 60000);
}

function triggerDdos() {
    if (!gameData.skills || !gameData.skills.ddos.unlocked || gameData.skills.ddos.active || gameData.skills.ddos.cooldown) return;
    gameData.skills.ddos.active = true;
    gameData.skills.ddos.cooldown = true;
    updateUI();
    showCenterNotification("[ЗАПУЩЕН DDOS-ШТОРМ: ПАССИВНЫЙ ДОХОД Х3 НА 20 СЕКУНД!]", "#00ffff");
    setTimeout(() => { gameData.skills.ddos.active = false; updateUI(); showCenterNotification("[DDOS-ШТОРМ СТИХ]", "#ffaa00"); }, 20000);
    setTimeout(() => { gameData.skills.ddos.cooldown = false; updateUI(); showCenterNotification("[DDOS-ШТОРМ ГОТОВ]", "#00ff66"); }, 90000);
}

let globalAudioCtx = null;

function playHackerSound(type) {
    try {

        if (!globalAudioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            globalAudioCtx = new AudioContextClass();
        }

        if (globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume();
        }
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();

        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(850, globalAudioCtx.currentTime);

            gain.gain.setValueAtTime(0.03, globalAudioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + 0.03);

            osc.start(globalAudioCtx.currentTime);
            osc.stop(globalAudioCtx.currentTime + 0.03);

        } else if (type === 'levelup') {
            osc.type = 'square';

            osc.frequency.setValueAtTime(300, globalAudioCtx.currentTime);
            osc.frequency.setValueAtTime(450, globalAudioCtx.currentTime + 0.06);
            osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime + 0.12);
            osc.frequency.setValueAtTime(800, globalAudioCtx.currentTime + 0.18);

            gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, globalAudioCtx.currentTime + 0.25);

            osc.start(globalAudioCtx.currentTime);
            osc.stop(globalAudioCtx.currentTime + 0.25);
        } else if (type === 'achievement') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(700, globalAudioCtx.currentTime);
            osc.frequency.setValueAtTime(1050, globalAudioCtx.currentTime + 0.07);
            gain.gain.setValueAtTime(0.06, globalAudioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.001, globalAudioCtx.currentTime + 0.22);

            osc.start(globalAudioCtx.currentTime);
            osc.stop(globalAudioCtx.currentTime + 0.22);
        }
    } catch (e) {
        console.warn("Аудио временно недоступно:", e);
    }
}

setInterval(() => {
    if (Math.random() > 0.5) {
        spawnExploit();
    }
}, 180000);