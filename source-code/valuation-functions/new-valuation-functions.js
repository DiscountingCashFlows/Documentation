/*
    README:
    This is the Valuation Framework for the Discounting Cash Flows Website (discountingcashflows.com)
    All code needs to be compatible with EcmaScript 5.1 (ES5.1).
    Warning! Features from ES6 do not work and need to be avoided.
    https://www.w3schools.com/js/js_es5.asp

    Read the Docs: https://discounting-cash-flows.readthedocs.io/en/latest/index.html
    Discounting Cash Flows Website link: https://discountingcashflows.com/

    © Copyright:
        Discounting Cash Flows Inc.
        8 The Green, Dover, DE 19901
*/

/*
    Recommended framework practices (for devs):
        - For lists [], use for(var i=0; i<list.length; i++) instead of for(var i in list)
            as i's value will sometimes jump randomly when executed by the sequencer.
        - Do not use continue in switch as it causes the sequencer to loop forever.
        - Do not use .includes(':')
            Error: TypeError: 'undefined' is not a function (tried calling property 'includes' of 'String')
*/

/*
    Class:      Response
    Purpose:    Pass in the response objects and perform
                quick operations like currency conversion.
                The response objects are reports like 'income' as the Income Statements,
                'balance' as the Balance Sheet Statements etc.
*/
function Response(){
    this.data = {};
    this.currency = '';
    if(arguments.length == 1){
        /*
            var response = new Response({
              income: _income,
              income_ltm: _income_ltm,
              balance: _balance,
              balance_quarterly: _balance_quarterly,
              balance_ltm: 'balance_quarterly:0',
            });
        */
        var append_last = [];
        for(var key in arguments[0]){
            this.data[key] = deepCopy(arguments[0][key]);
            if(key != 'data' && key != 'currency'){
                var input_object = this.get(key);
                if(typeof(input_object) == 'string'){
                    append_last.push(key);
                }
                else{
                    this[key] = this.get(key);
                }
            }
            else{
                throwError(key + ' is not allowed. Please use another name.')
            }
        }
        if(append_last){
            for(var i=0; i<append_last.length; i++){
                var key = append_last[i];
                // data_key = 'balance_quarterly:0'
                var data_key = this.get(key);
                // index = 0 by default
                var data_index = 0;
                if(stringIncludesToken(data_key, ':')){
                    // data_index = 0
                    data_index = data_key.split(':')[1];
                    // data_key = balance_quarterly
                    data_key = data_key.split(':')[0];
                }
                this[key] = this[data_key][data_index];
            }
        }
    }
}

function getReportCurrency(report){
    var currency = '';
    if(report && typeof(report) == 'object'){
        if(report.length && 'convertedCurrency' in report[0]){
            // retrieve the first item's currency
            currency = report[0].convertedCurrency;
        }
        else if('convertedCurrency' in report){
            currency = report.convertedCurrency;
        }
    }
    return currency;
}

Response.prototype.toOneCurrency = function(report_key, fx) {
    if(this.data && report_key in this.data){
        // Keys that are excepted from FX conversion
        var do_not_convert_key = ['weightedAverageShsOut',
                                  'weightedAverageShsOutDil',
                                  'sharesOutstanding',
                                  'beta',
                                  'pe',
                                  'volAvg',
                                  'avgVolume',
                                  'volume',
                                  'changesPercentage',
                                  'timestamp',
                                  'year'];
        fx = getDataFromResponse(fx);

        this.currency = getReportCurrency(this.data[report_key]);
        for(var key in this.data){
            var item = this.data[key];
            var item_currency = getReportCurrency(item);
            if(item_currency && item_currency != this.currency){
                var ccyRate = currencyRate(fx, item_currency,  this.currency);
                // convert report to original currency, meaning this.currency
                if('report' in item){
                    // getDataFromResponse is just to reduce a length 1 list (like profile) to a normal object
                    var report = getDataFromResponse(item.report);

                    for(var item_report_key in report){
                        if(do_not_convert_key.includes(item_report_key)){continue;}
                        var value = report[item_report_key];
                        if(typeof(value) === 'object'){
                            for(var k in value){
                                if(!do_not_convert_key.includes(k) && isValidNumber(value[k])){
                                    report[item_report_key][k] = Number(value[k]) * ccyRate;
                                }
                            }
                        }
                        else if(isValidNumber(value)){
                            report[item_report_key] = Number(value) * ccyRate;
                        }
                    }
                    // make sure to set the converted currency to this.currency
                    if('convertedCurrency' in item){
                        item.convertedCurrency = this.currency;
                    }
                    // Important: Variable report is a reference to this[key],
                    // which means that this[key] is going to be converted as well
                    // because it is the same object.
                    // The only exception is 'balance_ltm' :{
                    //      balance_quarterly: _balance_quarterly,
                    //      balance_ltm: 'balance_quarterly:0',
                    // }
                    // But 'balance_ltm' references an index in balance_quarterly,
                    // which is also converted. So everything should now be
                    // converted to this.currency
                }
            }
        }
    }
    return this;
};

Response.prototype.get = function(report_key) {
    var return_obj = null;
    if(this.data && report_key in this.data){
        if(typeof(this.data[report_key]) == 'string'){
            return this.data[report_key];
        }
        else if(typeof(this.data[report_key]) == 'object' && 'report' in this.data[report_key]){
            return_obj = this.data[report_key].report;
        }
        else{
            return_obj = this.data[report_key];
        }
        while(return_obj.length == 1){
            return_obj = return_obj[0];
        }
    }
    return return_obj;
};

/*
    response.merge('_ltm') merges 'income_ltm' into 'income'
    var response = new Response({
        income: _income,
        income_ltm: _income_ltm,
    });
*/
Response.prototype.merge = function(extension) {
    for(var key in this.data){
        if(stringIncludesToken(key, extension)){
            // key == 'income_ltm'
            // key.replace(extension, '') == 'income'
            var base_key = key.replace(extension, '');
            if(base_key in this){
                this[base_key].unshift(this[key]);
            }
        }
    }
    return this;
};


/*
    Class:      DateValueData
    Purpose:    Store response data and compute new values and ratios
                through formulas and functions.
*/
function DateValueData(){
    this.data = {};
    this.computed = {
        formula: {},
        components: {},
        editable: {},
        edited_parameters: '',
        compute_order: [],
        functions: [],
        constants: [],
    };
    if(arguments.length == 1){
        this.data = arguments[0];
        // Check if the data is consistent and fill with 0 where it is needed.
        // For example, if company doesn't pay dividends, fill with 0
        var last_date=this.lastDate();
        var start_date=this.firstDate();
        for(var key in this.data){
            if(!this.exists(key)){
                this.get(key).listFill({
                    fill_ltm: this.ltmColumnExists(), // true only if 'LTM' is found in any of this.data keys
                    start_date: start_date,
                    last_date: last_date,
                    value: 0,
                });
            }
        }
    }
    else if(arguments.length == 2){
        this.data = arguments[0];
        this.computed = arguments[1];
    }
}

DateValueData.prototype.formula = function(object) {
    if(object){
        this.computed.formula = object;
    }
    return this.computed.formula;
};

DateValueData.prototype.setFormula = function(new_formula) {
    this.computed = {
        components: {},
        compute_order: [],
        formula: new_formula,
        functions: [],
        editable: {},
        edited_parameters: '',
        constants: [],
    };
    return this;
};

DateValueData.prototype.components = function(object) {
    if(object){
        this.computed.components = object;
        return this;
    }
    return this.computed.components;
};

DateValueData.prototype.compute_order = function(object) {
    if(object){
        this.computed.compute_order = object;
        return this;
    }
    return this.computed.compute_order;
};

DateValueData.prototype.functions = function(object) {
    if(object){
        this.computed.functions = object;
        return this;
    }
    return this.computed.functions;
};

DateValueData.prototype.constants = function(object) {
    if(object){
        this.computed.constants = object;
        return this;
    }
    return this.computed.constants;
};

DateValueData.prototype.editable = function(object) {
    if(this.computed.editable != {} && 'keys' in this.computed.editable){
        return this.computed.editable;
    }
    return null;
}


/*
 * @param {String} / {Number or String} / {Number} retrieves:
    - corresponding value key + year
    - ltm_reference_year is required when year == 'LTM'
    key example: 'eps:0'
*/
DateValueData.prototype.getValueAtYear = function(key, year, ltm_reference_year) {
    if( typeof(key) == 'string' && year){
        var operand_key = key;
        var operand_index = 0;
        if(stringIncludesToken(operand_key, ':')){
            var splitIndex = operand_key.indexOf(':');
            operand_index = operand_key.substring(splitIndex + 1);
            if(!isValidNumber(operand_index)){
                throwError("Key error in '" + operand_key + "'. Operand index " + operand_index + " has to be a number.")
            }
            operand_key = operand_key.substring(0, splitIndex);
        }
        var operand_value = 0;
        if(this.exists(operand_key)){
            if(isValidNumber(year)){
                // If year is not 'LTM', adjust to operand_index (eps:operand_index)
                year = Number(year) + Number(operand_index);
            }
            else if(isValidNumber(ltm_reference_year) && Number(operand_index) != 0){
                // If year is LTM and operand_index != 0, then adjust ltm_reference_year to operand_index
                // If operand_index == 0, then we leave year be 'LTM'
                year = Number(ltm_reference_year) + Number(operand_index);
            }
            return this.get(operand_key).valueAtDate(year);
        }
    }
    return null;
};

