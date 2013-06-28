/*global Raphael, SeedRandom, brush*/

// Project hosted at http://github.com/sabof/pleiades
// Version 0.1

var pl = {debug: false};

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
      return random(['forward', 'back', 'right', 'left']);
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

  // (or Rect and point)
  var rectanglesOverlap = function(rectA, rectB) {
    if (rectA.length !== 4) {
      rectA = rectA.slice(0);
      rectA[2] = rectA[3] = 0;
    }
    if (rectB.length !== 4) {
      rectB = rectB.slice(0);
      rectB[2] = rectB[3] = 0;
    }
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

  function makeLooper(array) {
    var activeArray;
    return function() {
      if (! activeArray || activeArray.length === 0) {
        activeArray = array.slice(0);
      }
      return activeArray.pop();
    };
  }


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
    this.directions = ['forward', 'right', 'back', 'left'];
    // this.zoom = 3;
    this.zoom = 6;
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
        point[0] + table[index][0] * length * this.zoom,
        point[1] + table[index][1] * length * this.zoom
      ];
      return point;
    },

    translatePoint: function(point) {
      var x = Math.round(this._offset[0] + point[0]),
          y = Math.round(this._offset[1] + point[1]);
      return [x, y];
    },

    untranslatePoint: function(point) {
      var x = Math.round((point[0] - this._offset[0]) // / this.zoom
                        ),
          y = Math.round((point[1] - this._offset[1]) // / this.zoom
                        );
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
      var windowTranslatedRect =
        pointsToRect.apply(
          null,
          rectToPoints([0, 0, window.innerWidth, window.innerHeight])
            .map(
              function(point) {
                return [
                  point[0] - this._offset[0],
                  point[1] - this._offset[1]
                ];
              },
              this));
      // console.log(windowTranslatedRect);
      // console.log(this.compass._objectRects);
      if (pl.debug) {
        this.paper.rect.apply(this.paper, [
          windowTranslatedRect[0] + this._offset[0],
          windowTranslatedRect[1] + this._offset[1],
          windowTranslatedRect[2],
          windowTranslatedRect[3] ])
          .attr({'stroke-width': 2, 'stroke': 'blue'});
      }
      var visible = this.compass._objectRects.filter(function(rect) {
        return rectanglesOverlap(rect, windowTranslatedRect);
      });
      // console.log(_objectRects);

      // console.log(JSON.stringify(this.compass._objectRects));
      if (pl.debug) {
        visible.forEach(function(rect) {
          // console.log(rect);
          // console.log(self._offset);
          var isPoint = (rect.length === 2) ? 1 : 0;
          // console.log(rect);
          brush.paper.rect(
            rect[0] + self._offset[0] - isPoint,
            rect[1] + self._offset[1] - isPoint,
            rect[2] || 2,
            rect[3] || 2 )
            .attr(
              {'stroke': isPoint ? 'red' : 'lime',
               'stroke-width': 3
               // 'stroke-dasharray': '. '
              });
        });
      }
      // console.log(visible.length);
      // brush.paper.circle(x +  -608, y + -229, 2).attr({'fill': 'red'});

      if (! visible.length) {
        console.log('invisible');
        return false;
      } else {
        this.mask = windowTranslatedRect;
      }
      this._walker(composition);
      if (pl.debug) {
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

      // [left, top, width, height] or [left, top]
      trackIt: function(rect) {
        var self = this;
        function adjustOuterBoundaries(point) {
          var x = point[0],
              y = point[1];

          if ( ! self._outerBoundaries) {
            self._outerBoundaries = [x, y, x, y];
          } else {
            self._outerBoundaries[0] = Math.min(self._outerBoundaries[0], x);
            self._outerBoundaries[1] = Math.min(self._outerBoundaries[1], y);

            self._outerBoundaries[2] = Math.max(self._outerBoundaries[2], x);
            self._outerBoundaries[3] = Math.max(self._outerBoundaries[3], y);
          }
        }

        if (rect.length < 2) {
          throw new Error(
            'Wrong number of members: ' +
              rect.length);
        }
        if ( ! rect.every(function(num) {
          return typeof num === 'number' && ! isNaN(num); }))
        { throw new Error(
          'Some members are not numbers: ' +
            JSON.stringify(rect));
        }

        this._objectRects.push(rect);

        adjustOuterBoundaries(
          [rect[0],
           rect[1]]);
        if (rect.length === 4) {
          adjustOuterBoundaries(
            [rect[0] + rect[2],
             rect[1] + rect[3]]);
        }
        // console.log(ticket + ': ' + rect.length);
      },

      circle: function(radius) {
        var rect = [
          this.point[0] - radius * this.zoom,
          this.point[1] - radius * this.zoom,
          radius * this.zoom * 2,
          radius * this.zoom * 2
        ];
        this.trackIt(rect);
      },

      rect: function(width, height, style) {
        var verticalLength = Math.abs(width),
            verticalDirection = (height > 0) ? 'back' : 'forward',
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
        this.trackIt(pointsToRect(oldPoint, this.point));

      },

      line: function(length, direction) {
        // var oldPoint = this.point;
        this.trackIt(this.point);
        this.move(length, direction);
        this.trackIt(this.point);
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
            } else if (! stamp.dontMeasure) {
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
          points = points.map(function(point) {
            return [
              point[0] + this._offset[0],
              point[1] + this._offset[1]
            ];
          },
                              this);
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
        var adjOldPoint = this.translatePoint(this.point);
        this.move(length, direction);
        var adjPoint = this.translatePoint(this.point);
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
            adjOldPoint = this.translatePoint(oldPoint),
            verticalLength = Math.abs(width),
            verticalDirection = (height > 0) ? 'back' : 'forward',
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

        var adjPoint = this.translatePoint(this.point);
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
          this.point[0] - radius * this.zoom,
          this.point[1] - radius * this.zoom,
          radius * 2 * this.zoom,
          radius * 2 * this.zoom
        ];
        if (rectanglesOverlap(rect, this.mask)) {
          var adjPoint = this.translatePoint(this.point);
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
        func: (function() {
          var iterator = makeLooper(['.', 'none', '--', 'none']);
          return function() {
            var dasharray = iterator();
            var circle = [
              'circle',
              random(10, 300),
              { 'stroke-width': (dasharray === 'none') ? 1 : 2,
                'stroke-dasharray' : dasharray,
                'stroke': 'white'
                // 'stroke-opacity': 1
                // 'fill-opacity': random(),
                // 'fill': random('color')
              } ];
            circle.dontMeasure = true;
            return circle; };

        }())

      },

      smallCircle: {
        // probability: 3,
        probability: 30,
        maxLength: 1,
        func: function() {
          return [
            'circle',
            random(1, 2),
            { 'stroke-width': random(1, 3),
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

          var up = makeMove('forward'),
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
    // this.depth = 3;
    this.sequencesLength = 15;
    // this.sequencesLength = 10;
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

    _makeZoomer: function(sequence, repeat) {
      repeat = repeat || random(1, 3) * 2;
      return function() {
        var originalZoom = this.zoom;
        // var repeat = 4;
        for (var i = - repeat / 2; i < repeat / 2; i++) {
          this.zoom = originalZoom +
            originalZoom * i * 0.3;
          this._walker(sequence);
        }
        this.zoom = originalZoom;
      };
    },

    make: function() {
      var sequences = [],
          largeCircleLimit = 2,
          oriLC = pl.stampFactory.recipes.largeCircle.func;
      // for (var i = 0, iL = this.depth; i < iL; i++) {
      pl.stampFactory.recipes.largeCircle.func = function () {
        if (largeCircleLimit) {
          largeCircleLimit--;
          return oriLC.call(this);
        } else {
          return [0, []];
        }
      };
      for (var i = this.depth - 1; i >= 0; i--) {
        var currentSequence = [];

        if (i <= 1) {
          pl.stampFactory.recipes.largeCircle.probability = 7;
        } else {
          pl.stampFactory.recipes.largeCircle.probability = 0;
        }
        pl.stampFactory.makeMake();

        for (var j = 0, jL = this.sequencesLength; j < jL; j++) {
          currentSequence.push(pl.stampFactory.make());
        }
        if (sequences.length) {
          if (random(2)) {
            currentSequence.splice(
              random(sequences.length),
              0, this._makeZoomer(sequences[0]));
          } else {
            currentSequence.splice(
              random(sequences.length),
              0, [ 2 + random(2) * 2, sequences[0] ]);
          }
        }
        sequences.unshift(currentSequence);
      }
      pl.stampFactory.recipes.largeCircle.func = oriLC;
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
