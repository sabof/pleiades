/*global generator:true, composition:true, brush:true, pl, init, SeedRandom, describe, it, xit, expect, jasmine*/

var plt = {};

SeedRandom.seed('test');

// -----------------------------------------------------------------------------

function test_directionTranslate() {
  brush = pl.painterFactory.make();
  console.log(
    [brush.directionTranslate([0,0], 5, 'up'),
     brush.directionTranslate([0,0], 5, 'right'),
     brush.directionTranslate([0,0], 5, 'down'),
     brush.directionTranslate([0,0], 5, 'left')
    ]
  );
}

function test_zoomer() {
  init();
  composition = [
    [['rotate', true], ['move', 10, 'right']],
    [['rect', 3, 3, {'fill' : '#aa0044'}]
     // ['line', 1, 'right']
    ]
  ];
  composition[0].push(generator._makeZoomer(composition[1]));
  // composition[0].push([2, composition[1]]);
  composition = [[4, composition[0]]];
  // composition = composition[0];
  // brush = pl.painterFactory.make();
  brush.init();
  brush.drawComposition(composition);
}

function test_angleRotator() {
  pl.debug = true;
  var painter = pl.painterFactory.make();
  // painter.angleRotation = Math.PI;
  painter.angleRotation = 0;
  painter.zoom = 4;
  composition = [
    [['move', 10, 'right']],
    [ ['rect', 4, 4, {'fill' : '#aa0044'}],
      ['circle', 1, {'fill' : '#aa0044'}],
      ['line', 4, 'right'],
      ['line', 4, 'forward'],
      ['line', 4, 'left'],
      ['line', 4, 'back']
    ]
  ];
  composition[0].push([2, composition[1]]);
  composition = [[4, composition[0]]];
  painter.init();
  painter.drawComposition(composition);
}

function test_zoomAlignement() {
  init();
  composition = [
    [['rotate', true], ['move', 10, 'right']],
    [['rect', 4, 4, {'fill' : '#aa0044'}],
     ['line', 2, 'left'],
     ['line', 2, 'forward'],
     ['circle', 2] ]
  ];
  composition[0].push(generator._makeZoomer(composition[1], 4));
  // composition[0].push([2, composition[1]]);
  composition = [[4, composition[0]]];
  // composition = composition[0];
  // brush = pl.painterFactory.make();
  brush.init();
  brush.drawComposition(composition);
}

function test_simpleRepeater() {
  generator = new pl.CompositionFactory();
  composition = [
    [['line', 30, 'back', {'stroke': 'black'}]],
    [['rect', 30, -30, {'fill' : '#aa0044', 'stroke': 'black'}],
     ['line', 10, 'right', {'stroke': 'black'}]]
  ];
  composition[0].push([4, composition[1]]);
  composition = composition[0];
  var painter = pl.painterFactory.make(
    {zoom: 1,
     brushAttributes: {canvas: document.getElementById('pleiades-canvas')}});
  painter.init();
  painter.drawComposition(composition);
  console.log(JSON.stringify(painter.compass.getOuterRect()));
}

function test_rotator() {
  generator = pl.compositionFactoryFactory.make();
  composition = [
    [['line', 30, 'down'],
     ['line', 30, 'right']],
    [['rect', 30, 20, {'fill' : 'blue'}],
     ['rect', 30, 20, {'fill' : 'blue'}],
     ['line', 30, 'right'],
     ['rotate', true]
    ]
  ];
  composition[0].push([4, composition[1]]);
  composition = composition[0];
  brush = pl.painterFactory.make();
  brush.init();
  brush.drawComposition(composition);
}

function test_centerer() {
  generator = pl.compositionFactoryFactory.make();
  composition = [
    [],
    [['rect', 30, 30, {'fill' : '#aa0044'}],
     ['line', 10, 'right']]
  ];
  composition[0].push([4, composition[1]]);
  composition = composition[0];
  brush = pl.painterFactory.make();
  brush.init();
  brush.drawComposition(composition);
}

function fault_1316() {
  SeedRandom.setState("B7PKeDvts66hCVEMaMzEA1JeWF1/c46d4t7u2G/h+FDR45i1k0F9w8+a3As2Z/1APa1tzkyJlqm0qJGLNQ8W4KYa1dbrSke8769NLzPBdfOKGKsjCFt5Od1Ztp+cdPWbQwUrT2yqHTCxzW77IYAn2oImMnJcEpCI5tskG+gAg0bC5cWFj0gEESmiVNct9GC7VWmsuQH+TnAfLqe4pV/Q9weSxiBhnvZ+3yX8+VNXfMhWKD8ThmYcy780wNmEl5W3RaONew16QsfJpGXk6bAsKkkxArJkcYfyIgZjFw5i/wp30xmU7IHSFVq+uqB2PvFqa+rn1Po4SzrwFJm9NxAePIxE");
  var generator = (function () {
    var colorThemeFactory = new pl.ColorThemeFactory(),
        stampFactory = new pl.StampFactory(colorThemeFactory);

    return pl.compositionFactoryFactory.make({
      depth: 4,
      sequenceLength: 15,
      stampFactory: stampFactory,
      colorThemeFactory: colorThemeFactory
    });
  }());
  SeedRandom.seed('1316');
  return generator.make();
}


