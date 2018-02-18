/*
Stuff 2 do:
in line ~150, change inputs to get nearby pixels.
add something that keeps track of how long its been alive (i.e. number of iterations) DONE
make time alive into a factor for fitness DONE (1/3 of weight, size = 2/3)
add something that keeps track of enemy cell size in relation to your cell size DONE (was in original code)
add something that allows cells to "see" gridlines DONE (allowed them to see velocity and modified it if they were at borders instead of changing x direction)
add something that allows cells to see other cell's velocity DONE (they only "see" in snapshots, so this might be hard under normal circumstances)
*/

//bug: For some reason, Cells "disappear" when performing the "twitch" motion
function Player(genome) {
  this.x = Math.floor(Math.random() * WIDTH);
  this.y = Math.floor(Math.random() * HEIGHT);
  this.vx = 0;
  this.vy = 0;
  this.maxAlive = 0;
  this.curAlive = 0;

  this.brain = genome;
  this.brain.score = 0;

  this.area = MIN_AREA;
  this.visualarea = this.area;
  this.CurDetect_Radius; //flexible search radius.

  players.push(this);
}

Player.prototype = {
  /** Update the stats */
    update: function () {

    //if(this.area > MAX_AREA) this.area = MAX_AREA;
    if(this.area < MIN_AREA) this.area = MIN_AREA;

    var input = this.detect();
    var output = this.brain.activate(input);

    var moveangle = output[0] * 2 * PI;
    var movespeed = output[1] > 1 ? 1 : output[1] < 0 ? 0 : output[1];

    this.vx = movespeed * Math.cos(moveangle) * SPEED;
    this.vy = movespeed * Math.sin(moveangle) * SPEED;

    // Large blobs move slower
    this.vx *= Math.max(1 - (this.area / MAX_AREA), MIN_SPEED / SPEED);
    this.vy *= Math.max(1 - (this.area / MAX_AREA), MIN_SPEED / SPEED);


    //make border limits modify velocity rather than location
    this.vx = (this.vx + this.x) >= WIDTH ? WIDTH - this.x : (this.vx + this.x) <= 0 ? (0 - this.x) : this.vx;
    this.vy = (this.vy + this.y) >= HEIGHT ? HEIGHT - this.y : (this.vy + this.y) <= 0 ? (0 - this.y) : this.vy;

    this.x += this.vx;
    this.y += this.vy;

    // Limit position to width and height
    //this.x = this.x >= WIDTH ? this.x % WIDTH : this.x <= 0 ? this.x + WIDTH : this.x;
    //this.y = this.y >= HEIGHT ? this.y % HEIGHT : this.y <= 0 ? this.y + HEIGHT : this.y;

    //limit such that you don't teleport around borders -_-  <-----this isn't needed since velocity changes around borders to compensate
    this.x = this.x >= WIDTH ? WIDTH : this.x <= 0 ? 0: this.x;
    this.y = this.y >= HEIGHT ? HEIGHT : this.y <= 0 ? 0: this.y;

    //update size (decrease)
    this.area *= DECREASE_SIZE;

    //update max time spent alive
    this.curAlive++;
    this.maxAlive = this.maxAlive < this.curAlive ? this.curAlive : this.maxAlive;

    // Replace highest score to visualise
    this.brain.score = 10000 * ((.75 * (this.area/MAX_AREA))  + (.05 * (this.maxAlive/ITERATIONS)) + (.20 * (this.curAlive/ITERATIONS))); //set fitness to also include max time spent alive (but at lower weight)
    highestScore = this.brain.score > highestScore ? this.brain.score : highestScore;

    //highest mass for cell leaderboard
    highestMass = this.area > highestMass ? this.area : highestMass;
  },

  /** Restart from new position */
  restart: function(){
    this.x = Math.floor(Math.random() * WIDTH);
    this.y = Math.floor(Math.random() * HEIGHT);
    this.vx = 0;
    this.vy = 0;
    this.area = MIN_AREA;
    this.visualarea = this.area;
    this.curAlive = 0; //reset time spent alive
  },

  /** Display the player on the field */
  show: function(){
    this.visualarea = lerp(this.visualarea, this.area, 0.2);
    var radius = Math.sqrt(this.visualarea / PI);
    var color = activationColor(this.brain.score, highestScore);

    fill(color);
    ellipse(this.x, this.y, radius);
  },

  /** Visualies the detection of the brain */
  showDetection: function(detected){
    noFill();
    for(var object in detected){
      object = detected[object];

      if(object != undefined){
        stroke(object instanceof Player ? 'red' : 'lightgreen');
        line(this.x, this.y, object.x, object.y);
      }
    }

    var color = activationColor(this.brain.score, highestScore);
    stroke(color);
    ellipse(this.x, this.y, CurDetect_Radius * 2);
  },

  /* Checks if object can be eaten */
  eat: function(object){
    var dist = distance(this.x, this.y, object.x, object.y);

    var radius1 = Math.sqrt(this.area / PI);
    var radius2 = Math.sqrt(object.area / PI);
    if(dist < (radius1 + radius2) / 2 && this.area > object.area * RELATIVE_SIZE){
      this.area += object.area;
      object.restart();
      return true;
    }
    return false;
  },

  /** Detect other genomes around */
  detect: function(){
    // Detect nearest objects
    var nearestPlayers = [];
    var playerDistances = Array.apply(null, Array(PLAYER_DETECTION)).map(Number.prototype.valueOf, Infinity);

    for(var player in players){
      player = players[player];
      if(player == this || this.eat(player)) continue;

      var dist = distance(this.x, this.y, player.x, player.y);
      
      //modified detection radius that scales with player size down to the minimum DETECTION_RADIUS var
      var rad = Math.sqrt(this.visualarea / PI);
      CurDetect_Radius = rad > (DETECTION_RADIUS * .8) ? rad + (DETECTION_RADIUS * .2) : DETECTION_RADIUS;

      if (dist < CurDetect_Radius) {
        // Check if closer than any other object
        var maxNearestDistance = Math.max.apply(null, playerDistances);
        var index = playerDistances.indexOf(maxNearestDistance);

        if(dist < maxNearestDistance){
          playerDistances[index] = dist;
          nearestPlayers[index] = player;
        }
      }
    }

    // Detect nearest foods
    var nearestFoods = [];
    var foodDistances = Array.apply(null, Array(FOOD_DETECTION)).map(Number.prototype.valueOf, Infinity);

    for(var food in foods){
      food = foods[food];
      if(this.eat(food)) continue;

      var dist = distance(this.x, this.y, food.x, food.y);
      if (dist < CurDetect_Radius) {
        // Check if closer than any other object
        var maxNearestDistance = Math.max.apply(null, foodDistances);
        var index = foodDistances.indexOf(maxNearestDistance);

        if(dist < maxNearestDistance){
          foodDistances[index] = dist;
          nearestFoods[index] = food;
        }
      }
    }

    //increase the max area as necessary. It's a bit confusing to the machine, but ensures growth that never ends :)
    MAX_AREA = this.area > MAX_AREA ? this.area : MAX_AREA;

    // Create and normalize input
    var output = [this.area / MAX_AREA]; //your area vs. the max that has ever existed

    //check how long you've been alive
    output.push(this.curAlive / ITERATIONS);

      //output your x and y velocities
    output.push(this.vx / SPEED);
    output.push(this.vy / SPEED);

      //output your place on leaderboard
    output.push(this.area / highestMass);

    for(var i = 0; i < PLAYER_DETECTION; i++){
      var player = nearestPlayers[i];
      var dist = playerDistances[i];
       
      if(player == undefined){
        output = output.concat([0, 0, 0, 0, 0]);
      } else {
        output.push(angleToPoint(this.x, this.y, player.x, player.y) / (2 * PI)); //enemy angle
        output.push(dist / DETECTION_RADIUS); //enemy distance
        output.push(player.area / MAX_AREA); //enemy size
        output.push(player.vx / SPEED); //enemy xvelocity
        output.push(player.vy / SPEED); //enemy yvelocity
      }
    }

    for(var i = 0; i < FOOD_DETECTION; i++){
      var food = nearestFoods[i];
      var dist = foodDistances[i];

      if(food == undefined){
        output = output.concat([0, 0]);
      } else {
        output.push(angleToPoint(this.x, this.y, food.x, food.y) / (2 * PI)); //food angle
        output.push(dist / DETECTION_RADIUS); //food distance
      }
    }

    if(distance(mouseX, mouseY, this.x, this.y) < Math.sqrt(this.visualarea / PI)){
      var detected = nearestPlayers.concat(nearestFoods);
      this.showDetection(detected);
    }

    return output;
  },
};
