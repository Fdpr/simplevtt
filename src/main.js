const { dialog } = require('@electron/remote')
const fs = require('fs')

var lang = loadLanguage();
var config = loadConfig();

var canvas = document.getElementById("canvas");
canvas.style.backgroundColor = config.backgroundColor;
var ctx = canvas.getContext("2d");
ctx.fillStyle = "rgb(20, 20, 20)"
ctx.imageSmoothingQuality = "high"; // Better interpolation for image rendering

var [mousex, mousey] = [0, 0]; // Mouse coordinates are stored here
var [measurex, measurey] = [0, 0]; // Starting coordinates for measurement

var tokens = [] // List of Tokens
var active = null // current Token

var backgrounds = [] // background images
var background = new Image();
background.src = "data:image/xxx;base64," + fs.readFileSync("./res/background.png").toString('base64');
var mode = MODES.none;

var shiftPressed = false,
    ctrlPressed = false,
    altPressed = false,
    spacePressed = false;

// Handles all the rendering
function draw(){
    
    clearCanvas();

    renderBackground();

    for (let token of tokens){
        renderToken(token);
    }

    if (mode == MODES.measure)
        renderMeasure();
}

// Renders a token onto the Canvas
function renderToken(token){
    ctx.drawImage(token.image, token.x, token.y, token.scale*token.gridScale*token.image.width, token.scale*token.gridScale*token.image.height); // scaling
}

function renderBackground(){
    fillCanvas(config.backgroundColor);
    ctx.drawImage(background, 0, 0);
    // Draw the Grid
    if (config.showGrid){
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
    ctx.stroke();
    let dist = Math.sqrt(((finishx-origx) * (finishx-origx)) + ((finishy-origy) * (finishy-origy)))
    dist = ( dist / config.gridSize ) * 5 * config.convert; 
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillText(dist + " " + config.metric, mousex, mousey);
    ctx.restore();
}

function keyPressed(event){

    let name = event.key;
    let code = event.code;

    if (name == "Control")
        ctrlPressed = true;
    if (name == "Shift")
        shiftPressed = true;
    if (name == "Alt")
        altPressed = true;
    if (code == "Space")
        spacePressed = true;

    
    // Rotating and scaling are allowed while dragging
    if (mode == MODES.none || mode == MODES.drag){

        // Rotation of Token
        if (code == "KeyR")
            rotateToken(true, event.shiftKey);

        // Counter-Rotation of Token
        else if (code == "KeyF")
            rotateToken(false, event.shiftKey);
        
        // Scale up Token
        else if (code == "BracketRight" && !event.altKey)
            scaleToken(true, event.shiftKey);
        else if (code == "Slash" && !event.altKey)
            scaleToken(false, event.shiftKey);

    }

    if (mode == MODES.none){

        // Remove token
        if (code == "Delete" || code == "Backspace")
            removeToken();

        // Load a token from image
        if (name == "l"){
            let path = loadImageFile();
            if (path){
                addToken(path, lang.token + " " + (tokens.length + 2), 1)
            }
        }

        // Add an enemy
        if (/^[1-9]$/i.test(name) && !shiftPressed){
            addEnemy(name);
            draw();
        } else if (code.startsWith("Digit") && !code.endsWith("0") && shiftPressed){
            addHero(code.charAt(code.length - 1))
            draw();
        }

        // Change grid size
        let gridDelta = 1;
        if (ctrlPressed)
            gridDelta *= 5;
        if (code == "BracketRight" && event.altKey)
        {
            config.gridSize += gridDelta;
            for (token of tokens)
                token.updateGrid(config.gridSize);
        }
        else if (code == "Slash" && event.altKey){
            config.gridSize = Math.max(2, config.gridSize - gridDelta);
            for (token of tokens)
                token.updateGrid(config.gridSize);
        }

        // Toggle grid
        if (name == "g")
            config.showGrid = !config.showGrid;

        // Pan Screen with Arrows
        let panning = mouseToTransform(5,5, true)["x"];
        if (ctrlPressed)
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
            console.log("Hi");
            measurex = mousex;
            measurey = mousey;
            mode = MODES.measure;
        }
    
    }

    draw();
}

function keyReleased(event){
    let name = event.key;
    let code = event.code;

    if (code == "KeyM" && mode == MODES.measure){
        mode = MODES.none;
        console.log("Tschüss!");
    }
    if (name == "Control")
        ctrlPressed = false;
    if (name == "Shift")
        shiftPressed = false;
    if (name == "Alt")
        altPressed = false;
    if (code == "Space")
        spacePressed = false;
    draw();
}

// Puts an enemy token on the table, either from local directory (if available) or standard
function addEnemy(n){
    if (config.enemies){
        let nParse = parseInt(n)
        if (config.enemies.length >= nParse){
            addToken(config.enemies[nParse - 1].src, config.enemies[nParse - 1].name)
            return;
        }
    } 
    addToken("./config/enemies/"+n+".png", lang.enemy + " " + n, 1);
}

// Puts a hero token from the config file on the table, if available 
function addHero(n){
    console.log("Hi")
    if (config.heroes){
        let nParse = parseInt(n)
        if (config.heroes.length >= nParse){
            addToken("./config/heroes/" + config.heroes[nParse - 1].src, config.heroes[nParse - 1].name, config.heroes[nParse - 1].scale)
            return;
        }
    } 
}

// Loads a Token and 
function addToken(path, name, scale){
    if (!scale){
        scale = 1;
    }
    let image;
    if (path == null)
        image = loadImage();
    else{
        image = new Image();
        try{     
            image.src = "data:image/png;base64," + fs.readFileSync(path).toString('base64');
        }catch(error){
            dialog.showMessageBoxSync({message:lang.resourceError, type:"error", buttons:[lang.okay], title:lang.resourceErrorTitle})
            return false;
        }
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

function removeToken(){
    for (var i = tokens.length - 1; i >= 0; i--) {
        if (mouseOverToken(tokens[i])){
            tokens.splice(i, 1)
            return true;
        }
    }
    return false;
}

function scaleToken(plus, chunk){
    step = .1;
    if (!plus)
        step *= -1;
    if (chunk)
        step *= 10;
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

function rotateToken(forwards, chunk){
    let deg = 10;
    if (!forwards)
        deg *= -1;
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
    return false;
}

function zoom(event){
    if (mode != MODES.none)
        return;
    let scale = getTransformScale(ctx.getTransform());
    let delta = -event.deltaY;
    if ((scale > 10 && delta > 0) || (scale < .1 && delta < 0))
        return;
    let amount = Math.min(Math.max(0.8, 1 + (delta * 0.005)), 1.3);
    let { x:nx, y:ny } = mouseToTransform(mousex, mousey);
    ctx.translate(nx, ny)
    ctx.scale(amount, amount);
    ctx.translate(-nx, -ny)
    
    draw();
}

function mousedown(){
    if (mode == MODES.none){
        if(ctrlPressed || spacePressed){
            mode = MODES.pan;
            draw();
        } else if (altPressed) {
            mode = MODES.gridDrag;
            draw();
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
    if (mode == MODES.drag || mode == MODES.pan || mode == MODES.gridDrag)
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
        config.gridOffsetX = (config.gridOffsetX + deltax) % config.gridSize;
        config.gridOffsetY = (config.gridOffsetY + deltay) % config.gridSize;
    }
    draw();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', mouserefresh);
window.addEventListener('keydown', keyPressed);
window.addEventListener('keyup', keyReleased);
window.addEventListener('mousedown', mousedown);
window.addEventListener('mouseup', mouseup);
window.onwheel = zoom;