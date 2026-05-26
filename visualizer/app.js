const scenarioSelect = document.getElementById("scenario-select");
const graph = document.getElementById("graph");
const scenarioTitle = document.getElementById("scenario-title");
const stepCounter = document.getElementById("step-counter");
const currentActionEl = document.getElementById("current-action");
const roverLocationEl = document.getElementById("rover-location");
const roverCarryingEl = document.getElementById("rover-carrying");
const deliveredList = document.getElementById("delivered-list");
const planList = document.getElementById("plan-list");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const resetBtn = document.getElementById("reset-btn");
const playBtn = document.getElementById("play-btn");

const problemFileInput = document.getElementById("problem-file");
const planFileInput = document.getElementById("plan-file");
const loadFilesBtn = document.getElementById("load-files-btn");

const builtInPanel = document.getElementById("built-in-panel");
const customPanel = document.getElementById("custom-panel");
const modeInputs = document.querySelectorAll('input[name="mode"]');

const domainFileInput = document.getElementById("domain-file");
const domainNameEl = document.getElementById("domain-name");
const domainPredicatesEl = document.getElementById("domain-predicates");
const domainActionsEl = document.getElementById("domain-actions");

const validationStatusEl = document.getElementById("validation-status");

let autoplayInterval = null;

let scenario = null;
let plan = [];
let currentStep = 0;
let initialState = null;
let state = null;

let previousRoverLocation = null;
let isAnimating = false;

async function loadProject(scenarioNumber = "1") {
  stopAutoplay();

  const scenarioResponse = await fetch(`data/scenario${scenarioNumber}.json`);
  scenario = await scenarioResponse.json();

  const planResponse = await fetch(`data/problem${scenarioNumber}_plan.txt`);
  const planText = await planResponse.text();

  plan = parsePlan(planText);

  currentStep = 0;

  initialState = {
    roverLocation: scenario.roverStart,
    carrying: null,
    rocks: { ...scenario.rocks },
    delivered: []
  };

  state = cloneState(initialState);

  scenarioTitle.textContent = scenario.name;

  domainNameEl.textContent = "Built-in Rover Domain";
  domainPredicatesEl.textContent = "at, rock-at, connected, carrying, empty, lab, accepts, delivered";
  domainActionsEl.textContent = "move, pickup, drop";

  validationStatusEl.textContent = "No validation errors.";
  validationStatusEl.className = "validation-ok";
  renderPlan();
  updateView();
}

function parsePlan(text) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith(";"))
    .map(line => {
      const clean = line.replace(/[()]/g, "");
      const parts = clean.split(/\s+/);
      return {
        raw: line,
        action: parts[0],
        args: parts.slice(1)
      };
    });
}

function cloneState(inputState) {
  return {
    roverLocation: inputState.roverLocation,
    carrying: inputState.carrying,
    rocks: { ...inputState.rocks },
    delivered: [...inputState.delivered]
  };
}

function rebuildStateUntil(step) {
  state = cloneState(initialState);

  for (let i = 0; i < step; i++) {
    applyAction(plan[i]);
  }
}

function applyAction(planAction) {
  const { action, args } = planAction;

  if (action === "move") {
    const [, from, to] = args;
    state.roverLocation = to;
  }

  if (action === "pickup") {
    const [, rock, location] = args;
    state.carrying = rock;
    delete state.rocks[rock];
    state.roverLocation = location;
  }

  if (action === "drop") {
    const [, rock, location] = args;
    state.carrying = null;
    state.delivered.push(`${rock} delivered at ${location.toUpperCase()}`);
    state.roverLocation = location;
  }
}

