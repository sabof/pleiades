/*global Raphael, SeedRandom*/

// Project hosted at http://github.com/sabof/pleiades
// Version 0.1

var pl = {};

// -----------------------------------------------------------------------------

pl.util = {
  // Assume it's just max/array with one argument.
  // Inclusive, exclusive
  random: function(min, max) {
    if (min instanceof Array) {
      return min[this.random(min.length)];
    }
    if (typeof min === 'object') {
      var wheel = [];
      Object.keys(min)
        .forEach(function(key) {
          for (var i = 0; i < min[key]; i++) {
            wheel.push(key);
          }});
      return this.random(wheel); }
    if (min === 'color') {
      return pl.color.vary(
        this.random(
          max ||
            ['#0000FF',
             // '#00FF00',
             '#000000',
             '#FF0000']),
        50);
    }
    if (min === 'direction') {
      return this.random(['up', 'down', 'right', 'left']);
    }
    if (min === undefined &&
        max === undefined) {
      return SeedRandom.random();
    }
    if (min !== undefined &&
        max === undefined) {
      max = min;
      min = 0;
    }
    return (
      Math.floor(
        SeedRandom.random() *
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
        }); });
    return original;
  },

  ensureLength: function(string, length) {
    if (string.length > length) {
      return string.substr(0, length);
    }
    while (string.length < length) {
      string = '0' + string;
    }
    return string;
  },

  makeTicket: function() {
    return this.ensureLength(
      Math.floor(Math.random() * 10000000000)
        .toString(16)
        .toUpperCase(),
      4);
  },

  objectsEqual: function(a, b) {
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(a);
    return true;
  },

  rangesOverlap: function(rangeA, rangeB) {
    return ! (
      rangeB[1] <= rangeA[0] ||
        rangeA[1] <= rangeB[0]
    );
  },

  rectanglesOverlap: function(rectA, rectB) {
    return this.rangesOverlap(
      [rectA[0], rectA[0] + rectA[2]],
      [rectB[0], rectB[0] + rectB[2]]
    ) && this.rangesOverlap(
      [rectA[1], rectA[1] + rectA[3]],
      [rectB[1], rectB[1] + rectB[3]]
    );
  }
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
        var raw = channel + (pl.util.random(intensity * 2) - intensity),
            normalized = Math.min(255, Math.max(0, raw)),
            stringified = pl.util.ensureLength(normalized.toString(16), 2);
        return stringified;
      });
    return String.prototype.concat.apply('#', processed);
  }
};

// -----------------------------------------------------------------------------

pl.Brush = function(compass) {
  this.compass = compass || new pl.Compass();
  this.point = [0, 0];
  this._offset = [0, 0];
  this.directions = ['up', 'right', 'down', 'left'];
  this.zoom = 3;
};

