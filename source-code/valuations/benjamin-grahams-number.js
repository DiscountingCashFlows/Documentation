/*
    Model: Benjamin Graham's Number
    
    © Copyright: 
        Discounting Cash Flows Inc. (discountingcashflows.com)
        8 The Green, Dover, DE 19901
*/

Input(
  {
    EARNINGS_PER_SHARE: '',
    BOOK_VALUE_PER_SHARE: '',
    GRAHAM_MULTIPLIER: 22.5,
    HISTORICAL_YEARS: 10
  }
);

$.when(
    get_income_statement(),
    get_income_statement_ltm(),
    get_balance_sheet_statement(),
    get_balance_sheet_statement_quarterly(2),
    get_dividends_annual(),
    get_prices_annual(),
    get_fx()).done(
  function($income, $income_ltm, $balance, $balance_quarterly, $dividends, $prices, $fx){
  try{
    var response = new Response({
        income: $income,
        income_ltm: $income_ltm,
        balance: $balance,
        balance_quarterly: $balance_quarterly,
        balance_ltm: 'balance_quarterly:0',
        dividends: $dividends,
        prices: $prices,
    }).toOneCurrency('income', $fx).merge('_ltm');
    response.balance[0]['date'] = response.prices[0]['date'] = 'LTM';
    
    // +---------------- ASSUMPTIONS SECTION -----------------+
    var original_data = new DateValueData({
      revenue: new DateValueList(response.income, 'revenue'),
      eps: new DateValueList(response.income, 'eps'),
      weightedAverageShsOut: new DateValueList(response.income, 'weightedAverageShsOut'),
      totalStockholdersEquity: new DateValueList(response.balance, 'totalStockholdersEquity'),
      marketPrice: new DateValueList(response.prices, 'close'),
      adjDividend: new DateValueList(response.dividends, 'adjDividend'),
    });
    var current_year = original_data.lastDate();
    var next_year = current_year + 1;
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      bookValue: ['totalStockholdersEquity:0', '/', 'weightedAverageShsOut:0'],
      var_1: ['bookValue:0', '*', 'eps'],
      var_2: ['var_1', '*', getAssumption('GRAHAM_MULTIPLIER')],
      grahamNumber: ['function:square_root', 'var_2'],
      _revenueGrowthRate: ['function:growth_rate', 'revenue'],
    }).compute();
    
    setAssumption('EARNINGS_PER_SHARE', response.income_ltm.eps);
    setAssumption('BOOK_VALUE_PER_SHARE', response.balance_quarterly[0].totalStockholdersEquity / response.income_ltm.weightedAverageShsOut);
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    var number = Math.sqrt(getAssumption('GRAHAM_MULTIPLIER') * getAssumption('BOOK_VALUE_PER_SHARE') * getAssumption('EARNINGS_PER_SHARE'));
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(number, response.currency)){
      return;
    }
    _SetEstimatedValue(number, response.currency);
    print(number, 'Benjamin Graham\'s Number', '#', response.currency);
    print(getAssumption('EARNINGS_PER_SHARE'), 'Earnings Per Share (EPS)', '#', response.currency);
    print(getAssumption('BOOK_VALUE_PER_SHARE'), 'Book Value Per Share', '#', response.currency);
    const averageRevenueGrowthRate = historical_computed_data.get('_revenueGrowthRate').sublist(next_year - getAssumption('HISTORICAL_YEARS')).average();
    print(averageRevenueGrowthRate, 'Average Revenue Growth Rate', '%');
    // Potential valuation warnings
    if(averageRevenueGrowthRate > toN(10)){
        print('{Danger} Average Revenue Growth Rate '+ toP(averageRevenueGrowthRate).toFixed(2) +'% is higher than 10%.');
    }
    const averageRevenue = historical_computed_data.get('revenue').sublist(next_year - getAssumption('HISTORICAL_YEARS')).average();
    print(averageRevenue, 'Average Revenue', '#', response.currency);
    if(averageRevenue < 100/toM(1)){
        print('{Danger} Average Revenue '+ toM(averageRevenue).toFixed(2) +' Million is lower than 100 Million.');
    }
    const minimumEps = historical_computed_data.get('eps').sublist(next_year - getAssumption('HISTORICAL_YEARS')).minimum();
    print(minimumEps, 'Lowest EPS', '#', response.currency)
    if(minimumEps < 0){
        print('{Danger} EPS is negative! Applying this valuation can be misleading.');
    }
    const dividendsCount = response.dividends.length - 1;
    if(dividendsCount < 20){
        print('{Danger} Company does not have 20 years of consistent dividend payments.');
    }
    print(response.balance_ltm['totalCurrentAssets'], 'Current Assets', '#', response.currency);
    print(response.balance_ltm['totalCurrentLiabilities'], 'Current Liabilities', '#', response.currency);
    if(response.balance_ltm['totalCurrentAssets'] < 2 * response.balance_ltm['totalCurrentLiabilities']){
        print('{Danger} Current assets should be at least twice current liabilities.');
    }
    const workingCapital = response.balance_ltm['totalCurrentAssets'] - response.balance_ltm['totalCurrentLiabilities'];
    print(workingCapital, 'Working Capital', '#', response.currency);
    print(response.balance_ltm['longTermDebt'], 'Long Term Debt', '#', response.currency);
    if(response.balance_ltm['longTermDebt'] > workingCapital){
        print('{Danger} Long Term Debt exceeds the working capital.');
    }
    // +------------- END OF MODEL VALUES SECTION ------------+
	
    // +------------------- CHARTS SECTION -------------------+
    var startDate = original_data.lastDate() + 1 - getAssumption('HISTORICAL_YEARS');
    historical_computed_data.renderChart({
      start_date: startDate,
      keys: ['eps', 'bookValue', 'grahamNumber', 'adjDividend'],
      properties: {
        title: 'Historical numbers',
        currency: response.currency,
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+ 
	
    // +------------------- TABLES SECTION -------------------+
    historical_computed_data.renderTable({
      start_date: startDate,
      keys: ['eps', 'bookValue', 'grahamNumber', 'marketPrice'],
      rows: ['Earnings Per Share (EPS)', 'Book Value Per Share', 
      'Graham\'s Number', 'Reference Market Price'],
      properties: {
        title: 'Historical data',
        currency: response.currency,
        display_averages: true,
        column_order: 'descending',
      },
    });
    // +---------------- END OF TABLES SECTION ---------------+
  }
  catch (error) {
    throwError(error);
  }
});