/*
 * @param {String} / {[String1, String2]} retrieves:
    - a single key as DateValueList()
    - multiple keys as an object of type:
        {
          'key1': DateValueList(),
          'key2': DateValueList(),
          ...
        }
*/
DateValueData.prototype.get = function(query) {
    if( typeof(query) == 'string' ){
        if(query in this.data){
            // returns a mutable reference to the key
            return this.data[query];
        }
        throwError("Key '"+query+"' does not exist. Please check your spelling, or initialize it using new DateValueList().");
        return null;
    }
    // query should contain a set of keys
    // the returned object should not reference the original object
    var clone = this.clone();
    if('keys' in query){
        var keys = query.keys;
        var filtered_object = {};
        if(typeof(keys) == 'object' && keys.length){
            for(var i=0; i<keys.length; i++){
                var key = keys[i];
                if(typeof(key) == 'string'){
                    filtered_object[key] = clone.get(key);
                }
            }
            clone.data = filtered_object;
        }
    }
    if('start_date' in query){
        for(var key in clone.data){
            clone.data[key] = clone.get(key).sublist(query.start_date);
        }
    }
    return clone;
};

DateValueData.prototype.ltmColumn = function() {
    for(var key in this.data){
        if(this.data[key].lastDate() == 'LTM'){
            return ['LTM'];
        }
    }
    return [];
};

DateValueData.prototype.ltmColumnExists = function() {
    if(this.ltmColumn().length){
        return true;
    }
    return false;
};

DateValueData.prototype.columns = function(start_date) {
    var first_date = this.firstDate();
    var last_date = this.lastDate('maximum');
    // var ltm_column = this.ltmColumn();
    if( !start_date || (start_date && first_date > start_date) ){
        return newArrayFill(last_date - first_date, first_date, 'increment').concat(this.ltmColumn());
    }
    return newArrayFill(last_date - start_date, start_date, 'increment').concat(this.ltmColumn());
};

/*
 * @param {String} / {[String1, String2]} retrieves:
    - a single key as DateValueList()
    - multiple keys as an object of type:
        {
          'key1': DateValueList(),
          'key2': DateValueList(),
          ...
        }
    if max_or_min == maximum, it returns the highest year of all DateValueList items
    else, it returns the lowest of all DateValueList items
*/
DateValueData.prototype.lastDate = function(max_or_min) {
    var last_date = [];
    for(var key in this.data){
        var last_date_value = this.data[key].lastDate('except_ltm');
        if(isValidNumber(last_date_value)){
            last_date.push(last_date_value);
        }
    }
    if(max_or_min == 'maximum'){
        return maximum(last_date);
    }
    return minimum(last_date);
};

DateValueData.prototype.firstDate = function() {
    var first_date = [];
    for(var key in this.data){
        var first_date_value = this.data[key].firstDate('except_ltm');
        if(isValidNumber(first_date_value)){
            first_date.push(first_date_value);
        }
    }
    var min_first_date = minimum(first_date);
    return min_first_date;
};

function dateValueDataClone(data){
    var return_obj = {};
    for(var key in data){
        return_obj[key] = data[key].clone();
    }
    return return_obj;
}

DateValueData.prototype.clone = function() {
    var clone = new DateValueData(dateValueDataClone(this.data));
    clone.computed = rawClone(this.computed);
    return clone;
}

DateValueData.prototype.toM = function() {
    var clone = this.clone();
    for(var key in clone.data){
        clone.data[key] = clone.data[key].toM();
    }
    return clone;
}

DateValueData.prototype.toK = function() {
    var clone = this.clone();
    for(var key in clone.data){
        clone.data[key] = clone.data[key].toK();
    }
    return clone;
}

DateValueData.prototype.appendComponent = function(key, value) {
    if(key in this.components()){
        this.components()[key].push(value);
    }
    else{
        this.components()[key] = [value];
    }
}

DateValueData.prototype.removeDate = function(date) {
    var clone = this.clone();
    return clone.removeDateMutable(date);
}

// Mutable version of DateValueData.prototype.removeDate
DateValueData.prototype.removeDateMutable = function(date) {
    for(var key in this.data){
        // mutable because we've already cloned all data, we don't want to waste memory
        this.data[key].removeDateMutable(date);
    }
    return this;
}

// This function unshifts (inserts into the first position) the specified key
function unshiftFunctionParameterKey(key, parameters, function_keys){
    if(parameters.hasOwnProperty(key)){
        var parameters_key = parameters[key];
        if(typeof(parameters_key) == 'string' || !parameters_key.length){
            parameters_key = [parameters_key];
        }
        var extracted_keys = extractIndexedKeys(parameters_key).zeroIndex;
        if(extracted_keys.length){
            for(var i=0; i<extracted_keys.length; i++){
                function_keys.unshift(extracted_keys[i]);
            }
        }
    }
    return function_keys;
}

function extractIndexedKeys(keys, extracted_keys){
    if(!extracted_keys){
        extracted_keys = {
            zeroIndex: [],
            negativeIndex: []
        };
    }
    for(var i=0; i<keys.length; i++){
        if(isValidNumber(keys[i])){/* Do nothing */}
        else if(typeof(keys[i]) == 'string'){
            // Case when key is just a string
            // keys = ['key1', 'key2:0']
            var operand_key = getOperandKey(keys[i]);
            var operand_index = getOperandIndex(keys[i]);
            if(operand_index === 0){
                extracted_keys.zeroIndex.push(operand_key);
            }
            else if(isValidNumber(operand_index)){
                // Should be negative index keys 'eps:-1', which should be appended last
                extracted_keys.negativeIndex.push(operand_key);
            }
        }
        else if(typeof(keys[i]) == 'object'){
            // Case when key is an object
            // keys = [['key1', '*', 'key2'], ...]
            // keys = [['key1', '*', 2], ...]
            if(keys[i].length == 3){
                var key1 = keys[i][0];
                var key2 = keys[i][2];
                // Recursive calls until keys are string
                extracted_keys = extractIndexedKeys([key1, key2], extracted_keys);
            }
        }
    }
    return extracted_keys;
}

DateValueData.prototype.processRawComputeOrder = function(raw_compute_order) {
    var compute_order = this.compute_order();
    // Extract all keys
    for(var i=0; i<raw_compute_order.length; i++){
        raw_compute_order[i] = extractIndexedKeys(raw_compute_order[i]).zeroIndex;
    }
    var original_compute_order = JSON.parse(JSON.stringify(raw_compute_order));

    // Safety loop break
    var break_loop_at = 100;
    while(raw_compute_order.length >= 2 && break_loop_at > 0){
        var was_found = false;
        for(var i=0; i<raw_compute_order.length; i++){
            var base_row = raw_compute_order[i];
            var last_key = base_row[base_row.length - 1];
            // Find a row that contains last_key
            for(var j=0; j<raw_compute_order.length; j++){
                if(i == j){continue;}
                var key_row = raw_compute_order[j];
                if(key_row.includes(last_key)) {
                    // Merge the two rows into one
                    // var key_index = key_row.indexOf(last_key);
                    var base_index = base_row.indexOf(last_key);
                    var diff = listOrderedDifference(key_row, base_row);
                    raw_compute_order[i] = base_row.concat(
                        diff
                    );

                    raw_compute_order.splice(j, 1);
                    // Reset raw_compute_order loop
                    i = -1;
                    // Break out of extracted_keys loop
                    j = raw_compute_order.length;
                    was_found = true;
                }
            }
        }
        if(!was_found){
            break;
        }
        break_loop_at -= 1;
    }
    if(break_loop_at <= 0){
        throwError('Max iterations reached while processing compute order. Please have a look at the compute formula and make sure it is correct.');
    }

    // Concatenate all rows left into on row in raw_compute_order
    for(var i=0; i<raw_compute_order.length; i++) {
        compute_order = compute_order.concat(listOrderedDifference(raw_compute_order[i], compute_order));
    }

    // Important! These adjustments are made in order to make sure that the compute_order is in order
    // It is similar to a bubble sort
    var adjustment_was_made = true;
    // Safety loop break
    var break_loop_at = 500;
    while(adjustment_was_made && break_loop_at > 0){
        adjustment_was_made = false;
        for(var i=0; i<original_compute_order.length; i++){
            var key_row = original_compute_order[i];
            var last_key = key_row[key_row.length - 1];
            var index_of_last_key = compute_order.indexOf(last_key);
            // We need to make sure that last_key is behind all other keys
            for(var j=0; j<key_row.length-1; j++){
                var current_key = key_row[j];
                var index_of_current_key = compute_order.indexOf(current_key);
                if(index_of_current_key > index_of_last_key){
                    compute_order = compute_order.slice(0, index_of_last_key
                    ).concat(
                        [current_key]
                    ).concat(
                        compute_order.slice(index_of_last_key, index_of_current_key)
                    ).concat(
                        compute_order.slice(index_of_current_key + 1)
                    );
                    adjustment_was_made = true;
                }
            }
        }
        break_loop_at -= 1;
    }
    if(break_loop_at <= 0){
        throwError('Max iterations reached. Please have a look at the compute formula and make sure it is correct.');
    }
    this.compute_order(compute_order);
}

DateValueData.prototype.functionDiscountCompound = function(properties) {
    var year = properties.year;
    var forecast_start_date = properties.forecast_start_date;
    var action = properties.action;
    var key = properties.key;
    var data_index = properties.data_index;
    var data_key = properties.data_key;

    if(year < forecast_start_date){
        return false;
    }
    var year_difference = year - forecast_start_date;
    var rate_key = this.formula()[key][2].rate;
    var rate = 0;
    // if year_difference is 0, then the future_value == discounted_value
    if(year_difference){
        // rate calculation
        if( typeof(rate_key) == 'string' ){
            // get the value of the rate key
            rate = this.get(rate_key).valueAtDate(year);
        }
        else if(isValidNumber(rate_key)){
            rate = rate_key;
        }
    }
    var future_value = 0;
    if(data_index){
        if(!isValidNumber(data_index) && typeof(data_index) == 'string'){
            // 'start_date'
            // 'function:compound', 'revenue:start_date', {rate: ..., start_date: ...}
            if(data_index in this.formula()[key][2]){
                future_value = this.get(data_key).valueAtDate(
                    this.formula()[key][2][data_index]
                );
            }
        }
        else{
            // 'function:discount', 'freeCashFlow:0', {rate: ..., start_date: ...}
            // get the value at year + Number(data_index)
            var data_index_date = year + Number(data_index);
            future_value = this.get(data_key).valueAtDate(data_index_date);
        }
    }
    else{
        if(isValidNumber(data_key)){
            // 'function:discount', 1234, {rate: ..., start_date: ...}
            future_value = Number(data_key);
        }
        else{
            // 'function:discount', 'freeCashFlow', {rate: ..., start_date: ...}
            future_value = this.get(data_key).valueAtDate(year);
        }
    }

    if('start_date' in this.formula()[key][2]){
        year_difference = year - this.formula()[key][2].start_date;
        if(year_difference < 0){
            year_difference = 0;
        }
    }
    properties.result = 0;
    if(action == 'discount'){
        properties.result = future_value / Math.pow(1 + rate, year_difference);
    }
    else if(action == 'compound'){
        properties.result = future_value * Math.pow(1 + rate, year_difference);
    }
    return true;
}

