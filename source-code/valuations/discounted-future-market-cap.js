/*
    Model: Discounted Future Market Cap
    
    © Copyright: 
        Discounting Cash Flows Inc. (discountingcashflows.com)
        8 The Green, Dover, DE 19901
*/

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
  get_balance_sheet_statement(),
  get_balance_sheet_statement_quarterly(2),
  get_quote(),
  get_profile(),
  get_treasury(),
  get_fx(),
  get_risk_premium()).done(
  function($income, $income_ltm, $balance, $balance_quarterly, $quote, $profile, $treasury, $fx, $risk_premium){
  try{
    var response = new Response({
        income: $income,
        income_ltm: $income_ltm,
        balance: $balance,
        balance_quarterly: $balance_quarterly,
        balance_ltm: 'balance_quarterly:0',
        quote: $quote,
        profile: $profile,
        treasury: $treasury,
        risk_premium: $risk_premium,
    }).toOneCurrency('income', $fx).merge('_ltm');
    response.balance[0]['date'] = 'LTM';
    
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
        revenue: new DateValueList(response.income, 'revenue'),
        costOfRevenue: new DateValueList(response.income, 'costOfRevenue'),
        grossProfit: new DateValueList(response.income, 'grossProfit'),
        netIncome: new DateValueList(response.income, 'netIncome'),
        weightedAverageShsOut: new DateValueList(response.income, 'weightedAverageShsOut'),
        operatingIncome: new DateValueList(response.income, 'operatingIncome'),
        incomeBeforeTax: new DateValueList(response.income, 'incomeBeforeTax'),
        incomeTaxExpense: new DateValueList(response.income, 'incomeTaxExpense'),
        
        totalNonCurrentAssets: new DateValueList(response.balance, 'totalNonCurrentAssets'),
        totalCurrentAssets: new DateValueList(response.balance, 'totalCurrentAssets'),
        totalCurrentLiabilities: new DateValueList(response.balance, 'totalCurrentLiabilities'),
        cashAndCashEquivalents: new DateValueList(response.balance, 'cashAndCashEquivalents'),
        totalStockholdersEquity: new DateValueList(response.balance, 'totalStockholdersEquity'),
    });
    
    var currentDate = original_data.lastDate();
    var nextYearDate = currentDate + 1;
    var startDate = nextYearDate - getAssumption('HISTORICAL_YEARS');
    var forecastEndDate = currentDate + getAssumption('PROJECTION_YEARS');
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
        _grossMargin: ['grossProfit:0', '/', 'revenue:0'],
        _operatingMargin: ['operatingIncome:0', '/', 'revenue:0'],
        _netMargin: ['netIncome:0', '/', 'revenue:0'],
        _revenueGrowthRate: ['function:growth_rate', 'revenue'],
        _netIncomeGrowthRate: ['function:growth_rate', 'netIncome'],
        _totalStockholdersEquityGrowthRate: ['function:growth_rate', 'totalStockholdersEquity'],
        
        // Calculating NOPAT (Net Operating Profit After Taxes)
        _taxRate: ['incomeTaxExpense', '/', 'incomeBeforeTax'],
        incomeTax: ['operatingIncome', '*', '_taxRate'],
        nopat: ['operatingIncome', '-', 'incomeTax'],
        
        // Calculating Invested Capital
        investedCapital: ['function:sum', {'keys': [
            ['totalNonCurrentAssets', '-', 'cashAndCashEquivalents'],
            ['totalCurrentAssets', '-', 'totalCurrentLiabilities'],
        ]}],
        _roic: ['nopat', '/', 'investedCapital'],
    }).compute();
    
	setAssumption('_NET_INCOME_MARGIN', toP(historical_computed_data.get('_netMargin').sublist(startDate).average()));
	setAssumption('_REVENUE_GROWTH_RATE', toP(historical_computed_data.get('_revenueGrowthRate').sublist(startDate).average()));
    
    // Compute forecasted values and ratios
    var forecasted_data = historical_computed_data.removeDate('LTM').setFormula({
      linearRegressionRevenue: ['function:linear_regression', 'revenue', {slope: 1, start_date: startDate}],
      revenue: ['function:compound', 'linearRegressionRevenue:start_date', {rate: getAssumption('_REVENUE_GROWTH_RATE'), start_date: nextYearDate}],
      _revenueGrowthRate: ['function:growth_rate', 'revenue'],
      netIncome: ['revenue:0', '*', getAssumption('_NET_INCOME_MARGIN')],
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
      data: {
          'Revenue': 'revenue',
          '{%} Revenue Growth Rate': '_revenueGrowthRate',
          'Net Income': 'netIncome',
      },
      properties: {
        'title': 'Estimated Future Values',
        'currency': currency,
        'column_order': 'ascending',
      	'number_format': 'M',
      }
    });
    
    // Historical values table
    historical_computed_data.renderTable({
      start_date: startDate,
      data: {
          'Revenue': 'revenue',
          '{%} Revenue Growth Rate': '_revenueGrowthRate',
          'Cost of Revenue': 'costOfRevenue',
          'Gross Profit': 'grossProfit',
          '{%} Gross Margin': '_grossMargin',
          'Operating Income': 'operatingIncome',
          '{%} Operating Margin': '_operatingMargin',
          'Net Income': 'netIncome',
          '{%} Net Margin': '_netMargin',
      },
      properties: {
        'title': 'Historical Values',
        'currency': currency,
        'number_format': 'M',
        'display_averages': true,
        'column_order': 'descending',
      },
    });
    
    // Historical growth rates table
    historical_computed_data.renderTable({
      start_date: startDate,
      data: {
          'Revenue': 'revenue',
          '{%} Revenue Growth Rate': '_revenueGrowthRate',
          'Net Income': 'netIncome',
          '{%} Net Margin': '_netMargin',
          '{%} Net Income Growth Rate': '_netIncomeGrowthRate',
          'Stockholders Equity': 'totalStockholdersEquity',
          '{%} Equity Growth Rate': '_totalStockholdersEquityGrowthRate',
          '{%} Return on Invested Capital (ROIC)': '_roic',
          'After-tax Operating Income': 'nopat',
          '{%} Income Tax Rate': '_taxRate',
          'Invested Capital': 'investedCapital',
      },
      properties: {
        'title': 'Historical Growth Rates',
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
`,
  {
    _DISCOUNT_RATE: [
      '{Equation} \\text{Discount Rate} = \\text{Cost of Equity} = \\text{Risk Free Rate} + \\text{Beta} * \\text{Market Premium}',
      '{Paragraph} The cost of equity is the theoretical rate of return that an equity investment should generate. It is calculated using the CAPM formula.',
      '{Link} https://www.investopedia.com/terms/c/costofequity.asp#mntl-sc-block_1-0-20',
    ],
    HISTORICAL_YEARS: 'The number of historical years used to calculate averages for historical data.',
    PROJECTION_YEARS: 'The number of years for projecting the analysis into the future.',
    _REVENUE_GROWTH_RATE: `The annual revenue growth rate is applied to projected revenue starting from the second projection year onward.`,
    _NET_INCOME_MARGIN: `Net Income expressed as a percentage of Revenue.`,
    PE_RATIO: [
        `Estimated Price to Earnings (PE) Ratio at the end of the projection period.`,
        '{Equation} \\text{Future Market Cap} = \\text{PE Ratio} * \\text{Projected Net Income}',
    ],
    _RISK_FREE_RATE: 'The risk-free rate represents the interest an investor would expect from an absolutely risk-free investment over a specified period of time.'+
    ' By default, it is equal to the current yield of the U.S. 10 Year Treasury Bond.',
    _MARKET_PREMIUM: 'Market risk premium represents the excess returns over the risk-free rate that investors expect for taking on the incremental risks connected to the equities market.',
    BETA: 'Beta is a value that measures the price fluctuations (volatility) of a stock with respect to fluctuations in the overall stock market.',
  });