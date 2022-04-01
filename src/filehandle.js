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
        { name: 'Token-Bild', extensions: ['jpg', 'png', 'gif', 'jpeg'] }]})
    if (files != null && files.length > 0){
        return files[0]
    } else
        return null;
}

// Loads local Configuration and overrides settings if necessary
function loadLocalConfig(){

    let data = fs.readFileSync(path);
    if (data)
        return JSON.parse(data);
    else
        return null;
}

// Loads whole VTT including tokens and backgrounds
function loadVTT(){

}

// Saves wholes VTT including tokens and backgrounds
function saveVTT(){

}