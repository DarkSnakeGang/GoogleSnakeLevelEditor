//Code that is common to other mods.

window.commonHasAlreadyRun = window.commonHasAlreadyRun || false;

var wholeSnakeObject;//Set to the big snake object that includes everything in snake.
var megaWholeSnakeObject;//Contains wholeSnakeObject

window.snake.runMod = function(processCodeCallback){
  const scripts = document.body.getElementsByTagName('script');
  for(let script of scripts) {
    if(script.src == "" || script.src.indexOf('apis.google.com') != -1){
      continue;
    }
    const req = new XMLHttpRequest();
    req.open('GET', script.src);
    req.onload = function() {
      if(this.responseText.indexOf('trophy') !== -1)
      processCodeCallback(this.responseText);
    };
    req.send();
  }
  
};

//Set up code that can be reused by other mods.
function processCommonCode(code) {
  if(window.commonHasAlreadyRun) {
    console.log('Notice: processCommonCode has already been ran once. This has be prevented from running a second time.');
    return;
  }

  window.commonHasAlreadyRun = true;

  //Copied from Pythag
  window.tileWidth = code.match(/[a-z]\.[$a-zA-Z0-9_]{0,6}\.fillRect\([a-z]\*[a-z]\.[$a-zA-Z0-9_]{0,6}\.([$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6}),[a-z]\*[a-z]\.[$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6},[a-z]\.[$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6},[a-z]\.[$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6}\)/)[1];//wa

  //setup for being able to move apples
  //Copied from gravity, but adjusted to be global and use code. intead of funcWithEat. and capturing groups adjusted.
  [,window.applePosProperty, window.appleSpeedProperty] = code.match(/&&\([$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6}\.x&&\([$a-zA-Z0-9_]{0,6}\.([$a-zA-Z0-9_]{0,6})\.x\+=[$a-zA-Z0-9_]{0,6}\.([$a-zA-Z0-9_]{0,6})\.x\),/);

  //Lifted from pythag
  window.bodyArray = code.match(/var [a-z]=this\.[$a-zA-Z0-9_]{0,6}\.([$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6})\[0\]\.clone\(\);/)[1];

  window.makeApple = code.match(/this\.[$a-zA-Z0-9_]{0,6}\.push\(([$a-zA-Z0-9_]{0,6})\(this,-5,-4\)\)/)[1];
  window.appleArray = code.match(/this\.([$a-zA-Z0-9_]{0,6})\.push\([$a-zA-Z0-9_]{0,6}\(this,-6,-3\)\)/)[1];

  //whole snake object has an object which in turn has the appleArray. (It's messy I know)
  window.appleArrayHolderOfWholeSnakeObject = code.match(/this\.([$a-zA-Z0-9_]{0,6})\.reset\(\);this\.[$a-zA-Z0-9_]{0,6}=!1;/)[1];

  window.coordConstructor = code.match(/new ([$a-zA-Z0-9_]{0,6})\(1,1\)/)[1];

  //Board dimensions - found in wholeSnakeObject, has width, height properties
  window.boardDimensions = code.match(/x===Math.floor\([a-z]\.[$a-zA-Z0-9_]{0,6}\.([$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6})\.width\/2\)&&/)[1];
  
  //Contains reset and tick etc.
  window.mainClass = code.match(/([$a-zA-Z0-9_]{0,6})=function\(a,b,c\){this\.settings=[a-z];this\.menu=[a-z];this\.header=[a-z];/)[1];

  //Set snakeGlobalObject every reset
  let funcWithReset = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,6}\.reset=function\(\)$/,
  /a=\n?\.66/,
  false);

  funcWithReset = assertReplace(funcWithReset,'{','{wholeSnakeObject = this;');//This line is changed slightly from varied.js

  funcWithReset = assertReplace(funcWithReset, /[$a-zA-Z0-9_]{0,6}\([a-z]\.settings\)&&\([a-z]\.[$a-zA-Z0-9_]{0,6}\.[$a-zA-Z0-9_]{0,6}=!0\)\)/,
    `$&;simpleHookManager.runHook('afterResetBoard')`);

  funcWithReset = swapInMainClassPrototype(mainClass, funcWithReset);

  eval(funcWithReset);

  //Get the object that contains the wholeSnakeObject.
  let funcWithResetState = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,6}\.prototype\.resetState=function\(a\)$/,
  /void 0===[a-z]\?!0:[a-z];this\.[$a-zA-Z0-9_]{0,6}\.reset\(\);/);

  funcWithResetState = assertReplace(funcWithResetState, '{', '{megaWholeSnakeObject = this;');

  eval(funcWithResetState);
}