DateValueData.prototype.compute = function(properties) {
    // Don't alter the original DateValueData object
    var clone = this.clone();
    this.formula({});
    // Alter the clone and return it
    return clone.computeMutable(properties);
}

// Returns all keys inside object sorted by name
// This prevents compute_order mismatch ???
function getOrderedKeyList(object) {
    var return_list = [];
    for(var key in object){
        return_list.push(key);
    }
    return_list.sort();
    return return_list;
};

function getOperandKey(operand_formula){
    if( typeof(operand_formula) == 'string' && stringIncludesToken(operand_formula, ':')){
        return operand_formula.substring(0, operand_formula.indexOf(':'));
    }
    return operand_formula;
}

function getOperandIndex(operand_formula){
    if( typeof(operand_formula) == 'string' ){
        if(stringIncludesToken(operand_formula, ':')){
            return parseInt(operand_formula.substring(operand_formula.indexOf(':') + 1));
        }
        return 0;
    }
    return null;
}

/*
    * @param {Object} properties:
        {
            'forecast_years': 5
        }
    * DateValueData object:
        this.data = {};
        this.computed = {
            components: {},
            compute_order: [],
            formula = {},
        };
    * Functions description:
        - function:linear_regression
            'linearRegression': ['function:linear_regression', 'adjDividend', {slope: 1, start_date: 2013}],

        - function:compound
            1. ['function:compound', 1, {rate: 0.1, start_date: 2023}]
                {
                    2022: 1,
                    2023: 1,
                    2024: 1.1,
                    2025: 1.21,
                    ...
                }
            2. ['function:compound', 'linearRegression', {rate: 0.1, start_date: 2023}]
            3. ['function:compound', 'linearRegression:start_date', {rate: 0.1, start_date: 2023}]
            3. ['function:compound', 'linearRegression:other_date', {rate: 0.1, start_date: 2023, other_date: 2022}]

        - function:discount
            1. ['function:discount', 1, {rate: 0.1, start_date: 2023}]
                {
                    2022: 1,
                    2023: 1,
                    2024: 0.91,
                    2025: 0.83,
                    ...
                }
            2. ['function:compound', 'linearRegression', {rate: 0.1, start_date: 2023}]
            3. ['function:compound', 'linearRegression:start_date', {rate: 0.1, start_date: 2023}]
            3. ['function:compound', 'linearRegression:other_date', {rate: 0.1, start_date: 2023, other_date: 2022}]

        - function:growth_rate
            1. ['function:growth_rate', 'adjDividend'],
*/
DateValueData.prototype.computeMutable = function(properties) {
    if(this.formula()){
        var forecast_years = 0;
        if(properties && 'forecast_years' in properties){
            forecast_years = properties.forecast_years;
        }
        else if(properties  && 'forecast_end_date' in properties){
            forecast_years = properties.forecast_end_date - this.lastDate();
        }

        var raw_compute_order = [];
        // need to call getOrderedKeyList to order the keys inside formula by name
        var ordered_formula_keys = getOrderedKeyList(this.formula());
        for(var ordered_formula_keys_index=0; ordered_formula_keys_index<ordered_formula_keys.length; ordered_formula_keys_index++){
            var key = ordered_formula_keys[ordered_formula_keys_index];
            var keys = [key];
            var break_loop = false;
            for(var i in this.formula()[key]){
                if(i % 2 == 1 || break_loop){continue;}
                if( typeof(this.formula()[key][i]) == 'string' ){
                    // could be a function
                    if(stringIncludesToken(this.formula()[key][i], 'function:')){
                        // this.appendComponent(key, this.formula()[key][i].replace('function:', ''));
                        this.functions().push(key);
                        break_loop = true;
                        continue;
                    }
                    keys.unshift(this.formula()[key][i]);
                }
            }
            if(!break_loop){
                // If the keys are not those of a function
                // Functions are processed separately
                raw_compute_order.push(keys);
            }
        }
        // if there are any functions, let's see the compute order for them
        if(this.functions().length){
            var functions_compute_order = [];
            // let's check if the input of a function is another's output
            for(var function_index=0; function_index<this.functions().length; function_index++){
                var key = this.functions()[function_index];
                var function_keys = [key];
                // get the function name, this is the first argument of the formula
                // ['function:discount', 'freeCashFlow', {'rate': '_discountRate', 'start_date': nextYear}]
                var function_name = this.formula()[key][0].replace('function:', '');
                if(!this.formula()[key].length || this.formula()[key].length == 1 ){
                    throwError("Computed function "+function_name+" requires at least 1 parameter [function, parameter]");
                    return;
                }
                var first_key = this.formula()[key][1];
                var parameters = {};
                if(this.formula()[key].length == 3){
                    parameters = this.formula()[key][2];
                }
                // treat each function independently
                switch (function_name) {
                    // function:discount logic
                    case 'discount':
                    case 'compound':
                        // {'rate': '_discountRate', 'start_date': nextYear}
                        // 'rate' is a required parameter
                        function_keys.unshift(first_key);
                        unshiftFunctionParameterKey('rate', parameters, function_keys);
                        break;

                    case 'linear_regression':
                        // linear_regression: { slope: <constant>, start_date: <constant> } (Required)
                        // Do not add any other keys. Otherwise will result in conflicting order.
                        // 'linearRegressionRevenue': ['function:linear_regression', 'revenue', {...}],
                        // 'revenue': ['linearRegressionRevenue:0'],
                        break;

                    case 'log_n':
                    case 'nth_root':
                    case 'nth_power':
                    case 'exponential':
                        // nth_power == exponential
                        // {'n': <key>}
                        function_keys.unshift(first_key);
                        unshiftFunctionParameterKey('n', parameters, function_keys);
                        break;

                    case 'growth_rate':
                    case 'square_root':
                    case 'average':
                        // growth_rate: { period: <constant> } (Optional)
                        // square_root: no parameters
                        // average: { period: <constant> } (Optional)
                        // no parameters required
                        function_keys.unshift(first_key);
                        break;

                    case 'sum':
                    case 'add':
                    case 'maximum':
                    case 'max':
                    case 'minimum':
                    case 'min':
                    case 'multiply':
                        // These functions do not have a first_key
                        parameters = first_key;
                        unshiftFunctionParameterKey('keys', parameters, function_keys);
                        break;

                    default:
                        throwError("'function:" + function_name + "' is not a valid function. Please check the documentation for available functions.")
                }
                raw_compute_order.push(function_keys);
            }
        }

        this.processRawComputeOrder(raw_compute_order);

        // Up until now, we've decided the compute_order
        // Now we need to compute the keys one by one
        var forecast_start_date = this.lastDate();  // Do not use lastDate('maximum')
        var start_date = this.firstDate();
        for(var year = start_date + 1; year <= forecast_start_date + forecast_years; year++){
            for(var compute_index=0; compute_index < this.compute_order().length; compute_index++){
                var key = this.compute_order()[compute_index];
                for(var formula_key in this.formula()){
                    // make sure that keys match
                    // if(formula_key != key){continue;}
                    // check if date already exists in this.data[key]
                    if( formula_key != key ||
                        (this.exists(key) && (this.get(key).dateExists(year) || this.get(key).firstDate() >= year))){
                        // do nothing
                    }
                    else{
                        // check if the key refers to a function
                        var result = null;
                        // check if the key is in forecasted URL hash parameters
                        if( this.editable() && year >= this.editable().start_date && this.editable().keys.includes(key) ){
                            var edited_value = this.getValueFromEditableKey(year, key);
                            if(isValidNumber(edited_value)){
                                // the value has been edited and added to the URL hash parameters
                                result = edited_value;
                            }
                        }
                        if(result === null){
                            if(this.functions().includes(key)){
                                // execute the function
                                // get the function name, this is the first argument of the formula
                                // ['function:discount', 'freeCashFlow', {'rate': '_discountRate', 'start_date': nextYear}]
                                var function_name = this.formula()[key][0].replace('function:', '');
                                // get the first arg
                                // Example: this.formula()[key][1] = 'linearRegressionEps:start_date'
                                var data_key = this.formula()[key][1];
                                var data_index = '';
                                // data_key could be a number
                                if(typeof(data_key) == 'string'){
                                    if(stringIncludesToken(data_key, ':')){
                                        // data_index = start_date
                                        data_index = data_key.split(':')[1];
                                        // data_key = linearRegressionEps
                                        data_key = data_key.split(':')[0];
                                    }
                                    var data_list = this.data[data_key];
                                }
                                // Warning! Do not use continue in switch.
                                // It causes the sequencer to loop forever.
                                var _continue = false;
                                // treat each function independently
                                switch (function_name) {
                                    // function:discount logic
                                    case 'discount':
                                    case 'compound':
                                        // properties for discount and compound functions
                                        var properties = {
                                            action: function_name,
                                            year: year,
                                            forecast_start_date: forecast_start_date,
                                            key: key,
                                            data_index: data_index,
                                            data_key: data_key,
                                            result: 0,
                                        };
                                        // 'discountedFreeCashFlow': ['function:discount', 'freeCashFlow', {rate: '_revenueGrowthRate', start_date: nextYear}],
                                        // from forecast_start_date, it is calculated on every iteration, as opposed to linear_regression
                                        // 'eps': ['function:compound', 'linearRegressionEps:start_date', {rate: getAssumption('_HIGH_GROWTH_RATE'), start_date: nextYear}],
                                        // 'linearRegressionEps:start_date' uses ONLY the value of linearRegressionEps at start_date
                                        // as opposed to 'linearRegressionEps:0' or 'linearRegressionEps'
                                        if(!this.functionDiscountCompound(properties)){
                                            // if year < forecast_start_date
                                            _continue = true;
                                            break;
                                        }
                                        // else store the result
                                        result = properties.result;
                                        break;

                                    case 'linear_regression':
                                        // this.formula()[key] =
                                        // ['function:linear_regression', 'revenue', {'slope': getAssumption('REVENUE_REGRESSION_SLOPE'), 'start_date': nextYear - getAssumption('HISTORIC_YEARS')}]
                                        // set inputs
                                        // linear_regression function requires to be at year == forecast_start_date
                                        // if the key exists, then it has already been calculated, no need to do anything
                                        if(year < forecast_start_date || this.exists(key)){
                                            _continue = true;
                                            break;
                                        }
                                        var inputStartDate = this.firstDate();
                                        var inputSlope = 1;
                                        if(this.formula()[key].length == 3){
                                            var parameters = this.formula()[key][2];
                                            if('start_date' in parameters){
                                                inputStartDate = parameters.start_date;
                                            }
                                            if('slope' in parameters){
                                                inputSlope = parameters.slope;
                                            }
                                        }
                                        this.data[key] = this.get(data_key).sublist(inputStartDate).removeDate('LTM').linearRegression({'forecast_years': forecast_years, 'slope': inputSlope});
                                        // skip adding any values and continue
                                        _continue = true;
                                        break;

                                    case 'growth_rate':
                                        // no parameters required
                                        // need at least 1 year in advance
                                        if(year <= start_date){
                                            _continue = true;
                                            break;
                                        }
                                        var previous_value = this.get(data_key).valueAtDate(year - 1);
                                        var current_value = this.get(data_key).valueAtDate(year);
                                        if(previous_value){
                                            result = (current_value - previous_value) / previous_value;
                                        }
                                        break;

                                    case 'square_root':
                                        // no parameters required
                                        if(year < start_date){
                                            _continue = true;
                                            break;
                                        }
                                        // Math.sqrt should return 0 for negative numbers
                                        var value = this.get(data_key).valueAtDate(year);
                                        if(value < 0){
                                            result = 0;
                                        }
                                        else{
                                            result = Math.sqrt(value);
                                        }
                                        break;

                                    case 'log_n':
                                    case 'nth_root':
                                    case 'nth_power':
                                    case 'exponential':
                                        if(year < start_date){
                                            _continue = true;
                                            break;
                                        }
                                        var n = 2;
                                        if(this.formula()[key].length == 3){
                                            var parameters = this.formula()[key][2];
                                            if('n' in parameters){
                                                n = parameters.n;
                                            }
                                        }
                                        if(function_name == 'nth_root'){
                                            // Math.pow should return 0 for negative numbers
                                            var value = this.get(data_key).valueAtDate(year);
                                            if(value < 0 && n > 1){
                                                result = 0;
                                            }
                                            else{
                                                result = Math.pow(value, 1/n);
                                            }
                                        }
                                        else if(function_name == 'nth_power' || function_name == 'exponential'){
                                            // Math.pow should return 0 for negative numbers
                                            var value = this.get(data_key).valueAtDate(year);
                                            if(value < 0 && n < 1){
                                                result = 0;
                                            }
                                            else{
                                                result = Math.pow(value, n);
                                            }
                                        }
                                        else if(function_name == 'log_n'){
                                            result = Math.log(this.get(data_key).valueAtDate(year)) / Math.log(n);
                                        }
                                        break;

                                    case 'sum':
                                    case 'add':
                                    case 'maximum':
                                    case 'max':
                                    case 'minimum':
                                    case 'min':
                                    case 'multiply':
                                        if(year < start_date){
                                            _continue = true;
                                            break;
                                        }
                                        var keys = [];
                                        // This function does not have a first_key
                                        if(this.formula()[key].length == 2){
                                            var parameters = this.formula()[key][1];
                                            if('keys' in parameters){
                                                keys = parameters.keys;
                                            }
                                        }

                                        result = null;
                                        // Add up all keys
                                        for(var i=0; i<keys.length; i++){
                                            if(isValidNumber(keys[i])){
                                                // Case when key is a constant number
                                                // keys = [123, ...]
                                                result = function_specific_operation(function_name, result, Number(keys[i]));
                                            }
                                            else if(typeof(keys[i]) == 'string'){
                                                // Case when key is just a string
                                                // keys = ['key1', ...]
                                                result = function_specific_operation(function_name, result, this.getValueAtYear(keys[i], year));
                                            }
                                            else if(typeof(keys[i]) == 'object'){
                                                // Case when key is just an object
                                                // keys = [['key1', '*', 'key2'], ...]
                                                // keys = [['key1', '*', 2], ...]
                                                if(keys[i].length == 3){
                                                    var key1 = keys[i][0];
                                                    var operator = keys[i][1];
                                                    var key2 = keys[i][2];
                                                    if(!isValidNumber(key1)){
                                                        key1 = this.getValueAtYear(key1, year);
                                                    }
                                                    if(!isValidNumber(key2)){
                                                        key2 = this.getValueAtYear(key2, year);
                                                    }
                                                    // Perform the operation
                                                    if(isValidNumber(key1) && isValidNumber(key2)){
                                                        result = function_specific_operation(function_name, result, operation(key1, operator, key2));
                                                    }
                                                }
                                            }
                                        }
                                        break;

                                    case 'average':
                                        var period = 2;
                                        if(this.formula()[key].length == 3){
                                            var parameters = this.formula()[key][2];
                                            if('period' in parameters){
                                                period = parameters.period;
                                            }
                                        }
                                        // We need at least 'period' years ahead of the start date
                                        if(year < start_date + period){
                                            _continue = true;
                                            break;
                                        }
                                        result = 0;
                                        // Average from year - period to year
                                        if(this.exists(data_key)){
                                            result = this.get(data_key).sublist(year - period + 1, year).average();
                                        }
                                        break;
                                }
                                if(_continue){
                                    continue;
                                }
                                this.append({
                                    key: key,
                                    item: new DateValueList(year, result),
                                });
                                continue;
                            }
                            // the resulting value (number) to append to the key
                            // if the key is not in forecasted URL hash parameters
                            var values_list = [];
                            var operator = '';
                            for(var i=0; i<this.formula()[key].length; i++){
                                if(i % 2 == 1){operator=this.formula()[key][i];continue;}
                                if( typeof(this.formula()[key][i]) == 'string' ){
                                    values_list.push(this.getValueAtYear(this.formula()[key][i], year));
                                }
                                else if(isValidNumber(this.formula()[key][i])){
                                    values_list.push(this.formula()[key][i]);
                                }
                            }
                            if(values_list.length == 2){
                                if(isValidNumber(values_list[0]) && isValidNumber(values_list[1])){
                                    result = operation(values_list[0], operator, values_list[1]);
                                }
                                // append the result to the key at date:year
                                // if year already exists in DateValueList object, then it will not be appended
                            }
                            else if(values_list.length == 1){
                                var result = values_list[0];
                            }
                        }
                        this.append({
                            key: key,
                            item: new DateValueList(year, result),
                        });
                    }
                }
            }
        }

        // special case for LTM column (mostly copy paste from above)
        if(this.ltmColumnExists()){
            // we will be using forecast_start_date as previous year of ltm
            var ltm = 'LTM';
            for(var compute_index=0; compute_index<this.compute_order().length; compute_index++){
                var key = this.compute_order()[compute_index];
                for(var formula_key in this.formula()){
                    // make sure that keys match
                    if(formula_key != key){continue;}
                    // check if date and value already exist in this.data[key]
                    if( this.exists(key) && this.get(key).dateExists(ltm)){continue;}

                    var result = null;
                    if(this.functions().includes(key)){
                        // get the function name, this is the first argument of the formula
                        // ['function:discount', 'freeCashFlow', {'rate': '_discountRate', 'start_date': nextYear}]
                        var function_name = this.formula()[key][0].replace('function:', '');
                        // get the first arg
                        var data_key = this.formula()[key][1];
                        var data_list = this.data[data_key];
                        // treat each function independently
                        switch (function_name) {
                            case 'discount':
                            case 'compound':
                            case 'linear_regression':
                                // Copy paste latest year into LTM
                                result = this.get(key).valueAtDate(forecast_start_date);
                                break;

                            case 'average':
                                var period = 2;
                                if(this.formula()[key].length == 3){
                                    var parameters = this.formula()[key][2];
                                    if('period' in parameters){
                                        period = parameters.period;
                                    }
                                }
                                // Average from year - period to year
                                if(this.exists(data_key)){
                                    result = this.get(data_key).sublist(forecast_start_date - period + 2).average();
                                }
                                break;

                            case 'growth_rate':
                                var ltm_value = this.get(data_key).valueAtDate(ltm);
                                var previous_value = this.get(data_key).valueAtDate(forecast_start_date);
                                if(isValidNumber(ltm_value) && isValidNumber(previous_value)){
                                    result = (ltm_value - previous_value) / previous_value;
                                }
                                break;

                            case 'square_root':
                                var value = this.get(data_key).valueAtDate(ltm);
                                if(value < 0){
                                    result = 0;
                                }
                                else{
                                    result = Math.sqrt(value);
                                }
                                break;

                            case 'log_n':
                            case 'nth_root':
                            case 'nth_power':
                            case 'exponential':
                                var n = 2;
                                if(this.formula()[key].length == 3){
                                    var parameters = this.formula()[key][2];
                                    if('n' in parameters){
                                        n = parameters.n;
                                    }
                                }
                                if(function_name == 'nth_root'){
                                    var value = this.get(data_key).valueAtDate(ltm);
                                    if(value < 0 && n > 1){
                                        result = 0;
                                    }
                                    else{
                                        result = Math.pow(value, 1/n);
                                    }
                                }
                                else if(function_name == 'nth_power' || function_name == 'exponential'){
                                    var value = this.get(data_key).valueAtDate(ltm);
                                    if(value < 0 && n < 1){
                                        result = 0;
                                    }
                                    else{
                                        result = Math.pow(value, n);
                                    }
                                }
                                else if(function_name == 'log_n'){
                                    result = Math.log(this.get(data_key).valueAtDate(ltm)) / Math.log(n);
                                }
                                break;

                            case 'sum':
                            case 'add':
                            case 'maximum':
                            case 'max':
                            case 'minimum':
                            case 'min':
                            case 'multiply':
                                var keys = [];
                                // This function does not have a first_key
                                if(this.formula()[key].length == 2){
                                    var parameters = this.formula()[key][1];
                                    if('keys' in parameters){
                                        keys = parameters.keys;
                                    }
                                }

                                result = null;
                                // Remove duplicate code
                                for(var i=0; i<keys.length; i++){
                                    if(isValidNumber(keys[i])){
                                        // Case when key is a constant number
                                        // keys = [123, ...]
                                        result = function_specific_operation(function_name, result, Number(keys[i]));
                                    }
                                    else if(typeof(keys[i]) == 'string'){
                                        // Case when key is just a string
                                        // keys = ['key1', ...]
                                        result = function_specific_operation(function_name, result, this.getValueAtYear(keys[i], ltm, forecast_start_date));
                                    }
                                    else if(typeof(keys[i]) == 'object'){
                                        // Case when key is just an object
                                        // keys = [['key1', '*', 'key2'], ...]
                                        // keys = [['key1', '*', 2], ...]
                                        if(keys[i].length == 3){
                                            var key1 = keys[i][0];
                                            var operator = keys[i][1];
                                            var key2 = keys[i][2];
                                            if(!isValidNumber(key1)){
                                                key1 = this.getValueAtYear(key1, ltm, forecast_start_date);
                                            }
                                            if(!isValidNumber(key2)){
                                                key2 = this.getValueAtYear(key2, ltm, forecast_start_date);
                                            }
                                            // Perform the operation
                                            if(isValidNumber(key1) && isValidNumber(key2)){
                                                result = function_specific_operation(function_name, result, operation(key1, operator, key2));
                                            }
                                        }
                                    }
                                }
                                break;
                        }
                        this.append({
                            key: key,
                            item: newDateValueItem(ltm, result),
                        });
                        continue;
                    }
                    var values_list = [];
                    var operator = '';
                    for(var i=0; i<this.formula()[key].length; i++){
                        if(i % 2 == 1){operator=this.formula()[key][i];continue;}
                        if( typeof(this.formula()[key][i]) == 'string' ){
                            values_list.push(this.getValueAtYear(this.formula()[key][i], ltm, forecast_start_date));
                        }
                        else if(isValidNumber(this.formula()[key][i])){
                            values_list.push(this.formula()[key][i]);
                        }
                    }
                    if(values_list.length == 2){
                        if(isValidNumber(values_list[0]) && isValidNumber(values_list[1])){
                            result = operation(values_list[0], operator, values_list[1]);
                        }
                    }
                    else if(values_list.length == 1){
                        result = values_list[0];
                    }
                    // append the result to the key at date:ltm
                    // if ltm already exists in DateValueList object, then it will not be appended
                    this.append({
                        key: key,
                        item: new DateValueList(ltm, result),
                    });
                }
            }
        }

        return this;
    }
};

