# Builder AI Agents - Quick Reference

## One-Liner API

```javascript
// Convert canvas to production code
const html = await BuilderAIAgents.convertForRun(sourceHtml, currentUser);

// Convert code back to canvas
const html = await BuilderAIAgents.convertToVisual(sourceHtml, currentUser);

// Validate code quality
const score = BuilderAIAgents.validate(html).score; // 0-100
```

## Available Agents

### CanvasDecompiler

```javascript
BuilderAIAgents.CanvasDecompiler.decompile(html, options)
  .normalizeCanvasElements() // Clean up canvas markup
  .cleanStyles() // Keep only critical CSS
  .normalizeElementSpacing() // Fix pixel values
  .generateSemanticHtml(); // Create valid HTML
```

### RunCodeConverter

```javascript
BuilderAIAgents.RunCodeConverter.convert(html, options)
  .isValidHtml() // Check structure
  .repairHtmlStructure() // Fix broken markup
  .removeDevTools() // Strip editor code
  .inlineAssets() // Embed CSS/JS
  .minifyHtml(); // Compress output
```

### VisualCompiler

```javascript
BuilderAIAgents.VisualCompiler.compile(html, options)
  .addCanvasMarkup() // Add data attributes
  .prepareForDragDrop(); // Enable interactions
```

### CodeValidator

```javascript
BuilderAIAgents.CodeValidator.validate(html, mode);
// Returns: { score, issues, warnings, isValid, summary }

BuilderAIAgents.CodeValidator.validateWithAI(html, user, mode);
// Auto-fixes issues with AI if available
```

### Orchestrator

```javascript
// Full pipeline with all agents
BuilderAIAgents.convertForRun(html, user);
BuilderAIAgents.convertToVisual(html, user);
```

## Real-World Examples

### Example 1: Run Preview with Validation

```javascript
async function enhancedRunPreview() {
  const canvas = document.getElementById("web-canvas");
  const html = canvas.innerHTML;

  const result = await BuilderAIAgents.convertForRun(html, currentUser);

  if (result.success) {
    console.log(`Quality: ${result.validation.score}/100`);
    displayPreview(result.html);
  } else {
    console.error("Conversion failed:", result.error);
  }
}
```

### Example 2: Code Quality Check

```javascript
function checkCodeQuality() {
  const code = editorElement.value;
  const validation = BuilderAIAgents.validate(code, "run");

  console.log(`Issues: ${validation.issues.length}`);
  console.log(`Warnings: ${validation.warnings.length}`);
  console.log(`Score: ${validation.score}%`);

  if (!validation.isValid) {
    showIssues(validation.issues);
  }
}
```

### Example 3: Visual Compilation

```javascript
async function smartCompileToVisual() {
  const code = getEditorCode();

  // Try smart compilation first
  if (typeof BuilderAIAgents !== "undefined") {
    const result = await BuilderAIAgents.convertToVisual(code, currentUser);

    if (result.success) {
      applyToCanvas(result.html);
      showFeedback(`Quality: ${result.validation.summary}`);
      return;
    }
  }

  // Fallback
  const fallback = await basicConversion(code);
  applyToCanvas(fallback);
}
```

## Options Reference

### convertForRun(html, user, options)

```javascript
{
  removeDevTools: true,      // Remove editor markup
  inlineAssets: false,       // Embed CSS/JS
  minifyOutput: false,       // Compress HTML
  validateStructure: true    // Check validity
}
```

### convertToVisual(html, user, options)

```javascript
{
  preserveIds: true,         // Keep element IDs
  addCanvasMarkup: true,     // Add data attrs
  prepareForDragDrop: true   // Enable interactions
}
```

### CanvasDecompiler.decompile(html, options)

```javascript
{
  includeStyles: true,       // Extract CSS
  normalizeSpacing: true,    // Fix pixels
  stripEditorData: true      // Remove builder markup
}
```

## Return Values

### convertForRun/convertToVisual Result

```javascript
{
  success: boolean,          // Operation succeeded
  html: string,              // Converted HTML
  validation: {              // Quality data
    score: 0-100,
    issues: string[],
    warnings: string[],
    isValid: boolean,
    summary: string
  },
  duration: number,          // Milliseconds
  steps: string[],           // Steps taken
  error?: string,            // Error message
  fallback?: boolean         // Used fallback
}
```

### validate Result

```javascript
{
  score: 0-100,              // Quality score
  issues: string[],          // Critical problems
  warnings: string[],        // Non-critical items
  isValid: boolean,          // All checks passed
  summary: string            // Human readable
}
```

## Performance Tips

✓ Cache results when converting multiple times

```javascript
const cache = new Map();
const key = html + mode;
if (cache.has(key)) return cache.get(key);
const result = await BuilderAIAgents.convertForRun(html, user);
cache.set(key, result);
```

✓ Validate before converting

```javascript
const valid = BuilderAIAgents.validate(html).isValid;
if (valid) await convert(html); // Skip processing if clean
```

✓ Use batch operations

```javascript
const results = await Promise.all(
  files.map((f) => BuilderAIAgents.convertForRun(f.html, user)),
);
```

## Fallback Behavior

System automatically falls back if:

- BuilderAIAgents not loaded → Uses basic API
- API unavailable → Returns original HTML
- Parsing fails → Attempts repair
- Validation fails → Returns with error flag

No manual fallback handling needed!

## Browser Console Debugging

```javascript
// Check if agents loaded
console.log(typeof BuilderAIAgents); // 'object' = ready

// Direct agent access
BuilderAIAgents.CanvasDecompiler;
BuilderAIAgents.RunCodeConverter;
BuilderAIAgents.VisualCompiler;
BuilderAIAgents.CodeValidator;
BuilderAIAgents.Orchestrator;

// Test conversion
const test = await BuilderAIAgents.convertForRun("<div>test</div>");
console.log(test);
```

## Common Patterns

### Pattern 1: Auto-validation on save

```javascript
function saveWithValidation(code) {
  const validation = BuilderAIAgents.validate(code);
  if (validation.score < 80) {
    showWarning(`Low quality: ${validation.summary}`);
  }
  save(code);
}
```

### Pattern 2: Progressive enhancement

```javascript
async function smartRun(html) {
  // Try advanced conversion
  try {
    const advanced = await BuilderAIAgents.convertForRun(html, user);
    if (advanced.success) return advanced.html;
  } catch (e) {
    console.warn("Advanced failed, using basic");
  }

  // Fallback to basic
  return await basicConversion(html);
}
```

### Pattern 3: Quality feedback loop

```javascript
async function optimizeAndRun(html) {
  let current = html;
  let prevScore = 0;

  for (let i = 0; i < 3; i++) {
    const result = await BuilderAIAgents.convertForRun(current, user);
    current = result.html;

    if (result.validation.score <= prevScore) break;
    prevScore = result.validation.score;
  }

  return current;
}
```

## Troubleshooting

| Problem            | Solution                              |
| ------------------ | ------------------------------------- |
| Agents undefined   | Ensure builder-ai-agents.js is loaded |
| Low quality score  | Run validation first, fix issues      |
| Conversion timeout | Use smaller HTML, increase timeout    |
| Fallback mode      | Check /api/ai/chat-edit availability  |
| Memory issues      | Clear cache, process in chunks        |
