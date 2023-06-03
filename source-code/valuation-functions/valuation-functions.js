// Used only in company_valuation and valuation
var _income_statement;
var _income_statement_quarterly;
var _income_statement_ltm;
var _balance_sheet_statement;
var _balance_sheet_statement_quarterly;
var _cash_flow_statement;
var _cash_flow_statement_quarterly;
var _cash_flow_statement_ltm;
var _ratios;
var _quote;
var _profile;
var _treasury;
var _treasury_daily;
var _treasury_monthly;
var _treasury_annual;
var _estimates;
var _dividends_annual;
var _dividends_reported;
var _prices_daily;
var _prices_annual;
var _fx;
var _risk_premium;
var _institutional_holders={};

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
var _CodeMirror_output = undefined;

function resetChartData(){
    _chart_data['x_historic'] = [];
    _chart_data['x_forecasted'] = [];
}

function unsetAllData(){
    _income_statement = undefined;
    _income_statement_quarterly = undefined;
    _income_statement_ltm = undefined;
    _balance_sheet_statement = undefined;
    _balance_sheet_statement_quarterly = undefined;
    _cash_flow_statement = undefined;
    _cash_flow_statement_quarterly = undefined;
    _cash_flow_statement_ltm = undefined;
    _ratios = undefined;
    _quote = undefined;
    _profile = undefined;
    _treasury = undefined;
    _treasury_daily = undefined;
    _treasury_monthly = undefined;
    _treasury_annual = undefined;
    _estimates = undefined;
    _dividends_annual = undefined;
    _dividends_reported = undefined;
    _prices_daily = undefined;
    _prices_annual = undefined;
    _fx = undefined;
    _risk_premium = undefined;
    _institutional_holders = {};
}

function getUrl(URL, ErrorMessage=''){
    var request = $.get( URL );
    request.fail(function (jqXHR, textStatus, errorThrown){
        // Log the error to the console
        alertify.notify(ErrorMessage+" not found.", 'error', 0);
        console.error(
            textStatus, errorThrown
        );
    });
    return request;
}


function get_income_statement(){
    if (!_income_statement){
        _income_statement = getUrl(
            "/api/income-statement/" + $("#valuation-ticker").val() + "/",
            "Company Income Statements"
        );
    }
    return _income_statement;
}

function get_income_statement_quarterly(){
    if (!_income_statement_quarterly){
        _income_statement_quarterly = getUrl(
            "/api/income-statement/quarterly/" + $("#valuation-ticker").val() + "/",
            "Company Income Quarterly Statements"
        );
    }
    return _income_statement_quarterly;
}

function get_income_statement_ltm(){
    if (!_income_statement_ltm){
        _income_statement_ltm = getUrl(
            "/api/income-statement/ltm/" + $("#valuation-ticker").val() + "/",
            "Company Income LTM Statements"
        );
    }
    return _income_statement_ltm;
}

function get_balance_sheet_statement(){
    if (!_balance_sheet_statement){
        _balance_sheet_statement = getUrl(
            "/api/balance-sheet-statement/" + $("#valuation-ticker").val() + "/",
            "Company Balance Sheet Statements"
        );
    }
    return _balance_sheet_statement;
}

function get_balance_sheet_statement_quarterly(){
    if (!_balance_sheet_statement_quarterly){
        _balance_sheet_statement_quarterly = getUrl(
            "/api/balance-sheet-statement/quarterly/" + $("#valuation-ticker").val() + "/",
            "Company Balance Sheet Quarterly Statements"
        );
    }
    return _balance_sheet_statement_quarterly;
}

function get_cash_flow_statement(){
    if (!_cash_flow_statement){
        _cash_flow_statement = getUrl(
            "/api/cash-flow-statement/" + $("#valuation-ticker").val() + "/",
            "Company Cash Flow Statements"
        );
    }
    return _cash_flow_statement;
}

