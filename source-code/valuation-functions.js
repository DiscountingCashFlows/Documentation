function getSign(value){
    if(typeof(value) == 'number'){
        if (value > 0){return 1;}
        else if (value < 0){return -1;}
    }
    return 0;
}

function roundValue(value, type){
    var sign = getSign(value);
    value = Math.abs(value);
    // if the rate < 1, then round to 4 decimals
    // else if rate < 10 round to 3 decimals
    // else if rate < 100 round to 2 decimals
    if(type == '%'){
        value *= 1000;
    }
    // if value < 10, then round to 4 decimals
    // else if value < 100, then round to 3 decimals
    // for value > 100, round it to 2 decimals
    var roundDigits = 100; // 2 decimals
    if(value < 10){
        roundDigits = 10000; // 4 decimals
    }
    else if(value < 100){
        roundDigits = 1000; // 3 decimals
    }
    if(type=='%'){
        // rates should be rounded differently
        return Math.round(sign * value/10*roundDigits)/roundDigits;
    }
    else{//  if(type=='#'){
        return Math.round(sign * value*roundDigits)/roundDigits;
    }
}

function toM(obj){
    // if obj is a list
    if(typeof(obj) == 'object'){
        for(var i=0; i<obj.length; i++){
            obj[i] /= 1000000;
        }
        return obj;
    }
    // obj is a number
    return obj / 1000000;
}

function toK(obj){
    // if obj is a list
    if(typeof(obj) == 'object'){
        for(var i=0; i<obj.length; i++){
            obj[i] /= 1000;
        }
        return obj;
    }
    // obj is a number
    return obj / 1000;
}

function toR(obj){
    return numberToRate(obj);
}

function numberToRate(obj){
    // if obj is a list
    if(typeof(obj) == 'object'){
        for(var i=0; i<obj.length; i++){
            obj[i] *= 100;
        }
        return obj;
    }
    // obj is a number
    return obj * 100;
}

function toN(obj){
    return rateToNumber(obj);
}

function rateToNumber(obj){
    // if obj is a list
    if(typeof(obj) == 'object'){
        for(var i=0; i<obj.length; i++){
            obj[i] /= 100;
        }
        return obj;
    }
    // obj is a number
    return obj / 100;
}

function getGrowthList(report, key, length, rate){
    var growth_list = [];
    var lastValue = 0;
    if(report.length > 1){
        report[0][key];
    }
    else{
        lastValue = report[key];
    }
    for(var i = 1; i <= length; i++){
        growth_list.push(lastValue * Math.pow((1+rate), i));
    }
    return growth_list;
}

function applyMarginToList(list, margin){
    list.forEach(function(val, i){
        list[i] = val * margin;
    });
    return list;
}

function averageGrowthRate(key, report){
  var rep = report.slice();
  rep.reverse();
  var val0 = rep[0][key];
  var val1;
  var rate = 0;
  try{
    for(var i = 1; i < rep.length; i++){
      val1 = rep[i][key];
      if(val0){
      	rate += (val1 - val0)/val0;
      }
      val0 = val1;
    }
    rate /= rep.length - 1;
    return rate;
  } catch(error){
    print(error, 'Error in average_growth_rate');
  }
}

function averageMargin(key1, key2, report){
  var margin = 0;
  try{
    for(var i = 0; i < report.length; i++){
      margin += report[i][key1]/report[i][key2];
    }
    margin /= report.length;
    return margin;
  } catch(error){
    print(error, 'Error in average_margin');
  }
}

function replaceWithLTM(report, ltm){
  for(var key in ltm){
    var value = ltm[key];
    if ( typeof value == 'number' ){
      report[0][key] = ltm[key]
    }
  }
  return report;
}

function linearRegressionGrowthRate(report, key, projection_years, slope){
  var rep = report.slice();
  rep.reverse();
  var count = rep.length;
  var xSum=0, ySum=0, xxSum=0, xySum=0;

  var rate = 0;
  try{
    for(var i = 0; i < count; i++){
      xSum += i+1;
      ySum += rep[i][key];
      xxSum += (i+1) * (i+1);
      xySum += rep[i][key] * (i+1);
    }
    // Calculate slope and intercept
    var slope = slope * (count * xySum - xSum * ySum) / (count * xxSum - xSum * xSum);
    var intercept = (ySum / count) - (slope * xSum) / count;
    // Generate values
    var xValues = [];
    var yValues = [];
    for(var i = 0; i < count + projection_years; i++){
      xValues.push(i+1);
      yValues.push((i+1) * slope + intercept);
    }
    return yValues;
  } catch(error){
    print(error, 'Error in linearRegressionGrowthRate');
  }
}

