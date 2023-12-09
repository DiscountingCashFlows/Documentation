var _INPUT_GLOBAL;

var _modified_inputs = [];
var _bound_inputs = [];

var _chart_data = {};
_chart_data['x_historic'] = [];
_chart_data['x_forecasted'] = [];
_chart_data['y_historic'] = {};
_chart_data['y_forecasted'] = {};
_chart_data['y_forecasted_chart_hidden'] = {};
_chart_data['name'] = 'My Chart';
_chart_data['subtitle'] = '';
_chart_data['hidden_series'] = [];
_chart_data['hide_growth'] = [];
_chart_data['added_properties'] = false;
_chart_data['number_format'] = '';

var global_str = '';  // used by the code editor
var code_log = undefined;

function resetChartData(){
    _chart_data['x_historic'] = [];
    _chart_data['x_forecasted'] = [];
}
function hideAllHeadings(){
    $('.section-estimated-value').css('display', 'none');
    $('.heading-description').css('display', 'none');
    $('.heading-inputs').css('display', 'none');
    $('.heading-values').css('display', 'none');
    $('.heading-tables').css('display', 'none');
    $('.heading-charts').css('display', 'none');
}

function appendTable(item, modalTablesSection, tablesCount){
    var nf = new Intl.NumberFormat('en-US');
    modalTablesSection.append('<h5 class="mt-3 mb-0">' + item.name + '</h5>');
    if(item.subtitle){
        modalTablesSection.append('<p class="text-body mb-2">' + item.subtitle + '</p>');
    }
    var display_averages = '';
    if(item.display_averages){
        display_averages = ' table-averaged ';
    }
    var tableString = '<div class="table-responsive border-top"><table class="table table-sticky border table-hover-custom text-dark' + display_averages + '" header="'+ item.name +'"><thead class="bg-white"><tr>';
    if(item.columns){
        tableString += '<th></th>';
        for(var i = 0; i < item.columns.length; i++){
            tableString += '<th class="py-1 px-3 text-center">' + item.columns[i] + '</th>';
        }
        tableString += '</tr></thead><tbody>';
        for(var i = 0; i < item.data.length; i++){
            var dataItem = item.data[i];
            tableString += '<tr>';
            tableString += '<td class="row-description"><b><span class="row-description-text" data-nondev="'
                        + item.rows[i] + '">' + item.rows[i] + '</span></b></td>';
            for(var j = 0; j < dataItem.length; j++){
                var valueData = dataItem[j];
                if ($.isNumeric(dataItem[j])){
                    valueData = nf.format(valueData);
                }
                var isRateClass = '';
                if( String(valueData).includes('%') ){
                    isRateClass = ' cell-is-rate ';
                }
                tableString += '<td class="py-1 ' + isRateClass + '">' + valueData + '</td>';
            }
            tableString += '</tr>';
        }
    }
    else{
        // create custom labels
        tableString += '</tr></thead><tbody><tr></tr>';
    }
    tableString += '</tbody></table></div>';
    modalTablesSection.append(tableString);
}

function getKeyName(key){
    if(isRate(key)){
        return key[1].toUpperCase() + key.slice(2).replace(/([A-Z])/g, ' $1').trim();
    }
    else{
        return key[0].toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
    }
}

function resetChartInput(key, category){
    if (location.hash){
        //var topPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
        var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
        var buildHash = '';
        for(var i = 0; i < hashParams.length; i++){
            var p = hashParams[i].split('=');
            if(p[0].charAt(0) == '!'){
                var indexOfParameter = 0;
                if(isRate(p[0].slice(1))){
                    indexOfParameter =  p[0].slice(2).indexOf('_') + 2;
                }
                else{
                    indexOfParameter =  p[0].indexOf('_');
                }
                var compare_key = p[0].substr(1, indexOfParameter - 1);
                var compare_category = p[0].substr(indexOfParameter + 1);
                if(String(key) == compare_key &&
                   String(category) == compare_category){
                    continue;
                }
            }
            if(buildHash){
                buildHash += '&' + p[0] + '=' + p[1];
            }
            else{
                buildHash = p[0] + '=' + p[1];
            }
        }
        location.hash = buildHash;
        //document.documentElement.scrollTop = topPos;
    }
}

// convert a category like 2024 to an index like 1
function forecastedCategoryToIndex(key, category){
    for(var i=0; i<_chart_data['x_forecasted'].length; i++){
        if(String(_chart_data['x_forecasted'][i]) == String(category)){
            return i;
        }
    }
    return -1;
}

// for splitting a chart input into key and category
// example 1: !_returnOnEquity_2023; key='_returnOnEquity' and category=2023
// example 2: !equity_2024; key='equity' and category=2024
function indexOfCategory(key){
    if(key.length){
        var keyIsRate = isRate(key.slice(1));
        if(keyIsRate){
            return key.slice(2).indexOf('_') + 2;
        }
        return key.indexOf('_');
    }
    return 0;
}

function addNumberFormatToHash(){
    var number_format = _chart_data['number_format'];
    if(number_format){
        if (location.hash && !location.hash.includes('!number_format')){
            location.hash += `&!number_format=${number_format}`;
        }
        else if(!location.hash){
            location.hash = `!number_format=${number_format}`;
        }
    }
    return number_format;
}

// type == chart -> all edited points on the chart
//      !revenue_2023=12345
function getHashParameters(type){
    var hash_params = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
    var return_params = [];
    if(type == 'chart'){
        for(var i in hash_params){
            var param = hash_params[i];
            if(param.charAt(0) == '!'){
                return_params.push(param);
            }
        }
    }
    // remove the number_format
    return return_params;
}

function updateHashWithSingleValue(key, category, value){
    if (location.hash){
        // if there is at least 1 param
        var inputFound = false;
        var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
        var buildHash = '';
        for(var i = 0; i < hashParams.length; i++){
            var p = hashParams[i].split('=');
            if(p[0].charAt(0) == '!'){
                indexOfParameter =  indexOfCategory(p[0]);
                if( String(key) == p[0].substr(1, indexOfParameter - 1) &&
                    String(category) == p[0].substr(indexOfParameter + 1) ){
                    // [Number(p[0].substr(indexOfParameter + 1))] = Number(p[1]);
                    p[1] = value;
                    if(isValidNumber(p[1])){
                        p[1] = roundValue(Number(p[1]));
                    }
                    inputFound = true;
                }
            }
            if(buildHash){
                buildHash += `&${p[0]}=${p[1]}`;
            }
            else{
                buildHash = `${p[0]}=${p[1]}`;
            }
        }
        if(inputFound){
            location.hash = buildHash;
        }
        else{
            // unadjusted $(this).val() value (can be adjusted for rate /100)
            location.hash += `&!${key}_${category}=${value}`;
        }
    }
    else{
        // if there are 0 params in the hash (no # present in url)
        location.hash = `!${key}_${category}=${value}`;
    }
}

// key = revenue
// category = 2024
// value = 102312.4
function chartPointDrop(key, category, data){
    addNumberFormatToHash();
    // when modifying the forecasted values, update hash
    if($.isArray(data)){
        // data is multiples values have been passed
        for(var i=0; i<data.length; i++){
            // Update hash for every value in data
            updateHashWithSingleValue(key, parseInt(category) + i, data[i]);
        }
    }
    else{
        // data is single value
        updateHashWithSingleValue(key, category, data);
    }
    $( "#modal-charts" ).trigger( "chartPointDrop" );
}

