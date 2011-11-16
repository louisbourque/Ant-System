//import scripts:
//json2.js is an open source JSON parser, available at http://www.json.org/js.html
//json2.js is used to convert objects to string when passing to/from the worker
importScripts('json2.js');
//postMessage('{"act":"debug","data":"message"}');
function Point(x,y){
	this.x = x;
	this.y = y;
}
function Food(x,y,size){
	this.location = new Point(x,y);
	this.size = size;
}
function Ant(id,x,y){
	this.id = id;
	this.location = new Point(x,y);
	this.worker;
	this.carrying_food = false;
}
/**
This is the worker. It is used to perform all the CPU-intensive
processing, so the GUI will remain responsive.
**/

var config;
var stop_running = true;
var gamestate;
var tock_count = 0;

//this is the function that is called whenever the worker receives a message.
//based on the content of the message (event.data.act), do the appropriate action.
onmessage = function(event) {
	var message = JSON.parse(event.data);
	switch(message.act){
		case 'pause':
			stop_running = true;
			break;
		case 'init':
			config = message.data;
			gamestate = new Object();
			gamestate.home = new Point(parseInt(config.grid_x/2),parseInt(config.grid_x/2));
			gamestate.ants = new Array();
			gamestate.pheromone = new Array();
			for(var i=0;i<=config.grid_x;i++){
				gamestate.pheromone[i] = new Array();
				for(var j=0;j<=config.grid_x;j++)
					gamestate.pheromone[i][j] = 0;
			}
			for(var i=0;i<config.num_ants;i++){
				gamestate.ants[i] = new Ant(i,gamestate.home.x,gamestate.home.y);
				var worker = new Worker("ant.js");
				gamestate.ants[i].worker = worker;
				gamestate.ants[i].worker.onmessage = function(event) {
					tock(event.data);
				};
				var ant_message = new Object();
				ant_message.act = "init";
				ant_message.data = new Object();
				ant_message.data.config = config;
				ant_message.data.ant = new Ant(i,gamestate.home.x,gamestate.home.y);;
				gamestate.ants[i].worker.postMessage(JSON.stringify(ant_message));
			}
			gamestate.food = new Array();
			for(var i=0;i<config.num_food;i++){
				gamestate.food.push(new Food(Math.random()*config.grid_x,Math.random()*config.grid_x,config.food_size));
			}
			gamestate.runCount = 0;
			gamestate.foodCount = 0;
			var message = new Object();
			message.act = "update";
			message.data = gamestate;
			postMessage(JSON.stringify(message));
			break;
		case 'place_food':
				gamestate.food.shift();
				gamestate.food.push(new Food(message.data.x,message.data.y,config.food_size));
				var message = new Object();
				message.act = "update";
				message.data = gamestate;
				postMessage(JSON.stringify(message));
			break;
		case 'start':
			stop_running = false;
			tock_count = gamestate.ants.length;
			run();
			break;
	}
}

function run(){
	if(tock_count <= 0){
		gamestate.runCount++;
		var message = new Object();
		message.act = "update";
		message.data = gamestate;
		message.id = config.id;
		//only update the GUI every 4th run for performance
		if(gamestate.runCount%4 == 0)
			postMessage(JSON.stringify(message));
		tock_count = gamestate.ants.length;
		if(stop_running){
			return;
		}
		for(var i=0;i<=config.grid_x;i++){
			for(var j=0;j<=config.grid_x;j++)
				if(gamestate.pheromone[i][j] > 0)
					gamestate.pheromone[i][j]--;
		}
	}
	tock_count--;
	var message = new Object();
	message.act = "tick";
	message.data = new Object();
	message.data.food_here = food_here(gamestate.ants[tock_count].location.x,gamestate.ants[tock_count].location.y);
	message.data.food = new Object();
	message.data.food.n = food_here(gamestate.ants[tock_count].location.x-1,gamestate.ants[tock_count].location.y);
	message.data.food.e = food_here(gamestate.ants[tock_count].location.x,gamestate.ants[tock_count].location.y+1);
	message.data.food.s = food_here(gamestate.ants[tock_count].location.x+1,gamestate.ants[tock_count].location.y);
	message.data.food.w = food_here(gamestate.ants[tock_count].location.x,gamestate.ants[tock_count].location.y-1);
	message.data.pheromone = new Object();
	message.data.pheromone.n = gamestate.pheromone[gamestate.ants[tock_count].location.x-1][gamestate.ants[tock_count].location.y];
	message.data.pheromone.e = gamestate.pheromone[gamestate.ants[tock_count].location.x][gamestate.ants[tock_count].location.y+1];
	message.data.pheromone.s = gamestate.pheromone[gamestate.ants[tock_count].location.x+1][gamestate.ants[tock_count].location.y];
	message.data.pheromone.w = gamestate.pheromone[gamestate.ants[tock_count].location.x][gamestate.ants[tock_count].location.y-1];
	gamestate.ants[tock_count].worker.postMessage(JSON.stringify(message));
}

function tock(data){
	var message = JSON.parse(data);
	if(message.act != 'tock'){postMessage(data); return;}
	
	gamestate.ants[message.data.ant.id].location = message.data.ant.location;
	gamestate.ants[message.data.ant.id].carrying_food = message.data.ant.carrying_food;
	
	if(message.data.step.dropped_food)
		gamestate.foodCount++;
	
	if(message.data.step.pickup_food >= 0){
		gamestate.food[message.data.step.pickup_food].size--;
		if(gamestate.food[message.data.step.pickup_food].size <= 0){
			gamestate.food.splice(message.data.step.pickup_food,1);
		}
	}
	
	if(message.data.step.dropped_pheromone){
		gamestate.pheromone[message.data.ant.location.x][message.data.ant.location.y]+=config.pheromone_evaporation_rate;
	}
	
	if(!stop_running){
		run();
	}
}

function food_here(x,y){
	for(var i=0;i<gamestate.food.length;i++){
		if(Math.sqrt((x-gamestate.food[i].location.x)*(x-gamestate.food[i].location.x) + (y-gamestate.food[i].location.y)*(y-gamestate.food[i].location.y)) <= gamestate.food[i].size/4)
			return i;
	}
	return -1;
}
