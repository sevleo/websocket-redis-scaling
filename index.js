const http = require("http");
const WebSocket = require("ws");
const redis = require("redis");

let connections = [];

(async () => {
  try {
    const subscriber = redis.createClient();
    const publisher = redis.createClient();

    subscriber.on("error", (err) => console.log("Redis Client Error", err));
    publisher.on("error", (err) => console.log("Redis Client Error", err));

    await subscriber.connect();
    await publisher.connect();

    // Subscribe to the "livechat" channel and set up a listener
    await subscriber.subscribe("livechat", (message, channel) => {
      console.log(`Received message from channel "${channel}": ${message}`);

      // Send the received message to all WebSocket connections
      connections.forEach((con) => con.send(message));
    });

    // Create a raw HTTP server for handling WebSocket connections
    const httpserver = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("WebSocket server is running. Please connect via WebSocket.\n");
    });

    //pass the httpserver object to the WebSocketServer library to do all the job, this class will override the req/res
    const websocket = new WebSocket.Server({ server: httpserver });

    httpserver.listen(8080, () =>
      console.log("My server is listening on port 8080")
    );

    //when a legit websocket request comes listen to it and get the connection .. once you get a connection thats it!
    websocket.on("connection", (con) => {
      connections.push(con);
      console.log("Client connected");

      con.on("close", () => {
        console.log("Client disconnected");
        connections = connections.filter((c) => c !== con);
      });

      con.on("message", (message) => {
        console.log(`Received message ${message.toString()}`);

        // Publish the received message to the "livechat" channel
        publisher.publish("livechat", message.toString());
      });

      con.send("Connected successfully to server");
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
})();

//client code
//let ws = new WebSocket("ws://localhost:8080");
//ws.onmessage = message => console.log(`Received: ${message.data}`);
//ws.send("Hello! I'm client")

/*
    //code clean up after closing connection
    subscriber.unsubscribe();
    subscriber.quit();
    publisher.quit();
    */
