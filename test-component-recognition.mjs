#!/usr/bin/env node

/**
 * Test that AI formatter recognizes component keywords
 * Tests the "insert long slider" → "insert component:slider" conversion
 */

const API_URL = "http://localhost:3000/api/ai/manager";

async function testComponentRecognition() {
  const testCases = [
    { input: "insert long slider", expected: "component:slider" },
    { input: "give me a color picker", expected: "component:color-picker" },
    { input: "add a toggle switch", expected: "component:toggle" },
    { input: "I need a spinner", expected: "component:spinner" },
    { input: "create a modal popup", expected: "component:modal" },
  ];

  console.log("🧪 Testing AI Component Recognition...\n");

  for (const testCase of testCases) {
    try {
      console.log(`📝 Input: "${testCase.input}"`);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: testCase.input,
          currentCanvasCode: "",
          analyzeIntent: true,
          correctErrors: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.log(`  ❌ API Error: ${result.message}`);
        console.log();
        continue;
      }

      const formattedCommand = result.formattedCommand || "";
      const hasComponent = formattedCommand.includes("component:");
      const elementSpec = result.elementSpec || {};

      console.log(`  📤 Formatted Command: "${formattedCommand}"`);
      console.log(
        `  🔍 Component Detected: ${hasComponent ? "YES ✅" : "NO ❌"}`,
      );

      if (elementSpec.isComponent) {
        console.log(`  🎯 Component Type: ${elementSpec.componentType} ✅`);
      } else if (elementSpec.type) {
        console.log(
          `  ⚠️  Got type: "${elementSpec.type}" (should be component)`,
        );
      }

      if (
        formattedCommand.includes(testCase.expected) &&
        elementSpec.isComponent
      ) {
        console.log(`  ✅ PASS: Correctly recognized as ${testCase.expected}`);
      } else {
        console.log(
          `  ❌ FAIL: Expected ${testCase.expected}, got ${elementSpec.componentType || elementSpec.type}`,
        );
      }
    } catch (err) {
      console.log(`  ❌ Network Error: ${err.message}`);
    }
    console.log();
  }

  console.log("🏁 Test complete!");
}

// Run test
testComponentRecognition().catch(console.error);
