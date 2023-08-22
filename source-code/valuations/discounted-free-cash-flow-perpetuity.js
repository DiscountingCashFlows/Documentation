// +----------------------------------------------------------+
//   Model: Discounted Free Cash Flow - Perpetuity
//   © Copyright: https://discountingcashflows.com
// +----------------------------------------------------------+

Input(
  {
    _DISCOUNT_RATE: '',
    _GROWTH_IN_PERPETUITY: '',
    PROJECTION_YEARS: 5, 			
    HISTORICAL_YEARS: 10,
    REVENUE_REGRESSION_SLOPE: 1,
    _OPERATING_CASH_FLOW_MARGIN: '',
    _CAPITAL_EXPENDITURE_MARGIN: '',
    BETA:'',
    _RISK_FREE_RATE: '',
    _MARKET_PREMIUM: '',
  },
  [{
    parent:'_DISCOUNT_RATE',
    children:['BETA', '_RISK_FREE_RATE', '_MARKET_PREMIUM']
  }]
);

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement_quarterly('length:2'),
  get_cash_flow_statement(),
  get_cash_flow_statement_ltm(),
  get_profile(),
  get_treasury(),
  get_fx(),
  get_risk_premium()).done(
  function($income, $income_ltm, $balance_quarterly, $flows, $flows_ltm, $profile, $treasury, $fx, $risk_premium){
  try{
    // +------------------- PREPARING DATA -------------------+
    var response = new Response({
      income: $income,
      income_ltm: $income_ltm,
      balance_quarterly: $balance_quarterly,
      balance_ltm: 'balance_quarterly:0',
      flows: $flows,
      flows_ltm: $flows_ltm,
      profile: $profile,
      treasury: $treasury,
      risk_premium: $risk_premium,
    }).toOneCurrency('income', $fx).merge('_ltm');
    response.balance_ltm['date'] = 'LTM';
    // +--------------- END OF PREPARING DATA ----------------+
    
    // +---------------- ASSUMPTIONS SECTION -----------------+ 
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
    // Set the growth in perpetuity to the 10Y Treasury Yield
    setAssumption('_GROWTH_IN_PERPETUITY', response.treasury.year10);
    // Risk free rate is the yield of the 10 year treasury note
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
    
    // Set beta (used in calculating the discount rate)
    if(response.profile.beta){
    	setAssumption('BETA', response.profile.beta);
    }
    else{
    	setAssumption('BETA', 1);
    }
    
    // Calculate the discount rate using the wacc formula
    var costOfEquity = getAssumption('_RISK_FREE_RATE') + getAssumption('BETA')*getAssumption('_MARKET_PREMIUM');
    var costOfDebt = response.income_ltm['interestExpense'] / response.balance_ltm['totalDebt'];
    var taxRate = response.income_ltm['incomeTaxExpense'] / response.income_ltm['incomeBeforeTax'];
    if(taxRate < 0)
    {
		taxRate = 0;
    }
    var marketCap = response.profile['price'] * response.income_ltm['weightedAverageShsOut'];
    
    var debtWeight = response.balance_ltm['totalDebt'] / (marketCap + response.balance_ltm['totalDebt']);
    var equityWeight = marketCap / (marketCap + response.balance_ltm['totalDebt']);
    var wacc = debtWeight * costOfDebt * (1 - taxRate) + equityWeight * costOfEquity;
    
    // Set the Discount Rate
    setAssumption('_DISCOUNT_RATE', toP(wacc));
    
    // Setup Original Data
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
    });
    var currentDate = original_data.lastDate();
    var nextYear = currentDate + 1;
    var forecastEndDate = currentDate + getAssumption('PROJECTION_YEARS');
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      '_operatingCashFlowMargin': ['operatingCashFlow:0', '/', 'revenue:0'],
      '_capitalExpenditureMargin': ['capitalExpenditure:0', '/', 'revenue:0'],
      '_grossMargin': ['grossProfit:0', '/', 'revenue:0'],
      '_operatingMargin': ['operatingIncome:0', '/', 'revenue:0'],
      '_netMargin': ['netIncome:0', '/', 'revenue:0'],
      'discountedFreeCashFlow': ['freeCashFlow:0'],
      '_revenueGrowthRate': ['function:growth_rate', 'revenue'],
    }).compute();
    
    // Calculate the average historical margin of operatingCashFlow (Cash From Operating Activities)
    const operatingCashFlowMargin = historical_computed_data.get('_operatingCashFlowMargin').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average();
    setAssumption('_OPERATING_CASH_FLOW_MARGIN', toP(operatingCashFlowMargin));
    // Is negative by default, se we need to make it positive
    const capitalExpenditureMargin = -historical_computed_data.get('_capitalExpenditureMargin').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average(); 
    setAssumption('_CAPITAL_EXPENDITURE_MARGIN', toP(capitalExpenditureMargin));
    
    // Compute forecasted values and ratios
    var forecasted_data = historical_computed_data.removeDate('LTM').setFormula({
      'linearRegressionRevenue': ['function:linear_regression', 'revenue', {slope: getAssumption('REVENUE_REGRESSION_SLOPE'), start_date: nextYear - getAssumption('HISTORICAL_YEARS')}],
      'revenue': ['linearRegressionRevenue:0'],
      '_revenueGrowthRate': ['function:growth_rate', 'revenue'],
      'operatingCashFlow': ['revenue:0', '*', getAssumption('_OPERATING_CASH_FLOW_MARGIN')],
      'computedCapitalExpenditure': ['revenue:0', '*', getAssumption('_CAPITAL_EXPENDITURE_MARGIN')],
      'freeCashFlow': ['operatingCashFlow:0', '-', 'computedCapitalExpenditure:0'],
      'capitalExpenditure': ['freeCashFlow:0', '-', 'operatingCashFlow:0'],
      '_discountRate': [getAssumption('_DISCOUNT_RATE')],
      'discountedFreeCashFlow': ['function:discount', 'freeCashFlow', {rate: getAssumption('_DISCOUNT_RATE'), start_date: nextYear}],
      '_operatingCashFlowMargin': ['operatingCashFlow:0', '/', 'revenue:0'],
      '_capitalExpenditureMargin': ['capitalExpenditure:0', '/', 'revenue:0'],
      '_freeCashFlowMargin': ['freeCashFlow:0', '/', 'revenue:0'],
    }).setEditable(_edit(), {
      start_date: nextYear,
      keys: ['revenue', 'operatingCashFlow', 'freeCashFlow'],
    }).compute({'forecast_end_date': forecastEndDate}); 
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    // Calculating the Terminal Value
    // TV = FCF * (1 + Growth in Perpetuity) / (Discount Rate - Growth in Perpetuity)
    var terminalValue = forecasted_data.get('freeCashFlow').valueAtDate(forecastEndDate) * (1 + getAssumption('_GROWTH_IN_PERPETUITY') ) / (getAssumption('_DISCOUNT_RATE') - getAssumption('_GROWTH_IN_PERPETUITY') );
    // Discount the terminal value into the present
    var discountedTerminalValue = terminalValue/Math.pow(1 + getAssumption('_DISCOUNT_RATE'), getAssumption('PROJECTION_YEARS'));
    // Add all Discounted FCFs and the Discounted Terminal Value to calculate the Projected Enterprise Value
	var projectedEnterpriseValue = discountedTerminalValue + forecasted_data.get('discountedFreeCashFlow').sublist(nextYear).sum();
    // Equity value is calculated by adding cash and subtracting total debt
    var equityValue = projectedEnterpriseValue + response.balance_ltm['cashAndShortTermInvestments'] - response.balance_ltm['totalDebt'];
    var valuePerShare = equityValue/original_data.get('weightedAverageShsOut').valueAtDate('ltm');
    
      var currency = response.currency;
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valuePerShare, currency)){
      return;
    }
    print(terminalValue, 'Terminal Value', '#', currency);
    print(discountedTerminalValue, 'Discounted Terminal Value', '#', currency);
    print((projectedEnterpriseValue-discountedTerminalValue), 'Sum of Discounted Free Cash Flow', '#', currency);
    print(projectedEnterpriseValue, 'Enterprise Value', '#', currency);
    print(response.balance_ltm['cashAndShortTermInvestments'], 'Cash and Equivalents', '#', currency);
    print(response.balance_ltm['totalDebt'], 'Total Debt', '#', currency);
    print(equityValue, 'Equity Value', '#', currency);
    print(original_data.get('weightedAverageShsOut').valueAtDate('ltm'), 'Shares Outstanding','#');
    print(valuePerShare, 'Estimated Value per Share', '#', currency);
    print(response.treasury.year10/100,'Yield of the U.S. 10 Year Treasury Note', '%');
    print(operatingCashFlowMargin, 'Average Cash from Operating Activities Margin', '%');
    print(capitalExpenditureMargin, 'Average Capital Expenditure Margin', '%');
    print(costOfEquity, 'Cost of Equity', '%');
    print(equityWeight, 'Equity Weight', '%');
    print(costOfDebt, 'Cost of Debt', '%');
    print(debtWeight, 'Debt Weight', '%');
    print(taxRate, 'Tax Rate', '%');
    // Print the value to the top of the model
    _SetEstimatedValue(valuePerShare, response.currency);
    // +------------- END OF MODEL VALUES SECTION ------------+
    
    // +------------------- CHARTS SECTION -------------------+
    // Fill the chart with historical and forecasted data (in M or Millions)
    // The chart has editable forecasted points, so we need to make sure that
    // we overwrite forecasted data with any user edited data
    forecasted_data.removeDate('LTM').renderChart({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['revenue', 'operatingCashFlow', 'freeCashFlow', 'capitalExpenditure', 'linearRegressionRevenue', 'discountedFreeCashFlow'],
      properties: {
        title: 'Historical and forecasted data',
        currency: currency,
      	number_format: 'M',
      	disabled_keys: ['linearRegressionRevenue', 'discountedFreeCashFlow'],
      }
    });
	// +---------------- END OF CHARTS SECTION ---------------+  
    
    // +------------------- TABLES SECTION -------------------+
    // Estimated Future Data
    forecasted_data.removeDate('LTM').renderTable({
      start_date: nextYear - 1,
      keys: ['revenue', '_revenueGrowthRate', 'operatingCashFlow', '_operatingCashFlowMargin', 'capitalExpenditure', 
             '_capitalExpenditureMargin', 'freeCashFlow', '_freeCashFlowMargin', '_discountRate', 'discountedFreeCashFlow'],
      rows: ['Revenue', '{%} Revenue Growth Rate', 'Operating Cash Flow', '{%} Operating Cash Flow Margin', 'Capital Expendtiture', 
                '{%} Capital Expendtiture Margin', 'Free Cash Flow', '{%} Free Cash Flow Margin', '{%} Discount Rate', 'Discounted Free Cash Flow'],
      properties: {
        'title': 'Estimated Future Data',
        'currency': currency,
        'column_order': 'ascending',
      	'number_format': 'M',
      }
    });
    
    // Historical Table
    historical_computed_data.renderTable({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['revenue', '_revenueGrowthRate', 'costOfRevenue', 'grossProfit', '_grossMargin',
             'operatingIncome', '_operatingMargin', 'netIncome', '_netMargin',
             'operatingCashFlow', '_operatingCashFlowMargin',
             'capitalExpenditure', 'freeCashFlow'],
      rows: ['Revenue', '{%} Revenue Growth Rate', 'Cost of Revenue', 'Gross Profit', '{%} Gross Margin', 
                'Operating Income', '{%} Operating Margin', 'Net Income', '{%} Net Margin', 
                'Cash from Operating Activities', '{%} Cash from Operating Activities Margin',
                'Capital Expenditure', 'Free Cash Flow'],
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

Description(`<h5>Discounted Free Cash Flow Model</h5>
			<p>Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.</p>
			<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discounted-free-cash-flow-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
			`,
  {
    _DISCOUNT_RATE: [
      '{Equation} \\text{Discount Rate} = \\text{Equity Weight} * \\text{Cost of Equity} + \\text{Debt Weight} * \\text{Cost of Debt} * (1 - \\text{Tax Rate})',
      '{Paragraph} Calculated using Weighted Average Cost of Capital (WACC) formula. It represents a firm’s average after-tax cost of capital from all sources, including common stock, preferred stock, bonds, and other forms of debt.',
      '{Link} https://www.investopedia.com/terms/w/wacc.asp',
      
      '{Title} Cost of Equity',
      '{Equation} \\text{Cost of Equity} = \\text{Risk Free Rate} + \\text{Beta} * \\text{Market Premium}',
      '{Paragraph} The cost of equity is the theoretical rate of return that an equity investment should generate. It is calculated using the CAPM formula.',
      '{Link} https://www.investopedia.com/terms/c/costofequity.asp#mntl-sc-block_1-0-20',
      
      '{Title} Cost of Debt',
      '{Equation} \\text{Cost of Debt} = \\frac{\\text{Interest Expense}}{\\text{Total Debt}}',
      '{Paragraph} The cost of debt is the effective rate that a company pays on its debt, such as bonds and loans.',
      '{Link} https://www.investopedia.com/terms/c/costofdebt.asp',
      
      '{Title} Equity & Debt Weights',
      '{Equation} \\text{Debt Weight} = \\frac{\\text{Total Debt}}{\\text{Market Capitalization} + \\text{Total Debt}} = 1 - \\text{Equity Weight}',
      '{Paragraph} The Equity Weight represents the proportion of equity-based financing (Market Capitalization), while the Debt Weight represents the proportion of debt-based financing (Total Debt).',
      
      '{Title} Tax Rate',
      '{Equation} \\text{Tax Rate} = \\frac{\\text{Income Tax Expense}}{\\text{Income Before Tax}}',
      '{Paragraph} The overall tax rate paid by the company on its earned income.',
    ],
    _GROWTH_IN_PERPETUITY: 'The rate at which the company\'s free cash flow is assumed to grow in perpetuity. By default, this is equal to the yield of the U.S. 10 Year Treasury Bond.',
    _OPERATING_CASH_FLOW_MARGIN: [
      '{Equation} \\text{Projected Operating Cash Flow} = \\text{Projected Revenue} * \\text{Operating Cash Flow Margin}',
      'The margin used to project future Operating Cash Flow as a % from future Revenue.',
    ],
    _CAPITAL_EXPENDITURE_MARGIN: [
      '{Equation} \\text{Projected Free Cash Flow} = \\text{Projected Operating Cash Flow} - \\text{Projected Revenue} * \\text{Capital Expedinture Margin}',
      'The margin used to project future Capital Expedinture as a % from future Revenue, which is then used to calculate the Free Cash Flow.',
    ],	
    HISTORICAL_YEARS: 'Number of historical years used to calculate historical averages.',
    REVENUE_REGRESSION_SLOPE: `Future revenues are projected using a linear regression curve of past revenues.
      Set the slope:
      '>1' for a steeper revenue regression curve
      '0' for flat
      '<0' for inverse slope`,
    _RISK_FREE_RATE: 'The risk-free rate represents the interest an investor would expect from an absolutely risk-free investment over a specified period of time.'+
    ' By default, it is equal to the current yield of the U.S. 10 Year Treasury Bond.',
    _MARKET_PREMIUM: 'Market risk premium represents the excess returns over the risk-free rate that investors expect for taking on the incremental risks connected to the equities market.',
    BETA: 'Beta is a value that measures the price fluctuations (volatility) of a stock with respect to fluctuations in the overall stock market.',
  });
