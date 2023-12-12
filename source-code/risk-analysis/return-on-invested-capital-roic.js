/*
    Model: Return on Invested Capital (ROIC)
    
    © Copyright: 
        Discounting Cash Flows Inc. (discountingcashflows.com)
        8 The Green, Dover, DE 19901
*/

Input(
    {
        HISTORICAL_YEARS: 10,
    }
);

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement(),
  get_balance_sheet_statement_quarterly(2),
  get_fx()).done(
  function($income, $income_ltm, $balance, $balance_quarterly, $fx){
  try{
    var response = new Response({
        income: $income,
        income_ltm: $income_ltm,
        balance: $balance,
        balance_quarterly: $balance_quarterly,
        balance_ltm: 'balance_quarterly:0',
    }).toOneCurrency('income', $fx).merge('_ltm');
    response.balance[0]['date'] = 'LTM';
    
    // +---------------- ASSUMPTIONS SECTION -----------------+
    // Setup Original Data
    var original_data = new DateValueData({
        operatingIncome: new DateValueList(response.income, 'operatingIncome'),
        incomeBeforeTax: new DateValueList(response.income, 'incomeBeforeTax'),
        incomeTaxExpense: new DateValueList(response.income, 'incomeTaxExpense'),
        
        totalNonCurrentAssets: new DateValueList(response.balance, 'totalNonCurrentAssets'),
        totalCurrentAssets: new DateValueList(response.balance, 'totalCurrentAssets'),
        totalCurrentLiabilities: new DateValueList(response.balance, 'totalCurrentLiabilities'),
        cashAndCashEquivalents: new DateValueList(response.balance, 'cashAndCashEquivalents'),
    });
    
    var current_year = original_data.lastDate();
    var next_year = current_year + 1;
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
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
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    var roic = historical_computed_data.get('_roic').lastValue();
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(roic, '%')){
      return;
    }
    
    print(roic, 'Last Twelve Months ROIC', '%');
    // +------------- END OF MODEL VALUES SECTION ------------+
	
    // +------------------- CHARTS SECTION -------------------+
    historical_computed_data.renderChart({
      start_date: next_year - getAssumption('HISTORICAL_YEARS'),
      keys: ['_roic'],
      properties: {
        title: 'Historical ROIC Values',
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+ 
	
    // +------------------- TABLES SECTION -------------------+
    historical_computed_data.renderTable({
      start_date: next_year - getAssumption('HISTORICAL_YEARS'),
      data: {
          '{%} Return on Invested Capital (ROIC)': '_roic',
          'After-tax Operating Income': 'nopat',
          'Operating Income': 'operatingIncome',
          '{%} Income Tax Rate': '_taxRate',
          'Invested Capital': 'investedCapital',
          'Fixed (Non-Current) Assets': 'totalNonCurrentAssets',
          'Current Assets': 'totalCurrentAssets',
          'Current Liabilities': 'totalCurrentLiabilities',
          'Cash': 'cashAndCashEquivalents',
      },
      properties: {
        title: 'Historical data',
        currency: response.currency,
        column_order: 'descending',
        number_format: 'M',
        display_averages: true,
      },
    });
    // +---------------- END OF TABLES SECTION ---------------+
  }
  catch (error) {
    throwError(error);
  }
});

Description(`
	<h5>Return on Invested Capital (ROIC)</h5>
	<p>
	    The return on capital or invested capital in a business attempts to measure the return earned on capital invested in an investment
	    <span id="ROIC_FORMULA">
	        See the ROIC Formula
	    </span>
	</p>
	<p class='text-center'>
	    Read more: 
	    <a href='https://pages.stern.nyu.edu/~adamodar/pdfiles/papers/returnmeasures.pdf' target='_blank'>
	        Aswath Damodaran - Return Measures PDF
	    </a>
	</p>
`,
    {	
    ROIC_FORMULA: [
    	'{Equation} \\text{Return on Invested Capital (ROIC)} = \\frac{\\text{After-tax Operating Income}}{\\text{Invested Capital}}',
        '{Link} https://pages.stern.nyu.edu/~adamodar/pdfiles/papers/returnmeasures.pdf {LinkText} Aswath Damodaran - Return Measures PDF',
    	'{Title} After-tax Operating Income',
    	'{Paragraph} After-tax Operating Income or sometimes called Net Operating Profit After Tax (NOPAT) is calculated using the reported Earnings Before Interest and Taxes (EBIT) or Operating Income on the income statement adjusted for the tax liability.',
    	'{Equation} \\text{After-tax Operating Income} = \\text{Operating Income} * (1 - \\text{Income Tax Rate})',
    	'{Title} Invested Capital',
    	'{Paragraph} There are two ways to calculate invested capital: One looks at the company\'s assets, and another looks at its financing from debt and equity. In this model, we are using the Asset based approach.',
    	'{Equation} \\text{Invested Capital} = \\text{Total Non-Current Assets} + \\text{Total Current Assets} - \\text{Total Current Liabilities} - \\text{Cash and Equivalents}',
    	'{Equation} = \\text{Total Assets} - \\text{Total Current Liabilities} - \\text{Cash and Equivalents}',
    ],
    HISTORICAL_YEARS: 'Number of historical years used to calculate historical averages.',
});
