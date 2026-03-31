// Stonekeep - Main Entry Point
'use strict';

(function() {
    // Boot sequence
    Renderer.init();
    UI.init();
    Input.init();
    EventLog.init();
    KnowledgeBase.init();

    let minimapTimer = 0;
    const MINIMAP_INTERVAL = 500; // Update minimap every 500ms
    let lastMinimapUpdate = 0;

    function mainLoop(now) {
        // Update game logic
        Game.update(now);

        // Render
        Renderer.renderWorld();

        // Update animation (water etc.)
        if (Math.floor(now / 300) !== Math.floor((now - 16) / 300)) {
            Renderer.updateAnimation();
        }

        // Update minimap periodically
        if (now - lastMinimapUpdate > MINIMAP_INTERVAL) {
            Renderer.renderMinimap();
            lastMinimapUpdate = now;
        }

        // Update HUD
        if (World.gamePhase === 'playing' || World.gamePhase === 'setup') {
            UI.updateHUD();
        }

        requestAnimationFrame(mainLoop);
    }

    requestAnimationFrame(mainLoop);
})();
