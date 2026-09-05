const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts', 'utf8');

const regex = /const percentageCompleted = totalInitial > 0[\s\S]*?const isFullyFinished = [\s\S]*?;/;

const replace = `const hasOverride = !!(
        override?.overrideRemainingTheory !== undefined ||
        override?.overrideRemainingPractice !== undefined ||
        override?.overrideRemainingClinical !== undefined
      );

      // If manually overridden, the effective total is what was used plus what remains
      const effectiveTotalInitial = hasOverride ? (totalUsed + totalRemaining) : totalInitial;

      const percentageCompleted = effectiveTotalInitial > 0
        ? Math.min(100, Math.round((totalUsed / effectiveTotalInitial) * 100))
        : (totalRemaining === 0 ? 100 : 0);

      const isTheoryFinished = remainingTheory <= 0;
      
      const isPracticeFinished = override?.overrideRemainingPractice !== undefined 
        ? remainingPractice <= 0 
        : (remainingPracticeGroup1 <= 0 && remainingPracticeGroup2 <= 0);
        
      const isClinicalFinished = remainingClinical <= 0;

      const isFullyFinished = (initialTheory === 0 ? isTheoryFinished : remainingTheory <= 0) &&
                              (initialPractice === 0 ? isPracticeFinished : isPracticeFinished) &&
                              (initialClinical === 0 ? isClinicalFinished : remainingClinical <= 0);`;

code = code.replace(regex, replace);

// Remove the old hasOverride definition
code = code.replace(/const hasOverride = !!\([\s\S]*?\);/, "");

fs.writeFileSync('src/services/schedulerService.ts', code);
