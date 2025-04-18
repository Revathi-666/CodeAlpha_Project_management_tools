const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");

require("dotenv").config();

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,

} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const tasks = [{ id: 1, name: "Introduction" }];

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

const botName = "Revathi Tutors Bot";


// Run when client connects
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to WorkZen! Initial tasks have been added."));
    io.to(user.room).emit("initialTasks", tasks);
    


    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
      
    });
  });


  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Listen for the "createTask" event
  socket.on("createTask", (task) => {
    const user = getCurrentUser(socket.id);
    const newTask = {id: tasks.length + 1,  name: task.name }
    tasks.push(newTask);
    console.log(newTask);
    io.to(user.room).emit("viewTask", tasks);
    io.to(user.room).emit("message", formatMessage(botName, `${user.username} has created task: ${task.name}`));
  
  });
 
 

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  .on('error', (err) => console.error(`Server error: ${err.message}`));