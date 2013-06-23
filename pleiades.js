/*global Raphael*/
var pl = {};

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

  rotateArray: function(array, reverse) {
    array = array.slice(0);
    if (reverse) {
      array.push(array.shift());
    } else {
      array.unshift(array.pop());
    }
    return array;
  },

  extend: function(original) {
    Array.prototype.slice
      .call(arguments, 1)
      .forEach(function(mixin) {
      Object.keys(mixin).forEach(function(key) {
        original[key] = mixin[key];
      });
    });
    return original;
  }
};

// -----------------------------------------------------------------------------

pl.Brush = function() { };

pl.Brush.prototype = {
  constructor: pl.Brush,
  point: Object.freeze([0, 0]),
  _offset: Object.freeze([0, 0]),
  zoom: 3,
  directions: Object.freeze(['up', 'right', 'down', 'left']),

  directionTranslate: function(point, length, direction) {
    var table = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ];
    var index = this.directions.indexOf(direction);
    point = [
      point[0] + table[index][0] * length,
      point[1] + table[index][1] * length
    ];
    return point;
  },

  adjustPoint: function(point) {
    var x = Math.round(this._offset[0] + this.zoom * point[0]),
        y = Math.round(this._offset[1] + this.zoom * point[1]);
    return [x, y];
  },

  line: function(length, direction) {},
  // Could add a hor, vert format
  move: function(length, direction) {
    this.point = this.directionTranslate(
      this.point, length, direction);
  },

  rotate: function(reverse) {
    this.directions = pl.util.rotateArray(this.directions, reverse);
  },

  drawSequence: function(sequence) {
    var self = this,
        windowCenter = [
      window.innerWidth / 2,
      window.innerHeight / 2 ],
        shadowBrush = new pl.ShadowBrush(),
        imageCenter;

    function shadowWalker(pattern) {
      pattern.forEach(
        function(stamp) {
          if (typeof stamp[0] === 'number') {
            for (var i = 0; i < stamp[0]; i++) {
              shadowWalker(stamp[1]);
            }
          } else {
            shadowBrush[stamp[0]]
              .apply(
                shadowBrush,
                stamp.slice(1)
              ); }}); }
    function walker(pattern) {
      pattern.forEach(
        function(stamp) {
          if (typeof stamp[0] === 'number') {
            for (var i = 0; i < stamp[0]; i++) {
              walker(stamp[1]);
            }
          } else {
            self[stamp[0]]
              .apply(
                self,
                stamp.slice(1)
              ); }}); }

    this.reset();
    this.boundaries = undefined;
    shadowWalker(sequence);
    imageCenter = [
      (shadowBrush.boundaries[0] +
       shadowBrush.boundaries[2]) / 2,
      (shadowBrush.boundaries[1] +
       shadowBrush.boundaries[3]) / 2
    ];
    this._offset = [
      windowCenter[0] - imageCenter[0],
      windowCenter[1] - imageCenter[1]];
    walker(sequence);
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

pl.ShadowBrush = function() {};

pl.ShadowBrush.prototype = pl.util.extend(
  new pl.Brush(),
  {constructor: pl.ShadowBrush,
   boundaries: undefined,

   adjustPoint: function(point) {
     var x = Math.round(this._offset[0] + this.zoom * point[0]),
         y = Math.round(this._offset[1] + this.zoom * point[1]);
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

   circle: function(radius) {
     var newPoint = ([
       this.point[0] - radius,
       this.point[1] - radius]);
     var newPoint2 = ([
       this.point[0] + radius,
       this.point[1] + radius]);
     this.adjustPoint(newPoint);
     this.adjustPoint(newPoint2);
   },

   rect: function(width, height, style) {
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
   }
  });

pl.ShadowBrush.prototype.line = pl.ShadowBrush.prototype.move;

// -----------------------------------------------------------------------------

pl.RaphaelBrush = function() {};

pl.RaphaelBrush.prototype = pl.util.extend(
  new pl.Brush(),
  {constructor: pl.RaphaelBrush,

   init: function() {
     this.paper = new Raphael(
       0, 0,
       window.innerWidth,
       window.innerHeight
     );
   },

   reset: function() {
     this.paper.clear();
     this.paper.setSize(
       window.innerWidth,
       window.innerHeight
     );
     this.point = [0, 0];
   },

   line: function(length, direction, style) {
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
   },

   rect: function(width, height, style) {
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
   },

   circle: function(radius, style) {
     var adjPoint = this.adjustPoint(this.point);
     this.paper.circle(adjPoint[0], adjPoint[1], radius)
       .attr(style);
   }
  }
);

// -----------------------------------------------------------------------------

pl.Generator = function() { };

pl.Generator.prototype = {
  constructor: pl.Generator,
  depth: 5,
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
    }},

  maybeCall: function(thing) {
    return (thing instanceof Function) ?
      thing() :
      thing; },

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
    var sequences = [],
        random = pl.util.random.bind(pl.util);
    for (var i = 0, iLimit = this.depth; i < iLimit; i++) {
      var currentSequence = [];
      for (var j = 0, jLimit = this.sequenceLength; j < jLimit; j++) {
        currentSequence.push(this.makeMove());

      }
      if (sequences.length) {
        currentSequence.splice(
          pl.util.random(sequences.length),
          0, [ 2 + random(2) * 2, sequences[0] ]);
      }
      sequences.unshift(currentSequence);
    }
    sequences.unshift([[4, sequences[1]]]);
    return sequences[0];
  },

  makeMove: function() {
    var action = this.chooseAction(),
        random = pl.util.random.bind(pl.util);
    if (action === 'line' || action === 'move') {
      return [
        action,
        random(5, 10),
        random('direction'),
        { 'stroke-width': random(5) }];
    } else if (action === 'rect') {
      var smallStyle = random(2);
      return [
        'rect',
        (smallStyle ? random(-10, 10) : random(-60, 60)),
        (smallStyle ? random(-10, 10) : random(-60, 60)),
        { 'stroke-width': smallStyle ? 2 : random(3),
          'stroke-opacity': smallStyle ? 1 : Math.random() * 0.5 + 0.5,
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
          ) } ]; }
  }
};

// -----------------------------------------------------------------------------

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    function( callback ){
      window.setTimeout(callback, 1000 / 60);
    };
})();

// -----------------------------------------------------------------------------

var generator = new pl.Generator(),
    sequences,
    brush = new pl.RaphaelBrush();

brush.init();

var zoomLevel = 0,
    zoomSpeed = 5;

function zoom() {
  zoomLevel++;
  window.requestAnimFrame(zoom);
  brush.paper.setViewBox(
    zoomLevel * zoomSpeed,
    zoomLevel * zoomSpeed,
    window.innerWidth - zoomLevel * 2 * zoomSpeed,
    window.innerHeight - zoomLevel * 2 * zoomSpeed,
    true
  );
}

function refresh() {
  sequences = generator.make();
  zoomLevel = 0;
  brush.drawSequence(sequences);
  setTimeout(refresh, 2000);
}

refresh();
// Uncomment on a fast machine
// zoom();
