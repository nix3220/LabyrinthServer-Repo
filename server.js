const { appendFile } = require('fs');
var http = require('http');
const fs = require('fs');
const { runInThisContext } = require('vm');

var boardPath = 'data/boards/';
var leaderboardPath = 'data/leaderboard/';
var timedBoardsPath = 'data/timed/'
var timedBoardsPathWithName = timedBoardsPath+'TimedBoards.json';
var leaderBoardPathWithName = leaderboardPath+"leaderboard.json";
class Vector2 {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}

class BoardData {
    constructor(author, uniqueID, date, boardName,
        tileTypes,
        rotDirs,
        goalPositions,
        maxGoals,
        GGV,
        LGV,
        placementTTYPE,
        placementRDIR,
        powerupSpawnRate) {
            this.author = author
            this.uniqueID = uniqueID
            this.date = date;
            this.boardName = boardName
            this.tileTypes = tileTypes
            this.rotDirs = rotDirs
            this.goalPositions = goalPositions
            this.maxGoals = maxGoals
            this.GGV = GGV
            this.LGV = LGV
            this.placementTTYPE = placementTTYPE
            this.placementRDIR = placementRDIR
            this.powerupSpawnRate = powerupSpawnRate
    }
     
}

class TimedBoards{
    constructor(numDaysChecked, dailyBoard, weeklyBoard){
        this.numDaysChecked = numDaysChecked;
        this.dailyBoard = dailyBoard
        this.weeklyBoard = weeklyBoard
    }
}

class BoardCollection{
    constructor(boards){
        this.boards = boards;
    }
}

class LeaderBoard{
    elements = new Map();
}
class LeaderBoardEntry{
    constructor(boardId, playerName, playtime, date, numTurns){
        this.boardId = boardId;
        this.playerName = playerName;
        this.playtime = playtime;
        this.date = date;
        this.numTurns = numTurns;
    }
}

var boardDictionary = new Map();

var leaderBoardDictionary = new Map();

var TimedBoards = ReadTimedBoards();

function ReadTimedBoards()
{
    fs.readFileSync(timedBoardsPathWithName, (data) => {
        return JSON.parse(data);
    });
}

var minutes = 1;

var timerID = setInterval(function() {
    CheckDailyAndWeeklyBoards();
}, (minutes*60) * 1000);

function CheckDailyAndWeeklyBoards(){
    
}

function checkPaths(){
    if(!fs.existsSync(boardPath)){
        fs.mkdirSync(boardPath, { recursive: true });
    }
    if(!fs.existsSync(leaderboardPath)){
        fs.mkdirSync(leaderboardPath, { recursive: true });
    }
    return true;
}

var pathsChecked = checkPaths();

function populateBoardDictionary(){
    fs.readdirSync(boardPath).forEach(file => {
        var data = fs.readFileSync(boardPath+file);
        var board = JSON.parse(data);
        AddBoard(board, false);
        console.log(file);
        console.log(boardDictionary);
    });
}

function populateLeaderBoardDictionary(){
    if(!fs.existsSync(leaderBoardPathWithName)){
        return;
    }
    try {
        var data = fs.readFileSync(leaderBoardPathWithName);
        var leaderBoard = JSON.parse(data, reviver);
        leaderBoardDictionary = leaderBoard;
        console.log("Leaderboard loaded from file");
        console.log(leaderBoardDictionary);
    } catch (error) {
        console.log("pop lead di: " + error);
    }
}

var populate2 = populateLeaderBoardDictionary();
var populate = populateBoardDictionary();




var server = http.createServer(function (req, res){
    //handle incoming requests
    if(req.url == "/getTestBoard"){
        var board = getTestBoard();
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(board));  
        res.end();
    }
    if(req.url == '/randomBoard'){
        var board = generateRandomBoard(false);
        console.log("in /data")
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(board));  
        res.end();
    }
    if(req.url == '/getAllBoards'){
        var boards = Array.from(boardDictionary.values());
        var collection = new BoardCollection(boards);
        console.log(boards);
        console.log(collection);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(collection));  
        res.end();
    }
    if(req.url.includes('/getBoard')){
        var boardId = req.url.split("/")[2];
        var board = boardDictionary.get(boardId);
        if(board){
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.write(JSON.stringify(board));  
            res.end();
        }
    }
    if(req.url == '/sendBoard'){
        let body = [];
        let json = "";
        req.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', ()=>{
            console.log("On End")
            json = Buffer.concat(body).toString();
            var obj = JSON.parse(json);
            console.log(obj);
            AddBoard(obj, true);
            console.log(boardDictionary);
        });
    }
    if(req.url == '/sendLeaderboard'){
        let body = [];
        let json = "";
        req.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', ()=>{
            console.log("On End leaderboard")
            json = Buffer.concat(body).toString();
            var obj = JSON.parse(json);
            console.log(obj);
            AddToLeaderBoard(obj.boardId, obj.playerName, obj.playtime, obj.date, obj.numTurns);
            console.log(leaderBoardDictionary);
        });
    }
    if(req.url.includes('/getLeaderboard')){
        var boardId = req.url.split("/")[2];
        var boardLeaderboard = leaderBoardDictionary.get(boardId);
        if(!boardLeaderboard){
            leaderBoardDictionary.set(boardId, new LeaderBoard())
            var boardLeaderboard = leaderBoardDictionary.get(boardId);
        }
        var values = Array.from(boardLeaderboard.elements.values());
        var returnObj = {"leaderBoardEntries": values};
        console.log(returnObj);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(returnObj));  
        res.end();
    }
});

