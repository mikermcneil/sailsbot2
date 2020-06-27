// sailsbot2, electric boogaloo

let _ = require('lodash');


let SIMULATION_LENGTH = 500;
let SIMULATION_FRAME_RATE_MS = 10;

let BASE_SALIENCE_BOOST = 1;
let MAX_SALIENCE = 255;
let NEW_LEARNING_RATE_PERCENT = 75;
let GOOF_STANDARD_PROBABILITY_PERCENT = 95;
let GOOF_FOREGROUND_PROBABILITY_PERCENT = 99;



// Load memories from disk, or fall back to default memories.
let memoriesBySrl;
try {
  memoriesBySrl = JSON.parse(require('fs').readFileSync('.memories', 'utf8'));
  require('assert')(_.isObject(memoriesBySrl));
} catch (unusedErr) {
  memoriesBySrl = {
    'coffee maker': {[MAX_SALIENCE]:'chrome',89:'bitter',88:'gold tape',60:'gurgling'},
    // ^srl          ^salience (Ω)

    'gold tape': {100:'mike',10:'sticky'},
    'sticky': {150:'unpleasant'},
    'eric\'s voice': {100:'footsteps',30:'opening door',5:'treat bag'},
    'opening door': {60:'footsteps',20:'terror',5:'rachael'},
    'footsteps': {30:'terror',5:'rachael'},
    'rachael': {209:'treat bag'},
    'terror': {5:'fireworks',3:'eric\'s voice'},
  };

  // // Apply some chaos:
  // for (let i=0; i<100; i++) {
  //   // let ngram = require('faker').random.words();
  //   let ngram = require('faker').company.catchPhraseNoun();

  //   memoriesBySrl[ngram] = {};
  //   // let salience = Math.floor(MAX_SALIENCE*Math.random());
  // }//∞
}




(async()=>{

  await think('eric\'s voice');
  await think('coffee maker');
  await think('rachael');
  for (let i=0; i<SIMULATION_LENGTH; i++){
    let srl;
    if (2 > 10*Math.random()) {
      srl = require('faker').company.catchPhraseNoun();
    } else {
      srl = _.sample(Object.keys(memoriesBySrl));
    }

    await think(srl);
  }//∞

  console.log();
  console.log();
  console.log('Results');
  console.log('====================');
  console.log(memoriesBySrl);

  require('fs').writeFileSync('.memories', JSON.stringify(memoriesBySrl));

})()
.catch((err)=>{
  console.log(
    `Oh no.  Something has gone wrong.
    I'm terribly sorry.
  `, err);
});


async function think(stimulus) {

  console.log();
  await pause(SIMULATION_FRAME_RATE_MS*15);

  let srl = stimulus;// SRL (Semantic Resource Locator)
  let prevSrl = _.sample(Object.keys(memoriesBySrl).filter((srl) => srl.match(/^¡/))) || _.sample(Object.keys(memoriesBySrl));//« a random foreground memory, or failing that, a random memory

  let distractedness = 0;
  for (let step=0; step<80; step++) {

    if (distractedness > (step*4*Math.random()) + 5) {
      break;
    }

    process.stdout.write(`${_.repeat(' ', Math.max(1,Math.floor(distractedness)))}${step === 0? '•' :'·'} ${srl}`);

    let isInForeground = recognize(!srl.match(/^¡+/)? `¡${srl}` :srl);

    let didGoof;
    let nextSrl;
    while (!nextSrl) {
      distractedness++;

      // goof
      if (
        isInForeground && GOOF_FOREGROUND_PROBABILITY_PERCENT > (100*Math.random())
        ||
        GOOF_STANDARD_PROBABILITY_PERCENT > (100*Math.random())
      ) {} else {
        didGoof = true;
      }

      if (didGoof) {
        nextSrl = _.sample(Object.keys(memoriesBySrl));
      } else {
        nextSrl = await perceive(srl, prevSrl);
        // let isNextInForeground = nextSrl && recognize(!nextSrl.match(/^¡+/)? `¡${nextSrl}` :nextSrl);
        // if (!nextSrl) {
        //   nextSrl = prevSrl;
        // }//ﬁ
      }
    }//∞


    process.stdout.write(`${didGoof? '…' :''}`);
    console.log('');

    prevSrl = srl;
    srl = nextSrl;

    if (didGoof) {
      break;
    }//•

  }//∞

}




