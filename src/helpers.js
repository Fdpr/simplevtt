// Returns the uniform scaling factor for the whole canvas
function getTransformScale(mtrans){
    return Math.sqrt(mtrans.m11*mtrans.m11 + mtrans.m12 * mtrans.m12 + mtrans.m13 * mtrans.m13);
}
// Converts a point from Mouse space to Transform space. Keeps origin of canvas in mind, unless scale-only is applied
function mouseToTransform(x, y, scaleOnly){
    let mtrans = ctx.getTransform()
    mtrans.invertSelf()
    if (scaleOnly){
        let p = getTransformScale(mtrans);
        return {x:x*p, y:y*p};
    }
    let point = mtrans.transformPoint(new DOMPoint(x, y))
    return { x:point.x, y:point.y }
}

// Converts a point from Transform space to Mouse space. Keeps origin of canvas in mind, unless scale-only is applied
function transformToMouse(x, y, scaleOnly){
    let mtrans = ctx.getTransform()
    if (scaleOnly){
        let p = getTransformScale(mtrans);
        return {x:x*p, y:y*p};
    }
    let point = mtrans.transformPoint(new DOMPoint(x, y))
    return { x:point.x, y:point.y }
}

// blanks the whole canvas to prepare for next draw()-Call
function clearCanvas(){
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // old code, bad code
    // let { x, y } = mouseToTransform(canvas.width, canvas.height);
    // ctx.clearRect(0, 0, x, y)
}

// sets the background Color of the Canvas
function fillCanvas(color){
    let temp = ctx.fillStyle;
    ctx.fillStyle = color;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.fillStyle = temp;
}

// Resizes Canvas if window is resized
function resizeCanvas(){
    ctx.save();
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.restore();
    draw();
};

// if the cursor is over token, return true
function mouseOverToken(token){
    let { x, y } = mouseToTransform(mousex, mousey);
    let data = getPixel(token.image, x-token.x, y-token.y, token.scale * token.gridScale);
    return (data[3] != 0)
}

// return one pixel from image
function getPixel(img, x, y, scale) {
    let canv = document.createElement('canvas');
    canv.width = img.width;
    canv.height = img.height;
    canv.getContext('2d').drawImage(img, 0, 0, img.width*scale, img.height*scale);
    let pixelData = canv.getContext('2d').getImageData(x, y, 1, 1).data;
    return pixelData;
}

// rounds away from Zero
function roundFromZero(r) {
    if (r < 0)
        return Math.round(r)-1;
    else
        return Math.round(r)+1;
}

function magnitude(x, y){
    return Math.sqrt((x*x) + (y*y))
}

 // Adjust grid offset from center after scaling or moving grid
function refreshGridOffset(deltax, deltay){
    config.gridOffsetX = (config.gridOffsetX + deltax) % config.gridSize;
    config.gridOffsetY = (config.gridOffsetY + deltay) % config.gridSize;
}

// Creates an image element with correct src
function assignImage(src){
    image = new Image();
    try{     
        image.src = src;
    }catch(error){
        displayResourceError();
        return false;
    }
    return image;
}

// If a file cannot be loaded
function displayResourceError(){
    dialog.showMessageBoxSync({message:lang.resourceError, type:"error", buttons:[lang.okay], title:lang.resourceErrorTitle})
}

function displayJSONError(){
    dialog.showMessageBoxSync({message:lang.JSONError, type:"error", buttons:[lang.okay], title:lang.JSONErrorTitle})
}

function displayExternal(){
    return (dialog.showMessageBoxSync({message: lang.external, type: "question", buttons:[lang.token, lang.background], title:lang.externalTitle}) == 0)
}