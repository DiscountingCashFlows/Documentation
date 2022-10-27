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
var _estimates;
var _dividends_annual;
var _dividends_reported;
var _prices_daily;
var _prices_annual;
var _fx;

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
_chart_data['hidden_series'] = [];

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
    _estimates = undefined;
}

function get_income_statement(){
    if (!_income_statement){
        _income_statement = $.get( "/api/income-statement/" + $("#valuation-ticker").val() + "/");
    }
    return _income_statement;
}

function get_income_statement_quarterly(){
    if (!_income_statement_quarterly){
        _income_statement_quarterly = $.get( "/api/income-statement/quarterly/" + $("#valuation-ticker").val() + "/");
    }
    return _income_statement_quarterly;
}

function get_income_statement_ltm(){
    if (!_income_statement_ltm){
        _income_statement_ltm = $.get( "/api/income-statement/ltm/" + $("#valuation-ticker").val() + "/");
    }
    return _income_statement_ltm;
}

function get_balance_sheet_statement(){
    if (!_balance_sheet_statement){
        _balance_sheet_statement = $.get( "/api/balance-sheet-statement/" + $("#valuation-ticker").val() + "/");
    }
    return _balance_sheet_statement;
}

function get_balance_sheet_statement_quarterly(){
    if (!_balance_sheet_statement_quarterly){
        _balance_sheet_statement_quarterly = $.get( "/api/balance-sheet-statement/quarterly/" + $("#valuation-ticker").val() + "/");
    }
    return _balance_sheet_statement_quarterly;
}

function get_cash_flow_statement(){
    if (!_cash_flow_statement){
        _cash_flow_statement = $.get( "/api/cash-flow-statement/" + $("#valuation-ticker").val() + "/");
    }
    return _cash_flow_statement;
}

function get_cash_flow_statement_quarterly(){
    if (!_cash_flow_statement_quarterly){
        _cash_flow_statement_quarterly = $.get( "/api/cash-flow-statement/quarterly/" + $("#valuation-ticker").val() + "/");
    }
    return _cash_flow_statement_quarterly;
}

function get_cash_flow_statement_ltm(){
    if (!_cash_flow_statement_ltm){
        _cash_flow_statement_ltm = $.get( "/api/cash-flow-statement/ltm/" + $("#valuation-ticker").val() + "/");
    }
    return _cash_flow_statement_ltm;
}

function get_ratios(){
    if (!_ratios){
        _ratios = $.get( "/api/ratios/" + $("#valuation-ticker").val() + "/");
    }
    return _ratios;
}

function get_dividends_annual(){
    if (!_dividends_annual){
        _dividends_annual = $.get( "/api/dividends/" + $("#valuation-ticker").val() + "/");
    }
    return _dividends_annual;
}

function get_dividends_reported(){
    if (!_dividends_reported){
        _dividends_reported = $.get( "/api/dividends/reported/" + $("#valuation-ticker").val() + "/");
    }
    return _dividends_reported;
}

function get_prices_daily(){
    if (!_prices_daily){
        _prices_daily = $.get( "/api/prices/daily/" + $("#valuation-ticker").val() + "/");
    }
    return _prices_daily;
}

function get_prices_annual(){
    if (!_prices_annual){
        _prices_annual = $.get( "/api/prices/annual/" + $("#valuation-ticker").val() + "/");
    }
    return _prices_annual;
}

function get_quote(){
    if (!_quote){
        _quote = $.get( "/api/quote/" + $("#valuation-ticker").val() + "/");
    }
    return _quote;
}

function get_profile(){
    if (!_profile){
        _profile = $.get( "/api/profile/" + $("#valuation-ticker").val() + "/");
    }
    return _profile;
}

function get_treasury(){
    if (!_treasury){
        _treasury = $.get( "/api/treasury/");
    }
    return _treasury;
}

function get_analyst_estimates(){
    if (!_estimates){
        _estimates = $.get( "/api/analyst-estimates/" + $("#valuation-ticker").val() + "/");
    }
    return _estimates;
}

