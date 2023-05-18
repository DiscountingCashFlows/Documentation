// +------------------------------------------------------------+
//   Model: Simple Excess Return Model 								
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

Input(
  {
    _DISCOUNT_RATE: '',
    _RETURN_ON_EQUITY: '',
    _GROWTH_IN_PERPETUITY: '',
    _MARKET_PREMIUM: '',
    _RISK_FREE_RATE: '',
    BETA: '',
    HISTORICAL_YEARS: 10
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
  function(_income, _income_ltm, _balance, _balance_quarterly, _profile, _dividends, _treasury, _fx, _risk_premium){
  try{
    var response = new Response({
      income: _income,
      income_ltm: _income_ltm,
      balance: _balance,
      balance_quarterly: _balance_quarterly,
      balance_ltm: 'balance_quarterly:0',
      profile: _profile,
      treasury: _treasury,
      dividends: _dividends,
      risk_premium: _risk_premium,
    }).toOneCurrency('income', _fx).merge('_ltm');
    response.balance[0]['date'] = 'LTM';
    
    // +---------------- ASSUMPTIONS SECTION -----------------+
    // edit projectionYears if you need a longer projection period
    var projectionYears = 5;
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
    setAssumption('_GROWTH_IN_PERPETUITY', response.treasury.year10);
    setAssumption('BETA', response.profile['beta']);
    setAssumption('_DISCOUNT_RATE', toP(getAssumption('_RISK_FREE_RATE') + getAssumption('BETA')*getAssumption('_MARKET_PREMIUM')));
    
    var sensitivity = 0.01;
    var prefDividendsRatio = Math.abs((response.income[0].eps * response.income[0].weightedAverageShsOut - response.income[0].netIncome) / response.income[0].netIncome);
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
    var nextYear = original_data.lastDate() + 1;
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      'commonIncome': commonIncome,
      'preferredStockDividends': ['netIncome:0', '-', 'commonIncome:0'],
      'dividendsPaidToCommon': ['adjDividend:0', '*', 'weightedAverageShsOut:0'],
      'bookValue': ['totalStockholdersEquity:0', '/', 'weightedAverageShsOut:0'],
      '_returnOnEquity': ['commonIncome:0', '/', 'totalStockholdersEquity:-1'],
      '_payoutRatio': ['adjDividend:0', '/', 'eps:0'],
      'retainedEarnings': ['eps:0', '-', 'adjDividend:0'],
    }).compute();
    
    var averageReturnOnEquity = historical_computed_data.get('_returnOnEquity').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average();
	setAssumption('_RETURN_ON_EQUITY', toP(averageReturnOnEquity));
    var stable_payout_ratio = 1 - (getAssumption('_GROWTH_IN_PERPETUITY') / getAssumption('_RETURN_ON_EQUITY'));
    
    // Compute 5 years of forecasted values and ratios
    var forecasted_data = historical_computed_data.setFormula({
      'bookValue': ['bookValue:-1', '+', 'retainedEarnings:0'],
      'eps': ['bookValue:-1', '*', getAssumption('_RETURN_ON_EQUITY')],
      'adjDividend': ['eps:0', '*', stable_payout_ratio],
      'retainedEarnings': ['eps:0', '-', 'adjDividend:0'],
      '_returnOnEquity': ['eps:0', '/', 'bookValue:-1'],
      'equityCostPerShare': ['bookValue:-1', '*', getAssumption('_DISCOUNT_RATE')],
      'excessReturnPerShare': ['eps:0', '-', 'equityCostPerShare:0'],
      '_costOfEquity': [getAssumption('_DISCOUNT_RATE')],
      'beginningBookValue': ['bookValue:-1'],
    }).compute({'forecast_years': projectionYears});
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    var currency = response.currency;
    var bookValue = historical_computed_data.get('bookValue').valueAtDate('LTM');
    var excessReturns = forecasted_data.get('excessReturnPerShare').valueAtDate(nextYear);
    if(excessReturns <= 0){
        warning("Excess return is negative. Either EPS is negative or the Cost of Equity (Discount Rate) is higher than the Return on Equity.");
    }
    var terminalValue = excessReturns / (getAssumption('_DISCOUNT_RATE') - getAssumption('_GROWTH_IN_PERPETUITY'));
    var valuePerShare = terminalValue + bookValue;
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valuePerShare, currency)){
      return;
    }
    _SetEstimatedValue(valuePerShare, currency);

    print(valuePerShare, 'Estimated Value', '#', currency);
    print(bookValue, "Book value of equity invested", '#', currency);
    print(forecasted_data.get('bookValue').valueAtDate(nextYear), "Next year's estimated book value", '#', currency);
    print(terminalValue, "Present value of future excess returns", '#', currency);
    print(excessReturns, "Excess Return per share", '#', currency);
    print(getAssumption('_DISCOUNT_RATE'), "Cost of Equity (the discount rate)", '%');
    print(averageReturnOnEquity, "Average historical Return on Equity", '%');
    print(historical_computed_data.get('_payoutRatio').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average(), "Average historical Payout Ratio", '%');
    print(stable_payout_ratio, "Payout Ratio used", '%');
    print(response.treasury.year10/100, 'Risk Free Rate of the 10 Year U.S. Treasury Note', '%');
    // +------------- END OF MODEL VALUES SECTION ------------+
    
    // +------------------- CHARTS SECTION -------------------+
    forecasted_data.removeDate('LTM').renderChart({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['eps', 'bookValue', 'adjDividend', 'retainedEarnings'],
      properties: {
        'title': 'Historical and forecasted data',
        'currency': currency
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+
    
    // +------------------- TABLES SECTION -------------------+
    // Future Data Table
    forecasted_data.removeDate('LTM').renderTable({
      start_date: nextYear - 1,
      keys: ['beginningBookValue', 'bookValue', 'eps', '_returnOnEquity', 'adjDividend', 'retainedEarnings', 'equityCostPerShare', '_costOfEquity', 'excessReturnPerShare'],
      rows: ['Beginning Book Value', 'Ending Book Value', 'EPS available to common shareholders', '{%} Return on equity', 'Dividend', 
                'Retained earnings', 'Equity cost', '{%} Cost of equity', 'Excess return'],
      properties: {
        'title': 'Future data',
        'currency': currency + " (Per Share)",
        'column_order': 'ascending',
      }
    });
    var properties = {
      'title': 'Historical data',
      'currency': currency,
      'number_format': 'M',
      'display_averages': true,
      'column_order': 'descending',
    };
    
    if( prefDividendsRatio > sensitivity ){
      historical_computed_data.renderTable({
        start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
        keys: ['netIncome', 'preferredStockDividends', 'commonIncome', 
                 'totalStockholdersEquity', '_returnOnEquity', 'dividendsPaidToCommon', 
                 '_payoutRatio', 'weightedAverageShsOut', 'eps', 'adjDividend', 'bookValue'],
        rows: ['Net income','Calculated preferred stock dividends & premiums','Net income available to common shareholders', 
                  'Total Equity', '{%} Return on equity', 'Dividends paid to common shareholders',
                  '{%} Payout ratio to Common shareholders', 'Common shares outstanding', '{PerShare} EPS available to Common shareholders',
                  '{PerShare} Dividends', '{PerShare} Book Value'],
        properties: properties,
      });
    }
    else{
      historical_computed_data.renderTable({
        start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
        keys: ['netIncome', 'totalStockholdersEquity', '_returnOnEquity', 'dividendsPaidToCommon',
               '_payoutRatio', 'weightedAverageShsOut', 'eps', 'adjDividend', 'bookValue'],
        rows: ['Net income', 'Total Equity', '{%} Return on equity', 'Dividends paid',
               '{%} Payout ratio', 'Shares outstanding', '{PerShare} EPS',
               '{PerShare} Dividends', '{PerShare} Book Value'],
        properties: properties,
      });
    }
    // +---------------- END OF TABLES SECTION ---------------+
  }
  catch (error) {
    throwError(error);
  }
});

Description(`
	<h5>Simple Excess Return Model</h5>
	<p>Used to estimate the value of companies that have reached maturity and earn stable excess returns with little to no high growth chance. Excess Return models are better suited to calculate the intrinsic value of a financial company than an enterprise valuation model (such as the Discounted Free Cash Flow Model).</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/excess-return-models.md#simple-excess-return-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
