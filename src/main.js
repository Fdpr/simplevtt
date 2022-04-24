const fs = require('fs')

var { webFrame, clipboard } = require('electron');
var { webContents } = require("@electron/remote");

webFrame.setVisualZoomLevelLimits(1, 1)

var lang = loadLanguage();
var config = loadConfig();

var canvas = document.getElementById("canvas");
canvas.style.backgroundColor = config.backgroundColor;
var ctx = canvas.getContext("2d");
ctx.fillStyle = config.backgroundColor;
ctx.imageSmoothingQuality = "high"; // Better interpolation for image rendering

var [mousex, mousey] = [0, 0]; // Mouse coordinates are stored here
var [measurex, measurey] = [0, 0]; // Starting coordinates for measurement
var measureWidth = 0; // measure width for TextBox so that it doesn't jump back

var tokens = [] // List of Tokens
var active = null // current Token

var backgrounds = [] // background images
var activeBackground = null // current background image

var mode = MODES.none;

var spacePressed = false; // needs to be kept to track dragging mode triggered by space bar

var zoomCounter = 0; // to show scale a few Frames after scale is complete

// Handles all the rendering
function draw(){
    
    clearCanvas();

    renderBackground();

    for (let token of tokens){
        renderToken(token);
    }

    if (mode == MODES.measure)
        renderMeasure();
    else if (mode == MODES.cube)
        renderSquare();
    else if (mode == MODES.circle)
        renderCircle();
    else if (mode == MODES.cone)
        renderCone();

    if (zoomCounter > 0){
        zoomCounter--;
        renderTextBox(lang.zoom + ": " + getTransformScale(ctx.getTransform()).toFixed(2));
    }
}

// Renders a token onto the Canvas
function renderToken(token){
    ctx.drawImage(token.image, token.x, token.y, token.scale*token.gridScale*token.image.width, token.scale*token.gridScale*token.image.height); // scaling
}

function renderBackground(){
    fillCanvas(config.backgroundColor);

    for(bgr of backgrounds)
        renderToken(bgr);
    // Draw the Grid
    if (config.showGrid){
        ctx.fillStyle = config.gridColor;
        let {x: origx, y:origy} = mouseToTransform(0, 0);
        let {x: edgex, y:edgey} = mouseToTransform(canvas.width, canvas.height);
        let gridWidth = mouseToTransform(1, 1, true)["x"];
        origx = (roundFromZero(origx / config.gridSize)-2) * config.gridSize;
        origy = (roundFromZero(origy / config.gridSize)-2) * config.gridSize;
        edgex = roundFromZero(edgex / config.gridSize) * config.gridSize;
        if (edgex < 0)
            edgex += config.gridSize * 2;
        edgey = roundFromZero(edgey / config.gridSize) * config.gridSize;
        if (edgey < 0)
            edgey += config.gridSize * 2;
        
        for (let i = origx; i <= edgex; i += config.gridSize){
            ctx.fillRect(i + config.gridOffsetX, origy, gridWidth, edgey-origy);
        }
        for (let i = origy; i <= edgey; i += config.gridSize){
            ctx.fillRect(origx, i + config.gridOffsetY, edgex-origx, gridWidth);
        }
    }
}

function renderMeasure(){
    let {x: origx, y:origy} = mouseToTransform(measurex, measurey);
    ctx.beginPath();
    ctx.moveTo(origx, origy);
    let {x: finishx, y:finishy} = mouseToTransform(mousex, mousey);
    ctx.lineTo(finishx, finishy);
    ctx.closePath();
    ctx.lineWidth = mouseToTransform(2, 2, true).x;
    ctx.strokeStyle = config.measureColor;
    ctx.stroke();
    let dist = magnitude(finishx-origx, finishy-origy);
    dist = ( dist / config.gridSize ) * 5 * config.convert; 
    
    renderTextBox(lang.distance + ": " + dist.toFixed(2) + " " + config.metric);

}

