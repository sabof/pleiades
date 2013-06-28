/*global Raphael, SeedRandom*/

// Project hosted at http://github.com/sabof/pleiades
// Version 0.1

var pl = {};

(function () {
  var random = function(min, max) {
    if (min instanceof Array) {
      return min[random(min.length)];
    }
    if (typeof min === 'object') {
      var wheel = [];
      Object.keys(min)
        .forEach(function(key) {
          for (var i = 0; i < min[key]; i++) {
            wheel.push(key);
          }});
      return random(wheel); }
    if (min === 'color') {
      return pl.color.vary(
        random(
          max ||
            ['#0000FF',
             // '#00FF00',
             '#000000',
             '#FF0000']),
        50);
    }
    if (min === 'direction') {
      return random(['up', 'down', 'right', 'left']);
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
  };

  var rotateArray = function(array, reverse) {
    array = array.slice(0);
    if (reverse) {
      array.push(array.shift());
    } else {
      array.unshift(array.pop());
    }
    return array;
  };

  var rectToPoints = function(rect) {
    return [
      [rect[0], rect[1]],
      [rect[0] + rect[2], rect[1] + rect[3]]
    ];
  };

  var pointsToRect = function(a, b) {
    var minX = Math.min(a[0], b[0]);
    var maxX = Math.max(a[0], b[0]);
    var minY = Math.min(a[1], b[1]);
    var maxY = Math.max(a[1], b[1]);
    return [
      minX,
      minY,
      maxX - minX,
      maxY - minY
    ];
  };

  var rangesOverlap = function(rangeA, rangeB) {
    return ! (
      rangeB[1] <= rangeA[0] ||
        rangeA[1] <= rangeB[0]
    );
  };

  var rectanglesOverlap = function(rectA, rectB) {
    return rangesOverlap(
      [rectA[0], rectA[0] + rectA[2]],
      [rectB[0], rectB[0] + rectB[2]]
    ) && rangesOverlap(
      [rectA[1], rectA[1] + rectA[3]],
      [rectB[1], rectB[1] + rectB[3]]
    );
  };

  var extend = function(original) {
    Array.prototype.slice
      .call(arguments, 1)
      .forEach(function(mixin) {
        Object.keys(mixin).forEach(function(key) {
          original[key] = mixin[key];
        }); });
    return original;
  };

  pl.util = {
    // Assume it's just max/array with one argument.
    // Inclusive, exclusive
    random: random,

    rotateArray: rotateArray,

    extend: extend,

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

    rangesOverlap: rangesOverlap,

    rectanglesOverlap: rectanglesOverlap,

    pointsToRect: pointsToRect,

    rectToPoints: rectToPoints
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
          var raw = channel + (random(intensity * 2) - intensity),
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
    this._showBoundingBox = false;
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

    move: function(length, direction) {
      if ( this.directions.indexOf(direction) === -1)
      {
        throw new Error('Illegal direction: ' + direction);
      }

      this.point = this.directionTranslate(
        this.point, length, direction);
    },

    rotate: function(reverse) {
      this.directions = rotateArray(this.directions, reverse);
    },

    reflect: function(across) {
      var storage;
      if (across) {
        storage = this.directions[3];
        this.directions[3] = this.directions[1];
        this.directions[1] = storage;
      } else {
        storage = this.directions[2];
        this.directions[2] = this.directions[0];
        this.directions[0] = storage;
      }
    },

    _walker: function(composition) {
      var self = this;
      composition.forEach(
        function(stamp) {
          if (typeof stamp === 'function') {
            stamp.call(self);
          } else if (typeof stamp[0] === 'number') {
            for (var i = 0; i < stamp[0]; i++) {
              self._walker(stamp[1]);
            }
          } else {
            self[stamp[0]]
              .apply(
                self,
                stamp.slice(1)
              ); }});
    },

    drawComposition: function(composition) {
      var self = this,
          windowCenter = [
            window.innerWidth / 2,
            window.innerHeight / 2 ],
          imageCenter;

      this.reset();
      this.compass.measure(composition);

      var outerRect = this.compass.getOuterRect(true);
      imageCenter = [
        (outerRect[0] + outerRect[2] / 2),
        (outerRect[1] + outerRect[3] / 2)
      ];
      // try {

      // } catch (error) {
      //   if ( ! this.compass.outerBoundaries[0]) {
      //     console.log('blank image');
      //   }
      //   imageCenter = windowCenter;
      // }
      this._offset = [
        Math.round(windowCenter[0] - imageCenter[0]),
        Math.round(windowCenter[1] - imageCenter[1])
      ];
      var windowTranslatedRect = (
        pointsToRect.apply(
          null,
          rectToPoints([0, 0, window.innerWidth, window.innerHeight])
            .map(this.unadjustPoint, this))
      );
      // console.log(windowTranslatedRect);
      // console.log(this.compass._objectRects);

      // this.paper.rect.apply(this.paper, [
      //   windowTranslatedRect[0] * this.zoom + this._offset[0],
      //   windowTranslatedRect[1] * this.zoom + this._offset[1],
      //   windowTranslatedRect[2] * this.zoom,
      //   windowTranslatedRect[3] * this.zoom
      // ]).attr({'stroke-width': 2, 'stroke': 'blue'});

      if ( ! this.compass._objectRects.some(function(boundaryRect) {
        return rectanglesOverlap(boundaryRect, windowTranslatedRect);
      })) {
        console.log('invisible');
        return false;
      } else {
        this.mask = windowTranslatedRect;
      }
      this._walker(composition);
      if (this._showBoundingBox) {
        this._drawBoundingBox();
      }
      return true;
    },

    init: function() {},
    destroy: function() {}
  };

  // -----------------------------------------------------------------------------

  pl.Compass = function() {
    this._objectRects = [];
    this._outerBoundaries = undefined;
  };

  pl.Compass.prototype = extend(
    new pl.Brush(),
    { constructor: pl.Compass,
      reset: function() {
        this.point = [0, 0];
        this._outerBoundaries = undefined;
        this._objectRects = [];
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
        // brush.paper.circle(x * 3 +  557.5, y * 3 + 463.5, 2).attr({'fill': 'red'});
        return [x, y];
      },

      // [left, top, width, height]
      trackRect: function(rect) {
        if (rect.length !== 4) {
          throw new Error(
            'Wrong number of rect: ' +
              rect.length);
        }
        if ( ! rect.every(function(num) {
          return typeof num === 'number' && ! isNaN(num); }))
        { throw new Error(
          'Some rect are not numbers: ' +
            JSON.stringify(rect));
        }
        this._objectRects.push(rect);
        this.trackPoint(
          [rect[0],
           rect[1]]);
        this.trackPoint(
          [rect[0] + rect[2],
           rect[1] + rect[3]]);
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
        var verticalLength = Math.abs(width),
            verticalDirection = (height > 0) ? 'down' : 'up',
            horizontalLength = Math.abs(height),
            horizontalDirection = (width > 0) ? 'right' : 'left',
            oldPoint = this.point.slice(0);
        this.point = this.directionTranslate(
          this.point,
          horizontalLength,
          horizontalDirection);
        this.point = this.directionTranslate(
          this.point,
          verticalLength,
          verticalDirection);
        this.trackRect(pointsToRect(oldPoint, this.point));

      },

      line: function(length, direction) {
        var oldPoint = this.point;
        this.move(length, direction);
        this.trackRect(pointsToRect(oldPoint, this.point));
      },

      _walker: function(pattern) {
        // console.log(pattern);
        var self = this;
        pattern.forEach(
          function(stamp) {
            if (typeof stamp === 'function') {
              stamp.call(self);
            } else if (typeof stamp[0] === 'number') {
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

      getOuterRect: function(adjusted) {
        if ( ! this._outerBoundaries) {
          throw new Error('Boundaries not calculated');
        }

        var ob = this._outerBoundaries,
            points = [
              this._outerBoundaries.slice(0, 2),
              this._outerBoundaries.slice(2, 4)
            ];
        if (adjusted) {
          points = points.map(this.adjustPoint, this);
        }
        return points[0].concat(
          [points[1][0] - points[0][0],
           points[1][1] - points[0][1]]
        );
      }
    });

  // -----------------------------------------------------------------------------

  pl.RaphaelBrush = function() {};

  pl.RaphaelBrush.prototype = extend(
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
        var oldPoint = this.point.slice(0),
            adjOldPoint = this.adjustPoint(oldPoint),
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
        var newPoint = this.point;

        var adjPoint = this.adjustPoint(this.point);
        if (rectanglesOverlap(this.mask, pointsToRect(oldPoint, newPoint)
                             ))
        {
          this.paper.rect.apply(
            this.paper,
            pointsToRect(adjOldPoint, adjPoint)
          ).attr(style);
        }
      },

      circle: function(radius, style) {
        var rect = [
          this.point[0] - radius,
          this.point[1] - radius,
          radius * 2,
          radius * 2
        ];
        if (rectanglesOverlap(rect, this.mask)) {
          var adjPoint = this.adjustPoint(this.point);
          this.paper.circle(adjPoint[0], adjPoint[1], radius * this.zoom)
            .attr(style);
        }
      },

      _drawBoundingBox: function() {
        var outerRect = this.compass.getOuterRect(true);
        this.paper.rect.apply(this.paper, [
          outerRect[0] + this._offset[0],
          outerRect[1] + this._offset[1],
          outerRect[2],
          outerRect[3]
        ]).attr({'stroke-width': 2, 'stroke': 'red'});
      }
    }
  );

  // -----------------------------------------------------------------------------

  pl.stampFactory = {

    makeMake: function() {
      var self = this,
          wheel = [],
          wheelLength;
      Object.keys(this.recipes)
        .forEach(function(recipeKey) {
          var probability = self.recipes[recipeKey].probability;
          if (probability === undefined) {
            probability = 5;
          }
          for (var i = 0; i < probability; i++) {
            wheel.push(self.recipes[recipeKey]);
          }
        });
      wheelLength = wheel.length;
      this.make = function(option) {
        var object = option ? this.recipes[option] :
            wheel[random(wheelLength)];
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
          return ['rotate', !! random(2)];
        }
      },

      reflect: {
        probability: 0,
        maxLength: 0,
        func: function() {
          return ['reflect', !! random(2)];
        }
      },

      move: {
        probability: 30,
        maxLength: 0,
        func: function() {
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
          return [
            'line',
            random(5, 10),
            random('direction'),
            extend(
              { 'stroke-width': random(1, 5) },
              random([{ 'stroke-dasharray' : '- ' },
                      {}])) ];
        }
      },

      largeCircle: {
        probability: 2,
        maxLength: 1,
        func: function() {
          var width = random(1, 3);
          return [
            'circle',
            random(30, 1000),
            { 'stroke-width': width,
              'stroke-dasharray' : (width === 1) ? 'none' : random(['- ', 'none']),
              'stroke': 'white'
              // 'stroke-opacity': 1
              // 'fill-opacity': random(),
              // 'fill': random('color')
            } ]; }
      },

      smallCircle: {
        probability: 3,
        maxLength: 1,
        func: function() {
          return [
            'circle',
            random(2, 5),
            { 'stroke-width': random(2, 5),
              'fill-opacity': random(),
              'fill': random('color')
            } ]; }
      },

      ambientRect: {
        probability: 10,
        maxLength: 1,
        func: function() {
          return [
            'rect',
            random(-60, 60),
            random(-60, 60),
            { 'stroke-width': random(3),
              'stroke-opacity': random() * 0.5 + 0.1,
              'fill-opacity': random() / 10,
              'fill': random('color') } ]; }
      },

      gradStrip: {
        probability: 10,
        maxLength: 1,
        func: function() {
          var dimensions = [random(1, 3), random(3, 20)],
              oriColor = random('color');
          if (random(2)) {
            dimensions = rotateArray(dimensions);
          }
          return ['rect', dimensions[0], dimensions[1],
                  { 'stroke-width': 1,
                    'fill': '45-' +
                    pl.color.vary(oriColor, 100) + ':5-' +
                    pl.color.vary(oriColor, 100) + ':95' }];
        }
      },

      highlightRect: {
        probability: 10,
        maxLength: 1,
        func: function() {
          return ['rect', random(-10, 10), random(-10, 10),
                  { 'stroke-width': 2,
                    'stroke-opacity': 1 ,
                    'fill-opacity': 1,
                    'fill': random('color') }]; }
      },

      snake: {
        probability: 5,
        func: function() {
          var blank;
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
        probability: 0,
        func: function() {
          var scale = 2;
          return [
            1,
            [['circle', scale * 1, {'fill': 'black'}],
             ['circle', scale * 2, {'stroke-width': random(2)}]
            ]]; }
      },

      racket: {
        probability: 0,
        func: function() {
          return [
            1,
            [['line', random(4, 9),
              random('direction'),
              {'stroke-width': random(1, 4)}],
             ['circle', 3, {'stroke-width': random(2)}]
            ]]; }
      }
    }
  };

  // -----------------------------------------------------------------------------

  pl.Generator = function() {
    this.depth = 5;
    this.sequencesLength = 15;
  };

  pl.Generator.prototype = {
    constructor: pl.Generator,

    maybeRange: function(thing) {
      if (thing instanceof Array) {
        return random(thing);
      } else {
        return thing;
      }},

    maybeCall: function(thing) {
      return (thing instanceof Function) ?
        thing() :
        thing; },

    make: function() {
      var sequences = [];
      // for (var i = 0, iL = this.depth; i < iL; i++) {
      function makeZoomer(sequence) {
        return function() {
          var originalZoom = this.zoom;
          var limit = random(1, 3) * 2;
          for (var i = - limit / 2; i < limit / 2; i++) {
            this.zoom = originalZoom +
              originalZoom * i * 0.3;
            this._walker(sequence);
          }
          this.zoom = originalZoom;
        };
      }

      for (var i = this.depth - 1; i >= 0; i--) {
        var currentSequence = [];

        if (i <= 1) {
          pl.stampFactory.recipes.largeCircle.probability = 17;
        } else {
          pl.stampFactory.recipes.largeCircle.probability = 0;
        }
        pl.stampFactory.makeMake();

        for (var j = 0, jL = this.sequencesLength; j < jL; j++) {
          currentSequence.push(pl.stampFactory.make());
        }
        if (sequences.length) {
          if (random(3) === 0) {
            currentSequence.splice(
              random(sequences.length),
              0, makeZoomer(sequences[0]));
          } else {
            currentSequence.splice(
              random(sequences.length),
              0, [ 2 + random(2) * 2, sequences[0] ]);
          }
        }
        sequences.unshift(currentSequence);
      }
      return [[4, sequences[0]]];
    }
  };
}());

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
