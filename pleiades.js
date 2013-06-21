var Brush = function() { };

Brush.prototype = {
  constructor: Brush,
  position: null,
  rectangle: function(width, height) { },
  line: function(length, direction) { }
};

// -----------------------------------------------------------------------------

var Generator = function(brush) {
  this.brush = brush;
};

Generator.prototype = {
  constructor: Generator
};