function validateAction(planAction) {
  const { action, args } = planAction;

  if (action === "move") {
    const [, from, to] = args;

    if (state.roverLocation !== from) {
      return `Invalid move: rover is at ${state.roverLocation.toUpperCase()}, not ${from.toUpperCase()}.`;
    }

    const edgeExists = scenario.edges.some(
      ([edgeFrom, edgeTo]) => edgeFrom === from && edgeTo === to
    );

    if (!edgeExists) {
      return `Invalid move: no connection from ${from.toUpperCase()} to ${to.toUpperCase()}.`;
    }
  }

  if (action === "pickup") {
    const [, rock, location] = args;

    if (state.roverLocation !== location) {
      return `Invalid pickup: rover is at ${state.roverLocation.toUpperCase()}, not ${location.toUpperCase()}.`;
    }

    if (state.carrying !== null) {
      return `Invalid pickup: rover is already carrying ${state.carrying}.`;
    }

    if (state.rocks[rock] !== location) {
      return `Invalid pickup: ${rock} is not at ${location.toUpperCase()}.`;
    }
  }

  if (action === "drop") {
    const [, rock, location] = args;

    if (state.roverLocation !== location) {
      return `Invalid drop: rover is at ${state.roverLocation.toUpperCase()}, not ${location.toUpperCase()}.`;
    }

    if (state.carrying !== rock) {
      return `Invalid drop: rover is carrying ${state.carrying || "nothing"}, not ${rock}.`;
    }

    const acceptedRocks = scenario.labs[location] || [];

    if (!acceptedRocks.includes(rock)) {
      return `Invalid drop: ${location.toUpperCase()} does not accept ${rock}.`;
    }
  }

  return null;
}

function nextStep() {
  if (currentStep >= plan.length || isAnimating) return;

  const actionToExecute = plan[currentStep];

  const validationError = validateAction(actionToExecute);

  if (validationError) {
    validationStatusEl.textContent = validationError;
    validationStatusEl.className = "validation-error";
    stopAutoplay();
    return;
  }

  validationStatusEl.textContent = "Current action is valid.";
  validationStatusEl.className = "validation-ok";

  previousRoverLocation = state.roverLocation;

  currentStep += 1;
  rebuildStateUntil(currentStep);

  if (actionToExecute.action === "move") {
    animateRover(previousRoverLocation, state.roverLocation);
  } else {
    updateView();
  }
}

function previousStep() {
  if (currentStep <= 0 || isAnimating) return;

  currentStep -= 1;
  rebuildStateUntil(currentStep);
  updateView();
}

function resetExecution() {
  if (isAnimating) return;

  stopAutoplay();
  currentStep = 0;
  state = cloneState(initialState);
  validationStatusEl.textContent = "No validation errors.";
  validationStatusEl.className = "validation-ok";
  updateView();
}


function animateRover(fromLocationId, toLocationId) {
  const from = scenario.locations[fromLocationId];
  const to = scenario.locations[toLocationId];

  if (!from || !to) {
    updateView();
    return;
  }

  isAnimating = true;

  drawGraph();

  const rover = document.getElementById("animated-rover");
  const roverLabel = document.getElementById("animated-rover-label");

  const startX = from.x;
  const startY = from.y - 48;
  const endX = to.x;
  const endY = to.y - 48;

  const duration = 500;
  const startTime = performance.now();

  function animateFrame(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const currentX = startX + (endX - startX) * progress;
    const currentY = startY + (endY - startY) * progress;

    rover.setAttribute("cx", currentX);
    rover.setAttribute("cy", currentY);

    roverLabel.setAttribute("x", currentX);
    roverLabel.setAttribute("y", currentY - 26);

    if (progress < 1) {
      requestAnimationFrame(animateFrame);
    } else {
      isAnimating = false;
      updateView();
    }
  }

  requestAnimationFrame(animateFrame);
}


function updateView() {
  drawGraph();

  stepCounter.textContent = `Step ${currentStep} / ${plan.length}`;

  if (currentStep === 0) {
    currentActionEl.textContent = "No action executed yet.";
    currentActionEl.className = "";
  } else {
    const currentAction = plan[currentStep - 1];
    currentActionEl.textContent = currentAction.raw;
    currentActionEl.className = `action-${currentAction.action}`;
  }

  roverLocationEl.textContent = state.roverLocation.toUpperCase();
  roverCarryingEl.textContent = state.carrying ? state.carrying : "Nothing";

  deliveredList.innerHTML = "";
  if (state.delivered.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No minerals delivered yet.";
    deliveredList.appendChild(item);
  } else {
    state.delivered.forEach(delivered => {
      const item = document.createElement("li");
      item.textContent = delivered;
      deliveredList.appendChild(item);
    });
  }

  [...planList.children].forEach((item, index) => {
    item.classList.toggle("active", index === currentStep - 1);
  });

  prevBtn.disabled = currentStep === 0;
  nextBtn.disabled = currentStep === plan.length;
  playBtn.disabled = plan.length === 0;
}

