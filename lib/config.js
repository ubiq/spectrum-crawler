/**
* The Settings Module reads the settings out of config.json and provides
* this information to the other modules
*/

var fs = require("fs");
var jsonminify = require("jsonminify");

exports.gubiq = '127.0.0.1:8588';

//Mongodb connection
exports.mongodb = {
  user: "spectrum",
  password: "3xp!0reR",
  database: 'spectrumdb',
  address: 'localhost',
  port: 27017
};

//Mongodb test connection
exports.mongodbtest = {
  user: "spectrum",
  password: "3xp!0reR",
  database: 'spectrum-test',
  address: 'localhost',
  port: 27017
};

exports.reloadSettings = function reloadSettings() {
  // Discover where the settings file lives
  var settingsFilename = "./config.json";

  var settingsStr;
  try{
    //read the settings sync
    settingsStr = fs.readFileSync(settingsFilename).toString();
  } catch(e){
    console.warn('No settings file found. Continuing using defaults!');
  }

  // try to parse the settings
  var settings;
  try {
    if(settingsStr) {
      settingsStr = jsonminify(settingsStr).replace(",]","]").replace(",}","}");
      settings = JSON.parse(settingsStr);
    }
  }catch(e){
    console.error('There was an error processing your config.json file: '+e.message);
    process.exit(1);
  }

  //loop trough the settings
  for(var i in settings)
  {
    //test if the setting start with a low character
    if(i.charAt(0).search("[a-z]") !== 0)
    {
      console.warn("Settings should start with a low character: '" + i + "'");
    }

    //we know this setting, so we overwrite it
    if(exports[i] !== undefined)
    {
      exports[i] = settings[i];
    }
    //this setting is unkown, output a warning and throw it away
    else
    {
      console.warn("Unknown Setting: '" + i + "'. This setting doesn't exist or it was removed");
    }
  }

};

// initially load settings
exports.reloadSettings();
