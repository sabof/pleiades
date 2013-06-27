/*global generator:true, composition:true, brush:true, pl, SeedRandom, describe, it, expect*/

var plt = {};

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
  if ( ! pattern instanceof Array) {
    throw new Error('A stamp must be an array');
  }
  if (typeof pattern[0] === 'number') {
    if ( ! pattern[1] instanceof Array) {
      throw new Error('Second member of the repeater should be an Array');
    }
    return this.isSequenceValid.call(this, pattern[1]);
    // return true;
  } else if (typeof pattern[0] === 'string') {
    if (['move', 'line', 'circle', 'rect', 'rotate'].indexOf(pattern[0]) === -1) {
      throw new Error('Invalid keyword: ' + pattern[0]);
    }
  } else {
    // console.log(pattern);
    throw new Error('The first member of a stamp should be a number or a string');
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

function MockPaper() {
  function makeReporter(name) {
    var prettyArguments = String.prototype.concat.apply(
      '',
      Array.prototype.map.call(
        arguments,
        function(argument) {
          return argument.toString();
        }));
    console.log(name + ' ' + prettyArguments);
    return {attr: function() {}};
  }
  // console.log(arguments);
  var self = this;
  ['clear', 'setSize', 'path', 'rect', 'circle']
    .forEach(function(method) {
      self[method] = makeReporter(method);
    });
}

// -----------------------------------------------------------------------------

SeedRandom.seed('test');

// -----------------------------------------------------------------------------

describe("Stamp validator", function() {
  var validStamps = [
    "['circle', 5]",
    "['rect', -5, 5]",
    '["move", 6, "down"]',
    '["line", 6, "right", {"stroke-width":3}]',
    "[4, [['rect', -5, 5]]]",
    "['rotate', true]",
    '["rect",-2,9, {"stroke-width": 2, "stroke-opacity": 1, "fill-opacity": 1, "fill": "#0000fb"}]'
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
  generator   = new pl.Generator();
  generator.sequencesLength = 4;
  generator.depth = 2;
  composition = generator.make();
  it("should create valid compositions", function() {
    expect(plt.isSequenceValid(composition))
      .toBeTruthy();
  }
    );
});

// -----------------------------------------------------------------------------

describe("RaphaelBrush", function() {
  brush = new pl.RaphaelBrush();
  brush.paper = new MockPaper();
  it("shouldn't throw", function() {
    expect(function () {
      try {
        brush.drawComposition(composition);
      } catch (error) {
        return false;
      }
      return true; })
      .toBeTruthy();
  });
});
