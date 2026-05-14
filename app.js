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
const ioLetters = {};
const bridgeLines = {};
const reflectorVisual = {};

const CY = 330;

const X = {
  alphabet: 90,
  right: 520,
  middle: 900,
  left: 1280,
  reflector: 1660
};

const ROTOR_R = 118;
const LETTER_R = 158;
const LETTER_CIRCLE_R = 14;
const SOCKET_R = 116;
const INNER_HOLE_R = 42;
const INNER_WIRE_BASE_R = 88;

function indexOf(letter) {
  return ALPHABET.indexOf(letter);
}

function letterAt(index) {
  return ALPHABET[(index + 26) % 26];
}

function angleOf(index) {
  return index * (360 / 26);
}

function polar(cx, cy, radius, angleDeg) {
  const angle = (angleDeg - 90) * Math.PI / 180;

  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);

  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });

  return el;
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

  buildBridgeLines();
  buildAlphabetColumn();
  buildRotorVisual("right", "Rotor III", "III", X.right);
  buildRotorVisual("middle", "Rotor II", "II", X.middle);
  buildRotorVisual("left", "Rotor I", "I", X.left);
  buildReflectorVisual();

  updateRotorVisuals(false);
}

function buildAlphabetColumn() {
  const group = svgEl("g", { id: "alphabetColumn" });
  svg.appendChild(group);

  LETTERS.forEach((letter, i) => {
    const y = 48 + i * 22;

    const circle = svgEl("circle", {
      cx: X.alphabet,
      cy: y,
      r: 10,
      class: "io-letter"
    });

    const text = svgEl("text", {
      x: X.alphabet,
      y: y + 1,
      class: "io-text"
    });

    text.textContent = letter;

    group.appendChild(circle);
    group.appendChild(text);

    ioLetters[letter] = { circle, text, x: X.alphabet, y };
  });
}

