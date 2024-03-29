// sailsbot2, electric boogaloo

let _ = require('lodash');
let Process = require('machinepack-process').customize({arginStyle:'serial'});

let SIMULATION_LENGTH = 2500;
let SIMULATION_FRAME_RATE_MS = 1;

let BASE_SALIENCE_BOOST = 1;
let MAX_SALIENCE = 255;
let NEW_LEARNING_RATE_PERCENT = 25;
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

    'treat bag': {200:'interesting'},
    'gold tape': {100:'mike',10:'sticky',1:'interesting'},
    'sticky': {150:'unpleasant'},
    'eric\'s voice': {100:'footsteps',30:'opening door',5:'treat bag'},
    'opening door': {60:'footsteps',20:'terror',5:'rachael'},
    'footsteps': {30:'terror',5:'rachael'},
    'rachael': {209:'treat bag', 10:'interesting'},
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
    if (1 > 10*Math.random()) {
      srl = require('faker').company.catchPhraseNoun();
    } else {
      srl = _.sample(Object.keys(memoriesBySrl));
    }
    // TODO: make random stimuli more realistic and cat-related

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
  for (let step=0; step<800; step++) {

    if (distractedness > (step*4*Math.random()) + 5) {
      break;
    }

    process.stdout.write(`${_.repeat(' ', Math.max(1,Math.floor(distractedness)))}${step === 0? '•' :'·'} ${srl}`);
    if (step === 0) {
      await Process.executeCommand(`say -v oliver '${srl.replace(/[^A-z\s]/g,'')}'`);
    } else {
      await Process.executeCommand(`say -v agnes '${srl.replace(/[^A-z\s]/g,'')}'`);
    }

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
        // FUTURE: prefer foregrounded memories on goof
        nextSrl = _.sample(Object.keys(memoriesBySrl));
      } else {
        nextSrl = await perceive(srl, prevSrl);
        // let isNextInForeground = nextSrl && recognize(!nextSrl.match(/^¡+/)? `¡${nextSrl}` :nextSrl);
        // if (!nextSrl) {
        //   nextSrl = prevSrl;
        // }//ﬁ
      }

      if (['interesting'].includes(nextSrl))  {
        nextSrl = srl;
      }
    }//∞



    process.stdout.write(`${didGoof? '…' :''}`);
    if (didGoof) {
      await Process.executeCommand(`say -v agnes 'yup...'`);
      // await Process.executeCommand(`say -v whisper 'oo'`);
    }//ﬁ
    await pause(SIMULATION_FRAME_RATE_MS*3);
    console.log();

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
    if (!recognize(srl)) { await Process.executeCommand(`say -v agnes 'oh'`); }
    await fixate(srl, prevSrl);
    return;
  }//•

  // old way:
  // ```
  // let recollection = _.sample(recollections);
  // ```
  //
  // new way:
  let recollectedSrl;
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

  recollectedSrl = recollections[`${levelWithHighestRoll}`];

  if (!recollectedSrl) {
    return;
  }

  await pause(SIMULATION_FRAME_RATE_MS*7);
  if (!recognize(recollectedSrl)) { await Process.executeCommand(`say -v agnes 'huh'`); }
  await fixate(recollectedSrl, srl);

  return recollectedSrl;

}


function recognize(srl) {
  let recollections = memoriesBySrl[srl];
  return recollections;
}

async function fixate(fixationSrl, prevSrl, salienceBoost=BASE_SALIENCE_BOOST) {

  if (fixationSrl === 'interesting') {
    salienceBoost *= 4;
  }

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
    // TODO: Do learn check here
    recognize(prevSrl)[Math.max(salienceBoost, Math.min(MAX_SALIENCE, Math.round(salienceBoost*2*Math.random())))] = fixationSrl;
    await Process.executeCommand(`say -v agnes 'oooh, ..!'`);
    // TODO: also do the opposite, but only if learn check passes
  } else {

    // Increase salience
    // TODO: Do learn check here
    // TODO: also do the opposite, but only if learn check passes
    let formerSalience = Number(Object.keys(recognize(prevSrl))[idx]);
    let higherSalience = Math.max(salienceBoost, Math.min(MAX_SALIENCE, Math.round(formerSalience + salienceBoost*2*Math.random())));
    let swappedSrl = recognize(prevSrl)[higherSalience];
    recognize(prevSrl)[higherSalience] = fixationSrl;
    if (swappedSrl) {
      recognize(prevSrl)[formerSalience] = swappedSrl;
    } else {
      delete recognize(prevSrl)[formerSalience];
    }
    // await Process.executeCommand(`say -v agnes 'ah'`);
    // await Process.executeCommand(`say -v whisper 'oo'`);
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





