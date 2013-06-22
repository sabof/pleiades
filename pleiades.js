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
  }
};

// -----------------------------------------------------------------------------

pl.Pleiades = function() { };

pl.Pleiades.prototype = {
  constructor: pl.Pleiades,
  cycle: function() {
    function walker(pattern) {
      pattern.forEach(
        function(stamp) {
          if (true) {
            pl.brush(stamp);
          } else {
            walker(stamp);
          }
        }); }
    var pattern = pl.generator.make();
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

pl.generatorParts = {};

pl.generatorParts.makeMove1 = function(/* optional */ vMin, vMax) {
  vMin = vMin || 5;
  vMax = vMax || 10;
  var chance =  pl.util.random(6),
      result;
  if (true || chance === 0) {
    pl.brush.line(
      pl.util.random(vMin, vMax),
      pl.util.random('direction')
    ); }
};

// -----------------------------------------------------------------------------

pl.Generator = function(brush) {
  this.brush = brush;
};

pl.Generator.prototype = {
  constructor: pl.Generator,
  makeSequence: function() {
    throw new Error('Not implemented');
  },
  makeMove: function() {
    throw new Error('Not implemented');
  }
};

// -----------------------------------------------------------------------------

pl.brush = new pl.RaphaelBrush();
pl.brush.init();
pl.brush.line(10, 'left');
