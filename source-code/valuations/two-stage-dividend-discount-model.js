// +------------------------------------------------------------+
//   Model: Two-Stage Dividend Discount Model
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: '',
                   HIGH_GROWTH_YEARS: 5,
                   _HIGH_GROWTH_RATE: '',
                   _HIGH_GROWTH_PAYOUT: '',
                   _STABLE_GROWTH_IN_PERPETUITY: '',
                   _STABLE_PAYOUT: '',
                   BETA:'',
                   _RISK_FREE_RATE: '',
                   _MARKET_PREMIUM: 5.5,
                   HISTORIC_YEARS: ''});  

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement(),
  get_balance_sheet_statement_quarterly(),
  get_cash_flow_statement(),
  get_cash_flow_statement_ltm(),
  get_profile(),
  get_dividends_annual(),
  get_prices_annual(),
  get_treasury(),
  get_fx()).done(
  function(_income, _income_ltm, _balance, _balance_quarterly, _flows, _flows_ltm, _profile, _dividends, _prices, _treasury, _fx){
    // Create deep copies of reports. This section is needed for watchlist compatibility.
    var income = deepCopy(_income);
    var income_ltm = deepCopy(_income_ltm);
    var balance = deepCopy(_balance);
    var balance_quarterly = deepCopy(_balance_quarterly);
    var flows = deepCopy(_flows);
    var flows_ltm = deepCopy(_flows_ltm);
    var profile = deepCopy(_profile);
    var treasury = deepCopy(_treasury);
    var dividends = deepCopy(_dividends);
    var prices = deepCopy(_prices);
    var fx = deepCopy(_fx);
    
    // ---------------- SETTING ASSUMPTIONS SECTION ---------------- 
    // Count the dividends. If there are no dividends, display a warning.
    var dividendsCount = dividends.length - 1;
    if(dividendsCount <= 0){
      error("The company does not currently pay dividends!");
      return;
    }
    // Get the shift between dividends and income statements
    var indexShift = Number(dividends[1].year) - Number(income[0].calendarYear);
    
    if(dividendsCount > 10){
    	setInputDefault('HISTORIC_YEARS', 10);
    }
    else{
      // Set the default historical years to the number of historical dividends
      setInputDefault('HISTORIC_YEARS', dividendsCount);
    }
    // Set the stable growth in perpetuity to the 10 year treasury note
    setInputDefault('_STABLE_GROWTH_IN_PERPETUITY', treasury.year10);
    
    var minLength = Math.min(income.length, balance.length, flows.length, dividendsCount, INPUT.HISTORIC_YEARS);
    
    // Slice the reports to the number of historical years set previously
    flows = flows.slice(0, minLength);
    income = income.slice(0, minLength);
    balance = balance.slice(0, minLength);
    balance_quarterly = balance_quarterly[0]; // last quarter
    dividends = dividends.slice(0, minLength + 1);
	
    // Get the linear regression curve line as a list
    var linEps = linearRegressionGrowthRate(income, 'eps', INPUT.HIGH_GROWTH_YEARS, 1);
    // Get the currencies used in the profile and reports (flows).
    // The profile can have a different currency from the reports.
    var currency = flows[0]['convertedCurrency'];
    var currencyProfile = profile['convertedCurrency'];
    var ccyRate = currencyRate(fx,  currency, currencyProfile);
    if(ccyRate != 1){
    	// adjust dividends for fx
      	for(var i=0; i<dividends.length; i++){
          	dividends[i].adjDividend = dividends[i].adjDividend / ccyRate;
        }
    }
    // Set beta 
    if(profile.beta){
    	setInputDefault('BETA', profile.beta);
    }
    else{
    	setInputDefault('BETA', 1);
    }
    // Risk free rate is the yield of the 10 year treasury note
	setInputDefault('_RISK_FREE_RATE', treasury.year10);
    // Discount Rate is the cost of equity
    setInputDefault('_DISCOUNT_RATE', 100*(INPUT._RISK_FREE_RATE + INPUT.BETA * INPUT._MARKET_PREMIUM));
    
    var sensitivity = 0.01;
    var prefDividendsRatio = Math.abs((income[0].eps * income[0].weightedAverageShsOut - income[0].netIncome) / income[0].netIncome);
    
    var payoutRatioList = [];
    var payoutRatio = 0;
    
    var returnOnEquityList = [];
    var returnOnEquity = 0;
    
    var commonIncome = 0;
    // ------ LTM - Payout Ratio, Return on Equity ------
    if( prefDividendsRatio > sensitivity ){
      commonIncome = income_ltm.eps * income_ltm.weightedAverageShsOut;
    }
    else{
      commonIncome = income_ltm.netIncome;
    }
    payoutRatio = dividends[0].adjDividend / income_ltm.eps;
    if(commonIncome <= 0){
      payoutRatio = 0;
    }
    payoutRatioList.push(payoutRatio);

    returnOnEquity = commonIncome / balance[0].totalStockholdersEquity; // ltm income / last year equity
    returnOnEquityList.push(returnOnEquity);
    // Calculate Average historical Payout Ratio, average Return on Equity
    for(var i=0; i<minLength - indexShift; i++){
      if( prefDividendsRatio > sensitivity ){
        commonIncome = income[i].eps * income[i].weightedAverageShsOut;
      }
      else{
        commonIncome = income[i].netIncome;
      }
      payoutRatio = dividends[i + 1 + indexShift].adjDividend / income[i].eps;
      if(commonIncome <= 0){
        payoutRatio = 0;
      }
      payoutRatioList.push(payoutRatio);
      if(i<minLength - 1){
      	returnOnEquity = commonIncome / balance[i + 1].totalStockholdersEquity;
        returnOnEquityList.push(returnOnEquity);
      }
    }
    var averageReturnOnEquity = getArraySum(returnOnEquityList)/returnOnEquityList.length;
    setInputDefault('_STABLE_PAYOUT', (1-INPUT._STABLE_GROWTH_IN_PERPETUITY/averageReturnOnEquity)*100);
    
    var averagePayoutRatio = getArraySum(payoutRatioList)/payoutRatioList.length;
    // If the payout is higher than 100%, set it equal to the stable payout
    if(averagePayoutRatio > 1){
      setInputDefault('_HIGH_GROWTH_PAYOUT', INPUT._STABLE_PAYOUT*100);
    }
    else{
      setInputDefault('_HIGH_GROWTH_PAYOUT', averagePayoutRatio*100);
    }
    
    // dgr stores the Historical Dividend Growth Rate
    var dgr = averageGrowthRate('adjDividend', dividends.slice(1, dividends.length));
    // Set the eps high growth rate equal to the historical dividend growth rate
    setInputDefault('_HIGH_GROWTH_RATE', 100*dgr);
    // ---------------- END OF SETTING ASSUMPTIONS SECTION ---------------- 
    
    // ---------------- CHARTS SECTION ---------------- 
    // Create Chart for X Years of Previous Dividends 
    var y_historic = [];
    for(var i = minLength; i >= 1; i--){
      y_historic.push(Math.abs(dividends[i].adjDividend));
    }
    // Append estimations
    var lastYearDate = parseInt(income[0]['date']) + indexShift;
    fillHistoricUsingList(y_historic, 'dividends', lastYearDate);
    fillHistoricUsingReport(income, 'eps');
    fillHistoricUsingList(linEps, 'linear regression eps');
    
    var growthDividends = []; // Set the first forecasted dividend to ltm
    var highGrowthEps = []; // Set the first forecasted eps to ltm 
    // Estimate the next dividends
    for(var i=0; i<INPUT.HIGH_GROWTH_YEARS; i++){
      highGrowthEps.push(linEps[income.length] * Math.pow(1 + INPUT._HIGH_GROWTH_RATE, i));
    }
    highGrowthEps = forecast(highGrowthEps, 'eps');
    for(var i=0; i<INPUT.HIGH_GROWTH_YEARS; i++){
      growthDividends.push(highGrowthEps[i] * INPUT._HIGH_GROWTH_PAYOUT);
    }
    growthDividends = forecast(growthDividends, 'dividends');
    renderChart('Historical and Projected Dividends (' + currency + ')');
    // ---------------- END OF CHARTS SECTION ---------------- 
    
    // ---------------- VALUES OF INTEREST SECTION ---------------- 
    // Discount the projected dividends and sum them
    var discountedDividends = [];
    for(var i=0; i<INPUT.HIGH_GROWTH_YEARS; i++){
      var discountedDividend = growthDividends[i]/Math.pow(1 + INPUT._DISCOUNT_RATE, i+1);
      discountedDividends.push(discountedDividend);
    }
    var sumOfDiscountedDividends = getArraySum(discountedDividends);
    // Calculate the discounted terminal value
    var stableEps = highGrowthEps[highGrowthEps.length - 1] * (1 + INPUT._STABLE_GROWTH_IN_PERPETUITY);
    var stableDividend = stableEps * INPUT._STABLE_PAYOUT;
    var terminalValue = stableDividend/(INPUT._DISCOUNT_RATE - INPUT._STABLE_GROWTH_IN_PERPETUITY); 
    var discountedTerminalValue = terminalValue/Math.pow(1+INPUT._DISCOUNT_RATE, INPUT.HIGH_GROWTH_YEARS);
    
    // The final value calculated by the Two-Stage Dividend Discount Model
    var valueOfStock = discountedTerminalValue + sumOfDiscountedDividends;
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(ccyRate*valueOfStock, currencyProfile)){
      return;
    }
    _SetEstimatedValue(ccyRate*valueOfStock, currencyProfile);
    if(ccyRate != 1){
    	print(valueOfStock, 'Value per Share', '#', currency);
    }
    print(sumOfDiscountedDividends, "Sum of discounted dividends", '#', currency);
    print(discountedTerminalValue, "Discounted terminal value", '#', currency);
    print(terminalValue, "Terminal value", '#', currency);
    print(stableDividend, "Dividend in stable phase", '#', currency);
    print(stableEps, "Eps in stable phase", '#', currency);
    print(dgr, "Average historical Dividend Growth Rate", '%');
    print(averagePayoutRatio, "Average historical Payout Ratio", '%');
    print(averageReturnOnEquity, "Average historical Return on Equity", '%');
    // ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    
    // ---------------- TABLES SECTION ---------------- 
    // Dividend Table
    var rows = ['Dividends', 'Growth Rates', 'Discounted to present value'];
    var columns = [];
    var data = [y_historic.concat(growthDividends), getGrowthRateList(y_historic.concat(growthDividends), 'percentage'), Array(y_historic.length).fill('').concat(discountedDividends)];
    for(var i=1; i<= INPUT.HIGH_GROWTH_YEARS + minLength; i++){
      columns.push(lastYearDate - minLength + i);
    }
    renderTable('Historical and Projected Dividends (' + currency + ')', data, rows, columns);
    
    // if the last period has considerable preferred dividends (meaning that the company has pref. stock issued)
    if( prefDividendsRatio > sensitivity ){
      var rows = ['Net income','Calculated preferred stock dividends & premiums','Net income available to common shareholders', 'Equity', 'Return on equity', 'Dividends paid to common shareholders', 
                  'Total dividends paid', 'Payout ratio (common)', 'Common shares outstanding', 'Reference market share price', 'Earnings per share(EPS)',
                  'Dividends per common share', 'Dividend yield'];
      var columns = [];
      var data = [];
      for(var i=0; i<rows.length; i++){
          data.push([]);
      }

      for(var i=1+indexShift; i<=minLength; i++){
        var i_inverse = minLength - i;
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
        data[col++].push( toM(income[i_inverse].netIncome - preferredStockDividends).toFixed(2) );
        // Equity
        data[col++].push( toM(balance[i_inverse].totalStockholdersEquity) );
        // Common Return on Equity
        if(i_inverse < balance.length - 1){
        	data[col++].push( (100 * returnOnEquityList[i_inverse + 1]).toFixed(2) + '%' );
        }else{
          	data[col++].push('');
        }
        // Dividends paid to common
        data[col++].push( toM(dividends[i_inverse + 1 + indexShift].adjDividend * income[i_inverse].weightedAverageShsOut).toFixed(2) ); 
        // Total Dividends
        data[col++].push( toM(Math.abs(flows[i_inverse].dividendsPaid)) );
        // Common stock payout Ratio
        data[col++].push( (100 * payoutRatioList[i_inverse + 1]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // Market Price per Share
        data[col++].push(prices[i_inverse + 1]['close'] );
        // EPS
        data[col++].push( income[i_inverse].eps );
        // Dividends per Share
        data[col++].push( dividends[i_inverse + 1 + indexShift].adjDividend );
        // Dividend Yield
        data[col++].push( (100*dividends[i_inverse + 1 + indexShift].adjDividend/prices[i_inverse + 1]['close']).toFixed(2) + '%' );
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
        data[col++].push( toM(income_ltm.netIncome - preferredStockDividends).toFixed(2) );
        // Equity
        data[col++].push( toM(balance_quarterly.totalStockholdersEquity) );
        // Common Return on Equity
        data[col++].push( (100 * returnOnEquityList[0]).toFixed(2) + '%' );
        // Dividends paid to common
        data[col++].push( toM(dividends[0].adjDividend * income_ltm.weightedAverageShsOut).toFixed(2) ); 
        // Total Dividends
        data[col++].push( toM(Math.abs(flows_ltm.dividendsPaid)) );
        // Common stock payout Ratio
        data[col++].push( (100 * payoutRatioList[0]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income_ltm.weightedAverageShsOut).toFixed(2) );
        // Market Price per Share
        data[col++].push(prices[0]['close'] );
        // EPS
        data[col++].push( income_ltm.eps );
        // Dividends per Share
        data[col++].push( dividends[0].adjDividend );
        // Dividend Yield ltm
        data[col++].push( (100*dividends[0].adjDividend/prices[0]['close']).toFixed(2) + '%' );
      }
    }
    else{
      var rows = ['Net income', 'Equity', 'Return on equity', 'Dividends paid', 
                  'Payout ratio(common)', 'Shares outstanding', 'Reference market share price', 'Earnings per share(EPS)',
                  'Dividends per common share', 'Dividend yield'];
      var columns = [];
      var data = [];
      for(var i=0; i<rows.length; i++){
          data.push([]);
      }

      for(var i=1+indexShift; i<=minLength; i++){
        var i_inverse = minLength - i;
        var col = 0;
        columns.push(lastYearDate - i_inverse - indexShift);
        // Net Income
        data[col++].push( toM(income[i_inverse].netIncome) );
        // Equity
        data[col++].push( toM(balance[i_inverse].totalStockholdersEquity) );
        // Return on Equity
        if(i_inverse < balance.length - 1){
        	data[col++].push( (100 * returnOnEquityList[i_inverse + 1]).toFixed(2) + '%' );
        }else{
          	data[col++].push('');
        }
        // Dividends paid
        data[col++].push( toM(dividends[i_inverse + 1 + indexShift].adjDividend * income[i_inverse].weightedAverageShsOut) ); 
        // All dividends payout Ratio
        data[col++].push( (100 * payoutRatioList[i_inverse + 1]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // Market Price per Share
        data[col++].push(prices[i_inverse + 1]['close'] );
        // EPS
        data[col++].push( income[i_inverse].eps );
        // Dividends per Share
        data[col++].push( dividends[i_inverse + 1 + indexShift].adjDividend );
        // Dividend Yield
        data[col++].push( (100*dividends[i_inverse + 1 + indexShift].adjDividend/prices[i_inverse + 1]['close']).toFixed(2) + '%' );
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
        data[col++].push( (100 * returnOnEquityList[0]).toFixed(2) + '%' );
        // Dividends paid to common
        data[col++].push( toM(dividends[0].adjDividend * income_ltm.weightedAverageShsOut) ); 
        // All dividends payout Ratio
        data[col++].push( (100 * payoutRatioList[0]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income_ltm.weightedAverageShsOut).toFixed(2) );
        // Market Price per Share
        data[col++].push(prices[0]['close'] );
        // EPS
        data[col++].push( income_ltm.eps );
        // Dividends per Share
        data[col++].push( dividends[0].adjDividend );
        // Dividend Yield ltm
        data[col++].push( (100*dividends[0].adjDividend/prices[0]['close']).toFixed(2) + '%' );
      }
    }
    renderTable('Historical figures (Mil. ' + currency + ' except per share items)', data, rows, columns);
    // ---------------- END OF TABLES SECTION ---------------- 
});

Description(`
	<h5>Two-Stage Dividend Discount Model</h5>
	<p>Used to estimate the value of companies based on two stages of growth. An initial period of high growth, calculated using <b>[Sum of Discounted Dividends]</b>, followed by a period of stable growth, calculated using <b>[Discounted Terminal Value]</b>.</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#two-stage-dividend-discount-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
