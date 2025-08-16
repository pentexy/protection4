const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle nickname setting
    socket.on('set nickname', (nickname) => {
        if (Object.values(users).includes(nickname)) {
            socket.emit('nickname error', 'Nickname already in use');
        } else {
            users[socket.id] = nickname;
            socket.nickname = nickname;
            io.emit('user list', Object.values(users));
            socket.emit('nickname accepted');
        }
    });

    // Handle private messages
    socket.on('private message', ({to, message}) => {
        const timestamp = new Date().toLocaleTimeString();
        const recipientSocket = findSocketByNickname(to);
        
        if (recipientSocket && message.trim()) {
            const messageData = {
                from: socket.nickname,
                message: message.trim(),
                timestamp,
                isCurrentUser: false
            };
            
            // Send to recipient
            recipientSocket.emit('private message', messageData);
            
            // Send to sender with different formatting
            socket.emit('private message', {
                ...messageData,
                isCurrentUser: true,
                to
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.nickname) {
            delete users[socket.id];
            io.emit('user list', Object.values(users));
            console.log(`${socket.nickname} disconnected`);
        }
    });
});

function findSocketByNickname(nickname) {
    return [...io.sockets.sockets].find(([id, s]) => s.nickname === nickname)?.[1];
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/private-chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'private-chat.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
