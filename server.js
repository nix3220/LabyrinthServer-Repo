const { appendFile } = require("fs");
let http = require("http");
const fs = require("fs");
const moment = require("moment");
moment().format();
const { runInThisContext } = require("vm");

let boardPath = "data/boards/";
let leaderboardPath = "data/leaderboard/";
let timedBoardsPath = "data/timed/";
let timedBoardsPathWithName = timedBoardsPath + "TimedBoards.json";
let leaderBoardPathWithName = leaderboardPath + "leaderboard.json";
class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class BoardData {
  constructor(
    author,
    uniqueID,
    date,
    boardName,
    tileTypes,
    rotDirs,
    goalPositions,
    maxGoals,
    GGV,
    LGV,
    placementTTYPE,
    placementRDIR,
    powerupSpawnRate,
    numPlays
  ) {
    this.author = author;
    this.uniqueID = uniqueID;
    this.date = date;
    this.boardName = boardName;
    this.tileTypes = tileTypes;
    this.rotDirs = rotDirs;
    this.goalPositions = goalPositions;
    this.maxGoals = maxGoals;
    this.GGV = GGV;
    this.LGV = LGV;
    this.placementTTYPE = placementTTYPE;
    this.placementRDIR = placementRDIR;
    this.powerupSpawnRate = powerupSpawnRate;
    this.numPlays = numPlays;
  }
}

class TimedBoards {
  constructor(numDaysChecked, dailyBoard, weeklyBoard) {
    this.numDaysChecked = numDaysChecked;
    this.dailyBoard = dailyBoard;
    this.weeklyBoard = weeklyBoard;
  }
}

class BoardCollection {
  constructor(boards) {
    this.boards = boards;
  }
}

class LeaderBoard {
  elements = new Map();
}
class LeaderBoardEntry {
  constructor(boardId, playerName, playtime, date, numTurns) {
    this.boardId = boardId;
    this.playerName = playerName;
    this.playtime = playtime;
    this.date = date;
    this.numTurns = numTurns;
  }
}

let boardDictionary = new Map();

let leaderBoardDictionary = new Map();

let timedBoards;
const runner = ReadTimedBoards();

function ReadTimedBoards() {
  let data = fs.readFileSync(timedBoardsPathWithName);
  let obj = JSON.parse(data);
  if (data === "[]") {
    obj = new TimedBoards(
      0,
      generateRandomBoard("Server", "Daily Board"),
      generateRandomBoard("Server", "Weekly Board")
    );
    console.log("Writing new boards");
    fs.writeFileSync(timedBoardsPathWithName, JSON.stringify(obj, null, 2));
  }
  timedBoards = obj;
}

const minutes = 1;
const t = boardTimer();

function boardTimer() {
  console.log(
    "seconds till midnight: " +
      moment("24:00:00", "hh:mm:ss").diff(moment(), "seconds")
  );
  console.log("days till next board: " + (7 - timedBoards.numDaysChecked));
  setTimeout(() => {
    CheckDailyAndWeeklyBoards,
      moment("24:00:00", "hh:mm:ss").diff(moment(), "seconds");
  });
}

function CheckDailyAndWeeklyBoards() {
  let days = timedBoards.numDaysChecked++;
  if (days >= 7) {
    timedBoards.weeklyBoard = generateRandomBoard();
    timedBoards.numDaysChecked = 0;
  }
  timedBoards.dailyBoard = generateRandomBoard();
  boardTimer();
  fs.writeFileSync(
    timedBoardsPathWithName,
    JSON.stringify(timedBoards, null, 2)
  );
}

function checkPaths() {
  if (!fs.existsSync(boardPath)) {
    fs.mkdirSync(boardPath, { recursive: true });
  }
  if (!fs.existsSync(leaderboardPath)) {
    fs.mkdirSync(leaderboardPath, { recursive: true });
  }
  return true;
}

let pathsChecked = checkPaths();

