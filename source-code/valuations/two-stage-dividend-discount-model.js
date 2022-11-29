// +------------------------------------------------------------+
//   Model: Two-Stage Dividend Discount Model
//   Copyright: https://discountingcashflows.com, 2022
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
    var income = JSON.parse(JSON.stringify(_income));
    var income_ltm = JSON.parse(JSON.stringify(_income_ltm));
    var balance = JSON.parse(JSON.stringify(_balance));
    var balance_quarterly = JSON.parse(JSON.stringify(_balance_quarterly));
    var flows = JSON.parse(JSON.stringify(_flows));
    var flows_ltm = JSON.parse(JSON.stringify(_flows_ltm));
    var profile = JSON.parse(JSON.stringify(_profile));
    var treasury = JSON.parse(JSON.stringify(_treasury));
    var dividends = JSON.parse(JSON.stringify(_dividends));
    var prices = JSON.parse(JSON.stringify(_prices));
    var fx = JSON.parse(JSON.stringify(_fx));
    // context is where tables and values of interest are stored
    var context = [];
    
    // ---------------- SETTING ASSUMPTIONS SECTION ---------------- 
    // Count the dividends. If there are no dividends, display a warning.
    var dividendsCount = dividends[0].length - 1;
    if(!dividendsCount){
    	warning("The company does not currently pay dividends!");
    }
    if(dividendsCount > 10){
      dividendsCount = 10;
    }
    treasury = treasury[0];
    // Set the default historic years to the number of historic dividends
    setInputDefault('HISTORIC_YEARS', dividendsCount);
    // Set the stable growth in perpetuity to the 10 year treasury note
    setInputDefault('_STABLE_GROWTH_IN_PERPETUITY', treasury.year10);
    
    // Slice the reports to the number of historic years set previously
    flows = flows[0].slice(0, INPUT.HISTORIC_YEARS);
    income = income[0].slice(0, INPUT.HISTORIC_YEARS);
    balance = balance[0].slice(0, INPUT.HISTORIC_YEARS);
    balance_quarterly = balance_quarterly[0][0];
    profile = profile[0][0];
    income_ltm = income_ltm[0];
    flows_ltm = flows_ltm[0];
    prices = prices[0];
    dividends = dividends[0].slice(0, INPUT.HISTORIC_YEARS + 1);
    fx = fx[0];
	
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
    
    var sensitivity = 0.05;
    var prefDividendsRatio = Math.abs((Math.abs(flows[0].dividendsPaid) - dividends[1].adjDividend * income[0].weightedAverageShsOut) / flows[0].dividendsPaid);
    
    var payoutRatioList = [];
    var averagePayoutRatio = 0;
    var payoutRatio = 0;
    
    var returnOnEquityList = [];
    var averageReturnOnEquity = 0;
    var returnOnEquity = 0;
    
    var commonIncome = 0;
    // ------ LTM - Payout Ratio, Return on Equity ------
    if( prefDividendsRatio > sensitivity ){
      commonIncome = (income_ltm.netIncome - (Math.abs(flows_ltm.dividendsPaid) - dividends[0].adjDividend * income_ltm.weightedAverageShsOut));
      payoutRatio = dividends[0].adjDividend * income_ltm.weightedAverageShsOut / commonIncome;
    }
    else{
      commonIncome = income_ltm.netIncome;
      payoutRatio = Math.abs(flows_ltm.dividendsPaid) / commonIncome;
    }
    if(commonIncome <= 0){
      payoutRatio = 0;
    }
    payoutRatioList.push(payoutRatio);
    averagePayoutRatio += payoutRatio;

    returnOnEquity = commonIncome / balance[0].totalStockholdersEquity; // ltm income / last year equity
    returnOnEquityList.push(returnOnEquity);
    averageReturnOnEquity += returnOnEquity;
    // Calculate Average historic Payout Ratio, average Return on Equity
    for(var i=0; i<income.length; i++){
      if( prefDividendsRatio > sensitivity ){
        commonIncome = (income[i].netIncome - (Math.abs(flows[i].dividendsPaid) - dividends[i + 1].adjDividend * income[i].weightedAverageShsOut));
        payoutRatio = dividends[i + 1].adjDividend * income[i].weightedAverageShsOut / commonIncome;
      }
      else{
        commonIncome = income[i].netIncome;
        payoutRatio = Math.abs(flows[i].dividendsPaid) / commonIncome;
      }
      if(commonIncome <= 0){
        // if commonIncome is 0
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
    averageReturnOnEquity /= income.length;
    setInputDefault('_STABLE_PAYOUT', (1-INPUT._STABLE_GROWTH_IN_PERPETUITY/averageReturnOnEquity)*100);
    
    averagePayoutRatio /= income.length + 1;
    // If the payout is higher than 100%, set it equal to the stable payout
    if(averagePayoutRatio > 1){
      setInputDefault('_HIGH_GROWTH_PAYOUT', INPUT._STABLE_PAYOUT*100);
    }
    else{
      setInputDefault('_HIGH_GROWTH_PAYOUT', averagePayoutRatio*100);
    }
    
    // dgr stores the Historic Dividend Growth Rate
    var dgr = 0;
    // d1 stores the previous period Dividend
    var d1 = 0;
    // d0 stores the current period Dividend
    var d0 = dividends[0].adjDividend;
    if(dividends[0].adjDividend == 0){
        warning("A zero dividend was encountered!");
      	_StopIfWatch(0, currency);
        return;
    }
    var growthRates = [];
    // Calculate the Average Annual Dividend Growth Rate for the last HISTORIC_YEARS
    for(var i=1; i<income.length; i++){
      d1 = dividends[i].adjDividend;
      // Check the dividend
      if(dividends[i].adjDividend == 0){
        warning("A zero dividend was encountered!");
        _StopIfWatch(0, currency);
        return;
      }
      dgr += (d0 - d1) / d1;
      growthRates.push(Number((100*(d0 - d1) / d1).toFixed(2)));
      d0 = d1;
    }
	dgr = dgr/( dividends.length - 1 );
    var expectedDividend = dividends[0].adjDividend;
    // Set the eps high growth rate equal to the historic dividend growth rate
    setInputDefault('_HIGH_GROWTH_RATE', 100*dgr);
    // ---------------- END OF SETTING ASSUMPTIONS SECTION ---------------- 
    
    // ---------------- CHARTS SECTION ---------------- 
    // Create Chart for X Years of Previous Dividends 
    var y_historic = [];
    for(var i = INPUT.HISTORIC_YEARS; i >= 1; i--){
      y_historic.push(Math.abs(dividends[i].adjDividend));
    }
    // Append estimations
    var lastYearDate = parseInt(flows[0]['date']);
    fillHistoricUsingList(y_historic, 'dividends', parseInt(flows[0]['date']) + 1);
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
    // ---------------- END OF CHARTS SECTION ---------------- 
    
    // ---------------- VALUES OF INTEREST SECTION ---------------- 
    // Discount the projected dividends and sum them
    var discountedDividends = [];
    var sumOfDiscountedDividends = 0;
    for(var i=0; i<INPUT.HIGH_GROWTH_YEARS; i++){
      var discountedDividend = growthDividends[i]/Math.pow(1 + INPUT._DISCOUNT_RATE, i+1);
      sumOfDiscountedDividends += discountedDividend;
      discountedDividends.push(discountedDividend);
    }
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
    print(dgr, "Average historic Dividend Growth Rate", '%');
    print(averagePayoutRatio, "Average historic Payout Ratio", '%');
    print(averageReturnOnEquity, "Average historic Return on Equity", '%');
    // ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    
    // ---------------- TABLES SECTION ---------------- 
    // Dividend Table
    var rows = ['Dividends', 'Growth Rates', 'Discounted to present value'];
    var columns = [];
    var data = [y_historic.concat(growthDividends), getGrowthRateList(y_historic.concat(growthDividends), 'percentage'), Array(y_historic.length).fill('').concat(discountedDividends)];
    for(var i=1; i<= INPUT.HIGH_GROWTH_YEARS + INPUT.HISTORIC_YEARS; i++){
      columns.push(lastYearDate - INPUT.HISTORIC_YEARS + i);
    }
    contextItem = {name:'Historic and Projected Dividends (' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
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

      var lengths = [income.length, balance.length, flows.length];
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
        var preferredStockDividends = Math.abs(flows[i_inverse].dividendsPaid) - dividends[i_inverse + 1].adjDividend * income[i_inverse].weightedAverageShsOut;
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
        data[col++].push( toM(dividends[i_inverse + 1].adjDividend * income[i_inverse].weightedAverageShsOut).toFixed(2) ); 
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
        data[col++].push( dividends[i_inverse + 1].adjDividend );
        // Dividend Yield
        data[col++].push( (100*dividends[i_inverse + 1].adjDividend/prices[i_inverse + 1]['close']).toFixed(2) + '%' );
      }
      // append LTM values
      columns.push('LTM');
      var col = 0;
      // Net Income
      data[col++].push( toM(income_ltm.netIncome) );
      var preferredStockDividends = -flows_ltm.dividendsPaid - dividends[0].adjDividend * income_ltm.weightedAverageShsOut;
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


      contextItem = {name:'Historic figures (Mil. ' + currency + ' except per share items)', display:'table', rows:rows, columns:columns, data:data};
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

      var lengths = [income.length, balance.length, flows.length];
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
        	data[col++].push( (100 * returnOnEquityList[i_inverse + 1]).toFixed(2) + '%' );
        }else{
          	data[col++].push('');
        }
        // Dividends paid
        data[col++].push( toM(dividends[i_inverse + 1].adjDividend * income[i_inverse].weightedAverageShsOut) ); 
        // All dividends payout Ratio
        data[col++].push( (100 * payoutRatioList[i_inverse + 1]).toFixed(2) + '%' );
        // Shares Outstanding
        data[col++].push( toM(income[i_inverse].weightedAverageShsOut).toFixed(2) );
        // Market Price per Share
        data[col++].push(prices[i_inverse + 1]['close'] );
        // EPS
        data[col++].push( income[i_inverse].eps );
        // Dividends per Share
        data[col++].push( dividends[i_inverse + 1].adjDividend );
        // Dividend Yield
        data[col++].push( (100*dividends[i_inverse + 1].adjDividend/prices[i_inverse + 1]['close']).toFixed(2) + '%' );
      }
      // append LTM values
      columns.push('LTM');
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


      contextItem = {name:'Historic figures (Mil. ' + currency + ' except per share items)', display:'table', rows:rows, columns:columns, data:data};
    }
    context.push(contextItem);
    
    renderChart('Historic and Projected Dividends (' + currency + ')');
    // ---------------- END OF TABLES SECTION ---------------- 
    monitor(context);
});

var DESCRIPTION = Description(`
								<h5>Two-Stage Dividend Discount Model</h5>
                                <p>Used to estimate the value of companies based on two stages of growth. An initial period of high growth, calculated using <b>[Sum of Discounted Dividends]</b>, followed by a period of stable growth, calculated using <b>[Discounted Terminal Value]</b>.</p>
                                <p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#two-stage-dividend-discount-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
                                `);
