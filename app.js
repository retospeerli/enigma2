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
const bridgeLines = {};
const ioLetters = {
  input: {},
  output: {}
};

let reflectorNode = null;

const CY = 430;

const X = {
  input: 90,
  right: 390,
  middle: 640,
  left: 890,
  reflector: 1190,
  output: 1320
};

const ROTOR_R = 92;
const LETTER_R = 128;
const LETTER_CIRCLE_R = 13;
const SOCKET_R = 90;
const INNER_HOLE_R = 38;
const INNER_WIRE_R = 65;

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

  buildInputOutputColumn("input", X.input);

  buildRotorVisual("right", "Rotor III", "III", X.right);
  buildRotorVisual("middle", "Rotor II", "II", X.middle);
  buildRotorVisual("left", "Rotor I", "I", X.left);

  buildReflector();

  buildInputOutputColumn("output", X.output);
  buildBridgeLines();

  updateRotorVisuals(false);
}

function buildInputOutputColumn(kind, cx) {
  const group = svgEl("g", { id: `${kind}Column` });
  svg.appendChild(group);

  LETTERS.forEach((letter, i) => {
    const y = 130 + i * 22;

    const circle = svgEl("circle", {
      cx,
      cy: y,
      r: 10,
      class: "io-letter"
    });

    const text = svgEl("text", {
      x: cx,
      y: y + 1,
      class: "io-text"
    });

    text.textContent = letter;

    group.appendChild(circle);
    group.appendChild(text);

    ioLetters[kind][letter] = {
      circle,
      text,
      x: cx,
      y
    };
  });
}

