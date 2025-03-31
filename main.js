var scoreboard = [[], [0]]; //scoreboard[<over_no>][0] counts wide runs
var scoreboardInfo = {}; // To store batting and bowler info per over
var ball_no = 1; // Ball number will start from 1
var over_no = 1; // Over number will start from 1
var runs = 0;
var edited = [];
var isNoBall = false;
var isTargetMode = false;
var targetRuns = -1; // total runs scored by other team
var targetOvers = -1; //total overs
var isShareMode = false;

$(document).ready(function () {
	$("#run_dot").on("click", function (event) {
		play_ball("D", 0);
	});
	$("#run_1").on("click", function (event) {
		play_ball(1);
	});
	$("#run_2").on("click", function (event) {
		play_ball(2);
	});
	$("#run_3").on("click", function (event) {
		play_ball(3);
	});
	$("#run_wide").on("click", function (event) {
		play_ball("+", 0);
	});
	$("#run_no_ball").on("click", function (event) {
		play_ball("NB", 0);
	});
	$("#run_4").on("click", function (event) {
		play_ball(4);
	});
	$("#run_6").on("click", function (event) {
		play_ball(6);
	});
	$("#run_W").on("click", function (event) {
		play_ball("W", 0);
	});
	$("#scoreboard-btn").on("click", function (event) {
		update_scoreboard();
	});
	init();
});

function init() {
	const urlParams = new URLSearchParams(window.location.search);
	console.log("urlParams.get()");
	console.log(urlParams.get("debug"));
	if (urlParams.get("debug") == null || urlParams.get("debug") != "true")
		$("#messages").hide();
	update_scoreboard(); // Initial call to display scoreboard (empty initially)
}

function shareModeStart() {
	isShareMode = true;
	startConnect();
}

function play_ball(run, score = 1) {
	if (run == "+") {
		//Wide ball
		runs++;
		scoreboard[over_no][0] += 1;
		update_score();
		return;
	}
	if (run == "NB") {
		// isNoBall = true;
		noBall(true);
		//No ball
		runs++;
		scoreboard[over_no][0] += 1;
		update_score();
		return;
	}
	if (score == 1) {
		runs += run;
	}
	// console.log("over_no=", over_no, "| ball_no=", ball_no," |Runs=",runs);

	if (isNoBall) {
		scoreboard[over_no][0] += run == "D" ? 0 : run;
		// isNoBall = false;
		noBall(false);
	} else {
		scoreboard[over_no][ball_no] = run;
		// console.log(scoreboard[over_no]);
		// console.log(scoreboard);
		update_runboard();
		ball_no++;
		if (ball_no >= 7) {
			scoreboardInfo[over_no] = scoreboardInfo[over_no] || {}; // Initialize if not exists
			scoreboardInfo[over_no]['batting'] = $("#battingTeam").val();
			scoreboardInfo[over_no]['bowler'] = $("#bowlerName").val();

			ball_no = 1;
			over_no++;
			scoreboard[over_no] = [];
			scoreboard[over_no][0] = 0; //Wide bowls counter

			// Optionally clear the input fields after moving to the next over
			$("#battingTeam").val('');
			$("#bowlerName").val('');
		}
	}
	update_score();
	update_scoreboard();
}

function update_runboard() {
	// Updates the runboard when the function is called
	for (i = 1; i < 7; i++) {
		let score_und = (_score_und) => (_score_und == undefined ? "" : _score_und);
		updateHtml("#ball_no_" + i.toString(), score_und(scoreboard[over_no][i]));
	}
	if (ball_no != 1) {
		$("#ball_no_" + ball_no.toString()).removeClass("btn-light");
		$("#ball_no_" + ball_no.toString()).addClass("btn-primary");
	} else {
		for (i = 2; i <= 6; i++) {
			$("#ball_no_" + i.toString()).removeClass("btn-primary");
			$("#ball_no_" + i.toString()).addClass("btn-light");
		}
	}
	updateHtml(
		"#over-ball",
		(ball_no == 6 ? over_no : over_no - 1).toString() +
			"." +
			(ball_no == 6 ? 0 : ball_no).toString()
	);
}

function change_score() {
	let over = parseInt($("#change_over").val());
	let ball = parseInt($("#change_ball").val());
	let run = parseInt($("#change_run").val());
	edited.push([over, ball, scoreboard[over][ball], run]);
	scoreboard[over][ball] = run;
	update_score();
	update_scoreboard();
	updateHtml("#run", runs);
	let edited_scores = "Edited scores:<br>";
	for (i = 0; i < edited.length; i++) {
		edited_scores +=
			"(" +
			edited[i][0].toString() +
			"." +
			edited[i][1].toString() +
			") = " +
			edited[i][2].toString() +
			" -> " +
			edited[i][3].toString();
		edited_scores += "<br>";
	}
	// }
	updateHtml("#edited-scores", edited_scores);
}

function update_scoreboard() {
	var tableBody = $("#scoreboard-body");
	tableBody.empty(); // Clear the previous table body

	for (var i = 1; i <= over_no; i++) {
		var row = $("<tr></tr>");

		var battingCell = $("<td></td>").text(scoreboardInfo[i] ? scoreboardInfo[i]['batting'] : '');
		var overCell = $("<td></td>").text(i.toString());
		var scoreCell = $("<td></td>").text(scoreboard[i] ? scoreboard[i].slice(1, 7).join(" - ") + " (" + scoreboard[i][0].toString() + ")" : '');
		var bowlerCell = $("<td></td>").text(scoreboardInfo[i] ? scoreboardInfo[i]['bowler'] : '');

		row.append(battingCell, overCell, scoreCell, bowlerCell);
		tableBody.append(row);
	}
}