function getPreviousValue(key, index){
    var prevValue = 0;
    if(index == 0){
        prevValue = _chart_data['y_historic'][key][_chart_data['y_historic'][key].length - 1];
    }
    else{
        prevValue = _chart_data['y_forecasted'][key][index - 1];
    }
    return prevValue;
}
function getValueFromForecastedInput(obj){
    var value = obj.val().replace('%', '');
    return value;
}
function isBeingReset(value){
    if(value === ''){
        return true;
    }
    return false;
}
function getKeyGrowthRatesArray(key, index){
    var rates = [];
    var firstValue = roundValue(_chart_data['y_forecasted'][key][index]);
    var secondValue = 0;
    for(var i=index+1; i<_chart_data['y_forecasted'][key].length; i++){
        secondValue = roundValue(_chart_data['y_forecasted'][key][i]);
        rates.push(roundValue((secondValue - firstValue) / firstValue));
        firstValue = secondValue;
    }
    return rates;
}
function keyupChangeForecastTable(obj, type){
    var key = obj.attr('key');
    var category = obj.attr('category');
    var index = Number(obj.attr('index'));
    var value = roundValue(Number(getValueFromForecastedInput(obj)));
    var dropValue = 0;
    var compare_value = 0;
    if(type == 'value'){
        if(isRate(key)){
            compare_value = roundValue(toP(_chart_data['y_forecasted'][key][index]), '%');
        }
        else{
            compare_value = roundValue(_chart_data['y_forecasted'][key][index]);
        }
        dropValue = value;
        if(isValidNumber(value)){
            // if new value is different from the old one compare_value
            if( value == compare_value ){
                return;
            }
        }
        chartPointDrop(key, category, dropValue);
    }
    else if(type == 'growth'){
        // We need to adjust all forward values to keep the same rates
        // Store the rates
        rates = getKeyGrowthRatesArray(key, index);
        // Triggered when a forecast Growth Rate is changed
        var previousValue = roundValue(getPreviousValue(key, index));
        var currentValue = roundValue(getPreviousValue(key, index + 1));
        compare_value = roundValue(toP((currentValue - previousValue)/previousValue), '%');
        dropValue = roundValue(previousValue * (1 + value/100));
        percentage_value = roundValue(toP((dropValue - previousValue)/previousValue), '%');
        // Compute values from rates
        var values = [dropValue];
        for(var i=0; i<rates.length; i++){
            values.push(values[i] * (1 + rates[i]));
        }
        if(percentage_value != compare_value){
            chartPointDrop(key, category, values);
        }
    }
}

// copy paste
var timerForecasted = 0;
function keyupChangeHandler(obj, type){
    if (timerForecasted) {
        clearTimeout(timerForecasted);
    }
    timerForecasted = setTimeout(function(){
        var value = getValueFromForecastedInput(obj);
        if(isBeingReset(value)){
            return;
        }
        keyupChangeForecastTable(obj, type);
        var obj_id = obj.attr('id');
        $('#' + obj_id).focus();
    }, 500);
}
function focusoutHandler(obj, type){
    if(timerForecasted) {
        clearTimeout(timerForecasted);
    }
    var value = getValueFromForecastedInput(obj);
    if(isBeingReset(value)){
        var key = obj.attr('key');
        var category = obj.attr('category');
        if(type == 'growth'){
            var index = forecastedCategoryToIndex(key, category);
            // if type is growth, then we need to keep the same forward growth rates
            var rates = getKeyGrowthRatesArray(key, index);
            resetChartInput(key, category);
            $("#modal-charts").trigger("chartPointDrop");
            // update the remaining values
            // get the value after reset
            var values = [getPreviousValue(key, index + 1)];
            for(var i=0; i<rates.length; i++){
                values.push(values[i] * (1 + rates[i]));
            }
            chartPointDrop(key, category, values);
        }
        else{
            resetChartInput(key, category);
            $("#modal-charts").trigger("chartPointDrop");
        }
    }
    else{
        keyupChangeForecastTable(obj, type);
    }
}

function addProperties(object){
    var properties = object.properties;
    // add properties only once, at page load
    if(!_chart_data['added_properties']){
        if('disabled_keys' in properties){
            // used in renderChart() -> disabled_keys: ['linearRegressionRevenue', 'discountedFreeCashFlow'],
            _chart_data['hidden_series'] = _chart_data['hidden_series'].concat(
                listOrderedDifference(properties.disabled_keys, _chart_data['hidden_series'])
            );
        }
        if('hide_growth' in properties){
            if(typeof(properties.hide_growth) == 'object'){
                // used to hide the growth of specific keys { hide_growth: ['_payoutRatio', '_returnOnEquity'], }
                _chart_data['hide_growth'] = properties.hide_growth;
            }
            else if(properties.hide_growth === true){
                // hide all growth for all keys
                if('keys' in object){
                    _chart_data['hide_growth'] = object.keys;
                }
            }
        }
        _chart_data['added_properties'] = true;
    }
}

// print function
function print(str, label='', type='', currency=''){
    var nf = new Intl.NumberFormat('en-US');
    var context = [];
    var string = '';

    if(typeof(str) === 'number')
    {
        if(type == '%')
        {
            string = roundValue(toP(str), '%');
            string += '%';
        }
        else if(type == '#')
        {
            if (str >= 1000000 || str <= -1000000){
                string = nf.format(roundValue(toM(str)));
                string += ' Mil.';
            }
            else if (str >= 1000 || str <= -1000){
                string = nf.format(roundValue(toK(str)));
                string += ' Thou.';
            }
            else{
                string = nf.format(str);
            }
        }
        else
        {
            string = String(str);
        }
    }
    else
    {
        string = String(str);
    }
    if (label){
        context.push({name:label, display:'value', data:string, currency: currency});
    }
    else{
        context.push({name:string, display:'value', data:'', currency:currency});
    }
    monitor(context);
    return;
}

function throwError(message){
    var err;
    if(typeof(message) == 'string'){
        err = new Error();
    }
    else if(typeof(message) == 'object'){
        err = message;
    }
    var caller_line = err.stack;
    var index = caller_line.indexOf("eval:") + 5;
    var end = caller_line.slice(index).indexOf(':');
    var clean = caller_line.slice(index, index + end);
    console.error(message+"\nValuation Code Line:"+clean);
    alertify.notify(message+"\nValuation Code Line:"+clean, 'error', 0);
}

function throwWarning(message){
    var err = new Error();
    var caller_line = err.stack;
    var index = caller_line.indexOf("eval:") + 5;
    var end = caller_line.slice(index).indexOf(':');
    var clean = caller_line.slice(index, index + end);
    console.warn(message+"\nValuation Code Line:"+clean);
    alertify.notify(message, 'warning', 0);
}

function console_warning(text){
    console.warn(text);
}
function warning(message){
    $('#warning-alert').show();
    $('#warning-alert-message').text(message);
}

function error(message){
    $('#error-alert').show();
    $('#error-alert-message').text(message);
}

// this function is called only on #btn-delete-all-assumptions clicked()
function deleteAllAssumptions(e){
    e.preventDefault();
    if (location.hash){
        var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
        var buildHash = '';
        for(var i = 0; i < hashParams.length; i++){
            var p = hashParams[i].split('=');
            if(p[0].charAt(0) != '!'){
                resetInput(p[0]);
                continue;
            }
            if(buildHash){
                buildHash += `&${p[0]}=${p[1]}`;
            }
            else{
                buildHash = `${p[0]}=${p[1]}`;
            }
        }
        location.hash = buildHash;
    }
    // reset the chart xhistoric + xforecasted
    resetChartData();
}

