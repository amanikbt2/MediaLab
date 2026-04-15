/**
 * MediaLab Builder AI Agents System
 * Specialized agents for accurate code generation and canvas synchronization
 *
 * Components:
 * 1. Canvas Decompiler - Converts canvas objects to semantic code
 * 2. Run Code Converter - Production-ready HTML generator
 * 3. Visual Compiler - Code to canvas-ready format
 * 4. Code Validator - Quality assurance and error detection
 */

const BuilderAIAgents = (() => {
  /**
   * CANVAS DECOMPILER AGENT
   * Extracts canvas objects and converts to real semantic code
   */
  const CanvasDecompiler = {
    async decompile(canvasHtml, options = {}) {
      const {
        includeStyles = true,
        normalizeSpacing = true,
        stripEditorData = true,
      } = options;

      try {
        // Parse canvas HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(canvasHtml, "text/html");

        // Extract canvas elements
        const canvasElements = doc.querySelectorAll(
          "[data-canvas-element], .ml-container, [data-builder-*]",
        );

        if (canvasElements.length === 0) {
          return canvasHtml; // No canvas elements, return as-is
        }

        // Normalize elements
        const normalized = this.normalizeCanvasElements(canvasElements, {
          stripEditorData,
        });

        // Apply spacing normalization if needed
        if (normalizeSpacing) {
          this.normalizeElementSpacing(normalized);
        }

        // Generate clean semantic HTML
        const cleanHtml = this.generateSemanticHtml(normalized, {
          includeStyles,
        });

        return cleanHtml;
      } catch (error) {
        console.error("Canvas decompilation error:", error);
        return canvasHtml; // Fallback to original
      }
    },

    normalizeCanvasElements(elements, options = {}) {
      const { stripEditorData = true } = options;
      const normalized = [];

      elements.forEach((el) => {
        const clone = el.cloneNode(true);

        // Remove editor-specific attributes and classes
        if (stripEditorData) {
          // Remove data-builder-* attributes
          Array.from(clone.attributes).forEach((attr) => {
            if (
              attr.name.startsWith("data-builder-") ||
              attr.name.startsWith("data-canvas-edit-") ||
              attr.name === "contenteditable"
            ) {
              clone.removeAttribute(attr.name);
            }
          });

          // Remove editor classes
          clone.classList.remove(
            ...Array.from(clone.classList).filter(
              (c) =>
                c.includes("editor") ||
                c.includes("selected") ||
                c.includes("draggable-mirror"),
            ),
          );
        }

        // Preserve semantic structure and inline styles
        this.cleanStyles(clone);
        normalized.push(clone);
      });

      return normalized;
    },

    cleanStyles(element) {
      const style = element.getAttribute("style") || "";

      // Keep only layout-critical styles
      const criticalProps = [
        "position",
        "left",
        "top",
        "width",
        "height",
        "display",
        "flexDirection",
        "justifyContent",
        "alignItems",
        "gap",
        "padding",
        "margin",
        "backgroundColor",
        "color",
        "fontSize",
        "fontFamily",
        "fontWeight",
        "borderRadius",
        "border",
      ];

      const styleObj = {};
      style.split(";").forEach((rule) => {
        const [prop, val] = rule.split(":").map((s) => s.trim());
        if (
          prop &&
          criticalProps.some((cp) =>
            prop.toLowerCase().includes(cp.toLowerCase()),
          )
        ) {
          styleObj[prop] = val;
        }
      });

      const cleanedStyle = Object.entries(styleObj)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");

      if (cleanedStyle) {
        element.setAttribute("style", cleanedStyle);
      } else {
        element.removeAttribute("style");
      }
    },

    normalizeElementSpacing(elements) {
      elements.forEach((el) => {
        const style = el.getAttribute("style") || "";
        // Ensure consistent pixel values for positioning
        const normalized = style.replace(
          /(\d+(?:\.\d+)?)(px)?(?=[;\s]|$)/g,
          (match, num, unit) => {
            return `${Math.round(parseFloat(num) * 2) / 2}${unit || "px"}`;
          },
        );

        if (normalized) {
          el.setAttribute("style", normalized);
        }
      });
    },

    generateSemanticHtml(elements, options = {}) {
      const { includeStyles = true } = options;
      let html =
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>MediaLab Project</title>\n';

      // Extract and include styles
      if (includeStyles) {
        const styles = this.extractCriticalStyles(elements);
        if (styles) {
          html += `  <style>\n${styles}\n  </style>\n`;
        }
      }

      html += "</head>\n<body>\n";

      // Add elements
      elements.forEach((el) => {
        html += `  ${el.outerHTML}\n`;
      });

      html += "</body>\n</html>";

      return html;
    },

    extractCriticalStyles(elements) {
      const styles = [];
      elements.forEach((el) => {
        if (el.id) {
          const cssRule = `#${CSS.escape(el.id)} { ${el.getAttribute("style") || ""} }`;
          styles.push(cssRule);
        }
      });
      return styles.length > 0 ? styles.join("\n") : "";
    },
  };

  /**
   * RUN CODE CONVERTER AGENT
   * Converts canvas HTML to production-ready runnable HTML
   */
  const RunCodeConverter = {
    async convert(sourceHtml, options = {}) {
      const {
        removeDevTools = true,
        inlineAssets = false,
        minifyOutput = false,
        validateStructure = true,
      } = options;

      try {
        let html = String(sourceHtml).trim();

        // Verify HTML structure
        if (validateStructure && !this.isValidHtml(html)) {
          console.warn("Invalid HTML structure detected, attempting repair");
          html = this.repairHtmlStructure(html);
        }

        // Remove dev tools if enabled
        if (removeDevTools) {
          html = this.removeDevTools(html);
        }

        // Inline assets if needed
        if (inlineAssets) {
          html = await this.inlineAssets(html);
        }

        // Minify if requested
        if (minifyOutput) {
          html = this.minifyHtml(html);
        }

        return html;
      } catch (error) {
        console.error("Run code conversion error:", error);
        return sourceHtml; // Fallback
      }
    },

    isValidHtml(html) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        // Check for parsing errors
        const parseError = doc.querySelector("parsererror");
        return !parseError;
      } catch {
        return false;
      }
    },

    repairHtmlStructure(html) {
      // Ensure proper DOCTYPE and root elements
      if (!html.toLowerCase().includes("<!doctype html>")) {
        html = "<!DOCTYPE html>" + html;
      }

      if (!html.toLowerCase().includes("<html")) {
        html = `<html lang="en">${html}</html>`;
      }

      // Ensure head and body
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      if (!doc.head) {
        const head = doc.createElement("head");
        doc.documentElement.insertBefore(head, doc.body);
      }

      if (!doc.body) {
        doc.documentElement.appendChild(doc.createElement("body"));
      }

      return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    },

    removeDevTools(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Remove editor/dev elements
      const devSelectors = [
        "[data-builder-*]",
        ".ml-editor-toolbar",
        ".builder-*",
        "[contenteditable]",
      ];

      devSelectors.forEach((selector) => {
        try {
          doc.querySelectorAll(selector).forEach((el) => el.remove());
        } catch {}
      });

      return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    },

    async inlineAssets(html) {
      // Placeholder for asset inlining logic
      return html;
    },

    minifyHtml(html) {
      return html.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
    },
  };

  /**
   * VISUAL COMPILER AGENT
   * Converts production code back to canvas-ready format
   */
  const VisualCompiler = {
    async compile(sourceHtml, options = {}) {
      const {
        preserveIds = true,
        addCanvasMarkup = true,
        prepareForDragDrop = true,
      } = options;

      try {
        const parser = new DOMParser();
        let doc = parser.parseFromString(sourceHtml, "text/html");

        // Add canvas preparation markup
        if (addCanvasMarkup) {
          doc = this.addCanvasMarkup(doc, { preserveIds });
        }

        // Prepare for drag-drop if needed
        if (prepareForDragDrop) {
          this.prepareForDragDrop(doc);
        }

        return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
      } catch (error) {
        console.error("Visual compilation error:", error);
        return sourceHtml;
      }
    },

    addCanvasMarkup(doc, options = {}) {
      const { preserveIds = true } = options;

      // Mark main content containers
      const bodyEl = doc.body;
      if (bodyEl && !bodyEl.hasAttribute("data-canvas-root")) {
        bodyEl.setAttribute("data-canvas-root", "true");
      }

      // Mark direct children as canvas elements
      Array.from(bodyEl?.children || []).forEach((el, idx) => {
        if (!el.hasAttribute("data-canvas-element")) {
          el.setAttribute("data-canvas-element", idx.toString());

          // Preserve ID if present
          if (preserveIds && el.id) {
            el.setAttribute("data-element-id", el.id);
          }
        }
      });

      return doc;
    },

    prepareForDragDrop(doc) {
      // Add drag-drop ready attributes
      doc.querySelectorAll("[data-canvas-element]").forEach((el) => {
        el.setAttribute("draggable", "true");
        el.setAttribute("data-draggable", "true");
      });
    },
  };

  /**
   * CODE VALIDATOR AGENT
   * Validates and scores generated code quality
   */
  const CodeValidator = {
    validate(html, mode = "run") {
      const issues = [];
      const warnings = [];

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // Check DOCTYPE
      if (!html.toLowerCase().includes("<!doctype html>")) {
        issues.push("Missing DOCTYPE declaration");
      }

      // Check structure
      if (!doc.documentElement) {
        issues.push("Missing html element");
      }
      if (!doc.head) {
        warnings.push("Missing head element");
      }
      if (!doc.body) {
        issues.push("Missing body element");
      }

      // Validate scripts
      doc.querySelectorAll("script[src]").forEach((script) => {
        const src = script.getAttribute("src");
        if (!src || src.includes("builder") || src.includes("editor")) {
          issues.push(`Suspicious script: ${src}`);
        }
      });

      // Check for dev attributes
      const devAttrs = doc.querySelectorAll(
        "[data-builder-*], [contenteditable]",
      );
      if (devAttrs.length > 0) {
        warnings.push(`Found ${devAttrs.length} editor-specific attributes`);
      }

      // Validate CSS
      doc.querySelectorAll("style").forEach((style, idx) => {
        if (!style.textContent.trim()) {
          warnings.push(`Empty style tag at index ${idx}`);
        }
      });

      // Calculate quality score
      const score = 100 - (issues.length * 10 + warnings.length * 3);

      return {
        score: Math.max(0, Math.min(100, score)),
        issues,
        warnings,
        isValid: issues.length === 0,
        summary: `${issues.length} issues, ${warnings.length} warnings`,
      };
    },

    async validateWithAI(html, currentUser, mode = "run") {
      if (!currentUser) return this.validate(html, mode);

      try {
        const validation = this.validate(html, mode);

        // If validation fails, use AI to fix
        if (validation.issues.length > 0) {
          const fixPrompt =
            mode === "run"
              ? "Fix any HTML structure issues and return only valid, runnable HTML"
              : "Fix any canvas compatibility issues and return canvas-ready HTML";

          const fixed = await this.aiFixHtml(html, fixPrompt);
          return { ...validation, fixed };
        }

        return validation;
      } catch (error) {
        console.error("AI validation error:", error);
        return this.validate(html, mode);
      }
    },

    async aiFixHtml(html, prompt) {
      try {
        const res = await fetch("/api/ai/chat-edit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "edit",
            prompt,
            currentCode: html,
          }),
        });

        const data = await res.json().catch(() => ({}));
        return res.ok && data.success ? String(data.updatedCode || "") : html;
      } catch {
        return html;
      }
    },
  };

  /**
   * ORCHESTRATOR
   * Coordinates all agents for optimal conversion
   */
  const Orchestrator = {
    async convertForRun(sourceHtml, currentUser = null, options = {}) {
      const startTime = performance.now();

      try {
        // Step 1: Decompile canvas objects
        const decompiled = await CanvasDecompiler.decompile(
          sourceHtml,
          options,
        );

        // Step 2: Convert to production code
        const converted = await RunCodeConverter.convert(decompiled, options);

        // Step 3: Validate output
        const validation = await CodeValidator.validateWithAI(
          converted,
          currentUser,
          "run",
        );

        // Step 4: Use AI fix if needed
        let finalHtml = validation.fixed || converted;

        // Step 5: Final AI polish if all looks good
        if (validation.isValid && currentUser) {
          finalHtml = await this.polishWithAI(finalHtml);
        }

        const duration = performance.now() - startTime;

        return {
          success: validation.isValid,
          html: finalHtml,
          validation,
          duration,
          steps: ["decompile", "convert", "validate", "polish"],
        };
      } catch (error) {
        console.error("Conversion orchestration error:", error);
        return {
          success: false,
          html: sourceHtml,
          error: error.message,
          fallback: true,
        };
      }
    },

    async convertToVisual(sourceHtml, currentUser = null, options = {}) {
      try {
        // Step 1: Clean up code
        const converted = await RunCodeConverter.convert(sourceHtml, {
          removeDevTools: true,
        });

        // Step 2: Compile to visual format
        const compiled = await VisualCompiler.compile(converted, options);

        // Step 3: Validate
        const validation = CodeValidator.validate(compiled, "visual");

        return {
          success: validation.isValid,
          html: compiled,
          validation,
        };
      } catch (error) {
        console.error("Visual conversion error:", error);
        return {
          success: false,
          html: sourceHtml,
          error: error.message,
        };
      }
    },

    async polishWithAI(html) {
      try {
        const res = await fetch("/api/ai/chat-edit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "edit",
            prompt:
              "Final polish: Ensure HTML is clean, semantic, and production-ready. Preserve all functionality and visual styling. Return ONLY valid HTML.",
            currentCode: html,
          }),
        });

        const data = await res.json().catch(() => ({}));
        return res.ok && data.success ? String(data.updatedCode || "") : html;
      } catch {
        return html;
      }
    },
  };

  // Public API
  return {
    decompile: CanvasDecompiler.decompile.bind(CanvasDecompiler),
    convertForRun: Orchestrator.convertForRun.bind(Orchestrator),
    convertToVisual: Orchestrator.convertToVisual.bind(Orchestrator),
    validate: CodeValidator.validate.bind(CodeValidator),
    validateWithAI: CodeValidator.validateWithAI.bind(CodeValidator),

    // Direct agent access
    CanvasDecompiler,
    RunCodeConverter,
    VisualCompiler,
    CodeValidator,
    Orchestrator,
  };
})();
