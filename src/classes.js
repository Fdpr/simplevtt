class CharToken {
    base;
    image;
    name = "Test";
    x = 0; 
    y = 0;
    rot = 0;
    scale = 1;
    gridScale;
    longerSide;
    isSelected = false;

    constructor(image, name, grid, scale){
        this.name = name;
        if(scale)
            this.scale = scale;
        this.refreshImage(image);
        if (scale == -1)
            this.scale = this.longerSide / config.gridSize;
        this.updateGrid(grid);
    }

    // Sets the image of the token and refreshes accordingly
    refreshImage(image){
        console.log("Yo")
        this.base = image;
        this.image = image;
        this.longerSide = this.base.width;
        if (this.base.width < this.base.height)
            this.longerSide = this.base.height;
    }

    // Adjusts base scale of the image to adhere to the grid
    updateGrid(grid){
        let oldGrid = this.gridScale;
        this.gridScale = grid / this.longerSide;
        if(oldGrid){
            this.updateImage();
            this.x += ((this.image.width * oldGrid) -  (this.image.width * this.gridScale)) * 0.5;
            this.y += ((this.image.height * oldGrid) -  (this.image.height * this.gridScale)) * 0.5;
        } else
            this.updateImage();
        
    }

    // Refreshes the internal Canvas representation of the image after image has been rotated
    updateImage(){
        this.image = document.createElement("canvas");
        this.image.width = Math.sqrt(2*this.longerSide*this.longerSide);
        this.image.height = this.image.width;
        let ictx = this.image.getContext("2d");
        ictx.translate(this.image.width/2, this.image.height/2);
        ictx.rotate(this.rot);
        ictx.translate(-(this.image.width/2), -(this.image.height/2));
        ictx.translate((this.image.width - this.base.width)/2, (this.image.height - this.base.height)/2);
        ictx.drawImage(this.base, 0, 0);
    }

    // Center token around coordinate
    center(x, y){
        this.x = x - (this.image.width*this.scale*this.gridScale) / 2;
        this.y = y - (this.image.height*this.scale*this.gridScale) / 2;
    }

    // scales token and ensures that it is centered after scaling
    setScale(step){
        let x = this.x + (this.image.width*this.scale*this.gridScale) * 0.5;
        let y = this.y + (this.image.height*this.scale*this.gridScale) * 0.5;
        this.scale = step;
        this.center(x, y);
    }
}

// All the modes that the program can be in, possibly blocking
const MODES = {none: 0, // No continuous action is happening, nothing is being blocked
               drag: 1, // A token is being dragged, every action should be blocked
               pan: 2, // The screen is being panned, every action should be blocked
               measure: 3, // User is using the measuring tools, every action should be blocked
               circle: 4,
               cone: 5,
               cube: 6,
               gridDrag: 7, // User is dragging the grid, every action should be blocked
               backgroundDrag: 8 // User is dragging a background image, every action should be blocked
            };
