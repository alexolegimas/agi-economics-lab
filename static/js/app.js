/**
 * AGI Economics Lab @GoogleDeepMind
 * Super-Minimalist Table Controller:
 * - 01 Lab Members (click to filter, click again or click outside to reset)
 * - 02 Papers (Title | Authors | Topic -> expands Abstract + SSRN/arXiv/PDF link)
 * - 03 Essays & Popular Writings (Title | Authors | Outlet | Topic -> expands Summary + Essay link)
 * - Live Micro-Edit Mode
 */

(function () {
  const VALID_DESIGNS = ["index", "monograph", "split", "obsidian"];

  const TOPICS = [
    { id: "agi-macro", label: "Economics of AGI" },
    { id: "agents-markets", label: "AI Agents & Markets" },
    { id: "labor-policy", label: "Labor & Policy" },
    { id: "ai-science", label: "AI in Science" },
    { id: "society-behavior", label: "Flourishing & Behavior" }
  ];

  const TOPIC_MAP = {
    "agi-macro": "Economics of AGI",
    "agents-markets": "AI Agents & Markets",
    "labor-policy": "Labor & Policy",
    "ai-science": "AI in Science",
    "society-behavior": "Flourishing & Behavior"
  };

  const state = {
    design: "index",
    authorFilter: "all",
    topicFilter: "all",
    editMode: false,
    editsLog: {}
  };

  function safeGetStorage(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function safeSetStorage(key, val) {
    try {
      if (window.localStorage) window.localStorage.setItem(key, val);
    } catch (e) {}
  }

  function getItemTopicKey(item) {
    if (item.pillar && TOPIC_MAP[item.pillar]) return item.pillar;
    return "agi-macro";
  }

  function init() {
    if (!window.LAB_DATA) return;
    document.documentElement.setAttribute("data-design", "index");
    renderPeople();
    renderTopicBar();
    renderWritings();
    bindEvents();
  }

  function syncEditableAttributes() {
    document.body.classList.toggle("edit-mode", state.editMode);
    const editBtn = document.getElementById("toggle-edit-mode-btn");
    if (editBtn) editBtn.classList.toggle("active", state.editMode);

    document.querySelectorAll('[data-editable="true"]').forEach((el) => {
      if (state.editMode) {
        el.setAttribute("contenteditable", "true");
      } else {
        el.removeAttribute("contenteditable");
      }
    });
  }

  function renderPeople() {
    const listEl = document.getElementById("people-list");
    if (!listEl) return;

    listEl.innerHTML = window.LAB_DATA.coreMembers
      .map((m, idx) => {
        const ref = `P${idx + 1}`;
        const isDimmed = state.authorFilter !== "all" && state.authorFilter !== m.id;
        const isActive = state.authorFilter === m.id;
        const affilHtml = m.secondaryRole
          ? `<div class="person-role" style="color:var(--text-muted); font-size:0.78rem;" data-editable="true" data-ref="${ref}-AFFIL">${m.secondaryRole}</div>`
          : `<div class="person-role" style="color:var(--text-muted); font-size:0.78rem; min-height:0.5rem;" data-editable="true" data-ref="${ref}-AFFIL"></div>`;
        return `
      <div class="person-row filter-author-trigger ${isDimmed ? "dimmed" : ""} ${isActive ? "active-author" : ""}" data-author-id="${m.id}" style="cursor:pointer;" title="Click to filter by ${m.name} (click again or click outside to reset)">
        <img src="${m.photo}" alt="${m.name}" class="person-avatar" loading="lazy" />
        <div class="person-info">
          <div class="person-name-line">
            <span>
              <span class="ref-code">[${ref}]</span>
              <span class="person-name" data-editable="true" data-ref="${ref}-NAME">${m.name}</span>
            </span>
            <div class="person-links">
              ${m.links
                .map(
                  (l) =>
                    `<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`
                )
                .join("")}
            </div>
          </div>
          <div class="person-role" data-editable="true" data-ref="${ref}-ROLE">${m.role} · ${m.location}</div>
          ${affilHtml}
        </div>
      </div>
    `;
      })
      .join("");

    syncEditableAttributes();
  }

  function renderTopicBar() {
    const barEl = document.getElementById("topic-filter-bar");
    if (!barEl) return;

    barEl.innerHTML = `
      <span class="topic-filter-label">Topics:</span>
      ${TOPICS.map(
        (t) => `
        <button type="button" class="topic-tag filter-topic-trigger ${
          state.topicFilter === t.id ? "active-topic" : ""
        }" data-topic="${t.id}">
          ${t.label}
        </button>
      `
      ).join("")}
    `;
  }

  function matchesFilters(item) {
    const matchAuthor =
      state.authorFilter === "all" ||
      (item.authorIds && item.authorIds.includes(state.authorFilter));
    const topicKey = getItemTopicKey(item);
    const matchTopic = state.topicFilter === "all" || topicKey === state.topicFilter;
    return matchAuthor && matchTopic;
  }

  function renderPaperRow(p, refCode) {
    const topicKey = getItemTopicKey(p);
    const topicLabel = TOPIC_MAP[topicKey] || "Economics of AGI";
    const isTopicActive = state.topicFilter === topicKey;
    const label = p.manuscriptLabel || "Manuscript ↗";

    return `
      <article class="writing-row" data-row-id="${p.id}">
        <div class="writing-main papers-grid toggle-drawer-trigger">
          <div class="writing-title"><span class="ref-code">[${refCode}]</span><span data-editable="true" data-ref="${refCode}-TITLE">${p.title}</span></div>
          <div class="writing-authors" data-editable="true" data-ref="${refCode}-AUTHORS">${p.authors.join(", ")}</div>
          <div class="writing-topic-cell">
            <button type="button" class="topic-tag filter-topic-trigger ${isTopicActive ? "active-topic" : ""}" data-topic="${topicKey}" data-editable="true" data-ref="${refCode}-TOPIC">${topicLabel}</button>
          </div>
        </div>
        <div class="writing-drawer">
          <p data-editable="true" data-ref="${refCode}-ABSTRACT">${p.abstract}</p>
          <div class="drawer-links">
            ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener">${label}</a>` : ""}
            ${p.pdfUrl ? `<a href="${p.pdfUrl}" target="_blank" rel="noopener">PDF Manuscript ↗</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function renderEssayRow(e, refCode) {
    const topicKey = getItemTopicKey(e);
    const topicLabel = TOPIC_MAP[topicKey] || "Economics of AGI";
    const isTopicActive = state.topicFilter === topicKey;
    const outlet = e.outlet || e.publication || "Substack";

    return `
      <article class="writing-row" data-row-id="${e.id}">
        <div class="writing-main essays-grid toggle-drawer-trigger">
          <div class="writing-title"><span class="ref-code">[${refCode}]</span><span data-editable="true" data-ref="${refCode}-TITLE">${e.title}</span></div>
          <div class="writing-authors" data-editable="true" data-ref="${refCode}-AUTHORS">${e.authors.join(", ")}</div>
          <div class="writing-outlet" data-editable="true" data-ref="${refCode}-OUTLET">${outlet}</div>
          <div class="writing-topic-cell">
            <button type="button" class="topic-tag filter-topic-trigger ${isTopicActive ? "active-topic" : ""}" data-topic="${topicKey}" data-editable="true" data-ref="${refCode}-TOPIC">${topicLabel}</button>
          </div>
        </div>
        <div class="writing-drawer">
          <p style="font-weight:500; color:var(--text); margin-bottom:0.35rem;" data-editable="true" data-ref="${refCode}-SUBTITLE">${outlet} (${e.date}) — ${e.subtitle}</p>
          <p data-editable="true" data-ref="${refCode}-EXCERPT">${e.excerpt}</p>
          <div class="drawer-links">
            <a href="${e.url}" target="_blank" rel="noopener">Read Essay (${outlet}) ↗</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderWritings() {
    const papersEl = document.getElementById("papers-list");
    const essaysEl = document.getElementById("essays-list");
    const papersCount = document.getElementById("papers-count");
    const essaysCount = document.getElementById("essays-count");
    const filterBanner = document.getElementById("filter-indicator");

    const papersList = window.LAB_DATA.papers || [];
    const essaysList = window.LAB_DATA.essays || [];

    const papers = papersList.filter(matchesFilters);
    const essays = essaysList.filter(matchesFilters);

    if (papersCount) papersCount.textContent = `${papers.length} ${papers.length === 1 ? "Paper" : "Papers"}`;
    if (essaysCount) essaysCount.textContent = `${essays.length} ${essays.length === 1 ? "Writing" : "Writings"}`;

    if (filterBanner) {
      if (state.authorFilter === "all" && state.topicFilter === "all") {
        filterBanner.classList.remove("visible");
        filterBanner.innerHTML = "";
      } else {
        const parts = [];
        if (state.authorFilter !== "all") {
          const m = window.LAB_DATA.coreMembers.find((x) => x.id === state.authorFilter);
          parts.push(`Author: <strong>${m ? m.name : state.authorFilter}</strong>`);
        }
        if (state.topicFilter !== "all") {
          parts.push(`Topic: <strong>${TOPIC_MAP[state.topicFilter] || state.topicFilter}</strong>`);
        }
        filterBanner.classList.add("visible");
        filterBanner.innerHTML = `
          <span>Filtered by ${parts.join(" · ")} (${papers.length} papers, ${essays.length} writings)</span>
          <button type="button" class="filter-clear-btn" id="clear-author-filter">Reset filter</button>
        `;
      }
    }

    if (papersEl) {
      papersEl.innerHTML = papers
        .map((p) => {
          const origIdx = papersList.findIndex((x) => x.id === p.id) + 1;
          return renderPaperRow(p, `W${origIdx}`);
        })
        .join("");
    }

    if (essaysEl) {
      essaysEl.innerHTML = essays
        .map((e) => {
          const origIdx = essaysList.findIndex((x) => x.id === e.id) + 1;
          return renderEssayRow(e, `E${origIdx}`);
        })
        .join("");
    }

    syncEditableAttributes();
  }

  function resetAllFilters() {
    state.authorFilter = "all";
    state.topicFilter = "all";
    renderPeople();
    renderTopicBar();
    renderWritings();
  }

  function bindEvents() {
    const editModeBtn = document.getElementById("toggle-edit-mode-btn");
    if (editModeBtn) {
      editModeBtn.addEventListener("click", () => {
        state.editMode = !state.editMode;
        syncEditableAttributes();
      });
    }

    const copyEditsBtn = document.getElementById("copy-edits-btn");
    if (copyEditsBtn) {
      copyEditsBtn.addEventListener("click", () => {
        const entries = Object.entries(state.editsLog);
        const payload =
          entries.length > 0
            ? "Please apply these micro-edits to the website:\n" +
              entries.map(([k, v]) => `- [${k}]: "${v}"`).join("\n")
            : "No inline text edits recorded yet — click any text while in Edit Mode to modify it, then click Copy.";
        try {
          navigator.clipboard?.writeText(payload);
          copyEditsBtn.textContent = `Copied ${entries.length} Edit(s) ✓`;
          setTimeout(() => {
            copyEditsBtn.textContent = "Copy My Inline Edits";
          }, 2000);
        } catch (err) {}
      });
    }

    document.body.addEventListener("input", (e) => {
      const target = e.target.closest("[data-ref]");
      if (target) {
        const ref = target.getAttribute("data-ref");
        state.editsLog[ref] = target.innerText.trim();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "Escape") {
        resetAllFilters();
      }
    });

    document.body.addEventListener("click", (e) => {
      if (state.editMode && e.target.closest('[data-editable="true"]')) {
        return;
      }

      if (e.target.closest("a")) {
        return;
      }

      const topicTrigger = e.target.closest(".filter-topic-trigger");
      if (topicTrigger) {
        e.stopPropagation();
        const topicId = topicTrigger.getAttribute("data-topic");
        state.topicFilter = state.topicFilter === topicId ? "all" : topicId;
        renderTopicBar();
        renderWritings();
        return;
      }

      const authorTrigger = e.target.closest(".filter-author-trigger");
      if (authorTrigger) {
        const id = authorTrigger.getAttribute("data-author-id");
        state.authorFilter = state.authorFilter === id ? "all" : id;
        renderPeople();
        renderWritings();
        return;
      }

      if (e.target.closest("#clear-author-filter")) {
        resetAllFilters();
        return;
      }

      const drawerTrigger = e.target.closest(".toggle-drawer-trigger");
      if (drawerTrigger) {
        const row = drawerTrigger.closest(".writing-row");
        if (row) row.classList.toggle("expanded");
        return;
      }

      // Click outside any interactive card/row/switcher resets active author/topic filters
      if (
        (state.authorFilter !== "all" || state.topicFilter !== "all") &&
        !e.target.closest(".writing-row") &&
        !e.target.closest(".minimal-switcher") &&
        !e.target.closest(".edit-mode-banner") &&
        !e.target.closest(".filter-indicator")
      ) {
        resetAllFilters();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
