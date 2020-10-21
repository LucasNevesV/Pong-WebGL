	
var gl; // GL context
var glObjects; // references to various GL objects
var html; // HTML objects
var player1;
var player2;
var ball;
	
window.onload = function(){
	htmlInit();
	glInit( html.canvas );
	gameInit();

	beginGame();
	window.addEventListener('keydown',callbackOnKeyDown);
	window.addEventListener('keyup',callbackOnKeyUp);
}
	
function htmlInit() {
    html={};
    html.html = document.getElementById('html');
    html.canvas = document.getElementById('canvas');
	html.scores = {};
	html.scores.localization = document.getElementById('scores');
	html.scores.p1 = 0;
	html.scores.p2 = 0;
};

function glInit(canvas) {
	gl = canvas.getContext("webgl");
	
	resizeCanvasToDisplaySize(gl.canvas);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	gl.enable(gl.DEPTH_TEST);
	
	gl.clearColor(0, 0, 0, 1);
	
	glObjects={}; 
	
	glObjects.shaderProgram = createProgram(gl);
	
	/* attributes */
	glObjects.coordinates = gl.getAttribLocation(glObjects.shaderProgram, "coordinates");
	/* uniform variables */
	glObjects.translation = gl.getUniformLocation(glObjects.shaderProgram, "translation");
	glObjects.resolutionUniformLocation = gl.getUniformLocation(glObjects.shaderProgram, "u_resolution");
	glObjects.color = gl.getUniformLocation(glObjects.shaderProgram, "color");
};

function createProgram(gl) {
	var program = gl.createProgram();

	loadVertexShader(gl, program);
	loadFragmentShader(gl, program);

	gl.linkProgram(program);

	return program;
}

function loadVertexShader(gl, program) {
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, `
		attribute vec2 coordinates;
		uniform vec2 translation;
		uniform vec2 u_resolution;
		
		void main() {
			// convert the position from pixels to 0.0 to 1.0
			vec2 zeroToOne = (coordinates + translation) / u_resolution;

			// convert from 0->1 to 0->2
			vec2 zeroToTwo = zeroToOne * 2.0;

			// convert from 0->2 to -1->+1 (clipspace)
			vec2 clipSpace = zeroToTwo - 1.0;

			gl_Position = vec4((clipSpace) * vec2(1, -1), 0, 1);
		}
	`);
	gl.compileShader(vertexShader);

	gl.attachShader(program, vertexShader);
}

function loadFragmentShader(gl, program) {
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, `
		precision mediump float;

		uniform vec3 color;
		void main() {
			gl_FragColor = vec4(color, 1); 
		}
	`);
	gl.compileShader(fragmentShader);

	gl.attachShader(program, fragmentShader);
}
	
function resizeCanvasToDisplaySize(canvas, multiplier) {
	multiplier = multiplier || 1;
	var width  = canvas.clientWidth  * multiplier | 0;
	var height = canvas.clientHeight * multiplier | 0;
	if (canvas.width !== width ||  canvas.height !== height) {
		canvas.width  = width;
		canvas.height = height;
		return true;
	}
	return false;
}

function gameInit(){
	ball = new Ball(html.canvas.width/2,html.canvas.height/2);	
    player1=new Player(20, html.canvas.height/2);
    player2=new Player(html.canvas.width-20,html.canvas.height/2);
}
	
function goal(p){
	if (p==1){
		html.scores.p1++;
	}else if(p==2){
		html.scores.p2++;
	}

	if(html.scores.p1 >= 3 || html.scores.p2 >= 3){
		let vencedor = html.scores.p1 > html.scores.p2 ? '1': '2';

		let resultado = document.getElementById('Resultado');
		resultado.innerHTML = "Jogador " + vencedor + " Vence !!";

		html.scores.p1 = 0;
		html.scores.p2 = 0;
		let dica = document.getElementById('Dica');
		dica.innerHTML = "'Espaço' para recomeçar";
	}


	html.scores.localization.innerHTML = html.scores.p1 +" - " + html.scores.p2;
}
	
