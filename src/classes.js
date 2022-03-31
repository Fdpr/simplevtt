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

    constructor(image, name, grid){
        this.base = image;
        this.image = image;
        this.name = name;
        this.longerSide = this.base.width;
        if (this.base.width < this.base.height)
            this.longerSide = this.base.height;
        this.updateGrid(grid);
    }

    // Adjusts base scale of the image to adhere to the grid
    updateGrid(grid){
        this.gridScale = grid / this.longerSide;
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
}

// All the modes that the program can be in, possibly blocking
const MODES = {none: 0, // No continuous action is happening, nothing is being blocked
               drag: 1, // A token is being dragged, every action should be blocked
               pan: 2, // The screen is being panned, every action should be blocked
               measure: 3 // User is using the measuring tool, every action should be blocked
            };