plt.isStampValid = function(pattern) {
  if (typeof pattern === 'function') {
    return true;
  }
  if ( ! (pattern instanceof Array)) {
    throw new Error('A stamp must be an array, or a function');
  }
  if (typeof pattern[0] === 'number') {
    if ( ! pattern[1] instanceof Array) {
      throw new Error('Second member of the repeater should be an Array');
    }
    return this.isSequenceValid.call(this, pattern[1]);
    // return true;
  } else if (typeof pattern[0] === 'string') {
    if (['move', 'line', 'circle', 'rect', 'rotate', 'reflect', 'rotateAngle']
        .indexOf(pattern[0]) === -1)
    {
      throw new Error('Invalid keyword: ' + pattern[0]);
    }
  } else {
    throw new Error('The first member of a stamp should be a number or a string: ' +
                   pattern);
  }
  return true;
}.bind(plt);

plt.isSequenceValid = function(sequence) {
  return sequence &&
    sequence instanceof Array &&
    sequence.every(this.isStampValid);
}.bind(plt);

function test_simpleDrawing() {
  // var composition = [
  //   [['rect', 30, 30, {'fill' : '#aa0044'}],
  //    ['line', 10, 'right']]
  // ],
  brush = pl.painterFactory.make();
  brush.init();
  brush.move(5, 'down');
  brush.move(5, 'right');
  brush.line(5, 'right');
}

function makeReporter(name, returnValue) {
  return function () {
    var prettyArguments =
        Array.prototype.map.call(
          arguments,
          function(argument) {
            return JSON.stringify(argument); })
        .join(', ');
    jasmine.log(name + '(' + prettyArguments + ')');
    return returnValue;
  };
}

function MockPaper() {
  // console.log(arguments);
  var self = this;
  ['clear', 'setSize', 'path', 'rect', 'circle']
    .forEach(function(method) {
      // self[method] = makeReporter(method, {attr: function() {}});
      self[method] = function () { return {attr: function() {}}; };
    });
}

// -----------------------------------------------------------------------------

describe('Ranges', function() {
  var validRanges = [
    [[5, 15], [10, 20]]
  ];
  var invalidRanges = [
    [[5, 10], [10, 20]]
  ];
  validRanges.forEach(function(range) {
    it(JSON.stringify(range) + ' should overlap')
      .expect(pl.util.rangesOverlap.apply(pl.util, range))
      .toBeTruthy();
  });
  invalidRanges.forEach(function(range) {
    it(JSON.stringify(range) + ' should not overlap')
      .expect(pl.util.rangesOverlap.apply(pl.util, range))
      .toBeFalsy();
  });
});

// -----------------------------------------------------------------------------

describe('Rectangles', function() {
  var validRects = [
    [[0, 0, 10, 10],
     [5, 5, 10, 10]]
  ];
  var invalidRects = [
    [[0, 0, 10, 10],
     [10, 10, 10, 10]]
  ];
  validRects.forEach(function(rect) {
    it(JSON.stringify(rect) + ' should overlap')
      .expect(pl.util.rectanglesOverlap.apply(pl.util, rect))
      .toBeTruthy();
  });
  invalidRects.forEach(function(rect) {
    it(JSON.stringify(rect) + ' should not overlap')
      .expect(pl.util.rectanglesOverlap.apply(pl.util, rect))
      .toBeFalsy();
  });
});

// -----------------------------------------------------------------------------

describe("Stamp validator", function() {
  var validStamps = [
    "['circle', 5]",
    "['rect', -5, 5]",
    '["move", 6, "down"]',
    '["line", 6, "right", {"stroke-width":3}]',
    "[4, [['rect', -5, 5]]]",
    "['rotate', true]",
    '["rect",-2,9, {"stroke-width": 2}]',
    '(function () {})'
  ];
  var invalidStamps = [
    "[]",
    "{}",
    "'notastamp'",
    "5"
  ];
  validStamps.forEach(function(stamp) {
    it('should allow ' + stamp)
      .expect(plt.isStampValid(eval(stamp)))
      .toBeTruthy();
  });
  invalidStamps.forEach(function(stamp) {
    it('should forbid ' + stamp)
      .expect(function () { plt.isStampValid(eval(stamp)); })
      .toThrow();
  });
});

// -----------------------------------------------------------------------------

describe("Sequence validator", function() {
  var validSequences = [
    "[]",
    "[['rect', -5, 5]]",
    "[[4, [['rect', -5, 5]]]]",
    "[[4, [['rect', -5, 5], [4, [['rect', -5, 5]]]]]]"
  ];
  validSequences.forEach(function(sequence) {
    it('should allow ' + sequence)
      .expect(plt.isSequenceValid(eval(sequence)))
      .toBeTruthy();
  });
});

