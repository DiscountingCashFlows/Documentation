//
// The following are the functions that you can use when editing or creating a model
// 

// Renders the chart to the screen
// The chart needs to be fully populated before calling this function
function renderChart(name){
    if(_chart_data['x_historic'].length){ // means that the chart x axis has been filled
        _chart_data['name'] = name;
        $('.heading-charts').show();
        appendChart($('.modal-charts'));
    }
}

// Renders the context to the screen
// The context is an object containing table data and values of interest
function monitor(context){
    if(typeof(context) !== 'undefined'){
        var modalValuesSection = $('.modal-values');
        var modalTablesSection = $('.modal-tables');
        var modalChartsSection = $('.modal-charts');
        var tablesCount = 0;
        let nf = new Intl.NumberFormat('en-US');
        for(var i = 0; i < context.length; i++){
            var item = context[i];
            if(item.display == 'value'){
                var textColor = '';
                if (item.name.toUpperCase() == 'ERROR'){
                    textColor = 'text-danger';
                }
                $('.heading-values').show();
                // valueData is the formatted number of item.data example: 1,234,456.32 instead of 1234456.32
                var valueData = item.data;
                if ($.isNumeric(item.data)){
                    valueData = nf.format(valueData);
                }
                modalValuesSection.append('<li class="list-group-item py-1 px-0 m-0 ' + textColor + ' ">' + item.name +
                                 '<span class="float-right">' + valueData + '</span></li>');
            }
            else if(item.display == 'table'){
                $('.heading-tables').show();
                tablesCount += 1;
                appendTable(item, modalTablesSection, tablesCount);
            }
            else if(item.display == 'chart'){
                // $('.heading-charts').show();
                // chartsCount deprecated. only one chart allowed
                //appendChart(item, modalChartsSection);
            }
            else{
                modalValuesSection.append('<li class="list-group-item text-danger">Error: No display type! <span class="float-right">' + String(item) + '</span></li>');
            }
        }
    }
    else{
        console.log("Error: Empty context passed!")
    }
}

// Called by fillHistoricUsingReport() only
function fillHistoricUsingReportItem(key, value, measure){
    // Millions
    if(measure == 'M'){
        _chart_data['y_historic'][key].push(toM(value[key]));
    }
    // Thousands
    else if(measure == 'K'){
        _chart_data['y_historic'][key].push(toK(value[key]));
    }
    else{
        _chart_data['y_historic'][key].push(value[key]);
    }
}

// Fill the chart's historic data using a given report, a key and measure (M for Millions, K for Thousands, anything else for default)
function fillHistoricUsingReport(report, key, measure){
    _chart_data['y_historic'][key] = [];
    _chart_data['y_forecasted'][key] = [];
    if(_chart_data['x_historic'].length){
        // slice is needed to make a copy of the array and not mutate it
        report.slice().reverse().forEach(function(value, i){
            fillHistoricUsingReportItem(key, value, measure);
        });
    }
    else{
        report.slice().reverse().forEach(function(value, i){
            fillHistoricUsingReportItem(key, value, measure);
            _chart_data['x_historic'].push(parseInt(value['date']));
        });
    }
    // fill the chart with historic data
    return _chart_data['y_historic'][key];
}

// Fill the chart's historic data using a given list, a key and the year when the list ends
function fillHistoricUsingList(list, key, endingYear){
    _chart_data['y_historic'][key] = [];
    _chart_data['y_forecasted'][key] = [];
    var listLength = list.length;
    if(_chart_data['x_historic'].length){
        list.forEach(function(value, i){
            _chart_data['y_historic'][key].push(value);
        });
    }
    else{
        list.forEach(function(value, i){
            _chart_data['y_historic'][key].push(value);
            _chart_data['x_historic'].push(endingYear - listLength + i);
        });
    }
    // fill the chart with historic data
    return _chart_data['y_historic'][key];
}

// Convert to Millions
function toM(value){
    return value / 1000000;
}