function renderPlan() {
  planList.innerHTML = "";

  plan.forEach(action => {
    const item = document.createElement("li");
    item.textContent = action.raw;
    planList.appendChild(item);
  });
}

function getCurrentPlanAction() {
  if (currentStep === 0) return null;
  return plan[currentStep - 1];
}

function drawGraph() {
  graph.innerHTML = "";

  createArrowMarker();

  drawEdges();
  drawLocations();
  drawLabs();
  drawRocks();
  drawRover();
}

function createArrowMarker() {
  const defs = createSvgElement("defs");
  const marker = createSvgElement("marker");

  marker.setAttribute("id", "arrow");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "10");
  marker.setAttribute("refY", "7");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("orient", "auto-start-reverse");

  const path = createSvgElement("path");
  path.setAttribute("d", "M 0 0 L 8 4 L 0 8 z");
  path.setAttribute("class", "edge-arrow");

  marker.appendChild(path);
  defs.appendChild(marker);
  graph.appendChild(defs);
}

function drawEdges() {
  const currentAction = getCurrentPlanAction();

  scenario.edges.forEach(([from, to]) => {
    const start = scenario.locations[from];
    const end = scenario.locations[to];

    const line = createSvgElement("line");

    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);

    const isActiveMove =
      currentAction &&
      currentAction.action === "move" &&
      currentAction.args[1] === from &&
      currentAction.args[2] === to;

    line.setAttribute("class", isActiveMove ? "edge active-edge" : "edge");
    line.setAttribute("marker-end", "url(#arrow)");

    graph.appendChild(line);
  });
}

function drawLocations() {
  const currentAction = getCurrentPlanAction();

  Object.entries(scenario.locations).forEach(([id, location]) => {
    let activeLocation = false;

    if (currentAction) {
      if (currentAction.action === "move" && currentAction.args[2] === id) {
        activeLocation = true;
      }

      if (
        (currentAction.action === "pickup" || currentAction.action === "drop") &&
        currentAction.args[2] === id
      ) {
        activeLocation = true;
      }
    }

    const circle = createSvgElement("circle");
    circle.setAttribute("cx", location.x);
    circle.setAttribute("cy", location.y);
    circle.setAttribute("r", 28);
    circle.setAttribute("class", activeLocation ? "location active-location" : "location");
    graph.appendChild(circle);

    const label = createSvgElement("text");
    label.setAttribute("x", location.x);
    label.setAttribute("y", location.y);
    label.setAttribute("class", "location-label");
    label.textContent = location.label;
    graph.appendChild(label);
  });
}

function drawLabs() {
  Object.entries(scenario.labs).forEach(([labId, acceptedRocks]) => {
    const location = scenario.locations[labId];

    const labelText = `LAB: ${acceptedRocks.join(", ")}`;
    const dynamicWidth = Math.max(120, labelText.length * 7);

    const rect = createSvgElement("rect");
    rect.setAttribute("x", location.x - dynamicWidth / 2);
    rect.setAttribute("y", location.y + 38);
    rect.setAttribute("width", dynamicWidth);
    rect.setAttribute("height", 26);
    rect.setAttribute("rx", 8);
    rect.setAttribute("class", "lab");

    graph.appendChild(rect);

    const label = createSvgElement("text");
    label.setAttribute("x", location.x);
    label.setAttribute("y", location.y + 56);
    label.setAttribute("class", "item-label");
    label.setAttribute("fill", "white");
    label.textContent = labelText;

    graph.appendChild(label);
  });
}

function drawRocks() {
  Object.entries(state.rocks).forEach(([rock, locationId], index) => {
    const location = scenario.locations[locationId];

    const rockCircle = createSvgElement("circle");
    rockCircle.setAttribute("cx", location.x + 36);
    rockCircle.setAttribute("cy", location.y - 32 + index * 18);
    rockCircle.setAttribute("r", 10);
    rockCircle.setAttribute("class", "rock");
    graph.appendChild(rockCircle);

    const label = createSvgElement("text");
    label.setAttribute("x", location.x + 36);
    label.setAttribute("y", location.y - 48 + index * 18);
    label.setAttribute("class", "item-label");
    label.textContent = rock;
    graph.appendChild(label);
  });
}

