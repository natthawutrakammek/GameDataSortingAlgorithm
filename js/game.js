/**
 * Sorting Master - Main Game Engine
 * Handles rendering, user interactions, game modes, AI duel, scoring, and confetti
 */

class SortingGame {
    constructor() {
        this.currentMode = 'campaign'; // 'campaign', 'duel', 'sandbox'
        this.currentLevelIdx = 0;
        this.currentTheme = 'book'; // 'book' or 'train'
        this.algoState = null;
        
        // Scoring & metrics
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timeSeconds = 0;
        this.timerInterval = null;
        this.isGameActive = false;

        // AI Duel specific
        this.aiState = null;
        this.aiInterval = null;
        this.aiSpeedMs = 800; // time per step for AI
        this.duelWinner = null;

        // Custom sandbox settings
        this.sandboxAlgo = 'bubble';
        this.sandboxSize = 6;

        // DOM elements cache
        this.dom = {};
        this.initDOM();
        this.initConfetti();
        this.bindEvents();

        // Start initial level
        this.loadLevel(0);
    }

    initDOM() {
        this.dom = {
            stage: document.getElementById('sorting-stage'),
            guideTitle: document.getElementById('guide-title'),
            guideMessage: document.getElementById('guide-message'),
            guideHint: document.getElementById('guide-hint'),
            guideIcon: document.getElementById('guide-icon'),
            
            levelBadge: document.getElementById('level-badge'),
            levelTitle: document.getElementById('level-title'),
            levelSubtitle: document.getElementById('level-subtitle'),
            
            statComparisons: document.getElementById('stat-comparisons'),
            statSwaps: document.getElementById('stat-swaps'),
            statTimer: document.getElementById('stat-timer'),
            statScore: document.getElementById('stat-score'),
            statCombo: document.getElementById('stat-combo'),
            
            controlDock: document.getElementById('control-dock'),
            actionLogText: document.getElementById('action-log-text'),
            
            // Modals
            theoryModal: document.getElementById('theory-modal'),
            victoryModal: document.getElementById('victory-modal'),
            levelSelectModal: document.getElementById('level-select-modal'),
            duelModal: document.getElementById('duel-modal'),
            
            // Audio toggle button
            soundToggleBtn: document.getElementById('sound-toggle-btn'),
            
            // Mode buttons
            btnModeCampaign: document.getElementById('btn-mode-campaign'),
            btnModeDuel: document.getElementById('btn-mode-duel'),
            btnModeSandbox: document.getElementById('btn-mode-sandbox')
        };
    }

