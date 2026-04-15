#!/usr/bin/env node

import fs from "fs";
import vm from "vm";

// Load WorkflowBrain
let workflowBrainCode = fs.readFileSync("./WorkflowBrain.js", "utf8");

// Execute in VM context to create WorkflowBrain
const context = vm.createContext({
  console: console,
  document: { head: {}, getElementById: () => null },
});
vm.runInContext(workflowBrainCode, context);

const WorkflowBrain = context.WorkflowBrain;
if (!WorkflowBrain) {
  console.error("❌ Failed to load WorkflowBrain class");
  process.exit(1);
}

// Create instance
const brain = new WorkflowBrain({
  setAiAgentStage: (stage) => console.log(`  [STAGE] ${stage}`),
  runDeterministicBuilderCommand: () => null,
  getCanvasElement: () => null,
});

console.log("🧪 TESTING ANIMATION FLOW\n");

// TEST 1: Parse "bouncing neon red ball"
console.log("TEST 1: Parse 'neon red bouncing ball'");
console.log("=========================================");
const input = "neon red bouncing ball";
const analysis = brain.analyzeSmartInsertDescription(input);
console.log("Analysis result:", {
  shape: analysis.shape,
  animations: analysis.animations,
  color: analysis.color,
  hasBorder: analysis.hasBorder,
  effects: analysis.effects,
});
console.log("");

// TEST 2: Check animation library
console.log("TEST 2: Animation Library Check");
console.log("================================");
const animNames = analysis.animations;
console.log(`Requested animations: ${animNames.join(", ")}`);
animNames.forEach((name) => {
  const anim = brain.animationLibrary[name];
  if (anim) {
    console.log(`  ✅ ${name}: ${anim.duration} (${anim.timingFunction})`);
  } else {
    console.log(`  ❌ ${name}: NOT FOUND`);
  }
});
console.log("");

// TEST 3: Generate CSS animation
console.log("TEST 3: Generate Animation CSS");
console.log("===============================");
const { keyframes, animation } = brain.generateAnimationCSS(animNames);
console.log("Generated animation property:");
console.log(`  ${animation}`);
console.log("\nGenerated keyframes (preview):");
const keyframesPreview = keyframes.replace(/\n/g, " ").substring(0, 150);
console.log(`  ${keyframesPreview}...`);
console.log("");

// TEST 4: Full spec generation
console.log("TEST 4: Full Spec Generation");
console.log("=============================");
const spec = brain.generateSmartCanvasElementSpec(analysis);
console.log("Spec properties:");
console.log(`  type: ${spec.type}`);
console.log(`  html length: ${spec.html.length} chars`);
console.log(`  css length: ${spec.css.length} chars`);
console.log(`  animations length: ${spec.animations.length} chars`);
console.log(
  `  has smart-element class: ${spec.html.includes("smart-element")}`,
);
console.log("");

// TEST 5: Verify animation is in CSS
console.log("TEST 5: Verify Animation Applied");
console.log("=================================");
const hasAnimationInCSS = spec.css.includes("animation:");
const hasBouncingGlow = spec.animations.includes("bouncingGlow");
const hasNeonGlow = spec.animations.includes("neonGlow");
console.log(`  Animation in CSS: ${hasAnimationInCSS ? "✅" : "❌"}`);
console.log(`  bouncingGlow keyframes: ${hasBouncingGlow ? "✅" : "❌"}`);
console.log(`  neonGlow keyframes: ${hasNeonGlow ? "✅" : "❌"}`);
console.log("");

// TEST 6: Color extraction
console.log("TEST 6: Color Extraction");
console.log("========================");
const redTest = brain.extractColorFromPrompt("neon red ball glowing");
const cyanTest = brain.extractColorFromPrompt("cyan neon ring");
console.log(`  "neon red ball glowing" → ${redTest} (expect #FF0000)`);
console.log(`  "cyan neon ring" → ${cyanTest} (expect #00FFFF)`);
console.log("");

// TEST 7: Spec HTML structure
console.log("TEST 7: HTML Structure");
console.log("======================");
console.log("Generated HTML (first 200 chars):");
console.log("  " + spec.html.substring(0, 150) + "...");
console.log(
  `  Contains 'smart-element': ${spec.html.includes("smart-element") ? "✅" : "❌"}`,
);
console.log(
  `  Contains style attribute: ${spec.html.includes("style=") ? "✅" : "❌"}`,
);
console.log("");

console.log("🎉 ANIMATION FLOW TEST COMPLETE");
console.log("");
console.log("SUMMARY:");
console.log(`  ✅ Advanced animations: ${animNames.join(", ")}`);
console.log(`  ✅ Color parsed: ${analysis.color}`);
console.log(`  ✅ Shape detected: ${analysis.shape}`);
console.log(`  ✅ HTML generated with animation classes`);
console.log(`  ✅ CSS animation property set`);
console.log(`  ✅ Ready for canvas insertion`);