Description(`
	<h5>Benjamin Graham's Number</h5>
	<p>
	Graham number is a method developed for the defensive investors as described in CHAPTER 14 in The Intelligent Investor. 
	It evaluates a stock’s intrinsic value by calculating the square root of <b>22.5</b> times the multiplied value of the company’s <b>EPS</b> and <b>BVPS</b>.
	<br>
	<b>This fundamental value formula does not apply to asset-light companies with high growth rate and companies with negative earnings.</b>
	</p>
	<p class='text-center'>Read more: <a href='https://www.grahamvalue.com/article/using-graham-number-correctly' target='_blank'><i class="fab fa-github"></i> Using The Graham Number Correctly</a></p>
`,
  {
    BOOK_VALUE_PER_SHARE: [
        'A company\'s book value is the total shareholders\' equity from the balance sheet. We use the book value per share.',
        '{Equation} \\text{Book Value Per Share} = \\frac{\\text{Total Equity}}{\\text{Shares Outstanding}}',
    ],	
    HISTORICAL_YEARS: 'Number of historical years used to calculate historical averages.',
    GRAHAM_MULTIPLIER: [
        'According to Benjamin Graham, the current price should not be more than 1.5 times the book value last reported. However, a multiplier of earnings below 15 could justify a correspondingly higher multiplier of assets. As a rule of thumb, the product of the multiplier times the ratio of price to book value should not exceed 22.5.',
        '{Equation} \\text{Graham\'s Number} = \\sqrt{15 * 1.5 * \\text{EPS} * \\text{Book Value}} = \\sqrt{\\text{Graham Multiplier} * \\text{EPS} * \\text{Book Value}}',
    ]
  });
