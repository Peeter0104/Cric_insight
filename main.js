var scoreboard = [[], [0]]; // Initialize with an empty first element and the first over with 0 extras
var scoreboardInfo = {};
var ball_no = 1;
var over_no = 1;
var runs = 0;
var wickets = 0;
var edited = [];
var isNoBall = false;
var isTargetMode = false;
var targetRuns = -1;
var targetOvers = -1;
var isShareMode = false;
let currentMatchCode = -1;
let client = null;
let isStartConnectDone = false;
let topic = "";
let clientID = "";
let host = "test.mosquitto.org";
let port = 8080;

let team1Name = "";
let team2Name = "";
let team1Players = [];
let team2Players = [];
let battingTeamPlayers = [];
let bowlingTeamPlayers = [];
let striker = null;
let nonStriker = null;
let currentBowler = null;
let batsmenStats = {}; // Object to store batsman stats (name: {runs, balls, fours, sixes, status, bowler})
let fallOfWickets = [];
let bowlersStats = {}; // Object to store bowler stats (name: {overs, maidens, runsConceded, wicketsTaken})
let battingOrder = [];
let wicketsFallen = 0;

$(document).ready(function () {
  console.log("Document ready in main.js");

  // Show initial setup modal on page load
  $('#initialSetupModal').modal('show');

  $("#run_dot").on("click", function (event) { if (!isShareMode && striker) play_ball(0); });
  $("#run_1").on("click", function (event) { if (!isShareMode && striker) play_ball(1); });
  $("#run_2").on("click", function (event) { if (!isShareMode && striker) play_ball(2); });
  $("#run_3").on("click", function (event) { if (!isShareMode && striker) play_ball(3); });
  $("#run_wide").on("click", function (event) { if (!isShareMode && currentBowler) play_ball("+"); });
  $("#run_no_ball").on("click", function (event) { if (!isShareMode && currentBowler) play_ball("NB"); });
  $("#run_4").on("click", function (event) { if (!isShareMode && striker) play_ball(4); });
  $("#run_6").on("click", function (event) { if (!isShareMode && striker) play_ball(6); });
  $("#run_W").on("click", function (event) { if (!isShareMode && striker && currentBowler) play_ball("W"); });
  $("#scoreboard-btn").on("click", function (event) { update_scoreboard_modal(); });
  $("#shareMatchCodeButton").on("click", function (event) { generateShareLink(); });

  // Event listeners for dropdown changes
  $("#strikerBatsman").change(function () {
    striker = $(this).val();
    console.log("Striker selected:", striker);
  });
  $("#nonStrikerBatsman").change(function () {
    nonStriker = $(this).val();
    console.log("Non-Striker selected:", nonStriker);
  });
  $("#currentBowler").change(function () {
    currentBowler = $(this).val();
    console.log("Bowler selected:", currentBowler);
  });

  init();
});

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const matchCodeFromUrl = urlParams.get("matchCode");
  if (matchCodeFromUrl) { isShareMode = true; disableEditing(); startConnect(matchCodeFromUrl); } else { /* Initial setup modal handles this */ }
  if (urlParams.get("debug") == null || urlParams.get("debug") != "true") { $("#messages").hide(); }
  update_score_display();
  update_runboard();
}

function saveTeamData() {
  team1Name = $("#team1Name").val().trim();
  team2Name = $("#team2Name").val().trim();
  team1Players = $("#team1Players").val().split('\n').map(p => p.trim()).filter(p => p !== "");
  team2Players = $("#team2Players").val().split('\n').map(p => p.trim()).filter(p => p !== "");

  if (team1Players.length > 0 && team2Players.length > 0) {
    // For now, let's assume Team 1 is batting first and Team 2 is bowling
    battingTeamPlayers = [...team1Players];
    bowlingTeamPlayers = [...team2Players];
    battingOrder = [...battingTeamPlayers]; // Initial batting order

    // Initialize batsman stats
    battingTeamPlayers.forEach(player => {
      batsmenStats[player] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: "batting", bowler: null };
    });
    team2Players.forEach(player => {
      bowlersStats[player] = { overs: 0, maidens: 0, runsConceded: 0, wicketsTaken: 0 };
    });

    populateBatsmanDropdowns();
    populateBowlerDropdown();

    // Set initial striker and non-striker (first two in the batting order)
    if (battingTeamPlayers.length >= 2) {
      striker = battingTeamPlayers[0];
      nonStriker = battingTeamPlayers[1];
      $("#strikerBatsman").val(striker).prop('selected', true);
      $("#nonStrikerBatsman").val(nonStriker).prop('selected', true);
    } else if (battingTeamPlayers.length === 1) {
      striker = battingTeamPlayers[0];
      $("#strikerBatsman").val(striker).prop('selected', true);
    }

    $('#initialSetupModal').modal('hide');
    startConnect(); // Initialize MQTT connection after setup
  } else {
    alert("Please enter players for both teams.");
  }
}

