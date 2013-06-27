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
    return false;
  }
  if (typeof pattern[0] === 'number') {
    if ( ! pattern[1] instanceof Array) {
      return false;
    }
    return pattern[1].every(this.isSequenceValid.bind(this));
  } else if (typeof pattern[0] === 'string') {
    return ['move', 'line', 'circle', 'rect'].indexOf(
      pattern[0]) !== -1;
  } else {
    // console.log(pattern);
    throw new Error('The first member of a stamp should be a number or a string');
  }
  return true;
};

plt.isSequenceValid = function(sequence) {
  return sequence &&
    sequence instanceof Array &&
    sequence.every(this.isStampValid.bind(this));
};

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

function test_sequenceFactory() {
  var factory = pl.stampFactory(),
      recipes = factory.getOptions(),
      dishes = recipes.map(function(name) {
        return factory.make(name);
      });

  should(dishes.every(plt.isStampValid.bind(plt)));
  should(pl.sequenceFactory.make() instanceof Array);
  should(plt.isStampValid(["circle", 6]));

}

// -----------------------------------------------------------------------------

describe("Generator", function() {
  SeedRandom.seed('test');
  var generator   = new pl.Generator(),
      composition = generator.make();
  it("should create valid compositions", function() {
    expect(plt.isSequenceValid(composition))
      .toBeTruthy();
  }
    );
});