DateValueData.prototype.setEditable = function(input_parameters, object) {
    if(typeof(input_parameters) != 'string'){
        throwError("Function setEditable requires first parameter to be '_edit()'. Example: object.setEditable(_edit(), {...});")
    }
    this.computed.edited_parameters = input_parameters;
    if(object){
        if(!('start_date' in object)){
            throwError("Function setEditable requires 'start_date' property. Please define it using {'start_date': ...}.");
        }
        if(!('keys' in object)){
            throwError("Function setEditable requires 'keys' property. Please define it using {'keys': [...]}.");
        }
        this.computed.editable = object;
    }
    return this;
}

// Go through the url parameters and see if any !eps_2024=3.5
// if it was found, return the value
// else return null
// edited_parameters == window.location.hash
DateValueData.prototype.getValueFromEditableKey = function(date, key) {
    var edited_parameters = this.computed.edited_parameters;
    var token = key + "_" + String(date);
    if (edited_parameters && stringIncludesToken(edited_parameters, token)){
        // var index_of_token = location.hash.indexOf(token);
        // var remaining_string = location.hash.slice(index_of_token);
        var value = edited_parameters.slice(edited_parameters.indexOf(token)).split('&')[0].split('=')[1];
        if(isValidNumber(value)){
            value = Number(value);
            if(isRate(token)){
                value = toN(value);
            }
            else{
                var number_format = getNumberFormatFromHash(edited_parameters);
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

// #!number_format=M
function getNumberFormatFromHash(edited_parameters){
    var result = null;
    if(edited_parameters && stringIncludesToken(edited_parameters, 'number_format')){
        // get the value of number_format
        result = edited_parameters.slice(edited_parameters.indexOf('number_format')).split('&')[0].split('=')[1];
    }
    return result;
}

/*
object = {
            key: 'netIncome',
            item: DateValueItem
        }
*/
DateValueData.prototype.append = function(object) {
    if(!'key' in object){
        throwError("'key' property is missing from append function. Please make sure to specify the key to append to.");
    }
    if(!'item' in object){
        throwError("'item' property is missing from append function. Please make sure to specify what item to append.");
    }
    if(!'key' in object || !'item' in object){
        return;
    }
    var key = object.key;
    var item = object.item;
    if(!(key in this.data)){
        this.data[key] = new DateValueList();
    }
    this.get(key).append(item);
}

DateValueData.prototype.getList = function(key) {
    if(key in this.data){
        return this.data[key].getList();
    }
    else{
        throwError("Key '"+key+"' was not found. Please check the spelling of your key.");
        return [];
    }
}

DateValueData.prototype.exists = function(key) {
    if(key in this.data && this.data[key].exists()){
        return true;
    }
    return false;
}

// Fills the values for all years that are missing from some keys as 0
DateValueData.prototype.fillEmpty = function() {
    var first_date = this.firstDate();
    var last_date = this.lastDate('maximum');
    for(var key in this.data){
        var dateValueList = this.get(key);
        if(dateValueList.firstDate() != first_date || dateValueList.lastDate() != last_date){
            // fill missing values with 0
            dateValueList.listFill({
                fill_ltm: this.ltmColumnExists(), // true only if 'LTM' is found in any of this.data keys
                start_date: first_date,
                last_date: last_date,
                value: 0,
            });
        }
    }
    return this;
}

DateValueData.prototype.startAt = function(start_date) {
    // create a clone as to not modify the passed this object
    var clone = this.clone();
    for(var key in clone.data){
        // mutable because we've already cloned all data, we don't want to waste memory
        clone.data[key] = clone.data[key].sublist(start_date);
    }
    return clone;
}

DateValueData.prototype.renderTable = function(object) {
    /*
        object = {
            start_date: nextYear - INPUT.HISTORIC_YEARS,
            keys: ['netIncome', 'totalStockholdersEquity', '_returnOnEquity', 'dividendsPaidToCommon',
                     '_payoutRatio', 'weightedAverageShsOut', 'eps', 'adjDividend', 'bookValue'],
            rows: ['Net income', 'Total Equity', '{%} Return on equity', 'Dividends paid',
                  '{%} Payout ratio', 'Shares outstanding', '{PerShare} EPS',
                  '{PerShare} Dividends', '{PerShare} Book Value'],
            'properties': {
                'title': 'Historical Data',
                'currency': currency,
                'number_format': 'M',
                'display_averages': true,
                'column_order': 'descending'
            }
        }
    */
    // before calling renderTable(), let's setup the data and columns
    var data = [];
    var columns = [];
    if(object && this.data){
        var this_obj = this;
        if(object.start_date){
            this_obj = this.get({start_date: object.start_date});
            columns = this_obj.columns(object.start_date);
        }
        else{
            columns = this_obj.columns();
        }

        // object can have either rows + keys OR a data property (data: {'Title 1': 'key1'})
        if(object.hasOwnProperty('data')){
            // If object has data, transform it into rows + keys properties
            object.rows = [];
            object.keys = [];
            for(var title in object.data){
                object.rows.push(title);
                object.keys.push(object.data[title]);
            }
        }

        if(object.hasOwnProperty('keys')){
            // append each key's DateValueList list to the data object
            for(var i=0; i<object.keys.length; i++){
                var key = object.keys[i];
                data.push(this_obj.getList(key));
            }
        }
    }
    renderTable({
        data: data,
        row_headers: object.rows,
        column_headers: columns,
        properties: object.properties
    });
};

DateValueData.prototype.renderChart = function(object) {
    /*
        object = {
          start_date: nextYear - INPUT.HISTORIC_YEARS,
          keys: ['eps', 'bookValue', 'adjDividend', 'retainedEarnings'],
          properties: {
            title: 'Historical and computed data',
            currency: currency,
      	    number_format: 'M',
      	    disabled_keys: ['retainedEarnings', 'bookValue'],
          }
        }
      }
    */
    var title = "My Chart";
    var subtitle = "In ";
    var number_format = '';
    // charts do not support showing LTM
    var selected_data = this.get(object).removeDateMutable('LTM').fillEmpty();
    if(object.properties){
        if('number_format' in object.properties){
            number_format = object.properties.number_format;
            if(object.properties.number_format == 'M'){
                subtitle += 'Millions';
                selected_data = selected_data.toM();
            }
            else if(object.properties.number_format == 'K'){
                subtitle += 'Thousands';
                selected_data = selected_data.toK();
            }
        }
        if('currency' in object.properties){
            if(subtitle != 'In '){
                subtitle += ' of ';
            }
            subtitle += object.properties.currency;
        }
        if('title' in object.properties){
            title = object.properties.title;
        }
        addProperties(object);
    }
    if(subtitle == 'In '){
        subtitle = '';
    }
    // equivalent to forecasted points
    var editable_points = {};
    var historical_points = {};
    if(this.editable()){
        // see which keys are editable and add them to y_forecasted
        for(var i=0; i<this.editable().keys.length; i++){
            var key = this.editable().keys[i];
            var start_date = this.editable().start_date;
            editable_points[key] = selected_data.data[key].sublist(start_date);
            historical_points[key] = selected_data.data[key].sublist(0, start_date - 1);
        }
    }
    // chartFill(selected_data.data);
    for (var key in selected_data.data) {
        // check if the property/key is defined in the object itself, not in parent
        if (key in historical_points) {
            chartFillHistorical(historical_points[key], key);
        }
        else{
            chartFillHistorical(selected_data.data[key], key);
        }
    }
    for(var key in editable_points){
        chartFillEditable(editable_points[key], key);
    }
    renderChart({
        'title': title,
        'subtitle': subtitle,
        'number_format': number_format,
    });
};

/*
    * DateValueList class.
    *
    * @constructor
    * 0 args - empty list
    * 1 arg  - passed list or DateValueList object
    * 2 args - get list from report (income, balance, cash flows, dividends reports) or create by 'date' and 'value'
*/

function DateValueList() {
    this.list = [];
    if(arguments.length == 1){
        if(isDateValueList(arguments[0])){
            this.list = arguments[0].getList();
        }
        else{
            // List was passed
            this.list = arguments[0];
        }
    }
    else if(arguments.length == 2){
        if(isValidNumber(arguments[1])){
            this.list = newDateValueItem(arguments[0], arguments[1]);
        }
        else if(typeof(arguments[1]) == 'string' && arguments[1] != ''){
            // Report was passed reportKeyToTableRow(income_report, 'revenue')
            this.list = reportKeyToTableRow(arguments[0], arguments[1]);
        }
        else{
            // console_warning(arguments[1] + ' is not a valid number at ' + arguments[0]);
            this.list = newDateValueItem(arguments[0], null);
        }
    }
    // For data in percentages, like treasury
    else if(arguments.length == 3 && arguments[2] == '%'){
        if(isValidNumber(arguments[1])){
            this.list = newDateValueItem(toN(arguments[0]), arguments[1]);
        }
        else if(typeof(arguments[1]) == 'string' && arguments[1] != ''){
            // Report was passed reportKeyToTableRow(income_report, 'revenue')
            this.list = toN(reportKeyToTableRow(arguments[0], arguments[1]));
        }
    }
}

DateValueList.prototype.getList = function() {
    return this.list;
};

/*
    object = {
        start_date: first_date,
        last_date: last_date,
        value: 0,
    }
*/
DateValueList.prototype.listFill = function(object) {
    for(var date=object.start_date; date<=object.last_date; date++){
        if(!this.dateExists(date)){
            this.append(newDateValueItem(date, object.value));
        }
    }
    if(object.fill_ltm && !this.dateExists('LTM')){
        this.append(newDateValueItem('LTM', object.value));
    }
    return this;
};

DateValueList.prototype.values = function() {
    return reportKeyToList(this.list, 'value');
};

DateValueList.prototype.valueAtDate = function(date) {
    if(this.list.length){
        return getValueFromYearValue(this.list, date);
    }
    // throwError("Could not get the value at date:");
    return null;
};

DateValueList.prototype.dateExists = function(date) {
    // case when date is 'ltm' or 'LTM'
    if(typeof(date) == 'string'){
        date = date.toUpperCase();
    }
    for(var i=0; i<this.list.length; i++){
        var bool = false;
        if(typeof(this.list[i].year) == 'string'){
            bool = this.list[i].year.toUpperCase() == date;
        }
        else{
            bool = this.list[i].year == date;
        }
        if(bool){
            return true;
        }
    }
    return false;
};

DateValueList.prototype.exists = function() {
    if(this.list.length){
        return true;
    }
    return false;
};

DateValueList.prototype.clone = function() {
    return new DateValueList(rawClone(this.list));
};

DateValueList.prototype.average = function() {
    return getListAverage(reportKeyToList(this.getList(), 'value'));
};

DateValueList.prototype.minimum = function() {
    return minimum(reportKeyToList(this.getList(), 'value'));
};

DateValueList.prototype.maximum = function() {
    return maximum(reportKeyToList(this.getList(), 'value'));
};

DateValueList.prototype.sum = function() {
    return getArraySum(reportKeyToList(this.getList(), 'value'));
};

// Mutating
DateValueList.prototype.toM = function() {
    for(var i=0; i<this.list.length; i++){
        this.list[i].value = roundValue(toM(this.list[i].value));
    }
    return this;
}

// Mutating
DateValueList.prototype.toK = function() {
    for(var i=0; i<this.list.length; i++){
        this.list[i].value = roundValue(toK(this.list[i].value));
    }
    return this;
}

DateValueList.prototype.sublist = function(start_date, end_date) {
    var return_obj = [];
    for(var i=0; i<this.list.length; i++){
        if(!end_date){
            // Case when only start_date is specified
            if( start_date && (this.list[i].year >= start_date || this.list[i].year == 'LTM') ){
                return_obj.push(this.list[i]);
            }
        }
        else{
            // We have both start_date and end_date
            if( start_date && this.list[i].year >= start_date && this.list[i].year <= end_date ){
                // If year is between start_date and end_date
                return_obj.push(this.list[i]);
            }
            else if(start_date == 0 && end_date && this.list[i].year <= end_date){
                // start_date == 0 and we only have end_date
                return_obj.push(this.list[i]);
            }
        }
    }
    return new DateValueList(rawClone(return_obj));
};

DateValueList.prototype.linearRegression = function(object) {
    // object = {'forecast_years': 5, 'slope': 1}
    var return_obj = new DateValueList();
    var forecast_years = 0;
    var slope = 1;
    if('forecast_years' in object){
        forecast_years = object.forecast_years;
    }
    if('slope' in object){
        slope = object.slope;
    }
    var values_list = this.values();
    var values_count = values_list.length;

    var xSum=0, ySum=0, xxSum=0, xySum=0;
    for(var i = 1; i <= values_count; i++){
        xSum += i;
        ySum += values_list[i-1];
        xxSum += i * i;
        xySum += values_list[i-1] * (i);
    }
    // Calculate slope and intercept
    slope = -slope * (values_count * xySum - xSum * ySum) / (values_count * xxSum - xSum * xSum);
    var intercept = (ySum / values_count) - (slope * xSum) / values_count;

    var start_date = this.firstDate();
    for(var i = 1; i <= values_count + forecast_years; i++){
        return_obj.list = return_obj.list.concat(newDateValueItem(start_date + i - 1, i * slope + intercept));
    }
    return return_obj;
};

DateValueList.prototype.getDates = function() {
    return this.dates();
};

DateValueList.prototype.dates = function() {
    return sortColumns(reportKeyToList(this.list, 'year'));
};

DateValueList.prototype.lastDate = function(except_ltm) {
    if(this.list.length){
        if(except_ltm == 'except_ltm'){
            return highestValue(reportKeyToList(this.list, 'year'));
        }
        return (sortColumns(reportKeyToList(this.list, 'year'), 'descending'))[0];
    }
    return null;
};

DateValueList.prototype.lastValue = function() {
    return getValueFromYearValue(this.list, this.lastDate());
};

DateValueList.prototype.last = function() {
    var lastDate = this.lastDate();
    for(var i=0; i<this.list.length; i++){
        if(this.list[i].year == lastDate){
            return new DateValueList( [this.list[i]] );
        }
    }
    return this;
};

DateValueList.prototype.replaceLastDate = function(new_date) {
    var lastDate = this.lastDate();
    for(var i=0; i<this.list.length; i++){
        if(this.list[i].year == lastDate){
            this.list[i].year = new_date;
            break;
        }
    }
    return this;
};

DateValueList.prototype.firstDate = function() {
    if(this.list.length){
        var report_key_to_list = reportKeyToList(this.list, 'year');
        var sorted_cols = sortColumns(report_key_to_list, 'ascending');
        return sorted_cols[0];
    }
    return null;
};

DateValueList.prototype.firstValue = function() {
    return getValueFromYearValue(this.list, this.firstDate());
};

DateValueList.prototype.first = function() {
    var firstDate = this.firstDate();
    for(var i=0; i<this.list.length; i++){
        if(this.list[i].year == firstDate){
            return new DateValueList( [this.list[i]] );
        }
    }
    return this;
};

DateValueList.prototype.removeDate = function(year) {
    var clone = this.clone();
    for(var i=0; i<clone.list.length; i++){
        if(clone.list[i].year == year){
            clone.list.splice(i, 1);
        }
    }
    return clone;
};

DateValueList.prototype.removeDateMutable = function(year) {
    for(var i=0; i<this.getList().length; i++){
        if(this.getList()[i].year == year){
            this.getList().splice(i, 1);
        }
    }
    return this.getList();
};

DateValueList.prototype.operation = function(type, other_list) {
    if(isDateValueList(other_list)){
        return new DateValueList(operation(this.list, type, other_list.getList()));
    }
    return new DateValueList(operation(this.list, type, other_list));
};

DateValueList.prototype.append = function(object) {
    if(!this.getList()){
        console.error('Error when trying to append DateValueList! DateValueList is empty, please initialize it first.');
        return;
    }
    if(isValidNumber(object)){
        this.list = this.list.concat(newDateValueItem(this.lastDate('except_ltm') + 1, object));
        return this;
    }
    else if(isObjectInYearValueFormat(object)){
        object = new DateValueList(object);
    }
    if(isDateValueList(object)){
        var object_dates = object.getDates();
        var common_elements = listIntersection(this.getDates(), object_dates);
        // in order to append, there shouldn't be common dates
        if(!common_elements.length){
            this.list = this.list.concat(object.getList());
        }
        else{
            for(var i=0; i<object.list.length; i++){
                if(!common_elements.includes(object.list[i].year)){
                    this.list.push(object.list[i]);
                }
            }
            console.log('When trying to append DateValueList, common elements were found.');
        }
        return this;
    }
    // object should be a list
    if(object.length){
        for(var i=0; i<object.length; i++){
            this.append(object[i]);
        }
    }
    return this;
};

function newDateValueItem(date, value){
    return [{
        'year': date,
        'value': value
    }];
}

function isDateValueList(object){
    if(object && 'list' in object){
        return true;
    }
    return false;
}

function isDateValueData(object){
    if(object && 'data' in object){
        return true;
    }
    return false;
}
/*
    End of DateValueList Class
*/
/*
function listDifference(list1, list2){
    return list1.filter(x => !list2.includes(x));
}
*/

function listDifference(list1, list2) {
    var difference = [];
    // Add elements from list1 that are not in list2
    for (var i = 0; i < list1.length; i++) {
        var value = list1[i];
        if (list2.indexOf(value) === -1) {
            difference.push(value);
        }
    }
    // Add elements from list2 that are not in list1
    for (var i = 0; i < list2.length; i++) {
        var value = list2[i];
        if (list1.indexOf(value) === -1) {
            difference.push(value);
        }
    }
    return difference;
}

function listOrderedDifference(list1, list2) {
    var difference = [];
    // Add elements from list1 that are not in list2
    for (var i = 0; i < list1.length; i++) {
        var value = list1[i];
        if (list2.indexOf(value) === -1) {
            difference.push(value);
        }
    }
    return difference;
}


function listIntersection(list1, list2){
    var common_elements = [];
    for (var i = 0; i < list1.length; i++) {
        var value = list1[i];
        if (list2.indexOf(value) !== -1) {
            common_elements.push(value);
        }
    }
    return common_elements;
}

function getSign(value){
    if(isValidNumber(value)){
        if(typeof(value) != 'number'){
            value = Number(value);
        }
        if (value > 0){return 1;}
        else if (value < 0){return -1;}
    }
    return 0;
}

function roundValueItem(value, type){
    if(!isValidNumber(value)){
        return '';
    }
    if(typeof(value) != 'number'){
        value = Number(value);
    }
    var sign = getSign(value);
    value = Math.abs(value);
    var roundDigits = 1; // no decimals
    if(type == '%'){
        // rates should always be in rate format: 5.123 instead of number 0.05123
        // rates get rounded to 2 decimals
        roundDigits = 100;
    }
    else{
        // if value < 10, then round to 3 decimals
        // else if value < 100, then round to 2 decimals
        // for value > 100, round it to no decimals
        if(value < 10){
            roundDigits = 1000; // 3 decimals
        }
        else if(value < 100){
            roundDigits = 100; // 2 decimals
        }
        else if(value < 1000){
            roundDigits = 10; // 1 decimal
        }
    }
    return Math.round(sign * value * roundDigits)/roundDigits;
}

function roundValue(obj, type){
    if(obj == null){
        return null;
    }
    if(typeof(obj) == 'object'){
        var newObj = [];
        // case it is a list
        for(var i=0; i<obj.length; i++){
            newObj.push(roundValueItem(obj[i], type));
        }
        return newObj;
    }
    return roundValueItem(obj, type);
}

function toM(obj){
    return toFormat(obj, 1/1000000);
}

function toK(obj){
    return toFormat(obj, 1/1000);
}

// to percentage or rate
function toR(obj){
    return numberToRate(obj);
}
function toP(obj){
    return numberToRate(obj);
}

function numberToRate(obj){
    return toFormat(obj, 100);
}

function toN(obj){
    return rateToNumber(obj);
}

function rateToNumber(obj){
    return toFormat(obj, 1/100);
}

function toFormat(obj, format){
    if(obj == null){
        return null;
    }
    if(isValidNumber(format)){
        if(typeof(obj) == 'object' && isObjectInYearValueFormat(obj)){
            for(var i=0; i<obj.length; i++){
                obj[i].value *= format;
            }
        }
        else if(typeof(obj) == 'object' && obj !== null){
            // if obj is a list
            if(obj.length){
                for(var i=0; i<obj.length; i++){
                    if(isValidNumber(obj[i])){
                        obj[i] *= format;
                    }
                }
            }
            else if('y' in obj){
                obj.y *= format;
            }
            return obj;
        }
        else if(isValidNumber(obj)){
            // obj is a number
            return obj * format;
        }
    }
    else if(format == 'M'){
        return toM(obj);
    }
    else if(format == 'K'){
        return toK(obj);
    }
    else if(format == 'R'){
        return toR(obj);
    }
    else if(format == 'N'){
        return toN(obj);
    }
    return obj;
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

function getMarginList(list1, list2){
  var marginList = [];
  try{
    for(var i = 0; i < list1.length && i < list2.length; i++){
      marginList.push(list1[i]/list2[i]);
    }
    return marginList;
  } catch(error){
    print(error, 'Error in getMarginList');
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

// converts a report to a list of values
// for more accurate data, use reportKeyToTableRow
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

// converts a report to a list of objects
// accepted reports: Income Statements, Balance Sheets, Cash Flow Statements, Annual Dividends
// {'value': ..., 'year': ... }
function reportKeyToTableRow(report, key){
    var returnList = [];
    for(var i=0; i<report.length; i++){
        var year;
        if ('date' in report[i]){
            year = getYear(report[i].date);
            if(!year){
                year = report[i].date;
            }
        }
        else if('year' in report[i]){
            year = getYear(report[i].year);
            if(!year){
                year = report[i].year;
            }
        }
        returnList.push(
            {
                'year': year,
                'value': report[i][key],
            }
        );
    }
    return returnList;
}

function newArrayFill(length, fillObject, operation){
    var newArray = [];
    if(operation){
        // either increment or decrement
        newArray.push(fillObject);
    }
    for(var i=0; i<length; i++){
        if(typeof(fillObject) == 'object'){
            newArray.push(JSON.parse(JSON.stringify(fillObject)));
        }
        else if(typeof(fillObject) == 'number'){
            if(operation == 'increment'){
                newArray.push(fillObject + (i + 1));
            }
            else if(operation == 'decrement'){
                newArray.push(fillObject - (i + 1));
            }
            else{
                newArray.push(fillObject);
            }
        }
        else{
            // probably string
            newArray.push(fillObject);
        }
    }
    return newArray;
}

function arrayValuesToRates(array){
  var newArray = [];
  for(var i=0;i<array.length;i++){
    if( !isValidNumber(array[i]) ){newArray.push('');}
    else{
        newArray.push(roundValue(toP(array[i]), '%')+'%');
    }
  }
  return newArray;
}

function isValidNumber(object){
    var castedObject = Number(object);
    if( !(String(object) === '') && !isNaN(castedObject) && isFinite(castedObject) && object != null ){
      return true;
    }
    return false;
}

function getArraySum(array){
    var sum = 0;
    for(var i=0;i<array.length;i++){
        if(isValidNumber(array[i])){
            sum += Number(array[i]);
        }
    }
    return sum;
}

function getListAverage(list){
    var listLength = 0;
    for(var i=0; i<list.length; i++){
        // if an item is blank, then don't count it ''
        if( isValidNumber(list[i]) ){listLength++;}
    }
    if(listLength == 0){return null;}
    return getArraySum(list)/listLength;
}

// Gets the growth rates from a list of values
// The mode formats the output to either 'percentage' 12.34% or normal 0.1234
function getGrowthRateList(values, mode){
  var growthRateList = [];
  if(values.length > 1){
    /*
    if(mode == 'percentage'){growthRateList.push('');}
    else{growthRateList.push(0);}
    */
    growthRateList.push('');

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


function isObjectInYearValueFormat(object){
    // object is in format year value
    /*
    [
        {'value': 123, 'year': 2021},
        {'value': 234, 'year': 2020},
    ]
    */
    try {
        for(var i in object){
            if(!(typeof(object[i]) == 'object' && 'year' in object[i] && 'value' in object[i])){
                return false;
            }
        }
        return true;
    } catch (error) {
        return false;
    }
}


// retrieve the highest value in a list or yearsValue object
function highestValue(object){
    var list_obj = object;
    if(isObjectInYearValueFormat(object)){
        list_obj = reportKeyToList(object, 'value');
    }
    if(list_obj.length){
        var highestValue = list_obj[0];
        for(var i = 1; i<list_obj.length; i++){
            if( isValidNumber(highestValue) && isValidNumber(list_obj[i]) && Number(list_obj[i]) > Number(highestValue)
                || !isValidNumber(highestValue) ){
                highestValue = Number(list_obj[i]);
            }
        }
        if(isValidNumber(highestValue)){
            return highestValue;
        }
    }
    return 0;
}

// if object is in ValueYear format, then cast it to a list of values
// else if it is a list, return
function yearValueFormatToList(object){
    // format year value
    /*
    [
        {'value': 123, 'year': 2021},
        {'value': 234, 'year': 2020},
    ]
    */
    if(isObjectInYearValueFormat(object)){
        // We should return the first item as the most recent year
        var yearsList = reportKeyToList(object, 'year');
        var highestYear = highestValue(yearsList);
        // Let's check if the years are consistent.
        // Are they ascending or descending or inconsistent
        var yearsListState = '';
        for(var i = 1; i<yearsList.length; i++){
            if(isValidNumber(yearsList[i]) && isValidNumber(yearsList[i-1])){
                var yearsDiff = Number(yearsList[i]) - Number(yearsList[i-1]);
                if(!yearsListState){
                    if(yearsDiff == 1){
                        yearsListState = 'ascending';
                    }
                    else if(yearsDiff == -1){
                        yearsListState = 'descending';
                    }
                    else{
                        yearsListState = 'inconsistent';
                        break;
                    }
                }
                else if(
                    (yearsListState == 'ascending' && yearsDiff == -1) ||
                    (yearsListState == 'descending' && yearsDiff == 1) ||
                    (yearsDiff != -1 && yearsDiff != 1)
                ){
                    yearsListState = 'inconsistent';
                    break;
                }
            }
        }
        /*
        if('LTM' in yearsList){
            if(yearsList.indexOf('LTM') < yearsList.indexOf(highestYear)){
                return reportKeyToList(object, 'value');
            }
        }*/
        if(yearsListState == 'ascending'){
            return reportKeyToList(object, 'value').reverse();
        }
        else if(yearsListState == 'descending'){
            return reportKeyToList(object, 'value');
        }
        // inconsistent
        return reportKeyToList(object, 'value');
    }
    return object;
}


function getValueFromYearValue(object, year){
    if(typeof(year) == 'string'){
        year = year.toUpperCase();
    }
    for(var object_index=0; object_index<object.length; object_index++){
        var object_date = object[object_index].year;
        if(typeof(object_date) == 'string'){
            object_date = object_date.toUpperCase();
        }
        if(object_date == year){
            return object[object_index].value;
        }
    }
    //throwError("Year "+year+"wasn't found in object:");
    // console.warn("Year " + year + "was not found.");
    return null;
}

function yearFromYearValueExists(object, year){
    for(var object_index=0; object_index<object.length; object_index++){
        if(object[object_index].year == year){
            return true;
        }
    }
    return false;
}

// Gets the growth rates from an object in YearValue format or a list format
function getGrowthRates(object){
    if(isObjectInYearValueFormat(object)){
        var return_obj = [];
        var yearsList = reportKeyToList(object, 'year');
        var highestYear = highestValue(yearsList);
        if(yearFromYearValueExists(object, 'LTM') && highestYear){
            var ltm_val = getValueFromYearValue(object, 'LTM');
            var year_val = getValueFromYearValue(object, highestYear);
            return_obj.push({
                'year': 'LTM',
                'value': (ltm_val - year_val) / year_val,
            });
        }
        for(var i = 1; i<object.length; i++){
            var val1 = getValueFromYearValue(object, highestYear - i + 1);
            var val2 = getValueFromYearValue(object, highestYear - i);
            if(val2){
                return_obj.push({
                    'year': highestYear - i + 1,
                    'value': (val1 - val2) / val2,
                });
            }
            else{
                return_obj.push({
                    'year': highestYear - i + 1,
                    'value': '',
                });
            }
        }
        return return_obj;
    }
    return getGrowthRateList(yearValueFormatToList(object));
}

function sortColumns(columns, order){
    if(order == 'descending'){
        columns.sort().reverse();
    }
    else{
        columns.sort();
    }
    return columns;
}

function newYearValueFill(value, columns){
    var return_obj = [];
    for(var i=0; i<columns.length; i++){
        return_obj.push({
            'year': columns[i],
            'value': value,
        });
    }
}

function removeYear(object, year){
    var return_obj = [];
    for(var i=0; i<object.length; i++){
        if(object[i].year != year){
            return_obj.push(object[i]);
        }
    }
    return return_obj;
}

function function_specific_operation(function_name, result, value){
    if(result == null){
        return value;
    }

	if(function_name == 'multiply') {
		return result * value;
	}
	else if(function_name == 'add' || function_name == 'sum'){
		return result + value;
	}
	else if(function_name == 'minimum' || function_name == 'min'){
		    return Math.min(result, value);
    }
    else if(function_name == 'maximum' || function_name == 'max'){
        return Math.max(result, value);
    }
}

function operation(object1, operation_type, object2){
    var return_obj = [];
    if(object1 == null || object2 == null){return null;}
    // if objects are just numbers
    if(isValidNumber(object1) && isValidNumber(object2)){
        object1 = Number(object1);
        object2 = Number(object2);
        if(operation_type == '+'){
            return object1 + object2;
        }
        else if(operation_type == '-'){
            return object1 - object2;
        }
        else if(operation_type == '/'){
            return object1 / object2;
        }
        else if(operation_type == '*'){
            return object1 * object2;
        }
        else if(operation_type == '^'){
            return Math.pow(object1, object2);
        }
        else if(operation_type == '<'){
            // 1 if true, 0 if false
            return Number(object1 < object2);
        }
        else if(operation_type == '<='){
            return Number(object1 <= object2);
        }
        else if(operation_type == '>'){
            return Number(object1 > object2);
        }
        else if(operation_type == '>='){
            return Number(object1 >= object2);
        }
        else if(operation_type == '=='){
            return Number(object1 == object2);
        }
        return null;
    }
    // if objects are both in YearValue format
    if(isObjectInYearValueFormat(object1) && isObjectInYearValueFormat(object2)){
        var object1_yearList = reportKeyToList(object1, 'year');
        var object2_yearList = reportKeyToList(object2, 'year');
        // check for both year lists to be consistent
        if(object1_yearList.length >= object2_yearList.length){
            for(var i=0; i<object1_yearList.length; i++){
                var object1_val = getValueFromYearValue(object1, object1_yearList[i]);
                var object2_val = getValueFromYearValue(object2, object1_yearList[i]);
                return_obj.push({
                    'year': object1_yearList[i],
                    'value': operation(object1_val, operation_type, object2_val),
                });
            }
        }
        else{
            for(var i=0; i<object2_yearList.length; i++){
                var object1_val = getValueFromYearValue(object1, object2_yearList[i]);
                var object2_val = getValueFromYearValue(object2, object2_yearList[i]);
                return_obj.push({
                    'year': object2_yearList[i],
                    'value': operation(object1_val, operation_type, object2_val),
                });
            }
        }
        return return_obj;
    }
    else if(isValidNumber(object1) && isObjectInYearValueFormat(object2)){
        return operation(newYearValueFill(Number(object1), reportKeyToList(object2, 'year')), operation, object2);
    }
    else if(isObjectInYearValueFormat(object1) && isValidNumber(object2)){
        return operation(object1, operation, newYearValueFill(Number(object2), reportKeyToList(object1, 'year')));
    }
    // if objects are lists
    var object1_list = yearValueFormatToList(object1);
    var object2_list = yearValueFormatToList(object2);
    if(object1_list.length >= object2_list.length){
        for(var i=0; i<object2_list.length; i++){
            return_obj.push(operation(object1_list[i], operation_type, object2_list[i]));
        }
    }
    else{
        for(var i=0; i<object1_list.length; i++){
            return_obj.push(operation(object1_list[i], operation_type, object2_list[i]));
        }
    }
    return return_obj;
}

function getYear(obj){
  var return_obj = [];
  if(typeof(obj) == 'object' && obj.length >= 1){
    for(i in obj){
        if(obj[i] == 'ltm'){
            return_obj.push('LTM');
        }
        else{
            return_obj.push(parseInt(obj[i]));
        }
    }
  }
  else if(obj){
    if(obj.toLowerCase() == 'ltm'){
        return_obj = 'LTM';
    }
    else{
        return_obj = parseInt(obj);
    }
  }
  return return_obj;
}

function getDataFromResponse(object){
    if(object.length == 3 && object[1] == 'success'){
        if(object[0] && object[0].length == 1){
            return object[0][0];
        }
        return object[0];
    }
    var x = object;
    while(x.length == 1){
        x = x[0];
    }
    return x;
}

function deepCopy(object){
    return JSON.parse(JSON.stringify(getDataFromResponse(object)));
}

function rawClone(object){
    var x = JSON.parse(JSON.stringify(object));
    return x;
}

function checkIncomeFlowsIntegrity(income, income_ltm, flows, flows_ltm){
    if(income[0]['date'] != flows[0]['date']){
        // First item
        // Try to append the LTM to the report that is missing it
        if(parseInt(income[0]['date']) > parseInt(flows[0]['date'])){
            // Trying to add the LTM to the flows report
            if(parseInt(income[0]['date']) == parseInt(flows_ltm['date'])){
                flows.unshift(flows_ltm);
                warning("Cash flow statements are missing the last item from " + income[0]['date'] + ", but the LTM was added in its place. Please let us know by submitting a Ticket.");
            }
        }
        else if(parseInt(flows[0]['date']) == parseInt(income_ltm['date'])){
            // Trying to add the LTM to the income report
            income.unshift(income_ltm);
            warning("Income statements are missing the last item from " + flows[0]['date'] + ", but the LTM was added in its place. Please let us know by submitting a Ticket.");
        }
    }
}

function minimum(object){
    if(object.length > 1){
        var min = Number(object[0]);
        for(var i=0; i<object.length; i++){
            if(isValidNumber(object[i])){
                if(Number(object[i]) < min){
                    min = Number(object[i]);
                }
            }
        }
        return min;
    }
}

function maximum(object){
    if(object.length > 1){
        var max = Number(object[0]);
        for(var i=0; i<object.length; i++){
            if(isValidNumber(object[i])){
                if(Number(object[i]) > max){
                    max = Number(object[i]);
                }
            }
        }
        return max;
    }
}

function absolute(object){
    if(isValidNumber(object)){
        object = Number(object);
        if(object < 0){
            return -object;
        }
        return object;
    }
    if(object && object.length > 1){
        var return_list = [];
        for(var i=0; i<object.length; i++){
            return_list.push(absolute(object[i]));
        }
        return return_list;
    }
}

/*
Use a polyfill to add support for the includes method in older browsers.
*/
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/) {
    'use strict';
    var O = Object(this);
    var len = parseInt(O.length, 10) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1], 10) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}

function isRate(key){
    if(key.charAt(0) == '_'){
        return true;
    }
    return false;
}

// Warning! Do not use .includes(':')
// Error: TypeError: 'undefined' is not a function (tried calling property 'includes' of 'String')
function stringIncludesToken(string, token){
    if(string.indexOf(token) > -1){
        return true;
    }
    return false;
}