function addKey(key, report_from, report_to){
  for(var i = 0; i < report_from.length; i++){
    for(var j = 0; j < report_to.length; j++){
      if(report_from[i]['date'] == report_to[j]['date']){
        if(!(key in report_to[j])){
          report_to[j][key] = report_from[i][key];
        }
        // if i hasn't reached the end of report_from, increment
        if(i < report_from.length - 1){
          i++;
        }
        // if i has reached report_from length, we want to cut the report_to to the same year of report_from
        else{
          report_to = report_to.slice(0, j + 1);
          return report_to;
        }
      }
    }
  }
  return report_to;
}

function fxRate(fx, fromCurrency, toCurrency){
    return currencyRate(fx, fromCurrency, toCurrency);
}

function currencyRate(fx, fromCurrency, toCurrency){
    fromCurrency = fromCurrency.trim()
    toCurrency = toCurrency.trim()
    if(fromCurrency == toCurrency){return 1;}
    if(fromCurrency === 'GBp' && toCurrency === 'GBP') {return 0.01;}
    if(fromCurrency === 'GBP' && toCurrency === 'GBp') {return 100;}
    var symbol = (fromCurrency+toCurrency).toUpperCase();
    for(var i=0; i<fx.length; i++){
        if(fx[i].symbol == symbol){
            if(fromCurrency === 'GBp'){
                return Number(fx[i].price) / 100;
            }
            if(toCurrency === 'GBp'){
                return Number(fx[i].price) * 100;
            }
            return Number(fx[i].price);
        }
    }
    return 1;
}

// adjusts each key that is not in do_not_adjust_key using fxRate
function adjustQuoteToFXRate(quote, fxRate){
    if ("fxRate" in quote && quote.fxRate == fxRate){
        // do not adjust the quote if it already has been adjusted
        return quote;
    }
     var do_not_adjust_key = [
        'sharesOutstanding',
        'timestamp',
        'volume',
        'pe',
        'changesPercentage',
        'avgVolume'
    ]
    for (key in quote){
        if ($.isNumeric(quote[key]) &&
            typeof quote[key] != 'string' &&
            !do_not_adjust_key.includes(key)){
            quote[key] *= fxRate;
        }
    }
    quote.fxRate = fxRate;
    return quote;
}

function reportKeyToList(report, key, measure){
  var returnList = [];
  for(var i=0; i<report.length; i++){
    if(measure == 'M'){
    	returnList.push(toM(report[i][key]));
    }
    else if(measure == 'K'){
        returnList.push(toK(report[i][key]));
    }
    else{
        returnList.push(report[i][key]);
    }
  }
  return returnList;
}

function newArrayFill(length, fillObject){
  var newArray = new Array(length);
  for(var i=0; i<newArray.length; i++){
    newArray[i] = fillObject;
  }
  return newArray;
}

function arrayValuesToRates(array){
  var newArray = [];
  for(var i=0;i<array.length;i++){
    newArray.push(roundValue(array[i], '%')+'%');
  }
  return newArray;
}

function getArraySum(array){
  var sum = 0;
  for(var i=0;i<array.length;i++){
    sum += array[i];
  }
  return sum;
}

// Gets the growth rates from a list of values
// The mode formats the output to either 'percentage' 12.34% or normal 0.1234
function getGrowthRateList(values, mode){
  var growthRateList = [];
  if(values.length > 1){
    if(mode == 'percentage'){growthRateList.push('');}
    else{growthRateList.push(0);}

    var val1 = values[0];
    for(var i=1; i<values.length; i++){
      var val2 = values[i];
      if(mode == 'percentage'){
        growthRateList.push( (100*(val2-val1)/val1).toFixed(2) + '%' );
      }
      else{
        growthRateList.push((val2-val1)/val1);
      }
      val1=val2;
    }
  }
  return growthRateList;
}

function getYear(obj){
  var return_obj = [];
  if(typeof(obj) == 'object' && obj.length >= 1){
    for(i in obj){
      return_obj.push(parseInt(obj[i]));
    }
  }
  else if(obj){
    return_obj = parseInt(obj);
  }
  return return_obj;
}

function deepCopy(object){
    // response format
    if(object.length == 3 && object[1] == 'success' && object[0]){
        if(object[0].length == 1){
            return JSON.parse(JSON.stringify(object[0][0]));
        }
        return JSON.parse(JSON.stringify(object[0]));
    }
    var x = JSON.parse(JSON.stringify(object));
    while(x.length == 1){
        x = x[0];
    }
    return x;
}