function buildRotorVisual(key, label, rotorName, cx) {
  const outerGroup = svgEl("g", { id: `${key}Rotor` });
  svg.appendChild(outerGroup);

  const title = svgEl("text", {
    x: cx,
    y: 130,
    class: "rotor-label"
  });
  title.textContent = label;
  outerGroup.appendChild(title);

  outerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: LETTER_R + 18,
    class: "outer-ring"
  }));

  const radialMap = {};
  const letterMap = {};
  const socketMap = {};
  const wireMap = {};

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
      class: "radial-wire",
      "data-letter": letter
    });

    outerGroup.appendChild(radial);
    radialMap[letter] = radial;

    const letterCircle = svgEl("circle", {
      cx: letterPos.x,
      cy: letterPos.y,
      r: LETTER_CIRCLE_R,
      class: "letter-circle",
      "data-letter": letter
    });

    const letterText = svgEl("text", {
      x: letterPos.x,
      y: letterPos.y + 1,
      class: "letter-text",
      "data-letter": letter
    });
    letterText.textContent = letter;

    outerGroup.appendChild(letterCircle);
    outerGroup.appendChild(letterText);

    letterMap[letter] = {
      circle: letterCircle,
      text: letterText
    };
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

  LETTERS.forEach((letter, i) => {
    const outLetter = wiring[i];

    const start = polar(cx, CY, SOCKET_R, angleOf(i));
    const end = polar(cx, CY, SOCKET_R, angleOf(indexOf(outLetter)));

    const layer = i % 5;
    const r1 = INNER_WIRE_R - layer * 5;
    const r2 = INNER_WIRE_R - ((layer + 2) % 5) * 5;

    const p1 = polar(cx, CY, r1, angleOf(i));
    const p2 = polar(cx, CY, r2, angleOf(indexOf(outLetter)));
    const bend = orthogonalBend(p1, p2, cx, CY);

    const path = svgEl("path", {
      d: [
        `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
        `L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
        `L ${bend.x.toFixed(1)} ${bend.y.toFixed(1)}`,
        `L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
        `L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`
      ].join(" "),
      class: "wire",
      "data-in": letter,
      "data-out": outLetter
    });

    innerGroup.appendChild(path);
    wireMap[`${letter}-${outLetter}`] = path;
    wireMap[`${outLetter}-${letter}`] = path;

    const socketIn = svgEl("circle", {
      cx: start.x,
      cy: start.y,
      r: 4.8,
      class: "socket",
      "data-letter": letter
    });

    const socketOut = svgEl("circle", {
      cx: end.x,
      cy: end.y,
      r: 4.8,
      class: "socket",
      "data-letter": outLetter
    });

    innerGroup.appendChild(socketIn);
    innerGroup.appendChild(socketOut);

    socketMap[letter] = socketMap[letter] || [];
    socketMap[outLetter] = socketMap[outLetter] || [];
    socketMap[letter].push(socketIn);
    socketMap[outLetter].push(socketOut);
  });

  innerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: INNER_HOLE_R,
    class: "inner-hole"
  }));

  innerGroup.appendChild(svgEl("circle", {
    cx,
    cy: CY,
    r: 22,
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
    innerGroup,
    positionText,
    radialMap,
    letterMap,
    socketMap,
    wireMap
  };
}

function buildReflector() {
  const group = svgEl("g", { id: "reflectorGroup" });
  svg.appendChild(group);

  reflectorNode = svgEl("rect", {
    x: X.reflector - 65,
    y: CY - 130,
    width: 130,
    height: 260,
    rx: 36,
    class: "reflector"
  });

  const text1 = svgEl("text", {
    x: X.reflector,
    y: CY - 14,
    class: "reflector-text"
  });
  text1.textContent = "Umkehr-";

  const text2 = svgEl("text", {
    x: X.reflector,
    y: CY + 18,
    class: "reflector-text"
  });
  text2.textContent = "walze B";

  group.appendChild(reflectorNode);
  group.appendChild(text1);
  group.appendChild(text2);
}

function buildBridgeLines() {
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
    const line = svgEl("path", {
      d: "",
      class: "bridge-line",
      id: name
    });

    svg.insertBefore(line, svg.firstChild);
    bridgeLines[name] = line;
  });
}

function orthogonalBend(p1, p2, cx, cy) {
  const horizontalFirst = Math.abs(p1.x - cx) > Math.abs(p1.y - cy);

  if (horizontalFirst) {
    return { x: p2.x, y: p1.y };
  }

  return { x: p1.x, y: p2.y };
}

function setRotorRotation(key, position, animated = true) {
  const visual = rotorVisuals[key];
  const degrees = position * (360 / 26);

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
  const outputLetter = wiring[shifted];
  const outputIndex = (indexOf(outputLetter) - position + 26) % 26;

  return {
    outputIndex,
    rotorInput: letterAt(shifted),
    rotorOutput: outputLetter,
    screenInput: letterAt(letterIndex),
    screenOutput: letterAt(outputIndex)
  };
}

function rotorBackward(letterIndex, wiring, position) {
  const shifted = (letterIndex + position) % 26;
  const shiftedLetter = letterAt(shifted);
  const rotorInputIndex = wiring.indexOf(shiftedLetter);
  const outputIndex = (rotorInputIndex - position + 26) % 26;

  return {
    outputIndex,
    rotorInput: shiftedLetter,
    rotorOutput: letterAt(rotorInputIndex),
    screenInput: letterAt(letterIndex),
    screenOutput: letterAt(outputIndex)
  };
}

function reflect(letterIndex) {
  return indexOf(REFLECTOR_B[letterIndex]);
}

function traceEnigma(letter) {
  const trace = [];
  let i = indexOf(letter);

  trace.push({ stage: "input", index: i, letter });

  let r = rotorForward(i, ROTORS.III.wiring, rightPos);
  trace.push({ stage: "right", direction: "forward", ...r });
  i = r.outputIndex;

  r = rotorForward(i, ROTORS.II.wiring, middlePos);
  trace.push({ stage: "middle", direction: "forward", ...r });
  i = r.outputIndex;

  r = rotorForward(i, ROTORS.I.wiring, leftPos);
  trace.push({ stage: "left", direction: "forward", ...r });
  i = r.outputIndex;

  const reflected = reflect(i);
  trace.push({
    stage: "reflector",
    indexIn: i,
    indexOut: reflected,
    letterIn: letterAt(i),
    letterOut: letterAt(reflected)
  });
  i = reflected;

  r = rotorBackward(i, ROTORS.I.wiring, leftPos);
  trace.push({ stage: "left", direction: "backward", ...r });
  i = r.outputIndex;

  r = rotorBackward(i, ROTORS.II.wiring, middlePos);
  trace.push({ stage: "middle", direction: "backward", ...r });
  i = r.outputIndex;

  r = rotorBackward(i, ROTORS.III.wiring, rightPos);
  trace.push({ stage: "right", direction: "backward", ...r });
  i = r.outputIndex;

  trace.push({ stage: "output", index: i, letter: letterAt(i) });

  return trace;
}

function getColumnPoint(kind, index) {
  const item = ioLetters[kind][letterAt(index)];
  return { x: item.x, y: item.y };
}

function getRotorPoint(key, screenLetter) {
  return polar(rotorVisuals[key].cx, CY, ROTOR_R, angleOf(indexOf(screenLetter)));
}

function getReflectorPoint(index) {
  return {
    x: X.reflector,
    y: 130 + index * 22
  };
}

function curvePath(a, b, offset = 0) {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y + offset}, ${midX} ${b.y + offset}, ${b.x} ${b.y}`;
}

function setBridge(name, a, b, offset = 0) {
  bridgeLines[name].setAttribute("d", curvePath(a, b, offset));
}

function updateBridgeVisuals(trace) {
  const pInput = getColumnPoint("input", trace[0].index);
  const pRightIn = getRotorPoint("right", trace[1].screenInput);
  const pRightOut = getRotorPoint("right", trace[1].screenOutput);
  const pMiddleIn = getRotorPoint("middle", trace[2].screenInput);
  const pMiddleOut = getRotorPoint("middle", trace[2].screenOutput);
  const pLeftIn = getRotorPoint("left", trace[3].screenInput);
  const pLeftOut = getRotorPoint("left", trace[3].screenOutput);

  const pReflectIn = getReflectorPoint(trace[4].indexIn);
  const pReflectOut = getReflectorPoint(trace[4].indexOut);

  const pLeftBackIn = getRotorPoint("left", trace[5].screenInput);
  const pLeftBackOut = getRotorPoint("left", trace[5].screenOutput);
  const pMiddleBackIn = getRotorPoint("middle", trace[6].screenInput);
  const pMiddleBackOut = getRotorPoint("middle", trace[6].screenOutput);
  const pRightBackIn = getRotorPoint("right", trace[7].screenInput);
  const pRightBackOut = getRotorPoint("right", trace[7].screenOutput);

  const pOutput = getColumnPoint("output", trace[8].index);

  setBridge("inputToRight", pInput, pRightIn, -25);
  setBridge("rightToMiddle", pRightOut, pMiddleIn, -30);
  setBridge("middleToLeft", pMiddleOut, pLeftIn, -30);
  setBridge("leftToReflector", pLeftOut, pReflectIn, -30);

  setBridge("reflectorToLeft", pReflectOut, pLeftBackIn, 30);
  setBridge("leftToMiddleBack", pLeftBackOut, pMiddleBackIn, 30);
  setBridge("middleToRightBack", pMiddleBackOut, pRightBackIn, 30);
  setBridge("rightToOutput", pRightBackOut, pOutput, 25);
}

function clearHighlights() {
  Object.values(bridgeLines).forEach(line => line.classList.remove("active"));

  Object.values(ioLetters.input).forEach(item => {
    item.circle.classList.remove("active-in", "active-out");
    item.text.classList.remove("dark");
  });

  Object.values(ioLetters.output).forEach(item => {
    item.circle.classList.remove("active-in", "active-out");
    item.text.classList.remove("dark");
  });

  Object.values(rotorVisuals).forEach(visual => {
    Object.values(visual.radialMap).forEach(node => node.classList.remove("active"));

    Object.values(visual.letterMap).forEach(item => {
      item.circle.classList.remove("active-in", "active-out");
      item.text.classList.remove("dark");
    });

    Object.values(visual.socketMap).flat().forEach(node => node.classList.remove("active"));
    Object.values(visual.wireMap).forEach(node => node.classList.remove("active"));
  });

  if (reflectorNode) reflectorNode.classList.remove("active");
}

function highlightColumn(kind, letter, className) {
  const item = ioLetters[kind][letter];
  if (!item) return;

  item.circle.classList.add(className);
  item.text.classList.add("dark");
}

function highlightRotorStep(key, step) {
  const visual = rotorVisuals[key];

  const inLetter = step.screenInput;
  const outLetter = step.screenOutput;

  const rotorIn = step.rotorInput;
  const rotorOut = step.rotorOutput;

  if (visual.radialMap[inLetter]) visual.radialMap[inLetter].classList.add("active");
  if (visual.radialMap[outLetter]) visual.radialMap[outLetter].classList.add("active");

  if (visual.letterMap[inLetter]) {
    visual.letterMap[inLetter].circle.classList.add("active-in");
    visual.letterMap[inLetter].text.classList.add("dark");
  }

  if (visual.letterMap[outLetter]) {
    visual.letterMap[outLetter].circle.classList.add("active-out");
    visual.letterMap[outLetter].text.classList.add("dark");
  }

  const wire = visual.wireMap[`${rotorIn}-${rotorOut}`];

  if (wire) wire.classList.add("active");

  if (visual.socketMap[rotorIn]) {
    visual.socketMap[rotorIn].forEach(socket => socket.classList.add("active"));
  }

  if (visual.socketMap[rotorOut]) {
    visual.socketMap[rotorOut].forEach(socket => socket.classList.add("active"));
  }
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

  highlightColumn("input", char, "active-in");
  stepState.textContent = `${char} → ?`;

  bridgeLines.inputToRight.classList.add("active");
  await wait(phaseDuration());

  highlightRotorStep("right", trace[1]);
  await wait(phaseDuration());

  bridgeLines.rightToMiddle.classList.add("active");
  await wait(phaseDuration());

  highlightRotorStep("middle", trace[2]);
  await wait(phaseDuration());

  bridgeLines.middleToLeft.classList.add("active");
  await wait(phaseDuration());

  highlightRotorStep("left", trace[3]);
  await wait(phaseDuration());

  bridgeLines.leftToReflector.classList.add("active");
  reflectorNode.classList.add("active");
  await wait(phaseDuration());

  bridgeLines.reflectorToLeft.classList.add("active");
  await wait(phaseDuration());

  highlightRotorStep("left", trace[5]);
  await wait(phaseDuration());

  bridgeLines.leftToMiddleBack.classList.add("active");
  await wait(phaseDuration());

  highlightRotorStep("middle", trace[6]);
  await wait(phaseDuration());

  bridgeLines.middleToRightBack.classList.add("active");
  await wait(phaseDuration());

  highlightRotorStep("right", trace[7]);
  await wait(phaseDuration());

  bridgeLines.rightToOutput.classList.add("active");
  await wait(phaseDuration());

  highlightColumn("output", outputLetter, "active-out");

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
