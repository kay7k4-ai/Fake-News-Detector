const textarea = document.getElementById("newsText");
const charCount = document.getElementById("charCount");
const historyList = document.getElementById("historyList");
const robotBubble = document.getElementById("robotBubble");

const robotMessages = {
  idle: "scanning...",
  analyzing: "analyzing...",
  fake: "FAKE detected!",
  real: "looks real!",
  error: "try again..."
};

const historyStore = [];

textarea.addEventListener("input", function () {
  charCount.textContent = this.value.length;
});

function setRobot(state) {
  robotBubble.textContent = robotMessages[state];
}

function clearInput() {
  textarea.value = "";
  charCount.textContent = "0";
  document.getElementById("resultSection").classList.remove("show");
  document.getElementById("resultEmpty").style.display = "flex";
  document.getElementById("errorBox").style.display = "none";
  document.getElementById("statusVal").textContent = "IDLE";
  setRobot("idle");
  textarea.focus();
}

function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("themeBtn");
  body.classList.toggle("light");
  btn.textContent = body.classList.contains("light") ? "☾ Dark" : "☀ Light";
}

function addToHistory(text, label) {
  const truncated = text.length > 40 ? text.substring(0, 40) + "..." : text;
  historyStore.unshift({ text: truncated, label });
  if (historyStore.length > 5) historyStore.pop();
  historyList.innerHTML = historyStore.map(item => `
    <div class="history-item">
      <div class="h-text">${item.text}</div>
      <div class="h-badge ${item.label === 'Fake' ? 'h-fake' : 'h-real'}">${item.label.toUpperCase()}</div>
    </div>
  `).join("");
}

function animateValue(el, start, end, duration, suffix = "") {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (start + (end - start) * eased).toFixed(1) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function revealResult(data) {
  const isFake = data.label === "Fake";
  const resultEmpty = document.getElementById("resultEmpty");
  const resultSection = document.getElementById("resultSection");
  const badge = document.getElementById("verdictBadge");
  const bar = document.getElementById("barFill");
  const confidenceEl = document.getElementById("confidenceText");
  const statusVal = document.getElementById("statusVal");
  const statMini = document.querySelector(".stat-mini");

  // reset everything before showing
  badge.textContent = "";
  badge.className = "verdict-badge";
  confidenceEl.textContent = "0.0%";
  bar.style.width = "0%";
  bar.style.background = isFake ? "#ff6b6b" : "#00ff88";
  statMini.style.opacity = "0";
  statMini.style.transform = "translateY(8px)";

  resultEmpty.style.display = "none";
  resultSection.classList.add("show");

  // step 1 — show verdict badge
  await delay(200);
  badge.textContent = data.label.toUpperCase();
  badge.className = "verdict-badge " + (isFake ? "verdict-fake" : "verdict-real");
  badge.style.animation = "popIn 0.3s ease";

  // step 2 — animate confidence number counting up
  await delay(400);
  animateValue(confidenceEl, 0, parseFloat(data.confidence), 900, "%");

  // step 3 — animate bar filling
  await delay(200);
  bar.style.transition = "width 0.9s cubic-bezier(0.4, 0, 0.2, 1)";
  bar.style.width = data.confidence + "%";

  // step 4 — reveal stat cards one by one
  await delay(700);
  statusVal.textContent = "DONE";
  statMini.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  statMini.style.opacity = "1";
  statMini.style.transform = "translateY(0)";
}

async function detect() {
  const text = textarea.value.trim();
  const errorBox = document.getElementById("errorBox");

  errorBox.style.display = "none";

  if (!text) {
    errorBox.textContent = "> error: no input provided";
    errorBox.style.display = "block";
    setRobot("error");
    return;
  }

  if (text.split(" ").length < 5) {
    errorBox.textContent = "> error: please enter at least a full sentence";
    errorBox.style.display = "block";
    setRobot("error");
    return;
  }

  document.querySelector(".btn-analyze").textContent = "[ ANALYZING... ]";
  document.getElementById("statusVal").textContent = "RUNNING";
  setRobot("analyzing");

  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (data.error) {
      errorBox.textContent = "> error: " + data.error;
      errorBox.style.display = "block";
      setRobot("error");
      return;
    }

    await revealResult(data);
    addToHistory(text, data.label);
    setRobot(data.label === "Fake" ? "fake" : "real");

  } catch (err) {
    errorBox.textContent = "> error: could not connect to server";
    errorBox.style.display = "block";
    setRobot("error");
  } finally {
    document.querySelector(".btn-analyze").textContent = "[ RUN ANALYSIS ]";
  }
}