function get_cash_flow_statement_quarterly(){
    if (!_cash_flow_statement_quarterly){
        _cash_flow_statement_quarterly = getUrl(
            "/api/cash-flow-statement/quarterly/" + $("#valuation-ticker").val() + "/",
            "Company Cash Flow Quarterly Statements"
        );
    }
    return _cash_flow_statement_quarterly;
}

function get_cash_flow_statement_ltm(){
    if (!_cash_flow_statement_ltm){
        _cash_flow_statement_ltm = getUrl(
            "/api/cash-flow-statement/ltm/" + $("#valuation-ticker").val() + "/",
            "Company Cash Flow LTM Statements"
        );
    }
    return _cash_flow_statement_ltm;
}

function get_ratios(){
    if (!_ratios){
        _ratios = getUrl(
            "/api/ratios/" + $("#valuation-ticker").val() + "/",
            "Company Ratios Data"
        );
    }
    return _ratios;
}

function get_dividends_annual(){
    if (!_dividends_annual){
        _dividends_annual = getUrl(
            "/api/dividends/" + $("#valuation-ticker").val() + "/",
            "Company Annual Dividend Data"
        );
    }
    return _dividends_annual;
}

function get_dividends_reported(){
    if (!_dividends_reported){
        _dividends_reported = getUrl(
            "/api/dividends/reported/" + $("#valuation-ticker").val() + "/",
            "Company Reported Dividend Data"
        );
    }
    return _dividends_reported;
}

function get_prices_daily(){
    if (!_prices_daily){
        _prices_daily = getUrl(
            "/api/prices/daily/" + $("#valuation-ticker").val() + "/",
            "Company Daily Historic Prices"
        );
    }
    return _prices_daily;
}

function get_prices_annual(){
    if (!_prices_annual){
        _prices_annual = getUrl(
            "/api/prices/annual/" + $("#valuation-ticker").val() + "/",
            "Company Annual Historic Prices"
        );
    }
    return _prices_annual;
}

function get_quote(){
    if (!_quote){
        _quote = getUrl(
            "/api/quote/" + $("#valuation-ticker").val() + "/",
            "Company Quote"
        );
    }
    return _quote;
}

function get_profile(){
    if (!_profile){
        _profile = getUrl(
            "/api/profile/" + $("#valuation-ticker").val() + "/",
            "Company Profile"
        );
    }
    return _profile;
}

function get_treasury(){
    if (!_treasury){
        _treasury = getUrl(
            "/api/treasury/",
            "Last Treasury Yield"
        );
    }
    return _treasury;
}

function get_treasury_daily(length=0){
    if (!_treasury_daily){
        _treasury_daily = getUrl(
            "/api/treasury/daily/" + appendTreasuriesLength(length),
            "Daily Treasury Yields"
        );
    }
    return _treasury_daily;
}

function get_treasury_monthly(length=0){
    if (!_treasury_monthly){
        _treasury_monthly = getUrl(
            "/api/treasury/monthly/" + appendTreasuriesLength(length),
            "Monthly Treasury Yields"
        );
    }
    return _treasury_monthly;
}

function get_treasury_annual(length=0){
    if (!_treasury_annual){
        _treasury_annual = getUrl(
            "/api/treasury/annual/" + appendTreasuriesLength(length),
            "Annual Treasury Yields"
        );
    }
    return _treasury_annual;
}

function get_analyst_estimates(){
    if (!_estimates){
        _estimates = getUrl(
            "/api/analyst-estimates/" + $("#valuation-ticker").val() + "/",
            "Analyst Estimates"
        );
    }
    return _estimates;
}

function get_fx(){
    if (!_fx){
        _fx = getUrl(
            "/api/fx/",
            "FX Data"
        );
    }
    return _fx;
}

function get_risk_premium(){
    if (!_risk_premium){
        _risk_premium = getUrl(
            "/api/risk-premium/" + $("#valuation-ticker").val() + "/",
            "Country Risk Premium"
        );
    }
    return _risk_premium;
}

