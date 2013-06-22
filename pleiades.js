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
  }
};

// -----------------------------------------------------------------------------

pl.Brush = function() { };

pl.Brush.prototype = {
  constructor: pl.Brush,
  point: [100, 100],
  zoom: 3,
  rectangle: function(width, height) {},
  line: function(length, direction) {},
  // Could add a hor, vert format
  move: function(length, direction) {
    if (direction === 'left') {
      this.point[0] = this.point[0] - length;
    } else if (direction === 'right') {
      this.point[0] = this.point[0] + length;
    } else if (direction === 'up') {
      this.point[1] = this.point[1] + length;
    } else if (direction === 'down') {
      this.point[1] = this.point[1] - length;
    } else {
      throw new Error('Unknown direction: ' + direction);
    }
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
                pl.brush,
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

pl.RaphaelBrush.prototype.line = function(length, direction) {
  var oldPoint = this.point.slice(0);
  this.move(length, direction);
  var pathString = 'M' + this.zoom * oldPoint[0] + ' ' +
        this.zoom * oldPoint[1] +
        'L' + this.zoom * this.point[0] + ' ' +
        this.zoom * this.point[1],
      path = this.paper.path(pathString);
  path.attr({
    'stroke-dasharray': "- ",
    'stroke-width': 2
  });
};


// -----------------------------------------------------------------------------

pl.Generator = function(brush) {
  this.brush = brush;
};

pl.Generator.prototype = {
  constructor: pl.Generator,
  maxSequences: 5,
  sequenceLength: 5,
  patternRepeat: 4,
  probablilityTable: {
    line: 1, move: 1
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
    var action = this.chooseAction();
    if (action === 'line' || action === 'move') {
      return [
        action,
        pl.util.random(vMin, vMax),
        pl.util.random('direction')
      ]; }}};

// -----------------------------------------------------------------------------

var sequences = (new pl.Generator())
      .make();
pl.brush = new pl.RaphaelBrush();
pl.brush.init();
pl.brush.drawSequence(sequences);
