/*global generator:true, sequences:true, brush:true, pl*/

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
  var generator = new pl.Generator();
  var sequences = [
    [['line', 30, 'up']],
    [['rect', 30, 30, {'fill' : '#aa0044'}],
     ['line', 10, 'right']]
  ];
  sequences[0].push([4, sequences[1]]);
  var brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(sequences);
}

function test_rotator() {
  generator = new pl.Generator();
  sequences = [
    [['line', 30, 'down'],
     ['line', 30, 'right']],
    [['rect', 30, 20],
     ['rect', 30, 20],
     ['line', 30, 'right'],
     ['rotate', true]
    ]
  ];
  sequences[0].push([2, sequences[1]]);
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(sequences);
}

function test_centerer() {
  generator = new pl.Generator();
  sequences = [
    [],
    [['rect', 30, 30, {'fill' : '#aa0044'}],
     ['line', 10, 'right']]
  ];
  sequences[0].push([4, sequences[1]]);
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawComposition(sequences);
}

function isPatternValid(pattern) {
  return (pattern instanceof Array &&
          (typeof pattern[0] === 'number' ||
           typeof pattern[0] === 'string')
         );
}

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
  should(pl.sequenceFactory.make() instanceof Array);
  should(isPatternValid(["circle", 6]));

}
