// +------------------------------------------------------------+
//   Model: Discounted Future Market Cap	
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

Input(
  {
    _DISCOUNT_RATE: '',
    _MARKET_PREMIUM: '',
    _RISK_FREE_RATE: '',
    BETA: '',
    PE_RATIO: '',
    PROJECTION_YEARS: 5,
    HISTORICAL_YEARS: 10,
    _REVENUE_GROWTH_RATE: '',
    _NET_INCOME_MARGIN: '',
  },
  [{
    parent:'_DISCOUNT_RATE',
    children:['BETA', '_RISK_FREE_RATE', '_MARKET_PREMIUM']
  }]
); 

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_quote(),
  get_profile(),
  get_treasury(),
  get_fx(),
  get_risk_premium()).done(
  function(_income, _income_ltm, _quote, _profile, _treasury, _fx, _risk_premium){
  try{
    var response = new Response({
      income: _income,
      income_ltm: _income_ltm,
      quote: _quote,
      profile: _profile,
      treasury: _treasury,
      risk_premium: _risk_premium,
    }).toOneCurrency('income', _fx).merge('_ltm');
    
    // +---------------- ASSUMPTIONS SECTION -----------------+ 
	setAssumption('PE_RATIO', response.quote.pe);
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
    // Risk free rate is the yield of the 10 year treasury note
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
    // Set beta (used in calculating the discount rate)
    if(response.profile.beta){
    	setAssumption('BETA', response.profile.beta);
    }
    else{
    	setAssumption('BETA', 1);
    }
    var costOfEquity = getAssumption('_RISK_FREE_RATE') + getAssumption('BETA')*getAssumption('_MARKET_PREMIUM');
    setAssumption('_DISCOUNT_RATE', toP(costOfEquity));
    
     // Setup Original Data
    var original_data = new DateValueData({
      'revenue': new DateValueList(response.income, 'revenue'),
      'costOfRevenue': new DateValueList(response.income, 'costOfRevenue'),
      'grossProfit': new DateValueList(response.income, 'grossProfit'),
      'operatingIncome': new DateValueList(response.income, 'operatingIncome'),
      'netIncome': new DateValueList(response.income, 'netIncome'),
      'weightedAverageShsOut': new DateValueList(response.income, 'weightedAverageShsOut'),
    });
    
    var currentDate = original_data.lastDate();
    var nextYearDate = currentDate + 1;
    var startDate = nextYearDate - getAssumption('HISTORICAL_YEARS');
    var forecastEndDate = currentDate + getAssumption('PROJECTION_YEARS');
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      '_grossMargin': ['grossProfit:0', '/', 'revenue:0'],
      '_operatingMargin': ['operatingIncome:0', '/', 'revenue:0'],
      '_netMargin': ['netIncome:0', '/', 'revenue:0'],
      '_revenueGrowthRate': ['function:growth_rate', 'revenue'],
    }).compute();
    
	setAssumption('_NET_INCOME_MARGIN', toP(historical_computed_data.get('_netMargin').sublist(startDate).average()));
	setAssumption('_REVENUE_GROWTH_RATE', toP(historical_computed_data.get('_revenueGrowthRate').sublist(startDate).average()));
    
    // Compute forecasted values and ratios
    var forecasted_data = historical_computed_data.removeDate('LTM').setFormula({
      'linearRegressionRevenue': ['function:linear_regression', 'revenue', {slope: 1, start_date: startDate}],
      'revenue': ['function:compound', 'linearRegressionRevenue:start_date', {rate: getAssumption('_REVENUE_GROWTH_RATE'), start_date: nextYearDate}],
      '_revenueGrowthRate': ['function:growth_rate', 'revenue'],
      'netIncome': ['revenue:0', '*', getAssumption('_NET_INCOME_MARGIN')],
    }).setEditable(_edit(), {
      start_date: nextYearDate,
      keys: ['revenue', 'netIncome'],
    }).compute({'forecast_end_date': forecastEndDate}); 
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    var projectedRevenue = forecasted_data.get('revenue').lastValue();
    var projectedNetIncome = forecasted_data.get('netIncome').lastValue();
	
    var sharesOutstanding = original_data.get('weightedAverageShsOut').valueAtDate('LTM');
    var futureMarketCap = getAssumption('PE_RATIO') * projectedNetIncome;
    var discountedFutureMarketCap = futureMarketCap / Math.pow(1 + getAssumption('_DISCOUNT_RATE'), getAssumption('PROJECTION_YEARS'));
    var presentValue = discountedFutureMarketCap / sharesOutstanding;
	var currency = response.currency;
	
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(presentValue, currency)){
      return;
    }
    _SetEstimatedValue(presentValue, currency);
    
    print(presentValue, 'Present Value', '#', currency);
    print(projectedNetIncome, 'Estimated Net Income in ' + forecastEndDate, '#', currency);
    print(futureMarketCap, 'Estimated Market Capitalisation in ' + forecastEndDate, '#', currency);
    print(discountedFutureMarketCap, 'Market Capitalisation discounted to present', '#', currency);
    print(sharesOutstanding, 'Shares Outstanding', '#');
    // +------------- END OF MODEL VALUES SECTION ------------+
	
    // +------------------- CHARTS SECTION -------------------+
    forecasted_data.renderChart({
      start_date: startDate,
      keys: ['revenue', 'netIncome', 'linearRegressionRevenue'],
      properties: {
        title: 'Historical and forecasted data',
        currency: currency,
      	number_format: 'M',
        disabled_keys: ['linearRegressionRevenue']
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+ 
	
    // +------------------- TABLES SECTION -------------------+
    // Estimated Future Data
    forecasted_data.renderTable({
      start_date: currentDate,
      keys: ['revenue', '_revenueGrowthRate', 'netIncome'],
      rows: ['Revenue', '{%} Revenue Growth Rate', 'Net Income'],
      properties: {
        'title': 'Estimated Future Data',
        'currency': currency,
        'column_order': 'ascending',
      	'number_format': 'M',
      }
    });
    
    // Historical Table
    historical_computed_data.renderTable({
      start_date: startDate,
      keys: ['revenue', '_revenueGrowthRate', 'costOfRevenue', 'grossProfit', '_grossMargin',
             'operatingIncome', '_operatingMargin', 'netIncome', '_netMargin'],
      rows: ['Revenue', '{%} Revenue Growth Rate', 'Cost of Revenue', 'Gross Profit', '{%} Gross Margin', 
                'Operating Income', '{%} Operating Margin', 'Net Income', '{%} Net Margin'],
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

Description(`<h5>Discounted Future Market Cap</h5>
	This model estimates the intrinsic value of a common share by projecting the Future Market Capitalization using the estimated PE Ratio and then discounting it to the Present using an Annual Required Rate of Return.
`);