function writeLeaderBoardToFile(){
    var data = JSON.stringify(leaderBoardDictionary, replacer, 2);
    try{
        fs.writeFileSync(leaderBoardPathWithName, data);
        console.log("Leaderboard written to file");
        console.log(leaderBoardDictionary);
    }
    catch(err){
        console.log("Write leaderboard to file: " + err);
    }
    
}

function replacer(key, value) {
    if(value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
  }

function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
        return new Map(value.value);
        }
    }
    return value;
}


function writeBoardsToFile(){
    boardDictionary.forEach((value, key) => {
        writeBoardToFile(value);
    });
}

function writeBoardToFile(board){
    var fileName = board.uniqueID + ".json";
    var data = JSON.stringify(board, 2);
    fs.writeFileSync(boardPath + fileName, data);
}


function formattedDate () {
    var d = new Date();
    var hour = d.getHours();
    var pm = "AM";

    if(hour > 12){
        hour -= 12;
        pm = "PM";
    }
    return d.getMonth()+1 + "/" + d.getDate() + "/" + d.getFullYear() + " " + hour + ":" + d.getMinutes() + " " + pm;
}

function getTestBoard(){
    console.log("getting test board")
    var tileTypes = [1,2,1,0,1,2,1,1,2]
    var rotDirs = [1,2,3,1,2,3,1,2,3]
    var goalPositions = [new Vector2(0,0), new Vector2(1,1)]
    board = new BoardData("TestAuthor", makeid(), formattedDate(), "Test", tileTypes, rotDirs, goalPositions, 2, 1, 1, 2, 3, 100);
    return board;
}

function generateRandomBoard(name){
    var tilesDim = Math.round((Math.random()*7)+3);
    var goalAmt = Math.round((Math.random()+tilesDim)+3);

    var usedGoalPositions = [];

    var tileTypes = []
    var rotDirs = []
    var goalPositions = []
    for(var i = 0; i < tilesDim*tilesDim; i++){
        tileTypes[i] = Math.round(Math.random()*2)
        rotDirs[i] = Math.round(Math.random()*3)
    }
    for(var i = 0; i < goalAmt; i++){
        var pos = new Vector2(Math.round(Math.random()*(tilesDim-1)), Math.round(Math.random()*(tilesDim-1)))

        goalPositions[i] = pos;
        usedGoalPositions[i] = pos;

    }

    
    board = new BoardData("TestAuthor",makeid(), formattedDate(), name, tileTypes, rotDirs, goalPositions, goalAmt, 1, 1, Math.round(Math.random()*2), Math.round(Math.random()*3), 0);
    return board;
}

function AddBoard(board, writeToFile){
    var uniqueId = board.uniqueID;
    // if(!leaderBoardDictionary.has(uniqueId)){
    //     leaderBoardDictionary.set(uniqueId, new LeaderBoard());
    //     writeLeaderBoardToFile();
    // }
    boardDictionary.set(uniqueId, board);
    if(writeToFile){
       writeBoardToFile(board);
    }
    
}



function AddToLeaderBoard(uniqueId, playerName, time, date, numTurns){
    //add time to leaderboard in dictionary
    var leaderboard = leaderBoardDictionary.get(uniqueId);
    if(leaderboard){
        console.log("Leaderboard exists");
        if(!leaderboard.elements.has(playerName)){
            console.log("Player does not exist");
            leaderboard.elements.set(playerName, new LeaderBoardEntry(uniqueId, playerName, time, date, numTurns))
        }
        else {
            console.log("Player exists");
            if(leaderboard.elements.get(playerName).playtime > time){
                leaderboard.elements.set(playerName, new LeaderBoardEntry(uniqueId, playerName, time, date, numTurns))
            }
        }
    }
    else{
        console.log("Leaderboard does not exist");
        leaderBoardDictionary.set(uniqueId, new LeaderBoard());
        leaderboard = leaderBoardDictionary.get(uniqueId)
        leaderboard.elements.set(playerName, new LeaderBoardEntry(uniqueId, playerName, time, date, numTurns))
    }

    writeLeaderBoardToFile();
}

function makeid() {
    var length = 10;
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.round(Math.random() * (charactersLength-1)));
    }
    return result;
}

server.listen(26000);

console.log('Node.js server at port 26000 is running...');