function populateBoardDictionary() {
  fs.readdirSync(boardPath).forEach((file) => {
    let data = fs.readFileSync(boardPath + file);
    let board = JSON.parse(data);
    AddBoard(board, false);
    console.log(file);
    console.log(boardDictionary);
  });
}

function populateLeaderBoardDictionary() {
  if (!fs.existsSync(leaderBoardPathWithName)) {
    return;
  }
  try {
    let data = fs.readFileSync(leaderBoardPathWithName);
    let leaderBoard = JSON.parse(data, reviver);
    leaderBoardDictionary = leaderBoard;
    console.log("Leaderboard loaded from file");
    console.log(leaderBoardDictionary);
  } catch (error) {
    console.log("pop lead di: " + error);
  }
}

let populate2 = populateLeaderBoardDictionary();
let populate = populateBoardDictionary();

let server = http.createServer(function (req, res) {
  //handle incoming requests
  if (req.url == "/getTestBoard") {
    let board = getTestBoard();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(board));
    res.end();
  }
  if (req.url == "/randomBoard") {
    let board = generateRandomBoard(false);
    console.log("in /data");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(board));
    res.end();
  }
  if (req.url == "/getAllBoards") {
    let boards = Array.from(boardDictionary.values());
    let collection = new BoardCollection(boards);
    console.log(boards);
    console.log(collection);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(collection));
    res.end();
  }
  if (req.url.includes("/getBoard")) {
    let boardId = req.url.split("/")[2];
    let board = boardDictionary.get(boardId);
    if (board) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write(JSON.stringify(board));
      res.end();
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.write(JSON.stringify("Board not found"));
      res.end();
      console.log("Board not found: " + boardId);
    }
    console.log("Getting board: " + boardId);
  }
  if (req.url == "/sendBoard") {
    let body = [];
    let json = "";
    req
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        console.log("On End");
        json = Buffer.concat(body).toString();
        let obj = JSON.parse(json);
        console.log(obj);
        AddBoard(obj, true);
        console.log(boardDictionary);
      });
  }
  if (req.url == "/sendLeaderboard") {
    let body = [];
    let json = "";
    req
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        console.log("On End leaderboard");
        json = Buffer.concat(body).toString();
        let obj = JSON.parse(json);
        console.log(obj);
        AddToLeaderBoard(
          obj.boardId,
          obj.playerName,
          obj.playtime,
          obj.date,
          obj.numTurns
        );
        console.log(leaderBoardDictionary);
      });
  }
  if (req.url.includes("/getLeaderboard")) {
    let boardId = req.url.split("/")[2];
    let boardLeaderboard = leaderBoardDictionary.get(boardId);
    if (!boardLeaderboard) {
      leaderBoardDictionary.set(boardId, new LeaderBoard());
      boardLeaderboard = leaderBoardDictionary.get(boardId);
    }
    let values = Array.from(boardLeaderboard.elements.values());
    let returnObj = { leaderBoardEntries: values };
    console.log(returnObj);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(returnObj));
    res.end();
  }
  if (req.url == "/getDailyWeekly") {
    let json = JSON.stringify(timedBoards);
    console.log(json);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(json);
    res.end();
  }
  if (req.url == "/test") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write("Successful Connection");
    res.end();
  }
});

function writeLeaderBoardToFile() {
  let data = JSON.stringify(leaderBoardDictionary, replacer, 2);
  try {
    fs.writeFileSync(leaderBoardPathWithName, data);
    console.log("Leaderboard written to file");
    console.log(leaderBoardDictionary);
  } catch (err) {
    console.log("Write leaderboard to file: " + err);
  }
}

function replacer(key, value) {
  if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}

function reviver(key, value) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "Map") {
      return new Map(value.value);
    }
  }
  return value;
}

function writeBoardsToFile() {
  boardDictionary.forEach((value, key) => {
    writeBoardToFile(value);
  });
}

function writeBoardToFile(board) {
  let fileName = board.uniqueID + ".json";
  let data = JSON.stringify(board, 2);
  fs.writeFileSync(boardPath + fileName, data);
}