function renderSquare(){
    let {x: origx, y:origy} = mouseToTransform(measurex, measurey);
    let {x: finishx, y:finishy} = mouseToTransform(mousex, mousey);
    let xdist = (finishx-origx), ydist = (finishy-origy);
    let dist = magnitude(xdist, ydist);
    let angle = Math.acos((xdist * 1) / (magnitude(xdist, ydist)));
    if (ydist < 0)
        angle = Math.PI * 2 - angle;
    ctx.lineWidth = mouseToTransform(2, 2, true).x;
    ctx.strokeStyle = config.aoeStroke;
    ctx.fillStyle = config.aoeFill;
    ctx.beginPath();
    ctx.moveTo(origx + Math.cos(angle) * dist - Math.sin(angle) * dist, origy + Math.sin(angle) * dist + Math.cos(angle) * dist);
    for (let i = 0; i < 4; i++){
        angle += Math.PI / 2;
        ctx.lineTo(origx + Math.cos(angle) * dist - Math.sin(angle) * dist, origy + Math.sin(angle) * dist + Math.cos(angle) * dist);
    }
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
    
    dist = ( dist / config.gridSize ) * 5 * config.convert; 
    
    renderTextBox(lang.length + ": " + (dist * 2).toFixed(2) + " " + config.metric);

}

function renderCircle(){
    let {x: origx, y:origy} = mouseToTransform(measurex, measurey);
    let {x: finishx, y:finishy} = mouseToTransform(mousex, mousey);
    let xdist = (finishx-origx), ydist = (finishy-origy);
    let dist = magnitude(xdist, ydist);
    ctx.lineWidth = mouseToTransform(2, 2, true).x;
    ctx.strokeStyle = config.aoeStroke;
    ctx.fillStyle = config.aoeFill;
    ctx.beginPath();
    ctx.arc(origx, origy, dist, 0, Math.PI * 2)
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
    
    dist = ( dist / config.gridSize ) * 5 * config.convert; 
    
    renderTextBox(lang.radius + ": " + (dist * 2).toFixed(2) + " " + config.metric);
}

function renderCone(){
    let {x: origx, y:origy} = mouseToTransform(measurex, measurey);
    let {x: finishx, y:finishy} = mouseToTransform(mousex, mousey);
    let xdist = (finishx-origx), ydist = (finishy-origy);
    let dist = magnitude(xdist, ydist);
    let angle = Math.acos((xdist * 1) / (magnitude(xdist, ydist)));
    if (ydist < 0)
        angle = Math.PI * 2 - angle;
    angle += Math.PI / 4 + 0.1;
    let x1 = finishx + Math.cos(angle) * (dist/2) - Math.sin(angle) * (dist / 2), 
        y1 = finishy + Math.sin(angle) * (dist / 2) + Math.cos(angle) * (dist / 2);

    angle -= Math.PI + 0.2;
    let x2 = finishx + Math.cos(angle) * (dist/2) - Math.sin(angle) * (dist / 2), 
        y2 = finishy + Math.sin(angle) * (dist / 2) + Math.cos(angle) * (dist / 2);


    ctx.lineWidth = mouseToTransform(2, 2, true).x;
    ctx.strokeStyle = config.aoeStroke;
    ctx.fillStyle = config.aoeFill;
    ctx.beginPath();
    ctx.moveTo(origx, origy)
    ctx.lineTo(x1, y1);
    ctx.quadraticCurveTo(finishx + (finishx - origx) * 0.07, finishy + (finishy - origy) * 0.07, x2, y2);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
    
    dist = ( dist / config.gridSize ) * 5 * config.convert; 
    
    renderTextBox(lang.distance + ": " + dist.toFixed(2) + " " + config.metric);

}

function renderTextBox(text){
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = config.textSize + "px " + config.textStyle;

    let measure = ctx.measureText(text);

    let width = Math.max(measure.width + 10, measureWidth), height = 26;
    measureWidth = Math.max(width, measureWidth)
    let x = 5, y = 5;

    ctx.strokeStyle = config.textBoxStroke
    ctx.fillStyle = config.textBoxFill;
    ctx.lineWidth = 2;

    let radius = 5;
    radius = {tl: radius, tr: radius, br: radius, bl: radius};

    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = config.textColor;
    ctx.fillText(text, 10, 23);

    ctx.restore();
}