function update_score() {
	let score = 0;
	let wickets = 0;

	for (i = 1; i <= over_no; i++) {
		if (scoreboard[i]) {
			let numOr0 = (n) => (n == "+" ? 1 : isNaN(n) ? 0 : n);
			score += scoreboard[i].reduce((a, b) => numOr0(a) + numOr0(b));
			scoreboard[i].forEach((element) => {
				if (element == "W") wickets++;
			});
		}
	}
	// console.log(wickets);
	runs = score;
	updateTarget();
	updateHtml("#run", runs);
	updateHtml("#wickets", wickets);
}

function back_button() {
	if (over_no == 1 && ball_no == 1) return;
	ball_no--;
	if (ball_no == 0) {
		ball_no = 6;
		over_no--;
	}
	scoreboard[over_no][ball_no] = undefined;
	update_score();
	update_scoreboard();
	update_runboard();
	updateHtml(
		"#over-ball",
		(over_no - 1).toString() + "." + (ball_no - 1).toString()
	);
}

function noBall(is_NoBall) {
	isNoBall = is_NoBall;
	var run_no_ball = $("#run_no_ball");
	if (is_NoBall) {
		$("#no-ball-warning").show();
		$("#run_wide").prop("disabled", true);
		$("#run_no_ball").prop("disabled", true);
		$("#run_W").prop("disabled", true);

		run_no_ball.css("backgroundColor", "#0D6EFD");
		run_no_ball.css("color", "#ffffff");
	} else {
		$("#no-ball-warning").hide();
		$("#run_wide").prop("disabled", false);
		$("#run_no_ball").prop("disabled", false);
		$("#run_W").prop("disabled", false);

		run_no_ball.css("backgroundColor", "#e5f3ff");
		run_no_ball.css("color", "#0D6EFD");
	}
}

function setTarget(isTargetModeOn = true) {
	isTargetMode = isTargetModeOn;
	if (!isTargetModeOn) {
		$("#targetBoard").hide();
		$("#targetModeButton").show();
	} else {
		targetRuns = parseInt($("#targetRuns").val());
		targetOvers = parseInt($("#targetOvers").val());
		updateTarget();
		$("#targetBoard").show(2500);
		$("#targetModeButton").hide();
	}
	publishMessage(
		JSON.stringify({
			isTargetMode: isTargetMode,
		})
	);
}

function updateTarget() {
	if (!isTargetMode) return;
	updateHtml("#targetRunsRequired", targetRuns - runs);
	let ballsLeft = targetOvers * 6 - ((over_no - 1) * 6 + ball_no - 1);
	updateHtml("#targetOversLeft", ballsLeft);

	let closeButton =
		'&nbsp;&nbsp;<button type="button" class="btn-close" onClick="setTarget(false)"></button>';
	if (ballsLeft == 0) {
		if (targetRuns < runs) {
			updateHtml(
				"#targetBody",
				"Hurray! The batting team has Won!!" + closeButton
			);
		} else if (targetRuns - 1 == runs) {
			updateHtml("#targetBody", "Match Over! It's a tie." + closeButton);
		} else {
			updateHtml(
				"#targetBody",
				"Hurray! The bowling team has Won!!" + closeButton
			);
		}
		$("#targetModeButton").show();
	}
	if (targetRuns <= runs) {
		updateHtml(
			"#targetBody",
			"Hurray! The batting team has Won!!" + closeButton
		);
		$("#targetModeButton").show();
	}
}

function updateHtml(eleId, newHtml) {
	/// eleId is in the form of "#overs"
	let isSame = $(eleId).html() == newHtml;
	$(eleId).html(newHtml);

	if (isShareMode && !isSame)
		publishMessage(
			JSON.stringify({
				update: { eleId: eleId, newHtml: newHtml },
			})
		);
}

function sendInitVariables() {
	let vars = {
		"#ball_no_1": $("#ball_no_1").html(),
		"#ball_no_2": $("#ball_no_2").html(),
		"#ball_no_3": $("#ball_no_3").html(),
		"#ball_no_4": $("#ball_no_4").html(),
		"#ball_no_5": $("#ball_no_5").html(),
		"#ball_no_6": $("#ball_no_6").html(),
		"#over-ball": $("#over-ball").html(),
		"#run": $("#run").html(),
		"#edited-scores": $("#edited-scores").html(),
		"#scoreboard": $("#scoreboard").html(),
		"#wickets": $("#wickets").html(),
		"#targetRunsRequired": $("#targetRunsRequired").html(),
		"#targetBody": $("#targetBody").html(),
	};
	publishMessage(
		JSON.stringify({
			init: vars,
			isTargetMode: isTargetMode,
			scoreboardInfo: scoreboardInfo // Send scoreboardInfo as well
		})
	);
}

window.addEventListener('beforeunload', function (event) {
    // Check if any runs or wickets have been recorded
    if (runs > 0 || wickets > 0 || over_no > 1 || (over_no === 1 && ball_no > 1)) {
        // If there's a score, show the confirmation dialog
        event.preventDefault();
        event.returnValue = ''; // Required for some older browsers
        return 'Are you sure you want to leave? Your score data will be lost.';
    }
    // If no score is recorded, allow the page to unload without confirmation
});
