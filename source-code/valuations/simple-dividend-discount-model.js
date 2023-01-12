// +------------------------------------------------------------+
//   Model: Simple Dividend Discount Model
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: '',
                   EXPECTED_DIVIDEND: '',
                   _GROWTH_IN_PERPETUITY: '',
                   _LINEAR_REGRESSION_WEIGHT: 50,
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
    
    // Get the shift between dividends and income statements
    var indexShift = Number(dividends[1].year) - Number(income[0].calendarYear);
    
    // context is where tables and values of interest are stored
    var context = [];
    var chartProjectionYears = 5;
    // ---------------- SETTING ASSUMPTIONS SECTION ---------------- 
    // Count the dividends. If there are no dividends, display a warning.
    var dividendsCount = dividends.length - 1;
    if(dividendsCount <= 0){
    	warning("The company does not currently pay dividends!");
    }
    if(dividendsCount > 10){
    	setInputDefault('HISTORIC_YEARS', 10);
    }
    else{
      // Set the default historical years to the number of historical dividends
      setInputDefault('HISTORIC_YEARS', dividendsCount);
    }
    // Set the growth in perpetuity to the 10 year treasury note
    setInputDefault('_GROWTH_IN_PERPETUITY', treasury.year10);
    
    var minLength = Math.min(income.length, balance.length, flows.length, dividendsCount, INPUT.HISTORIC_YEARS);
    
    // Slice the reports to the number of historical years set previously
    flows = flows.slice(0, minLength);
    income = income.slice(0, minLength);
    balance = balance.slice(0, minLength);
    balance_quarterly = balance_quarterly[0]; // get the last quarter
    dividends = dividends.slice(0, minLength + 1);
	// Get the currencies used in the profile and reports (flows).
    // The profile can have a different currency from the reports.
    var currency = flows[0]['convertedCurrency'];
    var currencyProfile = profile['convertedCurrency'];
    var ccyRate = currencyRate(fx,  currency, currencyProfile);
    if(ccyRate != 1){
    	// adjust dividends for fx
      	for(var i=0; i<minLength; i++){
          	dividends[i].adjDividend = dividends[i].adjDividend / ccyRate;
        }
    }
    // Get the linear regression curve line as a list
    var linDividends = linearRegressionGrowthRate(dividends, 'adjDividend', chartProjectionYears - 1, 1);
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
    
    // price is the Current Last Price of a Share on the Stock Market
    var price = profile['price'];
    var sensitivity = 0.01;
    var prefDividendsRatio = Math.abs((income[0].eps * income[0].weightedAverageShsOut - income[0].netIncome) / income[0].netIncome);
    
    var payoutRatioList = [];
    var averagePayoutRatio = 0;
    var payoutRatio = 0;
    
    var returnOnEquityList = [];
    var averageReturnOnEquity = 0;
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
    averagePayoutRatio += payoutRatio;

    returnOnEquity = commonIncome / balance[0].totalStockholdersEquity; // ltm income / last year equity
    returnOnEquityList.push(returnOnEquity);
    averageReturnOnEquity += returnOnEquity;
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
    averagePayoutRatio = getArraySum(payoutRatioList)/payoutRatioList.length;
    averageReturnOnEquity = getArraySum(returnOnEquityList)/returnOnEquityList.length;

    var expectedDividend = INPUT._LINEAR_REGRESSION_WEIGHT * linDividends[minLength - 1] + (1-INPUT._LINEAR_REGRESSION_WEIGHT) * dividends[0].adjDividend;
    setInputDefault('EXPECTED_DIVIDEND', expectedDividend);
    // ---------------- END OF SETTING ASSUMPTIONS SECTION ---------------- 
    
    // ---------------- VALUES OF INTEREST SECTION ---------------- 
    // The final value calculated by the Dividend Discount Model
    var valueOfStock = INPUT.EXPECTED_DIVIDEND / (INPUT._DISCOUNT_RATE - INPUT._GROWTH_IN_PERPETUITY);
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(ccyRate*valueOfStock, currencyProfile)){
      return;
    }

    _SetEstimatedValue(ccyRate*valueOfStock, currencyProfile);
    if(ccyRate != 1){
    	print(valueOfStock, 'Value per Share', '#', currency);
    }
    print(dividends[0].adjDividend, "LTM dividend", '#', currency);
    print(INPUT.EXPECTED_DIVIDEND, "Next year's expected dividend", '#', currency);
    print(averageGrowthRate('adjDividend', dividends.slice(1, dividends.length)), "Average historical dividend growth rate", '%');
    print(averagePayoutRatio, "Average historical Payout Ratio", '%');
    print(averageReturnOnEquity, "Average historical Return on Equity", '%');
    // ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    
    // ---------------- CHARTS SECTION ---------------- 
    // Create Chart for minLength of Previous Dividends 
    var y_values = [];
    for(var i = minLength; i >= 1; i--){
      y_values.push(Math.abs(dividends[i].adjDividend));
    }
    y_values.push(INPUT.EXPECTED_DIVIDEND);
    // Append estimations
    var lastYearDate = parseInt(income[0]['date']) + indexShift;
    for(var i = 1; i < chartProjectionYears; i++){
      y_values.push(INPUT.EXPECTED_DIVIDEND * Math.pow(1 + INPUT._GROWTH_IN_PERPETUITY, i));
    }
    fillHistoricUsingList(y_values, 'dividends', lastYearDate + chartProjectionYears);
    fillHistoricUsingList(linDividends, 'linear regression');
    renderChart('Historical and Projected Dividends (' + currency + ')');
    // ---------------- END OF CHARTS SECTION ---------------- 
    
    // ---------------- TABLES SECTION ---------------- 
    // Dividend Table
    var rows = ['Dividends', 'Growth Rates'];
    var columns = [];
    var data = [y_values, getGrowthRateList(y_values, 'percentage')];
    for(var i=1; i<=chartProjectionYears + minLength; i++){
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
                  'Payout ratio (common)', 'Shares outstanding', 'Reference market share price', 'Earnings per share(EPS)',
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
	<h5>Simple Dividend Discount Model</h5>
	<p>Used to estimate the value of companies that have reached maturity and pay stable dividends as a significant percentage of their Free Cashflow to Equity with little to no high growth chance.</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#simple-dividend-discount-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
