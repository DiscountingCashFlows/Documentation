// +------------------------------------------------------------+
//   Model: Simple Excess Return Model 								
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: '',
                   _RETURN_ON_EQUITY: '',
                   _GROWTH_IN_PERPETUITY: '',
                   _MARKET_PREMIUM: 5.5,
                   _RISK_FREE_RATE: '',
                   BETA: '',
                   HISTORIC_YEARS: 10
                   }); 

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement(),
  get_balance_sheet_statement_quarterly(),
  get_profile(),
  get_dividends_annual(),
  get_treasury(),
  get_fx()).done(
  function(_income, _income_ltm, _balance, _balance_quarterly, _profile, _dividends, _treasury, _fx){
    // edit projectionYears if you need a longer projection period
    var projectionYears = 5;
    // context is a must-have. it is used to display charts, tables and values
    var context = [];
    var income = deepCopy(_income);
    var income_ltm = deepCopy(_income_ltm);
    var balance = deepCopy(_balance);
    var balance_quarterly = deepCopy(_balance_quarterly);
    var profile = deepCopy(_profile);
    var dividends = deepCopy(_dividends);
    var treasury = deepCopy(_treasury);
    var fx = deepCopy(_fx);
    
    // Get the shift between dividends and income statements
    var indexShift = Number(dividends[1].year) - Number(income[0].calendarYear);
    
    income = income.slice(0, INPUT.HISTORIC_YEARS);
    balance = balance.slice(0, INPUT.HISTORIC_YEARS);
    balance_quarterly = balance_quarterly[0]; // last quarter
    dividends = dividends.slice(0, INPUT.HISTORIC_YEARS + 1);
    // if the company doesn't pay dividends, make an empty dividend list with 0 values
    if(dividends.length < INPUT.HISTORIC_YEARS + 1){
      dividends = dividends.concat(newArrayFill(INPUT.HISTORIC_YEARS + 1 - dividends.length, {'year': 0, 'adjDividend': 0}));
    }
    if(!income_ltm.revenue){income_ltm = income[0];}
    var valuePerShare = 0;
    var currency = income_ltm['convertedCurrency'];
    var currencyProfile = profile['convertedCurrency'];
    var ccyRate = currencyRate(fx,  currency, currencyProfile);
    if(ccyRate != 1){
    	// adjust dividends for fx
      	for(var i=0; i<dividends.length; i++){
          	dividends[i].adjDividend = dividends[i].adjDividend / ccyRate;
        }
    }
    
    // ---------------- SETTING ASSUMPTIONS SECTION ---------------- 
	setInputDefault('_RISK_FREE_RATE', treasury.year10);
    setInputDefault('_GROWTH_IN_PERPETUITY', treasury.year10);
    setInputDefault('BETA', profile['beta']);
    setInputDefault('_DISCOUNT_RATE', 100*(INPUT._RISK_FREE_RATE + INPUT.BETA*INPUT._MARKET_PREMIUM));
	
    var sensitivity = 0.01;
    var prefDividendsRatio = Math.abs((income[0].eps * income[0].weightedAverageShsOut - income[0].netIncome) / income[0].netIncome);
    var commonIncome = 0;
    
	var returnOnEquityList = [];
	var averageReturnOnEquity = 0;
    
    var payoutRatioList = [];
    var averagePayoutRatio = 0;
    var payoutRatio = 0;
    
    if( prefDividendsRatio > sensitivity ){
      commonIncome = income_ltm.eps * income_ltm.weightedAverageShsOut;
      payoutRatio = dividends[0].adjDividend / income_ltm.eps;
    }
    else{
      commonIncome = income_ltm.netIncome;
      payoutRatio = dividends[0].adjDividend / income_ltm.eps;
    }
    payoutRatioList.push(payoutRatio);
    averagePayoutRatio += payoutRatio;
    
	var returnOnEquity = commonIncome / balance[0].totalStockholdersEquity;
	returnOnEquityList.push(returnOnEquity);
	averageReturnOnEquity += returnOnEquity;
    // Calculate Average Return on Equity
    for(var i=0; i<income.length; i++){
      if( prefDividendsRatio > sensitivity ){
        commonIncome = income[i].eps * income[i].weightedAverageShsOut;
      }
      else{
        commonIncome = income[i].netIncome;
      }
      payoutRatio = dividends[i + 1].adjDividend / income[i].eps;
      if(commonIncome <= 0){
        payoutRatio = 0;
      }
      payoutRatioList.push(payoutRatio);
      averagePayoutRatio += payoutRatio;
      if(i<balance.length - 1){
      	returnOnEquity = commonIncome / balance[i + 1].totalStockholdersEquity;
        returnOnEquityList.push(returnOnEquity);
        averageReturnOnEquity += returnOnEquity;
      }
    }
    averagePayoutRatio /= Math.min(income.length, balance.length) + 1;
    averageReturnOnEquity /= Math.min(income.length, balance.length);
    
	setInputDefault('_RETURN_ON_EQUITY', 100 * averageReturnOnEquity);
    // ---------------- END OF SETTING ASSUMPTIONS SECTION ---------------- 
    // ---------------- CHARTS SECTION ---------------- 
    var y_eps = [];
    var y_book_value = [];
    var y_dividends = [];
    var y_retained_earnings = [];
    // The equity cost and excess return are only for projections
    var y_equity_cost = [];
    var y_excess_return = [];
    // Cost of equity will change each year to match the constant roe and excess return's growth in perpetuity rate
    var costOfEquityList = [(100 * INPUT._DISCOUNT_RATE).toFixed(2) + '%'];
    // first year's cost of equity is the discount rate
    var returnOnEquityList = newArrayFill(projectionYears, (100 * INPUT._RETURN_ON_EQUITY).toFixed(2) + '%');
    var len = INPUT.HISTORIC_YEARS;
    if(income.length - 1 < len){
      	len = income.length - 1;
    }
    // Historic data
    for(var i = len - indexShift; i >= 0; i--){
      y_eps.push((income[i]['eps']).toFixed(2));
      y_book_value.push(balance[i].totalStockholdersEquity / income[i].weightedAverageShsOut);
      y_dividends.push(Math.abs(dividends[i + 1 + indexShift].adjDividend));
      y_retained_earnings.push(y_eps[y_eps.length-1] - y_dividends[y_dividends.length-1]);
    }
    if(indexShift > 0){
      y_eps.push((income_ltm.eps).toFixed(2));
      y_book_value.push(balance_quarterly.totalStockholdersEquity / income_ltm.weightedAverageShsOut);
      y_dividends.push(Math.abs(dividends[1].adjDividend)); // last year dividend
      y_retained_earnings.push(y_eps[y_eps.length-1] - y_dividends[y_dividends.length-1]);
    }
    // Projected data
    // Part 1 - The next year
    // The next year's book value is the last year's book value + retained earnings
    y_book_value.push(y_book_value[y_book_value.length - 1] + y_retained_earnings[y_retained_earnings.length-1]);
    // The next year's eps is the roe percentage of next year's book value
    var eps = INPUT._RETURN_ON_EQUITY * y_book_value[y_book_value.length - 1];
    y_eps.push(eps.toFixed(2));
    var stablePayoutRatio = 1 - (INPUT._GROWTH_IN_PERPETUITY / INPUT._RETURN_ON_EQUITY);
    y_dividends.push(eps*stablePayoutRatio);
    y_retained_earnings.push(eps*(1-stablePayoutRatio));
    
    y_equity_cost.push(y_book_value[y_book_value.length-1] * INPUT._DISCOUNT_RATE);
    y_excess_return.push(y_eps[y_eps.length-1] - y_equity_cost[y_equity_cost.length-1]);
    
    // Part 2 - The 2nd year up to projectionYears
    for(var i = 1; i < projectionYears; i++){
      // Step 1 - Calculate the book value and the excess return
      y_book_value.push(y_book_value[y_book_value.length - 1] + y_retained_earnings[y_retained_earnings.length-1]);
      y_excess_return.push(y_excess_return[y_excess_return.length-1] * (1 + INPUT._GROWTH_IN_PERPETUITY));
      // Step 2 - Calculate eps and the equity cost
      var eps = INPUT._RETURN_ON_EQUITY * y_book_value[y_book_value.length - 1]; 
      y_equity_cost.push(eps - y_excess_return[y_excess_return.length-1]);
      y_eps.push(eps.toFixed(2));
      costOfEquityList.push((100 * y_equity_cost[y_equity_cost.length - 1] / y_book_value[y_book_value.length - 1]).toFixed(2) + '%');
      y_dividends.push(eps*stablePayoutRatio);
      y_retained_earnings.push(eps*(1-stablePayoutRatio));
    }
    fillHistoricUsingList(y_eps, 'eps', parseInt(income_ltm['date']) + projectionYears);
    fillHistoricUsingList(y_book_value, 'book value');
    fillHistoricUsingList(y_dividends, 'dividends');
    renderChart('Historic and forecasted data in ' + currency);
	// ---------------- END OF CHARTS SECTION ---------------- 
    // ---------------- VALUES OF INTEREST SECTION ----------------
    // LTM book value
    var bookValue = balance_quarterly.totalStockholdersEquity / income_ltm.weightedAverageShsOut;
    var costOfEquity = INPUT._DISCOUNT_RATE;
	var excessReturns = y_book_value[len + 1] * (INPUT._RETURN_ON_EQUITY - costOfEquity);
    if(excessReturns <= 0){
        warning("Excess return is negative. The Cost of Equity (Discount Rate) is higher than the Return on Equity.");
    }
    var terminalValue = excessReturns / (costOfEquity - INPUT._GROWTH_IN_PERPETUITY);
    valuePerShare = terminalValue + bookValue;
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(ccyRate*valuePerShare, currencyProfile)){
      return;
    }
    
    _SetEstimatedValue(ccyRate*valuePerShare, currencyProfile);

    print(valuePerShare, 'Estimated Value', '#', currency);
    print(bookValue, "Book value of equity invested", '#', currency);
    print(y_book_value[len + 1], "Next year's estimated book value", '#', currency);
    print(terminalValue, "Present value of future excess returns", '#', currency);
    print(excessReturns, "Excess Return per share", '#', currency);
    print(costOfEquity, "Cost of Equity (the discount rate)", '%');
    print(INPUT._RETURN_ON_EQUITY, "Return on equity", '%');
    print(INPUT._GROWTH_IN_PERPETUITY, 'Growth in perpetuity', '%');
    print(averageReturnOnEquity, "Average historic Return on Equity", '%');
    print(averagePayoutRatio, "Average historic Payout Ratio", '%');
    print(stablePayoutRatio, "Payout Ratio used", '%');
    print(treasury.year10/100, 'Risk Free Rate of the 10 Year U.S. Treasury Note', '%');
    // ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    // ---------------- TABLES SECTION ---------------- 
    var lastYearDate = parseInt(income[0]['date']) + indexShift;
    // Future data
    var rows = ['Book value per share', 'EPS available to common shareholders', 'Return on equity', 'Dividend per common share', 
                'Retained earnings', 'Equity cost per share', 'Cost of equity', 'Excess return per share'];
    var columns = [];
    var data = [y_book_value.slice(len+1), y_eps.slice(len+1), returnOnEquityList, y_dividends.slice(len+1), 
                y_retained_earnings.slice(len+1), y_equity_cost, costOfEquityList, y_excess_return];
    for(var i=1; i <= projectionYears; i++){
      columns.push(lastYearDate + i);
    }
    renderTable('5 Years of projected data (' + currency + ')', data, rows, columns);
    
    // Historic table
    if( prefDividendsRatio > sensitivity ){
      var rows = ['Net income','Calculated preferred stock dividends & premiums','Net income available to common shareholders', 
                  'Total Equity', 'Return on equity', 'Dividends paid to common shareholders',
                  'Payout ratio (common)', 'Common shares outstanding', 'EPS available to Common shareholders',
                  'Dividends per common share', 'Book Value per share'];
      var columns = [];
      var data = [];
      for(var i=0; i<rows.length; i++){
          data.push([]);
      }
      var lengths = [income.length, balance.length];
      var maxLength = INPUT.HISTORIC_YEARS;
      for(var i in lengths){
        if(lengths[i] < maxLength){
          maxLength = lengths[i];
        }
      }
      for(var i = 1 + indexShift; i<=maxLength; i++){
        var i_inverse = maxLength - i;
        var col = 0;
        columns.push(lastYearDate - i_inverse - indexShift);
        // Net Income
        data[col++].push( toM(income[i_inverse].netIncome) );
        var preferredStockDividends = income[i_inverse].netIncome - income[i_inverse].eps * income[i_inverse].weightedAverageShsOut;
        if(preferredStockDividends < 0){
          warning("Preferred stock dividends for year " + (lastYearDate - i_inverse) + " are negative! Shares outstanding may not be inline with the ones reported.");
        }
        // Preferred stock dividends
        data[col++].push( toM(preferredStockDividends).toFixed(2) );
        // Net Income available to common shareholders
        data[col++].push( toM(income[i_inverse].eps * income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // Equity
        data[col++].push( toM(balance[i_inverse].totalStockholdersEquity) );
        // Common Return on Equity
        if(i_inverse < balance.length - 1){
        	data[col++].push( (100 * (income[i_inverse].eps * income[i_inverse].weightedAverageShsOut) / balance[i_inverse + 1].totalStockholdersEquity).toFixed(2) + '%' );
        }else{
          	data[col++].push('');
        }
        // Dividends paid to common
        data[col++].push( toM(dividends[i_inverse + 1 + indexShift].adjDividend * income[i_inverse].weightedAverageShsOut).toFixed(2) ); 
        // Common stock payout Ratio
        data[col++].push( (100 * payoutRatioList[i_inverse + 1]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // EPS
        data[col++].push( income[i_inverse].eps );
        // Dividends per Share
        data[col++].push( dividends[i_inverse + 1 + indexShift].adjDividend );
        // Book Value
        data[col++].push( (balance[i_inverse].totalStockholdersEquity / income[i_inverse].weightedAverageShsOut).toFixed(2) );
      }
      for(var i=0; i<indexShift+1; i++){
        // append LTM values
        if(i == indexShift){
          columns.push('LTM');
        }
        else{
          columns.push(lastYearDate + indexShift - i - 1);
        }
        var col = 0;
        // Net Income
        data[col++].push( toM(income_ltm.netIncome) );
        var preferredStockDividends = income_ltm.netIncome - income_ltm.eps * income_ltm.weightedAverageShsOut;
        // Preferred stock dividends
        data[col++].push( toM(preferredStockDividends).toFixed(2) );
        // Net Income available to common shareholders
        data[col++].push( toM(income_ltm.eps * income_ltm.weightedAverageShsOut).toFixed(2) );
        // Equity
        data[col++].push( toM(balance_quarterly.totalStockholdersEquity) );
        // Common Return on Equity
        data[col++].push( (100 * (income_ltm.eps * income_ltm.weightedAverageShsOut) / balance_quarterly.totalStockholdersEquity).toFixed(2) + '%' );
        // Dividends paid to common
        data[col++].push( toM(dividends[0].adjDividend * income_ltm.weightedAverageShsOut).toFixed(2) ); 
        // Common stock payout Ratio
        data[col++].push( (100 * payoutRatioList[0]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income_ltm.weightedAverageShsOut).toFixed(2) );
        // EPS
        data[col++].push( income_ltm.eps );
        // Dividends per Share
        data[col++].push( dividends[0].adjDividend );
        // Book Value
        data[col++].push( balance_quarterly.totalStockholdersEquity / income_ltm.weightedAverageShsOut );
      }
    }
    else{
      var rows = ['Net income', 'Total Equity', 'Return on equity', 'Dividends paid', 
                  'Payout ratio', 'Shares outstanding', 'EPS (Earnings per share)',
                  'Dividends per share', 'Book Value per share'];
      var columns = [];
      var data = [];
      for(var i=0; i<rows.length; i++){
          data.push([]);
      }
      var lengths = [income.length, balance.length];
      var maxLength = INPUT.HISTORIC_YEARS;
      for(var i in lengths){
        if(lengths[i] < maxLength){
          maxLength = lengths[i];
        }
      }
      for(var i=1+indexShift; i<=maxLength; i++){
        var i_inverse = maxLength - i;
        var col = 0;
        columns.push(lastYearDate - i_inverse);
        // Net Income
        data[col++].push( toM(income[i_inverse].netIncome) );
        // Equity
        data[col++].push( toM(balance[i_inverse].totalStockholdersEquity) );
        // Return on Equity
        if(i_inverse < balance.length - 1){
        	data[col++].push( (100 * income[i_inverse].netIncome / balance[i_inverse + 1].totalStockholdersEquity).toFixed(2) + '%' );
        }else{
          	data[col++].push('');
        }
        // Dividends paid
        data[col++].push( toM(dividends[i_inverse + 1 + indexShift].adjDividend * income[i_inverse].weightedAverageShsOut) ); 
        // All dividends payout Ratio
        data[col++].push( (100 * payoutRatioList[i_inverse + 1]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // EPS
        data[col++].push( income[i_inverse].eps );
        // Dividends per Share
        data[col++].push( dividends[i_inverse + 1 + indexShift].adjDividend );
        // Book Value
        data[col++].push( (balance[i_inverse].totalStockholdersEquity / income[i_inverse].weightedAverageShsOut).toFixed(2) );
      }
      for(var i=0; i<indexShift+1; i++){
        // append LTM values
        if(i == indexShift){
          columns.push('LTM');
        }
        else{
          columns.push(lastYearDate + indexShift - i - 1);
        }
        var col = 0;
        // Net Income
        data[col++].push( toM(income_ltm.netIncome) );
        // Equity
        data[col++].push( toM(balance_quarterly.totalStockholdersEquity) );
        // Return on Equity
        data[col++].push( (100 * income_ltm.netIncome / balance_quarterly.totalStockholdersEquity).toFixed(2) + '%' );
        // Dividends paid to common
        data[col++].push( toM(dividends[0].adjDividend * income_ltm.weightedAverageShsOut) ); 
        // All dividends payout Ratio
        data[col++].push( (100 * payoutRatioList[0]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income_ltm.weightedAverageShsOut).toFixed(2) );
        // EPS
        data[col++].push( income_ltm.eps );
        // Dividends per Share
        data[col++].push( dividends[0].adjDividend );
        // Book Value
        data[col++].push( balance_quarterly.totalStockholdersEquity / income_ltm.weightedAverageShsOut );
      }
    }
    renderTable('Historic data (Mil. ' + currency + ' except per share items)', data, rows, columns);
    // ---------------- END OF TABLES SECTION ---------------- 
});

Description(`
	<h5>Simple Excess Return Model</h5>
	<p>Used to estimate the value of companies that have reached maturity and earn stable excess returns with little to no high growth chance. Excess Return models are better suited to calculate the intrinsic value of a financial company than an enterprise valuation model (such as the Discounted Free Cash Flow Model).</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/excess-return-models.md#simple-excess-return-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