function formattedDate() {
  let d = new Date();
  let hour = d.getHours();
  let pm = "AM";

  if (hour > 12) {
    hour -= 12;
    pm = "PM";
  }
  return (
    d.getMonth() +
    1 +
    "/" +
    d.getDate() +
    "/" +
    d.getFullYear() +
    " " +
    hour +
    ":" +
    d.getMinutes() +
    " " +
    pm
  );
}

function getTestBoard() {
  console.log("getting test board");
  let tileTypes = [1, 2, 1, 0, 1, 2, 1, 1, 2];
  let rotDirs = [1, 2, 3, 1, 2, 3, 1, 2, 3];
  let goalPositions = [new Vector2(0, 0), new Vector2(1, 1)];
  board = new BoardData(
    "TestAuthor",
    makeid(),
    formattedDate(),
    "Test",
    tileTypes,
    rotDirs,
    goalPositions,
    2,
    1,
    1,
    2,
    3,
    100
  );
  return board;
}

function generateRandomBoard(author, name) {
  let tilesDim = Math.round(Math.random() * 7 + 3);
  let goalAmt = Math.round(Math.random() + tilesDim + 3);

  let usedGoalPositions = [];

  let tileTypes = [];
  let rotDirs = [];
  let goalPositions = [];
  for (let i = 0; i < tilesDim * tilesDim; i++) {
    tileTypes[i] = Math.round(Math.random() * 2);
    rotDirs[i] = Math.round(Math.random() * 3);
  }
  for (let i = 0; i < goalAmt; i++) {
    let pos = new Vector2(
      Math.round(Math.random() * (tilesDim - 1)),
      Math.round(Math.random() * (tilesDim - 1))
    );
    goalPositions[i] = pos;
  }
  goalPositions = [...new Set(goalPositions)];
  goalAmt = goalPositions.length;

  board = new BoardData(
    author,
    makeid(),
    formattedDate(),
    name,
    tileTypes,
    rotDirs,
    goalPositions,
    goalAmt,
    1,
    1,
    Math.round(Math.random() * 2),
    Math.round(Math.random() * 3),
    0
  );
  return board;
}

function arrayRemove(arr, value) {
  return arr.filter(function (ele) {
    return ele != value;
  });
}

function AddBoard(board, writeToFile) {
  let uniqueId = board.uniqueID;
  // if(!leaderBoardDictionary.has(uniqueId)){
  //     leaderBoardDictionary.set(uniqueId, new LeaderBoard());
  //     writeLeaderBoardToFile();
  // }
  boardDictionary.set(uniqueId, board);
  if (writeToFile) {
    writeBoardToFile(board);
  }
}

function AddToLeaderBoard(uniqueId, playerName, time, date, numTurns) {
  //add time to leaderboard in dictionary
  let leaderboard = leaderBoardDictionary.get(uniqueId);
  if (leaderboard) {
    console.log("Leaderboard exists");
    if (!leaderboard.elements.has(playerName)) {
      console.log("Player does not exist");
      leaderboard.elements.set(
        playerName,
        new LeaderBoardEntry(uniqueId, playerName, time, date, numTurns)
      );
    } else {
      console.log("Player exists");
      if (leaderboard.elements.get(playerName).playtime > time) {
        leaderboard.elements.set(
          playerName,
          new LeaderBoardEntry(uniqueId, playerName, time, date, numTurns)
        );
      }
    }
  } else {
    console.log("Leaderboard does not exist");
    leaderBoardDictionary.set(uniqueId, new LeaderBoard());
    leaderboard = leaderBoardDictionary.get(uniqueId);
    leaderboard.elements.set(
      playerName,
      new LeaderBoardEntry(uniqueId, playerName, time, date, numTurns)
    );
  }

  writeLeaderBoardToFile();
}

function makeid() {
  let length = 10;
  let result = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.round(Math.random() * (charactersLength - 1))
    );
  }
  return result;
}

server.listen(26000);

console.log("Node.js server at port 26000 is running...");
