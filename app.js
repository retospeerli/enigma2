const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTERS = ALPHABET.split("");

const ROTORS = {
  I: {
    wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ",
    notch: "Q"
  },
  II: {
    wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE",
    notch: "E"
  },
  III: {
    wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO",
    notch: "V"
  }
};

const REFLECTOR_B = "YRUHQSLDPXNGOKMIEBFZCWVJAT";

const clickSoundBase = new Audio("audio/klick1.wav");
clickSoundBase.preload = "auto";
clickSoundBase.load();

const svg = document.getElementById("enigmaSvg");

const leftRotorStart = document.getElementById("leftRotorStart");
const middleRotorStart = document.getElementById("middleRotorStart");
const rightRotorStart = document.getElementById("rightRotorStart");

const encryptBtn = document.getElementById("encryptBtn");
const decryptBtn = document.getElementById("decryptBtn");
const speedRange = document.getElementById("speedRange");
const speedLabel = document.getElementById("speedLabel");
const startBtn = document.getElementById("startBtn");
const stepBtn = document.getElementById("stepBtn");
const resetBtn = document.getElementById("resetBtn");
const plainText = document.getElementById("plainText");
const cipherText = document.getElementById("cipherText");

const leftState = document.getElementById("leftState");
const middleState = document.getElementById("middleState");
const rightState = document.getElementById("rightState");
const stepState = document.getElementById("stepState");

let mode = "encrypt";
let running = false;
let inputText = "";
let outputText = "";
let currentIndex = 0;

let leftPos = 0;
let middlePos = 0;
let rightPos = 0;

const rotorVisuals = {};
const pathLines = {};
const inputLetters = {};
const outputLetters = {};
let reflectorNode = null;

const CX = {
  input: 80,
  right: 360,
  middle: 590,
  left: 820,
  reflector: 1060,
  output: 1120
};

const CY = 390;
const ROTOR_R = 92;
const LETTER_R = 128;
const LETTER_CIRCLE_R = 13;
const SOCKET_R = 90;
const INNER_R = 37;

function indexOf(letter) {
  return ALPHABET.indexOf(letter);
}

function letterAt(index) {
  return ALPHABET[(index + 26) % 26];
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
}

function polar(cx, cy, radius, angleDeg) {
  const angle = (angleDeg - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function angleOf(index) {
  return index * (360 / 26);
}

function fillSelect(select) {
  LETTERS.forEach(letter => {
    const option = document.createElement("option");
    option.value = letter;
    option.textContent = letter;
    select.appendChild(option);
  });
}

function buildInterface() {
  fillSelect(leftRotorStart);
  fillSelect(middleRotorStart);
  fillSelect(rightRotorStart);

  leftRotorStart.value = "A";
  middleRotorStart.value = "A";
  rightRotorStart.value = "A";
}

function buildSvg() {
  svg.innerHTML = "";

  buildInputOutputAlphabet("input", CX.input);
  buildRotor("right", "Rotor III", "III", CX.right);
  buildRotor("middle", "Rotor II", "II", CX.middle);
  buildRotor("left", "Rotor I", "I", CX.left);
  buildReflector();
  buildInputOutputAlphabet("output", CX.output);

  buildMachineLines();

  updateRotorVisuals(false);
}

function buildInputOutputAlphabet(kind, cx) {
  const group = svgEl("g", { id: `${kind}Alphabet` });
  svg.appendChild(group);

  LETTERS.forEach((letter, i) => {
    const y = 90 + i * 22;

    const circle = svgEl("circle", {
      cx,
      cy: y,
      r: 10,
      class: "letter-circle"
    });

    const text = svgEl("text", {
      x: cx,
      y: y + 1,
      class: "letter-text"
    });

    text.textContent = letter;

    group.appendChild(circle);
    group.appendChild(text);

    if (kind === "input") inputLetters[letter] = { circle, text, x: cx, y };
    else outputLetters[letter] = { circle, text, x: cx, y };
  });
}

function buildRotor(key, label, rotorName, cx) {
  const group = svgEl("g", { id: `${key}RotorWrap` });
  svg.appendChild(group);

  const title = svgEl("text", {
    x: cx,
    y: 145,
    class: "rotor-label"
  });
  title.textContent = label;
  group.appendChild(title);

  const rotorGroup = svgEl("g", {
    id: `${key}RotorGroup`,
    class: "rotor-group"
  });

  group.appendChild(rotorGroup);

  rotorGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: LETTER_R + 19,
    class: "outer-ring"
  }));

  rotorGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: ROTOR_R,
    class: "rotor-body"
  }));

  const wiring = ROTORS[rotorName].wiring;

  LETTERS.forEach((letter, i) => {
    const outer = polar(cx, CY, LETTER_R, angleOf(i));
    const socket = polar(cx, CY, SOCKET_R, angleOf(i));
    const mapped = indexOf(wiring[i]);
    const inner = polar(cx, CY, 56 + (i % 5) * 6, angleOf(mapped));

    const radial = svgEl("line", {
      x1: outer.x,
      y1: outer.y,
      x2: socket.x,
      y2: socket.y,
      class: "wire"
    });

    rotorGroup.appendChild(radial);

    const bend = {
      x: inner.x,
      y: socket.y
    };

    const path = svgEl("path", {
      d: `M ${socket.x} ${socket.y} L ${bend.x} ${bend.y} L ${inner.x} ${inner.y}`,
      class: "wire"
    });

    rotorGroup.appendChild(path);

    const socketCircle = svgEl("circle", {
      cx: socket.x,
      cy: socket.y,
      r: 4.5,
      class: "socket",
      "data-letter": letter
    });

    rotorGroup.appendChild(socketCircle);

    const letterCircle = svgEl("circle", {
      cx: outer.x,
      cy: outer.y,
      r: LETTER_CIRCLE_R,
      class: "letter-circle",
      "data-letter": letter
    });

    const letterText = svgEl("text", {
      x: outer.x,
      y: outer.y + 1,
      class: "letter-text",
      "data-letter": letter
    });
    letterText.textContent = letter;

    rotorGroup.appendChild(letterCircle);
    rotorGroup.appendChild(letterText);
  });

  rotorGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: INNER_R,
    class: "inner-hole"
  }));

  rotorGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: 22,
    class: "center-dot"
  }));

  const posText = svgEl("text", {
    x: cx,
    y: CY,
    class: "rotor-position",
    id: `${key}RotorPosition`
  });
  posText.textContent = "A";
  group.appendChild(posText);

  rotorVisuals[key] = {
    group: rotorGroup,
    positionText: posText,
    cx
  };
}

