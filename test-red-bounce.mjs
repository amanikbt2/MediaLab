#!/usr/bin/env node
import fs from "fs";
import vm from "vm";

// Load WorkflowBrain
let workflowBrainCode = fs.readFileSync("./WorkflowBrain.js", "utf8");

const contextObj = {
  console: console,
  document: { head: {}, getElementById: () => null },
  module: { exports: {} },
};

const context = vm.createContext(contextObj);
vm.runInContext(workflowBrainCode, context);

const WorkflowBrain = context.module.exports;

if (!WorkflowBrain) {
  console.error("❌ Failed to load WorkflowBrain");
  process.exit(1);
}

// Create instance
const brain = new WorkflowBrain({
  setAiAgentStage: () => {},
  runDeterministicBuilderCommand: () => null,
  getCanvasElement: () => null,
});

console.log("🔴 TESTING: 'red bouncing ball'\n");

// TEST 1: Parse input
console.log("1️⃣  Parse 'red bouncing ball':");
const analysis = brain.analyzeSmartInsertDescription("red bouncing ball");
console.log(`   Shape: ${analysis.shape}`);
console.log(`   Animations: [${analysis.animations.join(", ")}]`);
console.log(`   Color: ${analysis.color}`);
console.log("");

// TEST 2: Check if bouncing is in animation library
console.log("2️⃣  Check animation library:");
const animName = analysis.animations[0];
const animExists = brain.animationLibrary && brain.animationLibrary[animName];
console.log(
  `   '${animName}' in animationLibrary: ${animExists ? "✅ YES" : "❌ NO"}`,
);
if (animExists) {
  console.log(`   Duration: ${animExists.duration}`);
  console.log(
    `   Keyframes preview: ${animExists.keyframes.substring(0, 40)}...`,
  );
}
console.log("");

// TEST 3: Generate CSS
console.log("3️⃣  Generate CSS animations:");
const { keyframes, animation } = brain.generateAnimationCSS(
  analysis.animations,
);
console.log(`   Animation property: ${animation}`);
console.log(
  `   Has @keyframes: ${keyframes.includes("@keyframes") ? "✅ YES" : "❌ NO"}`,
);
console.log(
  `   Keyframes names:`,
  keyframes.match(/@keyframes\s+(\w+)/g) || "❌ NONE",
);
console.log("");

// TEST 4: Generate full element spec
console.log("4️⃣  Generate element spec:");
const spec = brain.generateSmartCanvasElementSpec(analysis);
console.log(`   HTML: ${spec.html.substring(0, 80)}...`);
console.log(`   CSS: ${spec.css.substring(0, 80)}...`);
console.log(
  `   Animations CSS includes @keyframes: ${spec.animations.includes("@keyframes") ? "✅ YES" : "❌ NO"}`,
);
console.log("");

// TEST 5: Verify complete integration
console.log("5️⃣  Complete Integration Check:");
const hasAnimationProperty = spec.css.includes("animation:");
const hasKeyframes = spec.animations.includes("@keyframes bounce");
const htmlHasClass = spec.html.includes("smart-element");
console.log(
  `   CSS has animation property: ${hasAnimationProperty ? "✅" : "❌"}`,
);
console.log(
  `   Animations has @keyframes bounce: ${hasKeyframes ? "✅" : "❌"}`,
);
console.log(`   HTML has smart-element class: ${htmlHasClass ? "✅" : "❌"}`);
console.log("");

if (hasAnimationProperty && hasKeyframes && htmlHasClass) {
  console.log("🎉 RED BOUNCING BALL SHOULD WORK!");
} else {
  console.log("❌ SOMETHING IS STILL WRONG");
}