function valuationEnd(){
    // set a fixed height of the valuation, so that the window position doesn't change
    var $companyContainer = $('.company-container');
    if($companyContainer && !$companyContainer.hasClass('height-set')){
        $companyContainer.css('height', $companyContainer.height());
        $companyContainer.addClass('height-set');
    }
}

/*
    object = {
        'title': '...',
        'subtitle': '...',
        'number_format': 'M',
    }
*/
function renderChart(object){
    if(_chart_data['x_historic'].length){ // means that the chart x axis has been filled
        if(typeof(object) == 'string'){
            _chart_data['name'] = object;
        }
        else{
            if('title' in object){
                _chart_data['name'] = object.title;
            }
            if('subtitle' in object){
                _chart_data['subtitle'] = object.subtitle;
            }
            if('subtitle' in object){
                _chart_data['number_format'] = object.number_format;
            }
        }
        $('.heading-charts').show();
        appendChart($('.modal-charts'));
    }
}

function monitor(context){
    if(typeof(context) !== 'undefined'){
        var modalValuesSection = $('.modal-values');
        var modalTablesSection = $('.modal-tables');
        var modalChartsSection = $('.modal-charts');
        var tablesCount = 0;
        var nf = new Intl.NumberFormat('en-US');
        for(var i = 0; i < context.length; i++){
            var item = context[i];
            if(item.display == 'value'){
                var textColor = '';
                console.log(item.name);
                if(item.name.includes('{Success}')){
                    textColor = 'text-success';
                    item.name = item.name.replace('{Success}', '').trim();
                }
                else if(item.name.includes('{Danger}')){
                    textColor = 'text-danger';
                    item.name = item.name.replace('{Danger}', '').trim();
                }

                // if (item.name == 'ERROR'){}
                $('.heading-values').show();
                modalValuesSection.append('<li class="dynamic-size-row list-group-item py-1 px-0 ' + textColor + ' ">' + item.name +
                                 '<div class="float-end"><span class="me-1">' + item.data + '</span><span>' + item.currency + '</span></li>');

                if(item.name){
                    global_str += '> "' + item.name + '": ' + item.data + ' ' + item.currency + '\n';
                }
                else{
                    global_str += '> ' + item.data + ' ' + item.currency + '\n';
                }
                // Dummy class
                if(code_log != undefined){
                    code_log.setValue(global_str);
                }
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
                modalValuesSection.append('<li class="list-group-item text-danger">Error: No display type! <span class="float-end">' + String(item) + '</span></li>');
            }
        }
        // this function will set the width of the row-description elements
        // call this before the stickyTable calculates the width value
        setTableRowDescriptionWidth(true);
    }
    else{
        console.log("Error: Empty context passed!")
    }
}

function typeOfHeader(header){
    if(header.includes('{%}')){
        // object is rate
        return '%';
    }
    else{
        // object is number
        return '#';
    }
}

function renderTable(table_object){
    var context = [];
    /*
    for (var i = 0; i < arguments.length; i++) {
        console.log(arguments[i]);
    }
    */
    if (arguments.length > 1){
        // [DEPRECATED] renderTable(name, data, rows, columns)
        context.push({name: arguments[0], display: 'table', rows: arguments[2], columns: arguments[3], data: arguments[1]});
    }
    else{
        var object = deepCopy(table_object);
        if('properties' in object){
            if('column_order' in object['properties']){
                sortColumns(object['column_headers'], object['properties']['column_order']);
            }
        }
        // table_object can be in one of the two formats:
        /*
            YearValue Format (recommended)
            data = [
                [
                {
                    'value': 123,
                    'year': 2020
                },
                {
                    'value': 234,
                    'year': 2021
                }
                ],
                ...
            ]
            or List Format
            data = [123, 234]
        */
        // Let's bring all YearValue Format to List Format
        var data_obj = newArrayFill(object['data'].length, newArrayFill(object['column_headers'].length, ''));
        for(var col_index in object['column_headers']){
            var col_name = String(object['column_headers'][col_index]);
            for(var data_index in object['data']){
                if(isObjectInYearValueFormat(object['data'][data_index])){
                    for(var i in object['data'][data_index]){
                        // item is in DateValue format
                        var item = object['data'][data_index][i];
                        //console.log(col_name);
                        //console.log(item);
                        if(typeof(item) === 'number'){continue;}
                        if( String(item.year) == col_name ){
                            data_obj[data_index][col_index] = item.value;
                            //data_row[col_index] = item.value;
                        }
                    }
                }
            }
        }
        // add the rows that are in list format and have not been added because of isObjectInYearValueFormat check
        for(var data_index in object['data']){
            if(!isObjectInYearValueFormat(object['data'][data_index])){
                data_obj[data_index] = object['data'][data_index];
            }
        }
        object['data'] = data_obj;
        // Recommended use
        /*
        input object structure should be
        {
            'data': data,
            'row_headers': rows,
            'column_headers': columns,
            'properties': {
                'title': 'Historical Data',
                'currency': currency,
                'number_format': 'M',
                'display_averages': true,
                'column_order': 'descending'
            }
        }
        */
        var tableSubtitle = 'In ';
        var display_averages = false;
        var table_has_per_share_items = false;
        for(var i in object['row_headers']){
            // see if there are any per share rows
            if(object['row_headers'][i].includes('{PerShare}')){
                table_has_per_share_items = true;
                break;
            }
        }
        if('properties' in object){
            if('display_averages' in object['properties'] && object['properties']['display_averages']){
                // need to send display_averages to appendTable() function
                display_averages = true;
                object['column_headers'].unshift('Averages');
                // data: object['data']
                for(var i in object['row_headers']){
                    // console.log(object['data'][i]);
                    // console.log(getListAverage(object['data'][i]));
                    var average = getListAverage(object['data'][i]);
                    var type_of_header = typeOfHeader(object['row_headers'][i]);
                    if(type_of_header == '%'){
                        // special percentage formatting
                        average = roundValue(toP(average), type_of_header)/100;
                    }
                    else{
                        average = roundValue(average);
                    }
                    object['data'][i].unshift(average);
                }
            }
            if('number_format' in object['properties'] && object['properties']['number_format']){
                if(object['properties']['number_format'] == 'M'){
                    tableSubtitle += 'Millions of ';
                }
                else if(object['properties']['number_format'] == 'K'){
                    tableSubtitle += 'Thousands of ';
                }

                for(var i in object['row_headers']){
                    // format only numbers, and not the rates
                    if(!object['row_headers'][i].includes('{%}') &&
                    !object['row_headers'][i].includes('{Boolean}') &&
                    !object['row_headers'][i].includes('{PerShare}') &&
                    !object['row_headers'][i].includes('{Unit}')){
                        // Remove the '{%}': object['row_headers'][i] = object['row_headers'][i].replace('{%}', '').trim();
                        // Convert the whole row to rate
                        if(object['properties']['number_format'] == 'M'){
                            object['data'][i] = roundValue(toM(object['data'][i]));
                        }
                        else if(object['properties']['number_format'] == 'K'){
                            object['data'][i] = roundValue(toK(object['data'][i]));
                        }
                        else if(object['properties']['number_format'] == '1'){
                            // just perform a normal round
                            object['data'][i] = roundValue(object['data'][i]);
                        }
                    }
                }
            }
            else{
                // not specifying number_format property is equivalent to specifying number_format: 1
                // just perform a normal round
                for(var i in object['row_headers']){
                    // format only numbers, and not the rates
                    if(!object['row_headers'][i].includes('{%}')){
                        object['data'][i] = roundValue(object['data'][i]);
                    }
                }
            }
            if('currency' in object['properties'] && object['properties']['currency']){
                tableSubtitle += object['properties']['currency'];
            }
            else{
                tableSubtitle = '';
            }
            if(table_has_per_share_items){
                if('number_format' in object['properties'] && object['properties']['number_format']){
                    tableSubtitle += ', except for (Per Share) items';
                }
            }
        }
        // Rate formatting
        // {%} - Rate row
        // {PerShare} - Per Share items, that don't get formatted
        for(var i in object['row_headers']){
            if(object['row_headers'][i].includes('{%}')){
                // Remove the '{%}':
                //object['row_headers'][i] = object['row_headers'][i].replace('{%}', '(%)');
                // Convert the whole row to rate
                object['data'][i] = arrayValuesToRates(object['data'][i]);
            }
            // see if there are any per share rows
            else if(object['row_headers'][i].includes('{PerShare}')){
                // object['row_headers'][i] = object['row_headers'][i].replace('{PerShare}', '').concat(" ", '(Per Share)');
            }
            // see if there are any per share rows
            else if(object['row_headers'][i].includes('{Boolean}')){
                // object['row_headers'][i] = object['row_headers'][i].replace('{Boolean}', '').concat(" ", '(Boolean)');
            }
        }
        context.push({
            name: object['properties']['title'],
            subtitle: tableSubtitle,
            display_averages: display_averages,
            display: 'table',
            rows: object['row_headers'],
            columns: object['column_headers'],
            data: object['data']
        });
    }
    monitor(context);
}

