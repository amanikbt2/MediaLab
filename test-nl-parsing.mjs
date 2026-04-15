#!/usr/bin/env node
/**
 * Test Natural Language Parsing
 * Tests the WorkflowBrain parsing against real user commands
 */

import WorkflowBrain from "./WorkflowBrain.js";

const brain = new WorkflowBrain({
  setAiAgentStage: (stage) => console.log(`  [Stage] ${stage}`),
  runDeterministicBuilderCommand: () => null,
  getCanvasElement: () => null,
});

// Test cases
const testCommands = [
  "insert a red button at the top of the canvas and make it round and blue outline at left and right",
  "bouncing neon ring with glow",
  "big blue button with yellow text",
  "animated gradient box at top center",
  "make cat picture background",
  "drop a button with left and top outline slightly bigger and yellow with text saying click me at top of canvas",
];

console.log("\n========== NATURAL LANGUAGE PARSING TEST ==========\n");

testCommands.forEach((cmd, idx) => {
  console.log(`\n📝 Test ${idx + 1}: "${cmd}"\n`);

  // Step 1: Detect Intent
  const intentCheck = brain.detectInsertIntent(cmd);
  console.log(`✓ Intent Detection:`);
  console.log(`  - Detected: ${intentCheck.isIntent}`);
  console.log(`  - Confidence: ${(intentCheck.confidence * 100).toFixed(1)}%`);
  console.log(`  - Type: ${intentCheck.type}`);

  if (!intentCheck.isIntent) {
    console.log(`\n⚠️  Not an insert intent - skipping detailed parsing\n`);
    return;
  }

  // Step 2: Parse Natural Language Intent
  const nlIntent = brain.parseNaturalLanguageIntent(cmd);
  console.log(`\n✓ Natural Language Intent:`);
  console.log(`  - Primary Intent: ${nlIntent.primaryIntent}`);
  console.log(`  - Detected Intents: ${nlIntent.detectedIntents.join(", ")}`);

  // Step 3: Smart Insert Analysis
  const smartAnalysis = brain.analyzeSmartInsertDescription(cmd);
  console.log(`\n✓ Smart Analysis:`);
  console.log(`  - Shape/Type: ${smartAnalysis.shape}`);
  console.log(
    `  - Animations: ${smartAnalysis.animations.join(", ") || "none"}`,
  );
  console.log(`  - Color: ${smartAnalysis.color}`);
  console.log(`  - Size: ${smartAnalysis.size}`);
  console.log(
    `  - Border: ${smartAnalysis.hasBorder ? smartAnalysis.borderPosition || "all sides" : "none"}`,
  );
  console.log(`  - Effects: ${smartAnalysis.effects.join(", ") || "none"}`);
  console.log(`  - Is Complex: ${smartAnalysis.isComplex}`);

  // Step 4: Semantic Data Extraction
  console.log(`\n✓ Semantic Data (from parseNaturalLanguageIntent):`);
  const semantic = nlIntent.semantic;
  console.log(`  - Element Type: ${semantic.elementType || "not detected"}`);
  console.log(
    `  - Colors: ${semantic.colors ? semantic.colors.map((c) => `${c.name}(${c.value})`).join(", ") : "none"}`,
  );
  console.log(`  - Animations: ${semantic.animations.join(", ") || "none"}`);
  console.log(`  - Position: ${semantic.position?.position || "center"}`);
  console.log(`  - Text Content: ${semantic.textContent || "none"}`);
  console.log(
    `  - Size Category: ${semantic.size.sizeCategory} (×${semantic.size.sizeMultiplier})`,
  );
  console.log(
    `  - Special Effects: ${semantic.specialEffects ? semantic.specialEffects.join(", ") : "none"}`,
  );
  console.log(
    `  - Border Info: ${semantic.borderInfo?.sides.join(", ") || "none"}`,
  );

  console.log("\n" + "─".repeat(60));
});

console.log("\n========== PARSING COMPLETE ==========\n");