function get_fx(){
    if (!_fx){
        _fx = $.get( "/api/fx/");
    }
    return _fx;
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
    let nf = new Intl.NumberFormat('en-US');
    modalTablesSection.append('<h5 class="text-center mt-3">' + item.name + '</h5>');
    var tableString = '<div class="table-responsive"><table class="table table-sticky border table-hover-custom text-dark" header="'+ item.name +'"><thead class="bg-white"><tr>';
    if(item.columns){
        tableString += '<th></th>';
        for(var i = 0; i < item.columns.length; i++){
            tableString += '<th class="py-1 px-3 text-center">' + item.columns[i] + '</th>';
        }
        tableString += '</tr></thead><tbody>';
        for(var i = 0; i < item.data.length; i++){
            var dataItem = item.data[i];
            tableString += '<tr>';
            tableString += '<td class="row-description"><b>' + item.rows[i] + '</b></td>';
            for(var j = 0; j < dataItem.length; j++){
                var valueData = dataItem[j];
                if ($.isNumeric(dataItem[j])){
                    valueData = nf.format(valueData);
                }
                tableString += '<td class="py-1">' + valueData + '</td>';
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

function isRate(key){
    if(key.charAt(0) == '_'){
        return true;
    }
    return false;
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
        var topPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
        var hashParams = window.location.hash.substr(1).split('&'); // substr(1) to remove the `#`
        var buildHash = '';
        for(var i = 0; i < hashParams.length; i++){
            var p = hashParams[i].split('=');
            if(p[0].charAt(0) == '!'){
                indexOfParameter =  p[0].indexOf('_');
                if( String(key) == p[0].substr(1, indexOfParameter - 1) &&
                    String(category) == p[0].substr(indexOfParameter + 1) ){
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
        document.documentElement.scrollTop = topPos;
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

function chartPointDrop(key, category, value){
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

// copy paste
var timerValues = 0;
$('#chart-table').on("keyup change", '.chart-table-value', function(){
    if (timerValues) {
        clearTimeout(timerValues);
    }
    var obj = $(this);
    var obj_id = $(this).attr('id');
    timerValues = setTimeout(function(){
        if(obj.val() || obj.val() === 0){
            // if new value is different from the old one
            if( Math.floor(Number(obj.val()) * 100)/100 != Math.floor(_chart_data['y_forecasted'][obj.attr('key')][obj.attr('index')] * 100)/100 ){
                chartPointDrop(obj.attr('key'), obj.attr('category'), Math.floor(Number(obj.val())*100)/100);
                $('#' + obj_id).focus();
            }
        }
    }, 500);
});
$('#chart-table').on("focusout", '.chart-table-value', function(){
    var obj = $(this);
    var obj_id = $(this).attr('id');
    if(obj.val() === '' || obj.val() === '-'){
        // reset input in hash
        resetChartInput(obj.attr('key'), obj.attr('category'));
        $( "#modal-charts" ).trigger( "chartPointDrop" );
    }
    else if(obj.val() || obj.val() === 0){
        if( Math.floor(Number(obj.val()) * 100)/100 != Math.floor(_chart_data['y_forecasted'][obj.attr('key')][obj.attr('index')] * 100)/100 ){
            chartPointDrop(obj.attr('key'), obj.attr('category'), Math.floor(Number(obj.val())*100)/100);
        }
    }
});

var timerPercentages = 0;
$('#chart-table').on("keyup", '.chart-table-percentage', function(){
    if (timerPercentages) {
        clearTimeout(timerPercentages);
    }
    var obj = $(this);
    var obj_id = $(this).attr('id');
    timerPercentages = setTimeout(function(){
        if(obj.val() || obj.val() === 0){
            var value = Number(obj.val().replace('%', ''));
            if(obj.attr('index') == 0){
                var prevValue = _chart_data['y_historic'][obj.attr('key')][_chart_data['y_historic'][obj.attr('key')].length - 1];
            }
            else{
                var prevValue = _chart_data['y_forecasted'][obj.attr('key')][Number(obj.attr('index')) - 1];
            }
            // use math ceil to prevent 0.99% issues when 1% is input
            chartPointDrop(obj.attr('key'), obj.attr('category'), Math.ceil(100 * prevValue * (1 + value/100))/100);
            obj.val(value + '%');
            $('#' + obj_id).focus();
        }
    }, 500);
});
$('#chart-table').on("focusout", '.chart-table-percentage', function(){
    if($(this).val() === '' || $(this).val() === '-'){
        $( "#modal-charts" ).trigger( "chartPointDrop" );
    }
});

var timerValuesHidden = 0;
$('#chart-table').on("keyup", '.hidden-chart-table-value', function(){
var topPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (timerValuesHidden) {
        clearTimeout(timerValuesHidden);
    }
    var obj = $(this);
    var obj_id = $(this).attr('id');
    timerValuesHidden = setTimeout(function(){
        if(obj.val() || obj.val() === 0){
            var value = Number(obj.val().replace('%', ''));
            chartPointDrop(obj.attr('key'), obj.attr('category'), Math.floor(100 * value)/100);
            obj.val(value + '%');
            $('#' + obj_id).focus();
        }
    }, 500);
        window.pageYOffset = topPos;

});
$('#chart-table').on("focusout", '.hidden-chart-table-value', function(){
var topPos = document.documentElement.scrollTop || document.body.scrollTop || 0;
    if($(this).val() === '' || $(this).val() === '-'){
        $( "#modal-charts" ).trigger( "chartPointDrop" );
    }
        window.pageYOffset = topPos;
});

function appendChart(modalChartsSection){
    modalChartsSection.append('<div id="model-chart"></div>');

    var chart = new Highcharts.chart('model-chart', {
        title: {text: _chart_data['name']},
        xAxis: {
            categories: _chart_data['x_historic'].concat(_chart_data['x_forecasted'])
        },
        plotOptions: {
            series: {
                animation: false
            }
        },
        exporting: {
            buttons: {
                contextButton: {
                    align: 'left',
                    symbolStroke: "#4e73df",
                    x: 30
                }
            }
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
        chart.addSeries({
                name: getKeyName(key),
                key_name: key,
                visible: visible,
                dragDrop: {
                    draggableY: true,
                    dragPrecisionY: 0.01
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
                    valueDecimals: 2
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
                        val = Math.floor(10000 * val)/100 + '%';
                    }
                    else{
                        val = Math.floor(val*100)/100;
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
                if(key in _chart_data['y_historic']){
                    $tbodyPercentages = $('<tr/>').append(
                        $('<td/>').addClass('row-description')
                    ).addClass('border-left-light');

                    var lastHistoricValue = 0;
                    if(_chart_data['y_historic'][key].length > 2){
                        lastHistoricValue = _chart_data['y_historic'][key][_chart_data['y_historic'][key].length - 1];
                    }
                    var firstValue = lastHistoricValue;//_chart_data['y_forecasted'][key][0];
                    var percentageClassName = 'chart-table-percentage';
                    for(var i=0; i<_chart_data['y_forecasted'][key].length; i++){
                        var percentage = 100 * (_chart_data['y_forecasted'][key][i] - firstValue) / firstValue;
                        firstValue = _chart_data['y_forecasted'][key][i];
                        $tbodyPercentages.append(
                            $('<td/>').append(
                                $('<input/>').attr('type', 'text').addClass(
                                    'text-center form-control form-control-sm border-0 rounded-0 ' + percentageClassName // watch the space
                                ).attr(
                                    'id', percentageClassName + '-' + key + '-' + i
                                ).attr('key', key).attr('index', i).attr('category', _chart_data['x_forecasted'][i]).val(Math.floor(percentage*100)/100 + '%')
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
            $(this).height(cellHeight-7); // don't know where the extra 7px come from
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
}

// this function is called only on #btn-delete-all-chart-points clicked()
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

function renderChart(name){
    if(_chart_data['x_historic'].length){ // means that the chart x axis has been filled
        _chart_data['name'] = name;
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
                modalValuesSection.append('<li class="dynamic-size-row list-group-item py-1 px-0 ' + textColor + ' ">' + item.name +
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
            _chart_data['x_historic'].push(endingYear - listLength + i);
        });
    }
    // fill the chart with historic data
    return _chart_data['y_historic'][key];
}

function toM(value){
    return value / 1000000;
}

function toK(value){
    return value / 1000;
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
