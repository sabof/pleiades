/*global generator:true, composition:true, brush:true, pl, init, SeedRandom, describe, it, expect, jasmine*/

var plt = {};

SeedRandom.seed('test');

// -----------------------------------------------------------------------------

function test_directionTranslate() {
  brush = new pl.RaphaelBrush();
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
  // brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(composition);
}

function test_angleRotator() {
  init();
  pl.debug = true;
  brush.angleRotation = 0.1;
  brush.zoom = 9;
  composition = [
    [['move', 10, 'right']],
    [ ['rect', 6, 6, {'fill' : '#aa0044'}],
      ['circle', 1, {'fill' : '#aa0044'}],
      ['line', 4, 'right'],
      ['line', 4, 'forward'],
      ['line', 4, 'left'],
      ['line', 4, 'back']
    ]
  ];
  composition[0].push([2, composition[1]]);
  composition = [[4, composition[0]]];
  brush.init();
  brush.drawComposition(composition);
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
  // brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(composition);
}

function test_simpleRepeater() {
  generator = new pl.Generator();
  composition = [
    [['line', 30, 'up']],
    [['rect', 30, 30, {'fill' : '#aa0044'}],
     ['line', 10, 'right']]
  ];
  composition[0].push([4, composition[1]]);
  composition = composition[0];
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(composition);
}

function test_rotator() {
  generator = new pl.Generator();
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
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(composition);
}

function test_centerer() {
  generator = new pl.Generator();
  composition = [
    [],
    [['rect', 30, 30, {'fill' : '#aa0044'}],
     ['line', 10, 'right']]
  ];
  composition[0].push([4, composition[1]]);
  composition = composition[0];
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(composition);
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
    if (['move', 'line', 'circle', 'rect', 'rotate', 'reflect']
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

function should() {

}

function test_simpleDrawing() {
  // var composition = [
  //   [['rect', 30, 30, {'fill' : '#aa0044'}],
  //    ['line', 10, 'right']]
  // ],
  brush = new pl.RaphaelBrush();
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
  var factory = pl.stampFactory,
      recipes = pl.stampFactory.getOptions(),
      dishes = recipes.map(function(name) {
        return factory.make(name);
      });
  recipes.forEach(function(recipe) {
    it('should produce a valid \"' + recipe + '\" stamp')
      .expect(plt.isStampValid(factory.make(recipe)))
      .toBeTruthy();
  });
});

// -----------------------------------------------------------------------------

describe("Generator", function() {
  generator = new pl.Generator();
  generator.sequencesLength = 4;
  generator.depth = 5;
  composition = generator.make();
  it("should create valid compositions")
    .expect(plt.isSequenceValid(composition))
    .toBeTruthy();
});

// -----------------------------------------------------------------------------

describe("Compass", function() {
  var compass = new pl.Compass(),
      outerBoundaries,
      composition;
  window.compass = compass;
  compass.zoom = 1;

  // ---------------------------------------------------------------------------

  compass.line(5, 'left');
  outerBoundaries = compass.getOuterRect();
  it('When a line is drawn the boundaries shoudld be adjusted').
    expect(outerBoundaries[0] === -5 &&
           outerBoundaries[1] === 0 &&
           outerBoundaries[2] === 5 &&
           outerBoundaries[3] === 0
          ).toBeTruthy();

  // ---------------------------------------------------------------------------

  composition = [
    ["line",5, "left", {"stroke-width":2}],
    ["circle",8, {"stroke-width":0}]
  ];
  compass.measure(composition);
  outerBoundaries = compass.getOuterRect();
  it('Outer rect should consist of numbers')
    .expect(outerBoundaries.every(function(boundary) {
      return (typeof boundary === 'number') &&
        ! isNaN(boundary);
    })).toBeTruthy();

  // ---------------------------------------------------------------------------

  it('Rotating a sequence should levave the point in the same place')
    .expect(function() {
      composition = [
        [['rotate', true], ['move', 10, 'right']],
        [['rect', 3, 3, {'fill' : '#aa0044'}]
        ] ];
      composition[0].push(generator._makeZoomer(composition[1]));
      composition.unshift([4, composition[0]]);
      compass.measure();
      return compass.point[0] === 0 && compass.point[1] === 0;
    }).toBeTruthy();

  // ---------------------------------------------------------------------------

  composition = [[4, [['rect', 5, 5]]]];
  compass.measure(composition);
  var outerRect = compass.getOuterRect();
  describe('Four 5 pixel rectangles one after the other', function() {
    it(' should have 20 pixels width')
      .expect(outerRect[2])
      .toEqual(20);
    it(' should have 20 pixels height')
      .expect(outerRect[3])
      .toEqual(20);
  });
});

// -----------------------------------------------------------------------------

describe("RaphaelBrush", function() {
  brush = new pl.RaphaelBrush();
  brush.paper = new MockPaper();
  // jasmine.log('log test');
  it("shouldn't throw", function() {
    expect(function () {
      try {
        brush.drawComposition(composition);
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

// Shoudn't move point
// translatePoint
// directionTranslate
