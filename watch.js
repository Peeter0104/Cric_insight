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

var topic = -1;

$(document).ready(function () {
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get("matchCode") != null) {
		console.log(urlParams.get("matchCode"));
		startConnect(urlParams.get("matchCode")); //TODO
	} else {
		let myModal = new bootstrap.Modal(
			document.getElementById("shareModal"),
			{}
		);
		myModal.show();
	}
	console.log(document.location.origin);

	if (urlParams.get("debug") == null || urlParams.get("debug") != "true")
		$("#messages").hide();
});

function getMatchCodeNConnect() {
	let matchCode = $("#matchCodeInput").val();
	startConnect(matchCode);
}

let isStartConnectDone = false;

function startConnect(_topic) {
	clientID = "clientID - " + parseInt(Math.random() * 100);

	host = "test.mosquitto.org";
	port = 8080;
	topic = _topic ?? "" + parseInt(Math.random() * 1000000);

	document.getElementById("messages").innerHTML +=
		"<span> Connecting to " + host + "on port " + port + "</span><br>";
	document.getElementById("messages").innerHTML +=
		"<span> Using the client Id " + clientID + " </span><br>";

	client = new Paho.MQTT.Client(host, Number(port), clientID);

	client.onConnectionLost = onConnectionLost;
	client.onMessageArrived = onMessageArrived;

	client.connect({
		onSuccess: onConnect,
		//        userName: userId,
		//       passwordId: passwordId
	});
	isStartConnectDone = true;
	console.log("start connect done!");
}

function onConnect() {
	document.getElementById("messages").innerHTML +=
		"<span> Subscribing to topic " + topic + "</span><br>";

	client.subscribe("matchCodeWatch" + topic);
	publishMessage(JSON.stringify({ init: "true" }));
	console.log("onConnect called");
}

function onConnectionLost(responseObject) {
	document.getElementById("messages").innerHTML +=
		"<span> ERROR: Connection is lost.</span><br>";
	if (responseObject != 0) {
		document.getElementById("messages").innerHTML +=
			"<span> ERROR:" + responseObject.errorMessage + "</span><br>";
	}
}

function onMessageArrived(message) {
	console.log("OnMessageArrived: " + message.payloadString);
	document.getElementById("messages").innerHTML +=
		"<span> Topic:" +
		message.destinationName +
		"| Message : " +
		message.payloadString +
		"</span><br>";

	let payload = JSON.parse(message.payloadString);
	if (payload.update != undefined) {
		updateHtml(payload.update.eleId, payload.update.newHtml);
	} else if (payload.init != undefined) {
		showConnected();
		initHtml(payload);
		if (payload.scoreboardInfo) {
			scoreboardInfo = payload.scoreboardInfo;
			updateScoreboard();
		}
	} else if (payload.isTargetMode != undefined)
		setTargetMode(payload.isTargetMode);
	else if (payload.scoreboardInfo != undefined) {
		scoreboardInfo = payload.scoreboardInfo;
		updateScoreboard();
	}
}

function publishMessage(msg) {
	if (!isStartConnectDone) return;

	Message = new Paho.MQTT.Message(msg);
	Message.destinationName = "matchCodeWatch" + topic + "origin";

	client.send(Message);
	document.getElementById("messages").innerHTML +=
		"<span> Message to topic " + topic + " is sent </span><br>";
}

function updateHtml(eleId, newHtml) {
	$(eleId).html(newHtml);
}

function initHtml(payload) {
	for (let keys in payload.init) {
		$(keys).html(payload.init[keys]);
	}
	setTargetMode(payload.isTargetMode);
}

function setTargetMode(isTargetMode) {
	isTargetMode ??= false;
	if (isTargetMode) $("#targetBody").show();
	else $("#targetBody").hide();
}

function showConnected() {
	console.log("Connected successfully!");
	$("#alert").html("Connected successfully!");
	$("#alert").show();
	setTimeout(function () {
		$("#alert").hide();
	}, 4000);
}

function updateScoreboard() {
	var tableBody = $("#scoreboard-body");
	tableBody.empty();

	for (var i = 1; i <= Object.keys(scoreboardInfo).length; i++) {
		if (scoreboardInfo[i]) {
			var row = $("<tr></tr>");
			var battingCell = $("<td></td>").text(scoreboardInfo[i]['batting'] || '');
			var overCell = $("<td></td>").text(i.toString());
			var score = scoreboard[i] ? scoreboard[i].slice(1, 7).join(" - ") + " (" + scoreboard[i][0].toString() + ")" : '';
			var scoreCell = $("<td></td>").text(score);
			var bowlerCell = $("<td></td>").text(scoreboardInfo[i]['bowler'] || '');
			row.append(battingCell, overCell, scoreCell, bowlerCell);
			tableBody.append(row);
		}
	}
}
