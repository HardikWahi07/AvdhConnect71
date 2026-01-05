/**
 * Leads Genie Pro v2.0
 * Premium AI Chatbot for BizHub
 */

class GeminiChatbot {
    constructor() {
        this.nodes = {
            btn: document.getElementById('aiChatBtn'),
            modal: document.getElementById('chatModal'),
            close: document.getElementById('closeChatBtn'),
            messages: document.getElementById('chatMessages'),
            input: document.getElementById('chatInput'),
            send: document.getElementById('sendChatBtn'),
            container: document.querySelector('.ai-chat-container')
        };

        this.state = {
            history: [],
            isProcessing: false,
            suggestions: [
                "Find me a good plumber",
                "How many businesses are registered?",
                "What's the weather today?",
                "Show me top rated cafes"
            ]
        };

        this.init();
    }

    init() {
        if (!this.nodes.btn) return;

        // Events
        this.nodes.btn.addEventListener('click', () => this.toggle(true));
        this.nodes.close.addEventListener('click', () => this.toggle(false));
        this.nodes.send.addEventListener('click', () => this.handleSendMessage());
        this.nodes.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // Close on backdrop click
        this.nodes.modal.addEventListener('click', (e) => {
            if (e.target === this.nodes.modal) this.toggle(false);
        });

        // Initial Greeting
        this.addMessage('ai', 'Hi there! I\'m **Leads Genie Pro**, your personal BizHub concierge. How can I help you elevate your local experience today?');
        this.renderSuggestions();
    }

    toggle(active) {
        if (active) {
            this.nodes.modal.classList.add('active');
            this.nodes.input.focus();
            // Pulse the button out
            this.nodes.btn.style.transform = 'scale(0) rotate(90deg)';
            this.nodes.btn.style.opacity = '0';
        } else {
            this.nodes.modal.classList.remove('active');
            this.nodes.btn.style.transform = 'scale(1) rotate(0deg)';
            this.nodes.btn.style.opacity = '1';
        }
    }

    renderSuggestions() {
        let sagContainer = document.querySelector('.ai-suggestions');
        if (!sagContainer) {
            sagContainer = document.createElement('div');
            sagContainer.className = 'ai-suggestions';
            this.nodes.messages.after(sagContainer);
        }

        sagContainer.innerHTML = '';
        this.state.suggestions.forEach(text => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.textContent = text;
            chip.onclick = () => {
                this.nodes.input.value = text;
                this.handleSendMessage();
            };
            sagContainer.appendChild(chip);
        });
    }

    async handleSendMessage() {
        const text = this.nodes.input.value.trim();
        if (!text || this.state.isProcessing) return;

        this.addMessage('user', text);
        this.nodes.input.value = '';
        this.setLoading(true);

        try {
            const systemPrompt = `You are Leads Genie Pro for BizHub. 

            CRITICAL TOOL SELECTION:
            - If user asks for a PRODUCT/ITEM name (phone, laptop, cake, etc) → use 'findProducts' tool
            - If user asks for a BUSINESS/SHOP (plumber, cafe, team, etc) → use 'findBusiness' tool
            - To see what a specific business sells → use 'getBusinessProducts' with the business ID

            ABSOLUTE RULE: Only show data that appears in tool results. Do not invent anything.

            WORKFLOW:
            1. Choose correct tool based on query type
            2. If findBusiness returns businesses, show them with the card template
            3. If user wants products from that business, use getBusinessProducts
            4. Only display what tools return - no made-up data
            
            BUSINESS CARD:
            <div class="chat-business-card">
              <img src="[image_url]" class="card-image">
              <div class="card-details">
                <h4>[Name]</h4>
                <p>[Description]</p>
                <div class="card-meta">
                  <span class="category-tag">[Category]</span>
                </div>
                <a href="business-detail.html?id=[id]" class="btn btn-primary btn-sm mt-md">View Profile</a>
              </div>
            </div>

            PRODUCTS: Simple bullets with name/price from tool only.
            
            End with: SUGGESTIONS: [3 suggestions]`;

            const response = await window.aiService.chat(text, systemPrompt, this.state.history);

            // VALIDATION: Check if AI is hallucinating products
            let validatedResponse = response;
            if (window.aiService.lastToolResults && window.aiService.lastToolResults.products.length > 0) {
                const realProductNames = window.aiService.lastToolResults.products.map(p => p.name.toLowerCase());
                console.log('[Validation] Real products found:', realProductNames);

                // If response mentions products, log for debugging
                if (response.toLowerCase().includes('product') || response.toLowerCase().includes('price')) {
                    console.log('[Validation] AI response mentions products - should only show:', realProductNames);
                }
            }

            // Parse dynamic suggestions
            const suggestionsMatch = response.match(/SUGGESTIONS:\s*(\[.*\])/s);
            let cleanRichResponse = response;

            if (suggestionsMatch) {
                try {
                    const newSuggs = JSON.parse(suggestionsMatch[1]);
                    if (Array.isArray(newSuggs)) {
                        this.state.suggestions = newSuggs.slice(0, 4);
                        this.renderSuggestions();
                    }
                    cleanRichResponse = response.replace(suggestionsMatch[0], '').trim();
                } catch (e) {
                    console.warn("Failed to parse AI suggestions", e);
                }
            }

            this.setLoading(false);
            this.addMessage('ai', cleanRichResponse);

            // Update local history
            this.state.history.push({ role: 'user', text });
            this.state.history.push({ role: 'ai', text: cleanRichResponse });

        } catch (err) {
            console.error(err);
            this.setLoading(false);
            this.addMessage('ai', "I'm having a brief connection issue. Please try again in a moment.");
        }
    }

    setLoading(active) {
        this.state.isProcessing = active;
        this.nodes.send.disabled = active;
        this.nodes.send.innerHTML = active ? '...' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';

        if (active) {
            const loader = document.createElement('div');
            loader.id = 'ai-loader';
            loader.className = 'ai-chat-message ai';
            loader.innerHTML = `
                <div class="ai-message-avatar ai">AI</div>
                <div class="ai-message-content typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            this.nodes.messages.appendChild(loader);
            this.scrollToBottom();
        } else {
            const loader = document.getElementById('ai-loader');
            if (loader) loader.remove();
        }
    }

    addMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-chat-message ${role}`;

        const avatar = `<div class="ai-message-avatar ${role}">${role === 'ai' ? 'AI' : 'ME'}</div>`;

        // Flexible parsing for AI: Handle Markdown and HTML
        let content = text;
        if (role === 'ai') {
            content = text
                .replace(/```html\s*([\s\S]*?)```/g, '$1') // Extract HTML from code blocks
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\n(?![^<]*>)/g, '<br>'); // Newlines to <br> but NOT inside HTML tags
        }

        msgDiv.innerHTML = `
            ${avatar}
            <div class="ai-message-content">${content}</div>
        `;

        this.nodes.messages.appendChild(msgDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.nodes.messages.scrollTop = this.nodes.messages.scrollHeight;
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
    window.geminiChatbot = new GeminiChatbot();
});
