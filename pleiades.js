/*global Raphael, SeedRandom, brush, running*/

// Project hosted at http://github.com/sabof/pleiades
// Version 0.1

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

// -----------------------------------------------------------------------------

var pl = {debug: false};

(function () {
  "use strict";
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

  var rotateArray = function(array, ammount) {
    if (ammount === undefined) {
      ammount = 1;
    }
    array = array.slice(0);
    if (ammount < 0) {
      while (ammount !== 0) {
        array.push(array.shift());
        ammount++;
      }
    } else {
      while (ammount !== 0) {
        array.unshift(array.pop());
        ammount--;
      }
    }
    return array;
  };

  var rotatePoint = function(pivot, point, angle) {
    // Rotate clockwise, angle in radians
    var x = ((Math.cos(angle) * (point[0] - pivot[0])) -
             (Math.sin(angle) * (point[1] - pivot[1])) +
             pivot[0]),
        y = ((Math.sin(angle) * (point[0] - pivot[0])) +
             (Math.cos(angle) * (point[1] - pivot[1])) +
             pivot[1]);
    return [x, y];
  };

  var rectToPoints = function(rect) {
    return [
      [rect[0], rect[1]],
      [rect[0] + rect[2], rect[1] + rect[3]]
    ];
  };

  var pointsToRect = function(/* rest */) {
    var reduce = Array.prototype.reduce,
        min = reduce.call(arguments, function(a, b) {
          return [Math.min(a[0], b[0]),
                  Math.min(a[1], b[1])];
        }),
        max = reduce.call(arguments, function(a, b) {
          return [Math.max(a[0], b[0]),
                  Math.max(a[1], b[1])];
        });
    return [ min[0],
             min[1],
             max[0] - min[0],
             max[1] - min[1]
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

  var wrap = function(oriFunc, wrapFunc) {
    var resultFunc = function() {
      var self = this;
      return wrapFunc.call(self, oriFunc, arguments);
    };
    resultFunc.oriFunc = oriFunc;
    return resultFunc;
  };

  var unWrap = function(wrapFunc) {
    return wrapFunc.oriFunc;
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

  function constantly(value) {
    return function() { return value; };
  }

  pl.util = {
    // Assume it's just max/array with one argument.
    // Inclusive, exclusive
    random: random,

    rotateArray: rotateArray,

    extend: extend,

    constantly: constantly,

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
    rotatePoint: rotatePoint,
    rectanglesOverlap: rectanglesOverlap,
    pointsToRect: pointsToRect,
    rectToPoints: rectToPoints
  };

  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------

  pl.ColorTheme = function() {};

  pl.ColorTheme.prototype = {
    init: function() {},
    constructor: pl.ColorTheme,

    // Colors

    background: constantly('#ffff00'),
    highlight: constantly('#ff0000'),
    outline: constantly('#0000FF'),
    shadow: constantly('#ff0000'),
    gradient: function() {
      var oriColor = random(['#ff0000', '#00FFFF', '#FFFF00']);
      return '45-' +
        pl.color.vary(oriColor, 100) + ':5-' +
        pl.color.vary(oriColor, 100) + ':95';
    },

    // Styles

    line: function() {
      return {
        'stroke': this.outline()
      };
    },

    snake: function() {
      return {
        'stroke': this.outline()
      };
    },

    largeCircle: function() {
      return {
        'stroke': this.outline()
      };
    },

    gradStrip: function() {
      return {
        'stroke': this.outline(),
        'fill': this.gradient()
      };
    },

    highlightRect: function() {
      return {
        'stroke': this.outline(),
        'fill': this.highlight()
      };
    },

    smallCircle: function() {
      return {
        'stroke': this.outline(),
        'fill': this.highlight(),
        'fill-opacity': random()
      };
    },

    ambientRect: function() {
      return {
        'stroke-opacity': random() * 0.5 + 0.1,
        'stroke': this.outline(),
        'fill-opacity': random() / 10,
        'fill': this.shadow()
      };
    }
  };

  // ---------------------------------------------------------------------------

  pl.ColorThemeFactory = function() {
    // this.make = this.make.bind(this, 'bluePrint');
  };

  pl.ColorThemeFactory.prototype = {
    make: function(themeName) {
      var proto = this.themes[
        themeName || random({bluePrint: 1,
                             blackNeon: 3,
                             papyrus: 6})
      ];
      var theme = Object.create(proto);
      theme.init();
      // Doesn't look at the chain
      Object.keys(proto)
        .concat(Object.keys(theme))
        .forEach(function(key) {
          if(typeof theme[key] === 'string') {
            theme[key] = constantly(theme[key]);
          }
        });
      return theme;
    },

    // -------------------------------------------------------------------------

    themes: {
      papyrus: (function() {

        function randomColor() {
          return pl.color.vary(random(['#0000FF',
                                       '#CC0000',
                                       // '#008800',
                                       '#000000']),
                               150);
        }

        return extend(
          new pl.ColorTheme(), {
            // Colors
            background: '#C7C289',
            outline: '#000000',
            shadow: function() {
              return randomColor();
            },
            highlight: randomColor,
            gradient: function() {
              var oriColor = randomColor();
              return '45-' +
                pl.color.vary(oriColor, 50) + ':5-' +
                pl.color.vary(oriColor, 50) + ':95';
            },

            // Styles
            largeCircle: constantly(
              { 'stroke': "#FFFFFF" }
            )

          });

      } ()),

      // -----------------------------------------------------------------------

      // matrix: extend(
      //   new pl.ColorTheme(),
      //   { shadow: '#00FF00'
      //   }),

      // -----------------------------------------------------------------------

      blackNeon: extend(
        new pl.ColorTheme(), {
          background: '#14090C',
          outline: '#332727',
          shadow: '#3A4344',
          highlight: '#41473C',
          largeCircle: constantly({ 'stroke': "#E7E2C8",
                                    'stroke-opacity': 0.5}),
          highlightRect: function() {
            return {
              'stroke': this.outline(),
              'fill': this.highlight(),
              'fill-opacity': random() * 0.4 + 0.1
            };
          },

          gradient: function() {
            var oriColor = random(['#ff0000', '#00FFFF', '#FFFF00']);
            return '45-' +
              pl.color.vary(oriColor, 100) + ':5-' +
              pl.color.vary(oriColor, 100) + ':95';
          }

          // smallCircle: function() {
          //   return {
          //     'stroke': this.outline(),
          //     'fill': this.gradient()
          //   };
          // }
        }),

      // -----------------------------------------------------------------------

      bluePrint: extend(
        new pl.ColorTheme(), {
          background: '#003355',
          outline: '#E7E2C8',
          shadow: '#003355',
          highlight: '#003355',
          largeCircle: constantly({ 'stroke': "#E7E2C8",
                                    'stroke-opacity': 0.5}),

          gradient: constantly('#003355')

        })
    }
  };

  // ---------------------------------------------------------------------------

  pl.Brush = function() {
    this._offset = [0, 0];
  };

  pl.Brush.prototype = {
    _translatePoint: function(point) {
      var x = Math.round(this._offset[0] + point[0]),
          y = Math.round(this._offset[1] + point[1]);
      return [x, y];
    }
  };

  // ---------------------------------------------------------------------------

  pl.RaphaelBrush = function() {
    this.mask = [0, 0, 0, 0];
    this.paper = null;
  };

  pl.RaphaelBrush.prototype = extend(
    new pl.Brush(), {
      constructor: pl.RaphaelBrush,

      init: function() {
        this.paper = new Raphael(
          0, 0,
          window.innerWidth,
          window.innerHeight
        );
      },

      polyline: function(points, attributes) {
        if (rectanglesOverlap(this.mask,
                              pointsToRect.apply(null, points)))
        {
          var adjPoints = points.map(this._translatePoint, this),
              pathString = 'M'.concat(adjPoints.map(function(pair) {
                return pair[0] + ' ' + pair[1];
              }).join('L'), 'Z');
          // console.log(pathString);
          this.paper.path(pathString)
            .attr(attributes);
        }
      },

      circle: function(point, radius, attributes) {
        var rect = [
          point[0] - radius,
          point[1] - radius,
          radius * 2,
          radius * 2
        ];
        // console.log(rect);
        // The mask is unadjusted
        if (rectanglesOverlap(rect, this.mask)) {
          // console.log(this.mask);

          var adjPoint = this._translatePoint(point);
          console.log(adjPoint);
          this.paper.circle(adjPoint[0], adjPoint[1], radius)
            .attr(attributes);
        }
      }
    });

  // ---------------------------------------------------------------------------

  pl.BrushCompass = function() {
    this._objectRects = [];
    this._outerBoundaries = undefined;
  };

  pl.BrushCompass.prototype = extend(
    new pl.Brush(), {
      reset: function() {
        this._outerBoundaries = undefined;
        this._objectRects = [];
      },

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
      },

      polyline: function(points) {
        this.trackIt(pointsToRect(points));
      },

      circle: function(point, radius) {
        this.trackIt([
          point[0] - radius,
          point[1] - radius,
          radius * 2,
          radius * 2
        ]);
      }
    });

  // ---------------------------------------------------------------------------

  pl.Painter = function(properties) {
    this.compass = new pl.Compass();
    this.point = [0, 0];
    this._offset = [0, 0];
    this.directions = ['forward', 'right', 'back', 'left'];
    this.zoom = 4;
    this.angleRotation = 0;
    if (properties) {
      extend(this, properties);
    }
  };

  pl.Painter.prototype = {
    constructor: pl.Painter,

    reset: function() {},

    directionTranslate: function(point, length, direction) {
      point = point || this.point;
      var table = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0]
      ],
          index = this.directions.indexOf(direction),
          oriPoint = point.slice(0),
          rotate1 = [
            oriPoint[0] + table[index][0] * length * this.zoom,
            oriPoint[1] + table[index][1] * length * this.zoom
          ],
          newPoint = rotatePoint(
            oriPoint,
            rotate1,
            this.angleRotation
          );
      return newPoint;
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

      var original = this.point.slice(0),
          translatedPoint = this.directionTranslate(
            this.point, length, direction);
      this.point = translatedPoint;
    },

    rotate: function(reverse) {
      this.directions = rotateArray(this.directions, reverse ? -1 : undefined);
    },

    rotateAngle: function(angle) {
      var newAngle = this.angleRotation + angle;
      if (newAngle < 0) {
        newAngle += Math.PI * 2;
      }
      this.angleRotation = newAngle;
    },

    measure: function(composition) {
      var oriBrush = this.brush;

      this.compass.reset();
      this.compass.zoom = this.zoom;
      this.compass.angleRotation = this.angleRotation;
      this.brush = this.compass;
      this._walker(composition);
      this.brush = oriBrush;
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
            self[stamp[0]].apply(self, stamp.slice(1));
          }});
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
      this._offset = [
        Math.round(windowCenter[0] - imageCenter[0]),
        Math.round(windowCenter[1] - imageCenter[1])
      ];
      this.brush._offset = this._offset;
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
      var visible = this.compass._objectRects.filter(function(rect) {
        return rectanglesOverlap(rect, windowTranslatedRect);
      });
      if (pl.debug) {
        visible.forEach(function(rect) {
          var isPoint = (rect.length === 2) ? 1 : 0;
          self.paper.rect(
            rect[0] + self._offset[0] - isPoint,
            rect[1] + self._offset[1] - isPoint,
            rect[2] || 2,
            rect[3] || 2 )
            .attr(
              {'stroke': isPoint ? 'red' : 'lime',
               'stroke-width': 3
              });
        });
      }

      if (! visible.length) {
        if (pl.debug) {
          console.log('invisible');
        }
        return false;
      } else {
        this.mask = windowTranslatedRect;
        this.brush.mask = windowTranslatedRect;
        // this.mask = [
        //   windowTranslatedRect[0] + 200,
        //   windowTranslatedRect[1] + 200,
        //   windowTranslatedRect[2] - 400,
        //   windowTranslatedRect[3] - 400
        // ];
      }

      if (pl.debug) {
        this.paper.rect.apply(this.paper, [
          this.mask[0] + this._offset[0],
          this.mask[1] + this._offset[1],
          this.mask[2],
          this.mask[3] ])
          .attr({'stroke-width': 4, 'stroke': 'blue'});
      }
      document.documentElement.style.background = composition.background;
      this._walker(composition);
      if (pl.debug) {
        this._drawBoundingBox();
      }
      return true;
    },

    init: function() {},
    destroy: function() {}
  };

  // ---------------------------------------------------------------------------

  pl.Compass = function() {
    this._objectRects = [];
    this._outerBoundaries = undefined;
  };

  pl.Compass.prototype = extend(
    new pl.Painter(), {
      constructor: pl.Compass,
      reset: function() {
        this.point = [0, 0];
        this._outerBoundaries = undefined;
        this._objectRects = [];
      },
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
      },
      // [left, top, width, height] or [left, top]

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
        var pointLB = this.point.slice(0),
            pointRB = this.directionTranslate(pointLB, width, 'right'),
            pointLT = this.directionTranslate(pointLB, height, 'forward'),
            pointRT = this.directionTranslate(pointRB, height, 'forward'),
            allPoints = [ pointLB, pointRB, pointRT, pointLT ];
        this.trackIt(pointsToRect.apply(null, allPoints));
        this.point = pointRT;
      },

      line: function(length, direction) {
        this.trackIt(this.point);
        this.move(length, direction);
        this.trackIt(this.point);
      },

      _walker: function(pattern) {
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
            }});
      },

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

  // ---------------------------------------------------------------------------

  pl.RaphaelPainter = function(properties) {
    if (properties) {
      extend(this, properties);
    }
  };

  pl.RaphaelPainter.prototype = extend(
    new pl.Painter(), {
      constructor: pl.RaphaelPainter,

      init: function() {
        this.paper = this.brush.paper;
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
        var oldPoint = this.point.slice(0);
        this.move(length, direction);
        var points = [oldPoint, this.point];
        this.brush.polyline(points, style);
      },

      rect: function(width, height, style) {
        var pointLB = this.point.slice(0),
            pointRB = this.directionTranslate(pointLB, width, 'right'),
            pointLT = this.directionTranslate(pointLB, height, 'forward'),
            pointRT = this.directionTranslate(pointRB, height, 'forward'),
            allPoints = [
              pointLB,
              pointRB,
              pointRT,
              pointLT
            ];
        this.brush.polyline(allPoints, style);
        this.point = allPoints[2];
      },

      circle: function(radius, style) {
        var adjRadius = radius * this.zoom;
        this.brush.circle(this.point, adjRadius, style);
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

  // ---------------------------------------------------------------------------

  pl.painterFactory = {
    make: function() {
      var painter = new pl.Painter();
      painter.brush = new pl.RaphaelBrush();
      painter.compass = new pl.Compass();
      return painter;
    }
  };

  // ---------------------------------------------------------------------------

  pl.StampFactory = function() {};

  pl.StampFactory.prototype = {
    reset: function() {
      var iterator = makeLooper(rotateArray(['.', 'none', '--', 'none'],
                                            random(4)));

      this.recipes.largeCircle = {
        probability: 20,
        maxLength: 1,
        func: function() {
          var dasharray = iterator();
          var circle = [
            'circle',
            random(10, 300),
            { 'stroke-width': (dasharray === 'none') ? 1 : 2,
              'stroke-dasharray' : dasharray
            }
          ];
          circle.dontMeasure = true;
          return circle;
        }
      };

      this.makeMake();
    },

    init: function() {
      this.reset();
    },

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
            wheel.push(recipeKey);
          }
        });
      wheelLength = wheel.length;
      this.make = function(option) {
        option = option || wheel[random(wheelLength)];
        var object = this.recipes[option],
            result = object.func.call(this),
            styles = [],
            self = this;
        if (this.colorTheme[option]) {
          if (typeof result[0] === 'string') {
            styles = [result[result.length - 1]];
          } else if (typeof result[0] === 'number') {
            result[1].forEach(function(elem) {
              styles.push(elem[elem.length - 1]);
            });
          }
          styles.forEach(function(style) {
            extend(style, self.colorTheme[option]());
          });
        }
        self.lastUsed = object;
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
        probability: 200,
        maxLength: 0,
        func: function() {
          return ['rotate', !! random(2)];
        }
      },

      rotateAngle: {
        probability: 0,
        maxLength: 0,
        func: function() {
          return ['rotateAngle', random() * 2 * Math.PI];
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
        probability: 300,
        maxLength: 0,
        func: function() {
          return [
            'move',
            random(5, 10),
            random('direction')
          ]; }
      },

      line: {
        probability: 200,
        maxLength: 1,
        func: function() {
          return [
            'line',
            random(5, 10),
            random('direction'),
            extend({ 'stroke-width': random(1, 5) },
                   random([{ 'stroke-dasharray' : '- ' },
                           {}]))
          ]; }
      },

      smallCircle: {
        probability: 30,
        // probability: 30,
        maxLength: 1,
        func: function() {
          return [
            'circle',
            random(1, 2),
            { 'stroke-width': random(1, 3) } ]; }
      },

      ambientRect: {
        probability: 100,
        maxLength: 1,
        func: function() {
          return [
            'rect',
            random(-60, 60),
            random(-60, 60),
            { 'stroke-width': random(3) } ]; }
      },

      gradStrip: {
        probability: 100,
        maxLength: 1,
        func: function() {
          var dimensions = [random(1, 3), random(3, 20)],
              oriColor = random('color');
          if (random(2)) {
            dimensions = rotateArray(dimensions);
          }
          return ['rect',
                  dimensions[0],
                  dimensions[1],
                  { 'stroke-width': 1 }]; }
      },

      highlightRect: {
        probability: 100,
        maxLength: 1,
        func: function() {
          return ['rect', random(-10, 10), random(-10, 10),
                  { 'stroke-width': 2 }]; }
      },

      snake: {
        probability: 50,
        func: function() {
          var blank, self = this;
          function makeMove(direction) {
            var type = blank ? 'line' : random(
              ['line', 'move']
            );
            if (type === 'move') blank = true;
            return [
              type,
              random(3, 15),
              direction,
              { 'stroke-width': random(1, 5) }];
          }

          var up = makeMove('forward'),
              left = makeMove('left'),
              right = left.slice(0);
          right[2] = 'right';
          return [ random(1, 4),
                   [left, up, right, up] ]; }
      }
    }
  };

  // ---------------------------------------------------------------------------

  pl.CompositionFactory = function(properties) {
    this.depth = 5;
    this.sequenceLength = 15;
    if (properties) {
      extend(this, properties);
    }
  };

  pl.CompositionFactory.prototype = {
    constructor: pl.CompositionFactory,

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
        for (var i = 0; i < repeat; i++) {
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
          allowAngleRotation = true || ! random(2),
          colorTheme = this.colorThemeFactory.make(),
          self = this;
      self.stampFactory.recipes.largeCircle.func = wrap(
        self.stampFactory.recipes.largeCircle.func,
        function(oriFunc) {
          if (largeCircleLimit) {
            largeCircleLimit--;
            return oriFunc.call(this);
          } else {
            return [0, []];
          }
        }
      );


      this.stampFactory.colorTheme = colorTheme;
      for (var i = this.depth - 1; i >= 0; i--) {
        var currentSequence = [];

        if (i <= 1) {
          this.stampFactory.recipes.largeCircle.probability = 70;
        } else {
          this.stampFactory.recipes.largeCircle.probability = 0;
        }
        this.stampFactory.makeMake();
        for (var j = 0, jL = this.sequenceLength; j < jL; j++) {
          currentSequence.unshift(this.stampFactory.make());
        }
        if (sequences.length) {
          if (random(2)) {
            currentSequence.splice(random(currentSequence.length),
                                   0,
                                   this._makeZoomer(sequences[0]));
          } else {
            currentSequence.splice(random(currentSequence.length),
                                   0,
                                   [ 2 + random(2) * 2, sequences[0] ]);
          }
        }
        if (allowAngleRotation) {
          var position = random(currentSequence.length),
              rotationAngle = Math.PI / 4 ||
              Math.max(1, random() * 2 * Math.PI);
          currentSequence.splice(position,
                                 0,
                                 ['rotateAngle', rotationAngle]);
          currentSequence.splice(random(position + 1, currentSequence.length),
                                 0,
                                 ['rotateAngle', -rotationAngle]);
        }
        sequences.unshift(currentSequence);
      }
      this.stampFactory.recipes.largeCircle.func =
        unWrap(this.stampFactory.recipes.largeCircle.func);
      return extend([],
                    {0:[4, sequences[0]],
                     length: 1,
                     background: colorTheme.background()});
    }
  };

  // -----------------------------------------------------------------------------

  pl.Previewer = function(properties) {
    extend(this, properties);
  };

  pl.Previewer.prototype = {
    stampFactory: null,
    beforeStepHook: constantly(false),
    afterStepHook: constantly(false),
    painter: null,
    compositionFactory: null,
    composition: null,
    loopInterval: 5,
    ticket: null,
    paused: false,
    stopped: false,
    init: function() {
      this.painter.init();
    },

    step: function(seed) {
      this.beforeStepHook();
      if (seed) {
        this.ticket = seed;
      } else {
        this.ticket = pl.util.makeTicket();
      }
      SeedRandom.seed(this.ticket);

      this.composition = this.compositionFactory.make();
      var result = this.painter.drawComposition(this.composition);
      this.afterStepHook();
      return result;
    },

    loop: function() {
      if (document.body.className !== 'hidden' && ! this.paused) {
        while (true) {
          if ( !this.step() ) {
            // console.log('skipped ' + this.ticket);
            continue;
          }
          break;
        }
      }
      if ( ! this.stopped) {
        setTimeout(this.loop.bind(this),
                   this.loopInterval * 1000);
      }
    },
    stop: function() {
      this.stopped = true;
    },

    start: function(type) {
      switch (type) {
      case 'step':
        this.init();
        this.step();
        break;

      case 'loop':
        this.init();
        this.stopped = false;
        this.loop();
        break;

      default:
        this.init();
      }
    }
  };
}());
