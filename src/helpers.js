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