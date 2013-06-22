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
  _offset: [0, 0],
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
  boundaries: undefined,
  adjustPoint: function(point) {
    var x = Math.round(this._offset[0] + this.zoom * point[0]),
        y = Math.round(this._offset[1] + this.zoom * point[1]);
    // FIXME: Move to paintlessBrush
    if ( ! this.boundaries) {
      this.boundaries = [x, y, x, y];
    } else {
      this.boundaries[0] = Math.min(this.boundaries[0], x);
      this.boundaries[1] = Math.min(this.boundaries[1], y);
      this.boundaries[2] = Math.max(this.boundaries[2], x);
      this.boundaries[3] = Math.max(this.boundaries[3], y);
    }
    return [x, y];
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
    this.boundaries = undefined;
    brush._offset = [
      window.innerWidth / 2,
      window.innerHeight / 2
    ];
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

pl.color = {
  vary: function(color, intensity) {
    intensity = intensity || 10;
    var m = color.match(/^#([0-9a-f]{6})$/i)[1];
    var parsed = [
      parseInt(m.substr(0,2),16),
      parseInt(m.substr(2,2),16),
      parseInt(m.substr(4,2),16)
    ];
    var processed = parsed.map(
      function(channel) {
        var raw = channel +
              (pl.util.random(intensity * 2) -
               intensity),
            normalized = Math.min(255, Math.max(0, raw));
        return normalized;
      });
    return 'rgb(' + processed[0] + ', ' +
      processed[1] + ', ' +
      processed[2] + ')';
  }
};

// -----------------------------------------------------------------------------
pl.PaintlessBrush = function() {};
pl.PaintlessBrush.prototype = new pl.Brush();
pl.PaintlessBrush.prototype.constructor = pl.RaphaelBrush;

pl.PaintlessBrush.prototype.line = pl.PaintlessBrush.prototype.move;
pl.PaintlessBrush.prototype.circe = function(radius) {
  var newPoint = ([
    this.point[0] - radius,
    this.point[1] - radius]);
  var newPoint2 = ([
    this.point[0] + radius,
    this.point[1] + radius]);
  this.adjustPoint(newPoint);
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

pl.RaphaelBrush.prototype.reset = function() {
  this.paper.clear();
  this.point = [0, 0];
};

pl.RaphaelBrush.prototype.line = function(length, direction, style) {
  var adjOldPoint = this.adjustPoint(this.point);
  this.move(length, direction);
  var adjPoint = this.adjustPoint(this.point);
  var pathString = (
    'M' + adjOldPoint[0] +
      ' ' + adjOldPoint[1] +
      'L' + adjPoint[0] +
      ' ' + adjPoint[1]
  );
  this.paper.path(pathString)
    .attr(style);
};

pl.RaphaelBrush.prototype.rect = function(width, height, style) {
  var adjOldPoint = this.adjustPoint(this.point),
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
  var adjPoint = this.adjustPoint(this.point);
  var x  = Math.min(adjOldPoint[0], adjPoint[0]),
      y  = Math.min(adjOldPoint[1], adjPoint[1]),
      x2 = Math.max(adjOldPoint[0], adjPoint[0]),
      y2 = Math.max(adjOldPoint[1], adjPoint[1]);

  this.paper.rect(x, y, x2 - x, y2 - y)
    .attr(style);
};

pl.RaphaelBrush.prototype.circle = function(radius, style) {
  var adjPoint = this.adjustPoint(this.point);
  this.paper.circle(adjPoint[0], adjPoint[1], radius)
    .attr(style);
};

// -----------------------------------------------------------------------------

pl.Generator = function() { };

pl.Generator.prototype = {
  constructor: pl.Generator,
  depth: 4,
  sequenceLength: 20,
  patternRepeat: 4,
  probablilityTable: {
    line: 2,
    move: 3,
    rect: 2,
    circle: 1,
    rotate: 2
  },
  maybeRange: function(thing) {
    if (thing instanceof Array) {
      return pl.util.random(thing);
    } else {
      return thing;
    }
  },
  maybeCall: function(thing) {
    return (thing instanceof Function) ?
      thing() :
      thing;
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
    for (var i = 0, iLimit = this.depth; i < iLimit; i++) {
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
        { 'stroke-width': random(5) }];
    } else if (action === 'rect') {
      var smallStyle = random(2);
      return [
        'rect',
        (smallStyle ? random(-10, 10) : random(-60, 60)),
        (smallStyle ? random(-10, 10) : random(-60, 60)),
        { 'stroke-width': 2,
          'fill-opacity': smallStyle ? 1 : Math.random() / 10,
        'fill': pl.color.vary(
          random(['#0000FF',
                  '#000000',
                  '#FF0000']),
          100) } ];
    } else if (action === 'rotate') {
      return ['rotate', !! random(2)];
    } else if (action === 'circle') {
      return [
        'circle',
        random(10),
        { 'stroke-width': 2,
          'fill-opacity': Math.random(),
          'fill': pl.color.vary(
            random(['#0000FF',
                    '#000000',
                    '#FF0000'],
                   100)
          ) } ]; }}};

// -----------------------------------------------------------------------------
var generator,
    sequences,
    brush;

function init() {
  generator = new pl.Generator();
  brush = new pl.RaphaelBrush();
  brush.init();
}

function scenario1() {
  init();
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

init();

setInterval(
  function() {
    if (brush) brush.reset();
    sequences = generator.make();
    brush.drawSequence(sequences);
  },
  1000);
