// +----------------------------------------------------------+
//   Model: Discounted Free Cash Flow 
//   Copyright: https://discountingcashflows.com, 2022			
// +----------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: '',
                   _GROWTH_IN_PERPETUITY: '',
                   PROJECTION_YEARS: 5, 			
                   HISTORIC_YEARS: 10,
                   REVENUE_REGRESSION_SLOPE: 1,
                   _OPERATING_CASH_FLOW_MARGIN: '',
                   BETA:'',
                   _RISK_FREE_RATE: '',
                   _MARKET_PREMIUM: 5.5,
                   }); 

function GetIncomeSlicePeriods(RawIncomeReport){
  // Remove Zero Revenue Periods From Income Statement
  var income = RawIncomeReport[0];
  var zero = false;
  for(var i = 0; i < income.length && i < INPUT.HISTORIC_YEARS; i++){
    if(income[i]['revenue'] == 0){
      if(!zero){
      	zero = true;
      }else{
        // if two periods have 0 revenue, return
        return i - 1;
      }
    }
  }
  return INPUT.HISTORIC_YEARS;
}

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement_quarterly(),
  get_cash_flow_statement(),
  get_cash_flow_statement_ltm(),
  get_profile(),
  get_treasury(),
  get_fx()).done(
  function(_income, _income_ltm, _balance_quarterly, _flows, _flows_ltm, _profile, _treasury, _fx){
    var context = [];
    // Create deep copies of reports. This section is needed for watchlist compatibility.
    var income = JSON.parse(JSON.stringify(_income));
    var income_ltm = JSON.parse(JSON.stringify(_income_ltm));
    var balance_last_quarter = JSON.parse(JSON.stringify(_balance_quarterly));
    var flows = JSON.parse(JSON.stringify(_flows));
    var flows_ltm = JSON.parse(JSON.stringify(_flows_ltm));
    var profile = JSON.parse(JSON.stringify(_profile));
    var treasury = JSON.parse(JSON.stringify(_treasury));
    var fx = JSON.parse(JSON.stringify(_fx));
    
    var numberOfPeriods = GetIncomeSlicePeriods(income);
    income = income[0].slice(0, numberOfPeriods);
    income_ltm = income_ltm[0];
    balance_last_quarter = balance_last_quarter[0][0];
    flows = flows[0].slice(0, numberOfPeriods);
    flows_ltm = flows_ltm[0];
    profile = profile[0][0];
    fx = fx[0];
    
    // Add the revenue key to the flows report
    flows = addKey('revenue', income, flows);
    flows_ltm['revenue'] = income_ltm['revenue'];
    
    // Append the LTMs to the income and flows
    income.unshift(income_ltm);
    flows.unshift(flows_ltm);
    
    // Check if the currency is being converted 
    // The profile can have a different currency from the reports.
	var currency = '';
    var currencyProfile = '';
    if('convertedCurrency' in profile){
		currencyProfile = profile['convertedCurrency'];
	}else{
		currencyProfile = profile['currency'];
	}
	if('convertedCurrency' in income[0]){
		currency = income[0]['convertedCurrency'];
	}else{
		currency = income[0]['reportedCurrency'];
	}	
    var ccyRate = currencyRate(fx,  currency, currencyProfile);
    
    // ---------------- SETTING ASSUMPTIONS SECTION ---------------- 
    // Set the growth in perpetuity to the 10Y Treasury Yield
    setInputDefault('_GROWTH_IN_PERPETUITY', treasury[0][0]['year10']);
    
    // Set beta (used in calculating the discount rate)
    if(profile.beta){
    	setInputDefault('BETA', profile.beta);
    }
    else{
    	setInputDefault('BETA', 1);
    }
    // Risk free rate is the yield of the 10 year treasury note
	setInputDefault('_RISK_FREE_RATE', treasury[0][0].year10);
    
    // Calculate the discount rate using the wacc formula
    var costOfEquity = INPUT._RISK_FREE_RATE + INPUT.BETA * INPUT._MARKET_PREMIUM;
    var costOfDebt = income_ltm['interestExpense'] / balance_last_quarter['totalDebt'];
    var taxRate = income_ltm['incomeTaxExpense'] / income_ltm['incomeBeforeTax'];
    if(taxRate < 0)
    {
		taxRate = 0;
    }
    var marketCap = profile['mktCap'] / ccyRate; // get the market cap in reports currency
    
    var debtWeight = balance_last_quarter['totalDebt'] / (marketCap + balance_last_quarter['totalDebt']);
    var equityWeight = marketCap / (marketCap + balance_last_quarter['totalDebt']);
    var wacc = debtWeight * costOfDebt * (1 - taxRate) + equityWeight * costOfEquity;
    
    // Set the Discount Rate to 10Y Treasury Yield + 4%
    setInputDefault('_DISCOUNT_RATE', 100*wacc);
    var linRevenue = linearRegressionGrowthRate('revenue', income, INPUT.PROJECTION_YEARS, INPUT.REVENUE_REGRESSION_SLOPE).slice(0,-1);
    for(var i in linRevenue){
      linRevenue[i] = toM(linRevenue[i]);
    }
    // Calculate the average historic margin of operatingCashFlow (Cash From Operating Activities)
    const operatingCashFlowMargin = averageMargin('operatingCashFlow', 'revenue', flows);
    setInputDefault('_OPERATING_CASH_FLOW_MARGIN', operatingCashFlowMargin * 100);
    const capitalExpenditureMargin = -averageMargin('capitalExpenditure', 'revenue', flows); // Is negative by default
    // ---------------- END OF SETTING ASSUMPTIONS SECTION ----------------
    
    // ---------------- CHARTS SECTION ---------------- 
    // Fill the chart with historic data (in M or Millions)
    fillHistoricUsingReport(flows.slice(1), 'revenue', 'M');
	fillHistoricUsingReport(flows.slice(1), 'operatingCashFlow', 'M');
	fillHistoricUsingReport(flows.slice(1), 'freeCashFlow', 'M');
    fillHistoricUsingList(linRevenue, 'linearRegressionRevenue');
    
    // chart forecasted lists (revenue, operatingCashFlow and freeCashFlow)
    var forecastedRevenue = [];
    var forecastedOperatingCashFlow = [];
    var capitalExpenditure = [];
    var forecastedFreeCashFlow = [];
    var discountedFreeCashFlow = [];
    for(var i=0; i<INPUT.PROJECTION_YEARS; i++){
      forecastedRevenue.push(linRevenue[flows.length + i - 1]);
    }
    forecastedRevenue = forecast(forecastedRevenue, 'revenue');
    
    for(var i=0; i<INPUT.PROJECTION_YEARS; i++){
      forecastedOperatingCashFlow.push(forecastedRevenue[i] * INPUT._OPERATING_CASH_FLOW_MARGIN);
      capitalExpenditure.push(forecastedRevenue[i] * capitalExpenditureMargin);
    }
    forecastedOperatingCashFlow = forecast(forecastedOperatingCashFlow, 'operatingCashFlow');
    
    for(var i=0; i<INPUT.PROJECTION_YEARS; i++){
      forecastedFreeCashFlow.push(forecastedOperatingCashFlow[i] - capitalExpenditure[i]);
    }
    forecastedFreeCashFlow = forecast(forecastedFreeCashFlow, 'freeCashFlow');
    for(var i=0; i<INPUT.PROJECTION_YEARS; i++){
      discountedFreeCashFlow.push(forecastedFreeCashFlow[i] / Math.pow(1 + INPUT._DISCOUNT_RATE, i + 1));
    }
    // ---------------- END OF CHARTS SECTION ---------------- 
    
    // ---------------- VALUES OF INTEREST SECTION ---------------- 
    // Calculating the Terminal Value
    // TV = FCF * (1 + Growth in Perpetuity) / (Discount Rate - Growth in Perpetuity)
    var terminalValue = forecastedFreeCashFlow[forecastedFreeCashFlow.length - 1] * (1 + INPUT._GROWTH_IN_PERPETUITY) / (INPUT._DISCOUNT_RATE - INPUT._GROWTH_IN_PERPETUITY );
    // Discount the terminal value into the present
    var discountedTerminalValue = terminalValue/Math.pow(1 + INPUT._DISCOUNT_RATE, INPUT.PROJECTION_YEARS);
    // Add all Discounted FCFs and the Discounted Terminal Value to calculate the Projected Enterprise Value
	var projectedEnterpriseValue = discountedTerminalValue;
    for(var i = 0; i < discountedFreeCashFlow.length; i++){
      projectedEnterpriseValue += discountedFreeCashFlow[i];
    }
    // Equity value is calculated by adding cash and subtracting total debt
    var equityValue = projectedEnterpriseValue + toM(balance_last_quarter['cashAndShortTermInvestments'] - balance_last_quarter['totalDebt']);
    var valuePerShare = equityValue/toM(income[0]['weightedAverageShsOut']);
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(ccyRate*valuePerShare, currencyProfile)){
      return;
    }
    print(terminalValue, 'Terminal Value', '#', currency);
    print(discountedTerminalValue, 'Discounted Terminal Value', '#', currency);
    print(projectedEnterpriseValue-discountedTerminalValue, 'Sum of Discounted Free Cash Flow', '#', currency);
    print(projectedEnterpriseValue, 'Enterprise Value', '#', currency);
    print(balance_last_quarter['cashAndShortTermInvestments'], 'Cash and Equivalents', '#', currency);
    print(balance_last_quarter['totalDebt'], 'Total Debt', '#', currency);
    print(equityValue, 'Equity Value', '#', currency);
    print(income[0]['weightedAverageShsOut'], 'Shares Outstanding','#');
    print(valuePerShare, 'Estimated Value per Share', '#', currency);
    print(treasury[0][0]['year10']/100,'Yield of the U.S. 10 Year Treasury Note', '%');
    print(operatingCashFlowMargin, 'Average Cash from Operating Activities Margin', '%');
    print(capitalExpenditureMargin, 'Average Capital Expenditure Margin', '%');
    print(costOfEquity, 'Cost of Equity', '%');
    print(equityWeight, 'Equity Weight', '%');
    print(costOfDebt, 'Cost of Debt', '%');
    print(debtWeight, 'Debt Weight', '%');
    print(taxRate, 'Tax Rate', '%');
	// ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    
    // Print the value to the top of the model
    _SetEstimatedValue(ccyRate*valuePerShare, currencyProfile);
    
    // ---------------- TABLES SECTION ---------------- 
    // Free Cash Flow Table
    var rows = ['Revenue', 'Operating Cash Flow', 'Operating Cash Flow Margin', 'Capital Expendtiture', 
                'Capital Expendtiture Margin', 'Free Cash Flow', 'Free Cash Flow Margin', 'Discounted Free Cash Flow'];
    var columns = [];
    var data = [];
    for(var i=0; i<rows.length; i++){
      data.push([]);
    }
    var lastYear = parseInt(income[0]['date']);
    for(var i=0; i<INPUT.PROJECTION_YEARS; i++){
      var col = 0;
      columns.push(lastYear + i);
      // revenue
      data[col++].push((forecastedRevenue[i]).toFixed(2));
      // operating cash flow
      data[col++].push((forecastedOperatingCashFlow[i]).toFixed(2));
      // operating cash flow margin
      data[col++].push((100*forecastedOperatingCashFlow[i]/forecastedRevenue[i]).toFixed(2) + '%');
      // capital expenditure
      data[col++].push(forecastedOperatingCashFlow[i] - forecastedFreeCashFlow[i]);
      // capital expenditure margin
      data[col++].push((100*(forecastedOperatingCashFlow[i] - forecastedFreeCashFlow[i]) / forecastedRevenue[i]).toFixed(2) + '%');
      // free cash flow
      data[col++].push((forecastedFreeCashFlow[i]).toFixed(2));
      // free cash flow margin
      data[col++].push((100*forecastedFreeCashFlow[i]/forecastedRevenue[i]).toFixed(2) + '%');
      // discounted free cash flow
      data[col++].push((discountedFreeCashFlow[i]).toFixed(2));
    }
    contextItem = {name:'Estimated Future Data (Mil. ' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
    // Historic Table
    var rows = ['Revenue', 'Revenue Growth Rate', 'Cost of Revenue', 'Gross Profit', 'Gross Margin', 
                'Operating Income', 'Operating Margin', 'Net Income', 'Net Margin', 
                'Cash from Operating Activities', 'Cash from Operating Activities Margin',
                'Capital Expenditure', 'Free Cash Flow'];
    var columns = [];
    var data = [];
    for(var i=0; i<rows.length; i++){
      data.push([]);
    }
    var firstYear = parseInt(income[income.length-1]['date']);
    
    for(var i = 0; i<income.length && i<flows.length; i++){
      var i_inverse = income.length - i - 1;
      var col = 0;
      if(i == income.length - 1){columns.push('LTM');}
      else{columns.push(firstYear + i);}
      // revenue
      data[col++].push(toM(income[i_inverse]['revenue']).toFixed(2));
      // revenue growth rate
      if(i > 0){
      	data[col++].push((100*(data[0][i] - data[0][i-1])/data[0][i-1]).toFixed(2) + '%');
      }
      else{
        data[col++].push('');
      }
      // cost of revenue 
      data[col++].push((toM(income[i_inverse]['costOfRevenue'])).toFixed(2));
      // gross profit 
      data[col++].push((toM(income[i_inverse]['grossProfit'])).toFixed(2));
      data[col++].push((100 * income[i_inverse]['grossProfit']/income[i_inverse]['revenue']).toFixed(2) + '%');
      // operating income
      data[col++].push((toM(income[i_inverse]['operatingIncome'])));
      data[col++].push((100 * income[i_inverse]['operatingIncome']/income[i_inverse]['revenue']).toFixed(2) + '%');
      // net income 
      data[col++].push((toM(income[i_inverse]['netIncome'])));
      data[col++].push((100*income[i_inverse]['netIncome']/income[i_inverse]['revenue']).toFixed(2) + '%');
      // cash from operating activities
      data[col++].push(toM(flows[i_inverse]['netCashProvidedByOperatingActivities']));
      data[col++].push((100*flows[i_inverse]['netCashProvidedByOperatingActivities']/income[i_inverse]['revenue']).toFixed(2) + '%');
      // Capital Expenditure(+Margin) 
      data[col++].push((toM(-flows[i_inverse]['capitalExpenditure'])));
      // Free Cash Flows
      data[col++].push((toM(flows[i_inverse]['freeCashFlow'])));
    }
    
    contextItem = {name:'Historic Data (Mil. ' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    // ---------------- END OF TABLES SECTION ---------------- 
	renderChart('Historic and Forecasted Data(In Mill. of ' + currency + ')');
    monitor(context);
});

var DESCRIPTION = Description(`<h5>Discounted Free Cash Flow Model</h5>
                                <p>Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.</p>
                                <p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discounted-free-cash-flow-model-source-code' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
                                `);