//Allow running code at particular points in time (e.g. after board reset, after death, after eating an apple)
var simpleHookManager = {
  hooks: {
    'afterResetBoard':[],//Format for an element {name: myHook, callback: myFunction}
  },
  runHook: function(hookType) {
    if(this.hooks.hasOwnProperty(hookType) && Array.isArray(this.hooks[hookType])) {
      for(let hook of this.hooks[hookType]) {
        hook.callback();
      }
    } else {
      throw new Error(`Hook type "${hookType}" not found`);
    }
  },
  registerHook: function(hookType, hookName, hookCallback) {
    if(!this.hooks.hasOwnProperty(hookType) || !Array.isArray(this.hooks[hookType])) throw new Error(`Hook type not found`);

    if(typeof hookName !== 'string' || typeof hookCallback !== 'function') {
      throw new Error('hookName must be a string, hookCallback must be a function.');
    }

    //Check hook not already registered
    if(this.hooks[hookType].some(el=>el.name === hookName)) return;

    this.hooks[hookType].push({name: hookName, callback: hookCallback});
  }
}

function swapInMainClassPrototype(mainClass, functionText) {
  if(/^[$a-zA-Z0-9_]{0,6}=function/.test(functionText)) {
    throw new Error("Error, function is of form abc=function(), but this only works for stuff like s_.abc=function()");
  }
  functionText = assertReplace(functionText, /^[$a-zA-Z0-9_]{0,6}/,`${mainClass}.prototype`);
  return functionText;
}

/*
This function will search for a function/method in some code and return this function as a string

code will usually be the snake source code

functionSignature will be regex matching the beginning of the function/method (must end in $),
for example if we are trying to find a function like s_xD = function(a, b, c, d, e) {......}
then put functionSignature = /[$a-zA-Z0-9_]{0,6}=function\(a,b,c,d,e\)$/

somethingInsideFunction will be regex matching something in the function
for example if we are trying to find a function like s_xD = function(a, b, c, d, e) {...a.Xa&&10!==a.Qb...}
then put somethingInsideFunction = /a\.[$a-zA-Z0-9_]{0,6}&&10!==a\.[$a-zA-Z0-9_]{0,6}/
*/
function findFunctionInCode(code, functionSignature, somethingInsideFunction, logging = false) {
  let functionSignatureSource = functionSignature.source;
  let functionSignatureFlags = functionSignature.flags;//Probably empty string

  /*Check functionSignature ends in $*/
  if (functionSignatureSource[functionSignatureSource.length - 1] !== "$") {
    throw new Error("functionSignature regex should end in $");
  }

  /*Allow line breaks after commas or =. This is bit sketchy, but should be ok as findFunctionInCode is used in a quite limited way*/
  functionSignatureSource.replaceAll(/,|=/g,'$&\\n?');
  functionSignature = new RegExp(functionSignatureSource, functionSignatureFlags);

  /*get the position of somethingInsideFunction*/
  let indexWithinFunction = code.search(somethingInsideFunction);
  if (indexWithinFunction == -1) {
    console.log("%cCouldn't find a match for somethingInsideFunction", "color:red;");
    diagnoseRegexError(code, somethingInsideFunction);
  }

  /*expand outwards from somethingInsideFunction until we get to the function signature, then count brackets
  to find the end of the function*/
  startIndex = 0;
  for (let i = indexWithinFunction; i >= 0; i--) {
    let startOfCode = code.substring(0, i);
    startIndex = startOfCode.search(functionSignature);
    if (startIndex !== -1) {
      break;
    }
    if (i == 0) {
      throw new Error("Couldn't find function signature");
    }
  }

  let bracketCount = 0;
  let foundFirstBracket = false;
  let endIndex = 0;
  /*Use bracket counting to find the whole function*/
  let codeLength = code.length;
  for (let i = startIndex; i <= codeLength; i++) {
    if (!foundFirstBracket && code[i] == "{") {
      foundFirstBracket = true;
    }

    if (code[i] == "{") {
      bracketCount++;
    }
    if (code[i] == "}") {
      bracketCount--;
    }
    if (foundFirstBracket && bracketCount == 0) {
      endIndex = i;
      break;
    }

    if (i == codeLength) {
      throw new Error("Couldn't pair up brackets");
    }
  }

  let fullFunction = code.substring(startIndex, endIndex + 1);

  /*throw error if fullFunction doesn't contain something inside function - i.e. function signature was wrong*/
  if (fullFunction.search(somethingInsideFunction) === -1) {
    throw new Error("Function signature does not belong to the same function as somethingInsideFunction");
  }

  if (logging) {
    console.log(fullFunction);
  }

  return fullFunction;
}

