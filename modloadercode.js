window.levelEditorMod = {};

////////////////////////////////////////////////////////////////////
//RUNCODEBEFORE
////////////////////////////////////////////////////////////////////

window.levelEditorMod.runCodeBefore = function() {
  ///////////////////////////////////////
  //Taken from shared.js
  ///////////////////////////////////////

  window.wholeSnakeObject;//Set to the big snake object that includes everything in snake.
  window.megaWholeSnakeObject;//Contains wholeSnakeObject

  //Allow running code at particular points in time (e.g. after board reset, after death, after eating an apple)
  window.simpleHookManager = {
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

  ///////////////////////////////////////
  //Taken from level-editor.js
  ///////////////////////////////////////

  //For localhost vs github version

  const isProd = true;

  globalThis.rootUrl;
  globalThis.imagePresetsFolder;
  globalThis.sharedUrl;
  globalThis.randomHamUrl;
  globalThis.challengeUrl;

  if(isProd) {
    //Live
    globalThis.rootUrl = 'https://raw.githubusercontent.com/DarkSnakeGang/GoogleSnakeLevelEditor/main/';
    globalThis.imagePresetsFolder = 'image-presets/';
    globalThis.sharedUrl = 'https://raw.githubusercontent.com/DarkSnakeGang/GoogleSnakeLevelEditor/main/shared.js';
    globalThis.randomHamUrl = 'https://raw.githubusercontent.com/DarkSnakeGang/GoogleSnakeLevelEditor/main/random_ham.txt';
    globalThis.challengeUrl = 'https://raw.githubusercontent.com/DarkSnakeGang/GoogleSnakeLevelEditor/main/challenge.txt';
  } else {
    //Dev
    globalThis.rootUrl = 'http://localhost:3000/';
    globalThis.imagePresetsFolder = 'presets-windows-symlink/';
    globalThis.sharedUrl = 'https://raw.githubusercontent.com/DarkSnakeGang/GoogleSnakeLevelEditor/main/shared.js';
    globalThis.randomHamUrl = 'http://localhost:3000/random_ham.txt';
    globalThis.challengeUrl = 'http://localhost:3000/challenge.txt';
  }

  //Used by make pattern
  globalThis.roundApplePos = true;//For placing apples with mousedown
  globalThis.mousePlaceMode = {category: 'apple', type:0};//Category could be apple, wall, drag or box, type corresponds to which apple
  globalThis.disableWallMode = true;//Whether wall mode should place walls every 2 turns
  globalThis.disableAppleInitialSpeed = false;
  globalThis.customSnakeStart = {isActive:false, x:4, y:1};
  globalThis.hasShownWarnings = {wall: false, sokoban: false};//Whether we have shown the warning about walls/boxes not having collisions without the right mode selected.
  globalThis.customPresetManager = {
    canvasWidth:370,
    canvasHeight:340,
    currentMapSize:'standard',
    currentBoardWidth:17,
    currentBoardHeight:15,
    brush:'apple',
    pixelList:[{x: 11, y: 7, category: 'apple', type: 0}],
    isDrawing:false,
    isErasing:false,
    lastSpotDrawnOn:{x:undefined,y:undefined},
    changeMapSize: function(newSize) {
      let newSizeSetting = null;
      this.currentMapSize = newSize;
      switch(newSize) {
        case 'small': 
          this.currentBoardWidth = 10;
          this.currentBoardHeight = 9;
          newSizeSetting = 1;
          break;
        case 'standard': 
          this.currentBoardWidth = 17;
          this.currentBoardHeight = 15;
          newSizeSetting = 0;
          break;
        case 'large': 
          this.currentBoardWidth = 24;
          this.currentBoardHeight = 21;
          newSizeSetting = 2;
          break;
        default:
          throw new Error(`Unrecognised map size! Found ${newSize}`);
      }

      //Clear out old map (and triggers a draw afterwards)
      this.clearAll();
      this.placeInitialApple();
      this.draw();//Technically we draw twice in a row since clearAll also draws, but ¯\_(ツ)_/¯

      //Also change real map size
      selectNewSizeSettingAndHardReset(newSizeSetting);
    },
    draw: function() {
      const tileWidth = this.canvasWidth/this.currentBoardWidth;
      const tileHeight = this.canvasHeight/this.currentBoardHeight;

      this.ctx.fillStyle = "#a2d149";
      this.ctx.fillRect(0,0,this.canvasWidth,this.canvasHeight);

      this.ctx.fillStyle = "#aad751";
      for(let j = 0; j < this.currentBoardHeight; j++) {
        for(let i = 0; i < this.currentBoardWidth; i++) {
          if((i + j) % 2 === 0) {
            this.ctx.fillRect(i*tileWidth, j*tileHeight, tileWidth, tileHeight);
          }
        }
      }

      for(let k of this.pixelList) {
        this.drawEntity(k.x * tileWidth, k.y * tileHeight, tileWidth, tileHeight, k.category, k.type);
      }
    },
    drawEntity: function(xCoord, yCoord, width, height, category, type) {
      switch(category) {
        case 'apple':
          this.ctx.fillStyle = "#E05826";
          this.ctx.fillRect(xCoord, yCoord, width, height);
          break;
        case 'wall':
          this.ctx.fillStyle = "#578A34";
          this.ctx.fillRect(xCoord, yCoord, width, height);
          break;
        case 'box':
          this.ctx.fillStyle = "#F0A036";
          this.ctx.fillRect(xCoord, yCoord, width, height);
          break;
        case 'snakehead':
          this.ctx.fillStyle = "#4673E8";
          this.ctx.fillRect(xCoord, yCoord, width, height);
          break;
        default:
          throw new Error(`Unexpected item to draw on custom preset canvas. Received: ${category}`);
      }
    },
    clearAll: function() {
      this.pixelList = [];
      this.draw();
    },
    handleMouseDownOnBoard: function(event) {
      event.preventDefault();

      if(event.button === 0) {
        customPresetManager.isDrawing = true;
      } else if(event.button === 2) {
        customPresetManager.isErasing = true;
      } else {
        return;
      }

      const rect = document.getElementById('custom-preset-canvas').getBoundingClientRect();

      customPresetManager.attemptPlace(event.clientX - rect.left, event.clientY - rect.top, customPresetManager.isErasing);
    },
    handleMouseUpAnywhere: function(event) {
      event.preventDefault();

      if(event.button === 0) {
        customPresetManager.isDrawing = false;
      } else if(event.button === 2) {
        customPresetManager.isErasing = false;
      } else {
        return;
      }

      customPresetManager.lastSpotDrawnOn = {x:undefined,y:undefined};
    },
    handleMouseMoveOnBoard: function(event) {
      if(!customPresetManager.isDrawing && !customPresetManager.isErasing) return;

      const rect = document.getElementById('custom-preset-canvas').getBoundingClientRect();
      customPresetManager.attemptPlace(event.clientX - rect.left, event.clientY - rect.top, customPresetManager.isErasing);
    },
    attemptPlace: function(xPixelCoord, yPixelCoord, isErase=false) {
      //Try to place entity corresponding to current brush into the pixelList.
      
      //Convert pixels coords into board coords
      const tileWidth = this.canvasWidth/this.currentBoardWidth;
      const tileHeight = this.canvasHeight/this.currentBoardHeight;
      const boardXCoord = Math.floor(xPixelCoord/tileWidth);
      const boardYCoord = Math.floor(yPixelCoord/tileHeight);

      //Exit early if the mouse is still on the same square
      if(this.lastSpotDrawnOn.x === boardXCoord && this.lastSpotDrawnOn.y === boardYCoord) return;
      this.lastSpotDrawnOn = {x:boardXCoord, y:boardYCoord};

      //Exit early if out of bounds
      if(boardXCoord < 0 || boardYCoord < 0 || boardXCoord >= this.currentBoardWidth || boardYCoord >= this.currentBoardHeight) return;

      this.removeAtCoord(boardXCoord, boardYCoord); 

      //If we're erasing then exit just after erasing
      if(isErase) {
        this.draw();
        return;
      }

      switch(this.brush) {
        case 'apple':
          this.pixelList.push({ x: boardXCoord, y: boardYCoord, category: 'apple', type: 0});
          break;
        case 'wall':
          this.pixelList.push({ x: boardXCoord, y: boardYCoord, category: 'wall', type: -1});
          break;
        case 'box':
          this.pixelList.push({ x: boardXCoord, y: boardYCoord, category: 'box', type: -1});
          break;
        case 'snakehead':
          //Also remove any other snakehead instances.
          this.removeSnakeHeads();
          this.pixelList.push({ x: boardXCoord, y: boardYCoord, category: 'snakehead', type: -1});
          break;
        case 'erase':
          //Do nothing since we remove earlier
          break;
        default:
          throw new Error(`Unrecognised brush type ${this.brush}`);
      }

      //Always redraw (this might be unecessary if we're placing on an occupied spot, but there's no real harm in this)
      this.draw();
    },
    removeAtCoord: function(boardX, boardY) {
      let i = this.pixelList.length;
      while(i--) {
        if(this.pixelList[i].x === boardX && this.pixelList[i].y === boardY) {
          this.pixelList.splice(i, 1);
        }
      }
    },
    removeSnakeHeads: function() {
      let i = this.pixelList.length;
      while(i--) {
        if(this.pixelList[i].category === 'snakehead') {
          this.pixelList.splice(i, 1);
        }
      }
    },
    placeInitialApple: function() {
      //Places a single apple. This is because otherwise the game will be an instant-win
      this.pixelList.push({x: Math.floor(this.currentBoardWidth * 3/4), y: Math.floor(this.currentBoardHeight/2), category: 'apple', type: 0});
    },
    getExportCode: function() {
      let codesArray = [];

      //First part gives the map size.
      codesArray.push(`${this.currentBoardWidth}x${this.currentBoardHeight}`);

      for(let entity of this.pixelList) {
        switch(entity.category) {
          case 'apple':
            codesArray.push(`A${entity.x},${entity.y}`);
            break;
          case 'wall':
            codesArray.push(`W${entity.x},${entity.y}`);
            break;
          case 'box':
            codesArray.push(`B${entity.x},${entity.y}`);
            break;
          case 'snakehead':
            codesArray.push(`S${entity.x},${entity.y}`);
            break;
          case 'default':
            throw new Error('Unrecognise category when getting export code');
        }
      }

      return codesArray.join(' ');
    },
    importCode: function(fullCode) {
      fullCode = fullCode.trim();

      //Process the main part of the code.
      this.pixelList = this.getPixelListFromLevelCode(fullCode);

      //First part gives map size
      try {
        let mapPart = fullCode.split(' ')[0]
        let [boardWidth, boardHeight] = mapPart.split('x');

        boardWidth = parseInt(boardWidth);
        boardHeight = parseInt(boardHeight);

        if(typeof boardWidth === 'number' && typeof boardHeight === 'number' && isFinite(boardWidth) && isFinite(boardHeight) && boardWidth > 0 && boardHeight > 0) {
          this.currentBoardWidth = boardWidth;
          this.currentBoardHeight = boardHeight;

          let newSizeSetting = null;

          if(boardWidth === 10 && boardHeight === 9) {
            this.currentMapSize = 'small';
            newSizeSetting = 1;
          } else if(boardWidth === 17 && boardHeight === 15) {
            this.currentMapSize = 'standard';
            newSizeSetting = 0;
          } else if(boardWidth === 24 && boardHeight === 21) {
            this.currentMapSize = 'large';
            newSizeSetting = 2;
          } else {
            //Maybe they are trying to do a custom board size? Just keep map size the same for now.
            newSizeSetting = null;
          }

          document.getElementById('custom-map-size').value = this.currentMapSize;

          //Also change real map size
          selectNewSizeSettingAndHardReset(newSizeSetting);
        }
      } catch (err) {
        //Just skip and keep current map size.
      }

      this.draw();
    },
    getPixelListFromLevelCode: function(levelCode) {
      levelCode = levelCode.trim();

      let newPixelList = [];

      let codesArray = levelCode.split(' ');

      //Start from 1 since 0 contains board size which we don't need for pixelList
      for(let i = 1; i < codesArray.length; i++) {
        try {
          let entityLetter = codesArray[i][0]; //First letter indicates where it is apple, box...
          let coordPart = codesArray[i].substr(1);
          let coords = coordPart.split(',');

          //Skip if coords are bad.
          let coordX = parseInt(coords[0]);
          let coordY = parseInt(coords[1]);

          if(!isFinite(coordX) || !isFinite(coordY) || coordX < 0 || coordY < 0) continue;

          switch(entityLetter) {
            case 'A':
              //Apple
              newPixelList.push({x: coordX, y: coordY, category: 'apple', type: 0});
              break;
            case 'W':
              //Wall
              newPixelList.push({x: coordX, y: coordY, category: 'wall', type: -1});
              break;
            case 'B':
              //Box
              newPixelList.push({x: coordX, y: coordY, category: 'box', type: -1});
              break;
            case 'S':
              //Snakehead
              newPixelList.push({x: coordX, y: coordY, category: 'snakehead', type: -1});
              break;
            default:
              throw new Error('Unrecognise entity letter');
          }
        } catch(err) {
          //Just skip and process next code
        }
      }

      return newPixelList;
    }
  };

  window.otherPresetmanager = {
    isHamsLoaded: false,
    isChallengeLoaded: false,
    hamLevelCodes: [],
    challengeLevelCodes: [],
    randomHamAppleCount: 5,
    challengelevel: 1,
    loadRandomHams: function() {
      fetch(randomHamUrl)
      .then(response=>response.text())
      .then(allHamCodes=>{
        otherPresetmanager.hamLevelCodes = allHamCodes.split('\n');
        otherPresetmanager.isHamsLoaded = true;
      });
    },
    loadChallenge: function() {
      fetch(challengeUrl)
      .then(response=>response.text())
      .then(allChallengeCodes=>{
        otherPresetmanager.challengeLevelCodes = allChallengeCodes.split('\n');
        otherPresetmanager.isChallengeLoaded = true;
      });
    },
    getRandomHamPixelList: function() {
      if(!this.isHamsLoaded) return [];

      //Choose random level
      const chosenLevelCode = this.hamLevelCodes[Math.floor(Math.random() * this.hamLevelCodes.length)];

      //Get pixelList
      let hamPixelList = customPresetManager.getPixelListFromLevelCode(chosenLevelCode);

      //Add some apples
      let appleDesiredCoords;
      
      switch(this.randomHamAppleCount) {
        case 1: 
          appleDesiredCoords = [{x:7,y:4}];
          break;
        case 3:
          appleDesiredCoords = [{x:5,y:2},{x:7,y:4},{x:5,y:6}];
          break;
        case 5:
          appleDesiredCoords = [{x:4,y:2},{x:8,y:2},{x:6,y:4},{x:4,y:6},{x:8,y:6}];
          break;
        default:
          throw new Error('Unexpected apple count for random ham');
      }

      for(let apple of appleDesiredCoords) {
        //Add the apples to the pixelList
        if(hamPixelList.some(entity=>entity.x === apple.x && entity.y === apple.y)) {
          //If the spot an apple would normally be is occupied, then move it one space up.
          apple.y--;
        }

        hamPixelList.push({x: apple.x, y: apple.y, category: 'apple', type: 0});
      }

      return hamPixelList;
    },
    getChallengePixelList: function() {
      if(!this.isChallengeLoaded) return [];

      const chosenLevelCode = this.challengeLevelCodes[this.challengelevel - 1];

      //Get pixelList
      let challengePixelList = customPresetManager.getPixelListFromLevelCode(chosenLevelCode);

      return challengePixelList;
    }
  };

  window.setPixelData = function(target, url, callback = null) {
    target.complete = false;
  
    fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP error, status = ' + response.status);
        }
        return response.blob();
      })
      .then(function (myBlob) {
        let objectURL = URL.createObjectURL(myBlob);
        let img = document.createElement('img');
        img.src = objectURL;
        if (img.complete) {
          extractImageData(img, objectURL);
        } else {
          img.addEventListener('load', function () { extractImageData(img, objectURL) });
          img.addEventListener('error', function () { alert('Error loading image') })
        }
      })
      .catch(function (error) {
        console.log(error);
      });
  
    function extractImageData(img, objectURL) {
      let canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      let imageDataArray = ctx.getImageData(0, 0, img.width, img.height).data;
      let pixelList = [];//Contains hex and coords
      for (let i = 0; i < imageDataArray.length; i += 4) {
        let hex = rgbToHex(imageDataArray[i], imageDataArray[i + 1], imageDataArray[i + 2]);
        let pixelDetails = hexToPixelDetails(hex);
        pixelList.push({ x: i / 4 % img.width, y: Math.floor((i / 4) / img.width), hex: hex, category: pixelDetails.category, type: pixelDetails.type });
      }
      URL.revokeObjectURL(objectURL);
      target.pixelList = pixelList;
      target.complete = true;
      if (callback) {
        callback();
      }
    }
  
  }
  
  window.blitPattern = function(pixelList, offsetX=0, offsetY=0) {
    customSnakeStart.isActive = false;
    emptyApples();
    emptySokoboxes();
    emptySokogoals();
    for(let i=0;i<pixelList.length;i++) {
      switch(pixelList[i].category) {
        case 'apple':
          if(pixelList[i].type != -1) {
            let intialSpeed = undefined;//Default to using speed given by winged mode, or whatever mode is selected
            if(disableAppleInitialSpeed) {
              intialSpeed = {x:0, y:0};
            }
            window.placeApple(pixelList[i].x + offsetX,pixelList[i].y + offsetY,pixelList[i].type, intialSpeed);
          }
          break;
        case 'wall':
          window.placeWall(pixelList[i].x, pixelList[i].y, true);
          break;
        case 'box':
          window.placeSokobox(pixelList[i].x, pixelList[i].y);
          break;
        case 'snakehead':
          //Do nothing since we handle the snakehead stuff somewhere else
          //setSnakeHead(pixelList[i].x, pixelList[i].y);
          break;
        default:
          throw Error('Unrecognised category!');
      }
      
    }
  }
  
  window.blitSelectedPreset = function() {
    let presetEl = document.getElementsByClassName('chosen-preset')?.[0];
  
    if(!presetEl) {
      throw new Error('No element with chosen preset class?!? Should never happen.');
    }
  
    if(presetEl.classList.contains('preset-none')) return;
  
    let isUsingCustomPreset = presetEl.classList.contains('preset-custom');
    let isUsingRandomHamPreset = presetEl.classList.contains('preset-random-ham');
    let isUsingChallengePreset = presetEl.classList.contains('preset-challenge');
    let patternPixelList;
  
    if(isUsingCustomPreset) {
      patternPixelList = customPresetManager.pixelList;
    } else if(isUsingRandomHamPreset) {
      patternPixelList = otherPresetmanager.getRandomHamPixelList();
    } else if(isUsingChallengePreset) {
      patternPixelList = otherPresetmanager.getChallengePixelList();
    } else {
      //Blit Pattern
      let imageUrl = presetEl.src;
      //Remove the start of the url so we are just left with a file path which can be used as a key for the pattern.
      let patternName = imageUrl.replace(rootUrl,'');
  
      patternPixelList = presetPatterns[patternName].pixelList
    }
  
    //Make sure they aren't using a big preset on a small map.
    if(!checkPatternInBounds(patternPixelList)) {
      alert('The current board size is too small to use the currently selected pattern.');
      return;
    }
  
    let spawnOffset = getAppleSpawnPointOffset();
  
    blitPattern(patternPixelList, spawnOffset.x, spawnOffset.y);
  }
  
  window.setSelectedSnakeHead = function() {
    customSnakeStart.isActive = false;
    let presetEl = document.getElementsByClassName('chosen-preset')?.[0];
  
    if(!presetEl) {
      throw new Error('No element with chosen preset class?!? Should never happen.');
    }
  
    if(presetEl.classList.contains('preset-none')) return;
    if(presetEl.classList.contains('preset-random-ham')) return;
    let isUsingCustomPreset = presetEl.classList.contains('preset-custom');
    let isUsingChallengePreset = presetEl.classList.contains('preset-challenge');
    let patternPixelList;
  
    if(isUsingCustomPreset) {
      patternPixelList = customPresetManager.pixelList;
    } else if(isUsingChallengePreset) {
      patternPixelList = otherPresetmanager.getChallengePixelList();
    } else {
      //Blit Pattern
      let imageUrl = presetEl.src;
      //Remove the start of the url so we are just left with a file path which can be used as a key for the pattern.
      let patternName = imageUrl.replace(rootUrl,'');
  
      patternPixelList = presetPatterns[patternName].pixelList
    }
  
    //Make sure they aren't using a big preset on a small map.
    if(!checkPatternInBounds(patternPixelList)) return;
  
    let pixelWithSnakeHead = patternPixelList.find(x=>x.category==='snakehead');
  
    if(pixelWithSnakeHead) {
      setSnakeHead(pixelWithSnakeHead.x, pixelWithSnakeHead.y);
    }
  }
  
  window.componentToHex = function(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  /*
  Used to tell if a pixel corresponds to a apple or a wall or a sokoban box
  Also gives info on what type of apple (e.g. apples or oranges)
  */
  window.hexToPixelDetails = function(hex) {
    hex = hex.toUpperCase();
  
    //Value gives the category, if it's not found then this is assumed to be "apple"
    const hexToCategory = {
      '#578A34': 'wall',//Wall
      '#F0A036': 'box',//Boxes from sokoban, color is slight off average, but good enough imo
      '#4673E8': 'snakehead'//Start Position of the snake
    };
  
    let category = 'apple';
  
    if(hexToCategory.hasOwnProperty(hex)) {
      category = hexToCategory[hex];
    } else {
      category = 'apple'; //Defensive programming, though kinda unnecessary idk?
    }
  
    //Index gives the type, if it isn't found then it would be -1 corresponding to no apple
    const hexToTypeMapping = [
      '#E05826',//Apple
      '#DABC1F',//Banana
      '#C5830E',//Pineapple
      '#8D2DA0',//Grapes
      '#E68A1B',//Apricot?
      '#D4D2D1',//Onion
      '#904FA3',//Aubergine
      '#CD6512',//Strawberry
      '#CE6A29',//Cherry
      '#DE9713',//Carrot
      '#E4A588',//Mushroom
      '#009000',//Brocolli
      '#C77B4A',//Watermelon
      '#14A019',//Green pepper
      '#6AB927',//Kiwi
      '#EFCF1E',//Lemon
      '#F28F13',//Orange
      '#F38768',//Peach
      '#C7913C',//Peanut
      '#E74738',//Raspberry
      '#F24311'//Tomato    
    ];
  
    //For reference - the full color list is
    /*
      E05826//Apple
      DABC1F//Banana
      C5830E//Pineapple
      8D2DA0//Grapes
      E68A1B//Apricot?
      D4D2D1//Onion
      904FA3//Aubergine
      CD6512//Strawberry
      CE6A29//Cherry
      DE9713//Carrot
      E4A588//Mushroom
      009000//Brocolli
      C77B4A//Watermelon
      14A019//Green pepper
      6AB927//Kiwi
      EFCF1E//Lemon
      F28F13//Orange
      F38768//Peach
      C7913C//Peanut
      E74738//Raspberry
      F24311//Tomato
    */
  
    return {category: category, type: hexToTypeMapping.indexOf(hex)};
  }
  
  window.rgbToHex = function(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }
  
  window.placeAppleAtMouse = function(event) {
    let canvasRect = gameCanvasElMakePattern.getBoundingClientRect();
    const offsetFromBorder = {x:26,y:26};
    if(window.wholeSnakeObject && tileWidth && window.placeApple && window.placeWall && window.placeSokobox) {
      const calculatedTileWidth = eval(`window.wholeSnakeObject.${tileWidth}`);
      mouseX = event.clientX - canvasRect.left - offsetFromBorder.x - calculatedTileWidth/2;
      mouseY = event.clientY - canvasRect.top - offsetFromBorder.y - calculatedTileWidth/2;
      gameCoordX = mouseX / calculatedTileWidth;
      gameCoordY = mouseY / calculatedTileWidth;
  
      switch(mousePlaceMode.category) {
        case 'apple':
          //Undo offset for spawn point
          var spawnOffset = getAppleSpawnPointOffset();
          gameCoordX += spawnOffset.x; gameCoordY += spawnOffset.y;
          roundApplePos ? window.placeApple(Math.round(gameCoordX), Math.round(gameCoordY), mousePlaceMode.type) : window.placeApple(gameCoordX, gameCoordY, mousePlaceMode.type);
          break;
        case 'wall':
          window.placeWall(gameCoordX, gameCoordY, true);
          break;
        case 'box':
          window.placeSokobox(gameCoordX, gameCoordY);
          break;
        default:
          console.log('mousePlaceCategory set incorrectly. Ignoring');
      }
  
    } else {
      console.log('Mouse click happened before proper setup. Ignoring');
    }
  }
  
  window.setupMakePatternHtml = function() {
    //Add message on canvas saying that level editor mod is being used
    let modIndicator = document.createElement('div');
    modIndicator.style='position:absolute;font-family:roboto;color:white;font-size:14px;padding-top:4px;padding-left:30px;user-select: none;';
    modIndicator.textContent = 'Level Editor Mod';
  
    let canvasNode = document.getElementsByClassName('jNB0Ic')[0];
    document.getElementsByClassName('EjCLSb')[0].insertBefore(modIndicator, canvasNode);
  
    let visiblePanel = 'place';//"place" or "preset" - indicates whether to show the panel for placing individual fruit or preset patterns
    //Add html
    const style = "position: absolute; left:100%;z-index:1001";
    const presetImages = [
      `${imagePresetsFolder}ez_loop.png`,
      `${imagePresetsFolder}straight_line.png`,
      `${imagePresetsFolder}rooms.png`,
      `${imagePresetsFolder}pacman.png`,
      `${imagePresetsFolder}maze_for_key_statue_large.png`,
      `${imagePresetsFolder}regular_grid.png`,
      `${imagePresetsFolder}knight_grid.png`,
      `${imagePresetsFolder}max_rooms.png`,
      `${imagePresetsFolder}soko2.png`,
      `${imagePresetsFolder}soko1.png`,
      `${imagePresetsFolder}soko3_beta.png`,
      `${imagePresetsFolder}soko_widegrid.png`,
      `${imagePresetsFolder}use_reversing_at_will.png`,
      `${imagePresetsFolder}ham_path.png`,
      `${imagePresetsFolder}maze_beta.png`,
    ];
  
    const htmlToInsert = `
    <div id="place-panel" style="height: 600px; width: 200px; background-color: #bfde80; display: grid; grid-template-columns: 60px 60px 60px; justify-content: space-evenly;box-sizing: border-box; border: 10px solid #507f30;">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v13/trophy_01.png" data-type="-1" data-category="wall">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v13/trophy_09.png" data-type="-1" data-category="box">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(0%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_00.png" data-type="0" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_01.png" data-type="1" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_02.png" data-type="2" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_03.png" data-type="3" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_04.png" data-type="4" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_05.png" data-type="5" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_06.png" data-type="6" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_07.png" data-type="7" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_08.png" data-type="8" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_09.png" data-type="9" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_10.png" data-type="10" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_11.png" data-type="11" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_12.png" data-type="12" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_13.png" data-type="13" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_14.png" data-type="14" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_15.png" data-type="15" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_16.png" data-type="16" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_17.png" data-type="17" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_18.png" data-type="18" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_19.png" data-type="19" data-category="apple">
      <img class="place-option" style="max-width:100%; height:auto; object-fit:cover; cursor:pointer; filter: grayscale(100%)" draggable="false" src="/logos/fnbx/snake_arcade/v4/apple_20.png" data-type="20" data-category="apple">
      <div id="link-to-preset" style="height: 40px;background-color: #4a752c;grid-column: 1 / 4;font-size: 2em;font-family: 'Roboto';text-align: center;color: white;line-height: 40px;border: 3px solid #bfde80;border-radius: 4px;cursor: pointer;">Presets &gt;</div>
    </div>
  
    <div id="preset-panel" style="height: 600px; width: 200px; background-color: #bfde80; display: none; grid-template-columns: 60px 60px 60px; justify-content: space-evenly;box-sizing: border-box; border: 10px solid #507f30;">
      <img class="chosen-preset preset-none preset-option" style="width:100%; height:auto; object-fit:cover; cursor:pointer;" draggable="false" src="${rootUrl}none.png">
      <div class="preset-option preset-custom" style="height: 40px;background-color: #2d3f76;grid-column: 2 / 4;font-size: 1.5em;font-family: 'Roboto';text-align: center;color: white;line-height: 40px;cursor: pointer; margin-top:9px;">CUSTOM</div>
      ${presetImages.map(el=>'<img class="preset-option" style="width:100%; height:auto; object-fit:cover; cursor:pointer; image-rendering:pixelated;" draggable="false" src="' + rootUrl + el + '">').join('\n')}
      <div class="preset-option preset-random-ham" style="height: 40px;background-color: #2d3f76;grid-column: 1 / 4;font-size: 1.5em;font-family: 'Roboto';text-align: center;color: white;line-height: 40px;cursor: pointer; margin-top:9px;">RANDOM HAM</div>
      <div class="preset-option preset-challenge" style="height: 40px;background-color: #2d3f76;grid-column: 1 / 4;font-size: 1.5em;font-family: 'Roboto';text-align: center;color: white;line-height: 40px;cursor: pointer; margin-top:9px;">CHALLENGE</div>
      <div id="link-to-place" style="height: 40px;background-color: #4a752c;grid-column: 1 / 4;font-size: 2em;font-family: 'Roboto';text-align: center;color: white;line-height: 40px;border: 3px solid #bfde80;border-radius: 4px;cursor: pointer;">&lt; Place</div>
    </div>
    `;
  
    const customPresetHtmlToInsert = `
      <div id="custom-panel" style="height: 600px; width: 390px; background-color: rgb(191, 222, 128); display: none;box-sizing: border-box; border: 10px solid rgb(80, 127, 48);">
      <div style="padding:10px;font-family:'Roboto'">
        <p style="font-size: 1.17em;">Use the editor below to make your own starting pattern. Left click to place an entity, right click to erase.</p>
        <button id="custom-import" style="font-family: 'Roboto';background-color: #2d3f76;color: white;border: none;padding: 7px;border-radius: 2px;cursor: pointer;margin-right: 7px;margin-bottom: 10px">IMPORT</button>
        <button id="custom-export" style="font-family: 'Roboto';background-color: #2d3f76;color: white;border: none;padding: 7px;border-radius: 2px;cursor: pointer;margin-right: 7px;margin-bottom: 10px">EXPORT</button>
        <button id="custom-clear" style="font-family: 'Roboto';background-color: #b41111;color: white;border: none;padding: 7px;border-radius: 2px;cursor: pointer;margin-right: 7px;margin-bottom: 10px">CLEAR ALL</button>
        <button id="custom-refresh" style="font-family: 'Roboto';background-color: #027400;color: white;border: none;padding: 7px;border-radius: 2px;cursor: pointer;margin-right: 7px;margin-bottom: 10px">REFRESH</button>
        <br><label for="custom-map-size">Map Size: </label>
        <select name="map-size" id="custom-map-size" style="margin-bottom:4px">
          <option value="standard">Standard</option>
          <option value="large">Large</option>
          <option value="small">Small</option>
        </select><br>
        <label for="custom-brush">Brush: </label>
        <select name="brush" id="custom-brush">
          <option value="apple">Apple</option>
          <option value="wall">Wall</option>
          <option value="box">Sokobox</option>
          <option value="snakehead">Snake Start Position</option>
          <option value="erase">Erase</option>
        </select>
      </div>
      <canvas width="370" height="340" style="margin:3px; border:2px solid #507f30" id="custom-preset-canvas"></canvas>
      </div>
  
      <div id="challenge-panel" style="height: 600px; width: 390px; background-color: rgb(191, 222, 128); display: none;box-sizing: border-box; border: 10px solid rgb(80, 127, 48);">
      <div style="padding:10px;font-family:'Roboto'">
        <p style="font-size: 1.17em;">Choose level below. These get progressively harder. These should be played with the wall mode setting. Try with the fast speed for an extra challenge!</p>
        <label for="challenge-level">Level: </label>
        <select name="challenge-level" id="challenge-level">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
          <option value="13">13</option>
          <option value="14">14</option>
          <option value="15">15</option>
          <option value="16">16</option>
          <option value="17">17</option>
          <option value="18">18</option>
          <option value="19">19</option>
          <option value="20">20</option>
        </select>
      </div>
      </div>
    `;
  
    const exportModal = `
    <div id="custom-export-dialogue" style="display: block;margin:50px auto;padding:10px;border:1px solid black;height: 320px; width:316.4px; background-color:beige;border-radius:5px">
      <p>Copy the text below and save it somewhere.</p>
      <textarea id="custom-export-textarea" rows="15" cols="40"></textarea>
      <button id="close-custom-export">Close</button>
    </div>
    `;
  
    //Insert main html
    let myEl = document.createElement('div');
    myEl.innerHTML = htmlToInsert;
    myEl.style = style;
  
    document.getElementsByClassName('sEOCsb')[0].appendChild(myEl);

    //Insert html for the custom preset stuff
    let myCustomEl = document.createElement('div');
    myCustomEl.innerHTML = customPresetHtmlToInsert;
    myCustomEl.style = 'position: absolute; right: 100%;z-index:1001;';
  
    document.getElementsByClassName('sEOCsb')[0].appendChild(myCustomEl);
  
    //Collapse borders
    document.getElementById('custom-panel').style.borderRight = 'none';
    document.getElementById('challenge-panel').style.borderRight = 'none';
  
    //Insert html for custom preset export dialogue box.
    let importModalContainer = document.createElement('div');
    importModalContainer.innerHTML = exportModal;
    importModalContainer.id = 'custom-export-dialogue-container';
    importModalContainer.style = 'display:none; position:fixed; width:100%; height:100%; z-index: 99999; left:0; top:0';
    document.body.appendChild(importModalContainer);
  
    //Adjust styling
    document.getElementsByClassName('HIonyd')[0].style.color = '#FAFFFF';
    document.getElementsByClassName('HIonyd')[1].style.color = '#FFFFFA';
  
    Array.from(document.getElementsByClassName('place-option')).forEach(
      (element)=>{
        element.addEventListener('click',function() {
          //Set global setting for place type
          mousePlaceMode.type = this.dataset.type;
          mousePlaceMode.category = this.dataset.category;
          
          //Highlight chosen option and darken other options
          Array.from(document.getElementsByClassName('place-option')).forEach(el=>{el.style.filter = 'grayscale(100%)';});
          this.style.filter = 'grayscale(0%)';
        });
      }
    );
  
    //Preload presets
    window.presetPatterns = {} || window.presetPatterns;
  
    for(let el of presetImages) {
      presetPatterns[el] = {};
      setPixelData(presetPatterns[el],`${rootUrl}${el}`);
    }
  
    Array.from(document.getElementsByClassName('preset-option')).forEach(
      (element)=>{
        element.addEventListener('click',function() {
          let newSizeSetting = null;
  
          //Exit early if this option is already selected
          if(this.classList.contains('chosen-preset')) return;
  
          //Change css to "select" this preset
          Array.from(document.getElementById('preset-panel').children).forEach(c=>{c.classList.remove('chosen-preset')});
          this.classList.add('chosen-preset');
  
          //Show the panel for editing the custom preset if it has been selected
          document.getElementById('custom-panel').style.display = this.classList.contains('preset-custom') ? 'block' : 'none';
  
          //Likewise for challenge panel
          document.getElementById('challenge-panel').style.display = this.classList.contains('preset-challenge') ? 'block' : 'none';
  
          //Change the size of the map
          if(this.classList.contains('preset-custom')) {
            //For the custom preset, change the map-size to whatever it's set in the custom panel.
            switch(customPresetManager.currentMapSize) {
              case 'standard':
                newSizeSetting = 0;
                break;
              case 'small':
                newSizeSetting = 1;
                break;
              case 'large':
                newSizeSetting = 2;
                break;
              default:
                throw new Error(`Illegal value for map size in customPresetManager: ${customPresetManager.currentMapSize}`);
            }
          } else if(this.classList.contains('preset-challenge')) {
            //For the challenge just set the new size to normal
            newSizeSetting = 0;
          } else if(this.classList.contains('preset-random-ham')) {
            //For the random ham just set the new size to small
            newSizeSetting = 1;
          } else if(this.classList.contains('preset-none')) {
            //Keep map size the same
            newSizeSetting = null;
          } else {
            //Figure out map size from whatever preset they selected.
            switch(this.naturalWidth) {
              case 17:
                //standard
                newSizeSetting = 0;
                break;
              case 10:
                //small
                newSizeSetting = 1;
                break;
              case 24:
                //large
                newSizeSetting = 2;
                break;
              default:
                throw new Error(`Unexpected value for preset width: ${this.naturalWidth}`);
            }
          }
  
          selectNewSizeSettingAndHardReset(newSizeSetting);
        });
      }
    );
  
    //Adjust style
    document.getElementsByClassName('FL0z2d iIs7Af')[0].children[0].style.transform = 'rotate(90deg)';
  
    //Allow switching tabs with ] key
    document.addEventListener('keydown',(event)=>{if(event.key == ']') {
      //Toggle which panel is shown
      visiblePanel = visiblePanel === 'place' ? 'preset' : 'place';
      let placePanelEl = document.getElementById('place-panel');
      let presetPanelEl = document.getElementById('preset-panel');
  
      placePanelEl.style.display = visiblePanel === 'place' ? 'grid' : 'none';
      presetPanelEl.style.display = visiblePanel === 'preset' ? 'grid' : 'none';
    }});
  
    //Also allow clicking the navigation buttons.
    document.getElementById('link-to-preset').addEventListener('click',()=>{
      visiblePanel = 'preset';
      let placePanelEl = document.getElementById('place-panel');
      let presetPanelEl = document.getElementById('preset-panel');
  
      placePanelEl.style.display = 'none';
      presetPanelEl.style.display = 'grid';
    });
  
    document.getElementById('link-to-place').addEventListener('click',()=>{
      visiblePanel = 'place';
      let placePanelEl = document.getElementById('place-panel');
      let presetPanelEl = document.getElementById('preset-panel');
  
      placePanelEl.style.display = 'grid';
      presetPanelEl.style.display = 'none';
    });
  
    document.getElementById('custom-import').addEventListener('click',()=>{
      const levelCode = prompt('Paste in the level code below')
      if(levelCode) {
        customPresetManager.importCode(levelCode);
      }
    });
  
    document.getElementById('custom-export').addEventListener('click',()=>{
      const levelCode = customPresetManager.getExportCode();
  
      document.getElementById('custom-export-textarea').value = levelCode;
  
      document.getElementById('custom-export-dialogue-container').style.display = 'block';
  
      document.getElementById('custom-export-textarea').focus();
      document.getElementById('custom-export-textarea').select();
    });
  
    document.getElementById('close-custom-export').addEventListener('click', ()=>{
      document.getElementById('custom-export-dialogue-container').style.display = 'none';
    });
  
    document.getElementById('custom-clear').addEventListener('click',()=>{
      if(customPresetManager.pixelList.length <= 5 || confirm('Do you want to clear everything?')) customPresetManager.clearAll();
    });
  
    document.getElementById('custom-refresh').addEventListener('click',()=>{
      selectNewSizeSettingAndHardReset(null);//Use null for the size so we just refresh the board.
    });
  
    document.getElementById('custom-map-size').addEventListener('change',function() {
      let newMapSize = this.value;
  
      if(newMapSize === customPresetManager.currentMapSize) return;//Probably not needed but whatever
  
      //Exit early if they don't confirm changing size.
      if(customPresetManager.pixelList.length > 5 && !confirm('Do you want to change map size? This will clear the current board.')) {
        this.value = customPresetManager.currentMapSize;
        return;
      }
  
      customPresetManager.changeMapSize(this.value);
    });
  
    document.getElementById('custom-brush').addEventListener('change',function() {
      customPresetManager.brush = this.value
    });
  
    //Mouse down on custom preset canvas
    document.getElementById('custom-preset-canvas').addEventListener('mousedown',customPresetManager.handleMouseDownOnBoard);
  
    //Release mouse after drawing on custom preset
    document.addEventListener('mouseup',customPresetManager.handleMouseUpAnywhere);
  
    //Attempt to place tile when mouse moves
    document.getElementById('custom-preset-canvas').addEventListener('mousemove',customPresetManager.handleMouseMoveOnBoard);
  
    //Prevent right click triggering context menu
    document.getElementById('custom-preset-canvas').addEventListener('contextmenu',function(e){e.stopPropagation(); e.preventDefault(); return false;});
  
    //Change challenge level
    document.getElementById('challenge-level').addEventListener('change', function(){
      otherPresetmanager.challengelevel = this.value;
  
      const standardBoardSize = 0;
      selectNewSizeSettingAndHardReset(standardBoardSize);
    });
  
    //Set up CSS
    const css = `.chosen-preset {
      outline: 3px solid yellow;
      z-index: 1;
    }`;
    document.getElementsByTagName('style')[0].innerHTML = document.getElementsByTagName('style')[0].innerHTML + css;
  
  }
  
  window.initialiseCanvas = function() {
    let customCanvas = document.getElementById('custom-preset-canvas');
    let customCtx = customCanvas.getContext('2d');
  
    //Save context here in-case we need to re-use
    customPresetManager.ctx = customCtx;
  
    customPresetManager.draw();
  }
  
  //Used so we can adjust where to spawn apples based on where the default spawn point is so that we can instead spawn stuff relative to top left
  window.getAppleSpawnPointOffset = function() {
    const boardWidth = eval(`window.wholeSnakeObject.${boardDimensions}.width`);
    switch(boardWidth) {
      case 17:
        return {x:-12,y:-7};
      case 10:
        return {x:-7,y:-4};
      case 24:
        return {x:-18,y:-10};
      default:
        throw new Error('Unknown apple offset for board with width: ' + boardWidth);
    }
  }
  
  //Change where the snake starts out from
  window.setSnakeHead = function(x, y) {
    customSnakeStart.x = x;
    customSnakeStart.y = y;
    customSnakeStart.isActive = true;
  }
  
  window.checkPatternInBounds = function(pixelList) {
    const boardWidth = eval(`window.wholeSnakeObject.${boardDimensions}.width`);
    const boardHeight = eval(`window.wholeSnakeObject.${boardDimensions}.height`);
  
    const hasStuffOutOfBounds = pixelList.some(p => p.x < 0 || p.y < 0 || p.x > boardWidth - 1 || p.y > boardHeight - 1);
  
    return !hasStuffOutOfBounds;
  }

  //Turns _.abc into _s.abc
  window.swapInSnakeGlobal = function(text) {
    return assertReplace(text, /^_\./, '_s.');
  }
}