    bindEvents() {
        // Sound toggle
        this.dom.soundToggleBtn.addEventListener('click', () => {
            const enabled = window.soundManager.toggle();
            this.dom.soundToggleBtn.textContent = enabled ? '🔊' : '🔇';
            this.dom.soundToggleBtn.title = enabled ? 'ปิดเสียง' : 'เปิดเสียง';
        });

        // Theme toggle buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentTheme = e.currentTarget.dataset.theme;
                window.soundManager.playClick();
                this.renderBoard();
            });
        });

        // Mode switch buttons
        this.dom.btnModeCampaign.addEventListener('click', () => this.switchMode('campaign'));
        this.dom.btnModeDuel.addEventListener('click', () => this.openDuelModal());
        this.dom.btnModeSandbox.addEventListener('click', () => this.switchMode('sandbox'));

        // Header Action buttons
        document.getElementById('btn-restart').addEventListener('click', () => {
            window.soundManager.playClick();
            this.restartCurrent();
        });
        document.getElementById('btn-levels').addEventListener('click', () => {
            window.soundManager.playClick();
            this.openLevelSelect();
        });
        document.getElementById('btn-theory').addEventListener('click', () => {
            window.soundManager.playClick();
            this.openTheoryModal();
        });

        // Close modal buttons
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Next level button in victory modal
        document.getElementById('btn-next-level').addEventListener('click', () => {
            this.dom.victoryModal.classList.remove('active');
            if (this.currentLevelIdx < GAME_LEVELS.length - 1) {
                this.loadLevel(this.currentLevelIdx + 1);
            } else {
                // Completed all levels!
                this.switchMode('sandbox');
            }
        });

        document.getElementById('btn-replay-level').addEventListener('click', () => {
            this.dom.victoryModal.classList.remove('active');
            this.restartCurrent();
        });

        // Keyboard navigation
        window.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    switchMode(mode) {
        window.soundManager.playClick();
        this.currentMode = mode;
        this.dom.btnModeCampaign.classList.toggle('active', mode === 'campaign');
        this.dom.btnModeDuel.classList.toggle('active', mode === 'duel');
        this.dom.btnModeSandbox.classList.toggle('active', mode === 'sandbox');

        if (mode === 'campaign') {
            this.loadLevel(this.currentLevelIdx);
        } else if (mode === 'sandbox') {
            this.initSandbox();
        }
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.timeSeconds = 0;
        this.dom.statTimer.textContent = "00:00";
        this.timerInterval = setInterval(() => {
            if (!this.isGameActive) return;
            this.timeSeconds++;
            const mins = Math.floor(this.timeSeconds / 60).toString().padStart(2, '0');
            const secs = (this.timeSeconds % 60).toString().padStart(2, '0');
            this.dom.statTimer.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    // ==========================================
    // LEVEL LOADING & INITIALIZATION
    // ==========================================
    loadLevel(idx) {
        this.currentLevelIdx = idx;
        const levelData = GAME_LEVELS[idx];
        this.currentTheme = levelData.theme || 'book';

        // Update Theme button UI
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === this.currentTheme);
        });

        // Setup Algo State
        this.algoState = new AlgorithmState(levelData.data, levelData.algorithm);
        this.combo = 0;
        this.isGameActive = true;

        // UI Metadata
        this.dom.levelBadge.textContent = levelData.algorithm === 'bubble' ? 'Bubble Sort' : 'Selection Sort';
        this.dom.levelBadge.style.borderColor = levelData.algorithm === 'bubble' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(245, 158, 11, 0.4)';
        this.dom.levelBadge.style.color = levelData.algorithm === 'bubble' ? 'var(--accent-blue)' : 'var(--accent-amber)';
        
        this.dom.levelTitle.textContent = levelData.title;
        this.dom.levelSubtitle.textContent = levelData.subtitle;
        
        this.dom.actionLogText.textContent = `เริ่มด่าน: ${levelData.description}`;

        this.startTimer();
        this.renderBoard();
        this.renderControls();
        this.updateStatsUI();
        this.updateGuidance();
    }

    restartCurrent() {
        if (this.currentMode === 'campaign') {
            this.loadLevel(this.currentLevelIdx);
        } else if (this.currentMode === 'sandbox') {
            this.initSandbox();
        } else if (this.currentMode === 'duel') {
            this.startDuelGame();
        }
    }

    initSandbox() {
        const data = generateDistinctArray(this.sandboxSize, 10, 99);
        this.algoState = new AlgorithmState(data, this.sandboxAlgo);
        this.combo = 0;
        this.isGameActive = true;

        this.dom.levelBadge.textContent = `Sandbox (${this.sandboxAlgo === 'bubble' ? 'Bubble' : 'Selection'})`;
        this.dom.levelTitle.textContent = `สนามทดลองอิสระ (${this.sandboxSize} ชิ้น)`;
        this.dom.levelSubtitle.textContent = "ทดลองจัดลำดับอย่างอิสระ สังเกตขั้นตอนและเปรียบเทียบอัลกอริทึม";
        this.dom.actionLogText.textContent = `สร้างชุดข้อมูลสุ่ม ${this.sandboxSize} ชิ้นเรียบร้อยแล้ว`;

        this.startTimer();
        this.renderBoard();
        this.renderControls();
        this.updateStatsUI();
        this.updateGuidance();
    }

    // ==========================================
    // RENDERING LOGIC
    // ==========================================
    renderBoard() {
        const stage = this.dom.stage;
        stage.innerHTML = '';

        if (!this.algoState) return;

        const arr = this.algoState.array;
        const maxVal = Math.max(...arr, 100);
        const minVal = Math.min(...arr, 10);

        arr.forEach((val, idx) => {
            const card = document.createElement('div');
            card.className = 'sort-item';
            card.dataset.index = idx;
            card.dataset.value = val;

            // Height scaling: between 110px and 240px
            const heightPercent = 110 + ((val - minVal) / (maxVal - minVal || 1)) * 130;
            card.style.height = `${heightPercent}px`;

            // Color gradient by value (Hue from 200 (cyan) to 340 (pink-rose))
            const hue = 190 + ((val - minVal) / (maxVal - minVal || 1)) * 140;
            card.style.background = `linear-gradient(180deg, hsl(${hue}, 80%, 42%), hsl(${hue}, 85%, 26%))`;

            // Theme visual icon
            let icon = '📖';
            let tagText = 'VOL';
            if (this.currentTheme === 'train') {
                icon = '🚃';
                tagText = 'CAR';
            }

            // Lock state
            const isLocked = this.algoState.lockedIndices.has(idx);
            if (isLocked) {
                card.classList.add('locked');
            }

            // Status highlighting depending on algorithm
            if (!this.algoState.isFinished) {
                if (this.algoState.type === 'bubble') {
                    if (idx === this.algoState.j || idx === this.algoState.j + 1) {
                        card.classList.add('comparing');
                    }
                } else if (this.algoState.type === 'selection') {
                    if (idx === this.algoState.i) {
                        card.classList.add('comparing-target');
                    }
                    // Current scan min
                    if (idx === this.algoState.minIndex && idx >= this.algoState.i) {
                        // could highlight current tracked min
                    }
                }
            }

            card.innerHTML = `
                <div class="item-tag">${tagText} #${idx + 1}</div>
                <div class="item-icon">${icon}</div>
                <div class="item-value">${val}</div>
                <div class="item-index">[${idx}]</div>
            `;

            // Click behavior
            card.addEventListener('click', () => {
                if (this.algoState.type === 'selection' && this.isGameActive) {
                    this.handleSelectionPick(idx);
                } else {
                    window.soundManager.playValueTone(val, minVal, maxVal);
                }
            });

            stage.appendChild(card);
        });

        // Add pointer tags below
        this.renderPointers();
    }

    renderPointers() {
        if (!this.algoState || this.algoState.isFinished) return;

        if (this.algoState.type === 'bubble') {
            // Pointer indicating the pair
            const items = this.dom.stage.querySelectorAll('.sort-item');
            if (items[this.algoState.j]) {
                const jEl = items[this.algoState.j];
                const jNextEl = items[this.algoState.j + 1];
                if (jNextEl) {
                    // Bubble pair active
                }
            }
        }
    }

    renderControls() {
        const dock = this.dom.controlDock;
        dock.innerHTML = '';

        if (!this.algoState || this.algoState.isFinished) {
            dock.innerHTML = `
                <button class="action-btn btn-swap" id="btn-next-action">
                    <span>🎉 ด่านนี้เสร็จสิ้นแล้ว! ดูผลคะแนน</span>
                </button>
            `;
            document.getElementById('btn-next-action')?.addEventListener('click', () => {
                this.showVictoryModal();
            });
            return;
        }

        if (this.currentMode === 'sandbox') {
            dock.innerHTML = `
                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center; background: rgba(15, 23, 42, 0.6); padding: 10px 16px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 0.82rem; color: var(--text-muted);">ขั้นตอนวิธี:</span>
                        <select id="sandbox-algo-select" style="background: var(--bg-secondary); color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-family: inherit;">
                            <option value="bubble" ${this.sandboxAlgo === 'bubble' ? 'selected' : ''}>🫧 Bubble Sort</option>
                            <option value="selection" ${this.sandboxAlgo === 'selection' ? 'selected' : ''}>🎯 Selection Sort</option>
                        </select>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 0.82rem; color: var(--text-muted);">จำนวนชิ้น:</span>
                        <select id="sandbox-size-select" style="background: var(--bg-secondary); color: #fff; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-family: inherit;">
                            <option value="4" ${this.sandboxSize === 4 ? 'selected' : ''}>4 ชิ้น</option>
                            <option value="6" ${this.sandboxSize === 6 ? 'selected' : ''}>6 ชิ้น</option>
                            <option value="8" ${this.sandboxSize === 8 ? 'selected' : ''}>8 ชิ้น</option>
                            <option value="10" ${this.sandboxSize === 10 ? 'selected' : ''}>10 ชิ้น</option>
                        </select>
                    </div>
                    <button class="action-btn btn-swap" id="btn-sandbox-new" style="padding: 6px 14px; font-size: 0.85rem;">
                        🎲 สุ่มชุดใหม่
                    </button>
                </div>
            `;

            document.getElementById('sandbox-algo-select')?.addEventListener('change', (e) => {
                this.sandboxAlgo = e.target.value;
                this.initSandbox();
            });
            document.getElementById('sandbox-size-select')?.addEventListener('change', (e) => {
                this.sandboxSize = parseInt(e.target.value);
                this.initSandbox();
            });
            document.getElementById('btn-sandbox-new')?.addEventListener('click', () => {
                this.initSandbox();
            });

            if (this.algoState.type === 'bubble') {
                const bubbleBtnWrap = document.createElement('div');
                bubbleBtnWrap.style.display = 'flex';
                bubbleBtnWrap.style.gap = '12px';
                bubbleBtnWrap.innerHTML = `
                    <button class="action-btn btn-swap" id="btn-bubble-swap">
                        <span>🔄 สลับตำแหน่ง (SWAP)</span>
                        <span class="kbd-badge">Space</span>
                    </button>
                    <button class="action-btn btn-keep" id="btn-bubble-keep">
                        <span>⏭️ ข้าม / คงเดิม (KEEP)</span>
                        <span class="kbd-badge">K</span>
                    </button>
                `;
                dock.appendChild(bubbleBtnWrap);
                document.getElementById('btn-bubble-swap')?.addEventListener('click', () => this.handleBubbleAction('SWAP'));
                document.getElementById('btn-bubble-keep')?.addEventListener('click', () => this.handleBubbleAction('KEEP'));
            } else {
                const hintSpan = document.createElement('div');
                hintSpan.style.color = 'var(--text-muted)';
                hintSpan.style.fontSize = '0.9rem';
                hintSpan.innerHTML = `👉 <strong>คลิกที่การ์ด</strong> เพื่อเลือกชิ้นที่มีค่าน้อยที่สุดในช่วง [${this.algoState.i} ถึง ${this.algoState.n - 1}]`;
                dock.appendChild(hintSpan);
            }
            return;
        }

        if (this.currentMode === 'duel') {
            const playerProgress = Math.round((this.algoState.lockedIndices.size / this.algoState.n) * 100);
            const aiProgress = this.aiState ? Math.round((this.aiState.lockedIndices.size / this.aiState.n) * 100) : 0;

            dock.innerHTML = `
                <div style="width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700;">
                        <span>👤 คุณ (Bubble Sort): ${playerProgress}%</span>
                        <span style="color: var(--accent-amber);">🤖 AI Bot (Selection Sort): ${aiProgress}%</span>
                    </div>
                    <div style="display: flex; gap: 8px; height: 10px;">
                        <div style="flex: 1; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
                            <div style="width: ${playerProgress}%; height: 100%; background: linear-gradient(90deg, #38bdf8, #22c55e); transition: width 0.3s;"></div>
                        </div>
                        <div style="flex: 1; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
                            <div style="width: ${aiProgress}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); transition: width 0.3s;"></div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="action-btn btn-swap" id="btn-bubble-swap">
                        <span>🔄 สลับ (SWAP)</span>
                        <span class="kbd-badge">Space</span>
                    </button>
                    <button class="action-btn btn-keep" id="btn-bubble-keep">
                        <span>⏭️ ข้าม (KEEP)</span>
                        <span class="kbd-badge">K</span>
                    </button>
                </div>
            `;
            document.getElementById('btn-bubble-swap')?.addEventListener('click', () => this.handleBubbleAction('SWAP'));
            document.getElementById('btn-bubble-keep')?.addEventListener('click', () => this.handleBubbleAction('KEEP'));
            return;
        }

        if (this.algoState.type === 'bubble') {
            dock.innerHTML = `
                <button class="action-btn btn-swap" id="btn-bubble-swap">
                    <span>🔄 สลับตำแหน่ง (SWAP)</span>
                    <span class="kbd-badge">Space / Enter</span>
                </button>
                <button class="action-btn btn-keep" id="btn-bubble-keep">
                    <span>⏭️ ข้าม / คงเดิม (KEEP)</span>
                    <span class="kbd-badge">K / →</span>
                </button>
            `;

            document.getElementById('btn-bubble-swap').addEventListener('click', () => this.handleBubbleAction('SWAP'));
            document.getElementById('btn-bubble-keep').addEventListener('click', () => this.handleBubbleAction('KEEP'));

        } else if (this.algoState.type === 'selection') {
            dock.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: 0.95rem;">
                    <span>👉 <strong>คลิกที่การ์ด</strong> เพื่อเลือกชิ้นที่มีค่าน้อยที่สุดในช่วง [${this.algoState.i} ถึง ${this.algoState.n - 1}]</span>
                </div>
            `;
        }
    }

    updateStatsUI() {
        if (!this.algoState) return;
        this.dom.statComparisons.textContent = this.algoState.comparisons;
        this.dom.statSwaps.textContent = this.algoState.swaps;
        this.dom.statScore.textContent = this.score;
        this.dom.statCombo.textContent = `x${this.combo}`;
        if (this.combo >= 3) {
            this.dom.statCombo.style.color = 'var(--accent-amber)';
        } else {
            this.dom.statCombo.style.color = '#fff';
        }
    }

    updateGuidance() {
        if (!this.algoState) return;

        if (this.algoState.isFinished) {
            this.dom.guideIcon.textContent = '🏆';
            this.dom.guideTitle.textContent = 'จัดเรียงสำเร็จสมบูรณ์!';
            this.dom.guideMessage.textContent = 'ข้อมูลทุกตัวเรียงจากน้อยไปมากอย่างถูกต้องแล้ว';
            this.dom.guideHint.textContent = 'กดปุ่มเพื่อดูสรุปผลการวิเคราะห์ Big-O';
            return;
        }

        if (this.algoState.type === 'bubble') {
            const j = this.algoState.j;
            const leftVal = this.algoState.array[j];
            const rightVal = this.algoState.array[j + 1];
            
            this.dom.guideIcon.textContent = '🫧';
            this.dom.guideTitle.textContent = `Bubble Sort — รอบที่ ${this.algoState.i + 1} (Pass ${this.algoState.i + 1})`;
            this.dom.guideMessage.textContent = `เปรียบเทียบช่อง [${j}] ค่า (${leftVal}) กับ ช่อง [${j + 1}] ค่า (${rightVal})`;
            
            if (leftVal > rightVal) {
                this.dom.guideHint.textContent = `💡 สังเกต: ${leftVal} > ${rightVal} (ตัวซ้ายมากกว่า) จึงควร "สลับ (SWAP)"`;
            } else {
                this.dom.guideHint.textContent = `💡 สังเกต: ${leftVal} <= ${rightVal} (เรียงถูกต้องแล้ว) จึงควร "ข้าม (KEEP)"`;
            }
        } else if (this.algoState.type === 'selection') {
            const targetI = this.algoState.i;
            this.dom.guideIcon.textContent = '🎯';
            this.dom.guideTitle.textContent = `Selection Sort — จัดตำแหน่งที่ [${targetI}]`;
            this.dom.guideMessage.textContent = `มองหา "ค่าน้อยที่สุด" ในส่วนที่เหลือ (ช่อง [${targetI}] ถึง [${this.algoState.n - 1}]) แล้วคลิกเลือก`;
            this.dom.guideHint.textContent = `💡 สแกนด้วยสายตาเพื่อหาตัวที่ต่ำที่สุด แล้วนำมาแทนที่ตำแหน่ง ${targetI}`;
        }
    }

    // ==========================================
    // ACTION HANDLERS
    // ==========================================
    handleBubbleAction(action) {
        if (!this.isGameActive || !this.algoState || this.algoState.type !== 'bubble' || this.algoState.isFinished) return;

        const currentJ = this.algoState.j;
        const currentJNext = currentJ + 1;
        const leftVal = this.algoState.array[currentJ];
        const rightVal = this.algoState.array[currentJNext];

        // Play comparison tone
        window.soundManager.playValueTone(leftVal);

        const result = this.algoState.bubbleStep(action);
        if (!result) return;

        if (result.isCorrect) {
            // Correct move!
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            const pointsEarned = 100 + (this.combo * 15);
            this.score += pointsEarned;

            if (action === 'SWAP') {
                window.soundManager.playSwap();
                this.animateItemSwap(currentJ, currentJNext);
            } else {
                window.soundManager.playValueTone(rightVal);
            }

            if (result.passCompleted) {
                window.soundManager.playLock();
            }

            this.dom.actionLogText.innerHTML = `<span style="color: var(--accent-green)">✓ ${result.message} (+${pointsEarned} แต้ม)</span>`;

        } else {
            // Incorrect move!
            this.combo = 0;
            this.score = Math.max(0, this.score - 50);
            window.soundManager.playError();
            this.dom.actionLogText.innerHTML = `<span style="color: var(--accent-rose)">✗ ${result.message} (-50 แต้ม)</span>`;
            
            // Shake current items
            const items = this.dom.stage.querySelectorAll('.sort-item');
            if (items[currentJ]) items[currentJ].classList.add('shake');
            if (items[currentJNext]) items[currentJNext].classList.add('shake');
            setTimeout(() => {
                if (items[currentJ]) items[currentJ].classList.remove('shake');
                if (items[currentJNext]) items[currentJNext].classList.remove('shake');
            }, 450);
        }

        this.updateStatsUI();
        this.updateGuidance();

        // Check if finished
        if (result.isFinished) {
            if (this.currentMode === 'duel') {
                this.handleDuelOver(true);
            } else {
                this.handleLevelComplete();
            }
        } else {
            this.renderBoard();
        }
    }

    handleSelectionPick(selectedIdx) {
        if (!this.isGameActive || !this.algoState || this.algoState.type !== 'selection' || this.algoState.isFinished) return;

        // Cannot pick already locked elements
        if (selectedIdx < this.algoState.i) {
            window.soundManager.playError();
            this.dom.actionLogText.innerHTML = `<span style="color: var(--accent-amber)">⚠️ ตำแหน่งนี้เรียงและล็อคแล้ว ให้เลือกในช่วง [${this.algoState.i} ถึง ${this.algoState.n - 1}]</span>`;
            return;
        }

        const targetI = this.algoState.i;
        const result = this.algoState.selectionSelectMinAndSwap(selectedIdx);

        if (result.isCorrect) {
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            const points = 250 + (this.combo * 30);
            this.score += points;

            if (selectedIdx !== targetI) {
                window.soundManager.playSwap();
                this.animateItemSwap(targetI, selectedIdx);
            }
            window.soundManager.playLock();

            this.dom.actionLogText.innerHTML = `<span style="color: var(--accent-green)">✓ ${result.message} (+${points} แต้ม)</span>`;

        } else {
            this.combo = 0;
            this.score = Math.max(0, this.score - 70);
            window.soundManager.playError();
            this.dom.actionLogText.innerHTML = `<span style="color: var(--accent-rose)">✗ ${result.message} (-70 แต้ม)</span>`;

            const items = this.dom.stage.querySelectorAll('.sort-item');
            if (items[selectedIdx]) items[selectedIdx].classList.add('shake');
            setTimeout(() => {
                if (items[selectedIdx]) items[selectedIdx].classList.remove('shake');
            }, 450);
        }

        this.updateStatsUI();
        this.updateGuidance();

        if (result.isFinished) {
            if (this.currentMode === 'duel') {
                this.handleDuelOver(true);
            } else {
                this.handleLevelComplete();
            }
        } else {
            this.renderBoard();
            this.renderControls();
        }
    }

    animateItemSwap(idx1, idx2) {
        const items = this.dom.stage.querySelectorAll('.sort-item');
        if (items[idx1]) items[idx1].classList.add('swapping-right');
        if (items[idx2]) items[idx2].classList.add('swapping-left');
    }

    handleLevelComplete() {
        this.isGameActive = false;
        this.stopTimer();
        window.soundManager.playVictory();
        this.triggerConfetti();
        this.renderBoard();
        this.renderControls();

        // Calculate time bonus
        const timeBonus = Math.max(0, 300 - this.timeSeconds * 5);
        this.score += timeBonus;
        this.updateStatsUI();

        setTimeout(() => {
            this.showVictoryModal();
        }, 800);
    }

    // ==========================================
    // VICTORY & SUMMARY MODAL
    // ==========================================
    showVictoryModal() {
        const modal = this.dom.victoryModal;
        const algoType = this.algoState.type;
        const theory = SortingTheory[algoType === 'bubble' ? 'bubbleSort' : 'selectionSort'];

        // Calculate star rating (1 to 3 stars based on errors & efficiency)
        const errors = this.algoState.errors;
        let stars = 1;
        if (errors === 0) stars = 3;
        else if (errors <= 2) stars = 2;

        document.getElementById('victory-stars').innerHTML = `
            <span class="star ${stars >= 1 ? 'earned' : ''}">★</span>
            <span class="star ${stars >= 2 ? 'earned' : ''}">★</span>
            <span class="star ${stars >= 3 ? 'earned' : ''}">★</span>
        `;

        document.getElementById('vic-score').textContent = this.score;
        document.getElementById('vic-comparisons').textContent = this.algoState.comparisons;
        document.getElementById('vic-swaps').textContent = this.algoState.swaps;

        // Big-O explanation specific to what just happened
        const eduBox = document.getElementById('victory-education');
        eduBox.innerHTML = `
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; text-align: left; font-size: 0.88rem;">
                <h4 style="color: var(--accent-blue); margin-bottom: 6px;">🧠 สรุปการเรียนรู้: ${theory.name}</h4>
                <p style="color: var(--text-muted); margin-bottom: 8px;">${theory.description}</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem; margin-top: 8px;">
                    <div>⏱️ <strong>Time Complexity:</strong> ${theory.averageCase}</div>
                    <div>💾 <strong>Space Complexity:</strong> ${theory.spaceComplexity}</div>
                    <div>🔄 <strong>จำนวนการสลับ (Swaps):</strong> ${this.algoState.swaps} ครั้ง</div>
                    <div>⚖️ <strong>จำนวนการเปรียบเทียบ:</strong> ${this.algoState.comparisons} ครั้ง</div>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    // ==========================================
    // MODALS HANDLING
    // ==========================================
    openTheoryModal() {
        this.dom.theoryModal.classList.add('active');
    }

    openLevelSelect() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';

        GAME_LEVELS.forEach((lvl, idx) => {
            const btn = document.createElement('div');
            btn.className = `level-card-btn ${this.currentLevelIdx === idx ? 'active' : ''}`;
            btn.innerHTML = `
                <div class="lvl-icon">${lvl.algorithm === 'bubble' ? '🫧' : '🎯'}</div>
                <div class="lvl-num">ด่านที่ ${lvl.id}</div>
                <div class="lvl-algo">${lvl.algorithm === 'bubble' ? 'Bubble Sort' : 'Selection Sort'}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">${lvl.data.length} ชิ้น</div>
            `;
            btn.addEventListener('click', () => {
                window.soundManager.playClick();
                this.dom.levelSelectModal.classList.remove('active');
                this.switchMode('campaign');
                this.loadLevel(idx);
            });
            grid.appendChild(btn);
        });

        this.dom.levelSelectModal.classList.add('active');
    }

    // ==========================================
    // AI DUEL MODE
    // ==========================================
    openDuelModal() {
        this.dom.duelModal.classList.add('active');
    }

    startDuelGame() {
        this.dom.duelModal.classList.remove('active');
        this.currentMode = 'duel';
        this.dom.btnModeCampaign.classList.remove('active');
        this.dom.btnModeSandbox.classList.remove('active');
        this.dom.btnModeDuel.classList.add('active');

        // Create same random array for both player and AI
        const sharedArray = generateDistinctArray(6, 12, 95);
        this.algoState = new AlgorithmState(sharedArray, 'bubble');
        this.aiState = new AlgorithmState(sharedArray, 'selection'); // AI uses Selection sort!
        this.duelWinner = null;
        this.isGameActive = true;

        this.dom.levelBadge.textContent = "⚔️ ALGORITHM DUEL";
        this.dom.levelTitle.textContent = "คุณ (Bubble Sort) VS AI Bot (Selection Sort)";
        this.dom.levelSubtitle.textContent = "แข่งกันจัดลำดับให้เสร็จก่อน! ดูว่าความเร็วของคุณจะชนะขั้นตอนวิธีของ AI หรือไม่";

        this.startTimer();
        this.renderBoard();
        this.renderControls();
        this.updateStatsUI();
        this.updateGuidance();

        // Start AI Loop
        clearInterval(this.aiInterval);
        this.aiInterval = setInterval(() => {
            if (!this.isGameActive || this.aiState.isFinished) return;
            this.stepAI();
        }, this.aiSpeedMs);
    }

    stepAI() {
        if (!this.aiState || this.aiState.isFinished) return;

        // AI performs Selection sort perfectly
        let trueMin = this.aiState.i;
        for (let k = this.aiState.i; k < this.aiState.n; k++) {
            if (this.aiState.array[k] < this.aiState.array[trueMin]) {
                trueMin = k;
            }
        }
        this.aiState.selectionSelectMinAndSwap(trueMin);
        if (this.currentMode === 'duel') {
            this.renderControls();
        }

        // Check if AI won
        if (this.aiState.isFinished && !this.algoState.isFinished) {
            this.duelWinner = 'AI';
            this.handleDuelOver(false);
        }
    }

    handleDuelOver(playerWon) {
        this.isGameActive = false;
        clearInterval(this.aiInterval);
        this.stopTimer();

        if (playerWon) {
            window.soundManager.playVictory();
            this.triggerConfetti();
            alert("🎉 ชัยชนะเป็นของคุณ! คุณจัดเรียง Bubble Sort เสร็จก่อนที่ AI จะเสร็จสิ้น!");
        } else {
            window.soundManager.playError();
            alert("🤖 AI ชนะ! Selection Sort จัดการสลับตำแหน่งจนครบเรียบร้อยแล้ว พยายามใหม่อีกครั้ง!");
        }
    }

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    handleKeyboard(e) {
        if (!this.isGameActive || !this.algoState) return;

        if (this.algoState.type === 'bubble') {
            if (e.code === 'Space' || e.key === 'Enter' || e.key.toLowerCase() === 's' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.handleBubbleAction('SWAP');
            } else if (e.key.toLowerCase() === 'k' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.handleBubbleAction('KEEP');
            }
        } else if (this.algoState.type === 'selection') {
            // Digits 1-9 to select item
            const num = parseInt(e.key);
            if (!isNaN(num) && num >= 1 && num <= this.algoState.n) {
                this.handleSelectionPick(num - 1);
            }
        }

        if (e.key.toLowerCase() === 'r') {
            this.restartCurrent();
        }
    }

    // ==========================================
    // CONFETTI PARTICLES
    // ==========================================
    initConfetti() {
        this.confettiCanvas = document.getElementById('confetti-canvas');
        if (!this.confettiCanvas) return;
        this.confettiCtx = this.confettiCanvas.getContext('2d');
        this.confettiParticles = [];

        window.addEventListener('resize', () => {
            this.confettiCanvas.width = window.innerWidth;
            this.confettiCanvas.height = window.innerHeight;
        });
        this.confettiCanvas.width = window.innerWidth;
        this.confettiCanvas.height = window.innerHeight;
    }

    triggerConfetti() {
        if (!this.confettiCanvas) return;
        this.confettiParticles = [];
        const colors = ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b', '#ec4899', '#ffffff'];

        for (let i = 0; i < 90; i++) {
            this.confettiParticles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 18,
                vy: (Math.random() - 0.7) * 22,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1
            });
        }

        let animFrame;
        const render = () => {
            this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
            let activeCount = 0;

            this.confettiParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.45; // gravity
                p.rotation += p.rotSpeed;
                p.opacity -= 0.012;

                if (p.opacity > 0) {
                    activeCount++;
                    this.confettiCtx.save();
                    this.confettiCtx.translate(p.x, p.y);
                    this.confettiCtx.rotate((p.rotation * Math.PI) / 180);
                    this.confettiCtx.fillStyle = p.color;
                    this.confettiCtx.globalAlpha = Math.max(0, p.opacity);
                    this.confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
                    this.confettiCtx.restore();
                }
            });

            if (activeCount > 0) {
                animFrame = requestAnimationFrame(render);
            } else {
                this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
            }
        };

        cancelAnimationFrame(animFrame);
        render();
    }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new SortingGame();
});
