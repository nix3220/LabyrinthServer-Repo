var http = require('http');

var server = http.createServer(function (req, res){
    //handle incoming requests

    if(req.url == '/data'){
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify({ message: "Hello World"}));  
        res.end();
    }
});

server.listen(26000);

console.log('Node.js server at port 26000 is running...');