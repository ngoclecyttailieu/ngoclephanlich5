const fs = require('fs');
let code = fs.readFileSync('src/services/schedulerService.ts.fixed', 'utf8');

const regex = /const remainingTheory = override\?\.overrideRemainingTheory !== undefined[\s\S]*?result\.push\(\{/g;

const replace = `
      const hasOverride = !!(
        override?.overrideRemainingTheory !== undefined ||
        override?.overrideRemainingPractice !== undefined ||
        override?.overrideRemainingClinical !== undefined
      );

      const remainingTheory = override?.overrideRemainingTheory !== undefined
        ? override.overrideRemainingTheory
        : Math.max(0, initialTheory - usedTheory);
        
      const remainingPractice = override?.overrideRemainingPractice !== undefined
        ? override.overrideRemainingPractice
        : (remainingPracticeGroup1 + remainingPracticeGroup2);
        
      const remainingClinical = override?.overrideRemainingClinical !== undefined
        ? override.overrideRemainingClinical
        : Math.max(0, initialClinical - usedClinical);

      const effectiveInitialTheory = usedTheory + remainingTheory;
      // For practice, if not overriden, it's initialPractice. If overriden, it's used + remaining (combined)
      const effectiveInitialPractice = override?.overrideRemainingPractice !== undefined 
        ? usedPractice + remainingPractice 
        : initialPractice;
      const effectiveInitialClinical = usedClinical + remainingClinical;

      // Total target across curriculum: Theory + (Practice per group * 2 if split into 2 groups, or Practice) + Clinical
      const targetPracticeTotal = initialPractice * 2; // Total student group practice load
      
      const totalUsed = usedTheory + usedPractice + usedClinical;
      const totalRemaining = remainingTheory + remainingPractice + remainingClinical;
      
      const effectiveTotalInitial = hasOverride ? (totalUsed + totalRemaining) : (initialTheory + (initialPractice > 0 ? targetPracticeTotal : 0) + initialClinical);

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
                              (initialClinical === 0 ? isClinicalFinished : remainingClinical <= 0);

      result.push({
`;

code = code.replace(regex, replace);

fs.writeFileSync('src/services/schedulerService.ts', code);
