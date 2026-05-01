import nodeFetch from "node-fetch";
import AiKey from "./models/AiKey.js";

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const GEMINI_KEYS = rawKeys.split(",").map(k => k.trim()).filter(k => k.length > 0);

function getSafeKeyLabel(index = 0) {
  return `Key-${index + 1}`;
}

export const PremiumBrain = {
  isInitialized: false,

  async initDB() {
    if (this.isInitialized) return;
    
    global.geminiKeyPool = {};
    
    try {
      // Fetch existing keys from DB
      const dbKeys = await AiKey.find();
      const dbKeyMap = {};
      for (const k of dbKeys) {
        dbKeyMap[k.key] = k;
      }

      // Sync .env keys with DB
      for (let i = 0; i < GEMINI_KEYS.length; i++) {
        const key = GEMINI_KEYS[i];
        if (!dbKeyMap[key]) {
           const newKey = await AiKey.create({
              key,
              label: getSafeKeyLabel(i),
              exhausted: false,
              disabled: false,
              resetTime: 0,
              usageCount: 0
           });
           dbKeyMap[key] = newKey;
        }
        
        global.geminiKeyPool[key] = {
           id: dbKeyMap[key].label,
           exhausted: dbKeyMap[key].exhausted,
           disabled: dbKeyMap[key].disabled,
           resetTime: dbKeyMap[key].resetTime,
           usageCount: dbKeyMap[key].usageCount
        };
      }
      
      this.isInitialized = true;
      console.log(`[PremiumBrain] DB Synced. Loaded ${GEMINI_KEYS.length} keys into rotation pool.`);

      // Background Health Check (Every 3 Hours)
      if (!global.premiumBrainHealthCheckStarted) {
          global.premiumBrainHealthCheckStarted = true;
          setInterval(async () => {
             console.log("[PremiumBrain] Running 3-Hour Health Check on Exhausted API Keys...");
             for (const key of GEMINI_KEYS) {
                const state = global.geminiKeyPool[key];
                if (state && state.exhausted && !state.disabled) {
                   try {
                     const res = await nodeFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
                       method: "POST", headers: { "Content-Type": "application/json" },
                       body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
                     });
                     if (res.ok) {
                       console.log(`[PremiumBrain] API Key ${state.id} limit restored! Back to READY.`);
                       state.exhausted = false;
                       state.resetTime = 0;
                       state.usageCount = 0;
                       await AiKey.updateOne({ key }, { exhausted: false, resetTime: 0, usageCount: 0 });
                     }
                   } catch(e) {}
                }
             }
          }, 3 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error("[PremiumBrain] Error initializing DB:", error);
    }
  },

  async syncStateToDB(key) {
    if (global.geminiKeyPool[key]) {
      const state = global.geminiKeyPool[key];
      await AiKey.updateOne({ key }, {
         exhausted: state.exhausted,
         disabled: state.disabled,
         resetTime: state.resetTime,
         usageCount: state.usageCount
      }).catch(err => console.error("[PremiumBrain] DB Sync Error:", err));
    }
  },

  async getAvailableKey() {
    if (!this.isInitialized) await this.initDB();
    
    const now = Date.now();
    let updatedAny = false;
    
    for (const key of GEMINI_KEYS) {
      const state = global.geminiKeyPool[key];
      if (!state || state.disabled) {
         continue;
      }
      if (state.exhausted && now > state.resetTime) {
         state.exhausted = false; // Cooldown expired
         state.usageCount = 0;
         await this.syncStateToDB(key);
      }
    }

    for (const key of GEMINI_KEYS) {
      if (!global.geminiKeyPool[key].exhausted && !global.geminiKeyPool[key].disabled) {
         return key;
      }
    }
    return null;
  },

  getPoolStatusSummary() {
    const states = GEMINI_KEYS.map((key) => global.geminiKeyPool[key]).filter(Boolean);
    return {
      totalKeys: GEMINI_KEYS.length,
      readyKeys: states.filter((state) => !state.exhausted && !state.disabled).length,
      exhaustedKeys: states.filter((state) => state.exhausted).length,
      disabledKeys: states.filter((state) => state.disabled).length,
    };
  },

  getKeyLabel(key = "") {
    return global.geminiKeyPool[key]?.id || "unknown-key";
  },

  async markKeyExhausted(key, retryMs) {
    if (global.geminiKeyPool[key]) {
       global.geminiKeyPool[key].exhausted = true;
       global.geminiKeyPool[key].resetTime = Date.now() + retryMs;
       await this.syncStateToDB(key);
       console.log(`[PremiumBrain] ${global.geminiKeyPool[key].id} exhausted! Cooldown: ${retryMs/1000}s`);
    }
  },

  async disableKey(key, reason = "disabled") {
    if (global.geminiKeyPool[key]) {
      global.geminiKeyPool[key].disabled = true;
      global.geminiKeyPool[key].exhausted = true;
      global.geminiKeyPool[key].resetTime = Number.MAX_SAFE_INTEGER;
      await this.syncStateToDB(key);
      console.log(
        `[PremiumBrain] ${global.geminiKeyPool[key].id} disabled from rotation pool: ${reason}`,
      );
    }
  },

  async process(params) {
    if (GEMINI_KEYS.length === 0) {
      throw new Error("GEMINI_API_KEYS is not configured for Premium features.");
    }
    
    if (!this.isInitialized) await this.initDB();
    
    // Agentic Loop: 1. Generate code, 2. Self-Review, 3. Output
    console.log("[PremiumBrain] Initiating Agentic Loop for Pro User...");
    console.log("[PremiumBrain] Pool status before request:", this.getPoolStatusSummary());
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
    if (!this.isInitialized) await this.initDB();
    
    // Prevent infinite loops if all keys fail repeatedly
    if (retryCount >= GEMINI_KEYS.length) {
       throw new Error("Gemini API Error: All keys in the rotation pool are currently exhausted/rate-limited.");
    }

    // Combine system and user messages into a single prompt for Gemini native API
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const userMessage = messages.find(m => m.role === "user")?.content || "";
    const combinedPrompt = `${systemMessage}\n\nUser Request:\n${userMessage}`;

    const apiKey = await this.getAvailableKey();
    if (!apiKey) {
       throw new Error("Gemini API Error: All keys in the rotation pool are currently exhausted/rate-limited.");
    }

    const keyLabel = this.getKeyLabel(apiKey);
    console.log("[PremiumBrain] Using Gemini key from rotation pool:", {
      keyLabel,
      retryCount,
      pool: this.getPoolStatusSummary(),
    });

    global.geminiKeyPool[apiKey].usageCount++;
    await this.syncStateToDB(apiKey);

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
           await this.markKeyExhausted(apiKey, retryMs);
           console.log("[PremiumBrain] Rotation handoff triggered:", {
             exhaustedKey: keyLabel,
             retryMs,
             nextPoolState: this.getPoolStatusSummary(),
           });
           
           // Instantly retry with the next available key
           console.log(`[PremiumBrain] Auto-Retrying with next key... (Attempt ${retryCount + 2}/${GEMINI_KEYS.length})`);
           return await this.callGemini(messages, retryCount + 1);
       }
       if (
         err.includes("PERMISSION_DENIED") ||
         err.includes("API key was reported as leaked") ||
         err.includes("API_KEY_INVALID") ||
         err.includes("invalid API key")
       ) {
           await this.disableKey(apiKey, "permission denied / leaked / invalid");
           if (retryCount + 1 < GEMINI_KEYS.length) {
             console.log(`[PremiumBrain] Retrying with next safe key... (Attempt ${retryCount + 2}/${GEMINI_KEYS.length})`);
             return await this.callGemini(messages, retryCount + 1);
           }
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
