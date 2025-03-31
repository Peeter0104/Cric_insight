let scoreboard = [[], [0]]; // Initialize scoreboard
let scoreboardInfo = {};
let ball_no = 1;
let over_no = 1;
let runs = 0;
let wickets = 0;
let isNoBall = false;
let team1Name = "";
let team2Name = "";
let team1Players = [];
let team2Players = [];
let battingTeam = 1; // 1 or 2, indicates which team is currently batting
let battingTeamPlayers = [];
let bowlingTeamPlayers = [];
let striker = null;
let nonStriker = null;
let currentBowler = null;
let batsmenStats = {}; // { playerName: { runs, balls, fours, sixes, status, bowler } }
let fallOfWickets = [];
let bowlersStats = {}; // { playerName: { overs, maidens, runsConceded, wicketsTaken } }
let battingOrder = [];
let nextBatsmanIndex = 0;

$(document).ready(function () {
  console.log("Document ready in main.js");

  $('#initialSetupModal').modal({ backdrop: 'static', keyboard: false });
  $('#initialSetupModal').modal('show');

  $("#run_dot").on("click", function (event) { playBall(0); });
  $("#run_1").on("click", function (event) { playBall(1); });
  $("#run_2").on("click", function (event) { playBall(2); });
  $("#run_3").on("click", function (event) { playBall(3); });
  $("#run_wide").on("click", function (event) { playBall("Wd"); });
  $("#run_no_ball").on("click", function (event) { playBall("Nb"); });
  $("#run_4").on("click", function (event) { playBall(4); });
  $("#run_6").on("click", function (event) { playBall(6); });
  $("#run_W").on("click", function (event) { playBall("Out"); });
  $("#scoreboard-btn").on("click", function (event) { updateScoreboardModal(); });

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
});

function saveTeamData() {
  team1Name = $("#team1Name").val().trim();
  team2Name = $("#team2Name").val().trim();
  team1Players = $("#team1Players").val().split('\n').map(p => p.trim()).filter(p => p !== "");
  team2Players = $("#team2Players").val().split('\n').map(p => p.trim()).filter(p => p !== "");

  if (team1Players.length > 0 && team2Players.length > 0) {
    // Basic logic: Team 1 bats first
    battingTeamPlayers = [...team1Players];
    bowlingTeamPlayers = [...team2Players];
    battingOrder = [...battingTeamPlayers];
    nextBatsmanIndex = 0;

    // Initialize stats
    battingTeamPlayers.forEach(player => batsmenStats[player] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: "not out", bowler: null });
    bowlingTeamPlayers.forEach(player => bowlersStats[player] = { overs: 0, maidens: 0, runsConceded: 0, wicketsTaken: 0 });

    populateBatsmanDropdowns();
    populateBowlerDropdown();

    setInitialBatsmen();

    $('#initialSetupModal').modal('hide');
  } else {
    alert("Please enter players for both teams.");
  }
}

function setInitialBatsmen() {
  const availableBatsmen = battingTeamPlayers.filter(player => batsmenStats[player].status === "not out");
  if (availableBatsmen.length >= 1) {
    striker = availableBatsmen[0];
    $("#strikerBatsman").val(striker).prop('selected', true);
  }
  if (availableBatsmen.length >= 2) {
    nonStriker = availableBatsmen[1];
    $("#nonStrikerBatsman").val(nonStriker).prop('selected', true);
  }
}

function populateBatsmanDropdowns() {
  const strikerDropdown = $("#strikerBatsman");
  const nonStrikerDropdown = $("#nonStrikerBatsman");

  strikerDropdown.empty().append('<option value="">Select Striker</option>');
  nonStrikerDropdown.empty().append('<option value="">Select Non-Striker</option>');

  const availableBatsmen = battingTeamPlayers.filter(player => batsmenStats[player].status === "not out");
  availableBatsmen.forEach(player => {
    strikerDropdown.append(`<option value="${player}">${player}</option>`);
    nonStrikerDropdown.append(`<option value="${player}">${player}</option>`);
  });

  // Select current batsmen if they are still available
  if (striker && availableBatsmen.includes(striker)) {
    $("#strikerBatsman").val(striker).prop('selected', true);
  }
  if (nonStriker && availableBatsmen.includes(nonStriker)) {
    $("#nonStrikerBatsman").val(nonStriker).prop('selected', true);
  }
}

function populateBowlerDropdown() {
  const bowlerDropdown = $("#currentBowler");
  bowlerDropdown.empty().append('<option value="">Select Bowler</option>');
  bowlingTeamPlayers.forEach(player => {
    bowlerDropdown.append(`<option value="${player}">${player}</option>`);
  });
}