/*
Same as replace, but throws an error if nothing is changed
*/
function assertReplace(baseText, regex, replacement) {
  if (typeof baseText !== 'string') {
    throw new Error('String argument expected for assertReplace');
  }
  let outputText = baseText.replace(regex, replacement);

  //Throw warning if nothing is replaced
  if (baseText === outputText) {
    diagnoseRegexError(baseText, regex);
  }

  return outputText;
}

/*
Same as replaceAll, but throws an error if nothing is changed
*/
function assertReplaceAll(baseText, regex, replacement) {
  if (typeof baseText !== 'string') {
    throw new Error('String argument expected for assertReplace');
  }
  let outputText = baseText.replaceAll(regex, replacement);

  //Throw warning if nothing is replaced
  if (baseText === outputText) {
    diagnoseRegexError(baseText, regex);
  }

  return outputText;
}

function diagnoseRegexError(baseText, regex) {  
  if(!(regex instanceof RegExp)) {
    throw new Error('Failed to find match using string argument. No more details available');
  }

  //see if removing line breaks works - in that case we can give a more useful error message
  let oneLineText = baseText.replaceAll(/\n/g,'');
  let res = regex.test(oneLineText);

  //If line breaks don't solve the issue then throw a general error
  if (!res) {
    throw new Error('Failed to find match for regex.');
  }

  //Try to suggest correct regex to use for searching
  let regexSource = regex.source;
  let regexFlags = regex.flags;

  //Look at all the spots where line breaks might occur and try adding \n? there to see if it makes a difference
  //It might be easier to just crudely brute force putting \n? at each possible index?
  for(let breakableChar of ["%","&","\\*","\\+",",","-","\\/",":",";","<","=",">","\\?","{","\\|","}"]) {
    for(let pos = regexSource.indexOf(breakableChar); pos !== -1; pos = regexSource.indexOf(breakableChar, pos + 1)) {
      //Remake the regex with a new line at the candidate position
      let candidateRegexSource = `${regexSource.slice(0,pos + breakableChar.length)}\\n?${regexSource.slice(pos + breakableChar.length)}`;
      let candidateRegex;
      
      try{
        candidateRegex = new RegExp(candidateRegexSource, regexFlags);
      } catch(err) {
        continue;
      }

      //See if the new regex works
      let testReplaceResult = candidateRegex.test(baseText);
      if(testReplaceResult) {
        //Success we found the working regex! Give descriptive error message to user and log suggested regex with new line in correct place
        console.log(`Suggested regex improvement:
${candidateRegex}`);
        throw new Error('Suggested improvement found! Error with line break, failed to find match for regex. See logged output for regex to use instead that should hopefully fix this.');
      }
    }
  }

  throw new Error('Line break error! Failed to failed to find match for regex - most likely caused by a new line break. No suggestions provided');
}

snake.runMod(processCommonCode);