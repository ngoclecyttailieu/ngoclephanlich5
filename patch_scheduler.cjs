const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const originalBlock = `      const targetPracticeTotal = initialPractice * 2; // Total student group practice load
      const totalInitial = initialTheory + (initialPractice > 0 ? targetPracticeTotal : 0) + initialClinical;
      const totalUsed = usedTheory + usedPractice + usedClinical;
      const totalRemaining = remainingTheory + remainingPractice + remainingClinical;
      
      const percentageCompleted = totalInitial > 0
        ? Math.min(100, Math.round((totalUsed / totalInitial) * 100))
        : 100;

      const isTheoryFinished = initialTheory > 0 && remainingTheory <= 0;
      // Practice is finished when BOTH Tổ 1 and Tổ 2 have reached required practice periods
      const isPracticeFinished = initialPractice > 0 && remainingPracticeGroup1 <= 0 && remainingPracticeGroup2 <= 0;
      const isClinicalFinished = initialClinical > 0 && remainingClinical <= 0;

      const isFullyFinished = (initialTheory === 0 || isTheoryFinished) &&
                              (initialPractice === 0 || isPracticeFinished) &&
                              (initialClinical === 0 || isClinicalFinished);

      const hasOverride = !!(
        override?.overrideRemainingTheory !== undefined ||
        override?.overrideRemainingPractice !== undefined ||
        override?.overrideRemainingClinical !== undefined
      );`;

const newBlock = `      const hasOverride = !!(
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

code = code.replace(originalBlock, newBlock);
fs.writeFileSync('src/services/schedulerService.ts', code);
