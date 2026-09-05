const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const replacement = `      const hasOverride = !!(
        override?.overrideRemainingTheory !== undefined ||
        override?.overrideRemainingPractice !== undefined ||
        override?.overrideRemainingClinical !== undefined
      );

      const targetPracticeTotal = initialPractice * 2; // Total student group practice load
      const originalTotalInitial = initialTheory + (initialPractice > 0 ? targetPracticeTotal : 0) + initialClinical;
      const totalUsed = usedTheory + usedPractice + usedClinical;
      const totalRemaining = remainingTheory + remainingPractice + remainingClinical;
      
      // If manually overridden, the effective total is what was used plus what remains
      const totalInitial = hasOverride ? (totalUsed + totalRemaining) : originalTotalInitial;

      const percentageCompleted = totalInitial > 0
        ? Math.min(100, Math.round((totalUsed / totalInitial) * 100))
        : (totalRemaining === 0 ? 100 : 0);

      const isTheoryFinished = remainingTheory <= 0;
      
      const isPracticeFinished = override?.overrideRemainingPractice !== undefined 
        ? remainingPractice <= 0 
        : (remainingPracticeGroup1 <= 0 && remainingPracticeGroup2 <= 0);
        
      const isClinicalFinished = remainingClinical <= 0;

      const isFullyFinished = (initialTheory === 0 ? isTheoryFinished : remainingTheory <= 0) &&
                              (initialPractice === 0 ? isPracticeFinished : isPracticeFinished) &&
                              (initialClinical === 0 ? isClinicalFinished : remainingClinical <= 0);`;

const lines = code.split('\\n');
lines.splice(176, 22, replacement);
fs.writeFileSync('src/services/schedulerService.ts', lines.join('\\n'));