function keyPressed(event){

    event.preventDefault();

    let name = event.key;
    let code = event.code;

    if (code == "Space")
        spacePressed = true;

    
    // Rotating and scaling are allowed while dragging
    if (mode == MODES.none || mode == MODES.drag){

        if (code == "KeyD" && event.ctrlKey && event.shiftKey){
            webContents.getFocusedWebContents().openDevTools();
            // this.webContents.openDevTools();
        }

        // Rotation of Token
        if (code == "KeyR")
            rotateToken(true, event.shiftKey, event.ctrlKey);

        // Counter-Rotation of Token
        else if (code == "KeyF")
            rotateToken(false, event.shiftKey, event.ctrlKey);
        
        // Scale up Token
        else if (code == "BracketRight" && !event.altKey)
            scaleToken(true, event.shiftKey, event.ctrlKey);
        else if (code == "Slash" && !event.altKey)
            scaleToken(false, event.shiftKey, event.ctrlKey);
        else if (code == "KeyK")
            killToken();
    }

    if (mode == MODES.none){

        // load config or state
        if (code == "KeyO"){
            let {lconfig, vtt} = loadLocalConfig();
            if (lconfig){
                config = {...config, ...lconfig};
                if (lconfig.background)
                    addBackground(true);
            }
            else if (vtt){
                backgrounds = vtt.backgrounds;
                tokens = vtt.tokens;
                config = vtt.config;
            }
        }

        if (code == "KeyS"){
            saveVTT();
        }

        if (code == "KeyV" && event.ctrlKey){
            let img = clipboard.readImage();
            if (img.toDataURL)
                addExternal(img.toDataURL());
        }

        // Remove token
        if (code == "Delete" || code == "Backspace")
            if (event.shiftKey || event.ctrlKey)
                removeToken(true);
            else
                removeToken(false);

        // Load a token from image
        if (name == "l"){
            let path = loadImageFile();
            if (path){
                addToken(path, lang.token + " " + (tokens.length + 2), 1)
            }
        }

        // Add an enemy
        if (/^[1-9]$/i.test(name) && !event.shiftKey){
            addEnemy(name);
            draw();
        } else if (code.startsWith("Digit") && !code.endsWith("0") && event.shiftKey){
            addHero(code.charAt(code.length - 1))
            draw();
        }

        // Add a background image
        if (code == "KeyB")
            addBackground();

        // Change grid size
        let gridDelta = -1;
        if (event.ctrlKey)
            gridDelta *= 5;
        if (code == "BracketRight" && event.altKey)
            scaleGrid(gridDelta, true);
        else if (code == "Slash" && event.altKey)
            scaleGrid(-gridDelta, true);

        // Toggle grid
        if (name == "g")
            config.showGrid = !config.showGrid;

        // Pan Screen with Arrows
        let panning = mouseToTransform(5,5, true)["x"];
        if (event.ctrlKey)
            panning *= 10;
        if (name == "ArrowLeft")
            ctx.translate(panning, 0)
        else if (name == "ArrowRight")
            ctx.translate(-panning, 0)
        else if (name == "ArrowUp")
            ctx.translate(0, panning)
        else if (name == "ArrowDown")
            ctx.translate(0, -panning)
        // Start measuring
        if (code == "KeyM"){
            measurex = mousex;
            measurey = mousey;
            mode = MODES.measure;
        } else if (code == "KeyN"){
            measurex = mousex;
            measurey = mousey;
            mode = MODES.cube;
        } else if (code == "KeyV" && !event.ctrlKey){
            measurex = mousex;
            measurey = mousey;
            mode = MODES.cone;
        } else if (code == "KeyC"){
            measurex = mousex;
            measurey = mousey;
            mode = MODES.circle;
        }
    
    }

    draw();
}

