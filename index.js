const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 8080;
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient(REDIS_PORT);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/metar/ping', (req, res) => {
  res.send({ data: 'pong' });
});

app.get('/metar/info', cache, (req, res) => {
  let scode = req.query.scode;
  let requestURL = 'https://tgftp.nws.noaa.gov/data/observations/metar/stations/' + scode + '.TXT';

  try{
    request(requestURL, function (error, response, body) {
        if(error || response.statusCode != '200'){
          console.log(error);
          res.send({ error: "invalid code" });
        }else{
          let splitDateFromData = body.split('\n');
          let formatDate = splitDateFromData[0].split(" ");
          let observationDateTime = formatDate[0] + ' at ' + formatDate[1];

          let otherInformation = splitDateFromData[1].split(" ");

          let finalTempFormat;
          if(!splitDateFromData[1].includes("/")){
            finalTempFormat = "";
          }else{
            let splitByTemp = splitDateFromData[1].split("/");
            finalTempFormat = getFinalTemperature(splitByTemp[0].split(" "));
          }

          let finalWindFormat;
          if(!splitDateFromData[1].includes("KT")){
            finalWindFormat = "";
          }else{
            let splitByWind = splitDateFromData[1].split("KT");
            finalWindFormat = getFinalWind(splitByWind[0].split(" "));
          }

          stationData = {
            'station': otherInformation[0],
            'last_observation': observationDateTime,
            'temperature': finalTempFormat,
            'wind': finalWindFormat
          }
          //set data in redis cache
          client.setex(scode, 300, JSON.stringify(stationData));
          res.send({ data: stationData});
        }
     });
  }catch(err){
    console.log(err.message);
  }
});

// Cache middleware
function cache(req, res, next) {
  let scode = req.query.scode;
  let noCache = req.query.nocache;

  if(noCache == "1"){
    //make api call to fetch data
    next();
  }else{
    client.get(scode, (err, data) => {
      if (err) throw err;
      //send redis cache data if present in cache
      if (data !== null) {
        res.send({ data: JSON.parse(data)});
      } else {
        //make api call to fetch data
        next();
      }
    });
  }
}

//get direction from degree
function degreeToDirection(degree) {
  let value = Math.floor((degree / 22.5) + 0.5);
  let directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return directions[(value % 16)];
}

//get temperature information in required format
function getFinalTemperature(temperature){
  let temp = temperature[temperature.length - 1];
  let formatTempCelcius;
  let fahrenheitTemp;
  let finalTempFormat;

  if(temp.includes("M")){
    let splitTempNegative = temp.split("M");
    formatTempCelcius = '-' + splitTempNegative[1] + ' C';
    fahrenheitTemp = Math.ceil((-(splitTempNegative[1]) * 9/5) + 32);
  }else{
    formatTempCelcius = temp + ' C';
    fahrenheitTemp = Math.ceil((temp * 9/5) + 32);
  }

  finalTempFormat = formatTempCelcius + " ("  + fahrenheitTemp + " F)";
  return finalTempFormat;
}

//get wind information in required format
function getFinalWind(wind){
  wind = wind[wind.length - 1];
  let finalWindFormat;
  let degree = wind.substring(0,3);
  let knotsValue = wind.includes("G") ? wind.split("G")[1] : wind.split(degree);

  let windVelocity = knotsValue[1].split("KT")[0];
  let windDirection = degreeToDirection(degree);

  let windSpeedMPH = Math.ceil(1.151 * windVelocity);
  finalWindFormat = windDirection + " at "  + windSpeedMPH + " mph" + " (" + windVelocity + " knots" + ")";
  return finalWindFormat;
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