// Convert to Thousands
function toK(value){
    return value / 1000;
}

// Fill the chart with forecasted data, meaning that these points can be dragged and dropped
// forecast() uses the 'x_historic' member's last date for correct indexing
function forecast(list, key){
    _chart_data['y_forecasted'][key] = [];
    // 'x_historic' member has to be filled
    if(_chart_data['x_historic'].length){
        endingYear = _chart_data['x_historic'][_chart_data['x_historic'].length - 1];
        // if x_forecasted has not been yet filled
        if(!_chart_data['x_forecasted'].length){
            // fill x_forecasted
            for(var offsetYears = 1; offsetYears <= list.length; offsetYears++){
                _chart_data['x_forecasted'].push(endingYear + offsetYears);
            }
        }
        if (location.hash){
            // if there are chart params in hash, update the passed list
            var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
            var exclamationCount = window.location.hash.split('!').length - 1; // total chart params
            var updatedPoints = 0;
            // go through the passed list
            list.forEach(function(val, i){
                if(updatedPoints >= exclamationCount){
                    // break the for loop because there is nothing to update
                    return true;
                }
                for(var i = 0; i < hashParams.length; i++){
                    var p = hashParams[i].split('=');
                    // select only forecasted points
                    if(p[0].charAt(0) == '!'){
                        indexOfParameter =  p[0].indexOf('_');
                        if(key == p[0].substr(1, indexOfParameter - 1)){
                            var listIndex = _chart_data['x_forecasted'].indexOf(Number(p[0].substr(indexOfParameter + 1)));
                            list[listIndex] = Number(p[1]);
                            updatedPoints += 1;
                        }
                    }
                }
            });
        }
        _chart_data['y_forecasted'][key] = list;
        // update
    }
    return _chart_data['y_forecasted'][key];
}


// Binds the assumption to the forecasted data, so when you modify the data on the chart,
// it automatically updates in the assumption tab
function bindInputToForecastedChartPoint(inputKey, forecastedKey, index){
    _INPUT_GLOBAL[inputKey] = _chart_data['y_forecasted'][forecastedKey][index];
    $('.' + inputKey).val(_INPUT_GLOBAL[inputKey]);
    _bound_inputs.push(inputKey);
}

// Set the default value of an assumption, unless edited by the user
// Example: If you want the assumption "_RISK_FREE_RATE" to be the rate of the 
// 10 Year treasury bond. You can use this function 
// setInputDefault("_RISK_FREE_RATE", treasury['10y']); 
function setInputDefault(Key, Value){
    let roundedVal = Math.ceil(Value * 100) / 100;
    if (!_modified_inputs.includes(Key)){
        if(Key.charAt(0) == '_'){
            // Is rate, divide by 100
            _INPUT_GLOBAL[Key] = roundedVal / 100;
        }
        else{
            _INPUT_GLOBAL[Key] = roundedVal;
        }
        // Set the input value
        $('.' + Key).val(roundedVal);
    }
    return;
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

// Average Growth rate over the report's key list
// Example: Revenue average growth: 
// averageGrowthRate('revenue', income)
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

// Average Margin between 2 keys of one report
// Example: Net Income margin
// averageGrowthRate('netIncome','revenue', income)
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

// Replace the last value of your report with the Last Twelve months
function replaceWithLTM(report, ltm){
  for(var key in ltm){
    var value = ltm[key];
    if ( typeof value == 'number' ){
      report[0][key] = ltm[key]
    }
  }
  return report;
}

// Performs linear regression and returns a list of forecasted values
function linearRegressionGrowthRate(key, report, years, slope){
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
    for(var i = 0; i < count + years; i++){
      xValues.push(i+1);
      yValues.push((i+1) * slope + intercept);
    }
    return yValues;
  } catch(error){
    print(error, 'Error in linearRegressionGrowthRate');
  }
}

// Add a key from one report to another:
// addKey('freeCashFlow', flows, income);
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
