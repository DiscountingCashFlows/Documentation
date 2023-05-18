// +----------------------------------------------------------+
//   Model: Discounted Free Cash Flow - Exit Multiple
//   © Copyright: https://discountingcashflows.com
// +----------------------------------------------------------+

Input(
  {
    _DISCOUNT_RATE: '',
    _REVENUE_GROWTH_RATE: '',
    EXIT_EBITDA_MULTIPLE: '',
    _EBITDA_MARGIN: '',
    _CAPITAL_EXPENDITURE_TO_EBITDA: '',
    _OPERATING_CASH_FLOW_TO_EBITDA: '',
    BETA:'',
    _RISK_FREE_RATE: '',
    _MARKET_PREMIUM: '',
    PROJECTION_YEARS: 5,
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
  get_balance_sheet_statement_quarterly(),
  get_cash_flow_statement(),
  get_cash_flow_statement_ltm(),
  get_profile(),
  get_treasury(),
  get_fx(),
  get_risk_premium()).done(
  function(_income, _income_ltm, _balance_quarterly, _flows, _flows_ltm, _profile, _treasury, _fx, _risk_premium){
  try{
    var response = new Response({
      income: _income,
      income_ltm: _income_ltm,
      balance_quarterly: _balance_quarterly,
      balance_ltm: 'balance_quarterly:0',
      flows: _flows,
      flows_ltm: _flows_ltm,
      profile: _profile,
      treasury: _treasury,
      risk_premium: _risk_premium,
    }).toOneCurrency('income', _fx).merge('_ltm');
    response.balance_ltm['date'] = 'LTM';
	var currency = response.currency;
    // +---------------- ASSUMPTIONS SECTION -----------------+ 
    // Set beta (used in calculating the discount rate)
    if(response.profile.beta){
    	setAssumption('BETA', response.profile.beta);
    }
    else{
    	setAssumption('BETA', 1);
    }
    // Risk free rate is the yield of the 10 year treasury note
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
    
    // Calculate the discount rate using the wacc formula
    var costOfEquity = getAssumption('_RISK_FREE_RATE') + getAssumption('BETA')*getAssumption('_MARKET_PREMIUM');
    var costOfDebt = response.income_ltm['interestExpense'] / response.balance_ltm['totalDebt'];
    var taxRate = response.income_ltm['incomeTaxExpense'] / response.income_ltm['incomeBeforeTax'];
    if(taxRate < 0)
    {
		taxRate = 0;
    }
    var marketCap = response.profile['mktCap'];
    
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
      'operatingCashFlow': new DateValueList(response.flows, 'operatingCashFlow'),
      'capitalExpenditure': new DateValueList(response.flows, 'capitalExpenditure'),
      'freeCashFlow': new DateValueList(response.flows, 'freeCashFlow'),
      'calculatedEbitda': new DateValueList(response.income, 'calculatedEbitda'),
    });
    var currentDate = original_data.lastDate();
    var nextYear = currentDate + 1;
    var forecastEndDate = currentDate + getAssumption('PROJECTION_YEARS');
    
    // Compute historical values and ratios
    var historical_computed_data = original_data.setFormula({
      '_operatingCashFlowToEbitda': ['operatingCashFlow:0', '/', 'calculatedEbitda:0'],
      '_capitalExpenditureToEbitda': ['capitalExpenditure:0', '/', 'calculatedEbitda:0'],
      '_netIncomeToEbitda': ['netIncome:0', '/', 'calculatedEbitda:0'],
      '_freeCashFlowToEbitda': ['freeCashFlow:0', '/', 'calculatedEbitda:0'],
      '_grossMargin': ['grossProfit:0', '/', 'revenue:0'],
      '_operatingMargin': ['operatingIncome:0', '/', 'revenue:0'],
      '_ebitdaMargin': ['calculatedEbitda:0', '/', 'revenue:0'],
      'discountedFreeCashFlow': ['freeCashFlow:0'],
      '_revenueGrowthRate': ['function:growth_rate', 'revenue'],
    }).compute();
    
    const ebitdaMargin = historical_computed_data.get('_ebitdaMargin').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average();
    setAssumption('_EBITDA_MARGIN', toP(ebitdaMargin) );
    // Calculate the average historical margin of operatingCashFlow (Cash From Operating Activities)
    const operatingCashFlowMargin = historical_computed_data.get('_operatingCashFlowToEbitda').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average();
    setAssumption('_OPERATING_CASH_FLOW_TO_EBITDA', toP(operatingCashFlowMargin));
    // Is negative by default, se we need to make it positive
    const capitalExpenditureMargin = -historical_computed_data.get('_capitalExpenditureToEbitda').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average(); 
    setAssumption('_CAPITAL_EXPENDITURE_TO_EBITDA', toP(capitalExpenditureMargin));
    const averageRevenueGrowthRate = historical_computed_data.get('_revenueGrowthRate').sublist(nextYear - getAssumption('HISTORICAL_YEARS')).average();
    setAssumption('_REVENUE_GROWTH_RATE',  toP(averageRevenueGrowthRate));
    var ev = marketCap + response.balance_ltm['totalDebt'] - response.balance_ltm['cashAndShortTermInvestments'];
    setAssumption('EXIT_EBITDA_MULTIPLE', ev/response.income_ltm['calculatedEbitda']);
    
    // Compute forecasted values and ratios
    var forecasted_data = historical_computed_data.removeDate('LTM').setFormula({
      'linearRegressionRevenue': ['function:linear_regression', 'revenue', {slope: 1, start_date: nextYear - getAssumption('HISTORICAL_YEARS')}],
      'revenue': ['function:compound', 'linearRegressionRevenue:start_date', {rate: getAssumption('_REVENUE_GROWTH_RATE'), start_date: nextYear}],
      'calculatedEbitda': ['revenue', '*',  getAssumption('_EBITDA_MARGIN')],
      '_revenueGrowthRate': ['function:growth_rate', 'revenue'],
      'operatingCashFlow': ['calculatedEbitda', '*', getAssumption('_OPERATING_CASH_FLOW_TO_EBITDA')],
      'computedCapitalExpenditure': ['calculatedEbitda', '*', getAssumption('_CAPITAL_EXPENDITURE_TO_EBITDA')],
      'freeCashFlow': ['operatingCashFlow:0', '-', 'computedCapitalExpenditure:0'],
      'capitalExpenditure': ['freeCashFlow:0', '-', 'operatingCashFlow:0'],
      'discountedFreeCashFlow': ['function:discount', 'freeCashFlow', {rate: getAssumption('_DISCOUNT_RATE'), start_date: currentDate}],
      '_operatingCashFlowToEbitda': ['operatingCashFlow:0', '/', 'calculatedEbitda:0'],
      '_capitalExpenditureToEbitda': ['capitalExpenditure:0', '/', 'calculatedEbitda:0'],
      '_freeCashFlowToEbitda': ['freeCashFlow:0', '/', 'calculatedEbitda:0'],
      '_ebitdaMargin': ['calculatedEbitda:0', '/', 'revenue:0'],
    }).setEditable(_edit(), {
      start_date: nextYear,
      keys: ['revenue', 'operatingCashFlow', 'freeCashFlow', 'calculatedEbitda'],
    }).compute({'forecast_end_date': forecastEndDate});
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    // Calculating the Terminal Value
    // TV = EV/EBITDA * EBITDA = INPUT.EXIT_EBITDA_MULTIPLE * Last Forecasted EBITDA
    var terminalValue = getAssumption('EXIT_EBITDA_MULTIPLE') * forecasted_data.get('calculatedEbitda').valueAtDate(forecastEndDate);
    // Discount the terminal value into the present
    var discountedTerminalValue = terminalValue/Math.pow(1 + getAssumption('_DISCOUNT_RATE'), getAssumption('PROJECTION_YEARS'));
    // Add all Discounted FCFs and the Discounted Terminal Value to calculate the Projected Enterprise Value
    var projectedEnterpriseValue = discountedTerminalValue + forecasted_data.get('discountedFreeCashFlow').sublist(nextYear).sum();
    // Equity value is calculated by adding cash and subtracting total debt
    var equityValue = projectedEnterpriseValue + response.balance_ltm['cashAndShortTermInvestments'] - response.balance_ltm['totalDebt'];
    var valuePerShare = equityValue/original_data.get('weightedAverageShsOut').valueAtDate('ltm');
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valuePerShare, currency)){
      return;
    }
    _SetEstimatedValue(valuePerShare, currency);
    // print(ev, 'Current Enterprise Value', '#', currency);
    // print(income_ltm['calculatedEbitda'], 'EBITDA', '#', currency);
    print(ev/response.income_ltm['calculatedEbitda'], 'Exit EBITDA Multiple (EV/EBITDA)', '#');
    print(forecasted_data.get('calculatedEbitda').valueAtDate(forecastEndDate), 'Terminal EBITDA', '#', currency);
    print(terminalValue, 'Terminal Enterprise Value', '#', currency);
    print(discountedTerminalValue, 'Discounted Terminal Enterprise Value', '#', currency);
    print(projectedEnterpriseValue-discountedTerminalValue, 'Sum of Discounted Free Cash Flow', '#', currency);
    print(projectedEnterpriseValue, 'Present Enterprise Value', '#', currency);
    print(response.balance_ltm['cashAndShortTermInvestments'], 'Cash and Equivalents', '#', currency);
    print(response.balance_ltm['totalDebt'], 'Total Debt', '#', currency);
    print(equityValue, 'Present Equity Value', '#', currency);
    print(original_data.get('weightedAverageShsOut').valueAtDate('ltm'), 'Shares Outstanding','#');
    print(valuePerShare, 'Estimated Value per Share', '#', currency);
    print(response.treasury.year10/100,'Yield of the U.S. 10 Year Treasury Note', '%');
    print(costOfEquity, 'Cost of Equity', '%');
    print(equityWeight, 'Equity Weight', '%');
    print(costOfDebt, 'Cost of Debt', '%');
    print(debtWeight, 'Debt Weight', '%');
    print(taxRate, 'EBIT Tax Rate', '%');
    // +------------- END OF MODEL VALUES SECTION ------------+
    
    // +------------------- CHARTS SECTION -------------------+    
    // Fill the chart with historical and forecasted data (in M or Millions)
    // The chart has editable forecasted points, so we need to make sure that
    // we overwrite forecasted data with any user edited data
    forecasted_data.renderChart({
      start_date: nextYear - getAssumption('HISTORICAL_YEARS'),
      keys: ['revenue', 'operatingCashFlow', 'calculatedEbitda', 'freeCashFlow', 'capitalExpenditure', 'linearRegressionRevenue', 'discountedFreeCashFlow'],
      properties: {
        title: 'Historical and forecasted data',
        currency: currency,
      	number_format: 'M',
      	disabled_keys: ['linearRegressionRevenue', 'discountedFreeCashFlow'],
      }
    });
    // +---------------- END OF CHARTS SECTION ---------------+ 
    
    // +------------------- TABLES SECTION -------------------+
    forecasted_data.removeDate('LTM').renderTable({
      start_date: currentDate,
      keys: ['revenue', '_revenueGrowthRate', 'calculatedEbitda', '_ebitdaMargin', 'operatingCashFlow', 
             '_operatingCashFlowToEbitda', 'capitalExpenditure', 
             '_capitalExpenditureToEbitda', 'freeCashFlow', 
             '_freeCashFlowToEbitda', 'discountedFreeCashFlow'],
      rows: ['Revenue', '{%} Revenue Growth Rate', 'EBITDA', '{%} EBITDA Margin', 'Operating Cash Flow', 
                '{%} Operating Cash Flow to EBITDA', 'Capital Expendtiture', 
                '{%} Capital Expendtiture to EBITDA', 'Free Cash Flow', 
                '{%} Free Cash Flow to EBITDA', 'Discounted Free Cash Flow'],
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
             'calculatedEbitda', '_ebitdaMargin', 'netIncome', '_netIncomeToEbitda',
             'operatingCashFlow', '_operatingCashFlowToEbitda',
             'capitalExpenditure', '_capitalExpenditureToEbitda', 
             'freeCashFlow', '_freeCashFlowToEbitda'],
      rows: ['Revenue', '{%} Revenue Growth Rate', 'Cost of Revenue', 'Gross Profit', '{%} Gross Margin', 
                'EBITDA', '{%} EBITDA Margin', 'Net Income', '{%} Net Income to EBITDA', 
             	'Cash from Operating Activities', '{%} Cash from Operating Activities to EBITDA', 
             'Capital Expenditure', '{%} Capital Expenditure to EBITDA', 
                'Free Cash Flow', '{%} Free Cash Flow to EBITDA'],
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

Description(`<p>Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.</p>
			<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discounted-free-cash-flow-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
			`);