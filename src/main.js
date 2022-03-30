const { dialog } = require('@electron/remote')
const fs = require('fs')

new CharToken();


var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d")
var [mousex, mousey] = [0, 0]
var transform = ctx.getTransform()
var images = []

function resizeCanvas(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
};

function draw(event){
    let matrix = ctx.getTransform()
    matrix.invertSelf()
    let point = matrix.transformPoint(new DOMPoint(canvas.width, canvas.height))
    ctx.clearRect(0, 0, point.x, point.y);
    point = matrix.transformPoint(new DOMPoint(event.clientX, event.clientY))
    ctx.fillRect(point.x -2, point.y - 2, 4, 4)
    for (image of images){
        ctx.drawImage(image, 0, 0)
    }


};

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', draw);
window.addEventListener('keydown', (event) => {
    var name = event.key;
    var code = event.code;
    if (name == "s"){
        let files = dialog.showOpenDialogSync({title: "Hi", defaultPath: ".", properties: ["openFile"], filters: [
            { name: 'Bilder', extensions: ['jpg', 'png', 'gif', 'jpeg'] }]})
        let image = new Image();
        console.dir(fs.readFileSync(files[0]))
        image.src = "data:image/png;base64," + fs.readFileSync(files[0]).toString('base64');
        images.push(image)
    }
    if (name == "+"){
        ctx.scale(1.11111111, 1.11111111)
    }
    if (name == "-"){
        ctx.scale(0.9, 0.9)
    }
  }, false);