function populateBatsmanDropdowns() {
  const strikerDropdown = $("#strikerBatsman");
  const nonStrikerDropdown = $("#nonStrikerBatsman");
  strikerDropdown.empty().append('<option value="">Select Striker</option>');
  nonStrikerDropdown.empty().append('<option value="">Select Non-Striker</option>');

  battingTeamPlayers.filter(player => batsmenStats[player].status === "batting").forEach(player => {
    strikerDropdown.append(`<option value="${player}">${player}</option>`);
    nonStrikerDropdown.append(`<option value="${player}">${player}</option>`);
  });
}

function populateBowlerDropdown() {
  const bowlerDropdown = $("#currentBowler");
  bowlerDropdown.empty().append('<option value="">Select Bowler</option>');
  bowlingTeamPlayers.forEach(player => {
    bowlerDropdown.append(`<option value="${player}">${player}</option>`);
  });
}

function disableEditing() { /* ... */ }
function generateShareLink() { /* ... */ }

function play_ball(run) {
  if (isShareMode || !striker || !currentBowler) return;

  batsmenStats[striker].balls++;
  bowlersStats[currentBowler].runsConceded += (Number.isInteger(run) ? run : (run === "+" ? 1 : 0));

  if (run === "+") {
    runs++;
    scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1;
    publishUpdate({ type: "run", value: run });
  } else if (run === "NB") {
    noBall(true);
    runs++;
    scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1;
    publishUpdate({ type: "run", value: run });
    return;
  } else if (run === "W") {
    wickets++;
    batsmenStats[striker].status = "out";
    batsmenStats[striker].bowler = currentBowler;
    bowlersStats[currentBowler].wicketsTaken++;
    fallOfWickets.push(`${striker} - ${runs}-${wickets} (${over_no}.${ball_no})`);
    publishUpdate({ type: "wicket" });
    handleWicket();
  } else if (Number.isInteger(run)) {
    runs += run;
    batsmenStats[striker].runs += run;
    if (run === 4) batsmenStats[striker].fours++;
    if (run === 6) batsmenStats[striker].sixes++;
    publishUpdate({ type: "run", value: run });
    handleRun(run);
  }

  if (run !== "+" && !isNoBall) {
    update_runboard();
    ball_no++;
    if (ball_no >= 7) {
      endOfOver();
    }
  } else if (isNoBall && run !== "+") {
    scoreboard[over_no][ball_no] = run === 0 ? "D" : parseInt(run);
    update_runboard();
    noBall(false);
    publishUpdate({ type: "noBallRun", value: run });
  }

  update_score_display();
  update_scoreboard_modal();
  console.log("After play_ball - Over:", over_no, "Ball:", ball_no, "Scoreboard:", scoreboard, "Batsmen Stats:", batsmenStats);
}

function handleRun(run) {
  if (run % 2 !== 0) {
    swapStrike();
  }
}

function handleWicket() {
  battingTeamPlayers = battingTeamPlayers.filter(player => batsmenStats[player].status === "batting");
  populateBatsmanDropdowns();
  if (battingTeamPlayers.length > 0) {
    striker = battingTeamPlayers[0]; // Next batsman in order takes strike
    $("#strikerBatsman").val(striker).prop('selected', true);
  } else {
    striker = null;
  }
  // Non-striker remains the same
}

function endOfOver() {
  saveBowlerName(); // Though we are selecting from dropdown now
  ball_no = 1;
  over_no++;
  scoreboard[over_no] = [0]; // Ensure new over starts with [0] for extras
  console.log("Started new over:", over_no, "Scoreboard:", scoreboard);
  swapStrike(); // Strike changes at the end of the over
  update_runboard();
  // For the next over, you'll need to select a new bowler
  alert("Over ended. Please select the bowler for the next over.");
}

