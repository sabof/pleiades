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
    var x = Math.round((Math.cos(angle) * (point[0] - pivot[0])) -
                       (Math.sin(angle) * (point[1] - pivot[1])) +
                       pivot[0]),
        y = Math.round((Math.sin(angle) * (point[0] - pivot[0])) +
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
        if (mixin && typeof mixin === 'object') {
          Object.keys(mixin).forEach(function(key) {
            original[key] = mixin[key];
          }); }});
    return original;
  };

  var makeClass = function(args) {
    var constructor = args.constructor;
    delete args.constructor;
    var C = function(props) {
      if (constructor) {
        constructor.call(this, props);
      }
      extend(this, props);
    };

    if (typeof args.parent === 'object') {
      C.prototype = Object.create(args.parent);
      C.prototype.constructor = C;
    } else if (typeof args.parent === 'function') {
      C.prototype = Object.create(new args.parent());
      C.prototype.constructor = C;
    }
    delete args.parent;

    C.subclass = function(args) {
      args.parent = C;
      return makeClass(args);
    };

    extend(C.prototype, args);
    return C;
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

  function ignore() {}

  // ---------------------------------------------------------------------------

  function color(string) {
    /*jshint boss:true, validthis: true*/
    var matches,
        self = (this && this.constructor === color) ? this :
        Object.create(color.prototype);
    if (matches = string.match(/rgba\((\d+), ?(\d+), ?(\d+), ?(\d+)\)/i)) {
      self.channels = matches.slice(1, 4).map(function(num) {
        return parseInt(num, 10);
      });
      self.transparency = matches[4];
      self.type = 'rbga';
    } else if (matches = string.match(/rgb\((\d+), ?(\d+), ?(\d+)\)/i)) {
      self.channels = matches.slice(1).map(function(num) {
        return parseInt(num, 10);
      });
      self.type = 'rgb';
    } else if (matches = string.match(/#([\dA-F]{2})([\dA-F]{2})([\dA-F]{2})/i)) {
      self.channels = matches.slice(1).map(function(hex) {
        return parseInt(hex, 16);
      });
      self.type = 'hex';
    } else if (matches = string.match(/#([\dA-F])([\dA-F])([\dA-F])/i)) {
      self.channels = matches.slice(1).map(function(hex) {
        return parseInt(hex + hex, 16);
      });
      self.type = 'hex';
    } else {
      throw new Error('Couldn\'t parse: ' + string);
    }
    self.input = string;
    return self;
  }

  color.prototype = {
    constructor: color,

    _to: function(values, format) {
      if (values.some(isNaN)) {
        throw new Error('Some channels are NaN: ' +
                        JSON.stringify(values));
      }
      if (format === 'rgba' ||
          (values[3] !== undefined) && ! format)
      {
        return 'rgba(' +
          values[0] + ', ' +
          values[1] + ', ' +
          values[2] + ', ' +
          ((values[3] === undefined) ? 1 : values[3]) +
          ')';
      }
      if (format === 'rgb') {
        return 'rgb(' +
          values[0] + ', ' +
          values[1] + ', ' +
          values[2] + ')';
      }
      return String.prototype.concat
        .apply('#',
               values.slice(0, 3).map(
                 function(value) {
                   return pl.util.ensureLength(
                     value.toString(16),
                     2);
                 }))
        .toUpperCase();
    },
    vary: function(intensity) {
      intensity = intensity || 10;
      if (this.channels.some(isNaN)) {
        throw new Error('Some channels are NaN: ' +
                        JSON.stringify(this.channels));
      }
      var transparency = this.channels[3],
          colorChannels = this.channels.slice(0, 3);
      colorChannels = colorChannels.map(function(channel) {
        var raw = channel + (random(intensity * 2) - intensity),
            normalized = Math.min(255, Math.max(0, raw));
        // console.log(raw);
        // console.log(normalized);
        return normalized; });
      if (transparency !== undefined) {
        colorChannels.push(transparency);
      }
      if (colorChannels.some(isNaN)) {
        throw new Error('Some colorChannels are NaN: ' +
                        JSON.stringify(this.input) + '->' +
                        JSON.stringify(this.channels) + '->' +
                        JSON.stringify(colorChannels));
      }
      this.channels = colorChannels;
      return this;
    },

    toRGB: function() { return this._to(this.channels, 'rgb'); },
    toRGBA: function() {
      return this._to(this.channels.concat(
        [this.transparency === undefined ? 1 : this.transparency]),
                      'rgba');
    },
    toHEX: function() { return this._to(this.channels, 'hex'); },
    toString: function() {
      return this._to(this.channels.concat(
        [this.transparency === undefined ? 1 : this.transparency]));
    },
    alpha: function(val) {
      if (val === undefined) {
        return this.transparency;
      }
      this.transparency = val;
      return this;
    }
  };

  // ---------------------------------------------------------------------------

  pl.util = {
    // Assume it's just max/array with one argument.
    // Inclusive, exclusive
    random: random,

    makeClass: makeClass,

    color: color,

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

    // objectsEqual: function(a, b) {
    //   var aKeys = Object.keys(a);
    //   var bKeys = Object.keys(a);
    //   return true;
    // },

    rangesOverlap: rangesOverlap,
    rotatePoint: rotatePoint,
    rectanglesOverlap: rectanglesOverlap,
    pointsToRect: pointsToRect,
    rectToPoints: rectToPoints
  };

  // ---------------------------------------------------------------------------

  pl.ColorTheme = makeClass({
    init: function() {},

    // Colors

    background: constantly('#ffff00'),
    highlight: constantly('#ff0000'),
    outline: constantly('#0000FF'),
    shadow: constantly('#ff0000'),
    gradient: function() {
      var oriColor = random(['#ff0000', '#00FFFF', '#FFFF00']);
      return [
        color(oriColor).vary(100).toString(),
        color(oriColor).vary(100).toString()
      ];
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
        'fill': color(this.highlight())
          .alpha(random())
          .toString()
      };
    },

    ambientRect: function() {
      return {
        'stroke': color(this.outline())
          .alpha(random() * 0.5 + 0.1)
          .toString(),
        'fill': color(this.highlight())
          .alpha(random() / 10)
          .toString()
      };
    }
  });

  // ---------------------------------------------------------------------------

  pl.ColorThemeFactory = makeClass({
    make: function(themeName) {
      var proto = this.themes[
        themeName || random({bluePrint: 0,
                             blackNeon: 3,
                             papyrus: 6})
      ];
      var theme = Object.create(proto);
      theme.init();
      // Doesn't look at the chain
      Object.keys(proto)
        .concat(Object.keys(theme))
        .forEach(function(key) {
          if(typeof theme[key] !== 'function') {
            theme[key] = constantly(theme[key]);
          }
        });
      return theme;
    },

    // -------------------------------------------------------------------------

    themes: {
      papyrus: (function() {

        function randomColor() {
          return color(random(['#0000FF', '#CC0000', '#000000']))
            .vary(150).toString();
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
              return [color(oriColor).vary(50).toString(),
                      color(oriColor).vary(50).toString()];
            },

            // Styles
            largeCircle: constantly(
              { 'stroke': "#FFFFFF" }
            )

          });

      } ()),

      // -----------------------------------------------------------------------

      blackNeon: extend(
        new pl.ColorTheme(), {
          background: '#14090C',
          outline: '#332727',
          shadow: '#3A4344',
          highlight: '#41473C',
          largeCircle: constantly({
            'stroke': color("#E7E2C8")
              .alpha(0.5).toString()
          }),
          highlightRect: function() {
            return {
              'stroke': this.outline(),
              'fill': color(this.highlight())
                .alpha(random() * 0.4 + 0.1).toString()
            };
          },

          gradient: function() {
            var oriColor = random(['#ff0000', '#00FFFF', '#FFFF00']);
            return [color(oriColor).vary(100).toString(),
                    color(oriColor).vary(100).toString()];
          }
        }),

      // -----------------------------------------------------------------------

      bluePrint: extend(
        new pl.ColorTheme(), {
          background: '#003355',
          outline: '#E7E2C8',
          shadow: '#003355',
          highlight: '#003355',
          largeCircle: constantly({
            'stroke': color("#E7E2C8")
              .alpha(0.5).toString()
          }),
          gradient: '#003355'
        })
    }
  });

  // ---------------------------------------------------------------------------

  pl.Brush = makeClass({
    constructor: function() {
      this._offset = [0, 0];
    },

    _translatePoint: function(point) {
      var x = Math.round(this._offset[0] + point[0]),
          y = Math.round(this._offset[1] + point[1]);
      return [x, y];
    },

    rect: function(x, y, w, h, attr) {
      this.polyline(
        [[x, y],
         [x + w, y],
         [x + w, y + h],
         [x, y + h]],
        attr);
    },

    circle: function() {},

    finalize: function() {},

    setOffset: function(offset) {
      this._offset = offset;
    },

    setMask: function(mask) {
      this.mask = mask;
    }

  });

  // ---------------------------------------------------------------------------

  pl.LayerBrush = pl.Brush.subclass({
    constructor: function() {
      this.hashmap = [];
    },

    updateSlaveBrush: function() {
      // this.slaveBrush._offset = this._offset;
      // this.slaveBrush.mask = this.mask;
      // this.slaveBrush.canvas = this.canvas;
      this.slaveBrush.paper = this.paper;
    },

    init: function() {
      this.updateSlaveBrush();
      this.slaveBrush.init();
    },

    reset: function() {
      this.updateSlaveBrush();
      this.slaveBrush.reset();
    },

    setCanvas: function(canvas) {
      this.slaveBrush.setCanvas(canvas);
    },

    polyline: function(points, attributes, commandObject) {
      var foundRow;
      this.hashmap.some(function(row) {
        if (row[0] === commandObject) {
          row.push(points);
          foundRow = row;
          return true;
        }});
      if (foundRow) {
        return;
      } else {
        this.hashmap.push(
          [commandObject,
           'polyline',
           attributes,
           points]
        );
      }
    },

    circle: function(point, radius, attributes, commandObject) {
      var foundRow;
      this.hashmap.some(function(row) {
        if (row[0] === commandObject) {
          row.push([point, radius]);
          foundRow = row;
          return true;
        }});
      if (foundRow) {
        return;
      } else {
        this.hashmap.push(
          [commandObject,
           'circle',
           attributes,
           [point, radius]]
        );
      }
    },

    finalize: function() {
      var self = this;
      this.updateSlaveBrush();
      this.hashmap.forEach(function(elem) {
        if (elem[1] === 'polyline') {
          elem.slice(3).forEach(function(points) {
            self.slaveBrush.polyline(points, elem[2]);
          });
        } else if (elem[1] === 'circle') {
          elem.slice(3).forEach(function(spec) {
            self.slaveBrush.circle(spec[0], spec[1], elem[2]);
          }); }});
    },

    setOffset: function(offset) {
      this.slaveBrush._offset = offset;
    },

    setMask: function(mask) {
      this.slaveBrush.mask = mask;
    }
  });

  // ---------------------------------------------------------------------------

  pl.RaphaelBrush = pl.Brush.subclass({
    constructor: function() {
      this.mask = [0, 0, 0, 0];
      this.paper = null;
      this._offset = [0, 0];
    },

    init: function() {
      this.paper = new Raphael(
        0, 0,
        window.innerWidth,
        window.innerHeight
      );
      this.init = ignore;
    },

    reset: function() {
      this.paper.clear();
      this.paper.setSize(
        window.innerWidth,
        window.innerHeight
      );
    },

    translateAttributes: function(attributes) {
      var attr = extend({}, attributes);
      switch (attr['stroke-style']) {
      case 'dotted':
        attr['stroke-dasharray'] = '.';
        break;
      case 'dashed':
        attr['stroke-dasharray'] = '-';
        break;
      }
      if (attr.fill instanceof Array) {
        attr.fill = '45-' +
          attr.fill[0] + ':5-' +
          attr.fill[1] + ':95';
      }
      delete attr['stroke-style'];
      return attr;
    },

    polyline: function(points, attributes) {
      if (rectanglesOverlap(this.mask,
                            pointsToRect.apply(null, points)))
      {
        var adjPoints = points.map(this._translatePoint, this),
            pathString = 'M'.concat(adjPoints.map(function(pair) {
              return pair[0] + ' ' + pair[1];
            }).join('L'), 'Z');
        this.paper.path(pathString)
          .attr(this.translateAttributes(attributes));
      }
    },

    circle: function(point, radius, attributes) {
      var rect = [
        point[0] - radius,
        point[1] - radius,
        radius * 2,
        radius * 2
      ];
      // The mask is unadjusted
      if (rectanglesOverlap(rect, this.mask)) {
        var adjPoint = this._translatePoint(point);
        this.paper.circle(adjPoint[0], adjPoint[1], radius)
          .attr(this.translateAttributes(attributes));
      }
    }
  });

  // ---------------------------------------------------------------------------

  pl.CanvasBrush = pl.Brush.subclass({
    constructor: function() {
      this.canvas = null;
    },

    setCanvas: function(canvas) {
      this.canvas = canvas;
    },

    init: function() {
      this.context = this.canvas.getContext('2d');
    },

    applyStyle: function(attributes, rect) {
      /*jshint sub:true*/
      var ctx = this.context;
      ctx.save();
      if (attributes['stroke-width']) {
        ctx.lineWidth = attributes['stroke-width'];
      }
      if (ctx.setLineDash) {
        switch (attributes['stroke-style']) {
        case 'dotted':
          ctx.setLineDash([2]);
          break;
        case 'dashed':
          ctx.setLineDash([10, 4]);
          break;
        }
      }
      if (attributes['fill']) {
        if (attributes['fill'] instanceof Array) {
          var grd = ctx.createLinearGradient(
            rect[0],
            rect[1],
            rect[2] + rect[0],
            rect[3] + rect[1]
          );
          grd.addColorStop(0, attributes['fill'][0]);
          grd.addColorStop(1, attributes['fill'][1]);
          this.context.fillStyle = grd;
        } else {
          this.context.fillStyle = attributes['fill'];
        }
        ctx.fill();
      }
      if (attributes['stroke'] &&
          attributes['stroke-width'] !== 0) {
        this.context.strokeStyle = attributes['stroke'];
        ctx.stroke();
      }
      ctx.restore();
    },

    reset: function() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      // Unnecessary?
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // this.context.fillStyle = '#FF0000';
      // this.context.strokeStyle = '#0000FF';
      // this.context.lineWidth = 3;
    },

    polyline: function(points, attributes) {
      var ctx = this.context,
          adjPoints = points.map(this._translatePoint, this);
      ctx.beginPath();
      ctx.moveTo.apply(ctx, adjPoints[0]);

      adjPoints.slice(1).forEach(function(point) {
        ctx.lineTo.apply(ctx, point);
      });
      if (adjPoints.length > 2) {
        ctx.closePath();
      }
      this.applyStyle(attributes, pointsToRect.apply(null, adjPoints));
    },

    circle: function(point, radius, attributes) {
      var adjPoint = this._translatePoint(point),
          ctx = this.context;
      function circleRect() {
        var pointTL = adjPoint.slice(0),
            pointBR = adjPoint.slice(0);
        pointTL[0] -= radius;
        pointTL[1] -= radius;
        pointBR[0] += radius;
        pointBR[1] += radius;
        return pointsToRect(pointTL, pointBR);
      }
      ctx.beginPath();
      ctx.arc(adjPoint[0], adjPoint[1], radius, 0, 2 * Math.PI, false);
      this.applyStyle(attributes, circleRect());
    }
  });

  // ---------------------------------------------------------------------------

  pl.Compass = pl.Brush.subclass({
    constructor: function() {
      this._objectRects = [];
      this._outerBoundaries = undefined;
    },
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

      adjustOuterBoundaries([rect[0], rect[1]]);
      if (rect.length === 4) {
        adjustOuterBoundaries([rect[0] + rect[2],
                               rect[1] + rect[3]]);
      }
    },

    getOuterRect: function(adjusted) {
      if ( ! this._outerBoundaries) {
        throw new Error('Boundaries not calculated');
      }
      var ob = this._outerBoundaries,
          points = [this._outerBoundaries.slice(0, 2),
                    this._outerBoundaries.slice(2, 4)];
      // if (adjusted) {
      //   points = points.map(function(point) {
      //     return [point[0] + this._offset[0],
      //             point[1] + this._offset[1]];
      //   },
      //                       this);
      // }
      return points[0].concat(
        [points[1][0] - points[0][0],
         points[1][1] - points[0][1]]
      );
    },

    polyline: function(points) {
      var rectPoints = pointsToRect.apply(null, points);
      this.trackIt(rectPoints);
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

  pl.Painter = makeClass({
    constructor: function(properties) {
      // this.compass = new pl.Compass();
      this.point = [0, 0];
      this.zoom = 4;
      this.angleRotation = 0;
    },

    // up, right, down, left
    directions: Object.freeze(['forward', 'right', 'back', 'left']),
    reset: function() {
      this.point = [0, 0];
      this.brush.reset();
      this.compass.reset();
    },

    init: function() {
      this.brush.init();
    },

    destroy: function() {
      this.brush.destroy();
    },

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

    line: function(length, direction, style, commandObject) {
      var oldPoint = this.point.slice(0);
      this.move(length, direction);
      var points = [oldPoint, this.point];
      this.brush.polyline(points, style, commandObject);
    },

    circle: function(radius, style, commandObject) {
      var adjRadius = radius * this.zoom;
      this.brush.circle(this.point, adjRadius, style, commandObject);
    },

    rect: function(width, height, style, commandObject) {
      // this.brush.rect()
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
      this.brush.polyline(allPoints, style, commandObject);
      this.point = allPoints[2];
    },

    move: function(length, direction) {
      if ( ['forward', 'right', 'back', 'left']
           .indexOf(direction) === -1)
      {
        throw new Error('Illegal direction: ' + direction);
      }

      var original = this.point.slice(0),
          translatedPoint = this.directionTranslate(
            this.point, length, direction);
      this.point = translatedPoint;
    },

    rotate: function(reverse) {
      var newAngle = this.angleRotation + (Math.PI / 2) * (reverse ? -1 : 1);
      if (newAngle < 0) {
        newAngle += Math.PI * 2;
      }
      this.angleRotation = newAngle;
    },

    rotateAngle: function(angle) {
      var newAngle = this.angleRotation + angle;
      if (newAngle < 0) {
        newAngle += Math.PI * 2;
      }
      this.angleRotation = newAngle;
    },

    measure: function(composition) {
      var oriBrush = this.brush,
          oriPoint = this.point.slice(0);

      this.compass.zoom = this.zoom;
      // this.compass.angleRotation = this.angleRotation;
      this.brush = this.compass;
      this._walker(composition);
      this.brush = oriBrush;
      this.point = oriPoint;
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
            if ( ! (self.brush instanceof pl.Compass &&
                    stamp.dontMeasure)) {
              self[stamp[0]].apply(self, stamp.slice(1).concat([stamp]));
            }}});
    },

    setBackground: function(color) {
      document.documentElement.style.background = color;
    },

    drawComposition: function(composition) {
      function isVisible(rect) {
        return rectanglesOverlap(rect, windowTranslatedRect);
      }
      var offset, mask,
          self = this,
          windowCenter = [
            window.innerWidth / 2,
            window.innerHeight / 2
          ];

      this.reset();
      this.measure(composition);

      // No offset
      var outerRect = this.compass.getOuterRect();
      var imageCenter = [
        outerRect[0] + outerRect[2] / 2,
        outerRect[1] + outerRect[3] / 2
      ];
      offset = [
        Math.round(windowCenter[0] - imageCenter[0]),
        Math.round(windowCenter[1] - imageCenter[1])
      ];
      this.brush.setOffset(offset);
      var windowTranslatedRect =
          pointsToRect.apply(
            null,
            rectToPoints([0, 0, window.innerWidth, window.innerHeight])
              .map(
                function(point) {
                  return [
                    point[0] - offset[0],
                    point[1] - offset[1]
                  ];
                },
                this));

      var someVisible = this.compass._objectRects.some(isVisible);

      if (pl.debug) {
        this.compass._objectRects.filter(function(rect) {
          return rectanglesOverlap(rect, windowTranslatedRect);
        }).forEach(function(rect) {
          self.brush.rect(
            rect[0],
            rect[1],
            rect[2],
            rect[3],
            {'stroke': 'lime',
             'stroke-width': 3
            });
        });
      }

      if (! someVisible) {
        if (pl.debug) {
          console.log('invisible');
        }
        return false;
      } else {
        this.brush.setMask(windowTranslatedRect);
        // this.mask = [
        //   windowTranslatedRect[0] + 200,
        //   windowTranslatedRect[1] + 200,
        //   windowTranslatedRect[2] - 400,
        //   windowTranslatedRect[3] - 400
        // ];
      }

      if (pl.debug) {
        this.brush.rect(
          windowTranslatedRect[0],
          windowTranslatedRect[1],
          windowTranslatedRect[2],
          windowTranslatedRect[3],
          {'stroke-width': 4,
           'stroke': 'blue'});
      }
      this.setBackground(composition.background);

      this._walker(composition);
      if (pl.debug) {
        this.brush.rect(
          outerRect[0],
          outerRect[1],
          outerRect[2],
          outerRect[3],
          {'stroke-width': 2,
           'stroke': 'red'}
        );
      }
      this.brush.finalize();
      return true;
    }

  });

  // ---------------------------------------------------------------------------

  pl.painterFactory = {
    make: function(attributes) {
      var painter = new pl.Painter();
      var brush;
      if (attributes.type === 'svg') {
        brush = new pl.RaphaelBrush();
      } else {
        brush = new pl.CanvasBrush();
      }
      painter.brush = new pl.LayerBrush({
        slaveBrush: brush
      });
      delete attributes.type;
      if (attributes) {
        extend(painter.brush, attributes.brushAttributes);
        delete attributes.brushAttributes;
      }
      painter.compass = new pl.Compass();
      if (attributes) {
        extend(painter, attributes);
      }
      painter.init();
      return painter;
    }
  };

  // ---------------------------------------------------------------------------

  pl.compositionFactoryFactory = {
    make: function(attributes) {
      var colorThemeFactory = new pl.ColorThemeFactory(),
          stampFactory = new pl.StampFactory(
            {colorThemeFactory: colorThemeFactory}),
          compositionFactory = new pl.CompositionFactory(
            {colorThemeFactory: colorThemeFactory,
             stampFactory: stampFactory});
      return compositionFactory;
    }
  };

  // ---------------------------------------------------------------------------

  pl.StampFactory = makeClass({
    reset: function() {
      var iterator = makeLooper(rotateArray(['dotted', 'none', 'dashed', 'none'],
                                            random(4)));

      this.recipes.largeCircle = {
        probability: 20,
        maxLength: 1,
        func: function() {
          var dashStyle = iterator();
          var circle = [
            'circle',
            random(10, 300),
            { 'stroke-width': (dashStyle === 'none') ? 1 : 2,
              'stroke-style' : dashStyle
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
      this.init = ignore;
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
        if (this.colorTheme &&
            this.colorTheme[option]) {
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
                   random([{ 'stroke-style' : 'dashed' },
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
          var dimensions = [random(1, 3), random(3, 20)];
          if (random(2)) {
            dimensions = rotateArray(dimensions);
          }
          return ['rect',
                  dimensions[0],
                  dimensions[1],
                  { 'stroke-width': 2 }]; }
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
  });

  // ---------------------------------------------------------------------------

  pl.CompositionFactory = makeClass({
    constructor: function(properties) {
      this.depth = 5;
      this.sequenceLength = 15;
    },

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
      this.stampFactory.reset();
      this.stampFactory.colorTheme = colorTheme;
      this.stampFactory.recipes.largeCircle.func = wrap(
        this.stampFactory.recipes.largeCircle.func,
        function(oriFunc) {
          if (largeCircleLimit) {
            largeCircleLimit--;
            return oriFunc.call(this);
          } else {
            return [0, []];
          }
        }
      );

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
  });

  // -----------------------------------------------------------------------------

  pl.Previewer = makeClass({
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
  });
}());