async function perceive(srl, prevSrl) {

  await pause(SIMULATION_FRAME_RATE_MS*1);
  let recollections = recognize(srl);
  // console.log(`perceive (srl: "${srl}")  recollections:`, recollections);

  if (!recollections) {
    fixate(srl, prevSrl);
    return;
  }//•

  // old way:
  // ```
  // let recollection = _.sample(recollections);
  // ```
  //
  // new way:
  let recollection;
  let salienceLevels = _.sortBy(Object.keys(recollections).map((salience) => Number(salience)));
  let highestRoll;
  let levelWithHighestRoll;
  for (let salienceLevel of salienceLevels) {
    highestRoll = highestRoll||0;
    levelWithHighestRoll = levelWithHighestRoll||salienceLevel;

    let roll = Math.round(MAX_SALIENCE*Math.random()) + salienceLevel;
    if (roll > highestRoll) {
      highestRoll = roll;
      levelWithHighestRoll = salienceLevel;
    }
  }//∞

  recollection = recollections[`${levelWithHighestRoll}`];

  if (!recollection) {
    return;
  }

  await pause(SIMULATION_FRAME_RATE_MS*7);
  fixate(recollection, srl);

  return recollection;

}


function recognize(srl) {
  let recollections = memoriesBySrl[srl];
  return recollections;
}

function fixate(fixationSrl, prevSrl, salienceBoost=BASE_SALIENCE_BOOST) {

  if (!recognize(prevSrl)){
    let newMemory;
    if (NEW_LEARNING_RATE_PERCENT > 100*Math.random() && fixationSrl !== prevSrl) {
      newMemory = {[MAX_SALIENCE]: fixationSrl};
    } else {
      newMemory = {};
    }
    memoriesBySrl[prevSrl] = newMemory;
  }
  require('assert')(recognize(prevSrl), `for fixationSrl ${fixationSrl}, failed to set prevSrl: (${prevSrl})`);

  if (!recognize(fixationSrl)){
    memoriesBySrl[fixationSrl] = {};
  }
  require('assert')(recognize(fixationSrl), `failed to set fixationSrl ${fixationSrl}`);


  // console.log(`looking for ${fixationSrl} in recognize(${prevSrl}):`,recognize(prevSrl));
  let idx = Object.values(recognize(prevSrl)).indexOf(fixationSrl);
  // require('assert')(idx !== -1, 'what happened?  it was there a second ago, right?');
  if (idx === -1) {
    recognize(prevSrl)[Math.max(salienceBoost, Math.min(MAX_SALIENCE, Math.round(salienceBoost*2*Math.random())))] = fixationSrl;
  } else {
    // Increase salience
    let formerSalience = Number(Object.keys(recognize(prevSrl))[idx]);
    let higherSalience = Math.max(salienceBoost, Math.min(MAX_SALIENCE, Math.round(formerSalience + salienceBoost*2*Math.random())));
    let swappedSrl = recognize(prevSrl)[higherSalience];
    recognize(prevSrl)[higherSalience] = fixationSrl;
    if (swappedSrl) {
      recognize(prevSrl)[formerSalience] = swappedSrl;
    } else {
      delete recognize(prevSrl)[formerSalience];
    }
    // FUTURE: Introduce a deliberate, small % chance of forgetting other adjacent things
  }

}

async function pause(ms) {
  return new Promise((resolve) =>
    setTimeout(()=>{
      resolve();
    }, ms)
  );
}

// function hash(something) {
//   if (process.env.NODE_ENV !== 'production') {
//     return JSON.parse(JSON.stringify(something));
//   }//•

//   let shasum = require('crypto').createHash('sha1');
//   shasum.update(JSON.stringify(something));
//   return shasum.digest('hex');
// }





