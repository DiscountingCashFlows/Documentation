// +------------------------------------------------------------+
//   Model: Annual Margin Report				
//   © Copyright: https://discountingcashflows.com
// +------------------------------------------------------------+

Input(
  {
    YEARS: 10,
  }
);

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement(),
  get_cash_flow_statement(),
  get_cash_flow_statement_ltm(),
  get_fx()).done(
  function(_income, _income_ltm, _balance, _flows, _flows_ltm, _fx){
  try{
    var response = new Response({
      income: _income,
      income_ltm: _income_ltm,
      balance: _balance,
      flows: _flows,
      flows_ltm: _flows_ltm,
    }).toOneCurrency('income', _fx).merge('_ltm');
    var currency = response.currency;
    
    var original_data = new DateValueData({
      'revenue': new DateValueList(response.income, 'revenue'),
      'costOfRevenue': new DateValueList(response.income, 'costOfRevenue'),
      'grossProfit': new DateValueList(response.income, 'grossProfit'),
      'operatingIncome': new DateValueList(response.income, 'operatingIncome'),
      'netIncome': new DateValueList(response.income, 'netIncome'),
      'weightedAverageShsOut': new DateValueList(response.income, 'weightedAverageShsOut'),
      'eps': new DateValueList(response.income, 'eps'),
      'operatingCashFlow': new DateValueList(response.flows, 'operatingCashFlow'),
      'capitalExpenditure': new DateValueList(response.flows, 'capitalExpenditure'),
      'freeCashFlow': new DateValueList(response.flows, 'freeCashFlow'),
      'netCashProvidedByOperatingActivities': new DateValueList(response.flows, 'netCashProvidedByOperatingActivities'),
      'depreciationAndAmortization': new DateValueList(response.flows, 'depreciationAndAmortization'),
    });
    
    var currentDate = original_data.lastDate();
    var nextYearDate = currentDate + 1;
    var startDate = nextYearDate - getAssumption('YEARS');
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      '_revenueMargin': [1],
      '_operatingCashFlowMargin': ['operatingCashFlow:0', '/', 'revenue:0'],
      '_netCashProvidedByOperatingActivitiesMargin': ['netCashProvidedByOperatingActivities:0', '/', 'revenue:0'],
      '_freeCashFlowMargin': ['freeCashFlow:0', '/', 'revenue:0'],
      '_capitalExpenditureMargin': ['capitalExpenditure:0', '/', 'revenue:0'],
      '_grossMargin': ['grossProfit:0', '/', 'revenue:0'],
      '_operatingMargin': ['operatingIncome:0', '/', 'revenue:0'],
      '_netMargin': ['netIncome:0', '/', 'revenue:0'],
      'discountedFreeCashFlow': ['freeCashFlow:0'],
      '_revenueGrowthRate': ['function:growth_rate', 'revenue'],
      '_depreciationAndAmortizationMargin': ['depreciationAndAmortization:0', '/', 'revenue:0'],
    }).compute();
    
    // +------------------- CHARTS SECTION -------------------+
    historical_computed_data.renderChart({
      start_date: startDate,
      keys: ['_revenueMargin', '_netCashProvidedByOperatingActivitiesMargin', '_freeCashFlowMargin', '_netMargin', '_capitalExpenditureMargin'],
      properties: {
        title: 'Margin Analysis (% of Revenue)',
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+ 
	
    // +------------------- TABLES SECTION -------------------+    
    // Income Statement Table
    historical_computed_data.renderTable({
      start_date: startDate,
      keys: ['revenue', '_revenueGrowthRate', 'costOfRevenue', 'grossProfit', '_grossMargin',
             'operatingIncome', '_operatingMargin', 'netIncome', '_netMargin'],
      rows: ['Revenue', '{%} Revenue Growth Rate', 'Cost of Revenue', 'Gross Profit', '{%} Gross Margin', 
                'Operating Income', '{%} Operating Margin', 'Net Income', '{%} Net Margin'],
      properties: {
        'title': 'Income Statement Margins',
        'currency': currency,
        'number_format': 'M',
        'display_averages': true,
        'column_order': 'descending',
      },
    });    
    // Cash Flow Statement Table
    historical_computed_data.renderTable({
      start_date: startDate,
      keys: ['revenue', '_netCashProvidedByOperatingActivitiesMargin', 'netCashProvidedByOperatingActivities', '_freeCashFlowMargin', 'freeCashFlow', 
             '_depreciationAndAmortizationMargin', 'depreciationAndAmortization', '_capitalExpenditureMargin', 'capitalExpenditure'],
      rows: ['Revenue', '{%} Cash From Operating Activities Margin', 'Cash From Operating Activities', '{%} Free Cash Flow Margin', 'Free Cash Flow', 
             '{%} Depreciation and Amortization Margin', 'Depreciation and Amortization', '{%} Capital Expenditure Margin', 'Capital Expenditure'],
      properties: {
        'title': 'Cash Flow Statement Margins',
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
	<h5>Annual Margin Analysis Report</h5>
	Margins refer to the ratio between a financial report item and the revenue (Example: Net Income Margin = Net Income / Revenue).
	This analysis provides a report of the company's key margins, which could be further used in a valuation model.
`);