pl.Brush.prototype = {
  constructor: pl.Brush,

  reset: function() {},

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

  unadjustPoint: function(point) {
    var x = Math.round((point[0] - this._offset[0]) / this.zoom),
        y = Math.round((point[1] - this._offset[1]) / this.zoom);
    return [x, y];
  },

  line: function(length, direction) {},
  // Could add a hor, vert format
  move: function(length, direction) {
    if ( this.directions.indexOf(direction) === -1)
    {
      throw new Error('Illegal direction: ' + direction);
    }

    this.point = this.directionTranslate(
      this.point, length, direction);
  },

  rotate: function(reverse) {
    this.directions = pl.util.rotateArray(this.directions, reverse);
  },

  drawComposition: function(composition) {
    var self = this,
        windowCenter = [
          window.innerWidth / 2,
          window.innerHeight / 2 ],
        imageCenter;

    function walker(composition) {
      composition.forEach(
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
    this.compass.measure(composition);
    var outerBoundaries = this.compass.getOuterBoundaries();
    imageCenter = [
      (outerBoundaries[0] + outerBoundaries[2]) / 2,
      (outerBoundaries[1] + outerBoundaries[3]) / 2
    ];
    // try {

    // } catch (error) {
    //   if ( ! this.compass.outerBoundaries[0]) {
    //     console.log('blank image');
    //   }
    //   imageCenter = windowCenter;
    // }
    this._offset = [
      windowCenter[0] - imageCenter[0],
      windowCenter[1] - imageCenter[1]];
    walker(composition);
  },

  init: function() {},
  destroy: function() {}
};

// -----------------------------------------------------------------------------

pl.Compass = function() {
  this._objectBoundaries = [];
  this._outerBoundaries = undefined;
};

pl.Compass.prototype = pl.util.extend(
  new pl.Brush(),
  { constructor: pl.Compass,
    reset: function() {
      this.point = [0, 0];
      this._outerBoundaries = undefined;
      this._objectBoundaries = [];
    },

    trackPoint: function(point) {
      var x = point[0],
          y = point[1];
      if (point.length !== 2) {
        throw new Error(
          'Wrong number of coordinates: ' +
            point.length);
      }
      if ( ! point.every(function(num) {
        return typeof num === 'number' && ! isNaN(num); }))
      { throw new Error(
        'Some point members are not numbers: ' +
          JSON.stringify(point));
      }

      if ( ! this._outerBoundaries) {
        this._outerBoundaries = [x, y, x, y];
      } else {
        this._outerBoundaries[0] = Math.min(this._outerBoundaries[0], x);
        this._outerBoundaries[1] = Math.min(this._outerBoundaries[1], y);
        this._outerBoundaries[2] = Math.max(this._outerBoundaries[2], x);
        this._outerBoundaries[3] = Math.max(this._outerBoundaries[3], y);
      }
      return [x, y];
    },

    // [left, top, width, height]
    trackRect: function(coordinates) {
      if (coordinates.length !== 4) {
        throw new Error(
          'Wrong number of coordinates: ' +
            coordinates.length);
      }
      if ( ! coordinates.every(function(num) {
        return typeof num === 'number' && ! isNaN(num); }))
      { throw new Error(
        'Some coordinates are not numbers: ' +
          JSON.stringify(coordinates));
      }
      this._objectBoundaries.push(coordinates);
      this.trackPoint(
        [coordinates[0],
         coordinates[1]]);
      this.trackPoint(
        [coordinates[0] + coordinates[2],
         coordinates[1] + coordinates[3]]);
    },

    circle: function(radius) {
      var rect = [
        this.point[0] - radius,
        this.point[1] - radius,
        radius * 2,
        radius * 2
      ];
      this.trackRect(rect);
    },

    rect: function(width, height, style) {
      var rect = [this.point[0], this.point[0], width, height],
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
      this.trackRect(rect);

      // this.trackRect(this.point);
    },

    line: function(length, direction) {
      this.trackPoint(this.point);
      this.move(length, direction);
      this.trackPoint(this.point);
    },

    _walker: function(pattern) {
      // console.log(pattern);
      var self = this;
      pattern.forEach(
        function(stamp) {
          if (typeof stamp[0] === 'number') {
            for (var i = 0; i < stamp[0]; i++) {
              self._walker(stamp[1]);
            }
          } else {
            if ( ! self[stamp[0]]) {
              console.log(stamp);
              console.log(self[stamp]);
            }
            self[stamp[0]].apply(self, stamp.slice(1));
          }}); },

    measure: function(composition) {
      this.reset();
      this._walker(composition);
    },

    getOuterBoundaries: function(adjusted) {
      if ( ! this._outerBoundaries) {
        throw new Error('Boundaries not calculated');
      }
      if (adjusted) {
        var ob = this._outerBoundaries,
            adjPoints = [
              this._outerBoundaries.slice(0, 2),
              [this._outerBoundaries[0] + this._outerBoundaries[2],
               this._outerBoundaries[1] + this._outerBoundaries[3]]
            ].map(this.adjustPoint, this);
        return adjPoints[0].concat(
          [adjPoints[1][0] - adjPoints[0][0],
           adjPoints[1][1] - adjPoints[0][1]]
        );
      }
      return this._outerBoundaries;
    }
  });

// -----------------------------------------------------------------------------

pl.RaphaelBrush = function() {};

pl.RaphaelBrush.prototype = pl.util.extend(
  new pl.Brush(),
  { constructor: pl.RaphaelBrush,

    init: function() {
      this.paper = new Raphael(
        0, 0,
        window.innerWidth,
        window.innerHeight
      );
    },

    destroy: function() {
      var canvas = this.paper.canvas;
      canvas.parentNode.removeChild(canvas);
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

pl.Generator = function() {
  this.depth = 3;
  this.sequencesLength = 17;
};

pl.Generator.prototype = {
  constructor: pl.Generator,

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

  make: function() {
    var sequences = [],
        random = pl.util.random.bind(pl.util);
    for (var i = 0, iL = this.depth; i < iL; i++) {
      var currentSequence = [];
      for (var j = 0, jL = this.sequencesLength; j < jL; j++) {
        currentSequence.push(pl.stampFactory.make());
      }
      if (sequences.length) {
        currentSequence.splice(
          pl.util.random(sequences.length),
          0, [ 2 + random(2) * 2, sequences[0] ]);
      }
      sequences.unshift(currentSequence);
    }
    return [[4, sequences[0]]];
  }
};

// -----------------------------------------------------------------------------

pl.stampFactory = {
  random: pl.util.random.bind(pl.util),

  makeMake: function() {
    var self = this,
        wheel = [],
        wheelLength;
    Object.keys(this.recipes)
      .forEach(function(recipeKey) {
        var probability = self.recipes[recipeKey]
            .probability || 1;
        for (var i = 0; i < probability; i++) {
          wheel.push(self.recipes[recipeKey]);
        }
      });
    wheelLength = wheel.length;
    this.make = function(option) {
      var object = option ? this.recipes[option] :
          wheel[this.random(wheelLength)];
      var result = object.func.call(this);
      return result;
    };
  },

  make: function(/*optional*/ option) {
    this.makeMake();
    return this.make(option);
  },

  getOptions: function() {
    return Object.keys(this.recipes);
  },

  recipes: {
    rotate: {
      probability: 20,
      maxLength: 0,
      func: function() {
        var random = this.random;
        return ['rotate', !! random(2)];
      }
    },

    move: {
      probability: 30,
      maxLength: 0,
      func: function() {
        var random = this.random;
        return [
          'move',
          random(5, 10),
          random('direction')
        ]; }
    },

    line: {
      probability: 20,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return [
          'line',
          random(5, 10),
          random('direction'),
          pl.util.extend(
            { 'stroke-width': random(1, 5) },
            random([{ 'stroke-dasharray' : '- ' },
                    {}])) ];
      }
    },

    circle: {
      probability: 5,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return [
          'circle',
          random(10),
          { 'stroke-width': 2,
            'fill-opacity': random(),
            'fill': random('color') } ]; }
    },

    ambientRect: {
      probability: 10,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return [
          'rect',
          random(-60, 60),
          random(-60, 60),
          { 'stroke-width': random(3),
            'stroke-opacity': random() * 0.5 + 0.1,
            'fill-opacity': random() / 10,
            'fill': random('color') } ]; }
    },

    highlightRect: {
      probability: 10,
      maxLength: 1,
      func: function() {
        var random = this.random;
        return ['rect', random(-10, 10), random(-10, 10),
                { 'stroke-width': 2,
                  'stroke-opacity': 1 ,
                  'fill-opacity': 1,
                  'fill': random('color') }]; }
    },

    snake: {
      probability: 5,
      func: function() {
        var random = this.random,
            blank;
        function makeMove(direction) {
          var type = blank ? 'line' : random(
            ['line', 'move']
          );
          if (type === 'move') blank = true;
          return [
            type,
            random(3, 15),
            direction,
            {'stroke-width': random(1, 5)}];
        }

        var up = makeMove('up'),
            left = makeMove('left'),
            right = left.slice(0);
        right[2] = 'right';
        return [
          random(1, 4),
          [left, up, right, up] ]; }
    },

    target: {
      probability: 1,
      func: function() {
        var scale = 4;
        return [
          1,
          [['circle', scale * 1, {'fill': 'black'}],
           ['circle', scale * 2, {'stroke-width': this.random(2)}]
          ]]; }
    },

    racket: {
      probability: 3,
      func: function() {
        var random = this.random;
        var scale = 4;
        return [
          1,
          [['line', random(4, 9),
            random('direction'),
            {'stroke-width': random(1, 4)}],
           ['circle', scale * 2, {'stroke-width': this.random(2)}]
          ]]; }
    }
  }
};

// -----------------------------------------------------------------------------

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function( callback ){
      window.setTimeout(callback, 1000 / 60);
    };
})();

(function() {
  var hidden = "hidden";

  function onchange (evt) {
    var v = 'visible', h = 'hidden',
        evtMap = {
          focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h
        };

    evt = evt || window.event;
    if (evt.type in evtMap)
      document.body.className = evtMap[evt.type];
    else
      document.body.className = this[hidden] ? "hidden" : "visible";
  }

  // Standards:
  if (hidden in document)
    document.addEventListener("visibilitychange", onchange);
  else if ((hidden = "mozHidden") in document)
    document.addEventListener("mozvisibilitychange", onchange);
  else if ((hidden = "webkitHidden") in document)
    document.addEventListener("webkitvisibilitychange", onchange);
  else if ((hidden = "msHidden") in document)
    document.addEventListener("msvisibilitychange", onchange);
  // IE 9 and lower:
  else if ('onfocusin' in document)
    document.onfocusin = document.onfocusout = onchange;
  // All others:
  else
    window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

})();