function buildWirePathAroundCenter(cx, start, end, index) {
  const laneOffset = 62 + (index % 4) * 12;
  const useTopLane = index % 2 === 0;
  const laneY = CY + (useTopLane ? -laneOffset : laneOffset);
  const midX = (start.x + end.x) / 2;

  const bend1 = { x: start.x, y: laneY };
  const bend2 = { x: midX, y: laneY };
  const bend3 = { x: midX, y: end.y };

  return [
    `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    `L ${bend1.x.toFixed(1)} ${bend1.y.toFixed(1)}`,
    `L ${bend2.x.toFixed(1)} ${bend2.y.toFixed(1)}`,
    `L ${bend3.x.toFixed(1)} ${bend3.y.toFixed(1)}`,
    `L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`
  ].join(" ");
}

function buildRotorVisual(key, label, rotorName, cx) {
  const outerGroup = svgEl("g", { id: `${key}Rotor` });
  svg.appendChild(outerGroup);

  const title = svgEl("text", {
    x: cx,
    y: 58,
    class: "rotor-label"
  });
  title.textContent = label;
  outerGroup.appendChild(title);

  outerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: LETTER_R + 20,
    class: "outer-ring"
  }));

  const radialMap = {};
  const letterMap = {};

  LETTERS.forEach((letter, i) => {
    const angle = angleOf(i);

    const letterPos = polar(cx, CY, LETTER_R, angle);
    const letterEdge = polar(cx, CY, LETTER_R - LETTER_CIRCLE_R + 2, angle);
    const rotorEdge = polar(cx, CY, ROTOR_R, angle);

    const radial = svgEl("line", {
      x1: letterEdge.x,
      y1: letterEdge.y,
      x2: rotorEdge.x,
      y2: rotorEdge.y,
      class: "radial-wire"
    });

    outerGroup.appendChild(radial);
    radialMap[letter] = radial;

    const circle = svgEl("circle", {
      cx: letterPos.x,
      cy: letterPos.y,
      r: LETTER_CIRCLE_R,
      class: "letter-circle"
    });

    const text = svgEl("text", {
      x: letterPos.x,
      y: letterPos.y + 1,
      class: "letter-text"
    });

    text.textContent = letter;

    outerGroup.appendChild(circle);
    outerGroup.appendChild(text);

    letterMap[letter] = { circle, text };
  });

  const innerGroup = svgEl("g", {
    id: `${key}RotorInner`,
    class: "rotor-inner"
  });

  outerGroup.appendChild(innerGroup);

  innerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: ROTOR_R,
    class: "rotor-body"
  }));

  const wiring = ROTORS[rotorName].wiring;
  const wireMap = {};
  const socketMap = {};

  LETTERS.forEach((letter, i) => {
    const outLetter = wiring[i];

    const start = polar(cx, CY, SOCKET_R, angleOf(i));
    const end = polar(cx, CY, SOCKET_R, angleOf(indexOf(outLetter)));

    const path = svgEl("path", {
      d: buildWirePathAroundCenter(cx, start, end, i),
      class: "wire"
    });

    innerGroup.appendChild(path);

    wireMap[`${letter}-${outLetter}`] = path;
    wireMap[`${outLetter}-${letter}`] = path;

    const socketIn = svgEl("circle", {
      cx: start.x,
      cy: start.y,
      r: 5,
      class: "socket"
    });

    const socketOut = svgEl("circle", {
      cx: end.x,
      cy: end.y,
      r: 5,
      class: "socket"
    });

    innerGroup.appendChild(socketIn);
    innerGroup.appendChild(socketOut);

    socketMap[letter] = socketMap[letter] || [];
    socketMap[outLetter] = socketMap[outLetter] || [];

    socketMap[letter].push(socketIn);
    socketMap[outLetter].push(socketOut);
  });

  const notchLetter = ROTORS[rotorName].notch;
  const notchPoint = polar(cx, CY, ROTOR_R + 7, angleOf(indexOf(notchLetter)));

  innerGroup.appendChild(svgEl("circle", {
    cx: notchPoint.x,
    cy: notchPoint.y,
    r: 8,
    class: "notch-marker"
  }));

  innerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: INNER_HOLE_R,
    class: "inner-hole"
  }));

  innerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: 24,
    class: "center-dot"
  }));

  const positionText = svgEl("text", {
    x: cx,
    y: CY,
    class: "rotor-position"
  });

  positionText.textContent = "A";
  outerGroup.appendChild(positionText);

  rotorVisuals[key] = {
    cx,
    rotorName,
    innerGroup,
    positionText,
    radialMap,
    letterMap,
    wireMap,
    socketMap
  };
}

function buildReflectorVisual() {
  const cx = X.reflector;
  const outerGroup = svgEl("g", { id: "reflector" });
  svg.appendChild(outerGroup);

  const title = svgEl("text", {
    x: cx,
    y: 58,
    class: "reflector-label"
  });
  title.textContent = "Umkehrwalze B";
  outerGroup.appendChild(title);

  outerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: LETTER_R + 20,
    class: "outer-ring"
  }));

  outerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: ROTOR_R,
    class: "reflector-body"
  }));

  const letterMap = {};
  const socketMap = {};
  const wireMap = {};
  const used = new Set();

  LETTERS.forEach((letter, i) => {
    const angle = angleOf(i);

    const letterPos = polar(cx, CY, LETTER_R, angle);
    const socket = polar(cx, CY, SOCKET_R, angle);

    const circle = svgEl("circle", {
      cx: letterPos.x,
      cy: letterPos.y,
      r: LETTER_CIRCLE_R,
      class: "reflector-letter"
    });

    const text = svgEl("text", {
      x: letterPos.x,
      y: letterPos.y + 1,
      class: "reflector-letter-text"
    });

    text.textContent = letter;

    outerGroup.appendChild(circle);
    outerGroup.appendChild(text);

    letterMap[letter] = { circle, text };

    const socketCircle = svgEl("circle", {
      cx: socket.x,
      cy: socket.y,
      r: 5,
      class: "reflector-socket"
    });

    outerGroup.appendChild(socketCircle);
    socketMap[letter] = [socketCircle];
  });

  LETTERS.forEach((letter, i) => {
    if (used.has(letter)) return;

    const outLetter = REFLECTOR_B[i];

    used.add(letter);
    used.add(outLetter);

    const start = polar(cx, CY, SOCKET_R, angleOf(i));
    const end = polar(cx, CY, SOCKET_R, angleOf(indexOf(outLetter)));

    const path = svgEl("path", {
      d: buildWirePathAroundCenter(cx, start, end, i),
      class: "reflector-wire"
    });

    outerGroup.appendChild(path);

    wireMap[`${letter}-${outLetter}`] = path;
    wireMap[`${outLetter}-${letter}`] = path;
  });

  outerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: INNER_HOLE_R,
    class: "inner-hole"
  }));

  outerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: 24,
    class: "center-dot"
  }));

  reflectorVisual.cx = cx;
  reflectorVisual.letterMap = letterMap;
  reflectorVisual.socketMap = socketMap;
  reflectorVisual.wireMap = wireMap;
}

function buildBridgeLines() {
  const names = [
    "alphabetToRight",
    "rightToMiddle",
    "middleToLeft",
    "leftToReflector",
    "reflectorToLeft",
    "leftToMiddleBack",
    "middleToRightBack",
    "rightToAlphabet"
  ];

  names.forEach(name => {
    const line = svgEl("path", {
      d: "",
      class: "bridge-line"
    });

    svg.appendChild(line);
    bridgeLines[name] = line;
  });
}

function setRotorRotation(key, position, animated = true) {
  const visual = rotorVisuals[key];
  const degrees = -position * (360 / 26);

  if (!animated) {
    visual.innerGroup.style.transition = "none";
    visual.innerGroup.style.transform = `rotate(${degrees}deg)`;

    requestAnimationFrame(() => {
      visual.innerGroup.style.transition = "";
    });

    return;
  }

  visual.innerGroup.style.transform = `rotate(${degrees}deg)`;
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
  const rotorInput = letterAt(shifted);
  const rotorOutput = wiring[shifted];
  const outputIndex = (indexOf(rotorOutput) - position + 26) % 26;

  return {
    outputIndex,
    rotorInput,
    rotorOutput,
    screenInput: letterAt(letterIndex),
    screenOutput: letterAt(outputIndex)
  };
}

function rotorBackward(letterIndex, wiring, position) {
  const shifted = (letterIndex + position) % 26;
  const rotorInput = letterAt(shifted);
  const rotorOutputIndex = wiring.indexOf(rotorInput);
  const rotorOutput = letterAt(rotorOutputIndex);
  const outputIndex = (rotorOutputIndex - position + 26) % 26;

  return {
    outputIndex,
    rotorInput,
    rotorOutput,
    screenInput: letterAt(letterIndex),
    screenOutput: letterAt(outputIndex)
  };
}

function reflectIndex(letterIndex) {
  return indexOf(REFLECTOR_B[letterIndex]);
}

function traceEnigma(letter) {
  const trace = [];
  let i = indexOf(letter);

  trace.push({
    stage: "alphabetIn",
    index: i,
    letter
  });

  let r = rotorForward(i, ROTORS.III.wiring, rightPos);
  trace.push({
    stage: "right",
    direction: "forward",
    ...r
  });
  i = r.outputIndex;

  r = rotorForward(i, ROTORS.II.wiring, middlePos);
  trace.push({
    stage: "middle",
    direction: "forward",
    ...r
  });
  i = r.outputIndex;

  r = rotorForward(i, ROTORS.I.wiring, leftPos);
  trace.push({
    stage: "left",
    direction: "forward",
    ...r
  });
  i = r.outputIndex;

  const reflected = reflectIndex(i);

  trace.push({
    stage: "reflector",
    screenInput: letterAt(i),
    screenOutput: letterAt(reflected),
    rotorInput: letterAt(i),
    rotorOutput: letterAt(reflected),
    outputIndex: reflected
  });

  i = reflected;

  r = rotorBackward(i, ROTORS.I.wiring, leftPos);
  trace.push({
    stage: "left",
    direction: "back",
    ...r
  });
  i = r.outputIndex;

  r = rotorBackward(i, ROTORS.II.wiring, middlePos);
  trace.push({
    stage: "middle",
    direction: "back",
    ...r
  });
  i = r.outputIndex;

  r = rotorBackward(i, ROTORS.III.wiring, rightPos);
  trace.push({
    stage: "right",
    direction: "back",
    ...r
  });
  i = r.outputIndex;

  trace.push({
    stage: "alphabetOut",
    index: i,
    letter: letterAt(i)
  });

  return trace;
}

function getAlphabetPoint(letter) {
  const item = ioLetters[letter];
  return { x: item.x, y: item.y };
}

function getRotorPoint(key, screenLetter) {
  return polar(
    rotorVisuals[key].cx,
    CY,
    ROTOR_R,
    angleOf(indexOf(screenLetter))
  );
}

function getReflectorPoint(letter) {
  return polar(
    reflectorVisual.cx,
    CY,
    ROTOR_R,
    angleOf(indexOf(letter))
  );
}

function curvePath(a, b, offset = 0) {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y + offset}, ${midX} ${b.y + offset}, ${b.x} ${b.y}`;
}

function setBridge(name, a, b, offset = 0) {
  bridgeLines[name].setAttribute("d", curvePath(a, b, offset));
}

function updateBridgeVisuals(trace) {
  setBridge(
    "alphabetToRight",
    getAlphabetPoint(trace[0].letter),
    getRotorPoint("right", trace[1].screenInput),
    -25
  );

  setBridge(
    "rightToMiddle",
    getRotorPoint("right", trace[1].screenOutput),
    getRotorPoint("middle", trace[2].screenInput),
    -30
  );

  setBridge(
    "middleToLeft",
    getRotorPoint("middle", trace[2].screenOutput),
    getRotorPoint("left", trace[3].screenInput),
    -30
  );

  setBridge(
    "leftToReflector",
    getRotorPoint("left", trace[3].screenOutput),
    getReflectorPoint(trace[4].screenInput),
    -30
  );

  setBridge(
    "reflectorToLeft",
    getReflectorPoint(trace[4].screenOutput),
    getRotorPoint("left", trace[5].screenInput),
    30
  );

  setBridge(
    "leftToMiddleBack",
    getRotorPoint("left", trace[5].screenOutput),
    getRotorPoint("middle", trace[6].screenInput),
    30
  );

  setBridge(
    "middleToRightBack",
    getRotorPoint("middle", trace[6].screenOutput),
    getRotorPoint("right", trace[7].screenInput),
    30
  );

  setBridge(
    "rightToAlphabet",
    getRotorPoint("right", trace[7].screenOutput),
    getAlphabetPoint(trace[8].letter),
    25
  );
}

function clearHighlights() {
  Object.values(bridgeLines).forEach(line => {
    line.classList.remove("active-forward", "active-back");
  });

  Object.values(ioLetters).forEach(item => {
    item.circle.classList.remove("active-forward", "active-back");
    item.text.classList.remove("dark");
  });

  Object.values(rotorVisuals).forEach(visual => {
    Object.values(visual.radialMap).forEach(node => {
      node.classList.remove("active-forward", "active-back");
    });

    Object.values(visual.letterMap).forEach(item => {
      item.circle.classList.remove("active-forward", "active-back");
      item.text.classList.remove("dark");
    });

    Object.values(visual.socketMap).flat().forEach(node => {
      node.classList.remove("active-forward", "active-back");
    });

    Object.values(visual.wireMap).forEach(node => {
      node.classList.remove("active-forward", "active-back");
    });
  });

  Object.values(reflectorVisual.letterMap || {}).forEach(item => {
    item.circle.classList.remove("active-forward", "active-back");
    item.text.classList.remove("dark");
  });

  Object.values(reflectorVisual.socketMap || {}).flat().forEach(node => {
    node.classList.remove("active-forward", "active-back");
  });

  Object.values(reflectorVisual.wireMap || {}).forEach(node => {
    node.classList.remove("active-forward", "active-back");
  });
}

function highlightAlphabet(letter, direction) {
  const item = ioLetters[letter];

  if (!item) return;

  item.circle.classList.add(direction);
  item.text.classList.add("dark");
}

function highlightRotorStep(key, step, direction) {
  const visual = rotorVisuals[key];

  const inLetter = step.screenInput;
  const outLetter = step.screenOutput;

  const rotorIn = step.rotorInput;
  const rotorOut = step.rotorOutput;

  visual.radialMap[inLetter]?.classList.add(direction);
  visual.radialMap[outLetter]?.classList.add(direction);

  visual.letterMap[inLetter]?.circle.classList.add(direction);
  visual.letterMap[inLetter]?.text.classList.add("dark");

  visual.letterMap[outLetter]?.circle.classList.add(direction);
  visual.letterMap[outLetter]?.text.classList.add("dark");

  visual.wireMap[`${rotorIn}-${rotorOut}`]?.classList.add(direction);

  visual.socketMap[rotorIn]?.forEach(socket => {
    socket.classList.add(direction);
  });

  visual.socketMap[rotorOut]?.forEach(socket => {
    socket.classList.add(direction);
  });
}

function highlightReflector(step) {
  const inLetter = step.screenInput;
  const outLetter = step.screenOutput;

  reflectorVisual.wireMap[`${inLetter}-${outLetter}`]?.classList.add(
    "active-forward",
    "active-back"
  );

  reflectorVisual.letterMap[inLetter]?.circle.classList.add("active-forward");
  reflectorVisual.letterMap[inLetter]?.text.classList.add("dark");

  reflectorVisual.letterMap[outLetter]?.circle.classList.add("active-back");
  reflectorVisual.letterMap[outLetter]?.text.classList.add("dark");

  reflectorVisual.socketMap[inLetter]?.forEach(socket => {
    socket.classList.add("active-forward");
  });

  reflectorVisual.socketMap[outLetter]?.forEach(socket => {
    socket.classList.add("active-back");
  });
}

function prepareRun() {
  inputText = mode === "encrypt"
    ? plainText.value.toUpperCase()
    : cipherText.value.toUpperCase();

  outputText = "";
  currentIndex = 0;

  setStartPositions();
  clearHighlights();

  if (mode === "encrypt") {
    cipherText.value = "";
  } else {
    plainText.value = "";
  }

  stepState.textContent = "bereit";
}

function writeOutput() {
  if (mode === "encrypt") {
    cipherText.value = outputText;
  } else {
    plainText.value = outputText;
  }
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
  const outputLetter = trace[8].letter;

  updateBridgeVisuals(trace);

  highlightAlphabet(char, "active-forward");
  stepState.textContent = `${char} → ?`;

  bridgeLines.alphabetToRight.classList.add("active-forward");
  await wait(phaseDuration());

  highlightRotorStep("right", trace[1], "active-forward");
  await wait(phaseDuration());

  bridgeLines.rightToMiddle.classList.add("active-forward");
  await wait(phaseDuration());

  highlightRotorStep("middle", trace[2], "active-forward");
  await wait(phaseDuration());

  bridgeLines.middleToLeft.classList.add("active-forward");
  await wait(phaseDuration());

  highlightRotorStep("left", trace[3], "active-forward");
  await wait(phaseDuration());

  bridgeLines.leftToReflector.classList.add("active-forward");
  await wait(phaseDuration());

  highlightReflector(trace[4]);
  await wait(phaseDuration());

  bridgeLines.reflectorToLeft.classList.add("active-back");
  await wait(phaseDuration());

  highlightRotorStep("left", trace[5], "active-back");
  await wait(phaseDuration());

  bridgeLines.leftToMiddleBack.classList.add("active-back");
  await wait(phaseDuration());

  highlightRotorStep("middle", trace[6], "active-back");
  await wait(phaseDuration());

  bridgeLines.middleToRightBack.classList.add("active-back");
  await wait(phaseDuration());

  highlightRotorStep("right", trace[7], "active-back");
  await wait(phaseDuration());

  bridgeLines.rightToAlphabet.classList.add("active-back");
  await wait(phaseDuration());

  highlightAlphabet(outputLetter, "active-back");

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
