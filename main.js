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
let bowlersStats = {}; // { playerName: { overs: 0, maidens: 0, runsConceded: 0, wicketsTaken: 0, ballsBowled: 0 } }
let battingOrder = [];
let nextBatsmanIndex = 0;
let ballsBowledThisOver = 0;
let targetRuns = 0;
let targetOvers = 0;
let totalTargetBalls = 0;
let isTargetSet = false;

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
        bowlingTeamPlayers.forEach(player => bowlersStats[player] = { overs: 0, maidens: 0, runsConceded: 0, wicketsTaken: 0, ballsBowled: 0 });

        populateBatsmanDropdowns();
        populateBowlerDropdown();

        setInitialBatsmen();
        updateScoreDisplay();
        updateRunboardDisplay();
        ballsBowledThisOver = 0; // Initialize for the first over
        isTargetSet = false;
        $("#targetBoard").hide();

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
        bowlersStats[currentBowler].runsConceded++;
        scoreboard[over_no] = scoreboard[over_no] || [0];
        scoreboard[over_no][0] = (scoreboard[over_no][0] || 0) + 1;
        updateScoreDisplay();
    } else if (outcome === "Nb") {
        runs++;
        bowlersStats[currentBowler].runsConceded++;
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
        // End of ball logic is now after handling the wicket
        batsmenStats[striker].balls++;
        ballsBowledThisOver++;
        ball_no++;
        if (ball_no > 6) {
            endOfOver();
        }
        updateRunboardDisplay();
        populateBatsmanDropdowns(); // Update dropdowns after each ball
    } else if (typeof outcome === 'number') {
        batsmenStats[striker].runs += outcome;
        runs += outcome;
        bowlersStats[currentBowler].runsConceded += outcome;
        if (outcome === 4) batsmenStats[striker].fours++;
        if (outcome === 6) batsmenStats[striker].sixes++;
        updateScoreDisplay();
        handleRun(outcome);
        endOfBall();
    } else if (outcome === 0) {
        endOfBall();
    }

    // Increment ball count for valid deliveries (including outs)
    if (outcome !== "Wd" && !isNoBall) {
        if (outcome !== "Out") { // Ball is already incremented for "Out" above
            batsmenStats[striker].balls++;
            ballsBowledThisOver++;
            ball_no++;
            if (ball_no > 6) {
                endOfOver();
            }
        }
    } else if (isNoBall && typeof outcome === 'number') {
        batsmenStats[striker].balls++; // No ball still counts as a ball faced for batsman if runs are scored
        isNoBall = false;
        $("#no-ball-warning").hide();
    } else if (isNoBall && outcome === 0) {
        isNoBall = false;
        $("#no-ball-warning").hide();
    }

    updateRunboardDisplay();
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
            $("#nonStrikerBatsman").val(newBatsman).prop('selected', true);
        } else {
            striker = newBatsman;
            $("#strikerBatsman").val(newBatsman).prop('selected', true);
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
    if (currentBowler) {
        bowlersStats[currentBowler].overs++;
    }
    ballsBowledThisOver = 0; // Reset for the new over
    updateScoreDisplay(); // Update target information after each over
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

    if (isTargetSet) {
        const targetRunsRequired = targetRuns - runs;
        const ballsBowled = (over_no - 1) * 6 + (ball_no - 1);
        const targetBallsLeft = totalTargetBalls - ballsBowled;
        const oversLeft = Math.floor(targetBallsLeft / 6);
        const remainingBallsInOver = targetBallsLeft % 6;

        $("#targetRunsRequired").text(targetRunsRequired >= 0 ? targetRunsRequired : 0);
        $("#targetOversLeft").text(`${oversLeft}.${remainingBallsInOver >= 0 ? remainingBallsInOver : 0}`);

        if (targetRuns <= runs) {
            $("#targetBody").html('Target Reached!');
        } else if (targetBallsLeft <= 0 && targetRuns > runs) {
            $("#targetBody").html('Innings Over - Target Not Reached!');
        }

        $("#targetBoard").show();
    } else {
        $("#targetBoard").hide();
    }
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
            // Corrected line: Access individual bowler's overs directly
            const oversBowled = stats.overs || 0;
            const economy = oversBowled > 0 ? (stats.runsConceded / oversBowled).toFixed(2) : '0.00';

            const row = $("<tr></tr>");
            row.append(`<td>${bowler}</td>`);
            row.append(`<td>${oversBowled.toFixed(1)}</td>`);
            row.append(`<td>${stats.maidens}</td>`);
            row.append(`<td>${stats.runsConceded}</td>`);
            row.append(`<td>${stats.wicketsTaken}</td>`);
            row.append(`<td>${economy}</td>`);
            bowlerStatsBody.append(row);
        }
    }

    $('#myModal').modal('show');
}

function setTarget(shouldSet = true) {
    if (shouldSet) {
        const targetRunsInput = $("#targetRuns").val();
        const targetOversInput = $("#targetOvers").val();

        if (targetRunsInput && targetOversInput && !isNaN(targetRunsInput) && !isNaN(targetOversInput) && parseInt(targetOversInput) > 0) {
            targetRuns = parseInt(targetRunsInput);
            targetOvers = parseInt(targetOversInput);
            totalTargetBalls = targetOvers * 6;
            isTargetSet = true;
            updateScoreDisplay();
        } else if (shouldSet) {
            alert("Please enter valid target runs and overs.");
        } else {
            // Called when the close button on the target board is clicked
            isTargetSet = false;
            $("#targetBoard").hide();
        }
    } else {
        // Called when the close button on the target board is clicked
        isTargetSet = false;
        $("#targetBoard").hide();
    }
}