// api/institutional-holders/<str:ticker>/<str:date>/
function get_institutional_holders(date){
    if (!(date in _institutional_holders)){
        _institutional_holders[date] = getUrl(
            "/api/institutional-holders/" + $("#valuation-ticker").val() + "/" + date + "/",
            "Institutional Holders"
        );
    }
    return _institutional_holders[date];
}

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
                    'input-assumption text-right form-control'
                ).addClass(key).attr('value', value).attr('name', key).attr('id', key)
            ).addClass('input-container shadow-sm input-group input-group-sm');
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
                    $('<span/>').text(percentage).addClass('input-group-text text-center').css({'width': '29', 'height': '31'})
                ).addClass('input-group-append')
            );
    var textColor = '';
    if(editedParams.includes(key)){
        textColor = 'text-primary';
    }
    var appendInput = $('<div/>').append(
        $('<div/>').append(
            $('<label/>').text(
                arrow + key.toString().toLowerCase().replace(/_/g, ' ')
            ).attr('for', key).addClass('my-auto p-0 text-capitalize')
        ).addClass('col align-self-center')
    ).append(
        $('<div/>').append(
            $inputFieldDiv
        ).addClass('col-auto d-flex')
    ).addClass('dynamic-size-row row form-group').addClass(childOrParent).attr('id', key);
    // see where you need to append it
    if(childOf){
        $('#'+childOf).after(appendInput);
    }
    else{
        $inputSection.append(appendInput);
    }
}

// Add a description to the top of the window
function Description(ShortDescription, ShowMore=''){
    $('.heading-description').show();
    var descriptionSection = $('.modal-description');
    /* Show More is DEPRECATED
    var showMoreHTML = '';
    if (ShowMore != ''){
        showMoreHTML = `
        <p class='text-center pt-2'>
          <a class="btn btn-outline-primary btn-sm" data-toggle="collapse" href="#collapseMoreText" role="button" aria-expanded="false" aria-controls="collapseMoreText">
            <span class="collapsed">
                Read More
            </span>
            <span class="expanded">
                Read Less
            </span>
          </a>
        </p>
        <div class="collapse" id="collapseMoreText">
          <div class="card card-body">
            ` + ShowMore + `
          </div>
        </div>
        `;
    }
    */
    var appendDescription = '<span class="short-description">' + ShortDescription + '</span>';
    descriptionSection.append(appendDescription);
    // descriptionSection.append(showMoreHTML);
    // MathJax.typeset();
}

function hideAllHeadings(){
    $('.section-estimated-value').css('display', 'none');
    $('.heading-description').css('display', 'none');
    $('.heading-inputs').css('display', 'none');
    $('.heading-values').css('display', 'none');
    $('.heading-tables').css('display', 'none');
    $('.heading-charts').css('display', 'none');
}

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
    TableToExcel.save(wb, $('#hidden-ticker-name').val() +'_discountingcashflows.xlsx');
});

function appendTable(item, modalTablesSection, tablesCount){
    var nf = new Intl.NumberFormat('en-US');
    modalTablesSection.append('<h5 class="mt-3 mb-0">' + item.name + '</h5>');
    if(item.subtitle){
        modalTablesSection.append('<p class="text-secondary mb-2">' + item.subtitle + '</p>');
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
            tableString += '<td class="row-description"><b><span class="row-description-text" nondev="'
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

// key = revenue
// category = 2024
// value = 102312.4
function chartPointDrop(key, category, value){
    addNumberFormatToHash();
    // when modifying the forecasted values, update hash
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
    /*
    if(isRate(key)){
        prevValue = toR(prevValue);
    }
    */
    return prevValue;
}
function getValueFromForecastedInput(obj){
    var value = obj.val().replace('%', '');
    /*
    var key = obj.attr('key');
    if(isRate(key)){
        value = value.replace('%', '');
    }
    */
    return value;
}
function isBeingReset(value){
    if(value === ''){
        return true;
    }
    return false;
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
    }
    else if(type == 'growth'){
        // Triggered when a forecast Growth Rate is changed
        var previousValue = roundValue(getPreviousValue(key, index));
        var currentValue = roundValue(getPreviousValue(key, index + 1));
        compare_value = roundValue(toP((currentValue - previousValue)/previousValue), '%');
        dropValue = roundValue(previousValue * (1 + value/100));
    }
    if(isValidNumber(value)){
        // if new value is different from the old one compare_value
        if( value == compare_value ){
            return;
        }
    }
    chartPointDrop(key, category, dropValue);
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
        resetChartInput(key, category);
        $( "#modal-charts" ).trigger( "chartPointDrop" );
    }
    else{
        keyupChangeForecastTable(obj, type);
    }
}

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

