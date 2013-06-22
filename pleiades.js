/*global Raphael*/
var pl = {};

// Add skeleton(?)

pl.Skeleton = function() { };

pl.Skeleton.prototype = {
  constructor: pl.Skeleton,
  brush: null,
  generator: null
};

// -----------------------------------------------------------------------------

pl.util = {
  // Assume it's just max/array with one argument.
  // Inclusive, exclusive
  random: function(min, max) {
    if (typeof min === 'object' &&
        min.length !== undefined) {
      return min[this.random(min.length)];
    }
    if (min === 'direction') {
      return this.random(['up', 'down', 'right', 'left']);
    }
    if (min === undefined &&
        max === undefined) {
      return Math.random();
    }
    if (min !== undefined &&
        max === undefined) {
      max = min;
      min = 0;
    }
    return (
      Math.floor(
        Math.random() *
          (max - min)) +
        min);
  },
  rotate: function(array, reverse) {
    if (reverse) {
      array.push(array.shift());
    } else {
      array.unshift(array.pop());
    }
    return array;
  }
};

// -----------------------------------------------------------------------------

pl.Brush = function() { };

pl.Brush.prototype = {
  constructor: pl.Brush,
  point: [100, 100],
  offset: [0, 0],
  zoom: 2,
  directions: ['up', 'right', 'down', 'left'],
  directionTranslate: function(point, length, direction) {
    var table = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ];
    var index = this.directions.indexOf(direction);
    point[0] += table[index][0] * length;
    point[1] += table[index][1] * length;
    return point;
  },
  line: function(length, direction) {},
  // Could add a hor, vert format
  move: function(length, direction) {
    this.point = this.directionTranslate(
      this.point, length, direction);
  },
  rotate: function(reverse) {
    this.directions = pl.util.rotate(this.directions, reverse);
  },
  drawSequence: function(sequence) {
    var self = this;
    function walker(pattern) {
      pattern.forEach(
        function(stamp) {
          if (typeof stamp[0] === 'number') {
            for (var i = 0; i < stamp[0]; i++) {
              walker(stamp[1]);
            }
          } else {
            // console.log(stamp[0]);
            // console.log(self[stamp[0]]);
            self[stamp[0]]
              .apply(
                self,
                stamp.slice(1)
              ); }}); }
    walker(sequence[0]);
  },
  init: function() {}
};

// -----------------------------------------------------------------------------

pl.RaphaelBrush = function() {};

// FIXME: Convert to extend
pl.RaphaelBrush.prototype = new pl.Brush();
pl.RaphaelBrush.prototype.constructor = pl.RaphaelBrush;

pl.RaphaelBrush.prototype.init = function() {
  this.paper = new Raphael(
    0, 0,
    window.innerWidth,
    window.innerHeight
  );
};

pl.RaphaelBrush.prototype.line = function(length, direction, style) {
  var oldPoint = this.point.slice(0);
  this.move(length, direction);
  var pathString = (
    'M' + (this.offset[0] + this.zoom * oldPoint[0]) +
      ' ' + (this.offset[1] + this.zoom * oldPoint[1]) +
      'L' + (this.offset[0] + this.zoom * this.point[0]) +
      ' ' + (this.offset[1] + this.zoom * this.point[1])
  );
  this.paper.path(pathString)
    .attr(style);
};

pl.RaphaelBrush.prototype.rect = function(width, height, style) {
  var oldPoint = this.point.slice(0),
      verticalLength = Math.abs(width),
      verticalDirection = (height > 0) ? 'down' : 'up',
      horizontalLength = Math.abs(height),
      horizontalDirection = (width > 0) ? 'right' : 'left';

  this.point = this.directionTranslate(
    this.point,
    horizontalLength,
    horizontalDirection);
  this.point = this.directionTranslate(
    this.point,
    verticalLength,
    verticalDirection);

  var x  = this.offset[0] + this.zoom * Math.min(oldPoint[0], this.point[0]),
      y  = this.offset[1] + this.zoom * Math.min(oldPoint[1], this.point[1]),
      x2 = this.offset[0] + this.zoom * Math.max(oldPoint[0], this.point[0]),
      y2 = this.offset[1] + this.zoom * Math.max(oldPoint[1], this.point[1]);

  this.paper.rect(x, y, x2 - x, y2 - y)
    .attr(style);
};