function buildReflector() {
  const group = svgEl("g", { id: "reflectorGroup" });
  svg.appendChild(group);

  reflectorNode = svgEl("rect", {
    x: CX.reflector - 58,
    y: CY - 135,
    width: 116,
    height: 270,
    rx: 34,
    class: "reflector"
  });

  const text = svgEl("text", {
    x: CX.reflector,
    y: CY,
    class: "reflector-text"
  });
  text.textContent = "UKW B";

  group.appendChild(reflectorNode);
  group.appendChild(text);
}

function buildMachineLines() {
  const names = [
    "inputToRight",
    "rightToMiddle",
    "middleToLeft",
    "leftToReflector",
    "reflectorToLeft",
    "leftToMiddleBack",
    "middleToRightBack",
    "rightToOutput"
  ];

  names.forEach(name => {
    const path = svgEl("path", {
      d: "",
      class: "path-line",
      id: name
    });
    svg.insertBefore(path, svg.firstChild);
    pathLines[name] = path;
  });
}

function linePath(x1, y1, x2, y2, offset = 0) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1 + offset}, ${midX} ${y2 + offset}, ${x2} ${y2}`;
}

function setPath(name, x1, y1, x2, y2, offset = 0) {
  pathLines[name].setAttribute("d", linePath(x1, y1, x2, y2, offset));
}

function updateRotorVisuals(animated = true) {
  setRotorRotation("left", leftPos, animated);
  setRotorRotation("middle", middlePos, animated);
  setRotorRotation("right", rightPos, animated);

  leftState.textContent = letterAt(leftPos);
  middleState.textContent = letterAt(middlePos);
  rightState.textContent = letterAt(rightPos);

  rotorVisuals.left.positionText.textContent = letterAt(leftPos);
  rotorVisuals.middle.positionText.textContent = letterAt(middlePos);
  rotorVisuals.right.positionText.textContent = letterAt(rightPos);
}

function setRotorRotation(key, position, animated = true) {
  const group = rotorVisuals[key].group;
  const degrees = position * (360 / 26);

  if (!animated) {
    group.style.transition = "none";
    group.style.transform = `rotate(${degrees}deg)`;

    requestAnimationFrame(() => {
      group.style.transition = "";
    });
    return;
  }

  group.style.transform = `rotate(${degrees}deg)`;
}

function setStartPositions() {
  leftPos = indexOf(leftRotorStart.value);
  middlePos = indexOf(middleRotorStart.value);
  rightPos = indexOf(rightRotorStart.value);

  updateRotorVisuals(false);
}

function shouldStepMiddle() {
  return letterAt(rightPos) === ROTORS.III.notch;
}

function shouldStepLeft() {
  return letterAt(middlePos) === ROTORS.II.notch;
}

function stepRotors() {
  const middleAtNotch = shouldStepLeft();
  const rightAtNotch = shouldStepMiddle();

  if (middleAtNotch) {
    leftPos = (leftPos + 1) % 26;
  }

  if (middleAtNotch || rightAtNotch) {
    middlePos = (middlePos + 1) % 26;
  }

  rightPos = (rightPos + 1) % 26;

  updateRotorVisuals(true);
}

function rotorForward(letterIndex, wiring, position) {
  const shifted = (letterIndex + position) % 26;
  const wiredLetter = wiring[shifted];
  return (indexOf(wiredLetter) - position + 26) % 26;
}

function rotorBackward(letterIndex, wiring, position) {
  const shifted = (letterIndex + position) % 26;
  const inputIndex = wiring.indexOf(letterAt(shifted));
  return (inputIndex - position + 26) % 26;
}

function reflector(letterIndex) {
  return indexOf(REFLECTOR_B[letterIndex]);
}

function traceEnigma(letter) {
  const trace = [];
  let i = indexOf(letter);

  trace.push({ stage: "input", index: i });

  i = rotorForward(i, ROTORS.III.wiring, rightPos);
  trace.push({ stage: "right", index: i });

  i = rotorForward(i, ROTORS.II.wiring, middlePos);
  trace.push({ stage: "middle", index: i });

  i = rotorForward(i, ROTORS.I.wiring, leftPos);
  trace.push({ stage: "left", index: i });

  i = reflector(i);
  trace.push({ stage: "reflector", index: i });

  i = rotorBackward(i, ROTORS.I.wiring, leftPos);
  trace.push({ stage: "leftBack", index: i });

  i = rotorBackward(i, ROTORS.II.wiring, middlePos);
  trace.push({ stage: "middleBack", index: i });

  i = rotorBackward(i, ROTORS.III.wiring, rightPos);
  trace.push({ stage: "rightBack", index: i });

  trace.push({ stage: "output", index: i });

  return trace;
}

function getStagePoint(stage, index) {
  const y = 90 + index * 22;

  if (stage === "input") return { x: CX.input, y };
  if (stage === "output") return { x: CX.output, y };

  if (stage === "right") return polar(CX.right, CY, SOCKET_R, angleOf(index));
  if (stage === "middle") return polar(CX.middle, CY, SOCKET_R, angleOf(index));
  if (stage === "left") return polar(CX.left, CY, SOCKET_R, angleOf(index));
  if (stage === "reflector") return { x: CX.reflector, y };

  if (stage === "leftBack") return polar(CX.left, CY, SOCKET_R, angleOf(index));
  if (stage === "middleBack") return polar(CX.middle, CY, SOCKET_R, angleOf(index));
  if (stage === "rightBack") return polar(CX.right, CY, SOCKET_R, angleOf(index));

  return { x: 0, y: 0 };
}

function clearHighlights() {
  Object.values(pathLines).forEach(line => line.classList.remove("active"));

  Object.values(inputLetters).forEach(item => {
    item.circle.classList.remove("active-in", "active-out");
    item.text.classList.remove("dark");
  });

  Object.values(outputLetters).forEach(item => {
    item.circle.classList.remove("active-in", "active-out");
    item.text.classList.remove("dark");
  });

  document.querySelectorAll(".socket").forEach(node => node.classList.remove("active"));
  document.querySelectorAll(".wire").forEach(node => node.classList.remove("active"));

  if (reflectorNode) reflectorNode.classList.remove("active");
}

function highlightLetter(collection, letter, className) {
  const item = collection[letter];
  if (!item) return;

  item.circle.classList.add(className);
  item.text.classList.add("dark");
}

function updatePathVisuals(trace) {
  const p0 = getStagePoint("input", trace[0].index);
  const p1 = getStagePoint("right", trace[1].index);
  const p2 = getStagePoint("middle", trace[2].index);
  const p3 = getStagePoint("left", trace[3].index);
  const p4 = getStagePoint("reflector", trace[4].index);
  const p5 = getStagePoint("leftBack", trace[5].index);
  const p6 = getStagePoint("middleBack", trace[6].index);
  const p7 = getStagePoint("rightBack", trace[7].index);
  const p8 = getStagePoint("output", trace[8].index);

  setPath("inputToRight", p0.x, p0.y, p1.x, p1.y, -20);
  setPath("rightToMiddle", p1.x, p1.y, p2.x, p2.y, -30);
  setPath("middleToLeft", p2.x, p2.y, p3.x, p3.y, -30);
  setPath("leftToReflector", p3.x, p3.y, p4.x, p4.y, -30);

  setPath("reflectorToLeft", p4.x, p4.y, p5.x, p5.y, 30);
  setPath("leftToMiddleBack", p5.x, p5.y, p6.x, p6.y, 30);
  setPath("middleToRightBack", p6.x, p6.y, p7.x, p7.y, 30);
  setPath("rightToOutput", p7.x, p7.y, p8.x, p8.y, 20);
}

function prepareRun() {
  inputText = mode === "encrypt"
    ? plainText.value.toUpperCase()
    : cipherText.value.toUpperCase();

  outputText = "";
  currentIndex = 0;

  setStartPositions();
  clearHighlights();

  if (mode === "encrypt") cipherText.value = "";
  else plainText.value = "";

  stepState.textContent = "bereit";
}

function writeOutput() {
  if (mode === "encrypt") cipherText.value = outputText;
  else plainText.value = outputText;
}

async function processOneCharacter() {
  if (currentIndex >= inputText.length) {
    running = false;
    stepState.textContent = "fertig";
    setButtons(false);
    return false;
  }

  clearHighlights();

  const char = inputText[currentIndex];

  if (!LETTERS.includes(char)) {
    outputText += char;
    writeOutput();
    currentIndex++;
    return true;
  }

  playClick();

  stepRotors();

  await wait(phaseDuration());

  const trace = traceEnigma(char);
  const outputLetter = letterAt(trace[8].index);

  updatePathVisuals(trace);
  highlightLetter(inputLetters, char, "active-in");
  stepState.textContent = `${char} → ?`;

  const pathOrder = [
    "inputToRight",
    "rightToMiddle",
    "middleToLeft",
    "leftToReflector",
    "reflectorToLeft",
    "leftToMiddleBack",
    "middleToRightBack",
    "rightToOutput"
  ];

  for (const path of pathOrder) {
    pathLines[path].classList.add("active");

    if (path === "leftToReflector") {
      reflectorNode.classList.add("active");
    }

    await wait(phaseDuration() / 1.8);
  }

  highlightLetter(outputLetters, outputLetter, "active-out");

  outputText += outputLetter;
  writeOutput();

  stepState.textContent = `${char} → ${outputLetter}`;

  await wait(phaseDuration());

  currentIndex++;
  return true;
}

function playClick() {
  const sound = clickSoundBase.cloneNode(true);
  sound.volume = 0.8;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function phaseDuration() {
  const charsPerSecond = Number(speedRange.value);
  return (1000 / charsPerSecond) / 3;
}

function updateSpeedLabel() {
  speedLabel.textContent = speedRange.value;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setMode(newMode) {
  mode = newMode;

  encryptBtn.classList.toggle("active", mode === "encrypt");
  decryptBtn.classList.toggle("active", mode === "decrypt");

  resetAll();
}

function setButtons(disabled) {
  startBtn.disabled = disabled;
  stepBtn.disabled = disabled;
  resetBtn.disabled = disabled;
  encryptBtn.disabled = disabled;
  decryptBtn.disabled = disabled;
  leftRotorStart.disabled = disabled;
  middleRotorStart.disabled = disabled;
  rightRotorStart.disabled = disabled;
}

async function runAll() {
  if (running) return;

  prepareRun();
  running = true;
  setButtons(true);

  while (running && currentIndex < inputText.length) {
    await processOneCharacter();
  }

  running = false;
  setButtons(false);
}

async function runStep() {
  if (running) return;

  if (currentIndex === 0) {
    prepareRun();
  }

  running = true;
  setButtons(true);

  await processOneCharacter();

  running = false;
  setButtons(false);
}

function resetAll() {
  running = false;
  currentIndex = 0;
  outputText = "";

  setStartPositions();
  clearHighlights();

  stepState.textContent = "bereit";
}

function normalizeTextareas() {
  plainText.value = plainText.value.toUpperCase();
  cipherText.value = cipherText.value.toUpperCase();
}

buildInterface();
buildSvg();
setStartPositions();
updateSpeedLabel();

encryptBtn.addEventListener("click", () => setMode("encrypt"));
decryptBtn.addEventListener("click", () => setMode("decrypt"));

startBtn.addEventListener("click", runAll);
stepBtn.addEventListener("click", runStep);
resetBtn.addEventListener("click", resetAll);

speedRange.addEventListener("input", updateSpeedLabel);

plainText.addEventListener("input", normalizeTextareas);
cipherText.addEventListener("input", normalizeTextareas);

leftRotorStart.addEventListener("change", resetAll);
middleRotorStart.addEventListener("change", resetAll);
rightRotorStart.addEventListener("change", resetAll);