// Called only by fillHistoricUsingReport() only
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
            _chart_data['x_historic'].push(endingYear - listLength + i + 1);
        });
    }
    // fill the chart with historic data
    return _chart_data['y_historic'][key];
}

function chartFillHistorical(object, key){
    if(isObjectInYearValueFormat(object)){
        return chartFillHistorical(new DateValueList(object), key);
    }
    if(isDateValueList(object)){
        _chart_data['y_historic'][key] = [];
        _chart_data['y_forecasted'][key] = [];

        if(_chart_data['x_historic'].length){
            _chart_data['y_historic'][key] = newArrayFill(_chart_data['x_historic'].length, '');
            var offset = 0;
            for(var x_historic_index = 0; x_historic_index < _chart_data['x_historic'].length; x_historic_index++){
                var date = _chart_data['x_historic'][x_historic_index];
                var value = object.valueAtDate(date);
                if(isValidNumber(value)){
                    _chart_data['y_historic'][key][x_historic_index] = value;
                }
                else{
                    _chart_data['y_historic'][key].splice(x_historic_index - offset, 1);
                    offset += 1;
                }
            }
            // maybe it has more than _chart_data['x_historic'] dates, let's append the rest
            if(_chart_data['x_historic'].length < object.list.length){
                var last_historical_date = _chart_data['x_historic'][_chart_data['x_historic'].length - 1];
                for(var i in object.list){
                    if(object.list[i].year > last_historical_date){
                        _chart_data['y_historic'][key].push(object.valueAtDate(object.list[i].year));
                        _chart_data['x_historic'].push(object.list[i].year);
                    }
                }
            }
        }
        else{
            var yearsList = object.dates();
            for(var i in yearsList){
                _chart_data['y_historic'][key].push(object.valueAtDate(yearsList[i]));
                _chart_data['x_historic'].push(yearsList[i]);
            }
        }
        // fill the chart with historic data
        return _chart_data['y_historic'][key];
    }
    return fillHistoricUsingList(object, key);
}

function chartFillHistoricalCopy(object, key){
    if(isDateValueList(object)){
        return chartFillHistorical(object.getList(), key);
    }
    if(isObjectInYearValueFormat(object)){
        _chart_data['y_historic'][key] = [];
        _chart_data['y_forecasted'][key] = [];

        if(_chart_data['x_historic'].length){
            _chart_data['y_historic'][key] = newArrayFill(_chart_data['x_historic'].length, '');
            object.forEach(function(item, i){
                for(var x_historic_index in _chart_data['x_historic']){
                    if( _chart_data['x_historic'][x_historic_index] == item.year ){
                        _chart_data['y_historic'][key][x_historic_index] = item.value;
                        break;
                    }
                }
            });
        }
        else{
            var yearsList = sortColumns(reportKeyToList(object, 'year'));
            for(var i in yearsList){
                _chart_data['y_historic'][key].push(getValueFromYearValue(object, yearsList[i]));
                _chart_data['x_historic'].push(yearsList[i]);
            }
        }
        // fill the chart with historic data
        return _chart_data['y_historic'][key];
    }
    return fillHistoricUsingList(object, key);
}

// Only DateValueList objects are allowed to be passed in object
function chartFillEditable(object, key, settings){
    var forecastDataKey = 'y_forecasted';
    if(settings == 'chartHidden'){
        forecastDataKey = 'y_forecasted_chart_hidden';
    }
    _chart_data[forecastDataKey][key] = [];
    // 'x_historic' member has to be filled
    if(_chart_data['x_historic'].length){
        // if x_forecasted has not been yet filled
        if(!_chart_data['x_forecasted'].length){
            var first_date = object.firstDate();
            var end_date = object.lastDate('except_ltm');
            // fill x_forecasted
            _chart_data['x_forecasted'] = newArrayFill(end_date - first_date, first_date, 'increment')
        }
        _chart_data[forecastDataKey][key] = reportKeyToList(object.list, 'value');
    }
}

function chartFill(object){
    for (var key in object) {
        // check if the property/key is defined in the object itself, not in parent
        if (object.hasOwnProperty(key)) {
            chartFillHistorical(object[key], key);
        }
    }
}

function _edit(){
    return location.hash;
}

// forecast() uses the 'x_historic' member's last date for correct indexing
// forecast points in a separate table for rates like return on equity, discount rates, etc.
// and values like beta that can't be displayed on the chart
function forecast(list, key, settings=''){
    var forecastDataKey = 'y_forecasted';
    if(settings == 'chartHidden'){
        forecastDataKey = 'y_forecasted_chart_hidden';
    }
    _chart_data[forecastDataKey][key] = [];
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
                        var keyIsRate = isRate(p[0].slice(1));
                        var valueToAdd = 0;
                        if(keyIsRate){
                            indexOfParameter =  p[0].slice(2).indexOf('_') + 2;
                            valueToAdd = Number(p[1])/100;
                        }
                        else{
                            indexOfParameter =  p[0].indexOf('_');
                            valueToAdd = Number(p[1]);
                        }
                        if(key == p[0].substr(1, indexOfParameter - 1)){
                            var listIndex = _chart_data['x_forecasted'].indexOf(Number(p[0].substr(indexOfParameter + 1)));
                            list[listIndex] = valueToAdd;
                            updatedPoints += 1;
                        }
                    }
                }
            });
        }
        _chart_data[forecastDataKey][key] = list;
        // update
    }
    return _chart_data[forecastDataKey][key];
}

function bindInputToForecastedChartPoint(inputKey, forecastedKey, index){
    _INPUT_GLOBAL[inputKey] = _chart_data['y_forecasted'][forecastedKey][index];
    $('.' + inputKey).val(_INPUT_GLOBAL[inputKey]);
    _bound_inputs.push(inputKey);
}