// -----------------------------------------------------------------------------

describe('sequenceFactory', function() {
  var colorThemeFactory = new pl.ColorThemeFactory(),
      factory = new pl.StampFactory({colorThemeFactory: colorThemeFactory}),
      recipes = factory.getOptions();
  recipes.forEach(function(recipe) {
    it('should produce a valid \"' + recipe + '\" stamp')
      .expect(plt.isStampValid(factory.make(recipe)))
      .toBeTruthy();
  });
});

// -----------------------------------------------------------------------------

describe("CompositionFactory", function() {
  var colorThemeFactory = new pl.ColorThemeFactory(),
      stampFactory = new pl.StampFactory(colorThemeFactory.make());
  stampFactory.init();
  generator = pl.compositionFactoryFactory.make({
    colorThemeFactory: colorThemeFactory,
    stampFactory: stampFactory
  });
  generator.sequenceLength = 4;
  generator.depth = 5;
  composition = generator.make();
  it("should create valid compositions 1")
    .expect(plt.isSequenceValid(composition))
    .toBeTruthy();
});

// -----------------------------------------------------------------------------

describe("Compass", function() {
  var compass = new pl.Compass(),
      painter = new pl.Painter({brush: compass,
                                compass: compass,
                                zoom: 1}),
      outerRect,
      composition;

  // ---------------------------------------------------------------------------

  compass.polyline([[-5, -6], [0, 0]]);
  outerRect = compass.getOuterRect();
  it('When a line is drawn the boundaries shoudld be adjusted (result: ' +
     JSON.stringify(outerRect) + ')').
    expect(outerRect[0] === -5 &&
           outerRect[1] === -6 &&
           outerRect[2] === 5 &&
           outerRect[3] === 6
          ).toBeTruthy();

  compass.reset();

  compass.rect(0, 0, 5, 6);
  outerRect = compass.getOuterRect();
  it('When a rectangle is drawn the boundaries shoudld be adjusted (result: ' +
     JSON.stringify(outerRect) + ')').
    expect(outerRect[0] === 0 &&
           outerRect[1] === 0 &&
           outerRect[2] === 5 &&
           outerRect[3] === 6
          ).toBeTruthy();

  // ---------------------------------------------------------------------------

  it('Outer rect should consist of numbers')
    .expect(outerRect.every(function(boundary) {
      var composition = [
        ["line",5, "left", {"stroke-width":2}],
        ["circle",8, {"stroke-width":0}]
      ];
      painter.reset();
      painter.measure(composition);
      outerRect = compass.getOuterRect();
      return (typeof boundary === 'number') &&
        ! isNaN(boundary);
    })).toBeTruthy();

  // ---------------------------------------------------------------------------

  it('Rotating a sequence should levave the point in the same place')
    .expect(function() {
      var composition = [
        [['rotate', true], ['move', 10, 'right']],
        [['rect', 3, 3, {'fill' : '#aa0044'}]
        ] ];
      composition[0].push(generator._makeZoomer(composition[1]));
      composition.unshift([4, composition[0]]);
      painter.reset();
      painter.measure();
      return compass.point[0] === 0 && compass.point[1] === 0;
    }).toBeTruthy();

  // ---------------------------------------------------------------------------

  describe('Four 5 pixel rectangles one after the other', function() {
    var composition = [[4, [['rect', 5, -5]]]];
    painter.reset();
    painter.measure(composition);
    var outerRect = compass.getOuterRect();
    it(' should have 0 x')
      .expect(outerRect[0])
      .toEqual(0);
    it(' should have 0 y')
      .expect(outerRect[1])
      .toEqual(0);
    it(' should have 20 pixels width')
      .expect(outerRect[2])
      .toEqual(20);
    it(' should have 20 pixels height')
      .expect(outerRect[3])
      .toEqual(20);
  });

  // ---------------------------------------------------------------------------

  painter.measure(fault_1316());
  it("shouldn't throw, or return false2")
    .expect(compass._objectRects)
    .toBeTruthy();

});

// -----------------------------------------------------------------------------

describe("Painter", function() {

  var painter = pl.painterFactory.make(
    {brushAttributes: {canvas: document.createElement('canvas')}}
  );
  painter.paper = new MockPaper();
  it("shouldn't throw, or return false1", function() {
    expect(function () {
      try {
        if (! painter.drawComposition(composition)) {
          throw new Error('Was false');
        }
      } catch (error) {
        return false;
      }
      return true;
    }).toBeTruthy();
  });
});

// -----------------------------------------------------------------------------

describe("angleRotation",  function() {
  it('Should retrun the same number when rotated by 0 radias')
    .expect(function() {
      var result = pl.util.rotate([0, 0], [5, 5], 0);
      return result[0] === 5 && result[1] === 5;
    }).toBeTruthy();
});

describe('color', function() {
  // it()
  pl.util.color('rgba(53, 107, 11, 1)');
});

// Shoudn't move point
// translatePoint
// directionTranslate
