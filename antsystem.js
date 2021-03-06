function Point(x,y){
	this.x = x;
	this.y = y;
}
function Food(x,y,size){
	this.location = new Point(x,y);
	this.size = size;
}
function Ant(x,y,worker){
	this.id = id;
	this.location = new Point(x,y);
	this.worker = worker;
	this.carrying_food = false;
}

//config object used to set the parameters of the game. This object is passed to the worker thread to initialize it
var canvas;
var ctx;
var config = new Object();
config.grid_x = 200;
config.id = 1;
var worker;
var gamestate;

//start the run loop
function ants_init(){
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext("2d");
	(function animloop(){
      requestAnimFrame(animloop, canvas);
      draw_state();
    })();
	worker = new Worker("ants.js");
	worker.onerror = function(error) {
		console.log(error.message);
	};
	$('#canvas').unbind('click').click(function(event) {
		if(typeof(gamestate) == 'undefined') return;
		var offset = $('#canvas').offset();
		var message = new Object();
		message.act = "place_food";
		message.data = new Object();
		message.data.x = event.pageX-offset.left;
		message.data.y = event.pageY-offset.top;
		worker.postMessage(JSON.stringify(message));
	});
	//limit number of ants to 19, Firefox seems to limit number of subworkers
	if($('#num_ants').val() > 19){
		$('#num_ants').val(19);
	}
	config.num_ants = parseInt($('#num_ants').val());
	config.num_food = parseInt($('#num_food').val());
	config.food_size = parseInt($('#food_size').val());
	config.pheromone_evaporation_rate = parseInt($('#pheromone_evaporation_rate').val());
	
	$('#result').empty();
	
	worker.onmessage = function(event) {
		handle_worker_message_ants(event.data);
	};
	var message = new Object();
	message.act = "init";
	message.data = config;
	worker.postMessage(JSON.stringify(message));
}


function handle_worker_message_ants(data){
	var resultObj = JSON.parse(data);
	if(resultObj.act == "debug"){
		$('#result').append(resultObj.data+"<br>");
		return false;
	}
	if(resultObj.act == "update"){
		gamestate = resultObj.data;
		return true;
	}
}

function draw_state(){
	if(typeof(gamestate) == 'undefined' || !gamestate.hasChanged){return;}
	gamestate.hasChanged = false;
	ctx.clearRect(0, 0, config.grid_x, config.grid_x);
	ctx.fillStyle = "#000";
	ctx.beginPath();
	ctx.arc(config.grid_x/2,config.grid_x/2,4,0,Math.PI*2,true);
	ctx.fill();
	for(var i=0;i<=config.grid_x;i++){
		for(var j=0;j<=config.grid_x;j++)
			if(gamestate.pheromone[i][j] > 0){
				ctx.beginPath();
				ctx.arc(i,j,Math.min(gamestate.pheromone[i][j]/config.pheromone_evaporation_rate,10),0,Math.PI*2,true);
				ctx.fillStyle = "#0F0";
				ctx.fill();
			}
	}
	for(i in gamestate.food){
		ctx.beginPath();
		ctx.arc(gamestate.food[i].location.x,gamestate.food[i].location.y,Math.ceil(gamestate.food[i].size/4),0,Math.PI*2,true);
		ctx.fillStyle = "#ff0";
		ctx.fill();
	}
	for(i in gamestate.ants){
		ctx.beginPath();
		ctx.arc(gamestate.ants[i].location.x,gamestate.ants[i].location.y,4,0,Math.PI*2,true);
		ctx.fillStyle = "#000";
		ctx.fill();
	}
	$('#result').html("Cycle #: <strong>"+ gamestate.runCount + "<\/strong>, food collected: <strong>" + gamestate.foodCount + "<\/strong>");
	/** TO GATHER STATS:
	if(gamestate.runCount >= 2000){
		$('#stats').append(gamestate.foodCount+"<br>");
		stop();
		ants_init();
		start();
	}*/
		
}

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
		  window.webkitRequestAnimationFrame || 
		  window.mozRequestAnimationFrame    || 
		  window.oRequestAnimationFrame      || 
		  window.msRequestAnimationFrame     || 
		  function(/* function */ callback, /* DOMElement */ element){
			window.setTimeout(callback, 1000 / 60);
		  };
})();

//start the simulation
function start(){
	if(typeof(worker) == 'undefined') return;
	var message = new Object();
	message.act = "start";
	worker.postMessage(JSON.stringify(message));
}

//pause the game
function stop(){
	var message = new Object();
	message.act = "pause";
	worker.postMessage(JSON.stringify(message));
}

/**
STATS:
With Pheromone:

92
80
32
83
56
79
124
77
33
50
81
34
43
70
35
93
41
53
45
51
50
45
31
81
43
87
25
58
81
14
41
66


Without Pheromone:
42
49
24
26
11
8
29
52
23
24
53
42
27
51
27
82
13
7
8
23
11
28
44
74
35
19
25
32
65
27
31
33

Unpaired t test results

P value and statistical significance: 
  The two-tailed P value is less than 0.0001
  By conventional criteria, this difference is considered to be extremely statistically significant. 

Confidence interval:
  The mean of	With Pheromone minus Without Pheromone equals 25.91
  95% confidence interval of this difference: From 14.94 to 36.87 

Intermediate values used in calculations:
  t = 4.7223
  df = 62
  standard error of difference = 5.486 

Group		With Pheromone		Without Pheromone  
Mean		58.56				32.66
SD			24.76				18.71
SEM			4.38				3.31
N			32					32    

*/