function modifiedInput(key){
    // Don't allow chart inputs to be added to modified_inputs
    if(key.charAt(0) != '!'){
        $('.' + key).addClass('text-primary');
        if(!_modified_inputs.includes(key)){
            _modified_inputs.push(key);
        }
    }
    // else -> Comes from Input()->modifiedInput() company_valuation.js
}

// Delete Input from _modified_inputs list
function resetInput(key){
    if(key == ''){return;}
    var modified_inputs = [];
    // delete param from hash
    if (location.hash){
        // if there is at least 1 param
        var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
        var buildHash = '';
        for(var i = 0; i < hashParams.length; i++){
            var p = hashParams[i].split('=');
            if(p[0] != key){
                if(buildHash){
                    buildHash += '&' + p[0] + '=' + p[1];
                }
                else{
                    buildHash = p[0] + '=' + p[1];
                }
            }
        }
        var topPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
        location.hash = buildHash;
        document.documentElement.scrollTop = topPos;
    }
    _modified_inputs.forEach(function(val, i){
        if(key != val){
            modified_inputs.push(val);
        }
        else{
            $('.' + key).removeClass('text-primary');
            _INPUT_GLOBAL[key] = '';
        }
    });
    _modified_inputs = modified_inputs;
}

function rerunWithInput(){
    console.log('rerunWithInput...');
    var topPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
    var modalDescriptionSection = $('.modal-description');
    var modalValuesSection = $('.modal-values');
    var modalTablesSection = $('.modal-tables');
    var modalChartsSection = $('.modal-charts');
    // Set a fixed height of each section to prevent Firefox scrolling through the page
    modalDescriptionSection.height(modalDescriptionSection.height());
    modalValuesSection.height(modalValuesSection.height());
    modalTablesSection.height(modalTablesSection.height());
    modalChartsSection.height(modalChartsSection.height());

    modalDescriptionSection.empty();
    modalValuesSection.empty();
    modalTablesSection.empty();
    modalChartsSection.empty();
    //hideAllHeadings();
    $('.heading-inputs').css('display', 'inherit');
    // specific to company valuation
    $('#warning-alert').css('display', 'none');
    var valuation_ticker = $("#valuation-ticker").val();

    if (valuation_ticker){
        try {
            eval($('#valuation_code_preload').val());
        } catch (error) {
            print(error);
            console.error(error);
        }
    }
    else{
        print("Empty ticker");
    }
    document.documentElement.scrollTop = topPos;
    SetUserEdits();
}

function setAssumption(Key, Value){
    var roundedVal = 0;
    if (!_modified_inputs.includes(Key)){
        if(Key.charAt(0) == '_'){
            // Is rate, divide by 100
            roundedVal = roundValue(Value, '%');
            _INPUT_GLOBAL[Key] = roundedVal / 100;
        }
        else{
            roundedVal = roundValue(Value);
            _INPUT_GLOBAL[Key] = roundedVal;
        }
        // Set the input value
        $('.' + Key).val(roundedVal);
    }
    return;
}

function getAssumption(key){
    if(key in _INPUT_GLOBAL && isValidNumber(_INPUT_GLOBAL[key])){
        return _INPUT_GLOBAL[key];
    }
    throwError("Assumption '"+key+"' is used, but it hasn't been set. Please set it using setAssumption() first.");
    return '';
}

// this function is called only on #btn-delete-all-chart-points clicked()
function deleteAllChartPoints(e){
    e.preventDefault();
    if (location.hash){
        var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
        var buildHash = '';
        for(var i = 0; i < hashParams.length; i++){
            var p = hashParams[i].split('=');
            if(p[0].charAt(0) == '!'){
                continue;
            }
            if(buildHash){
                buildHash += `&${p[0]}=${p[1]}`;
            }
            else{
                buildHash = `${p[0]}=${p[1]}`;
            }
        }
        location.hash = buildHash;
    }
    _bound_inputs.forEach(function(val, i){
        _INPUT_GLOBAL[val] = '';
    });
    _chart_data['hidden_series'] = [];
    _chart_data['added_properties'] = false;
}

