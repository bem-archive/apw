var jobs = require('../lib/parts/jobs.js').newJobs();

function sleep(ms) {
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + ms);
}

jobs.pushJob({ run: function() { console.log('job.run: job#0'); sleep(1000); return 10; }},
             function(result) { console.log('job#0 finished: ' + result); } );
jobs.pushJob({ run: function() { console.log('job.run: job#1'); return 20; }},
             function(result) { console.log('job#1 finished: ' + result); } );
jobs.pushJob({ run: function() { console.log('job.run: job#2'); return 30; }},
             function(result) { console.log('job#2 finished: ' + result); } );
jobs.pushJob({ run: function() { console.log('job.run: job#3'); return 40; }},
             function(result) { console.log('job#3 finished: ' + result); } );
jobs.pushJob({ run: function() { console.log('job.run: job#4'); return 50; }},
             function(result) { console.log('job#4 finished: ' + result); } );
jobs.pushJob({ run: function() { console.log('job.run: job#5'); return 60; }},
             function(result) { console.log('job#5 finished: ' + result); } );
jobs.pushJob({ run: function() { console.log('job.run: job#6'); return 70; }},
             function(result) { console.log('job#6 finished: ' + result); } );

jobs.runNext();