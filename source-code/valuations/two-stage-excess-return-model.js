// +------------------------------------------------------------+
//   Model: Two-Stage Excess Return Model 								
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

Input(
	{
		_DISCOUNT_RATE: '',
		HIGH_GROWTH_YEARS: 5,
		_STABLE_RETURN_ON_EQUITY: '',
		_STABLE_GROWTH_IN_PERPETUITY: '',
		_MARKET_PREMIUM: '',
		_RISK_FREE_RATE: '',
		BETA: '',
		HISTORICAL_YEARS: 10,
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
  get_profile(),
  get_dividends_annual(),
  get_treasury(),
  get_fx(),
  get_risk_premium()).done(
  function($income, $income_ltm, $balance, $balance_quarterly, $profile, $dividends, $treasury, $fx, $risk_premium){
  try{    
    var response = new Response({
      income: $income,
      income_ltm: $income_ltm,
      balance: $balance,
      balance_quarterly: $balance_quarterly,
      balance_ltm: 'balance_quarterly:0',
      profile: $profile,
      treasury: $treasury,
      dividends: $dividends,
      risk_premium: $risk_premium,
    }).toOneCurrency('income', $fx).merge('_ltm');
    response.balance[0]['date'] = 'LTM';
    
    // +---------------- ASSUMPTIONS SECTION -----------------+
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
    setAssumption('_STABLE_GROWTH_IN_PERPETUITY', response.treasury.year10);
    if(response.profile.beta){
    	setAssumption('BETA', response.profile.beta);
    }
    else{
    	setAssumption('BETA', 1);
    }
    setAssumption('_DISCOUNT_RATE', toP(getAssumption('_RISK_FREE_RATE') + getAssumption('BETA')*getAssumption('_MARKET_PREMIUM')));
	
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
    });
    var currentDate = original_data.lastDate();
    var nextYear = currentDate + 1;
    var forecast_end_date = currentDate + getAssumption('HIGH_GROWTH_YEARS');
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      'commonIncome': commonIncome,
      'preferredStockDividends': ['netIncome:0', '-', 'commonIncome:0'],
      'dividendsPaidToCommon': ['adjDividend:0', '*', 'weightedAverageShsOut:0'],
      'bookValue': ['totalStockholdersEquity:0', '/', 'weightedAverageShsOut:0'],
      '_returnOnEquity': ['commonIncome:0', '/', 'totalStockholdersEquity:-1'],
      '_payoutRatio': ['adjDividend:0', '/', 'eps:0'],
      'retainedEarnings': ['eps:0', '-', 'adjDividend:0'],
      '_adjDividendGrowth': ['function:growth_rate', 'adjDividend'],
      'index': [1],
    }).compute();
    
    var averagePayoutRatio = historical_computed_data.get('_payoutRatio').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average();
    var averageReturnOnEquity = historical_computed_data.get('_returnOnEquity').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average();
	setAssumption('_STABLE_RETURN_ON_EQUITY', toP(averageReturnOnEquity));
    var stablePayoutRatio = 1 - (getAssumption('_STABLE_GROWTH_IN_PERPETUITY') / getAssumption('_STABLE_RETURN_ON_EQUITY'));
    
    // Compute forecasted values and ratios
    var forecasted_data = historical_computed_data.setFormula({
      'bookValue': ['bookValue:-1', '+', 'retainedEarnings:0'],
      'eps': ['bookValue:-1', '*', getAssumption('_STABLE_RETURN_ON_EQUITY')],
      'adjDividend': ['eps:0', '*', '_payoutRatio:0'],
      'retainedEarnings': ['eps:0', '-', 'adjDividend:0'],
      '_returnOnEquity': ['eps:0', '/', 'bookValue:-1'],
      'equityCostPerShare': ['bookValue:-1', '*', '_costOfEquity:0'],
      'excessReturnPerShare': ['eps:0', '-', 'equityCostPerShare:0'],
      'discountedExcessReturnPerShare': ['function:discount', 'excessReturnPerShare', {rate: '_costOfEquity', start_date: currentDate}],
      '_costOfEquity': [getAssumption('_DISCOUNT_RATE')],
      'index': ['index:-1', '+', 1],
      '_payoutIncrease': ['index:0', '*', (stablePayoutRatio - averagePayoutRatio)/(getAssumption('HIGH_GROWTH_YEARS'))],
      '_payoutRatio': ['_payoutIncrease:-1', '+', averagePayoutRatio],
      'beginningBookValue': ['bookValue:-1'],
    }).setEditable(_edit(), {
      start_date: nextYear,
      keys: ['bookValue', '_payoutRatio', '_returnOnEquity', '_costOfEquity'],
    }).compute({forecast_end_date: forecast_end_date});
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    // Terminal year value calculation
    var terminalBookValue = forecasted_data.get('bookValue').valueAtDate(forecast_end_date);
    var terminalEPS = terminalBookValue * getAssumption('_STABLE_RETURN_ON_EQUITY');
    var terminalEquityCost = terminalBookValue * getAssumption('_DISCOUNT_RATE');
    var terminalExcessReturn = terminalBookValue * (getAssumption('_STABLE_RETURN_ON_EQUITY') - getAssumption('_DISCOUNT_RATE'));
    if(terminalExcessReturn <= 0){
        warning("Excess return is negative. The Cost of Equity (Discount Rate) is higher than the Return on Equity.");
    }
    var sumOfDiscountedExcessReturns = forecasted_data.get('discountedExcessReturnPerShare').sublist(nextYear).sum();
    var terminalValueOfExcessReturns = terminalExcessReturn / (getAssumption('_DISCOUNT_RATE') - getAssumption('_STABLE_GROWTH_IN_PERPETUITY'));
    var discountedTerminalValue = (terminalValueOfExcessReturns) / Math.pow(1 + getAssumption('_DISCOUNT_RATE'), getAssumption('HIGH_GROWTH_YEARS'));
    var ltmBookValueOfEquity = historical_computed_data.get('bookValue').valueAtDate('LTM');
	
    var valuePerShare = ltmBookValueOfEquity + discountedTerminalValue + sumOfDiscountedExcessReturns;
    var currency = response.currency;
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valuePerShare, currency)){
      return;
    }
    _SetEstimatedValue(valuePerShare, currency);
    print(valuePerShare, 'Estimated Value', '#', currency);
    print(ltmBookValueOfEquity, "Book value of equity invested", '#', currency);
    print(sumOfDiscountedExcessReturns, "Sum of discounted excess returns in Growth Stage", '#', currency);
    print(terminalEPS, "Terminal stage EPS", '#', currency);
    print(terminalBookValue, "Terminal stage Book Value", '#', currency);
    print(terminalEquityCost, "Terminal stage Equity Cost", '#', currency);
    print(discountedTerminalValue, "Discounted excess return in terminal stage", '#', currency);
    print(terminalValueOfExcessReturns, "Excess Returns in the Terminal Stage", '#', currency);
    print(getAssumption('_DISCOUNT_RATE'), "Terminal Cost of Equity (the discount rate)", '%');
    print(terminalExcessReturn, "Terminal year's excess return", '#', currency);
    print(averageReturnOnEquity, "Average historical Return on Equity", '%');
    print(averagePayoutRatio, "Average historical Payout Ratio", '%');
    print(stablePayoutRatio, "Payout Ratio in stable stage", '%');
    print(response.treasury.year10/100, 'Yield of the U.S. 10 Year Treasury Bond', '%');
    // +------------- END OF MODEL VALUES SECTION ------------+
    
    // +------------------- CHARTS SECTION -------------------+
    forecasted_data.removeDate('LTM').renderChart({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['bookValue', 'eps', 'adjDividend', '_payoutRatio', '_returnOnEquity', '_costOfEquity'],
      properties: {
        title: 'Historical and Forecasted Data',
        currency: currency,
        disabled_keys: ['_payoutRatio', '_returnOnEquity', '_costOfEquity'],
        hide_growth: ['_payoutRatio', '_returnOnEquity', '_costOfEquity'],
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+ 
    
    // +------------------- TABLES SECTION -------------------+
    // Dividend Table
    forecasted_data.removeDate('LTM').renderTable({
      start_date: currentDate,
      keys: ['beginningBookValue', 'bookValue', 'eps', '_returnOnEquity', 'adjDividend', '_payoutRatio', 
             'retainedEarnings', 'equityCostPerShare', '_costOfEquity', 'excessReturnPerShare', 'discountedExcessReturnPerShare'],
      rows: ['Beginning Book Value', 'Ending Book Value', 'EPS', '{%} Return on equity', 'Dividend', '{%} Payout Ratio',
                'Retained earnings', 'Equity cost', '{%} Cost of equity', 'Excess Return', 'Discounted Excess Return'],
      properties: {
        'title': 'Projected data (Per Share)',
        'currency': currency,
      },
    });
    
    // Historical Table
    historical_computed_data.renderTable({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['netIncome', 'totalStockholdersEquity', '_returnOnEquity', 'dividendsPaidToCommon',
             '_payoutRatio', 'weightedAverageShsOut', 'eps', 'adjDividend', '_adjDividendGrowth', 'bookValue'],
      rows: ['Net income', 'Equity', '{%} Return on equity', 'Dividends paid', 
             '{%} Payout ratio', 'Shares outstanding', '{PerShare} EPS',
             '{PerShare} Dividends', '{%} Dividend Growth Rate', '{PerShare} Ending Book Value'],
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
	<h5>Two-Stage Excess Return Model</h5>
	<p>Used to estimate the value of companies based on two stages of growth. An initial period of high growth, represented by [Sum of discounted excess returns in Growth Stage], followed by a period of stable growth, represented by [Discounted excess return in terminal stage]. Excess Return models are better suited to calculate the intrinsic value of a financial company than an enterprise valuation model (such as the Discounted Free Cash Flow Model).</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/excess-return-models.md#two-stage-excess-return-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