////////////////////////////////////////////////////////////////////
//ALTERSNAKECODE
////////////////////////////////////////////////////////////////////

window.levelEditorMod.alterSnakeCode = function(code) {
  code = code.replaceAll(/\$\$/gm, `aaaa`); //Prevent issues with $$ in variable names breaking stuff when replaced

  ///////////////////////////////////////
  //Taken from shared.js
  ///////////////////////////////////////

  //Copied from Pythag
  globalThis.tileWidth = code.assertMatch(/[a-z]\.[$a-zA-Z0-9_]{0,8}\.fillRect\([a-z]\*[a-z]\.[$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}),[a-z]\*[a-z]\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8},[a-z]\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8},[a-z]\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\)/)[1];//wa

  //setup for being able to move apples
  //Copied from gravity, but adjusted to be global and use code. intead of funcWithEat. and capturing groups adjusted.
  [,globalThis.applePosProperty, globalThis.appleSpeedProperty] = code.assertMatch(/&&\([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.x&&\([$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8})\.x\+=[$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8})\.x\),/);

  //Lifted from pythag
  globalThis.bodyArray = code.assertMatch(/var [a-z]=this\.[$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8})\[0\]\.clone\(\);/)[1];

  globalThis.makeApple = code.assertMatch(/this\.[$a-zA-Z0-9_]{0,8}\.push\(([$a-zA-Z0-9_]{0,8})\(this,-5,-4\)\)/)[1];
  globalThis.appleArray = code.assertMatch(/this\.([$a-zA-Z0-9_]{0,8})\.push\([$a-zA-Z0-9_]{0,8}\(this,-6,-3\)\)/)[1];

  //whole snake object has an object which in turn has the appleArray. (It's messy I know)
  globalThis.appleArrayHolderOfWholeSnakeObject = code.assertMatch(/this\.([$a-zA-Z0-9_]{0,8})\.reset\(\);this\.[$a-zA-Z0-9_]{0,8}=!1;/)[1];

  //globalThis.coordConstructor = swapInSnakeGlobal(code.assertMatch(/new (_\.[$a-zA-Z0-9_]{0,8})\(1,1\)/)[1]);
  globalThis.coordConstructor = code.assertMatch(/new (_\.[$a-zA-Z0-9_]{0,8})\(1,1\)/)[1];

  //Board dimensions - found in wholeSnakeObject, has width, height properties
  globalThis.boardDimensions = code.assertMatch(/x===Math.floor\([a-z]\.[$a-zA-Z0-9_]{0,8}\.([$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8})\.width\/2\)&&/)[1];

  //Checks whether we are playing a specific mode e.g. VK(this.settings,2) is true if we are playing portal
  let [,modeCheck, settingsProperty] = code.assertMatch(/([$a-zA-Z0-9_]{0,8})\(this\.([$a-zA-Z0-9_]{0,8}),6\)/);

  //Set snakeGlobalObject every reset
  let funcWithReset, funcWithResetOrig;
  funcWithReset = funcWithResetOrig = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,8}\.reset=function\(a\)$/,
  /[a-z]=\n?\.66/,
  false);

  funcWithReset = assertReplace(funcWithReset,'{','{globalThis.wholeSnakeObject = this;');//This line is changed slightly from varied.js

  funcWithReset = assertReplace(funcWithReset, /[$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8}\)&&\([a-z]\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}=!0\)\)/,
    `$&;window.simpleHookManager.runHook('afterResetBoard')`);

  code = code.replace(funcWithResetOrig, funcWithReset);

  //Get the object that contains the wholeSnakeObject.
  let funcWithResetState, funcWithResetStateOrig;
  funcWithResetState = funcWithResetStateOrig = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,8}\.prototype\.resetState=function\(a\)$/,
  /void 0===[a-z]\?!0:[a-z];this\.[$a-zA-Z0-9_]{0,8}\.reset\(a\);/);

  funcWithResetState = assertReplace(funcWithResetState, '{', '{globalThis.megaWholeSnakeObject = this;');

  code = code.replace(funcWithResetStateOrig, funcWithResetState);

  ///////////////////////////////////////
  //Taken from level-editor.js
  ///////////////////////////////////////

  //Make a function that empties apples
  (0,eval)(`
  function emptyApples() {
    window.wholeSnakeObject.${appleArrayHolderOfWholeSnakeObject}.${appleArray}.length = 0;
  }
  `);

  //Make a function to place an apple
  code = appendCodeWithinSnakeModule(code, `
  globalThis.placeApple = function(x,y,type,initialSpeed=undefined,customProperties={}) {
    let apple = ${makeApple}(window.wholeSnakeObject.${appleArrayHolderOfWholeSnakeObject}, x, y);
    apple.type = type;
    if(initialSpeed) {
      apple[window.appleSpeedProperty].x = initialSpeed.x;
      apple[window.appleSpeedProperty].y = initialSpeed.y;
    }
    Object.assign(apple, customProperties);
    window.wholeSnakeObject.${appleArrayHolderOfWholeSnakeObject}.${appleArray}.push(apple);
  }
  `, false);

  let wallDetailsContainer = code.assertMatch(/[$a-zA-Z0-9_]{0,8}&&\([$a-zA-Z0-9_]{0,8}\(this\.([$a-zA-Z0-9_]{0,8}),\n?[$a-zA-Z0-9_]{0,8}\),[$a-zA-Z0-9_]{0,8}\(this\.[$a-zA-Z0-9_]{0,8},7\)/)[1];

  //Setup for being able to place walls
  //For reference, we are matching the check for placing the "middle" wall in yinyang
  /*
  this.yb.push({Jb: a,Wm: !1,vz: -1,DH: !0,Th: !0}),
  */
  //let [,placeWallFunc,wallCoordProperty,otherProperty1,fakeWallProperty,otherProperty2] = code.match(/([$a-zA-Z0-9_]{0,8})\(this,[a-z],{([$a-zA-Z0-9_]{0,8}):[a-z],([$a-zA-Z0-9_]{0,8}:!1,[$a-zA-Z0-9_]{0,8}:-1),([$a-zA-Z0-9_]{0,8}):!0,([$a-zA-Z0-9_]{0,8}:!0,[$a-zA-Z0-9_]{0,8}:void 0)}\)/);
  let [,placeWallFunc,wallCoordProperty,otherProperty1,fakeWallProperty,otherProperty2] = code.assertMatch(/([$a-zA-Z0-9_]{0,8})\(this,[a-z],{([$a-zA-Z0-9_]{0,8}):[a-z],([$a-zA-Z0-9_]{0,8}:!1),([$a-zA-Z0-9_]{0,8}):!0,([$a-zA-Z0-9_]{0,8}:!0)}\)/);

  //Make a function to place a wall
  code = appendCodeWithinSnakeModule(code, `
  globalThis.placeWall = function(x, y, banNeighbourSpawning = false) {
    if(!${modeCheck}(window.wholeSnakeObject.${settingsProperty}, 1) && !window.hasShownWarnings.wall) {
      alert("You must use wall mode for this to work, otherwise you will travel straight through walls. Use blender mode if you want to include other settings. We won't show this message again.");
      window.hasShownWarnings.wall = true;
    }

    x = Math.round(x);
    y = Math.round(y);
    let wallCoord = new ${coordConstructor}(x, y);
    ${placeWallFunc}(window.wholeSnakeObject.${wallDetailsContainer}, wallCoord,
      {
        ${wallCoordProperty}: wallCoord,
        ${otherProperty1},
        ${fakeWallProperty}: false,
        ${otherProperty2}
      }
    );
  }
  `, false);

  let wallSet = code.assertMatch(/([$a-zA-Z0-9_]{0,8})\.set\([$a-zA-Z0-9_]{0,8}\([a-z]\),[a-z]\);/)[1];

  //Make a function to check if a wall exists at a given coordinate
  code = appendCodeWithinSnakeModule(code, `
  globalThis.checkWall = function(x,y) {
    if(x < 0 || x >= window.wholeSnakeObject.${boardDimensions}.width || y < 0 || y >= window.wholeSnakeObject.${boardDimensions}.height) {
      return true;
    }

    let serialisedCoord = x << 16 | y;
    let isWall = window.wholeSnakeObject.${wallDetailsContainer}.${wallSet}.has(serialisedCoord);
    return isWall;
  }
  `, false);

  //Probably should've used this function instead of placeWall method with manually pushing to an array, but OH WELL.

  let funcWithPlaceWall, funcWithPlaceWallOrig;
  funcWithPlaceWall = funcWithPlaceWallOrig = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,8}=function\(a,\n?b\)$/,
  ///[$a-zA-Z0-9_]{0,8}\([a-z],[a-z],{[$a-zA-Z0-9_]{0,8}:[a-z],[$a-zA-Z0-9_]{0,8}:!0,[$a-zA-Z0-9_]{0,8}:-1,[$a-zA-Z0-9_]{0,8}:!1,\n?[$a-zA-Z0-9_]{0,8}:![$a-zA-Z0-9_]{0,8}\([a-z]\.settings,11\),[$a-zA-Z0-9_]{0,8}:void 0}\);/,
  /[$a-zA-Z0-9_]{0,8}\([a-z],[a-z],{[$a-zA-Z0-9_]{0,8}:[a-z],[$a-zA-Z0-9_]{0,8}:!0,[$a-zA-Z0-9_]{0,8}:!1,\n?[$a-zA-Z0-9_]{0,8}:![$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8},\n?11\)}\);/,
  false);

  funcWithPlaceWall = assertReplace(funcWithPlaceWall, '{',
  `{
  if(disableWallMode) {
    return;
  }
  `);

  code = code.replace(funcWithPlaceWallOrig, funcWithPlaceWall);

  let sokoDetailsContainer = code.assertMatch(/this\.([$a-zA-Z0-9_]{0,8})\.reset\(\);if\([$a-zA-Z0-9_]{0,8}\(this\.[$a-zA-Z0-9_]{0,8},8\)/)[1];

  //Setup for placing sokoban boxes
  //let [,sokoboxSet, sokoPosition, sokoOtherProperties] = code.match(/[a-z]\.([$a-zA-Z0-9_]{0,8})\.add\({([$a-zA-Z0-9_]{0,8}):[a-z],prev:null,([$a-zA-Z0-9_]{0,8}:!0,[$a-zA-Z0-9_]{0,8}:-1,[$a-zA-Z0-9_]{0,8}:!0)}\)/);
  let [,sokoboxSet, sokoPosition, sokoPrevProperty, sokoPlaySpawnAnimProperty, sokoLastProperty] = code.assertMatch(/[a-z]\.([$a-zA-Z0-9_]{0,8})\.add\({([$a-zA-Z0-9_]{0,8}):[a-z],\n?([$a-zA-Z0-9_]{0,8}):null,([$a-zA-Z0-9_]{0,8}):!0,([$a-zA-Z0-9_]{0,8}):[a-z]}\)/);

  //Make a function to place a sokobox
  code = appendCodeWithinSnakeModule(code, `
  globalThis.placeSokobox = function(x,y) {
    if(!${modeCheck}(window.wholeSnakeObject.${settingsProperty}, 9) && !window.hasShownWarnings.sokoban) {
      alert("You must use sokoban (box) mode for this to work, otherwise you will travel straight through boxes. Use blender mode if you want to include other settings. We won't show this message again.");
      window.hasShownWarnings.sokoban = true;
    }

    x = Math.round(x);
    y = Math.round(y);
    let sokoCoord = new ${coordConstructor}(x, y);
    window.wholeSnakeObject.${sokoDetailsContainer}.${sokoboxSet}.add({
      ${sokoPosition}: sokoCoord,
      ${sokoPrevProperty}:null,
      ${sokoPlaySpawnAnimProperty}:false,
      ${sokoLastProperty}:true
    });
  }
  `, false);

  let sokogoalSet = code.assertMatch(/[$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8},\n?7\)&&[a-z]\.([$a-zA-Z0-9_]{0,8})\.add\([$a-zA-Z0-9_]{0,8}\([a-z]\.[$a-zA-Z0-9_]{0,8},\n?[a-z]\)\)\)/)[1];

  //Make a function that removes sokoban goals
  code = appendCodeWithinSnakeModule(code, `
  globalThis.emptySokogoals = function(x,y) {
    window.wholeSnakeObject.${sokoDetailsContainer}.${sokogoalSet}.clear();
  }
  `, false);

  //Also have a function for emptying sokoboxes
  code = appendCodeWithinSnakeModule(code, `
  globalThis.emptySokoboxes = function(x,y) {
    window.wholeSnakeObject.${sokoDetailsContainer}.${sokoboxSet}.clear();
  }
  `, false);

  //Allow customising which position the snake starts from

  let funcWithSnakeStartPos, funcWithSnakeStartPosOrig;
  funcWithSnakeStartPos = funcWithSnakeStartPosOrig = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,8}\.prototype\.reset=function\(\)$/,
    /this\.[$a-zA-Z0-9_]{0,8}\.push\(new _\.[$a-zA-Z0-9_]{0,8}\(Math\.floor\(this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.width\/4\),Math\.floor\(this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.height\/2\)\)\);/,
    false);

  funcWithSnakeStartPos = assertReplace(funcWithSnakeStartPos,
    /this\.([$a-zA-Z0-9_]{0,8})\.push\(new [^]*3,Math\.floor\(this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\.height\/\n?2\)\)\);/,
    `setSelectedSnakeHead();
    if(customSnakeStart.isActive) {
      this.$1.push(new ${window.coordConstructor}(customSnakeStart.x, customSnakeStart.y));
      this.$1.push(new ${window.coordConstructor}(customSnakeStart.x - 1, customSnakeStart.y));
      this.$1.push(new ${window.coordConstructor}(customSnakeStart.x - 2, customSnakeStart.y));
      this.$1.push(new ${window.coordConstructor}(customSnakeStart.x - 3, customSnakeStart.y));
    } else {$&}`);

  code = code.replace(funcWithSnakeStartPosOrig, funcWithSnakeStartPos);

  //Func used to change settings in the menu
  let funcWithChangeSetting = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,8}=function\(a,b,c,d\)$/,
  /case "apple":[a-z]\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}=[a-z];break;/,
  false);

  //Just need the name of this function so we can call it.
  globalThis.changeSettingFuncName = /[$a-zA-Z0-9_]{0,8}/.exec(funcWithChangeSetting)[0];

  //Menu property - same regex as below
  let menuProperty = code.assertMatch(/if\(this\.([$a-zA-Z0-9_]{0,8})\.isVisible\(\)\|\|this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\)/)[1];

  //Func used to do a full reset (simulating click play from menu button?)
  let funcWithFullReset = findFunctionInCode(code, /[$a-zA-Z0-9_]{0,8}=function\(\)$/,
  /if\(this\.[$a-zA-Z0-9_]{0,8}\.isVisible\(\)\|\|this\.[$a-zA-Z0-9_]{0,8}\.[$a-zA-Z0-9_]{0,8}\)/,
  false);

  //Just need the name of this function so we can call it.
  globalThis.fullResetFuncName = /[$a-zA-Z0-9_]{0,8}/.exec(funcWithFullReset)[0];

  //Changes the size setting that is selected in the menu
  //newSize - 0 for normal, 1 for small, 2 for large
  code = appendCodeWithinSnakeModule(code, `
  globalThis.selectNewSizeSettingAndHardReset = function(newSizeSetting) {
    //Change size setting
    if(typeof window.megaWholeSnakeObject !== 'undefined' && newSizeSetting !== null) {
      let sizeEl = document.getElementById('size');
      ${changeSettingFuncName}(window.megaWholeSnakeObject.${menuProperty},sizeEl,true,newSizeSetting);
  
      //Also need to reposition and centralise the selected size in the menu. This is quite hacky.
      switch(newSizeSetting) {
        case 0:
          sizeEl.style.left = '129.25px';
          break;
        case 1:
          sizeEl.style.left = '91.5px';
          break;
        case 2:
          sizeEl.style.left = '51.5px';
          break;
        default:
          throw new Error('Unsupported size setting.');
      }
    }
  
    //Hard reset
    if(typeof window.megaWholeSnakeObject !== 'undefined') {
      window.megaWholeSnakeObject.${menuProperty}.visible = true;
      window.megaWholeSnakeObject[fullResetFuncName]();
      window.megaWholeSnakeObject.${menuProperty}.visible = false;
    }
  }
  `,false);

  return code;
}

////////////////////////////////////////////////////////////////////
//RUNCODEAFTER
////////////////////////////////////////////////////////////////////

window.levelEditorMod.runCodeAfter = function() {
  ///////////////////////////////////////
  //Taken from level-editor.js
  ///////////////////////////////////////

  window.setupMakePatternHtml();

  window.gameCanvasElMakePattern = document.getElementsByClassName('cer0Bd')[0];
  //Setup for being apple to place apples with the mouse
  gameCanvasElMakePattern.addEventListener('mousedown',placeAppleAtMouse);

  //styling
  document.querySelector('[jsaction="DGXxE"]').style.filter = 'sepia(50%)';
  document.getElementsByClassName('Jc72He rc48Qb')[0].children[0].style.textTransform = 'lowercase';

  //Blit the preset pattern as soon as the board is fully reset.
  simpleHookManager.registerHook('afterResetBoard', 'blitPresetAtStart',blitSelectedPreset);

  //For the custom preset stuff
  initialiseCanvas();
  otherPresetmanager.loadRandomHams();
  otherPresetmanager.loadChallenge();
}