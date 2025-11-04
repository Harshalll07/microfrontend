/* smartbank-widget.js
   Micro-frontend Chatbot: SmartBank Assistant
   - Vanilla JS Web Component
   - Fetches FAQs from configured URL or uses embedded global data
*/

(function() {
  const DEFAULT_CONFIG = {
    faqUrl: "/faqs.json",
    botName: "SmartBank Assistant",
    themeColor: "#0A7BBF"
  };

  // Merge user config
  const CONFIG = Object.assign({}, DEFAULT_CONFIG, window.SmartBankAssistantConfig || {});

  // Utility: create element with class
  function q(el, cls) {
    const e = document.createElement(el);
    if (cls) e.className = cls;
    return e;
  }

  // Fuzzy find function (supports question as string or array)
  function findAnswer(faqs, userQuery) {
    if (!faqs || !faqs.length) return null;
    const query = (userQuery || "").toLowerCase().trim();
    if (!query) return null;

    let best = null;
    let bestScore = 0;

    faqs.forEach(item => {
      if (!item || !item.answer) return;

      // questions may be array or string
      const questionsArray = Array.isArray(item.question) ? item.question : [item.question];

      questionsArray.forEach(qtext => {
        if (!qtext) return;
        const q = (qtext || "").toLowerCase();
        const qWords = q.split(/\s+/).filter(Boolean);
        const uWords = query.split(/\s+/).filter(Boolean);

        // basic scoring: count common words, bonus for exact substring
        let score = 0;
        uWords.forEach(w => {
          if (qWords.includes(w)) score += 1;
        });

        if (q.includes(query) || query.includes(q)) score += 2; // substring match bonus

        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      });
    });

    // threshold: require at least 1 match (or 2 for safer)
    return bestScore >= 1 ? best.answer : null;
  }

  // Render Markdown-like simple bullets to HTML (keeps newlines)
  function renderAnswerText(text) {
    if (!text) return "";
    // simple bullet handling: lines starting with • or - → <li>
    const lines = text.split(/\r?\n/);
    let html = "";
    const listLines = [];
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        // flush list if any
        if (listLines.length) {
          html += "<ul>" + listLines.map(l => `<li>${escapeHtml(l)}</li>`).join("") + "</ul>";
          listLines.length = 0;
        }
        html += "<div style='height:6px'></div>";
      } else if (/^[\u2022\-•]\s*/.test(trimmed)) {
        listLines.push(trimmed.replace(/^[\u2022\-•]\s*/, ""));
      } else {
        if (listLines.length) {
          html += "<ul>" + listLines.map(l => `<li>${escapeHtml(l)}</li>`).join("") + "</ul>";
          listLines.length = 0;
        }
        html += `<p>${escapeHtml(trimmed)}</p>`;
      }
    });
    if (listLines.length) html += "<ul>" + listLines.map(l => `<li>${escapeHtml(l)}</li>`).join("") + "</ul>";
    return html;
  }

  function escapeHtml(s) {
    return (s + "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Web Component definition
  class SmartBankAssistant extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.faqs = [];
      this.open = false;
      this._build();
      this._loadFaqs();
    }

    _build() {
      const style = q("style");
      style.textContent = `
   :host { 
  position: fixed; 
  right: 24px; 
  bottom: 24px; 
  z-index: 999999; 
  font-family: Inter, Arial, sans-serif; 
}

.widget { 
  width: 340px; 
  max-width: calc(100vw - 48px); 
  box-shadow: 0 8px 24px rgba(0,0,0,0.18); 
  border-radius: 14px; 
  overflow: hidden; 
  background: #fff; 
  display:flex; 
  flex-direction:column;
  display:none;
}

.header { 
  display:flex; 
  align-items:center; 
  padding:14px 16px; 
  background: ${CONFIG.themeColor}; 
  color: #fff; 
}

.title { 
  font-weight:600; 
  margin-left:10px; 
  font-size:15px; 
}

.subtitle { 
  font-size:12px; 
  opacity:0.9; 
  margin-top:2px; 
}

.close { 
  margin-left:auto; 
  background:transparent; 
  border:none; 
  color:white; 
  font-size:18px; 
  cursor:pointer; 
}

.messages { 
  .messages { 
  padding:12px; 
  height: 240px;   /* reduced height */
  overflow-y:auto; 
  background:#fafcff; 
  display:flex; 
  flex-direction:column; 
  gap:10px; 
}

.msg { 
  max-width: 80%; 
  padding:10px 14px; 
  border-radius:10px; 
  font-size:14px;
  line-height:1.42;
}

.msg.ai { 
  background:#eef7ff; 
  color:#053b63; 
  align-self:flex-start; 
}

.msg.user { 
  background:${CONFIG.themeColor}; 
  color:white; 
  align-self:flex-end; 
}

.inputbar { 
  display:flex; 
  padding:10px; 
  gap:8px; 
  border-top:1px solid #e7eff6; 
  background:#fff;
}

.inputbar input { 
  flex:1; 
  padding:10px 12px; 
  border-radius:8px; 
  border:1px solid #d8e4ef; 
  outline:none; 
}

.inputbar button { 
  background:${CONFIG.themeColor}; 
  color:white; 
  border:none; 
  padding:10px 14px; 
  border-radius:8px; 
  cursor:pointer; 
}

.bubble { 
  width:60px; 
  height:60px; 
  border-radius:50%; 
  background:${CONFIG.themeColor}; 
  display:flex; 
  align-items:center; 
  justify-content:center; 
  color:white; 
  font-weight:600; 
  cursor:pointer; 
  box-shadow:0 8px 24px rgba(0,0,0,0.25);
}

.quick { 
  display:flex; 
  flex-wrap:wrap; 
  gap:6px; 
  padding:8px 14px;
  background:#fff;
}

.chip { 
  background:#e8f5ff; 
  color:#024f77; 
  padding:6px 10px; 
  border-radius:14px; 
  font-size:12px; 
  cursor:pointer; 
}

@media (max-width:420px){
  .widget{
    width: 94vw; 
    Right:3vw; 
    bottom:20px;
  }
  .messages{ height: 50vh; }
}

      `;

      // container
      const wrapper = q("div", "mini-wrap");
      // bubble (when minimized)
      this.bubble = q("div", "bubble");
      this.bubble.textContent = CONFIG.botName.split(" ").map(w=>w[0]).slice(0,2).join("");
      this.bubble.addEventListener("click", () => this.toggleOpen(true));

      // full widget
      this.widget = q("div", "widget");
      this.header = q("div", "header");
      const headerLeft = q("div", "header-left");
      const avatar = q("div"); avatar.style.width = "40px"; avatar.style.height="40px"; avatar.style.borderRadius="8px"; avatar.style.background="#ffffff20";
      const titleWrap = q("div");
      const title = q("div", "title"); title.textContent = CONFIG.botName;
      const sub = q("div", "subtitle"); sub.textContent = "How can I help you today?";
      titleWrap.appendChild(title); titleWrap.appendChild(sub);
      const closeBtn = q("button", "close"); closeBtn.innerHTML = "✕";
      closeBtn.addEventListener("click", () => this.toggleOpen(false));
      this.header.appendChild(avatar);
      this.header.appendChild(titleWrap);
      this.header.appendChild(closeBtn);

      this.messagesEl = q("div", "messages");

      // suggestion chips container
      this.suggestEl = q("div", "quick");
      // input bar
      const inputbar = q("div", "inputbar");
      this.inputEl = q("input");
      this.inputEl.placeholder = "Ask about accounts, loans, cards...";
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this._onSend();
      });

      const sendBtn = q("button");
      sendBtn.textContent = "Send";
      sendBtn.addEventListener("click", () => this._onSend());

      inputbar.appendChild(this.inputEl);
      inputbar.appendChild(sendBtn);

      this.widget.appendChild(this.header);
      this.widget.appendChild(this.messagesEl);
      this.widget.appendChild(this.suggestEl);
      this.widget.appendChild(inputbar);

      wrapper.appendChild(this.bubble);
      wrapper.appendChild(this.widget);

      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(wrapper);

      // initial message
      this._pushAIMessage("Hello! I am here to help with account, loan, ATM and card queries.");
    }

    toggleOpen(open) {
      this.open = !!open;
      this.widget.style.display = this.open ? "flex" : "none";
      this.bubble.style.display = this.open ? "none" : "flex";
    }

    _pushAIMessage(text) {
      const el = q("div", "msg ai");
      el.innerHTML = renderAnswerText(text);
      this.messagesEl.appendChild(el);
      this._scrollToBottom();
    }

    _pushUserMessage(text) {
      const el = q("div", "msg user");
      el.textContent = text;
      this.messagesEl.appendChild(el);
      this._scrollToBottom();
    }

    _scrollToBottom() {
      setTimeout(() => {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }, 50);
    }

    // Load FAQs (tries global embedded data then fetch)
    _loadFaqs() {
      // If global embedded data exists, use it
      if (window.SMARTBANK_FAQS && Array.isArray(window.SMARTBANK_FAQS) && window.SMARTBANK_FAQS.length) {
        this.faqs = window.SMARTBANK_FAQS;
        this._buildSuggestions();
        return;
      }

      // Try to fetch from configured URL
      fetch(CONFIG.faqUrl, { cache: "no-cache" })
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch faqs");
          return res.json();
        })
        .then(json => {
          // Accept either flat array or { faqs: [...] } or bank_accounts array
          if (Array.isArray(json)) this.faqs = json;
          else if (Array.isArray(json.faqs)) this.faqs = json.faqs;
          else if (Array.isArray(json.bank_accounts)) {
            // convert prompts/response style into flat QA objects
            this.faqs = json.bank_accounts.map(it => ({
              category: it.category || "General",
              question: it.prompts || it.question || (it.response && it.response.title) || [],
              answer: (it.response && (it.response.title || JSON.stringify(it.response))) || "Sorry, details not available."
            }));
          } else this.faqs = [];

          this._buildSuggestions();
        })
        .catch(err => {
          this.faqs = [];
          console.warn("SmartBankAssistant: could not load faqs:", err);
          this._buildSuggestions();
        });
    }

    _buildSuggestions() {
      // Clear suggestions
      this.suggestEl.innerHTML = "";
      // pick up to 6 sample questions
      const sampleQs = [];
      this.faqs.forEach(it => {
        if (sampleQs.length >= 6) return;
        if (Array.isArray(it.question)) {
          it.question.slice(0,2).forEach(q => sampleQs.push(q));
        } else {
          sampleQs.push(it.question);
        }
      });
   sampleQs.slice(0,6).forEach(questionText => {
        if (!questionText) return;
        const chip = q("div", "chip"); // 'q' is now the helper function again
        chip.textContent = questionText.length > 36 ? questionText.slice(0,36).trim() + "…" : questionText;
        chip.addEventListener("click", () => {
          this.inputEl.value = questionText;
          this._onSend();
        });
        this.suggestEl.appendChild(chip);
      });
    }

    _onSend() {
      const text = this.inputEl.value && this.inputEl.value.trim();
      if (!text) return;
      this._pushUserMessage(text);
      this.inputEl.value = "";
      const ans = findAnswer(this.faqs, text);
      if (ans) {
        setTimeout(() => this._pushAIMessage(ans), 350);
      } else {
        setTimeout(() => this._pushAIMessage("I’m not fully sure yet. Could you please rephrase your question?"), 350);
      }
    }
  }

  // define custom element
  if (!customElements.get("smartbank-assistant")) {
    customElements.define("smartbank-assistant", SmartBankAssistant);
  }

})();