// -----------------------------------------------------------------------------

pl.Generator = function() { };

pl.Generator.prototype = {
  constructor: pl.Generator,
  maxSequences: 3,
  sequenceLength: 20,
  patternRepeat: 4,
  probablilityTable: {
    line: 1,
    move: 1,
    rect: 1,
    rotate: 2
  },
  maybeRange: function(thing) {
    if (thing instanceof Array) {
      return pl.util.random(thing);
    } else {
      return thing;
    }
  },
  chooseAction: (function() {
    var wheel, wheelLength;
    return function () {
      if (wheel === undefined) {
        wheel = [];
        var pt = this.probablilityTable;
        Object.keys(pt)
          .forEach(function(key) {
            var weight = pt[key];
            for (var i = 0; i < weight; i++) {
              wheel.push(key);
            }});
        wheelLength = wheel.length;
      }
      return wheel[pl.util.random(wheelLength)];
    }; } ()),
  make: function() {
    var sequences = [];
    for (var i = 0, iLimit = this.maxSequences; i < iLimit; i++) {
      var currentSequence = [];
      for (var j = 0, jLimit = this.sequenceLength; j < jLimit; j++) {
        currentSequence.push(this.makeMove());

      }
      if (sequences.length) {
        currentSequence.splice(
          pl.util.random(sequences.length),
          0, [ this.patternRepeat, sequences[0] ]);
      }
      sequences.unshift(currentSequence);
    }
    return sequences;
  },
  makeMove: function(/* optional */ vMin, vMax) {
    vMin = vMin || 5;
    vMax = vMax || 10;
    var action = this.chooseAction(),
        random = pl.util.random.bind(pl.util);
    if (action === 'line' || action === 'move') {
      return [
        action,
        random(vMin, vMax),
        random('direction'),
        { 'stroke-width': 2 }];
    } else if (action === 'rect') {
      return [
        'rect',
        random(-30, 30),
        random(-30, 30),
        { 'stroke-width': 2,
          'fill-opacity': Math.random(),
          'fill': random(['blue', 'black', 'red']) }
      ];
    } else if (action === 'rotate') {
      return ['rotate', !! random(2)];
    }
  }};

// -----------------------------------------------------------------------------
var generator,
    sequences,
    brush;

function scenario1() {
  generator = new pl.Generator();
  sequences = generator.make();
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.offset = [
    window.innerWidth / 2,
    window.innerHeight / 2
  ];
  brush.drawSequence(sequences);
}

function test_simpleRepeater() {
  generator = new pl.Generator();
  sequences = [
    [['line', 30, 'up']],
    [['rect', 30, 30],
     ['line', 10, 'right']]
  ];
  sequences[0].push([4, sequences[1]]);
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawSequence(sequences);
}

function test_rotator() {
  generator = new pl.Generator();
  sequences = [
    [['line', 30, 'down'],
     ['line', 30, 'right']],
    [['rect', 30, 20],
     ['rect', 30, 20],
     ['line', 30, 'right'],
     ['rotate', true]
     ]
  ];
  sequences[0].push([2, sequences[1]]);
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawSequence(sequences);
}

function test_directionTranslate() {
  brush = new pl.RaphaelBrush();
  console.log(
    [brush.directionTranslate([0,0], 5, 'up'),
     brush.directionTranslate([0,0], 5, 'right'),
     brush.directionTranslate([0,0], 5, 'down'),
     brush.directionTranslate([0,0], 5, 'left')
    ]
  );
}

scenario1();
