"use strict";

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");
var CANVAS_DIMS = [ 500, 500 ];

var MIN_SELF_GROW_FACTOR = 0.5;
var SELF_GROW_FACTOR = 0.05;
var ADJACENT_GROW_FACTOR = 0.25;
var MAX_GROW_FACTOR = 0.1;
var DIMS = [ 100, 100 ];

var RABBIT_FULL_LIFE = 1.0;
var RABBIT_MOVE_INTERVAL = 0.1;
var RABBIT_LIFE_INTERVAL = 0.75;
var RABBIT_EAT_INTERVAL = 0.1;
var MIN_RABBIT_EAT_INTERVAL = 0.05;
var INIT_NUM_RABBITS = 100;

var TILE_DIMS = [CANVAS_DIMS[0] / DIMS[0], CANVAS_DIMS[1] / DIMS[1]];

function getAdjacentGround(x, y) {
  var adjacentGround = [];

  var prevx = (x > 0) ? x - 1 : x;
  var prevy = (y > 0) ? y - 1 : y;
  var nextx = (x < DIMS[0]-1) ? x + 1 : x;
  var nexty = (y < DIMS[1]-1) ? y + 1 : y;
  for (var adjy=prevy; adjy<=nexty; adjy++) {
    for (var adjx=prevx; adjx<=nextx; adjx++) {
      if (adjx != x || adjy != y) {
        adjacentGround.push({ x: adjx, y: adjy, ground: groundArray[adjy][adjx]});
      }
    }
  }
  return adjacentGround;
}

function Ground(life) {
  this.life = life;
}

Ground.prototype = {
  cycle: function(x, y, timeInterval) {
    var adjacentGround = getAdjacentGround(x, y);
    var adjacentLife = adjacentGround.reduce(function(total, adj) {
      return total + adj.ground.life;
    }, 0);
    var growth = ADJACENT_GROW_FACTOR * adjacentLife * timeInterval;
    growth += SELF_GROW_FACTOR * Math.max(MIN_SELF_GROW_FACTOR, this.life) * timeInterval;
    growth = Math.min(growth, MAX_GROW_FACTOR * timeInterval);

    this.life += growth;
    if (this.life >= 1.0) {
      this.life = 1.0;
    }
  }
};

var groundArray = []
for (var i = 0; i<DIMS[1]; i++) {
  var groundRow = [];
  for (var j=0; j<DIMS[0]; j++) {
    var ground = new Ground(Math.random()*1.0);
    groundRow.push(ground);
  }
  groundArray.push(groundRow);
}

function Rabbit(x, y, life) {
  this.life = RABBIT_FULL_LIFE;
  this.lastMoved = 0.0;
  this.x = x;
  this.y = y;
}

var rabbitArray = [];
for (var i = 0; i<DIMS[1]; i++) {
  var rabbitRow = [];
  for (var j=0; j<DIMS[0]; j++) {
    rabbitRow.push(null);
  }
  rabbitArray.push(rabbitRow);
}

function isRabbitAtLocation(x, y) {
  if (rabbitArray[y][x])
    return true;
}

function isRabbitAdjacent(x, y, minLife) {
  var adjacentGround = getAdjacentGround(x, y);
  for (var i=0; i<adjacentGround.length; i++) {
    if (isRabbitAtLocation(adjacentGround[i].x, adjacentGround[i].y)) {
      return true;
    }
  }

  return false;
}

function findAdjacentBirthingSpot(x, y) {
  var potentialGround = getAdjacentGround(x, y);
  potentialGround = potentialGround.reduce(
    function(noRabbitGround, adj) {
      if (!isRabbitAtLocation(adj.x, adj.y)) {
        noRabbitGround.push(adj);
      }
      return noRabbitGround;
    }, []);

  if (potentialGround.length > 0) {
    var randIndex = parseInt(potentialGround.length*Math.random());
    if (randIndex >= potentialGround.length) {
      randIndex=(potentialGround.length - 1);
    }

    return {x: potentialGround[randIndex].x, y: potentialGround[randIndex].y};
  }

  return null;
}

