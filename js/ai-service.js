/**
 * AI Service Pro for BizHub
 * Handles tool-augmented chat using a ReAct pattern.
 */
class AIService {
    constructor() {
        this.SUPABASE_FUNC_URL = 'https://qphgtdehhihobjfaaula.supabase.co/functions/v1/gemini';
        this.tools = new Map();
        this.registerDefaultTools();
    }

    /**
     * Register a tool that the AI can use.
     * @param {string} name - Unique tool name.
     * @param {string} description - Description for the AI.
     * @param {Object} parameters - JSON Schema or simple param list.
     * @param {Function} action - Async function to execute.
     */
    registerTool(name, description, parameters, action) {
        this.tools.set(name, { description, parameters, action });
    }

    registerDefaultTools() {
        // --- Navigation Tools ---
        this.registerTool('navigate', 'Go to a specific page on the website.', { url: 'string' }, async (params) => {
            if (params.url) window.location.href = params.url;
            return "SUCCESS: Navigated to " + params.url;
        });

        this.registerTool('scroll', 'Scroll the page to a position or element.', { position: 'top|bottom|elementId' }, async (params) => {
            if (params.position === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
            else if (params.position === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            else {
                const el = document.getElementById(params.position);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
            return "SUCCESS: Scrolled to " + params.position;
        });

        // --- Database Search Tools ---
        this.registerTool('findBusiness', 'Search for businesses by name, description, or category keyword.', { query: 'string' }, async (params) => {
            if (typeof supabase === 'undefined') return "ERROR: Database unavailable.";

            // Clean and split query for multi-word matching
            const terms = params.query.trim().split(/\s+/).filter(t => t.length > 2);
            let filterString = `name.ilike.%${params.query}%,description.ilike.%${params.query}%`;

            // Add individual terms to OR filter
            if (terms.length > 1) {
                terms.forEach(term => {
                    filterString += `,name.ilike.%${term}%,description.ilike.%${term}%`;
                });
            }

            const { data, error } = await supabase
                .from('businesses')
                .select('id, name, description, category_id, address, phone, email, images, status, categories(name)')
                .eq('status', 'approved')
                .or(filterString)
                .limit(8);

            if (error) return `ERROR: ${error.message}`;

            // Format results for cleaner AI consumption
            const results = data.map(b => ({
                id: b.id,
                name: b.name,
                description: b.description,
                category: b.categories?.name,
                address: b.address,
                image: b.images?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070'
            }));

            return results.length ? `DATA: ${JSON.stringify(results)}` : "DATA: No businesses found for that query. Try broader keywords or search by category.";
        });

        this.registerTool('listCategories', 'Get a list of all available business categories.', {}, async () => {
            if (typeof supabase === 'undefined') return "ERROR: Database unavailable.";
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, description')
                .order('order', { ascending: true });

            if (error) return `ERROR: ${error.message}`;
            return `DATA: Available Categories: ${data.map(c => `${c.name} (${c.description || ''})`).join(', ')}`;
        });

        this.registerTool('findProducts', 'Search for specific items/products by name across all shops.', { query: 'string' }, async (params) => {
            if (typeof supabase === 'undefined') return "ERROR: Database unavailable.";
            const { data, error } = await supabase
                .from('products')
                .select('name, price, description, images, businesses(name)')
                .eq('is_active', true)
                .ilike('name', `%${params.query}%`)
                .limit(5);

            if (error) return `ERROR: ${error.message}`;
            return data.length ? `DATA: ${JSON.stringify(data.map(p => ({
                name: p.name,
                price: p.price,
                description: p.description,
                shop: p.businesses?.name
            })))}` : "DATA: No products found by that name.";
        });

        this.registerTool('getBusinessProducts', 'Get all products/services offered by a specific business ID.', { businessId: 'string' }, async (params) => {
            if (typeof supabase === 'undefined') return "ERROR: Database unavailable.";
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('business_id', params.businessId)
                .eq('is_active', true);

            if (error) return `ERROR: ${error.message}`;
            return data.length ? `DATA: ${JSON.stringify(data)}` : "DATA: This business has no products listed.";
        });

        this.registerTool('getStats', 'Get total business count and general platform stats.', {}, async () => {
            if (typeof supabase === 'undefined') return "ERROR: Database unavailable.";
            const { count, error } = await supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'approved');
            if (error) return `ERROR: ${error.message}`;
            return `DATA: BizHub currently has ${count} approved businesses.`;
        });

        // --- UI Tools ---
        this.registerTool('setTheme', 'Switch between light, dark, or system theme.', { theme: 'light|dark|system' }, async (params) => {
            if (window.setTheme) window.setTheme(params.theme);
            return "SUCCESS: Theme changed to " + params.theme;
        });

        this.registerTool('showAlert', 'Show a notification toast to the user.', { message: 'string', type: 'success|error|info' }, async (params) => {
            if (typeof showToast === 'function') showToast(params.message, params.type);
            else alert(params.message);
            return "SUCCESS: Alert shown.";
        });

        // --- Utils ---
        this.registerTool('getCurrentTime', 'Get the current local time.', {}, async () => {
            return `DATA: The current local time is ${new Date().toLocaleTimeString()}`;
        });
    }

    getToolsInstruction() {
        let i = 1;
        let instr = "You have access to the following tools. When using a tool, respond with ONLY the JSON object (no explanations, no markdown):\n";
        instr += '{"tool": "toolName", "params": {...}}\n\n';
        instr += "Available tools:\n";
        this.tools.forEach((tool, name) => {
            instr += `${i++}. ${name}: ${tool.description} | Params: ${JSON.stringify(tool.parameters)}\n`;
        });
        instr += "\nIMPORTANT: Output ONLY the JSON when calling a tool. After receiving the tool result, provide a natural language response to the user.\n";
        return instr;
    }

    /**
     * Main Chat Method (ReAct Loop)
     */
    async chat(userMessage, systemContext, history = []) {
        const contents = this.buildContents(userMessage, systemContext, history);
        let iterations = 0;
        const MAX_ITERATIONS = 4;

        // Track tool results for validation
        this.lastToolResults = { businesses: [], products: [] };

        while (iterations < MAX_ITERATIONS) {
            iterations++;
            console.log(`[AI Loop] Iteration ${iterations}`);

            try {
                const responseText = await this.callGeminiAPI(contents);

                // Improved Parsing: Search for JSON block anywhere in the text
                const jsonRegex = /\{[\s\S]*"tool"[\s\S]*\}/;
                const match = responseText.match(jsonRegex);

                if (match) {
                    try {
                        const cleanJson = match[0].trim();
                        const command = JSON.parse(cleanJson);
                        if (command.tool && this.tools.has(command.tool)) {
                            const tool = this.tools.get(command.tool);
                            const result = await tool.action(command.params || {});

                            console.log(`[Tool] ${command.tool} -> ${JSON.stringify(command.params)} -> ${result.substring(0, 80)}...`);

                            // Track business/product data for validation
                            if (command.tool === 'findBusiness' && result.startsWith('DATA:')) {
                                try {
                                    const data = JSON.parse(result.substring(5));
                                    this.lastToolResults.businesses = data;
                                } catch (e) { }
                            }
                            if (command.tool === 'getBusinessProducts' && result.startsWith('DATA:')) {
                                try {
                                    const data = JSON.parse(result.substring(5));
                                    this.lastToolResults.products.push(...data);
                                } catch (e) { }
                            }

                            // Add ONLY the clean JSON to history (not the full response)
                            contents.push({ role: 'model', parts: [{ text: cleanJson }] });
                            contents.push({ role: 'user', parts: [{ text: `TOOL_RESULT: ${result}` }] });

                            // Continue loop - tool calls are invisible to user
                            continue;
                        }
                    } catch (e) {
                        console.warn("[AI] JSON detected but failed to parse", e);
                    }
                }

                return responseText; // Final response
            } catch (err) {
                console.error("[AI Error]", err);
                throw err;
            }
        }
        return "I've reached my processing limit for this request. Please try again with a simpler question.";
    }

    buildContents(userMessage, systemContext, history) {
        const fullSystem = `${systemContext}\n\n${this.getToolsInstruction()}`;
        const contents = [
            { role: 'user', parts: [{ text: fullSystem }] },
            { role: 'model', parts: [{ text: "Understood. I'm ready to assist with BizHub tools." }] }
        ];

        // Add history (max last 10)
        history.slice(-10).forEach(msg => {
            contents.push({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            });
        });

        // Add current message
        contents.push({ role: 'user', parts: [{ text: userMessage }] });
        return contents;
    }

    async callGeminiAPI(contents) {
        const response = await fetch(this.SUPABASE_FUNC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY || ''}`,
                'apikey': window.SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify({ contents })
        });

        if (!response.ok) throw new Error(`AI API Status: ${response.status}`);

        const data = await response.json();
        const text = data.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty AI response");
        return text;
    }
}

// Evaluate business listing (Legacy support for other pages)
// Evaluate business listing (Legacy support for other pages)
AIService.prototype.evaluateBusinessListing = async function (name, description, category) {
    const prompt = `You are a content moderator. Evaluate this business listing for professional quality and policy compliance.
    Name: ${name}
    Category: ${category}
    Description: ${description}
    
    Return strict JSON ONLY with this format:
    {
        "score": number (0-100),
        "approved": boolean,
        "reason": "short explanation"
    }`;

    const contents = [{ role: 'user', parts: [{ text: prompt }] }];

    try {
        const res = await this.callGeminiAPI(contents);

        // Robust JSON extraction
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback if no JSON found (auto-approve to avoid blocking user)
        console.warn("AI didn't return valid JSON, auto-approving.");
        return { score: 85, approved: true, reason: "Auto-approved (AI response unclear)" };

    } catch (e) {
        console.error("AI Evaluation failed", e);
        // Fail open - don't block business creation if AI is down
        return { score: 85, approved: true, reason: "Auto-approved (System bypass)" };
    }
};

window.aiService = new AIService();
