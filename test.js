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
  generator = new pl.Generator();
  sequences = [
    [['line', 30, 'up']],
    [['rect', 30, 30, {'fill' : '#aa0044'}],
     ['line', 10, 'right']]
  ];
  sequences[0].push([4, sequences[1]]);
  brush = new pl.RaphaelBrush();
  brush.init();
  brush.drawSequence(sequences);
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
  brush.drawSequence(sequences);
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
  brush.drawSequence(sequences);
}