function appendChart(modalChartsSection){
    modalChartsSection.append('<div id="model-chart"></div>');

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
        $tableHead = $('<tr/>').append( $('<th/>').addClass('bg-light').css('font-weight', 'normal').text('Forecast Years').prepend(
            $('<i/>').addClass('fas fa-edit fa-sm mr-1')
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
                            $('<p/>').text('↳ ').append($('<span/>').text('Growth Rate').addClass('small')).addClass('text-center')
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
    }
    else{
        // hide delete all chart points button #212
        $('#btn-delete-all-chart-points').hide();
    }
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
                if (item.name.toUpperCase() == 'ERROR'){
                    textColor = 'text-danger';
                }
                $('.heading-values').show();
                modalValuesSection.append('<li class="dynamic-size-row list-group-item py-1 px-0 ' + textColor + ' ">' + item.name +
                                 '<div class="float-right"><span class="mr-1">' + item.data + '</span><span>' + item.currency + '</span></li>');

                // Will soon be DEPRECATED
                if(item.name){
                    global_str += '>>> ' + item.name + ': ' + item.data + ' ' + item.currency + '\n';
                }
                else{
                    global_str += '>>> ' + item.data + ' ' + item.currency + '\n';
                }
                // Dummy class
                if(_CodeMirror_output != undefined){
                    _CodeMirror_output.setValue(global_str);
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
                modalValuesSection.append('<li class="list-group-item text-danger">Error: No display type! <span class="float-right">' + String(item) + '</span></li>');
            }
        }
        // this function will set the width of the row-description elements
        // call this before the stickyTable calculates the width value
        setTableRowDescriptionWidth(true);

        // After all tables have been appended, make their headers sticky
        $(".table-sticky, .table-hover-custom").stickyTable({overflowy: true});
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
                    if(!object['row_headers'][i].includes('{%}') && !object['row_headers'][i].includes('{PerShare}')){
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
                object['row_headers'][i] = object['row_headers'][i].replace('{PerShare}', '').concat(" ", '(Per Share)');;
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

/*
{
  start_date: nextYear,
  keys: ['revenue', 'operatingCashFlow', 'freeCashFlow'],
}
*/

function _edit(){
    return location.hash;
}

// Go through the url parameters and see if any !eps_2024=3.5
// if it was found, return the value
// else return null
/*
function getValueFromEditableKey(date, key){
    var token = key + "_" + String(date);
    if (location.hash && location.hash.includes(token)){
        // var index_of_token = location.hash.indexOf(token);
        // var remaining_string = location.hash.slice(index_of_token);
        var value = location.hash.slice(location.hash.indexOf(token)).split('&')[0].split('=')[1];
        if(isValidNumber(value)){
            value = Number(value);
            if(isRate(token)){
                value = toN(value);
            }
            else{
                var number_format = getNumberFormatFromHash();
                if(number_format){
                    if(number_format == 'M'){
                        value /= toM(1);
                    }
                    else if(number_format == 'K'){
                        value /= toK(1);
                    }
                }
            }
            return value;
        }
    }
    return null;
}
*/

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
    else{
        // Comes from Input()->modifiedInput() company_valuation.js
        // console.trace();
    }
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
            if (str >= 1000000){
                string = nf.format(roundValue(toM(str)));
                string += ' Mil.';
            }
            else if (str >= 1000){
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
        context.push({name:'', display:'value', data:string, currency:currency});
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

// New utility functions go into new-valuation-functions.js!
