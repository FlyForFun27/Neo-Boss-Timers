// --- TIMER MATH, ALERTS & OVERLAY ---
function updateTimers(nowSec, activeOffset) {
    const timerToggle = document.getElementById('timer-toggle');
    const isTimerOn = timerToggle ? timerToggle.checked : true;
    
    const soundToggle = document.getElementById('sound-toggle');
    const isGlobalSoundOn = soundToggle ? soundToggle.checked : false;
    
    const overlayToggle = document.getElementById('overlay-toggle');
    const isOverlayMode = overlayToggle ? overlayToggle.checked : false;

    const mutedRegions = JSON.parse(localStorage.getItem('neoTimerMutedRegions')) || [];
    const hiddenRegions = JSON.parse(localStorage.getItem('neoTimerHiddenRegions')) || [];

    // Dictionary to hold the closest boss for EACH region
    let nextBossesPerRegion = {};

    document.querySelectorAll('.boss-card').forEach(card => {
        const isMonarch = card.classList.contains('monarch-card');
        const countdownEl = card.querySelector('.countdown');
        const targetSec = parseInt(card.dataset.targetSec, 10);
        const bName = card.dataset.bossName;
        const regionName = card.dataset.region; 
        
        const spawnId = `${bName}_${targetSec}_${activeOffset}`;
        let timeRemaining; 

        card.classList.remove('dimmed');
        countdownEl.classList.remove('spawning');

        // Math Logic
        if (isMonarch) {
            const killTimerEl = card.querySelector('.kill-timer');
            let timeSinceKill = nowSec - targetSec;
            if (timeSinceKill < 0) timeSinceKill += 86400; 
            if (killTimerEl) killTimerEl.innerText = formatDuration(timeSinceKill * 1000);
            
            timeRemaining = 9000 - timeSinceKill; 
            if (timeRemaining > 0) {
                countdownEl.innerText = formatDuration(timeRemaining * 1000);
                card.dataset.priority = "1";
            } else {
                countdownEl.innerText = `In Window`;
                countdownEl.classList.add('spawning');
                card.dataset.priority = "0";
            }
        } else {
            timeRemaining = (targetSec + (86400 * activeOffset)) - nowSec;
            if (timeRemaining > 0) {
                countdownEl.innerText = isTimerOn ? formatDuration(timeRemaining * 1000) : `At: ${card.dataset.targetTime}`;
                card.dataset.priority = "1";
            } else if (timeRemaining <= 0 && timeRemaining > -300) { 
                countdownEl.innerText = `Spawning in: ${formatDuration((300 + timeRemaining) * 1000)}`;
                countdownEl.classList.add('spawning');
                card.dataset.priority = "0";
            } else {
                countdownEl.innerText = `Spawned`;
                card.classList.add('dimmed');
                card.dataset.priority = "2";
            }
        }

        // Overlay Logic: Find the closest boss FOR THIS SPECIFIC REGION
        if (!hiddenRegions.includes(regionName) && timeRemaining > -300) {
            if (!nextBossesPerRegion[regionName] || timeRemaining < nextBossesPerRegion[regionName].timeRemaining) {
                nextBossesPerRegion[regionName] = {
                    name: bName,
                    timeRemaining: timeRemaining,
                    text: countdownEl.innerText,
                    isSpawning: timeRemaining <= 0
                };
            }
        }

        // Audio Logic
        if (timeRemaining <= 300 && timeRemaining > -300) {
            if (isGlobalSoundOn && !mutedRegions.includes(regionName) && !window.notifiedBosses.has(spawnId)) {
                alertAudio.play().catch(e => console.log("Audio play blocked by browser."));
                window.notifiedBosses.add(spawnId); 
            }
        } else if (timeRemaining > 300) {
            window.notifiedBosses.delete(spawnId);
        }
    });

    // Handle UI Switching (Grid vs Overlay)
    const grid = document.getElementById('timers-grid');
    const overlay = document.getElementById('overlay-container');
    const overlayWidget = document.getElementById('overlay-widget');

    if (isOverlayMode) {
        grid.style.display = 'none';
        overlay.style.display = 'flex';
        
        overlayWidget.innerHTML = ''; // Clear the widget
        
        const regionsToDisplay = Object.keys(nextBossesPerRegion).sort();

        if (regionsToDisplay.length > 0) {
            regionsToDisplay.forEach(region => {
                const boss = nextBossesPerRegion[region];
                overlayWidget.innerHTML += `
                    <div class="overlay-row">
                        <div class="overlay-region-name">${region}</div>
                        <div class="overlay-boss-name">${boss.name}</div>
                        <div class="overlay-timer ${boss.isSpawning ? 'spawning' : ''}">${boss.text}</div>
                    </div>
                `;
            });
        } else {
            overlayWidget.innerHTML = `<div style="text-align: center; color: var(--text-muted);">All Clear / No Visible Regions</div>`;
        }
    } else {
        grid.style.display = 'flex';
        overlay.style.display = 'none';
        
        // Auto-Sort Grid
        document.querySelectorAll('.card-container').forEach(container => {
            const cards = Array.from(container.children);
            cards.sort((a, b) => {
                if (a.dataset.priority !== b.dataset.priority) return a.dataset.priority - b.dataset.priority;
                return parseInt(a.dataset.targetSec) - parseInt(b.dataset.targetSec);
            });
            cards.forEach(card => container.appendChild(card));
        });
    }
}