var _function_highcharts_init__properties = {
    init: function(section){
        // The section needs to be pushed first
        if(section){
            this.sections.push(section);
        }
        if(!this.enabled){
            _function_highcharts_init(_function_highcharts_init__callback);
            this.enabled = true;
        }
        else if(this.rerun_active){
            _function_highcharts_init__callback();
            return;
        }
    },
    rerun_active: false,
    enabled: false,
    sections: []
};
var _function_highcharts_init__callback = function(){
    _function_highcharts_init__properties.rerun_active = true;
    const sections = _function_highcharts_init__properties.sections;
    if(sections.includes('valueBarChart')){
        $('#valueBarChart').remove();
        $('#chart-container').append('<div id="valueBarChart" style="height:128px;"></div>');
        // #valueBarChart Estimated Value Init
        var valueBarChart = new Highcharts.Chart({
            chart: {
                type: 'bar',
                renderTo: 'valueBarChart',
                style: {
                    fontFamily: 'Arial, sans-serif'
                }
            },
            navigation: {
                buttonOptions: {
                    enabled: false
                }
            },
            title: {
                text: null
            },
            legend: {
                enabled: false
            },
            xAxis: {
                categories: _function_highcharts_init__properties.labels,
                title: {
                    text: null
                },
                labels: {
                    formatter: function() {
                        return this.value;
                    }
                }
            },
            yAxis: {
                title: {
                    text: null
                },
                labels: {
                    enabled: false
                },
                gridLineWidth: 0
            },
            plotOptions: {
                series: {
                    borderWidth: 1,
                    dataLabels: {
                        enabled: true,
                        formatter: function () {
                            return this.y.toFixed(2) + ' ' + _function_highcharts_init__properties.currency;
                        }
                    }
                },
                bar: {
                    pointPadding: 0.85,
                    groupPadding: 1
                }
            },
            tooltip: {
                formatter: function () {
                    return '<b>' + this.point.category + '</b><br/>' + Highcharts.numberFormat(this.y, 2) + ' ' + _function_highcharts_init__properties.currency;
                }
            },
            series: [{
                data: _function_highcharts_init__properties.data
            }],
            credits: {
                enabled: false
            }
        });
    }
    if(sections.includes('model-chart')){
        _function_highcharts_init__properties.modalChartsSection.append('<div id="model-chart"></div>');
        // #model-chart Model Chart
        var chart = Highcharts.chart('model-chart', {
            title: {text: _chart_data['name'],align: 'left'},
            subtitle: {text: _chart_data['subtitle'],align: 'left'},
            xAxis: {
                categories: _chart_data['x_historic'].concat(_chart_data['x_forecasted']),
                gridLineWidth: 1
            },
            yAxis: {
                minorTickInterval:"auto"
            },
            plotOptions: {
                series: {
                    animation: false
                }
            },
            exporting: {
                buttons: {
                    contextButton: {
                        align: 'right',
                        symbolStroke: "#4e73df",
                        verticalAlign: 'top'
                        // x: 30
                    }
                }
            },
            accessibility: {
                enabled: false
            },
            series: [
            ]
        });
        $.each(_chart_data['y_historic'], function(key,value){
            // values are type string. needs conversion to Number()
            var historic_data = value.map(str => {
                return Number(str);
            });
            var forecasted_data = [];
            if(_chart_data['y_forecasted'][key].length){
                // values are type string. needs conversion to Number()
                forecasted_data = _chart_data['y_forecasted'][key].map(str => {
                    return Number(str);
                });
            }
            forecasted_data.forEach(function (forecasted_value, forecasted_data_index){
                forecasted_data[forecasted_data_index] = {
                    y: forecasted_value,
                    forecasted: true
                }
            });
            var data = historic_data.concat(forecasted_data);
            var visible = true;
            if(_chart_data['hidden_series'].includes(key)){
                visible = false;
            }
            var tooltipSuffix = '';
            if(isRate(key)){
                tooltipSuffix='%';
                for(var i in data){
                    data[i] = toR(data[i]);
                }
            }
            var tooltip_valueDecimals = 2;
            var dragDrop_dragPrecisionY = 0.01;
            if(_chart_data['number_format']){
                tooltip_valueDecimals = 0;
                var minValue = minimum(reportKeyToList(forecasted_data, 'y'));
                minValue = absolute(minValue, _chart_data['number_format']);
                if(!minValue && minValue < 1){
                    // keep dragDrop_dragPrecisionY = 0.01
                }
                else if(minValue < 10){
                    dragDrop_dragPrecisionY = 0.1;
                }
                else if(minValue < 100){
                    dragDrop_dragPrecisionY = 1;
                }
                else if(minValue < 1000){
                    dragDrop_dragPrecisionY = 10;
                }
                else if(minValue < 10000){
                    dragDrop_dragPrecisionY = 100;
                }
                else{
                    dragDrop_dragPrecisionY = 1000;
                }
            }
            chart.addSeries({
                    name: getKeyName(key),
                    key_name: key,
                    visible: visible,
                    dragDrop: {
                        draggableY: true,
                        dragPrecisionY: dragDrop_dragPrecisionY
                    },
                    point: {
                        events: {
                            drag: function(e) {
                                if (!this.forecasted) {
                                    return false;
                                }
                            },
                            drop: function() {
                                if (!this.forecasted) {
                                    return false;
                                }
                                chartPointDrop(this.series.userOptions.key_name, this.category, Highcharts.numberFormat(this.y, 2).replace(/ /g,''));
                            }
                        }
                    },
                    tooltip: {
                        valueSuffix: tooltipSuffix,
                        valueDecimals: tooltip_valueDecimals
                    },
                    data: data,
                    zoneAxis: 'x',
                    zones: [{
                        value: historic_data.length - 1
                    }, {
                        dashStyle: 'dot'
                    }],
                    events: {
                        hide: function () {
                            if(!(_chart_data['hidden_series'].includes(this.userOptions.key_name))){
                                _chart_data['hidden_series'].push(this.userOptions.key_name);
                            }
                        },
                        show: function () {
                            var hidden_series = [];
                            var key_name = this.userOptions.key_name;
                            _chart_data['hidden_series'].forEach(function(val, i){
                                if(val != key_name){
                                    hidden_series.push(val);
                                }
                            });
                            _chart_data['hidden_series'] = hidden_series;
                        }
                    }
            });
        });

        // create the forecast table only if there are forecasted points on the chart
        if(_chart_data['x_forecasted'].length){
            // build <thead>
            $tableHead = $('<tr/>').append( $('<th/>').addClass('bg-light icon-aligned').css('font-weight', 'normal').text('Forecast Table').prepend(
                $('<i/>').attr('data-feather', 'edit-3')
            ) );
            _chart_data['x_forecasted'].forEach(function(val, i){
                $tableHead.append(
                    $('<th/>').attr('scope', 'col').addClass('bg-light text-center').append(
                        $('<span/>').text(val)
                    )
                );
            });
            $tableHead = $('<thead/>').append( $tableHead ).addClass('thead-light');

            // build tbody
            $tableBody = $('<tbody/>');
            var forecastedPoints = Object.assign({}, _chart_data['y_forecasted'], _chart_data['y_forecasted_chart_hidden']);
            Object.keys(forecastedPoints).forEach(function(key){
                if(forecastedPoints[key].length){
                    $tbodyTrValues = $('<tr>').append(
                        $('<td/>').attr('scope', 'row').addClass('align-middle row-description').text(getKeyName(key))
                    );
                    var valueClassName = 'chart-table-value';
                    if(key in _chart_data['y_forecasted_chart_hidden']){
                        valueClassName = 'hidden-chart-table-value';
                    }
                    forecastedPoints[key].forEach(function(val, i){
                        if(isRate(key)){
                            val = roundValue(toP(val), '%') + '%';
                        }
                        else{
                            val = roundValue(val);
                        }
                        $tbodyTrValues.append(
                            $('<td/>').append(
                                $('<input/>').attr('type', 'text').addClass(
                                    'text-center form-control form-control-sm border-0 rounded-0 ' + valueClassName
                                ).attr(
                                    'id', valueClassName + '-' + key + '-' + i
                                ).attr('key', key).attr('index', i).attr('category', _chart_data['x_forecasted'][i]).val(val)
                            )
                        );
                    });
                    $tableBody.append($tbodyTrValues);

                    // if the key is not in the y_historic, we shouldn't show % growth
                    if(key in _chart_data['y_historic'] && !_chart_data['hide_growth'].includes(key)){
                        $tbodyPercentages = $('<tr/>').append(
                            $('<td/>').addClass('row-description').append(
                                $('<p/>').text('↳ ').append($('<span/>').text('Growth Rate').addClass('small')).addClass('text-center mb-0 mt-1')
                            )
                        ).addClass('border-left-light');

                        var lastHistoricValue = 0;
                        if(_chart_data['y_historic'][key].length > 2){
                            lastHistoricValue = _chart_data['y_historic'][key][_chart_data['y_historic'][key].length - 1];
                        }
                        var firstValue = roundValue(lastHistoricValue);
                        var secondValue = 0;
                        var percentage = 0;
                        var percentageClassName = 'chart-table-percentage';
                        for(var i=0; i<_chart_data['y_forecasted'][key].length; i++){
                            secondValue = roundValue(_chart_data['y_forecasted'][key][i]);
                            percentage = roundValue(toP((secondValue - firstValue) / firstValue), '%');
                            firstValue = secondValue;
                            $tbodyPercentages.append(
                                $('<td/>').append(
                                    $('<input/>').attr('type', 'text').addClass(
                                        'text-center form-control form-control-sm border-0 rounded-0 ' + percentageClassName // watch the space
                                    ).attr(
                                        'id', percentageClassName + '-' + key + '-' + i
                                    ).attr('key', key).attr('index', i).attr('category', _chart_data['x_forecasted'][i]).val(String(percentage) + '%')
                                )
                            );
                        }
                        $tableBody.append($tbodyPercentages);
                    }
                }
            });

            // Chart table section id="chart-table"
            $('#chart-table').empty();
            $table = $('<table/>').append(
                $tableHead
            ).append(
                $tableBody
            ).addClass('table table-sticky border table-sm text-dark forecast-table');
             $('#chart-table').append($table);
             var cellHeight = $('#chart-table').find('tr:nth-child(2)').first().height();
             $('#chart-table').find('td').each(function(){
                // $(this).height(cellHeight-7); // don't know where the extra 7px come from
                $(this).height(32);
             });
             feather.replace();
        }
        else{
            // hide delete all chart points button #212
            $('#btn-delete-all-chart-points').hide();
        }
    }
}
function appendChart(modalChartsSection){
    _function_highcharts_init__properties.modalChartsSection = modalChartsSection;
    _function_highcharts_init__properties.init('model-chart');
}
function DisplayEstimatedValue(marketPrice, Value, Currency){
    var backgroundColors = [];
    var borderColors = [];
    var percentage = overOrUndervaluedPercentage(marketPrice, Value);
    if(Value < marketPrice){
        $('#estimated-value-verdict').text(percentage + ' % Overvalued');
        $('#estimated-value-verdict').removeClass('text-success').addClass('text-danger');
        $('#estimated-value-verdict').attr('data-original-title',
        'Market Price ('+ roundValue(marketPrice) +' '+ Currency +') is higher than the Estimated Value ('+ roundValue(Value) +' '+ Currency +'), which makes the stock Overvalued by ' +
        roundValue(marketPrice - Value) +' '+ Currency +' ('+ percentage + '% Market Premium).');
        backgroundColors = ["rgba(255, 99, 132, 0.2)", "rgba(78, 115, 223, 0.2)"];
        borderColors = ["rgb(255, 99, 132)","rgb(78, 115, 223)"];
    }
    else if(Value > marketPrice){
        $('#estimated-value-verdict').text(percentage + ' % Undervalued');
        $('#estimated-value-verdict').removeClass('text-danger').addClass('text-success');
        $('#estimated-value-verdict').attr('data-original-title',
        'Market Price ('+ roundValue(marketPrice) +' '+ Currency +') is lower than the Estimated Value ('+ roundValue(Value) +' '+ Currency +'), which makes the stock Undervalued by ' +
        roundValue(Value - marketPrice) +' '+ Currency +' ('+ percentage + '% Discount).');
        backgroundColors = ["rgba(75, 192, 192, 0.2)", "rgba(78, 115, 223, 0.2)"];
        borderColors = ["rgb(75, 192, 192)","rgb(78, 115, 223)"];
    }
    else{
        $('#estimated-value-verdict').text('Market Price matches the Estimated Value');
        backgroundColors = ["rgba(78, 115, 223, 0.2)", "rgba(78, 115, 223, 0.2)"];
        borderColors = ["rgb(78, 115, 223)","rgb(78, 115, 223)"];
    }

    // set the initial variables
    _function_highcharts_init__properties.currency = Currency;
    _function_highcharts_init__properties.labels = ["Market Price", "Estimated Value"];
    _function_highcharts_init__properties.data = [
        { y: marketPrice, color: backgroundColors[0], borderColor: borderColors[0] },
        { y: parseFloat(Value.toFixed(2)), color: backgroundColors[1], borderColor: borderColors[1] }
    ];
    _function_highcharts_init__properties.init('valueBarChart');
}
function AnimateEstimatedValue(Value){
    // function to animate the Estimated Value
    $({someValue: 0}).animate({someValue: Value}, {
      duration: 750,
      easing:'swing', // can be anything
      step: function() { // called on every step
          // Update the element's text with rounded-up value:
          $('#estimated-value').text(roundValue(this.someValue));
      }
    }).promise().done(function () {
        // hard set the value after animation is done to be
        // sure the value is correct
        $('#estimated-value').text(roundValue(Value));
    });
}
// This is the company valuation tab, not the watchlist. Allow valuation to continue by returning false.
function _StopIfWatch(value, currency){return false;}
function _SetEstimatedValue(value, currency){
    // Could this be executed before page ready?
    $('.section-estimated-value').show();
    // we want to convert report currency USD to profile ccy CAD
    $.when(
      get_fx(),
      get_profile()).done(function(response_fx, response_profile){
        var profile = getDataFromResponse(response_profile);
        // var originalCurrency = profile.originalCurrency;
        var convertedCurrency = profile.convertedCurrency;
        var profile = profile.report[0];

        var fx = response_fx[0];
        if(convertedCurrency != currency){
            value = value * currencyRate(fx, currency, convertedCurrency);
        }
        AnimateEstimatedValue(value);
        DisplayEstimatedValue(profile.price, value, convertedCurrency);

        $('.estimated-value-currency').text(convertedCurrency);
    });
    return false; // false means "do not stop, since this is not a watch"
}

