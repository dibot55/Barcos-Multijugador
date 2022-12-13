const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const PORT = process.env.PORT || 3000;
const socket = require('socket.io');
const server = http.createServer('app');
const io = socket(server);

//vamos a usar la carpeta public como estatico
app.use(express.static(path.join(__dirname, "public")));
//HOST
server.listen(PORT, () => {
    console.log("El servidor esta corriendo en el puerto: " + PORT);
});

const connections = [null,null]; //array de conecciones almacenado en una constante con solo dos espacios

//recibir nuestra coneccion con sockets
io.on('connection', socket => {
    //verifica si hay algun jugador disponible
    let playerIndex = -1;
    //el numero define la posicion en un arreglo
    //el -1 es por que en un arreglo comienza a contar desde 0 [0, 1] y como 0 es un jugador y 1 es otro
    //-1 es no hay ningun jugador o la ausencia de uno
    for (const i in connections){
        //por cada constante en conections diferente en el array significa que hay un jugador
        if(connections[i] === null){
            playerIndex = i; //si hay expacio mete un jugador ahi.
            break;
        };
    };

    //emision
    socket.emit("player-number", playerIndex); //nombre de los datos y a donde van los datos
    console.log(`Jugador ${playerIndex} se ha conectado`);

    //ignoramos a un tercer jugador
    if (playerIndex === -1){
        return;
    };
    connections[playerIndex] = false;

    //aviso cuando llego un nuevo jugador
    //-------------------------------broadcast--------------------------------------

    //diferencia entre emit y broadcast.emit es que el ultimo le llega a todas las conecciones no solo a una
    socket.broadcast.emit('player-connection', playerIndex);

    //-----------------------Desconectar un jugador
    socket.on('disconnect', () =>{
        console.log(`Jugador ${playerIndex} se ha desconectado`);
        
        //resetear el espacio en el arreglo
        connections[playerIndex] = null;

        //avisar a todas mis conecciones/sockets que tal usuario se desconecto
        socket.broadcast.emit('player-connection', playerIndex);
    });

    //-------------------------iniciar partida
    socket.on('player-ready', () => {
        socket.broadcast.emit('enemy-ready', playerIndex);
        connections[playerIndex] = true; //cuando los dos esten en true comienza el juego
    });

    //--------------------------revisar las coneciones de los jugadores
    socket.on('check-players', () => {
        const players = [];
        for(const i in connections){
            connections[i] === null ? 
            players.push({connected: false, ready: false}) : //si es nulo ponlo como false
            players.push({connected: true, ready: connections[i]}); //si no es nulo significa que hay un jugador
        };

        //emision
        //no se usa broadcast por que ya sabemos que hay 2 jugadores
        socket.emit('check-players', players);
    });

    //recepcion
    socket.on('fire', id =>{
        console.log(`Dispario de ${playerIndex}`, id);
        socket.broadcast.emit('fire', id); //guarda los disparos por id y los asigna al player
    });

    //fire replay: la otra persona me ataca
    socket.on('fire-replay', square =>{//cuadro que fue impactado por un disparo
        console.log(square);
        socket.broadcast.emit('fire-replay', square);// avisa del impacto
    });
    
    //si no responde en 10 minutos afk
    setTimeout(() => {
        connections[playerIndex] = null; //desconecta
        socket.emit('timeout');//manda el tiempo restante
        socket.disconnect();
    }, 600000);

});