function keyReleased(event){
    let name = event.key;
    let code = event.code;

    if (code == "KeyM" && mode == MODES.measure){
        mode = MODES.none;
        measureWidth = 0;
    } else if (code == "KeyN" && mode == MODES.cube){
        mode = MODES.none;
        measureWidth = 0;
    } else if (code == "KeyC" && mode == MODES.circle){
        mode = MODES.none;
        measureWidth = 0;
    } else if (code == "KeyV" && mode == MODES.cone){
        mode = MODES.none;
        measureWidth = 0;
    }
    if (code == "Space")
        spacePressed = false;
    draw();
}

// Puts an enemy token on the table, either from local directory (if available) or standard
function addEnemy(n){
    if (config.enemies){
        let nParse = parseInt(n)
        if (config.enemies && config.enemies[nParse] != null){
            addToken(config.localDir + "\\" + config.enemies[nParse].src, config.enemies[nParse].name, config.enemies[nParse].scale)
            return;
        }
    } 
    addToken(app.getAppPath() + "/config/enemies/"+n+".png", lang.enemy + " " + n, 1);
}

// Puts a hero token from the config file on the table, if available 
function addHero(n){
    if (config.localHeroes && config.localHeroes[n] != null){
        addToken(config.localDir + "\\" + config.localHeroes[n].src, config.localHeroes[n].name, config.localHeroes[n].scale)
        return;
    } else if (config.heroes && config.heroes[n] != null){
        addToken(app.getAppPath() + "/config/heroes/" + config.heroes[n].src, config.heroes[n].name, config.heroes[n].scale)
        return;
    }
}

// Loads a Token and places it on board
function addToken(path, name, scale){
    if (!scale){
        scale = 1;
    }
    let image;
    if (path == null)
        image = loadImage();
    else{
        image = assignImage("data:image/png;base64," + fs.readFileSync(path).toString('base64'));
    }
    if (image){
        image.onload = function(){
            let token = new CharToken(image, name, config.gridSize, scale);
            let {x: tokX, y: tokY} = mouseToTransform(mousex, mousey);
            token.center(tokX, tokY)
            tokens.push(token);
        }
    }
}

// Adds a new background and puts it on the board
function addBackground(def = false){
    let src;
    if (def){
        src = config.localDir + "\\" + config.background;
    } else {
        src = loadImageFile();
        if (!src)
            return;
    }
    image = new Image();
    try{
        image.src = "data:image/png;base64," + fs.readFileSync(src).toString('base64');
    }catch(error){
        displayResourceError();
        return false;
    }
    if (image){
        image.onload = function(){
            let token = new CharToken(image, "background", config.gridSize, -1);
            let {x: tokX, y: tokY} = mouseToTransform(mousex, mousey);
            token.center(tokX, tokY)
            backgrounds.push(token);
        }
    }
}

function dropImage(event){
    event.preventDefault();
    event.stopPropagation();

    
    for (const f of event.dataTransfer.files) {
        let segments = f.path.split("\\");
        let name = segments[segments.length - 1]
        let nextsegs = name.split(".")
        let filetype = nextsegs[nextsegs.length - 1];
        if (filetype == "gif" || filetype == "png" || filetype == "jpg" || filetype == "jpeg")
            addExternal("data:image/png;base64," + fs.readFileSync(f.path).toString('base64'))
        }
}

// Adds an image from external source (clipboard, drag and drop) that needs to be determined if token or background
function addExternal(imageData){
    if (displayExternal()){
        let image = assignImage(imageData);
        if (image){
            image.onload = function(){
                let token = new CharToken(image, "Character", config.gridSize, 1);
                let {x: tokX, y: tokY} = mouseToTransform(mousex, mousey);
                token.center(tokX, tokY);
                tokens.push(token);
            }
        }
    } else {
        let image = assignImage(imageData);
        if (image){
            image.onload = function(){
                let token = new CharToken(image, "background", config.gridSize, -1);
                let {x: tokX, y: tokY} = mouseToTransform(mousex, mousey);
                token.center(tokX, tokY)
                backgrounds.push(token);
            }
        }
    }
}