// Description
var _section_description__properties = {
    init: function(){
        if(this.enabled){
            _section_description__callback();
        }
        return;
    },
    assumptions_descriptions_set: false,
    enabled: false,
};
var _function_tippy_katex_init__callback = function(){
    const ShortDescription = _section_description__properties.ShortDescription;
    const AssumptionDescriptions = _section_description__properties.AssumptionDescriptions;
    if(typeof(ShortDescription) == 'object' && ShortDescription.length){
        // If the Short Description is an object, it should be in {Title}, {Paragraph}, etc. format
        appendFormattedDescription($('.modal-description'), ShortDescription);
    }
    renderDescriptions({
        data: AssumptionDescriptions,
        selector: '.modal-description #{key}',  // {key} will be replaced with each key
        placement: 'auto'
    });
    renderDescriptions({
        data: AssumptionDescriptions,
        selector: '#{key} .col label',  // {key} will be replaced with each key
        placement: 'auto'
    });
};
var _section_description__callback = function(){
    const ShortDescription = _section_description__properties.ShortDescription;
    const AssumptionDescriptions = _section_description__properties.AssumptionDescriptions;
    $('.heading-description').show();
    if(typeof(ShortDescription) == 'string' && ShortDescription.length){
        // If the Short Description is a string, it should be in HTML format, so we can render it directly
        var descriptionSection = $('.modal-description');
        var appendDescription = '<span class="short-description">' + ShortDescription + '</span>';
        descriptionSection.append(appendDescription);
    }
    // AssumptionDescriptions Requires Katex + Tippy -> _function_tippy_katex_init__callback
    if(AssumptionDescriptions && !_section_description__properties.assumptions_descriptions_set){
        _section_description__properties.assumptions_descriptions_set = true;
        _function_tippy_katex_init(_function_tippy_katex_init__callback);
    }
};
function Description(ShortDescription, AssumptionDescriptions={}){
    _section_description__properties.ShortDescription = ShortDescription;
    _section_description__properties.AssumptionDescriptions = AssumptionDescriptions;
    _section_description__properties.init();
    // Enable after the init in order for it to work for rerun valuation
    _section_description__properties.enabled = true;
}