Rabbit.prototype = {
  cycle: function(timeInterval) {
    this.lastMoved += timeInterval;
    this.life -= (RABBIT_LIFE_INTERVAL * timeInterval);
    if (this.life <= 0.0) {
      return;
    }

    if (this.lastMoved > RABBIT_MOVE_INTERVAL) {
      this.lastMoved = 0.0;
      var currentGround = groundArray[this.y][this.x];
      if (this.life > 0.9) {
        // try to find an adjacent rabbit to breed with
        if (isRabbitAdjacent(this.x, this.y)) {
          var spot = findAdjacentBirthingSpot(this.x, this.y);
          if (spot) {
            rabbitArray[spot.y][spot.x] = new Rabbit(spot.x, spot.y, 0.5);
          }
        }
      }
      else if (currentGround.life > MIN_RABBIT_EAT_INTERVAL) {
        var extractedLife = Math.min(currentGround.life, RABBIT_EAT_INTERVAL);
        // FIXME: at end extract more life than needed
        this.life += extractedLife;
        currentGround.life -= extractedLife;
        if (currentGround.life <= 0)
          currentGround.life = 0;
      } else {
        var adjacentGround = getAdjacentGround(this.x, this.y);
        adjacentGround = adjacentGround.reduce(function(adj, cur) {
          if (!isRabbitAtLocation(cur.x, cur.y)) {
            adj.push(cur);
          }
          return adj;
        }, []);
        if (adjacentGround.length > 0) {
          var maxLifeTile = adjacentGround.reduce(function(max, cur) {
            if (max.ground.life < cur.ground.life) {
              return cur;
            }
            return max;
          });
          var rabbit = this;
          rabbitArray[this.y][this.x] = undefined;
          rabbitArray[maxLifeTile.y][maxLifeTile.x] = rabbit;
          rabbit.x = maxLifeTile.x;
          rabbit.y = maxLifeTile.y;
        }
      }
    }
  }
}

for (var i=0; i<INIT_NUM_RABBITS; i++) {
  var foundLocation = false;
  while (!foundLocation) {
    var rabbitLocation = { x: parseInt(Math.random() * DIMS[0]),
                           y: parseInt(Math.random() * DIMS[1]) }
    if (!isRabbitAtLocation(rabbitLocation.x, rabbitLocation.y)) {
      rabbitArray[rabbitLocation.y][rabbitLocation.x] = new Rabbit(
        rabbitLocation.x, rabbitLocation.y, 1.0);
      foundLocation = true;
    }
  }
}

var prev = null;
function step(timestamp) {
  if (!prev)
    prev = timestamp;
  var timeInterval = (timestamp - prev) / 1000.0;
  prev = timestamp;

  var y = 0;
  groundArray.forEach(function(groundRow) {
    var x = 0;
    groundRow.forEach(function(ground) {
      ground.cycle(x, y, timeInterval);
      ctx.fillStyle = "rgb(0," + parseInt(255.0 * ground.life) + ",0)";
      ctx.fillRect((x*TILE_DIMS[0]), (y*TILE_DIMS[1]), TILE_DIMS[0], TILE_DIMS[1]);

      x++;
    });
    y++;
  });

  var rabbits = [];
  rabbitArray.forEach(function(rabbitRow) {
    rabbitRow.forEach(function(rabbit) {
      if (rabbit) {
        rabbits.push(rabbit);
        rabbit.cycle(timeInterval);
        if (rabbit.life < 0) {
          rabbitArray[rabbit.y][rabbit.x] = undefined;
        }
        ctx.fillStyle = "rgb(" + parseInt(255.0 * rabbit.life) + ", 0, 0)";
        ctx.fillRect(rabbit.x*TILE_DIMS[0], rabbit.y*TILE_DIMS[1], TILE_DIMS[0], TILE_DIMS[1]);
      }
    });
  });

  window.requestAnimationFrame(step);
}

window.requestAnimationFrame(step);
