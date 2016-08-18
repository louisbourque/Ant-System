//postMessage('{"act":"debug","data":"message"}');
function Point(x,y){
	this.x = x;
	this.y = y;
}
function Ant(id,x,y){
	this.id = id;
	this.location = new Point(x,y);
	this.carrying_food = false;
	this.last_direction = 'none';
}
/**
This is the worker. It is used to perform all the CPU-intensive
processing, so the GUI will remain responsive.
**/
var config;
var this_ant;
var environment;
var step_data;

//this is the function that is called whenever the worker receives a message.
//based on the content of the message (event.data.act), do the appropriate action.
onmessage = function(event) {
	var message = JSON.parse(event.data);
	switch(message.act){
		case 'init':
			config = message.data.config;
			this_ant = message.data.ant;
			break;
		case 'tick':
			environment = message.data;
			step();
			break;
	}
}

function step(){
	step_data = new Object();
	step_data.dropped_pheromone = false;
	step_data.dropped_food = false;
	step_data.pickup_food = -1;
	//move the ant
	if(this_ant.carrying_food){
		//check if we are at home base
		if(Math.sqrt((config.grid_x/2-this_ant.location.x)*(config.grid_x/2-this_ant.location.x) + (config.grid_x/2-this_ant.location.y)*(config.grid_x/2-this_ant.location.y)) <= 1){
			this_ant.carrying_food = false;
			step_data.dropped_food = true;
		}
	}
	
	if(!this_ant.carrying_food && environment.food_here >= 0)
		pick_up();
	if(this_ant.carrying_food){
		drop_pheromone();
		move_to_nest();
	}else{
		switch(food_nearest()){
			case 'n':
				this_ant.location.x--;
				break;
			case 'e':
				this_ant.location.y++;
				break;
			case 's':
				this_ant.location.x++;
				break;
			case 'w':
				this_ant.location.y--;
				break;
			default:
				switch(pheromone_nearest()){
					case 'n':
						this_ant.location.x--;
						break;
					case 'e':
						this_ant.location.y++;
						break;
					case 's':
						this_ant.location.x++;
						break;
					case 'w':
						this_ant.location.y--;
						break;
					default:
						move_random();
				}
		}
	}
	
	//wrap around
	if(this_ant.location.x <= 1)
		this_ant.location.x = config.grid_x-1;
	else if(this_ant.location.x >= config.grid_x-1)
		this_ant.location.x = 1;
	if(this_ant.location.y <= 1)
		this_ant.location.y = config.grid_x-1;
	else if(this_ant.location.y >= config.grid_x-1)
		this_ant.location.y = 1;
	
	var message = new Object();
	message.act = "tock";
	message.data = new Object();
	message.data.ant = this_ant;
	message.data.step = step_data;
	postMessage(JSON.stringify(message));
}

function food_nearest(){
	var sort_array = new Array();
	var obj = new Object();
	obj.dir = 'n';
	obj.val = environment.food.n;
	sort_array.push(obj);
	var obj = new Object();
	obj.dir = 'e';
	obj.val = environment.food.e;
	sort_array.push(obj);
	var obj = new Object();
	obj.dir = 's';
	obj.val = environment.food.s;
	sort_array.push(obj);
	var obj = new Object();
	obj.dir = 'w';
	obj.val = environment.food.w;
	sort_array.push(obj);
	sort_array.sort( function (a,b) { return b.val-a.val });
	if(sort_array[0].val > 0)
		return sort_array[0].dir;
	return '';
}

function pheromone_nearest(){
	var sort_array = new Array();
	var obj = new Object();
	obj.dir = 'n';
	obj.val = environment.pheromone.n;
	sort_array.push(obj);
	var obj = new Object();
	obj.dir = 'e';
	obj.val = environment.pheromone.e;
	sort_array.push(obj);
	var obj = new Object();
	obj.dir = 's';
	obj.val = environment.pheromone.s;
	sort_array.push(obj);
	var obj = new Object();
	obj.dir = 'w';
	obj.val = environment.pheromone.w;
	sort_array.push(obj);
	sort_array.sort( function (a,b) { return b.val-a.val });
	if(sort_array[1].val > 0)
		return sort_array[1].dir;
	return '';
}

function move_random(){
	var r = Math.random();
	if(r > 0.5){
		switch(this_ant.last_direction){
		case 'n':
			this_ant.location.x--;
			return;
		case 'e':
			this_ant.location.y++;
			return;
		case 's':
			this_ant.location.x++;
			return;
		case 'w':
			this_ant.location.y--;
			return;
		}
	}
	var index = Math.ceil(Math.random()*4);
	switch(index){
		case 1:
			this_ant.location.x++;
			this_ant.last_direction = 's';
			break;
		case 2:
			this_ant.location.x--;
			this_ant.last_direction = 'n';
			break;
		case 3:
			this_ant.location.y++;
			this_ant.last_direction = 'e';
			break;
		default:
			this_ant.location.y--;
			this_ant.last_direction = 'w';
	}
}

function move_to_nest(){
	if(config.grid_x/2 > this_ant.location.x){ //West
		if(config.grid_x/2 > this_ant.location.y){ //North
			if(config.grid_x/2 - this_ant.location.x > config.grid_x/2 - this_ant.location.y)
				this_ant.location.x++;
			else
				this_ant.location.y++;
		}else{ //South
			if(config.grid_x/2 - this_ant.location.x > this_ant.location.y - config.grid_x/2)
				this_ant.location.x++;
			else
				this_ant.location.y--;
		}
	}else{ //East
		if(config.grid_x/2 > this_ant.location.y){ //North
			if(this_ant.location.x - config.grid_x/2 > config.grid_x/2 - this_ant.location.y)
				this_ant.location.x--;
			else
				this_ant.location.y++;
		}else{ //South
			if(this_ant.location.x - config.grid_x/2> this_ant.location.y - config.grid_x/2)
				this_ant.location.x--;
			else
				this_ant.location.y--;
		}
	}
}

function pick_up(){
	step_data.pickup_food = environment.food_here;
	this_ant.carrying_food = true;
}

function drop_pheromone(){
	step_data.dropped_pheromone = true;
}
