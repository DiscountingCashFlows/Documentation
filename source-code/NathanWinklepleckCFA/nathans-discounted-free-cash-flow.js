// +---------------------------------------------------------------------------+
//   Model: Nathan's Discounted Free Cash Flow 
//
// 	 This model was built for Nathan Winklepleck (CFA)
// 	 Nathan's YouTube Channel: https://www.youtube.com/c/NathanWinklepleckCFA
//
//   Copyright: https://discountingcashflows.com, 2022			
// +---------------------------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: '',
                   _GROWTH_IN_PERPETUITY: '',
                   PROJECTION_YEARS: 5, 			
                   HISTORIC_YEARS: 10,
                   REVENUE_REGRESSION_SLOPE: 1,
                   _OPERATING_CASH_FLOW_MARGIN: ''
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
  get_treasury()).done(
  function(_income, _income_ltm, _balance_quarterly, _flows, _flows_ltm, _treasury){
    var context = [];
    // Create deep copies of reports. This section is needed for watchlist compatibility.
    var income = JSON.parse(JSON.stringify(_income));
    var income_ltm = JSON.parse(JSON.stringify(_income_ltm));
    var balance_quarterly = JSON.parse(JSON.stringify(_balance_quarterly));
    var flows = JSON.parse(JSON.stringify(_flows));
    var flows_ltm = JSON.parse(JSON.stringify(_flows_ltm));
    var treasury = JSON.parse(JSON.stringify(_treasury));
    
    // ---------------- SETTING ASSUMPTIONS SECTION ---------------- 
    var numberOfPeriods = GetIncomeSlicePeriods(income);
    income = income[0].slice(0, numberOfPeriods);
    income_ltm = income_ltm[0];
    balance_quarterly = balance_quarterly[0].slice(0, numberOfPeriods);
    flows = flows[0].slice(0, numberOfPeriods);
    flows_ltm = flows_ltm[0];
    
    // Add the revenue key to the flows report
    flows = addKey('revenue', income, flows);
    flows_ltm['revenue'] = income_ltm['revenue'];
    
    // Append the LTMs to the income and flows
    income.unshift(income_ltm);
    flows.unshift(flows_ltm);
    
    // Set the growth in perpetuity to the 10Y Treasury Yield
    setInputDefault('_GROWTH_IN_PERPETUITY', treasury[0][0]['year10']);
    
    // Set the Discount Rate to 10Y Treasury Yield + 4%
    setInputDefault('_DISCOUNT_RATE', treasury[0][0]['year10'] + 4);
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
    forecastedRevenue.push(toM(income_ltm['revenue']));
    for(var i=1; i<INPUT.PROJECTION_YEARS; i++){
      forecastedRevenue.push(linRevenue[flows.length + i - 1]);
    }
    forecastedRevenue = forecast(forecastedRevenue, 'revenue');
    
    forecastedOperatingCashFlow.push(toM(flows_ltm['operatingCashFlow']));
    for(var i=1; i<INPUT.PROJECTION_YEARS; i++){
      forecastedOperatingCashFlow.push(forecastedRevenue[i] * INPUT._OPERATING_CASH_FLOW_MARGIN);
      capitalExpenditure.push(forecastedRevenue[i] * capitalExpenditureMargin);
    }
    forecastedOperatingCashFlow = forecast(forecastedOperatingCashFlow, 'operatingCashFlow');
    
    forecastedFreeCashFlow.push(toM(flows_ltm['freeCashFlow']));
    for(var i=1; i<INPUT.PROJECTION_YEARS; i++){
      forecastedFreeCashFlow.push(forecastedOperatingCashFlow[i] - capitalExpenditure[i-1]);
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
    var equityValue = projectedEnterpriseValue + toM(balance_quarterly[0]['cashAndShortTermInvestments'] - balance_quarterly[0]['totalDebt']);
    var valuePerShare = equityValue/toM(income[0]['weightedAverageShsOut']);
    
    // Check if the currency is being converted 
	var currency = '';
	if('convertedCurrency' in income[0]){
		currency = income[0]['convertedCurrency'];
	}else{
		currency = income[0]['reportedCurrency'];
	}
	
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valuePerShare, currency)){
      return;
    }
    
    print(terminalValue, 'Terminal Value (mil. ' + currency + ')', '#');
    print(discountedTerminalValue, 'Discounted Terminal Value (mil. ' + currency + ')', '#');
    print(projectedEnterpriseValue-discountedTerminalValue, 'Sum of Estimated Discounted Free Cash Flows (mil. ' + currency + ')', '#');
    print(projectedEnterpriseValue, 'Enterprise Value (mil. ' + currency + ')', '#');
    print(toM(balance_quarterly[0]['cashAndShortTermInvestments']), 'Cash and Equivalents (mil. ' + currency + ')', '#');
    print(toM(balance_quarterly[0]['totalDebt']), 'Total Debt (mil ' + currency + ')', '#');
    print(equityValue, 'Equity Value (mil. ' + currency + ')', '#');
    print(toM(income[0]['weightedAverageShsOut']), 'Shares Outstanding (mil.)','#');
    print(valuePerShare, 'Estimated Value per Share (' + currency + ')', '#');
    print(treasury[0][0]['year10']/100,'Yield of the U.S. 10 Year Treasury Note', '%');
    print(operatingCashFlowMargin, 'Average Cash from Operating Activities Margin', '%');
    print(capitalExpenditureMargin, 'Average Capital Expenditure Margin', '%');
	// ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    
    // Print the value to the top of the model
    _SetEstimatedValue(valuePerShare, currency);
    
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
      data[col++].push((toM(flows[i_inverse]['capitalExpenditure'])));
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
                                Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.
								<br>
                                Nathan's YouTube Channel: <a href='https://www.youtube.com/c/NathanWinklepleckCFA' target='_blank'>https://www.youtube.com/c/NathanWinklepleckCFA</a>
							  `,`
                              <p>*Info: A text between square brackets <b>[Example]</b> is referring to a variable used in the model. And margins refer to % of Revenue</p>
                              <h5>Assumptions Description:</h5>
                              <ul>
                                <li><b>[Discount Rate]</b> This is equal to the <b>[Yield of the U.S. 10 Year Treasury Note] + 4%</b> </li>
                                <li><b>[Growth In Perpetuity]</b> The rate at which the company is assumed to grow in perpetuity. By default, this is equal to the <b>[Yield of the U.S. 10 Year Treasury Note]</b>.</li>
                                <li><b>[Projection Years]</b> Number of years for projecting future values. 5 years by default</li>
                                <li><b>[Historic Years]</b> Number of historic years used to calculate average margins. 10 years by default</li>
                                <li><b>[Revenue Regression Slope]</b> Future revenues are projected using a linear regression curve of past revenues. Set the slope '>1' for a steeper revenue regression curve, '0' for flat, '<0' for inverse slope</li>
                                <li><b>[Operating Cash Flow Margin]</b> The margin of future Operating Cash Flow (or Cash From Operating Activities). This is by default the average Operating Cash Flow margin for the past <b>[Historic Years]</b></li>
                              </ul>
                              
                              <h5><b>Forecasting and discounting the Free Cash Flow:</b></h5>
                              <p>To estimate the future free cash flow, we use the <b>[Operating Cash Flow Margin]</b> and the <b>[Average Capital Expenditure Margin]</b>(calculated as the average capital expenditure margin for the past <b>[Historic Years]</b>). The difference between the two can be considered the free cash flow margin.
                              <div class="d-block text-center my-2">
                              \\( Free Cash Flow = Revenue * (Operating Cash Flow Margin - \\) \\(  Capital Expenditure Margin) \\)
                              </div>

                              <p>Then, we discount each Free Cash Flow to the present:</p>
                              <div class="d-block text-center my-2">
                                  \\( DiscountedFreeCashFlow(years) = \\) \\( {FreeCashFlow \\over (1 + DiscountRate)^{years}} \\)
                              </div>
                              <ul>
                               	<li>years: Number of years into the future, used to discount the respective cash flow</li>
                              </ul>
                              
                              <h5><b>[Terminal Value]</b></h5>
                              <p>
                              It is the value of the company expected at the end of the projection period.
                              Calculated using the Gordon Growth formula for growth in perpetuity based of the last free cash flow of the projection period.
                              </p>
                              <div class="d-block text-center my-2">
                                  \\( Terminal Value =  Last Free Cash Flow \\) \\( * (1 + GrowthInPerpetuity) / (DiscountRate - GrowthInPerpetuity )\\)
                              </div>
                              
                              <h5><b>[Discounted Terminal Value]</b></h5>
                              <div class="d-block text-center my-2">
                                  \\( DiscountedTerminalValue =  TerminalValue \\) \\( / (1+DiscountRate)^{ProjectionYears}\\)
                              </div>
                              
                              <h5><b>[Enterprise Value]</b></h5>
                              <p>Sum up all Discounted Cash Flows (for years 1 to <b>[Projection Years]</b>) and add Terminal Value:</p>
                              <div class="d-block text-center my-2">
                                  \\( EnterpriseValue = \\) \\( \\sum Discounted Free Cash Flow + TerminalValue \\)
                              </div>
                              
                              <h5><b>[Equity Value]</b></h5>
                              <p>From the <b>[Enterprise Value]</b>, add the <b>[Cash and Equivalents]</b> and subtract the <b>[Total Debt]</b> to get to the equity's value</p>
                              <div class="d-block text-center my-2">
                                  \\( EquityValue = \\) \\( EnterpriseValue + Cash And Equivalents - TotalDebt \\)
                              </div>
                              
                              <h5><b>[Estimated Value per Share]</b></h5>
                              <p>To get to the estimated value per share, we need to divide the <b>[Equity Value]</b> by the number of <b>[Shares Outstanding]</b></p>
                              <div class="d-block text-center my-2">
                                  \\( EstimatedValuePerShare = \\) \\( EquityValue / SharesOutstanding \\)
                              </div>
                              `);
