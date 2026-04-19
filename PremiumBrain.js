import nodeFetch from "node-fetch";

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const GEMINI_KEYS = rawKeys.split(",").map(k => k.trim()).filter(k => k.length > 0);

if (!global.geminiKeyPool) {
  global.geminiKeyPool = {};
  GEMINI_KEYS.forEach((key, i) => {
    // Provide a human readable index so we know which key is which without logging the full key
    global.geminiKeyPool[key] = { id: `Key-${i+1}`, exhausted: false, resetTime: 0, usageCount: 0 };
  });
}

export const PremiumBrain = {
  getAvailableKey() {
    const now = Date.now();
    for (const key of GEMINI_KEYS) {
      const state = global.geminiKeyPool[key];
      if (state.exhausted && now > state.resetTime) {
         state.exhausted = false; // Cooldown expired
      }
      if (!state.exhausted) {
         return key;
      }
    }
    return null;
  },

  markKeyExhausted(key, retryMs) {
    if (global.geminiKeyPool[key]) {
       global.geminiKeyPool[key].exhausted = true;
       global.geminiKeyPool[key].resetTime = Date.now() + retryMs;
       console.log(`[PremiumBrain] ${global.geminiKeyPool[key].id} (...${key.slice(-4)}) exhausted! Cooldown: ${retryMs/1000}s`);
    }
  },

  async process(params) {
    if (GEMINI_KEYS.length === 0) {
      throw new Error("GEMINI_API_KEYS is not configured for Premium features.");
    }
    
    // Agentic Loop: 1. Generate code, 2. Self-Review, 3. Output
    console.log("[PremiumBrain] Initiating Agentic Loop for Pro User...");
    let code = await this.callGemini(this.buildGeneratePrompt(params));
    
    // Self-reflection validator logic
    if (params.mode !== 'chat' && params.mode !== 'agent' && params.mode !== 'context') {
      const validation = this.validateCode(code);
      if (!validation.isValid) {
         console.log("[PremiumBrain] Code invalid, self-correcting...", validation.errors);
         code = await this.callGemini(this.buildFixPrompt(code, validation.errors));
      }
    }
    
    return {
       updatedCode: (params.mode !== 'chat' && params.mode !== 'agent' && params.mode !== 'context') ? code : "",
       assistantReply: (params.mode === 'chat' || params.mode === 'agent') ? code : ""
    };
  },

  async callGemini(messages, retryCount = 0) {
    // Prevent infinite loops if all keys fail repeatedly
    if (retryCount >= GEMINI_KEYS.length) {
       throw new Error("Gemini API Error: All keys in the rotation pool are currently exhausted/rate-limited.");
    }

    // Combine system and user messages into a single prompt for Gemini native API
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const userMessage = messages.find(m => m.role === "user")?.content || "";
    const combinedPrompt = `${systemMessage}\n\nUser Request:\n${userMessage}`;

    const apiKey = this.getAvailableKey();
    if (!apiKey) {
       throw new Error("Gemini API Error: All keys in the rotation pool are currently exhausted/rate-limited.");
    }

    global.geminiKeyPool[apiKey].usageCount++;

    const response = await nodeFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: combinedPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2
        }
      })
    });
    
    if (!response.ok) {
       const err = await response.text();
       
       // Handle Quota/Rate Limit Errors intelligently
       if (err.includes("429") || err.includes("RESOURCE_EXHAUSTED") || err.includes("quota")) {
           let retryMs = 60000; // default 1 min
           const match = err.match(/retryDelay["\s:]+["']?(\d+)s/);
           if (match) retryMs = parseInt(match[1], 10) * 1000;
           else {
               const msgMatch = err.match(/retry in ([\d\.]+)s/);
               if (msgMatch) retryMs = parseFloat(msgMatch[1]) * 1000;
           }
           this.markKeyExhausted(apiKey, retryMs);
           
           // Instantly retry with the next available key
           console.log(`[PremiumBrain] Auto-Retrying with next key... (Attempt ${retryCount + 2}/${GEMINI_KEYS.length})`);
           return await this.callGemini(messages, retryCount + 1);
       }
       throw new Error(`Gemini API Error: ${err}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() || "";
  },
  
  buildGeneratePrompt(params) {
     let system = "You are MediaLab's Premium Super-Intelligent AI Developer.";
     if (params.mode === 'chat') {
        system += " Answer the user's questions deeply, taking into account all context.";
     } else if (params.mode === 'agent') {
        system += " You are in Agent mode. Follow strict execution outputs. Use actions like UPDATE_FILE, CREATE_FILE, EDIT_CANVAS inside [ACTION]{...}[/ACTION] blocks.";
     } else {
        system += " Generate full HTML/CSS to fulfill the user's UI request. Return ONLY raw, valid HTML/CSS code without any markdown wrappers (no ```html, no backticks).";
     }
     
     let userPrompt = params.prompt;
     if (params.contextCode) {
       userPrompt = `Context Code:\n${params.contextCode}\n\nUser Request: ${userPrompt}`;
     }
     if (params.activeFileContent) {
       userPrompt = `Active File:\n${params.activeFileContent}\n\n${userPrompt}`;
     }
     
     return [
       { role: "system", content: system },
       { role: "user", content: userPrompt }
     ];
  },
  
  buildFixPrompt(badCode, errors) {
     return [
       { role: "system", content: "You are an expert debugger. Fix the provided code based on the exact errors listed. Return ONLY the fixed raw HTML/CSS code, no markdown wrappers." },
       { role: "user", content: `Code:\n${badCode}\n\nErrors Detected:\n${errors.join('\\n')}\n\nPlease provide the corrected code.` }
     ];
  },

  validateCode(code) {
     const errors = [];
     if (!code.includes('<') && !code.includes('{')) {
         errors.push("Code does not appear to contain valid HTML tags or CSS blocks.");
     }
     if (code.includes('```html') || code.includes('```css') || code.startsWith('```')) {
         errors.push("Code contains markdown wrappers. Provide only raw code.");
     }
     
     // Simple unbalanced tag check for common structural elements
     const openDivs = (code.match(/<div[^>]*>/gi) || []).length;
     const closeDivs = (code.match(/<\/div>/gi) || []).length;
     if (openDivs !== closeDivs) {
         errors.push(`Mismatched <div> tags: ${openDivs} open, ${closeDivs} close.`);
     }

     return {
       isValid: errors.length === 0,
       errors
     };
  }
};