function killToken(){
    for (var i = tokens.length - 1; i >= 0; i--) {
        if (mouseOverToken(tokens[i])){
            tokens[i].killed = !tokens[i].killed;
            tokens[i].updateImage();
            return true;
        }
    }
}

function removeToken(isBackground){
    if (isBackground){
        for (var i = backgrounds.length - 1; i >= 0; i--) {
            if (mouseOverToken(backgrounds[i])){
                backgrounds.splice(i, 1)
                return true;
            }
        }
        return false; 
    }
    else {
        for (var i = tokens.length - 1; i >= 0; i--) {
            if (mouseOverToken(tokens[i])){
                tokens.splice(i, 1)
                return true;
            }
        }
        return false;
    }
}

function scaleToken(plus, chunk, isBackground){
    step = .1;
    if (!plus)
        step *= -1;
    if (chunk)
        step *= 10;
    if (isBackground){
        for (var i = backgrounds.length - 1; i >= 0; i--) {
            let token = activeBackground;
            if (mouseOverToken(backgrounds[i]) || mode == MODES.backgroundDrag){
                if (mode != MODES.backgroundDrag)
                    token = backgrounds[i];
                backgrounds.splice(i, 1)
                backgrounds.push(token)
                if (chunk)
                    token.setScale(Math.max(.1, Math.round(token.scale) + step));
                else
                    token.setScale(Math.max(.1, token.scale + step));
                token.updateImage();
                return true;
            }
        }
    }else {
        for (var i = tokens.length - 1; i >= 0; i--) {
            let token = active;
            if (mouseOverToken(tokens[i]) || mode == MODES.drag){
                if (!mode == MODES.drag)
                    token = tokens[i];
                tokens.splice(i, 1)
                tokens.push(token)
                if (chunk)
                    token.setScale(Math.max(.1, Math.round(token.scale) + step));
                else
                    token.setScale(Math.max(.1, token.scale + step));
                token.updateImage();
                return true;
            }
        }
        return false;
    }
}

function rotateToken(forwards, chunk, isBackground){
    let deg = 10;
    if (!forwards)
        deg *= -1;
    if (isBackground){
        console.log("TRUE")
        for (var i = backgrounds.length - 1; i >= 0; i--) {
            let token = activeBackground;
            if (mouseOverToken(backgrounds[i]) || mode == MODES.drag){
                if (!mode == MODES.drag)
                    token = backgrounds[i];
                backgrounds.splice(i, 1)
                backgrounds.push(token)
                if(!chunk){
                    token.rot += deg * (Math.PI / 180);
                    token.rot = token.rot % (2*Math.PI);
                } else {
                    token.rot = Math.round(token.rot / (Math.PI / 2)) * (Math.PI / 2);
                    if (forwards)
                        token.rot += Math.PI / 2;
                    else
                        token.rot -= Math.PI / 2;
                    token.rot = token.rot % (2*Math.PI);
                }
                token.updateImage();
                return true;
            }
        }
    } else {
        for (var i = tokens.length - 1; i >= 0; i--) {
            let token = active;
            if (mouseOverToken(tokens[i]) || mode == MODES.drag){
                if (!mode == MODES.drag)
                    token = tokens[i];
                tokens.splice(i, 1)
                tokens.push(token)
                if(!chunk){
                    token.rot += deg * (Math.PI / 180);
                    token.rot = token.rot % (2*Math.PI);
                } else {
                    token.rot = Math.round(token.rot / (Math.PI / 2)) * (Math.PI / 2);
                    if (forwards)
                        token.rot += Math.PI / 2;
                    else
                        token.rot -= Math.PI / 2;
                    token.rot = token.rot % (2*Math.PI);
                }
                token.updateImage();
                return true;
            }
        }
    }
    return false;
}