// Assumptions
var inputDescriptionHasBeenSet = false;
function appendInputRow(key, value, parentsChildren=[], editedParams=[]){
    var $inputSection = $('.modal-inputs');
    var childOrParent = 'parent-input';
    var childOf = '';
    var arrow = '';
    for(var i in parentsChildren){
        if('children' in parentsChildren[i] && parentsChildren[i].children.includes(key)){
            childOrParent = 'child-input';
            childOf = parentsChildren[i].parent;
            arrow = '↳ ';
        }
        if(key == parentsChildren[i].parent && !inputDescriptionHasBeenSet){
            /*$('.modal-inputs-description').append(
                parentsChildren[i].description
            );*/
            inputDescriptionHasBeenSet = true;
            break;
        }
    }

    var iteration = 0;
    iteration += 1;

    var step = '';
    var $inputFieldDiv = $('<div/>').append(
                $('<input/>').attr('step', step).attr('type', 'number').css(
                    {}//{"margin-bottom": "2px", "margin-top": "2px"}
                ).addClass(
                    textColor
                ).addClass(
                    'input-assumption text-end form-control text-dark'
                ).addClass(key).attr('value', value).attr('name', key).attr('id', key)
            ).addClass('input-container input-group input-group-sm input-group-joined border');
    var percentage = '#';
    if(key.charAt(0) == '_'){
        percentage = '%';
        /*$inputFieldDiv.append(
                $('<div/>').append(
                    $('<span/>').text('%').addClass('input-group-text')
                ).addClass('input-group-append')
            );*/
        step = 0.1;
        if ( $.isNumeric(_INPUT_GLOBAL[key]) ){
            // affects returned dict
            _INPUT_GLOBAL[key] /= 100;
        }
    }
    $inputFieldDiv.append(
                $('<div/>').append(
                    $('<span/>').text(percentage).addClass('input-group-text bg-light text-center p-2').css({'width': '29', 'height': '100%'})
                ).addClass('input-group-append')
            );
    var textColor = '';
    if(editedParams.includes(key)){
        textColor = 'text-primary';
    }
    var appendInput = $('<div/>').append(
        $('<div/>').append(
            $('<label/>').text(
                arrow + formatInputKey(key)
            ).attr('for', key).addClass('my-auto p-0 text-capitalize assumption-label')
        ).addClass('col align-self-center')
    ).append(
        $('<div/>').append(
            $inputFieldDiv
        ).addClass('col-auto d-flex align-items-center')
    ).addClass('dynamic-size-row row form-group').addClass(childOrParent).attr('id', key);
    // see where you need to append it
    if(childOf){
        $('#'+childOf).after(appendInput);
    }
    else{
        $inputSection.append(appendInput);
    }
}
var _section_assumptions__properties = {
    enabled: false,
    appended: false,
};
var _section_assumptions__callback = function(){
    if(_section_assumptions__properties.enabled){
        $('.heading-inputs').show();
    }
    if(!_section_assumptions__properties.appended){
        // append only once
        $.each(_INPUT_GLOBAL, function(key, value) {
            // ! is reserved for charting values
            if(key.charAt(0) == '!'){
                return true; // skip iteration
            }
            appendInputRow(
                key,
                value,
                _section_assumptions__properties.ParentsChildren,
                _section_assumptions__properties.editedParams
            );

            function RerunModel(obj){
                resetChartData(); // function in valuation-functions.js that resets x values
                var topPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
                var thisValue = obj.val();

                if(key.charAt(0) == '_' && $.isNumeric(thisValue)){
                    thisValue /= 100;
                }
                if(_INPUT_GLOBAL[key] != thisValue || thisValue == ''){
                    // 'if' just for the hash parameters. we put unadjusted params (not /100 for rates)
                    if($.isNumeric(thisValue)){
                        if (location.hash){
                            // if there is at least 1 param
                            var inputFound = false;
                            var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
                            var buildHash = '';
                            for(var i = 0; i < hashParams.length; i++){
                                var p = hashParams[i].split('=');
                                if(p[0] == obj.attr('name')){
                                    // if the input is found, update its value
                                    p[1] = obj.val();
                                    inputFound = true;
                                }
                                if(buildHash){
                                    buildHash += '&' + p[0] + '=' + p[1];
                                }
                                else{
                                    buildHash = p[0] + '=' + p[1];
                                }
                            }
                            if(inputFound){
                                location.hash = buildHash;
                            }
                            else{
                                // unadjusted $(this).val() value (can be adjusted for rate /100)
                                location.hash += '&' + obj.attr('name') + '=' + obj.val();
                            }
                        }
                        else{
                            // if there are 0 params in the hash (no # present in url)
                            location.hash = obj.attr('name') + '=' + obj.val();
                        }
                        modifiedInput(key);
                        // put adjusted value in input dict. this will be returned in user code
                        _INPUT_GLOBAL[key] = Number(thisValue);
                    }
                    else{
                        _INPUT_GLOBAL[key] = thisValue;
                    }
                    // re-eval the code
                    rerunWithInput();
                }
                document.documentElement.scrollTop = topPos;
            }

            // copy paste
            var timer = 0;
            $('.' + key).on("keyup change", function(e){
                e.preventDefault();
                if (timer) {
                    clearTimeout(timer);
                }
                var obj = $(this);
                // check if only tab was pressed, don't set anything because the value did not change
                var code = e.keyCode || e.which;
                if((obj.val() || obj.val() === 0) && code && code != '9'){
                    timer = setTimeout(function(){
                        if(obj.val() || obj.val() === 0){
                            RerunModel(obj);
                            timer=0;
                        }
                    }, 500);
                }
            });
            $('.' + key).on("focusout", function(e){
                e.preventDefault();
                if($(this).val() === '' || $(this).val() === '-'){
                    resetInput(key);
                    timer = 0;
                    RerunModel($(this));
                }
                else if(timer){
                    RerunModel($(this));
                }
            });
        });
    }
};
function Input(OriginalInput, ParentsChildren=[]){
    _section_assumptions__properties.ParentsChildren = ParentsChildren;
    if(!_section_assumptions__properties.enabled){
        _section_assumptions__properties.enabled = true;
        var editedParams = [];
        if (location.hash){
            // if there are params in hash
            var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
            for(var i = 0; i < hashParams.length; i++){
                var p = hashParams[i].split('=');
                editedParams.push(p[0]);
                if(isValidNumber(p[1])){
                    OriginalInput[p[0]] = Number(p[1]);
                }
                else{
                    // Prevent string hacks
                    OriginalInput[p[0]] = '';
                }
                modifiedInput(p[0]);
            }
        }
        _INPUT_GLOBAL = OriginalInput;
        _section_assumptions__properties.editedParams = editedParams;
    }
    else{
        $.each(OriginalInput, function(key, value) {
            if(_INPUT_GLOBAL[key] === '' || _INPUT_GLOBAL[key] === '-'){
                if(key.charAt(0) == '_'){
                    if ( $.isNumeric(value) ){
                        _INPUT_GLOBAL[key] = value / 100;
                    }
                }
                else{
                    _INPUT_GLOBAL[key] = value;
                }
                // Set the input value
                $('.' + key).val(value);
            }
        });
    }
    return _INPUT_GLOBAL;
}

$(function(){
    // On ready, show all visible sections
    _section_assumptions__callback();
    _section_description__properties.init();
    /*
        README:
        Have a callback function
            '.heading-description'
            '.heading-inputs'

        Should be initialized as the valuation code executes
            '.section-estimated-value'
            '.heading-values'
            '.heading-tables'
            '.heading-charts'
    */
    $('#chart-table').on("keyup change", '.chart-table-value', function(){
        keyupChangeHandler($(this), 'value');
    });
    $('#chart-table').on("focusout", '.chart-table-value', function(){
        focusoutHandler($(this), 'value');
    });
    $('#chart-table').on("keyup change", '.chart-table-percentage', function(){
        keyupChangeHandler($(this), 'growth');
    });
    $('#chart-table').on("focusout", '.chart-table-percentage', function(){
        focusoutHandler($(this), 'growth');
    });

    $("#export-tables").click(function() {
        var tables = $('.modal-tables').find('.table').not('.sticky-thead');
        var wb = TableToExcel.initWorkBook();
        for(var i = 0; i<tables.length; i++){
            var opt = {
               sheet: {
                  name: $(tables[i]).attr('header').slice(0, 30) // sheetName cannot exceed 30 chars
               }
            };
            TableToExcel.tableToSheet(wb, tables[i], opt);
        }
        TableToExcel.save(wb, nameExcelExportFile());
    });
});

// New utility functions go into new-valuation-functions.js!
