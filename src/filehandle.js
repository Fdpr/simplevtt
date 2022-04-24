var defaultPath = "."

// load language locale
function loadLanguage(){
    let data;
    try{
        data = fs.readFileSync("./config/lang.json");
        return JSON.parse(data);
    }catch(error){
        dialog.showMessageBoxSync({message:"No language locale found! Please download a language file (lang.json) and put it into config/", type:"error", buttons:["Okay, I willl :("], title:"missing language file error"})
        return null;
    }
}

// Loads standard Global configurations
function loadConfig(){
    let data = fs.readFileSync("./config/config.json");
    if (data)
        return JSON.parse(data);
    else
        return null;
}

// request to load an image path from an external resource
function loadImageFile(){
    let files = dialog.showOpenDialogSync({title: lang.fileOpen, defaultPath: defaultPath, properties: ["openFile"], filters: [
        { name: lang.tokenName, extensions: ['jpg', 'png', 'gif', 'jpeg'] }]})
    if (files != null && files.length > 0){
        return files[0]
    } else
        return null;
}

// Loads local Configuration and overrides settings if necessary
function loadLocalConfig(){
    let path0 = dialog.showOpenDialogSync({title: lang.configOpen, defaultPath: defaultPath, properties: ["openFile"], filters: [
        { name: lang.configName, extensions: ['svttc', 'svtt'] }]})
    if (path0 && path0.length > 0){
        let path = path0[0];
        if (path[path.length -1 ] == "t")
            return loadVTT(path);
        let data = fs.readFileSync(path);
        if (data){
            try{
            let paths = path.split("\\")
            let lconfig = JSON.parse(data)
            paths.pop();
            lconfig.localDir = paths.join("\\");
            defaultPath = lconfig.localDir;
            return {lconfig};
            } catch (error){
                displayJSONError();
                return null;
            }
        }
        else
            return null;
    }
}

// Loads whole VTT including tokens and backgrounds
function loadVTT(path){
    let data = fs.readFileSync(path);
    let vtt = JSON.parse(data);
    console.dir(vtt)
    for (let i = 0; i < vtt.backgrounds.length; i++){
        console.log(vtt.backgrounds[i].name)
        let image = assignImage(vtt.backgroundSrcs[i]);
        image.onload = function(){
            let bgg = new CharToken(image, vtt.backgrounds[i].name, vtt.config.gridSize, vtt.backgrounds[i].scale)
            
            bgg.name = vtt.backgrounds[i].name;
            bgg.x = vtt.backgrounds[i].x; 
            bgg.y = vtt.backgrounds[i].y;
            bgg.rot = vtt.backgrounds[i].rot;
            bgg.scale = vtt.backgrounds[i].scale;
            bgg.gridScale = vtt.backgrounds[i].gridScale;
            bgg.longerSide = vtt.backgrounds[i].longerSide;
            bgg.isSelected = vtt.backgrounds[i].isSelected;

            vtt.backgrounds[i] = bgg;
            vtt.updateImage();
        }
        
    }
    for (let i = 0; i < vtt.tokens.length; i++){
        console.log(vtt.tokens[i].name)
        let image = assignImage(vtt.tokenSrcs[i]);
        image.onload = function(){
            let tkk = new CharToken(image, vtt.tokens[i].name, vtt.config.gridSize, vtt.tokens[i].scale)
            
            tkk.name = vtt.tokens[i].name;
            tkk.x = vtt.tokens[i].x; 
            tkk.y = vtt.tokens[i].y;
            tkk.rot = vtt.tokens[i].rot;
            tkk.scale = vtt.tokens[i].scale;
            tkk.gridScale = vtt.tokens[i].gridScale;
            tkk.longerSide = vtt.tokens[i].longerSide;
            tkk.isSelected = vtt.tokens[i].isSelected;

            vtt.tokens[i] = tkk;
            tkk.updateImage();
        }
    }
    return {vtt};
}

// Saves wholes VTT including tokens and backgrounds
function saveVTT(){
    let backgroundSrcs = []
    for (token of backgrounds){
        backgroundSrcs.push(token.base.src);
    }
    let tokenSrcs = []
    for (let token of tokens){
        tokenSrcs.push(token.base.src);
    } 
    let vtt = {backgrounds, tokens, config, backgroundSrcs, tokenSrcs};
    let savey = JSON.stringify(vtt);
    let path = dialog.showSaveDialogSync({title: lang.vttSave, defaultPath: defaultPath, properties:["dontAddToRecent"], filters:[{ name: lang.configName, extensions: ['svtt'] }]});
    fs.writeFileSync(path, savey);
}