function swapStrike() {
  const temp = striker;
  striker = nonStriker;
  nonStriker = temp;
  $("#strikerBatsman").val(striker).prop('selected', true);
  $("#nonStrikerBatsman").val(nonStriker).prop('selected', true);
  console.log("Strike Swapped: Striker -", striker, "Non-Striker -", nonStriker);
}

function saveBowlerName() {
  scoreboardInfo[over_no - 1] = scoreboardInfo[over_no - 1] || {};
  scoreboardInfo[over_no - 1].bowler = currentBowler;
}

function update_runboard() {
  const overBallDisplay = `${over_no - 1}.${ball_no - 1}`;
  updateHtml("#over-ball", overBallDisplay);
  updateTarget();
}

function change_score() { /* ... (You might need to adapt this for batsman-specific scores) */ }

function update_scoreboard_modal() {
  const tableBody = $("#scoreboard-body");
  tableBody.empty();
  console.log("Updating scoreboard modal. Batsmen Stats:", batsmenStats);

  for (const batsman in batsmenStats) {
    const stats = batsmenStats[batsman];
    if (stats.runs !== undefined) {
      const row = $("<tr></tr>");
      row.append(`<td>${batsman} ${stats.status === 'out' && stats.bowler ? '<small>b ' + stats.bowler + '</small>' : ''}</td>`);
      row.append(`<td>${stats.runs}</td>`);
      row.append(`<td>${stats.balls}</td>`);
      row.append(`<td>${stats.fours}</td>`);
      row.append(`<td>${stats.sixes}</td>`);
      row.append(`<td>${stats.balls > 0 ? (stats.runs / stats.balls * 100).toFixed(2) : '0.00'}</td>`);
      tableBody.append(row);
    }
  }

  const fowDiv = $("#fall-of-wickets");
  fowDiv.empty();
  if (fallOfWickets.length > 0) {
    fowDiv.append(`<p>${fallOfWickets.join(', ')}</p>`);
  } else {
    fowDiv.append(`<p>No wickets fallen yet.</p>`);
  }

  const bowlerStatsBody = $("#bowler-stats-body");
  bowlerStatsBody.empty();
  for (const bowler in bowlersStats) {
    const stats = bowlersStats[bowler];
    if (stats.runsConceded !== undefined) {
      const oversBowled = Math.floor(stats.overs) + (ball_no > 1 && scoreboardInfo[over_no -1]?.bowler === bowler ? (ball_no - 1) / 6 : 0);
      const row = $("<tr></tr>");
      row.append(`<td>${bowler}</td>`);
      row.append(`<td>${oversBowled.toFixed(1)}</td>`);
      row.append(`<td>${stats.maidens}</td>`);
      row.append(`<td>${stats.runsConceded}</td>`);
      row.append(`<td>${stats.wicketsTaken}</td>`);
      row.append(`<td>${oversBowled > 0 ? (stats.runsConceded / oversBowled).toFixed(2) : '0.00'}</td>`);
      bowlerStatsBody.append(row);
    }
  }

  $('#myModal').modal('show');
  if (isShareMode) { updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), false); }
  else { updateHtml("#scoreboard", $("#scoreboard").prop('outerHTML'), true); }
}

function update_score_display() {
  runs = 0;
  wickets = 0;
  for (const batsman in batsmenStats) {
    runs += batsmenStats[batsman].runs;
    if (batsmenStats[batsman].status === 'out') {
      wickets++;
    }
  }
  updateHtml("#run", runs);
  updateHtml("#wickets", wickets);
}

function back_button() { /* ... (Needs significant update to handle batsman stats) */ }
function noBall(is_NoBall) {
  isNoBall = is_NoBall;
  if (isNoBall) {
    $("#no-ball-warning").show();
  } else {
    $("#no-ball-warning").hide();
  }
}
function setTarget(isTargetModeOn = true) { /* ... */ }
function updateTarget() { /* ... */ }
function updateHtml(eleId, newHtml, shouldPublish = true) {
  $(eleId).html(newHtml);
  if (isShareMode && shouldPublish) {
    publishUpdate({ type: "updateHtml", id: eleId.substring(1), html: newHtml });
  }
}
function sendInitVariables() { /* ... */ }
function onConnect() { /* ... */ }
function onConnectionLost(responseObject) { /* ... */ }
function onMessageArrived(message) { /* ... */ }
function publishUpdate(payload) { /* ... */ }
