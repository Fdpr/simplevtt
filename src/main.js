const { dialog } = require('@electron/remote')
const fs = require('fs')


var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
ctx.imageSmoothingQuality = "high"; // Better interpolation for image rendering
var [mousex, mousey] = [0, 0]; // Mouse coordinates are stored here
var tokens = [] // List of Tokens
var active = null // current Token
var background = new Image() // background image
background.src = "data:image/png;base64," + fs.readFileSync("./res/background.png").toString('base64');
var gridSize = 50; // distance between grid lines
var mode = MODES.none;


// Updates mouse position on every move
function mouserefresh(event){
    let oldx = mousex,
        oldy = mousey;
    mousex = event.clientX;
    mousey = event.clientY;
    if (active != null){
        let { x:deltax, y:deltay } = mouseToTransform(mousex-oldx, mousey-oldy, true);
        active.x += deltax;
        active.y += deltay;
    }
    draw();
}

// Handles all the rendering
function draw(){
    
    clearCanvas();

    ctx.fillStyle = "rgb(0,0,0)";

    renderBackground();

    let { x, y }  = mouseToTransform(mousex - 5, mousey - 5);
    let { x:w, y:h }  = mouseToTransform(10, 10, true)
    ctx.fillRect(x, y, w, h);

    for (let token of tokens){
        renderToken(token);
    }
}

// request to load an image from an external resource
function loadImage(){
    let files = dialog.showOpenDialogSync({title: "Hi", defaultPath: ".", properties: ["openFile"], filters: [
        { name: 'Bilder', extensions: ['jpg', 'png', 'gif', 'jpeg'] }]})
    if (files != null && files.length > 0){
        let mimg = new Image();
        mimg.src = "data:image/png;base64," + fs.readFileSync(files[0]).toString('base64');
        return mimg;
    }
    return null;
}

// Renders a token onto the Canvas
function renderToken(token){
    ctx.drawImage(token.image, token.x, token.y, token.scale*token.gridScale*token.image.width, token.scale*token.gridScale*token.image.height); // scaling
    // ctx.drawImage(token.image, token.x, token.y); // Not scaling
    console.log(token.x, token.y, token.scale, token.gridScale);
}

function renderBackground(){
    ctx.drawImage(background, 0, 0);
    let nwidth = background.width * 3,
        nheight = background.height * 3;
    for (let i = -background.width; i <= background.width * 2; i+= gridSize)
        ctx.fillRect(i, -background.height, 1, background.height * 3);
    for (let i = -background.height; i <= background.height * 2; i+= gridSize)
        ctx.fillRect(-background.width, i, background.width * 3, 1);
}

function zoom(event){
    if (mode != MODES.none)
        return;
    let scale = getTransformScale(ctx.getTransform());
    let delta = -event.deltaY;
    if ((scale > 10 && delta > 0) || (scale < .1 && delta < 0))
        return;
    let amount = Math.max(0.1, 1 + (delta * 0.005));
    console.log(scale);
    let { x:nx, y:ny } = mouseToTransform(mousex, mousey);
    ctx.translate(nx, ny)
    ctx.scale(amount, amount);
    ctx.translate(-nx, -ny)
    draw();
}

function keyPressed(event){

    let name = event.key;
    let code = event.code;

    if (name == "s"){
        let image = loadImage();
        if (image){
            image.onload = function(){
                let token = new CharToken(image, "null", gridSize);
                tokens.unshift(token);
            }
        }
    }

    if (name == "r") bracket:{
        for (let token of tokens){
            if (mouseOverToken(token)){
                token.rot += 5 * (Math.PI / 180);
                token.updateImage();
                break bracket;
            }
        }
    }
    if (name == "+"){
        let { x:nx, y:ny } = mouseToTransform(mousex, mousey);
        ctx.translate(nx, ny)
        ctx.scale(1.11111111, 1.11111111);
        ctx.translate(-nx, -ny)
    }
    if (name == "-"){
        let { x:nx, y:ny } = mouseToTransform(mousex, mousey);
        ctx.translate(nx, ny)
        ctx.scale(0.9, 0.9);
        ctx.translate(-nx, -ny)
    }
    draw();
}

function mousedown(){
    for (let token of tokens){
        if (mouseOverToken(token)){
            active = token;
            return;
        }
    }
}

function mouseup(){
    active = null
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', mouserefresh);
window.addEventListener('keydown', keyPressed);
window.addEventListener('mousedown', mousedown);
window.addEventListener('mouseup', mouseup);
window.onwheel = zoom;