function zoom(event){
    if (mode != MODES.none)
        return;
    zoomCounter = 10;
    if (event.altKey){
        let amount = (Math.min(Math.max(0.8, 1 + (event.deltaY * config.gridScrollSpeed )), 1.3) - 1) * config.gridSize
        scaleGrid(amount, false)
        draw();
        return;
    }
    let scale = getTransformScale(ctx.getTransform());
    let delta = -event.deltaY;
    if ((scale > 10 && delta > 0) || (scale < .1 && delta < 0))
        return;
    let amount = Math.min(Math.max(0.8, 1 + (delta * config.scrollSpeed)), 1.3);
    let { x:nx, y:ny } = mouseToTransform(mousex, mousey);
    ctx.translate(nx, ny)
    ctx.scale(amount, amount);
    ctx.translate(-nx, -ny)
    
    draw();
}

function scaleGrid(delta, roundToInt){
    let {x, y} = mouseToTransform(mousex, mousey);
    let oldRelX = ((x - config.gridOffsetX) % (config.gridSize)) / config.gridSize;
    let oldRelY = ((y - config.gridOffsetY) % (config.gridSize)) / config.gridSize;

    if (roundToInt)
        config.gridSize = Math.round(Math.max(2, config.gridSize - delta));
    else
        config.gridSize = Math.max(2, config.gridSize - delta);
    let newRelX = (x % (config.gridSize)) / config.gridSize;
    let newRelY = (y % (config.gridSize)) / config.gridSize;
    config.gridOffsetX = -(oldRelX - newRelX) * config.gridSize;
    config.gridOffsetY = -(oldRelY - newRelY) * config.gridSize;

    refreshGridOffset(0, 0);
    for (token of tokens)
        token.updateGrid(config.gridSize);
}

function mousedown(event){
    if (mode == MODES.none){
        if(event.ctrlKey || spacePressed){
            mode = MODES.pan;
            draw();
        } else if (event.altKey) {
            mode = MODES.gridDrag;
            draw();
        } else if (event.shiftKey) {
            for (var i = backgrounds.length - 1; i >= 0; i--) {
                if (mouseOverToken(backgrounds[i])){
                    activeBackground = backgrounds[i];
                    mode = MODES.backgroundDrag;
                    backgrounds.splice(i, 1)
                    backgrounds.push(activeBackground)
                    draw();
                    return;
                }
            }
        }
        else {
            for (var i = tokens.length - 1; i >= 0; i--) {
                if (mouseOverToken(tokens[i])){
                    active = tokens[i];
                    mode = MODES.drag;
                    tokens.splice(i, 1)
                    tokens.push(active)
                    draw();
                    return;
                }
            }
        }
    }
}

function mouseup(){
    active = null;
    activeBackground = null
    if (mode == MODES.drag || mode == MODES.pan || mode == MODES.gridDrag || mode == MODES.backgroundDrag)
        mode = MODES.none;
    
    draw();
}

// Updates mouse position on every move
function mouserefresh(event){
    let oldx = mousex,
        oldy = mousey;
    mousex = event.clientX;
    mousey = event.clientY;

    if (mode == MODES.drag){
        let { x:deltax, y:deltay } = mouseToTransform(mousex-oldx, mousey-oldy, true);
        active.x += deltax;
        active.y += deltay;
    } else if (mode == MODES.pan){
        let { x:deltax, y:deltay } = mouseToTransform(mousex-oldx, mousey-oldy, true);
        ctx.translate(deltax, deltay);
    } else if (mode == MODES.gridDrag){
        let { x:deltax, y:deltay } = mouseToTransform(mousex-oldx, mousey-oldy, true);
        refreshGridOffset(deltax, deltay);
    } else if (mode == MODES.backgroundDrag){
        let { x:deltax, y:deltay } = mouseToTransform(mousex-oldx, mousey-oldy, true);
        activeBackground.x += deltax;
        activeBackground.y += deltay;
    }
    draw();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', mouserefresh);
window.addEventListener('keydown', keyPressed);
window.addEventListener('keyup', keyReleased);
window.addEventListener('mousedown', mousedown);
window.addEventListener('mouseup', mouseup);
window.addEventListener('blur', (event) => {spacePressed = false;});
document.addEventListener('drop', dropImage);
window.onwheel = zoom;

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
