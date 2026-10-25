
// TypeFlow — typing test logic
"use strict";

// Keep the passage library small and easy to edit.
const passages = {
  easy: [
    "Small steps every day can lead to big changes. Stay curious, keep learning, and enjoy the process.",
    "A calm mind helps you focus on the task in front of you. Take a breath and begin again.",
    "Practice makes progress. Every word you type is another chance to build a useful skill.",
    "Good habits grow with time. Start with one simple goal and work toward it each day.",
    "The best way to learn is to try, make mistakes, and try again. Progress comes from practice."
  ],
  medium: [
    "Consistency is more valuable than a burst of motivation. Build a routine that works for you, then keep showing up.",
    "Technology can make everyday tasks easier, but thoughtful decisions and creative ideas still make the biggest difference.",
    "A productive day does not require a perfect plan. Choose your priorities, reduce distractions, and focus on one task at a time.",
    "Learning a new skill takes patience. Measure your progress over weeks rather than judging yourself after a single attempt.",
    "Clear communication begins with careful listening. Ask useful questions, explain your ideas, and make room for other perspectives."
  ],
  hard: [
    "Reliable software isn't created by clever code alone; it also depends on thoughtful testing, readable structure, and careful attention to edge cases.",
    "When priorities shift unexpectedly, a flexible workflow helps you respond without losing sight of the project's most important objectives.",
    "A meaningful improvement is often the result of many small experiments: observe the outcome, question your assumptions, and refine your approach.",
    "Good engineering balances performance, accessibility, maintainability, and clarity instead of optimizing one measurement at the expense of everything else.",
    "Complex problems become easier to understand when you separate their assumptions, identify constraints, and evaluate each decision with evidence."
  ]
};

const STORAGE_KEYS = {
  bestWpm: "typeflow-best-wpm",
  bestAccuracy: "typeflow-best-accuracy",
  history: "typeflow-wpm-history"
};

const elements = {
  duration: document.getElementById("duration"),
  difficulty: document.getElementById("difficulty"),
  soundToggle: document.getElementById("soundToggle"),
  restartButton: document.getElementById("restartButton"),
  newPassageButton: document.getElementById("newPassageButton"),
  startButton: document.getElementById("startButton"),
  tryAgainButton: document.getElementById("tryAgainButton"),
  returnButton: document.getElementById("returnButton"),
  typingArea: document.getElementById("typingArea"),
  passageDisplay: document.getElementById("passageDisplay"),
  typingInput: document.getElementById("typingInput"),
  typingInstructions: document.getElementById("typingInstructions"),
  wpmStat: document.getElementById("wpmStat"),
  accuracyStat: document.getElementById("accuracyStat"),
  charactersStat: document.getElementById("charactersStat"),
  timeStat: document.getElementById("timeStat"),
  timerHint: document.getElementById("timerHint"),
  statusPill: document.getElementById("statusPill"),
  progressBar: document.getElementById("progressBar"),
  liveMessage: document.getElementById("liveMessage"),
  bestWpm: document.getElementById("bestWpm"),
  bestAccuracy: document.getElementById("bestAccuracy"),
  wpmChart: document.getElementById("wpmChart"),
  historyCount: document.getElementById("historyCount"),
  resultsPanel: document.getElementById("resultsPanel"),
  performanceMessage: document.getElementById("performanceMessage"),
  finalWpm: document.getElementById("finalWpm"),
  finalAccuracy: document.getElementById("finalAccuracy"),
  finalCorrect: document.getElementById("finalCorrect"),
  finalIncorrect: document.getElementById("finalIncorrect"),
  finalTime: document.getElementById("finalTime")
};

// Current test state.
let currentPassage = "";
let previousPassage = "";
let phase = "idle";
let countdownTimer = null;
let testTimer = null;
let countdownRemaining = 3;
let testStartedAt = null;
let configuredDuration = 30;
let latestElapsed = 0;
let lastSampleSecond = 0;
let wpmSamples = [];
let audioContext = null;

// Read browser storage safely.
function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.warn(`Could not read ${key} from localStorage.`, error);
    return fallback;
  }
}

