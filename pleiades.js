var pl = {};

// -----------------------------------------------------------------------------

pl.Utils = {
  random: function(min, max) {
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

};

// -----------------------------------------------------------------------------

pl.Brush = function() { };

pl.Brush.prototype = {
  constructor: pl.Brush,
  position: null,
  rectangle: function(width, height) { },
  line: function(length, direction) { }
};

// -----------------------------------------------------------------------------

pl.generatorParts = {};

pl.generatorParts.makeMove1 = function(/* optional */ vMin, vMax) {
  vMin = vMin || 5;
  vMax = vMax || 10;
};

// -----------------------------------------------------------------------------

pl.Generator = function(brush) {
  this.brush = brush;
};

pl.Generator.prototype = {
  constructor: pl.Generator,
  makeSequence: function(numberOfMoves) {

  },
  makeMove: function() { throw new Error('Not implemented'); }

};
