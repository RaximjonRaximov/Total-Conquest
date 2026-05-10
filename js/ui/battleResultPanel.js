// ============================================================
// BATTLE RESULT PANEL — DeployPanel.showResult() ga yo'naltiradi
// ============================================================

const BattleResultPanel = {
    show(stars, percent, loot, trophyChange, xp, victory) {
        DeployPanel.showResult(victory, stars, loot, percent, xp, trophyChange);
    },

    close() {
        DeployPanel._closeResult();
    }
};
