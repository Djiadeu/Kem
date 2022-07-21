const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const { generatemsg, generateLocation } = require('./utils/messages')

const { addUser, removeUser, getUser, getUserInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const PORT = process.env.PORT || 3000

const publicdir = path.join(__dirname, '../public')

app.use(express.static(publicdir))

app.get('/register.html', function(request, response) {
 response.sendfile('./register.html');
});

io.on("connection", (socket) => {
    console.log("New user connected !")

    socket.on("join", ({ username, room }, cb) => {

        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return cb(error)
        }
        socket.join(user.room)
        socket.emit("message", generatemsg("Admin, Welcome"))
        socket.broadcast.to(user.room).emit("message", generatemsg(`${user.username} est déjà là!`))

        io.to(user.room).emit("roomData", {
            room: user.room,
            users: getUserInRoom(user.room)
        })
        cb()
    })

    socket.on("sendMessage", (msg, cb) => {
        const user = getUser(socket.id)
        io.to(user.room).emit("message", generatemsg(user.username, msg))
        cb()
    })

    socket.on("sendLocation", (location, cb) => {
        const user = getUser(socket.id)
        console.log(user)
        io.to(user.room).emit("locationurl", generateLocation(user.username, `https://www.google.com/maps?q=${location.latitude},${location.longitude}`))
        cb()
    })

    socket.on("disconnect", () => {
        const user = removeUser(socket.id)
        console.log(user)
        if (user) {
            io.to(user.room).emit("message", generatemsg(`${user.username} est alors parti...`))
            console.log("A user gone away ...")

            io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUserInRoom(user.room)
            })
        }

    })

})
server.listen(PORT, () => {
    console.log("Kemudja server is up on localhost:" + PORT)
})
