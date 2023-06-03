// +------------------------------------------------------------+
//   Model: Simple Dividend Discount Model
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

Input(
  {
    _DISCOUNT_RATE: '',
    EXPECTED_DIVIDEND: '',
    _GROWTH_IN_PERPETUITY: '',
    BETA:'',
    _RISK_FREE_RATE: '',
    _MARKET_PREMIUM: '',
    HISTORICAL_YEARS: ''
  },
  [{
    parent:'_DISCOUNT_RATE',
    children:['BETA', '_RISK_FREE_RATE', '_MARKET_PREMIUM']
  }]
); 

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
  get_fx(),
  get_risk_premium()).done(
  function($income, $income_ltm, $balance, $balance_quarterly, $flows, $flows_ltm, $profile, $dividends, $prices, $treasury, $fx, $risk_premium){  
  try{
    var response = new Response({
      income: $income,
      income_ltm: $income_ltm,
      balance: $balance,
      balance_quarterly: $balance_quarterly,
      balance_ltm: 'balance_quarterly:0',
      flows: $flows,
      flows_ltm: $flows_ltm,
      profile: $profile,
      treasury: $treasury,
      dividends: $dividends,
      prices: $prices,
      risk_premium: $risk_premium,
    }).toOneCurrency('income', $fx).merge('_ltm');
    response.balance[0]['date'] = response.prices[0]['date'] = 'LTM';
    
    // +---------------- ASSUMPTIONS SECTION -----------------+ 
    // Count the dividends. If there are no dividends, display a warning.
    var dividendsCount = response.dividends.length - 1;
    if(dividendsCount <= 0){
      throwError("The company does not currently pay dividends!");
      return;
    }
    if(dividendsCount > 10){
    	setAssumption('HISTORICAL_YEARS', 10);
    }
    else{
      // Set the default historical years to the number of historical dividends
      setAssumption('HISTORICAL_YEARS', dividendsCount);
    }
    // Set the growth in perpetuity to the 10 year treasury note
    setAssumption('_GROWTH_IN_PERPETUITY', response.treasury.year10);
    
    // Set beta 
    if(response.profile.beta){
    	setAssumption('BETA', response.profile.beta);
    }
    else{
    	setAssumption('BETA', 1);
    }
    // Risk free rate is the yield of the 10 year treasury note
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
    // Discount Rate is the cost of equity
    setAssumption('_DISCOUNT_RATE', toP(getAssumption('_RISK_FREE_RATE') + getAssumption('BETA') * getAssumption('_MARKET_PREMIUM')));
    
    var sensitivity = 0.01;
    var prefDividendsRatio = absolute((response.income[0].eps * response.income[0].weightedAverageShsOut - response.income[0].netIncome) / response.income[0].netIncome);
    var commonIncome = [];
    if( prefDividendsRatio > sensitivity ){
      commonIncome = ['eps:0', '*', 'weightedAverageShsOut:0'];
    }
    else{
      commonIncome = ['netIncome:0'];
    }
    
    // Setup Original Data
    var original_data = new DateValueData({
      'netIncome': new DateValueList(response.income, 'netIncome'),
      'totalStockholdersEquity': new DateValueList(response.balance, 'totalStockholdersEquity'),
      'weightedAverageShsOut': new DateValueList(response.income, 'weightedAverageShsOut'),
      'eps': new DateValueList(response.income, 'eps'),
      'adjDividend': new DateValueList(response.dividends, 'adjDividend'),
      'marketPrice': new DateValueList(response.prices, 'close'),
    });
    var currentDate = original_data.lastDate();
    var nextYear = currentDate + 1;
    var forecastEndDate = currentDate + 5;
    // chartProjectionYears = 5;
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      'commonIncome': commonIncome,
      'preferredStockDividends': ['netIncome:0', '-', 'commonIncome:0'],
      'dividendsPaidToCommon': ['adjDividend:0', '*', 'weightedAverageShsOut:0'],
      'bookValue': ['totalStockholdersEquity:0', '/', 'weightedAverageShsOut:0'],
      '_returnOnEquity': ['commonIncome:0', '/', 'totalStockholdersEquity:-1'],
      '_payoutRatio': ['adjDividend:0', '/', 'eps:0'],
      'retainedEarnings': ['eps:0', '-', 'adjDividend:0'],
      '_dividendYield': ['adjDividend:0', '/', 'marketPrice:0'],
      '_adjDividendGrowth': ['function:growth_rate', 'adjDividend'],
      'discountedAdjDividend': ['adjDividend:0'],
    }).compute();
    
    // Compute 5 years of forecasted values and ratios
    var forecasted_data = historical_computed_data.removeDate('LTM').setFormula({
      'linearRegression': ['function:linear_regression', 'adjDividend', {slope: 1, start_date: nextYear - getAssumption('HISTORICAL_YEARS')}],
    }).compute({'forecast_end_date': forecastEndDate});
    
    // By default we want the next year's expected dividend to be the average 
    // between the LTM dividend and the regression value of next year
    var linearRegressionWeight = 0.5;
    var expectedDividend = linearRegressionWeight * forecasted_data.get('linearRegression').valueAtDate(nextYear) + 
        					(1-linearRegressionWeight) * original_data.get('adjDividend').valueAtDate('LTM');
    setAssumption('EXPECTED_DIVIDEND', expectedDividend);
    
    forecasted_data = forecasted_data.setFormula({
      'adjDividend': ['function:compound', getAssumption('EXPECTED_DIVIDEND'), {rate: getAssumption('_GROWTH_IN_PERPETUITY'), start_date: nextYear}],
      '_adjDividendGrowth': ['function:growth_rate', 'adjDividend'],
    }).compute({'forecast_end_date': forecastEndDate});
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    var currency = response.currency;
    // The final value calculated by the Dividend Discount Model
    var valueOfStock = getAssumption('EXPECTED_DIVIDEND') / (getAssumption('_DISCOUNT_RATE') - getAssumption('_GROWTH_IN_PERPETUITY'));
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valueOfStock, currency)){
      return;
    }
    _SetEstimatedValue(valueOfStock, currency);
    print(original_data.get('adjDividend').valueAtDate('LTM'), "LTM dividend", '#', currency);
    print(getAssumption('EXPECTED_DIVIDEND'), "Next year's expected dividend", '#', currency);
    print(getAssumption('_DISCOUNT_RATE'), "Cost of Equity", '%');
    print(getAssumption('_GROWTH_IN_PERPETUITY'), "Expected Growth Rate", '%');
    // +------------- END OF MODEL VALUES SECTION ------------+
    
    // +------------------- CHARTS SECTION -------------------+
    forecasted_data.renderChart({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['adjDividend', 'linearRegression'],
      properties: {
        title: 'Historical and Projected Dividends',
        currency: currency,
        disabled_keys: ['linearRegression'],
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+ 
    
    // +------------------- TABLES SECTION -------------------+
    
    // Dividend Table
    forecasted_data.renderTable({
      start_date: currentDate,
      keys: ['adjDividend', '_adjDividendGrowth'],
      rows: ['{PerShare} Dividends', '{%} Dividend Growth Rate'],
      properties: {
        'title': 'Projected data',
        'currency': currency,
      },
    });
    
    // Historical Table
    historical_computed_data.renderTable({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['netIncome', 'totalStockholdersEquity', '_returnOnEquity', 'dividendsPaidToCommon',
             '_payoutRatio', 'weightedAverageShsOut', 'marketPrice', 'eps', 'adjDividend', '_adjDividendGrowth', '_dividendYield'],
      rows: ['Net income', 'Equity', '{%} Return on equity', 'Dividends paid', 
             '{%} Payout ratio', 'Shares outstanding', '{PerShare} Reference market price', '{PerShare} EPS',
             '{PerShare} Dividends', '{%} Dividend Growth Rate', '{%} Dividend yield'],
      properties: {
        'title': 'Historical data',
        'currency': currency,
        'number_format': 'M',
        'display_averages': true,
        'column_order': 'descending',
      },
    });
    // +---------------- END OF TABLES SECTION ---------------+
  }
  catch (error) {
    throwError(error);
  }
});

Description(`
	<h5>Simple Dividend Discount Model</h5>
	<p>Used to estimate the value of companies that have reached maturity and pay stable dividends as a significant percentage of their Free Cashflow to Equity with little to no high growth chance.</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#simple-dividend-discount-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