// Save a value without breaking the test if storage is unavailable.
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save ${key} to localStorage.`, error);
    return false;
  }
}

// Keep stored history within the expected range.
function getHistory() {
  const history = readStorage(STORAGE_KEYS.history, []);

  if (!Array.isArray(history)) {
    return [];
  }

  return history.filter((entry) =>
    entry &&
    Number.isFinite(entry.wpm) &&
    Number.isFinite(entry.accuracy) &&
    Number.isFinite(entry.duration)
  ).slice(-8);
}

function getBestWpm() {
  const value = readStorage(STORAGE_KEYS.bestWpm, null);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function getBestAccuracy() {
  const value = readStorage(STORAGE_KEYS.bestAccuracy, null);
  return Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

// Select a passage at random, avoiding the immediate previous passage
// whenever the selected difficulty has more than one passage.
function choosePassage() {
  const difficulty = elements.difficulty.value;
  const options = passages[difficulty] || passages.medium;

  let choices = options.filter((passage) => passage !== previousPassage);

  if (choices.length === 0) {
    choices = options;
  }

  const index = Math.floor(Math.random() * choices.length);
  currentPassage = choices[index];
  previousPassage = currentPassage;

  elements.typingInput.maxLength = currentPassage.length;
  elements.typingInput.value = "";

  renderPassage();
}

// Return the current typed-character counts.
function getCounts() {
  const typed = elements.typingInput.value.slice(0, currentPassage.length);
  let correct = 0;

  for (let i = 0; i < typed.length; i += 1) {
    if (typed[i] === currentPassage[i]) {
      correct += 1;
    }
  }

  return {
    typedLength: typed.length,
    correct,
    incorrect: typed.length - correct
  };
}

function getAccuracy() {
  const counts = getCounts();

  if (counts.typedLength === 0) {
    return 100;
  }

  return (counts.correct / counts.typedLength) * 100;
}

// WPM is based on correctly typed characters divided by five.
function calculateWpm(elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return 0;
  }

  const counts = getCounts();
  return Math.round((counts.correct / 5) / (elapsedSeconds / 60));
}

function updateStatistics() {
  const counts = getCounts();
  const accuracy = getAccuracy();
  const wpm = calculateWpm(latestElapsed);

  elements.wpmStat.textContent = String(wpm);
  elements.accuracyStat.textContent = `${Math.round(accuracy)}%`;
  elements.charactersStat.textContent =
    `${counts.correct}/${counts.typedLength}`;

  const remaining = Math.max(
    0,
    Math.ceil(configuredDuration - latestElapsed)
  );

  elements.timeStat.replaceChildren();

  const timeNumber = document.createElement("span");
  timeNumber.textContent = String(remaining);

  const unit = document.createElement("span");
  unit.className = "stat-unit";
  unit.textContent = "s";

  elements.timeStat.append(timeNumber, unit);

  const progress = Math.min(
    100,
    (elements.typingInput.value.length / Math.max(1, currentPassage.length)) * 100
  );

  elements.progressBar.style.width = `${progress}%`;
}

// Draw the passage using text nodes rather than inserting HTML.
// This keeps user-entered characters safe.
function renderPassage() {
  const typed = elements.typingInput.value;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < currentPassage.length; i += 1) {
    const character = document.createElement("span");
    character.textContent = currentPassage[i];

    if (i < typed.length) {
      character.classList.add(
        typed[i] === currentPassage[i]
          ? "char-correct"
          : "char-incorrect"
      );
    }

    if (i === typed.length && phase !== "finished") {
      character.classList.add("char-cursor");
    }

    fragment.appendChild(character);
  }

  // Show a cursor at the end when the passage is fully typed.
  if (
    typed.length >= currentPassage.length &&
    phase !== "finished"
  ) {
    const cursor = document.createElement("span");
    cursor.className = "char-cursor";
    cursor.textContent = " ";
    fragment.appendChild(cursor);
  }

  elements.passageDisplay.replaceChildren(fragment);
  updateStatistics();
}

// Stop any active intervals before resetting or finishing.
function clearTimers() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (testTimer !== null) {
    clearInterval(testTimer);
    testTimer = null;
  }
}

function setStatus(label, state = "") {
  elements.statusPill.textContent = label;
  elements.statusPill.className = `status-pill ${state}`.trim();
}

// Start or reset the current passage without reloading the page.
function resetTest() {
  clearTimers();

  phase = "idle";
  testStartedAt = null;
  latestElapsed = 0;
  countdownRemaining = 3;
  lastSampleSecond = 0;
  wpmSamples = [];

  elements.typingInput.value = "";
  elements.typingInput.disabled = true;
  elements.resultsPanel.hidden = true;
  elements.startButton.hidden = false;
  elements.startButton.disabled = false;
  elements.startButton.textContent = "Start test →";
  elements.typingInstructions.textContent =
    "Select Start test, then type the passage as accurately as possible.";
  elements.timerHint.textContent = "Ready when you are";

  setStatus("Ready");
  renderPassage();
}

// Prepare a new test, then show a three-second countdown.
function startCountdown() {
  if (phase === "countdown" || phase === "running") {
    return;
  }

  clearTimers();

  const requestedDuration = Number(elements.duration.value);
  const allowedDurations = [15, 30, 60, 120];

  configuredDuration = allowedDurations.includes(requestedDuration)
    ? requestedDuration
    : 30;

  elements.duration.value = String(configuredDuration);

  // A completed test is a fresh attempt with the same passage.
  if (phase === "finished") {
    resetTest();
  }

  phase = "countdown";
  countdownRemaining = 3;
  elements.typingInput.disabled = true;
  elements.startButton.disabled = true;
  elements.startButton.textContent = `Get ready: ${countdownRemaining}`;
  elements.typingInstructions.textContent =
    "Get ready. Your timer starts when you type the first character.";
  elements.timerHint.textContent = "Countdown";
  setStatus("Get ready");

  countdownTimer = setInterval(() => {
    countdownRemaining -= 1;

    if (countdownRemaining > 0) {
      elements.startButton.textContent = `Get ready: ${countdownRemaining}`;
      elements.timerHint.textContent = "Countdown";
      playTone(440, 0.045);
      return;
    }

    clearInterval(countdownTimer);
    countdownTimer = null;

    phase = "ready";
    elements.typingInput.disabled = false;
    elements.typingInput.focus();
    elements.startButton.disabled = false;
    elements.startButton.textContent = "Restart test ↻";
    elements.typingInstructions.textContent =
      "Start typing to begin the timer. Escape restarts the test.";
    elements.timerHint.textContent = "Waiting for typing";
    setStatus("Type now");
    playTone(660, 0.07);
  }, 1000);
}

// The timer starts with the first actual character, not the countdown.
function beginTiming() {
  if (phase !== "ready") {
    return;
  }

  phase = "running";
  testStartedAt = Date.now();
  latestElapsed = 0;
  lastSampleSecond = 0;
  wpmSamples = [];

  elements.startButton.textContent = "Test in progress";
  elements.startButton.disabled = true;
  elements.typingInstructions.textContent =
    "Keep typing until time runs out or you finish the passage.";
  elements.timerHint.textContent = "Timer running";
  setStatus("In progress", "running");

  testTimer = setInterval(tick, 100);
}

// Update the countdown, live statistics, and chart samples.
function tick() {
  if (phase !== "running" || testStartedAt === null) {
    return;
  }

  latestElapsed = Math.min(
    configuredDuration,
    Math.max(0, (Date.now() - testStartedAt) / 1000)
  );

  updateStatistics();

  const elapsedSecond = Math.floor(latestElapsed);

  if (elapsedSecond > lastSampleSecond) {
    lastSampleSecond = elapsedSecond;
    wpmSamples.push({
      second: elapsedSecond,
      wpm: calculateWpm(latestElapsed)
    });
  }

  if (latestElapsed >= configuredDuration) {
    finishTest("time");
  }
}

// Short optional sound effects using the browser's Web Audio API.
function playTone(frequency, duration) {
  if (!elements.soundToggle.checked) {
    return;
  }

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Sound is optional; typing should work if audio is unavailable.
  }
}

// Give a short message based on the final WPM.
function getPerformanceMessage(wpm, accuracy) {
  if (wpm === 0) {
    return "Every great typist starts somewhere. Keep practicing!";
  }

  if (accuracy >= 98 && wpm >= 60) {
    return "Excellent speed and precision. You're in great flow!";
  }

  if (accuracy >= 95 && wpm >= 40) {
    return "Great work! Your speed and accuracy are building nicely.";
  }

  if (accuracy >= 95) {
    return "Very accurate typing. Build speed gradually while staying precise.";
  }

  if (wpm >= 50) {
    return "Nice speed! Slow down a little to improve your accuracy.";
  }

  return "Good effort. Consistent practice will help you improve.";
}

// Save personal records and a history of real completed tests.
function saveResult(wpm, accuracy, duration) {
  const oldBestWpm = getBestWpm();
  const oldBestAccuracy = getBestAccuracy();

  if (oldBestWpm === null || wpm > oldBestWpm) {
    writeStorage(STORAGE_KEYS.bestWpm, wpm);
  }

  if (oldBestAccuracy === null || accuracy > oldBestAccuracy) {
    writeStorage(STORAGE_KEYS.bestAccuracy, accuracy);
  }

  const history = getHistory();
  history.push({
    wpm,
    accuracy: Math.round(accuracy * 10) / 10,
    duration: Math.round(duration),
    date: new Date().toISOString()
  });

  writeStorage(STORAGE_KEYS.history, history.slice(-8));
  renderPersonalRecords();
}

// Display saved records and a small custom WPM bar chart.
function renderPersonalRecords() {
  const bestWpm = getBestWpm();
  const bestAccuracy = getBestAccuracy();
  const history = getHistory();

  elements.bestWpm.textContent =
    bestWpm === null ? "—" : String(bestWpm);

  elements.bestAccuracy.textContent =
    bestAccuracy === null ? "—" : `${Math.round(bestAccuracy)}%`;

  elements.historyCount.textContent =
    `${history.length} ${history.length === 1 ? "test" : "tests"}`;

  if (history.length === 0) {
    elements.wpmChart.replaceChildren();

    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "Complete a test to see your progress.";

    elements.wpmChart.appendChild(empty);
    elements.wpmChart.setAttribute(
      "aria-label",
      "No typing test results yet"
    );
    return;
  }

  elements.wpmChart.replaceChildren();

  const maximumWpm = Math.max(1, ...history.map((entry) => entry.wpm));
  elements.wpmChart.setAttribute(
    "aria-label",
    `WPM history: ${history.map((entry) => entry.wpm).join(", ")} words per minute`
  );

  history.forEach((entry, index) => {
    const wrap = document.createElement("div");
    wrap.className = "chart-bar-wrap";
    wrap.title =
      `Test ${index + 1}: ${entry.wpm} WPM, ${Math.round(entry.accuracy)}% accuracy`;

    const bar = document.createElement("div");
    bar.className = "chart-bar";
    const height = Math.max(4, (entry.wpm / maximumWpm) * 100);
    bar.style.height = `${height}px`;
    bar.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = String(entry.wpm);

    wrap.append(bar, label);
    elements.wpmChart.appendChild(wrap);
  });
}

// Finish the test exactly once and show the final results.
function finishTest(reason) {
  if (phase === "finished") {
    return;
  }

  if (phase === "running" && testStartedAt !== null) {
    latestElapsed = Math.max(
      0,
      Math.min(configuredDuration, (Date.now() - testStartedAt) / 1000)
    );
  }

  clearTimers();
  phase = "finished";

  elements.typingInput.disabled = true;
  elements.startButton.disabled = false;
  elements.startButton.hidden = true;
  elements.resultsPanel.hidden = false;

  setStatus("Completed", "finished");

  const counts = getCounts();
  const accuracy = counts.typedLength === 0
    ? 0
    : (counts.correct / counts.typedLength) * 100;
  const wpm = calculateWpm(latestElapsed);

  elements.finalWpm.replaceChildren();

  const finalSpeed = document.createElement("span");
  finalSpeed.textContent = String(wpm);

  const finalUnit = document.createElement("small");
  finalUnit.textContent = " WPM";

  elements.finalWpm.append(finalSpeed, finalUnit);
  elements.finalAccuracy.textContent = `${Math.round(accuracy)}%`;
  elements.finalCorrect.textContent = String(counts.correct);
  elements.finalIncorrect.textContent = String(counts.incorrect);
  elements.finalTime.textContent = `${Math.round(latestElapsed)}s`;
  elements.performanceMessage.textContent =
    getPerformanceMessage(wpm, accuracy);

  elements.timerHint.textContent =
    reason === "passage" ? "Passage completed" : "Time is up";

  elements.typingInstructions.textContent =
    "Your test is complete. Review your results below.";

  renderPassage();
  updateStatistics();

  // Only save a result when the user actually typed something.
  if (counts.typedLength > 0) {
    saveResult(wpm, accuracy, latestElapsed);
  }

  elements.liveMessage.textContent =
    `Test complete. ${wpm} words per minute and ${Math.round(accuracy)} percent accuracy.`;

  elements.resultsPanel.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start"
  });

  playTone(740, 0.12);
}

// Listen to text input. The textarea's maxlength prevents overtyping.
elements.typingInput.addEventListener("input", () => {
  if (phase === "finished" || phase === "idle" || phase === "countdown") {
    return;
  }

  const typed = elements.typingInput.value.slice(0, currentPassage.length);

  if (typed !== elements.typingInput.value) {
    elements.typingInput.value = typed;
  }

  if (typed.length > 0 && phase === "ready") {
    beginTiming();
  }

  const lastIndex = typed.length - 1;

  if (
    lastIndex >= 0 &&
    typed[lastIndex] !== currentPassage[lastIndex]
  ) {
    playTone(220, 0.035);
  }

  renderPassage();

  if (
    phase === "running" &&
    typed.length >= currentPassage.length
  ) {
    finishTest("passage");
  }
});

// Keep typing interaction focused on the visible passage.
elements.typingArea.addEventListener("click", () => {
  if (phase === "ready" || phase === "running") {
    elements.typingInput.focus();
  }
});

// Do not allow pasted text to bypass the typing test.
elements.typingInput.addEventListener("paste", (event) => {
  event.preventDefault();
});

// The restart button resets the current passage and waits for a new start.
elements.restartButton.addEventListener("click", () => {
  resetTest();
  elements.typingInput.focus();
});

// Select another passage and reset the test.
elements.newPassageButton.addEventListener("click", () => {
  resetTest();
  choosePassage();
});

// Start the countdown.
elements.startButton.addEventListener("click", () => {
  if (phase === "running") {
    return;
  }

  if (phase === "ready") {
    resetTest();
  }

  startCountdown();
});

elements.tryAgainButton.addEventListener("click", () => {
  elements.resultsPanel.hidden = true;
  resetTest();
  startCountdown();
});

elements.returnButton.addEventListener("click", () => {
  elements.resultsPanel.hidden = true;
  resetTest();
  elements.typingArea.scrollIntoView({ behavior: "auto", block: "center" });
});

// Changing settings creates a fresh passage for the chosen difficulty.
elements.duration.addEventListener("change", () => {
  const allowed = ["15", "30", "60", "120"];

  if (!allowed.includes(elements.duration.value)) {
    elements.duration.value = "30";
  }

  configuredDuration = Number(elements.duration.value);
  resetTest();
  updateStatistics();
});

elements.difficulty.addEventListener("change", () => {
  if (!Object.hasOwn(passages, elements.difficulty.value)) {
    elements.difficulty.value = "medium";
  }

  resetTest();
  choosePassage();
});

// Escape restarts the current passage without reloading the page.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    elements.resultsPanel.hidden = true;
    resetTest();
    elements.typingArea.scrollIntoView({
      behavior: "auto",
      block: "center"
    });
  }
});

// Initialize the application.
function init() {
  configuredDuration = Number(elements.duration.value);

  choosePassage();
  resetTest();
  renderPersonalRecords();
  updateStatistics();
}

init();
