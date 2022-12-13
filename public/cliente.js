document.addEventListener('DOMContentLoaded', () =>{//cuando se crea la pagina en el DOM
    const userGrid = document.querySelector('.grid-user'); //clases del multiplayer y el singleplayer
    const cpuGrid = document.querySelector('.grid-cpu');
    const displayGrid = document.querySelector('.grid-display');

    const ships = document.querySelectorALL('.ship');//encuentra todos los que tengan la clase .ship
    //mete todos los barcos en una sola variable por su clase

    //barcos
    //desctructor
    const destroyer = document.querySelector('.destroyer-container'); //encuentra solo el primero que encuentra
    //submarino
    const submarine = document.querySelector('.submarine-container');
    //crusero
    const crusier = document.querySelector('.crusier-container');
    //barco de combate
    const battleship = document.querySelector('.battleship-container');
    //barquito
    const carrier = document.querySelector('.carrier-container');

    //botones
    const startButton = document.querySelector('#start'); //encuentra por elementos especificos
    const rotateButton = document.querySelector('#rotate');
    const turnDisplay = document.querySelector('#turn');
    const infoDisplay = document.querySelector('#info');

    const setupButton = document.getElementById('setup-buttons');
    
    //espacio entre cada celda
    const width = 10; 

    //constante que cuente los cuadros que tenga disponible el usuario y la cpu
    const userSquares = [];
    const cpuSquares = [];

    //variable que nos diga que el juego se acabo o no
    let isGameOvert = false;
    let ready = false;
    let enemyReady = false;
    let allShipsPlaced = false; //pocisiona todos tus barcos
    let playerNum = 0;//contador de jugadores
    let shotsFired = -1;//por que es un array
    let currentPlayer = 'user';
    let isHorizontal = true;

    //tablero de casillas con los barquitos
    const shipsArray = [//declaramos con objeto por cada elemento del arreglo
    {
        name: 'destroyer',
        directions: [
            [0, 1],
            [0, width]
        ]
    },
    {
        name: 'submarine',
        directions: [
            [0, 1],
            [0, width, width * 2]
        ]
    },
    {
        name: 'cruiser',
        directions: [
            [0, 1, 2],
            [0, width, width * 2]
        ]
    },
    {
        name: 'battleship',
        directions: [
            [0, 1, 2, 3],
            [0, width, width * 2, width * 3]
        ]
    },
    {
        name: 'carrier',
        directions: [
            [0, 1, 2, 3, 4],
            [0, width, width * 2, width * 3, width * 4]
        ]
    }
    ];

    //funcion que cree nuestro tablero o grilla
    function createBoard(grid, squares){
        for(let i = 0; i < width * width; i++){
            const square = document.createElement('div');
            square.dataset.id = 1;//sobreescribe el id
            //data set es una interfaz y medio de ponerle cualquier cosa que quiera a mi elemento
            grid.appendChild(square);
            squares.push(square);
        }
    };
    //crea el tablero del usuario y cpu
    createBoard(userGrid, userSquares);
    createBoard(cpuGrid, cpuSquares);

    // seleccion de modo de juego un jugador o multi
    if(gameMode === 'singlePlayer'){
        startSinglePlayer();
    } else {
        startMultiPlayer();
    };

    //Multijugador
    function startMultiPlayer(){ 
        //genera una nueva conecxion
        const socket = io('player-number', num => {
            if (num == -1){
                infoDisplay.innerHTML = "El servidor esta lleno"
            } else {
                playerNum = parseInt(num);
                if (playerNum === 1) currentPlayer = "enemy"; //el 1 de [0,1] es enemigo
                
                console.log(playerNum);

                //revisa el status de otros jugadores
                socket.emit('check-players');
            };
        });

        //Si el otro jugador se ha desconectado o conectado
        socket.on('player-connection', num => {
            console.log(`Jugador ${num} se ha desconectado`);
            playerConnectedOrDisconnected(num);
        })

        //Cuando el enemigo esta listo
        socket.on('enemy-ready', num  => {
            enemyReady = true;
            playerReady(num);//la funcion se declara mas abajo
            if (ready){
                playGameMulti(socket);//la funcion se declara mas abajo
                setupButton.style.display = 'none';
            };
        });

        //revisa el status del jugador
        socket.on('check-players', players => {
            players.forEach((p, i) => {//forEach ejecuta la funcion por cada elemento del arreglo
                if(p.connected) playerConnectedOrDisconnected(i);
                if(p.ready){
                    playerReady(i);
                    if (i == playerReady) enemyReady = true;
                };
            });
        });

        //Se acabo el tiempo de la partida
        socket.on('timeout', () => {
            //aqui manipulamos el dom
            infoDisplay.innerHTML = '¿Sigues ahi?, se acabo el tiempo!'
        });

        //Clic para el boton ready
        startButton.addEventListener('click', () => {
            //si todos los barcos estan colocados en su lugar entonces... por defecto es == true
            if(allShipsPlaced) playGameMulti(socket)
            else infoDisplay.innerHTML = "Debes poner TODOS los barcos primero";
            //el .innerHTML coloca texto dentro un elemento html
        });

        //configuar listeners para disparar
        //cuando atacas a tu enemigo
        cpuSquares.forEach(square => {
            //detecta cuando un cuadrado enemigo es atacado o disparado y manda el dato con un id
            square.addEventListener('click', () => {
                if(currentPlayer === "user" && ready && enemyReady){
                    shotsFired = square.dataset.id;
                    socket.emit('fire', shotFired);
                }
            });
        });

        //cuando recibes un disparo
        socket.on('fire', id =>{
            enemyGo(id);//esta funcion se define mas abajo
            const square = userSquares[id];
            socket.emit('fire-reply', square.classList);
            playGameMulti(socket);
        });

        //cuando se recibe la replica de un disparo
        socket.on('fire-reply', classList => {
            revealSquare(classList);
            playGameMulti(socket);
        })

        //si el jugador esta conectado o desconectado
        function playerConnectedOrDisconnected(num){
            let player = `.p${parseInt(num) + 1}`;
            document.querySelector(`${player} .connected`).classList.toggle('active');
            //el classList es una propiedad de DOM html que modifica una lista de clases
            //con toggle definimos la presencia de un elemento html, si aparece o no
            if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold';
            //vuelve en negritas el nombre del jugador
        };
    };
    
    //Modo un solo jugador
    function startSinglePlayer(){
        generar(shipsArray[0]);
        generar(shipsArray[1]);
        generar(shipsArray[2]);
        generar(shipsArray[3]);
        generar(shipsArray[4]);
        
        startButton.addEventListener('click', () => {
            setupButton.style.display = 'none';
            playGameSingle();
        })
    };

    //creamos el tablero del juego
    function createBoard(grid, squares){
        //crea un div por cada ciclo, el width lo declaramos previamente y es de 10
        for(let i = 0; i < width * width; i++){
            const square = document.createElement('div');
            square.dataset.id = i;
            grid.appendChild(square);//añade los div a el dom
            squares.push(square);//añade los id a un arreglo
        };
    };

    //genera barcos ubicaciones alteatorias
    function generar(ship){
        let randomDirection = Math.floor(Math.random() * ship.directions.length);//numero aleatorio
        let current = ship.directions[randomDirection]; //directions viene el shipsArray
        if(randoomDirection === 0) direction = 1;
        if(randoomDirection === 1) direction = 10;
        //evita que el posicionamento de los barcos quede fuera del grid

        //genera inicios aletatorios
        let randomStart = Math.abs(Math.floor(Math.random() * cpuSquares.length - (ship.directions[0].length * direction)));
        //el directions[0] pertenece al arreglo shipsArray[];
        //el direction viene de if(randoomDirection === 0) direction = 1;

        //validacion de que si cierto lugar esta ocupado
        const isTaken = current.some(index => cpuSquares[randomStart + index].classList.contains('taken'));
        //validamos si la posicion actual que contenga taken
        //.some comprueba si un elemento del array cumple con lo que le digamos
        
        //verifica que no este demasiado a la derecha
        const isAtRightEdge = current.some(index => (randomStart + index) % width === width -1);//el -1 representa la derecha
        const isAtLeftEdge = current.some(index => (randomStart + index) % width === width -0); //el 0 indica a la izquierda

        //si todo esta correcto entonces comienza a añadirme elementos en un arreglo
        if(!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => cpuSquares[randomStart + index].classList.add('taken', ship.name));
        else generar(ship)
    };

    //rotacion de los barcos
    
});