function drawBall(){
	gl.useProgram( glObjects.shaderProgram );
	
	gl.uniform2f(glObjects.resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
	gl.uniform2fv( glObjects.translation, ball.translation );
	gl.uniform3fv( glObjects.color, ball.color );
	gl.bindBuffer(gl.ARRAY_BUFFER, ball.vertex_buffer );
	
	gl.vertexAttribPointer(glObjects.coordinates, 2, gl.FLOAT, false, 0 /* stride */, 0 /*offset */);
    gl.enableVertexAttribArray(glObjects.coordinates);
	
	gl.drawArrays(gl.TRIANGLE_FAN, 0, ball.points.length / 2);
}
	
function ballPhysics(){
	ball.translation[0] += ball.vx;
	ball.x += ball.vx;
	ball.translation[1] += ball.vy;
	ball.y += ball.vy;
	
	if(ball.x + ball.radius > html.canvas.width || ball.x + ball.radius < 0){
		if(ball.x + ball.radius > html.canvas.width){
			goal(1);
		}else if(ball.x + ball.radius < 0){
			goal(2);
		}
		ball.x = html.canvas.width/2;
		ball.y = html.canvas.height/2;
		ball.translation[0] = 0;
		ball.translation[1] = 0;
		ball.vx = 0;
		ball.vy = 0;
	}
	
	if ((ball.x-ball.radius <= player1.width/2 + 20) && (ball.x-ball.radius >  20)){

		if(ball.y+ball.radius >= player1.y - player1.height/2 && ball.y+ball.radius <= player1.y + player1.height/2){
			ball.vx = -ball.vx;		
		}
	}else if((ball.x+ball.radius >= html.canvas.width - player2.width/2 - 20) && (ball.x+ball.radius < html.canvas.width-20)) {
		if(ball.y+ball.radius >= player2.y - player2.height/2 && ball.y+ball.radius <= player2.y + player2.height/2){
			ball.vx = -ball.vx;		
		}
	}

	if (ball.y-ball.radius+ball.vy < 0 || ball.y + ball.radius + ball.vy > html.canvas.height) {
		ball.vy = -ball.vy;		
	}
}
	
function playerPhysics(){
		if(player1.up && (player1.y - player1.height/2  > 0)){
			player1.y -= player1.vy;
			player1.translation[1] -= player1.vy;			
		}
		if(player1.down && player1.y + player1.height/2  < html.canvas.height){
			player1.y += player1.vy;
			player1.translation[1] += player1.vy;
		}
		
		if(player2.up && (player2.y - player2.height/2  > 0)){
			player2.y -= player2.vy;
			player2.translation[1] -= player2.vy;			
		}
		if(player2.down && player2.y + player2.height/2  < html.canvas.height){
			player2.y += player2.vy;
			player2.translation[1] += player2.vy;
		}
}

function drawPlayer( player ) {
    gl.useProgram( glObjects.shaderProgram );
	gl.uniform2f(glObjects.resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
	
	gl.uniform2fv( glObjects.translation, player.translation );
	gl.uniform3fv( glObjects.color, player.color );
   	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,player.index_buffer );
	gl.bindBuffer(gl.ARRAY_BUFFER, player.vertex_buffer );
	gl.vertexAttribPointer(glObjects.coordinates, player.floatsPerVertex, gl.FLOAT, false, 0 /* stride */, 0 /*offset */);
    gl.enableVertexAttribArray(glObjects.coordinates);
		
    gl.drawElements(player.drawMode, 6 , gl.UNSIGNED_SHORT,0);
}
	
var Ball = function (x,y){
	this.x = x;
	this.y = y;

	this.color = [1,1,1];
	this.radius = 10;
	this.vx = 0;
	this.vy = 0;
	this.points = [x,y];
	this.translation = [0,0] 
	this.num_of_points = 10; 
	
	var angle;
	for (var i = 0; i <= this.num_of_points; i++){
		angle = Math.PI * (2 * i /  this.num_of_points);
		this.points.push(this.x + this.radius*Math.cos(angle));
		this.points.push(this.y + this.radius*Math.sin(angle));
	}
	
	this.vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.points) , gl.STATIC_DRAW ); 
}

var Player = function(x,y){
	this.x = x;
	this.y = y;
	
	this.up = false;
	this.down = false;
	this.width = 15;
	this.height = 100;
	this.vertices = [
		this.x - this.width/2, this.y - this.height/2,
		this.x + this.width/2, this.y - this.height/2,
		this.x - this.width/2, this.y + this.height/2,
		this.x + this.width/2, this.y + this.height/2,
	];
	this.indices= [0,1,3,3,2,0];
	
	this.color = [1,1,1];
	this.vy = 7;
	
	this.translation=[0,0];
    this.vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices) , gl.STATIC_DRAW ); 
	
	this.index_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer );
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices) , gl.STATIC_DRAW ); 
	
    this.floatsPerVertex=2;
    this.drawMode=gl.TRIANGLES;
}

function callbackOnKeyDown(event){
	//up - 38;
	//down - 40;
	//w - 87;
	//s -83;
	//alert(event.keyCode);
	
	if(event.keyCode == 87){
		player1.up = true;
		player1.down = false;
	}
	else if(event.keyCode == 83){
		player1.up = false;
		player1.down = true;
	}
	else if(event.keyCode == 38){
		player2.up = true;
		player2.down = false;
	}
	else if(event.keyCode == 40){
		player2.up = false;
		player2.down = true;
	}else if(event.keyCode == 32){


		if(ball.vx == 0 && ball.vy == 0){
			ball.vx = 4*Math.random() + 1;
			ball.vy = Math.sqrt(25 - ball.vx*ball.vx);
			if(html.scores.p1 < html.scores.p2){
				ball.vx *= -1;
			}

			let resultado = document.getElementById('Resultado');
			resultado.innerHTML = "";

			let dica = document.getElementById('Dica');
			dica.innerHTML = "";
		}
	}
}

function callbackOnKeyUp(event){
	//up - 38;
	//down - 40;
	//w - 87;
	//s -83;
	//alert(event.keyCode);
	
	if(event.keyCode == 87 || event.keyCode == 83){
		player1.up = false;
		player1.down = false;
	}
	else if(event.keyCode == 38 || event.keyCode == 40){
		player2.up = false;
		player2.down = false;
	}
}
	
function beginGame(){
		gl.clear(gl.COLOR_BUFFER_BIT);
		
		drawPlayer(player1);
		drawPlayer(player2);
		drawBall();
		ballPhysics();
		playerPhysics();
		window.requestAnimationFrame(beginGame);
}

