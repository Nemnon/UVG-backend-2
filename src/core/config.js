import fs from "fs";
import path from "path";

function loadJSON(fileName){
  try{
    let rawData = fs.readFileSync(path.resolve(__dirname, 'config', fileName));
    return JSON.parse(rawData.toString());
  }
  catch (e) {
    throw new Error('Failed load file: ' + fileName)
  }
}

export const config = loadJSON('config.json')
