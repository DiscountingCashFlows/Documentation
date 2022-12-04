// +------------------------------------------------------------+
//   Model: Two-Stage Excess Return Model 								
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: '',
                   HIGH_GROWTH_YEARS: 5,
		   _STABLE_RETURN_ON_EQUITY: '',
                   _STABLE_GROWTH_IN_PERPETUITY: '',
                   _MARKET_PREMIUM: 5.5,
                   _RISK_FREE_RATE: '',
                   BETA: '',
                   HISTORIC_YEARS: 10,
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
    setInputDefault('_STABLE_GROWTH_IN_PERPETUITY', treasury.year10);
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
	setInputDefault('_STABLE_RETURN_ON_EQUITY', 100 * averageReturnOnEquity);
    // ---------------- END OF SETTING ASSUMPTIONS SECTION ---------------- 
    // ---------------- CHARTS SECTION ---------------- 
    var y_eps = [];
    var y_book_value = [];
    var y_dividends = [];
    var y_retained_earnings = [];
    var historicPayoutRatio = [];
    var historicCostOfEquity = newArrayFill(INPUT.HISTORIC_YEARS, (100 * INPUT._DISCOUNT_RATE).toFixed(2) + '%');
    var historicReturnOnEquity = [];
    var len = INPUT.HISTORIC_YEARS;
    if(income.length - 1 < len){
      	len = income.length - 1;
    }
    // Historic data
    for(var i = len; i >= 0; i--){
      y_eps.push(income[i]['eps']);
      y_book_value.push(balance[i].totalStockholdersEquity / income[i].weightedAverageShsOut);
      y_dividends.push(Math.abs(dividends[i + 1].adjDividend));
      y_retained_earnings.push(y_eps[y_eps.length-1] - y_dividends[y_dividends.length-1]);
      historicPayoutRatio.push(y_dividends[y_dividends.length-1] / y_eps[y_eps.length-1]);
      historicReturnOnEquity.push(y_eps[y_eps.length-1] / y_book_value[y_book_value.length-1]);
    }
    fillHistoricUsingList(y_book_value, 'endingBookValue', parseInt(income_ltm['date']));
    
    // Projected data
    var forecastedReturnOnEquity = newArrayFill(INPUT.HIGH_GROWTH_YEARS, INPUT._STABLE_RETURN_ON_EQUITY);
    var forecastedCostOfEquity = newArrayFill(INPUT.HIGH_GROWTH_YEARS, INPUT._DISCOUNT_RATE);
    var forecastedPayoutRatio = [];
    
    var futureEquityCost = [];
    var futureExcessReturns = [];
    var futureDiscountedExcessReturns = [];
    
    var stablePayoutRatio = 1 - (INPUT._STABLE_GROWTH_IN_PERPETUITY / INPUT._STABLE_RETURN_ON_EQUITY);
    for(var i=0; i<INPUT.HIGH_GROWTH_YEARS; i++){
      forecastedPayoutRatio.push(stablePayoutRatio + ( (INPUT.HIGH_GROWTH_YEARS - i - 1) * (averagePayoutRatio - stablePayoutRatio) / (INPUT.HIGH_GROWTH_YEARS - 1) ));
    }
    forecastedPayoutRatio = forecast(forecastedPayoutRatio, '_payoutRatio', 'chartHidden');
    forecastedReturnOnEquity = forecast(forecastedReturnOnEquity, '_returnOnEquity', 'chartHidden');
    forecastedCostOfEquity = forecast(forecastedCostOfEquity, '_costOfEquity', 'chartHidden');
    for(var i=0; i<INPUT.HIGH_GROWTH_YEARS; i++){
      y_eps.push(y_book_value[y_book_value.length-1] * forecastedReturnOnEquity[i]);
      y_dividends.push(y_eps[y_eps.length-1] * forecastedPayoutRatio[i]);
      y_retained_earnings.push(y_eps[y_eps.length-1] - y_dividends[y_dividends.length-1]);
      
      futureEquityCost.push(y_book_value[y_book_value.length-1] * forecastedCostOfEquity[i]);
      futureExcessReturns.push(y_eps[y_eps.length-1] - futureEquityCost[i]);
      futureDiscountedExcessReturns.push(futureExcessReturns[futureExcessReturns.length-1]/Math.pow(1+forecastedCostOfEquity[i], i+1));
      y_book_value.push(y_book_value[y_book_value.length-1] + y_eps[y_eps.length-1] - y_dividends[y_dividends.length-1]);
    }
    fillHistoricUsingList(y_book_value, 'endingBookValue', parseInt(income_ltm['date']) + INPUT.HIGH_GROWTH_YEARS);
    fillHistoricUsingList(y_eps, 'eps');
    fillHistoricUsingList(y_dividends, 'dividends');
	// ---------------- END OF CHARTS SECTION ---------------- 
    // ---------------- VALUES OF INTEREST SECTION ----------------
    // Terminal year value calculation
    var terminalBookValue = y_book_value[y_book_value.length-1];
    var terminalEPS = terminalBookValue * INPUT._STABLE_RETURN_ON_EQUITY;
    var terminalExcessReturn = terminalBookValue * (INPUT._STABLE_RETURN_ON_EQUITY - INPUT._DISCOUNT_RATE);
    if(terminalExcessReturn <= 0){
        warning("Excess return is negative. The Cost of Equity (Discount Rate) is higher than the Return on Equity.");
    }
    var sumOfDiscountedExcessReturns = getArraySum(futureDiscountedExcessReturns);
    var terminalValueOfExcessReturns = terminalExcessReturn / (INPUT._DISCOUNT_RATE - INPUT._STABLE_GROWTH_IN_PERPETUITY);
    var discountedTerminalValue = (terminalValueOfExcessReturns) / Math.pow(1 + INPUT._DISCOUNT_RATE, INPUT.HIGH_GROWTH_YEARS);
    var ltmBookValueOfEquity=balance_quarterly.totalStockholdersEquity / income_ltm.weightedAverageShsOut;
	
    valuePerShare = ltmBookValueOfEquity + discountedTerminalValue + sumOfDiscountedExcessReturns;
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(ccyRate*valuePerShare, currencyProfile)){
      return;
    }
    
    _SetEstimatedValue(ccyRate*valuePerShare, currencyProfile);
    print(valuePerShare, 'Estimated Value', '#', currency);
    print(ltmBookValueOfEquity, "Book value of equity invested", '#', currency);
    print(sumOfDiscountedExcessReturns, "Sum of discounted excess returns in Growth Stage", '#', currency);
    print(discountedTerminalValue, "Discounted excess return in terminal stage", '#', currency);
    print(terminalValueOfExcessReturns, "Excess Returns in the Terminal Stage", '#', currency);
    print(INPUT._DISCOUNT_RATE, "Terminal Cost of Equity (the discount rate)", '%');
    print(terminalExcessReturn, "Terminal year's excess return", '#', currency);
    print(INPUT._STABLE_RETURN_ON_EQUITY, "Return on equity in terminal stage", '%');
    print(INPUT._STABLE_GROWTH_IN_PERPETUITY, 'Stable growth in perpetuity', '%');
    print(averageReturnOnEquity, "Average historic Return on Equity", '%');
    print(averagePayoutRatio, "Average historic Payout Ratio", '%');
    print(stablePayoutRatio, "Payout Ratio in stable stage", '%');
    print(treasury.year10/100, 'Yield of the U.S. 10 Year Treasury Bond', '%');
    // ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    // ---------------- TABLES SECTION ---------------- 
    var lastYearDate = parseInt(income[0]['date']);
    // Future data
    var rows = ['Beginning book value of equity per share', 'EPS available to common shareholders', 'Return on equity', 'Dividend per common share', 'Payout Ratio',
                'Retained earnings', 'Equity cost per share', 'Cost of equity', 'Excess return per share', 'Discounted excess return per share'];
    var columns = [];
    var data = [y_book_value.slice(len), 
                y_eps.slice(len+1).concat([terminalEPS]), 
                arrayValuesToRates(forecastedReturnOnEquity.concat([INPUT._STABLE_RETURN_ON_EQUITY])), 
                y_dividends.slice(len+1).concat([terminalEPS*stablePayoutRatio]),
                arrayValuesToRates(forecastedPayoutRatio.concat([stablePayoutRatio])),
                y_retained_earnings.slice(len+1).concat([terminalEPS*(1-stablePayoutRatio)]), 
                futureEquityCost.concat([terminalBookValue*INPUT._DISCOUNT_RATE]), 
                arrayValuesToRates(forecastedCostOfEquity.concat([INPUT._DISCOUNT_RATE])), 
                futureExcessReturns.concat([terminalExcessReturn]),
                futureDiscountedExcessReturns.concat([discountedTerminalValue])
               ];
    for(var i=1; i <= INPUT.HIGH_GROWTH_YEARS; i++){
      columns.push(lastYearDate + i);
    }
    columns.push('Terminal Year');
    contextItem = {name:INPUT.HIGH_GROWTH_YEARS + ' Years of high growth and the terminal stage (' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
    // Historic table
    if( prefDividendsRatio > sensitivity ){
      var rows = ['Net income','Calculated preferred stock dividends & premiums','Net income available to common shareholders', 
                  'Total Equity', 'Return on equity', 'Dividends paid to common shareholders',
                  'Payout ratio (common)', 'Common shares outstanding', 'EPS available to Common shareholders',
                  'Dividends per common share', 'Ending Book Value per share'];
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
      for(var i=1; i<=maxLength; i++){
        var i_inverse = maxLength - i;
        var col = 0;
        columns.push(lastYearDate - i_inverse);
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
        data[col++].push( toM(dividends[i_inverse + 1].adjDividend * income[i_inverse].weightedAverageShsOut).toFixed(2) ); 
        // Common stock payout Ratio
        data[col++].push( (100 * payoutRatioList[i_inverse + 1]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // EPS
        data[col++].push( income[i_inverse].eps );
        // Dividends per Share
        data[col++].push( dividends[i_inverse + 1].adjDividend );
        // Book Value
        data[col++].push( (balance[i_inverse].totalStockholdersEquity / income[i_inverse].weightedAverageShsOut).toFixed(2) );
      }
      // append LTM values
      columns.push('LTM');
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
      data[col++].push( ltmBookValueOfEquity );
    }
    else{
      var rows = ['Net income', 'Total Equity', 'Return on equity', 'Dividends paid', 
                  'Payout ratio', 'Shares outstanding', 'EPS (Earnings per share)',
                  'Dividends per share', 'Ending Book Value per share'];
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
      for(var i=1; i<=maxLength; i++){
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
        data[col++].push( toM(dividends[i_inverse + 1].adjDividend * income[i_inverse].weightedAverageShsOut) ); 
        // All dividends payout Ratio
        data[col++].push( (100 * payoutRatioList[i_inverse + 1]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // EPS
        data[col++].push( income[i_inverse].eps );
        // Dividends per Share
        data[col++].push( dividends[i_inverse + 1].adjDividend );
        // Book Value
        data[col++].push( (balance[i_inverse].totalStockholdersEquity / income[i_inverse].weightedAverageShsOut).toFixed(2) );
      }
      // append LTM values
      columns.push('LTM');
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
      data[col++].push( ltmBookValueOfEquity );
    }
    contextItem = {name:'Historic data (Mil. ' + currency + ' except per share items)', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    // ---------------- END OF TABLES SECTION ---------------- 
	renderChart('Historic and forecasted data in ' + currency);
    monitor(context);
});

Description(`
	<h5>Two-Stage Excess Return Model</h5>
	<p>Used to estimate the value of companies based on two stages of growth. An initial period of high growth, represented by [Sum of discounted excess returns in Growth Stage], followed by a period of stable growth, represented by [Discounted excess return in terminal stage]. Excess Return models are better suited to calculate the intrinsic value of a financial company than an enterprise valuation model (such as the Discounted Free Cash Flow Model).</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/excess-return-models.md#two-stage-excess-return-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
