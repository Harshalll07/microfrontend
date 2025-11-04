(function () {
  // ---- CONFIG HERE ----
  const CONFIG = {
    themeColor: "#0084ff",
    title: "Banking Assistant",
    subtitle: "Ask me anything about banking services"
  };

  class AIBankWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
      this._build();
    }

    _build() {
      const wrapper = document.createElement("div");
      wrapper.classList.add("widget");

      wrapper.innerHTML = `
        <div class="header">
          <div>
            <div class="title">${CONFIG.title}</div>
            <div class="subtitle">${CONFIG.subtitle}</div>
          </div>
          <button class="close">×</button>
        </div>

        <div class="messages"></div>

        <div class="inputbar">
          <input type="text" placeholder="Ask your question...">
          <button>Send</button>
        </div>
      `;

      const style = document.createElement("style");
      style.textContent = `
      :host { position: fixed; right: 20px; bottom: 20px; z-index: 999999; font-family: Inter, Arial, sans-serif; }
      .widget { width: 360px; max-width: calc(100vw - 40px); box-shadow: 0 10px 30px rgba(10,20,40,0.25); border-radius: 12px; overflow: hidden; background: white; display:flex; flex-direction:column; }
      .header { display:flex; align-items:center; padding:12px 14px; background: linear-gradient(90deg, ${CONFIG.themeColor}, #66b3e6); color: white; }
      .title { font-weight:600; margin-left:10px; font-size:15px; }
      .subtitle { font-size:12px; opacity:0.95; margin-top:2px; }
      .close { margin-left:auto; background:transparent; border:none; color:white; font-size:18px; cursor:pointer; }
      .messages { padding:12px; height: 320px; overflow:auto; background: linear-gradient(180deg,#f7fbff, #ffffff); display:flex; flex-direction:column; gap:10px; }
      .inputbar { display:flex; padding:10px; gap:8px; border-top:1px solid #eef6fb; }
      .inputbar input { flex:1; padding:10px 12px; border-radius:8px; border:1px solid #dbeaf6; outline:none; }
      .inputbar button { background:${CONFIG.themeColor}; color:white; border:none; padding:10px 14px; border-radius:8px; cursor:pointer; }
      `;

      this.shadowRoot.append(style, wrapper);
    }
  }

  // ✅ Register component once
  if (!customElements.get("bank-ai-widget")) {
    customElements.define("bank-ai-widget", AIBankWidget);
  }

  // ✅ Auto-insert into page
  window.addEventListener("DOMContentLoaded", () => {
    if (!document.querySelector("bank-ai-widget")) {
      document.body.appendChild(document.createElement("bank-ai-widget"));
    }
  });

})();

