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
let autoplayInterval = null;

let scenario = null;
let plan = [];
let currentStep = 0;
let initialState = null;
let state = null;

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

function nextStep() {
  if (currentStep >= plan.length) return;

  currentStep += 1;
  rebuildStateUntil(currentStep);
  updateView();
}

function previousStep() {
  if (currentStep <= 0) return;

  currentStep -= 1;
  rebuildStateUntil(currentStep);
  updateView();
}

function resetExecution() {
  stopAutoplay();
  currentStep = 0;
  state = cloneState(initialState);
  updateView();
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
  rover.setAttribute("cx", location.x);
  rover.setAttribute("cy", location.y - 48);
  rover.setAttribute("r", 16);
  rover.setAttribute("class", "rover");
  graph.appendChild(rover);

  const label = createSvgElement("text");
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


prevBtn.addEventListener("click", previousStep);
nextBtn.addEventListener("click", nextStep);
playBtn.addEventListener("click", toggleAutoplay);
resetBtn.addEventListener("click", resetExecution);

scenarioSelect.addEventListener("change", event => {
  loadProject(event.target.value);
});

loadProject("1");