function playBall(outcome) {
  if (!striker || !currentBowler) {
    alert("Please select both striker and bowler.");
    return;
  }

  if (outcome === "Wd") {
    runs++;
    scoreboard[over_no] = scoreboard[over_no] || [0];
    scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1;
    updateScoreDisplay();
  } else if (outcome === "Nb") {
    runs++;
    scoreboard[over_no] = scoreboard[over_no] || [0];
    scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1;
    isNoBall = true;
    $("#no-ball-warning").show();
    updateScoreDisplay();
  } else if (outcome === "Out") {
    batsmenStats[striker].status = "out";
    batsmenStats[striker].bowler = currentBowler;
    bowlersStats[currentBowler].wicketsTaken++;
    fallOfWickets.push(`${striker} - ${runs}-${wickets + 1} (${over_no}.${ball_no})`);
    wickets++;
    updateScoreDisplay();
    handleWicket();
    endOfBall();
  } else if (typeof outcome === 'number') {
    batsmenStats[striker].runs += outcome;
    runs += outcome;
    if (outcome === 4) batsmenStats[striker].fours++;
    if (outcome === 6) batsmenStats[striker].sixes++;
    updateScoreDisplay();
    handleRun(outcome);
    endOfBall();
  } else if (outcome === 0) {
    endOfBall();
  }

  if (outcome !== "Wd" && !isNoBall && outcome !== "Out") {
    batsmenStats[striker].balls++;
    bowlersStats[currentBowler].runsConceded += (typeof outcome === 'number' ? outcome : 0);
    ball_no++;
    if (ball_no > 6) {
      endOfOver();
    }
  } else if (isNoBall && typeof outcome === 'number') {
    batsmenStats[striker].balls++; // No ball still counts as a ball faced for batsman if runs are scored
    bowlersStats[currentBowler].runsConceded += outcome;
    isNoBall = false;
    $("#no-ball-warning").hide();
  } else if (isNoBall && outcome === 0) {
    isNoBall = false;
    $("#no-ball-warning").hide();
  }

  updateRunboardDisplay();
  updateScoreboardModal();
  populateBatsmanDropdowns(); // Update dropdowns after each ball (for out players)
}

function endOfBall() {
  updateRunboardDisplay();
}

function handleRun(run) {
  if (run % 2 !== 0) {
    swapStrike();
  }
}

function handleWicket() {
  const availableBatsmen = battingTeamPlayers.filter(player => batsmenStats[player].status === "not out" && player !== striker && player !== nonStriker);
  if (availableBatsmen.length > 0) {
    const newBatsman = availableBatsmen[0];
    if (striker) {
      nonStriker = newBatsman;
      $("#nonStrikerBatsman").val(nonStriker).prop('selected', true);
    } else {
      striker = newBatsman;
      $("#strikerBatsman").val(striker).prop('selected', true);
    }
  } else {
    if (striker) batsmenStats[striker].status = "out"; // Mark remaining as out?
    striker = null;
  }
}

function endOfOver() {
  ball_no = 1;
  over_no++;
  scoreboard[over_no] = scoreboard[over_no] || [0];
  swapStrike();
  updateRunboardDisplay();
  // Alert to change bowler (you might want a more UI-friendly way)
  alert("Over ended. Please select the bowler for the next over.");
}

function swapStrike() {
  const temp = striker;
  striker = nonStriker;
  nonStriker = temp;
  $("#strikerBatsman").val(striker).prop('selected', true);
  $("#nonStrikerBatsman").val(nonStriker).prop('selected', true);
}

function updateScoreDisplay() {
  $("#run").text(runs);
  $("#wickets").text(wickets);
}

function updateRunboardDisplay() {
  $("#over-ball").text(`${over_no - 1}.${ball_no - 1}`);
}

function updateScoreboardModal() {
  const tableBody = $("#scoreboard-body");
  tableBody.empty();

  for (const batsman in batsmenStats) {
    const stats = batsmenStats[batsman];
    if (battingTeamPlayers.includes(batsman)) {
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
    if (bowlingTeamPlayers.includes(bowler)) {
      const stats = bowlersStats[bowler];
      const oversBowled = Math.floor(stats.overs) + (scoreboardInfo[over_no - 1]?.bowler === bowler && ball_no > 1 ? (ball_no - 1) / 6 : 0);
      const runsInOver = scoreboard[over_no]?.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) || 0;
      stats.runsConceded += (scoreboardInfo[over_no - 1]?.bowler === bowler ? runsInOver : 0);
      stats.overs = over_no - 1 + (ball_no > 1 && scoreboardInfo[over_no - 1]?.bowler === bowler ? (ball_no - 1) / 6 : 0);

      const row = $("<tr></tr>");
      row.append(`<td>${bowler}</td>`);
      row.append(`<td>${stats.overs.toFixed(1)}</td>`);
      row.append(`<td>${stats.maidens}</td>`);
      row.append(`<td>${stats.runsConceded}</td>`);
      row.append(`<td>${stats.wicketsTaken}</td>`);
      row.append(`<td>${stats.overs > 0 ? (stats.runsConceded / stats.overs).toFixed(2) : '0.00'}</td>`);
      bowlerStatsBody.append(row);
    }
  }

  $('#myModal').modal('show');
}