function drawRover() {
  const location = scenario.locations[state.roverLocation];

  const rover = createSvgElement("circle");
  rover.setAttribute("id", "animated-rover");
  rover.setAttribute("cx", location.x);
  rover.setAttribute("cy", location.y - 48);
  rover.setAttribute("r", 16);
  rover.setAttribute("class", "rover");
  graph.appendChild(rover);

  const label = createSvgElement("text");
  label.setAttribute("id", "animated-rover-label");
  label.setAttribute("x", location.x);
  label.setAttribute("y", location.y - 74);
  label.setAttribute("class", "item-label");
  label.textContent = state.carrying ? `Rover (${state.carrying})` : "Rover";
  graph.appendChild(label);
}

function createSvgElement(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function toggleAutoplay() {
  if (autoplayInterval) {
    stopAutoplay();
  } else {
    startAutoplay();
  }
}

function startAutoplay() {
  if (currentStep >= plan.length) {
    resetExecution();
  }

  playBtn.textContent = "Pause";
  playBtn.classList.add("playing");

  autoplayInterval = setInterval(() => {
    if (currentStep >= plan.length) {
      stopAutoplay();
      return;
    }

    nextStep();
  }, 900);
}

function stopAutoplay() {
  clearInterval(autoplayInterval);
  autoplayInterval = null;

  playBtn.textContent = "Play";
  playBtn.classList.remove("playing");
}


function readUploadedFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {
      resolve(event.target.result);
    };

    reader.onerror = () => {
      reject(new Error("Error reading file."));
    };

    reader.readAsText(file);
  });
}

async function loadCustomPddlFiles() {
  try {
    stopAutoplay();

    const domainText = await readUploadedFile(domainFileInput.files[0]);
    const problemText = await readUploadedFile(problemFileInput.files[0]);
    const planText = await readUploadedFile(planFileInput.files[0]);

    const parsedDomain = parsePddlDomain(domainText);
    renderDomainInfo(parsedDomain);

    scenario = parsePddlProblem(problemText);
    plan = parsePlan(planText);

    currentStep = 0;

    initialState = {
      roverLocation: scenario.roverStart,
      carrying: null,
      rocks: { ...scenario.rocks },
      delivered: []
    };

    state = cloneState(initialState);

    scenarioTitle.textContent = scenario.name;
    
    validationStatusEl.textContent = "No validation errors.";
    validationStatusEl.className = "validation-ok";
    
    renderPlan();
    updateView();
  } catch (error) {
    alert("Could not load files. Please check that both problem.pddl and sas_plan were selected.");
    console.error(error);
  }
}

function parsePddlProblem(problemText) {
  const cleanText = problemText
    .replace(/;.*$/gm, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  const scenarioFromPddl = {
    name: "Custom PDDL Problem",
    locations: {},
    edges: [],
    roverStart: null,
    rocks: {},
    labs: {}
  };

  const connectedMatches = [...cleanText.matchAll(/\(connected\s+([a-z0-9_-]+)\s+([a-z0-9_-]+)\)/g)];
  connectedMatches.forEach(match => {
    const from = match[1];
    const to = match[2];

    scenarioFromPddl.edges.push([from, to]);
    scenarioFromPddl.locations[from] = { label: from.toUpperCase() };
    scenarioFromPddl.locations[to] = { label: to.toUpperCase() };
  });

  const atMatch = cleanText.match(/\(at\s+([a-z0-9_-]+)\s+([a-z0-9_-]+)\)/);
  if (atMatch) {
    scenarioFromPddl.roverStart = atMatch[2];
    scenarioFromPddl.locations[atMatch[2]] = { label: atMatch[2].toUpperCase() };
  }

  const rockMatches = [...cleanText.matchAll(/\(rock-at\s+([a-z0-9_-]+)\s+([a-z0-9_-]+)\)/g)];
  rockMatches.forEach(match => {
    const rock = match[1];
    const location = match[2];

    scenarioFromPddl.rocks[rock] = location;
    scenarioFromPddl.locations[location] = { label: location.toUpperCase() };
  });

  const labMatches = [...cleanText.matchAll(/\(lab\s+([a-z0-9_-]+)\)/g)];
  labMatches.forEach(match => {
    const lab = match[1];

    if (!scenarioFromPddl.labs[lab]) {
      scenarioFromPddl.labs[lab] = [];
    }

    scenarioFromPddl.locations[lab] = { label: lab.toUpperCase() };
  });

  const acceptsMatches = [...cleanText.matchAll(/\(accepts\s+([a-z0-9_-]+)\s+([a-z0-9_-]+)\)/g)];
  acceptsMatches.forEach(match => {
    const lab = match[1];
    const rock = match[2];

    if (!scenarioFromPddl.labs[lab]) {
      scenarioFromPddl.labs[lab] = [];
    }

    scenarioFromPddl.labs[lab].push(rock);
    scenarioFromPddl.locations[lab] = { label: lab.toUpperCase() };
  });

  if (!scenarioFromPddl.roverStart) {
    throw new Error("Could not detect rover start location. Expected predicate: (at rover1 l4)");
  }

  assignAutoLayout(scenarioFromPddl);

  return scenarioFromPddl;
}

function assignAutoLayout(scenarioData) {
  const locationIds = Object.keys(scenarioData.locations);

  const centerX = 280;
  const centerY = 300;

  const radiusX = 190;
  const radiusY = 210;

  locationIds.forEach((id, index) => {
    const angle = (2 * Math.PI * index) / locationIds.length - Math.PI / 2;

    scenarioData.locations[id].x = centerX + radiusX * Math.cos(angle);
    scenarioData.locations[id].y = centerY + radiusY * Math.sin(angle);
  });
}

modeInputs.forEach(input => {
  input.addEventListener("change", event => {
    const mode = event.target.value;

    if (mode === "built-in") {
      builtInPanel.classList.remove("hidden");
      customPanel.classList.add("hidden");
      loadProject(scenarioSelect.value);
    }

    if (mode === "custom") {
      builtInPanel.classList.add("hidden");
      customPanel.classList.remove("hidden");
      resetExecution();
      scenarioTitle.textContent = "Custom PDDL Problem";
    }
  });
});

function parsePddlDomain(domainText) {
  const cleanText = domainText
    .replace(/;.*$/gm, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  const domainNameMatch = cleanText.match(/\(domain\s+([a-z0-9_-]+)\)/);
  const domainName = domainNameMatch ? domainNameMatch[1] : "unknown-domain";

  const predicates = [];
  const predicatesBlock = extractPddlSection(cleanText, ":predicates");

  if (predicatesBlock) {
    const predicateMatches = [...predicatesBlock.matchAll(/\(([a-z0-9_-]+)/g)];

    predicateMatches.forEach(match => {
      const predicateName = match[1];

      if (!predicates.includes(predicateName)) {
        predicates.push(predicateName);
      }
    });
  }

  const actions = [];
  const actionMatches = [...cleanText.matchAll(/\(:action\s+([a-z0-9_-]+)/g)];

  actionMatches.forEach(match => {
    const actionName = match[1];

    actions.push({
      name: actionName
    });
  });

  return {
    name: domainName,
    predicates,
    actions
  };
}

function extractPddlSection(text, sectionName) {
  const startIndex = text.indexOf(`(${sectionName}`);

  if (startIndex === -1) return null;

  let depth = 0;
  let section = "";

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (char === "(") depth++;
    if (char === ")") depth--;

    section += char;

    if (depth === 0) break;
  }

  return section;
}

function renderDomainInfo(parsedDomain) {
  domainNameEl.textContent = parsedDomain.name;

  domainPredicatesEl.textContent =
    parsedDomain.predicates.length > 0
      ? parsedDomain.predicates.join(", ")
      : "No predicates detected";

  domainActionsEl.textContent =
    parsedDomain.actions.length > 0
      ? parsedDomain.actions.map(action => action.name).join(", ")
      : "No actions detected";
}



prevBtn.addEventListener("click", previousStep);
nextBtn.addEventListener("click", nextStep);
playBtn.addEventListener("click", toggleAutoplay);
resetBtn.addEventListener("click", resetExecution);
loadFilesBtn.addEventListener("click", loadCustomPddlFiles);


scenarioSelect.addEventListener("change", event => {
  loadProject(event.target.value);
});

loadProject("1");