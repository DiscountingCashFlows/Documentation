// +------------------------------------------------------------+
// | Model: Discounted Free Cash Flow  							|
// | Copyright: https://discountingcashflows.com, 2022			|
// +------------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: 7.5,
                   _GROWTH_IN_PERPETUITY: '',
                   PROJECTION_YEARS: 5, 			
                   HISTORIC_YEARS: 10,
                   PROJECTED_REVENUE_SLOPE: 1,
                   _OPERATING_CASH_FLOW_MARGIN: ''
                   }); 

function GetIncomeSlicePeriods(RawIncomeReport){
  //Remove Zero Revenue Periods From Income Statement
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
    var income = JSON.parse(JSON.stringify(_income));
    var income_ltm = JSON.parse(JSON.stringify(_income_ltm));
    var balance_quarterly = JSON.parse(JSON.stringify(_balance_quarterly));
    var flows = JSON.parse(JSON.stringify(_flows));
    var flows_ltm = JSON.parse(JSON.stringify(_flows_ltm));
    var treasury = JSON.parse(JSON.stringify(_treasury));
    
    var numberOfPeriods = GetIncomeSlicePeriods(income);
    income = income[0].slice(0, numberOfPeriods);
    income_ltm = income_ltm[0];
    balance_quarterly = balance_quarterly[0].slice(0, numberOfPeriods);
    flows = flows[0].slice(0, numberOfPeriods);
    flows_ltm = flows_ltm[0];
    
    flows = addKey('revenue', income, flows);
    flows_ltm['revenue'] = income_ltm['revenue'];
    
    // Replace Last Annual Period with LTM Values
    flows = replaceWithLTM(flows, flows_ltm);
    income = replaceWithLTM(income, income_ltm);
    
    setInputDefault('_GROWTH_IN_PERPETUITY', treasury[0][0]['year10']);
    var linRevenue = linearRegressionGrowthRate('revenue', flows, INPUT.PROJECTION_YEARS, INPUT.PROJECTED_REVENUE_SLOPE);
    
    // Fill the chart with historic data (in M or Millions)
    fillHistoricUsingReport(flows, 'revenue', 'M');
	fillHistoricUsingReport(flows, 'operatingCashFlow', 'M');
	fillHistoricUsingReport(flows, 'freeCashFlow', 'M');
    
    const operatingCashFlowMargin = averageMargin('operatingCashFlow', 'revenue', flows);
    setInputDefault('_OPERATING_CASH_FLOW_MARGIN', operatingCashFlowMargin * 100);
    const capitalExpenditureMargin = -averageMargin('capitalExpenditure', 'revenue', flows); // Is negative by default

    // chart forecasted lists
    var forecastedRevenue = [];
    var forecastedOperatingCashFlow = [];
    var capitalExpenditure = [];
    var forecastedFreeCashFlow = [];
    var discountedFreeCashFlow = [];
    for(var i=0; i<INPUT.PROJECTION_YEARS; i++){
      // toM() divides the revenues by 1 million
      forecastedRevenue.push(toM(linRevenue[flows.length + i]));
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
    // Calculating the Terminal Value
    // TV = FCF * (1 + Growth in Perpetuity) / (Required Rate of Return - Growth in Perpetuity)
    // The FCF is already discounted so we can calculate the Discounted Terminal Value
    var discountedTerminalValue = discountedFreeCashFlow[discountedFreeCashFlow.length - 1] * (1 + INPUT._GROWTH_IN_PERPETUITY) / (INPUT._DISCOUNT_RATE - INPUT._GROWTH_IN_PERPETUITY );
    var terminalValue = forecastedFreeCashFlow[forecastedFreeCashFlow.length - 1] * (1 + INPUT._GROWTH_IN_PERPETUITY) / (INPUT._DISCOUNT_RATE - INPUT._GROWTH_IN_PERPETUITY )
    // Add all FCF and Terminal Value to calculate the Projected Enterprise Value
	var projectedEnterpriseValue = discountedTerminalValue;
    for(var i = 0; i < discountedFreeCashFlow.length; i++){
      projectedEnterpriseValue += discountedFreeCashFlow[i];
    }
    var equityValue = 1000000 * projectedEnterpriseValue + balance_quarterly[0]['cashAndShortTermInvestments'] - balance_quarterly[0]['totalDebt'];
    var valuePerShare = equityValue/income[0]['weightedAverageShsOut'];
    
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
    
    _SetEstimatedValue(valuePerShare, currency);
    print(valuePerShare, 'Present Value per Share (' + currency + ')', '#');
    print(terminalValue, 'Terminal Value (mil. ' + currency + ')', '#');
    print(discountedTerminalValue, 'Discounted Terminal Value (mil. ' + currency + ')', '#');
    print(projectedEnterpriseValue-discountedTerminalValue, 'Sum of Estimated Discounted Free Cash Flows (mil. ' + currency + ')', '#');
    print(projectedEnterpriseValue, 'Equity Value (mil. ' + currency + ')', '#');
    print(toM(balance_quarterly[0]['cashAndShortTermInvestments']), 'Cash and Equivalents (mil. ' + currency + ')', '#');
    print(toM(balance_quarterly[0]['totalDebt']), 'Total Debt (mil ' + currency + ')', '#');
    print(toM(equityValue), 'Total Equity Value (mil. ' + currency + ')', '#');
    print(toM(income[0]['weightedAverageShsOut']), 'Shares Outstanding (mil.)','#');

    // Free Cash Flow Table
    var rows = ['Free Cash Flow', 'Discounted Free Cash Flow'];
    var columns = [];
    var data = [[], []];
    var lastYear = parseInt(income[0]['date']);
    for(var i=0; i<INPUT.PROJECTION_YEARS; i++){
      columns.push(lastYear + i);
      data[0].push(forecastedFreeCashFlow[i]);
      data[1].push(discountedFreeCashFlow[i]);
    }
    contextItem = {name:'Estimated Future Data (Mil. ' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
    // Historic Table
    var rows = ['Revenue', 'Revenue Growth Rate%', 'Cost of Revenue', 
                'Gross Margin%', 'Gross Profit',
                'Operating Margin%', 'Operating Income', 'Net Income',
                'Capital Expenditure', 'Free Cash Flow'];
    var columns = [];
    var data = [[], [], [], [], [], [], [], [], [], []];
    var firstYear = parseInt(income[income.length-1]['date']);
    
    for(var i = 0; i<income.length && i<flows.length; i++){
      var i_inverse = income.length - i - 1;
      if(i == income.length - 1){columns.push('LTM');}
      else{columns.push(firstYear + i);}
      
      // revenue
      data[0].push((income[i_inverse]['revenue']/1000000).toFixed(2));
      // revenue growth rate
      if(i > 0){
      	data[1].push((100*(data[0][i] - data[0][i-1])/data[0][i-1]).toFixed(2) + '%');
      }
      else{
        data[1].push('');
      }
      // cost of revenue 
      data[2].push((toM(income[i_inverse]['costOfRevenue'])).toFixed(2));
      data[3].push((100 * income[i_inverse]['grossProfit']/income[i_inverse]['revenue']).toFixed(2) + '%');
      // gross profit 
      data[4].push((toM(income[i_inverse]['grossProfit'])).toFixed(2));
      // operating income
      data[5].push((100 * income[i_inverse]['operatingIncome']/income[i_inverse]['revenue']).toFixed(2) + '%');
      data[6].push((toM(income[i_inverse]['operatingIncome'])).toFixed(2));
      // net income 
      data[7].push((toM(income[i_inverse]['netIncome'])).toFixed(2));
      // Capital Expenditure(+Margin) 
      data[8].push((toM(flows[i_inverse]['capitalExpenditure'])).toFixed(2));
      // Free Cash Flows
      data[9].push((toM(flows[i_inverse]['freeCashFlow'])).toFixed(2));
    }    
    contextItem = {name:'Historic Data (Mil. ' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
	renderChart('Historic and Forecasted Data(In Mill. of ' + currency + ')');
    monitor(context);
});

var DESCRIPTION = Description(`<h5>Discounted Free Cash Flow Model</h5>
                                Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.
								<br>
                                More at: <a href='https://github.com/SimplyWallSt/Company-Analysis-Model/blob/master/MODEL.markdown#2-stage-free-cash-flow-model--how-is-this-calculated' target='_blank'>github.com/SimplyWallSt</a>
							  `,`
                              <p>User Inputs Description:</p>
                              <ul>
                                <li><b>Required Rate Of Return:</b> The estimated stock value will be calculated based on this annual rate of return</li>
                                <li><b>Growth In Perpetuity:</b> Rate at which the company is assumed to grow in perpetuity. By default, this is the 10 year treasury yield.</li>
                                <li><b>Projection Years:</b> Amount of years projecting into the future</li>
                                <li><b>Historic Years:</b> Past years used to calculate the average margins</li>
                                <li><b>Projected Revenue Slope:</b> '> 1' for steeper revenue curve, '0' for flat, '< 0' for inverse slope</li>
                                <li><b>Operating Cash Flow Margin:</b> Operating Cash Flow expressed as percent of Revenue </li>
                              </ul>
                              <p>Estimating the Free Cash Flow:</p>
                              <div class="d-block text-center my-2">
                              \\( Free Cash Flow = Revenue * (Operating Cash Flow Margin - \\) \\(  Capital Expenditure Margin) \\)
                              </div>

                              <p>Then, we discount each Free Cash Flow to Present:</p>
                              <div class="d-block text-center my-2">
                                  \\( Discounted Free Cash Flow = \\) \\( {Free Cash Flow \\over (1 + Required Rate Of Return)^{Years}} \\)
                              </div>
                              <ul>
                              	<li>Required Rate of Return: Annual rate of return required by the investor, used as the Discount Rate)</li>
                               	<li>Years: Number of years used to discount the respective Flow)</li>
                              </ul>
                              
                              <p>Sum up all Discounted Cash Flows and add Terminal Value:</p>
                              <div class="d-block text-center my-2">
                                  \\( Net Present Value = \\) \\( \\sum Discounted Free Cash Flow + TerminalValue \\)
                              </div>
                              <ul>
                              	<li>Terminal Value: Calculated using the Growth in Perpetuity based of the last estimated free cash flow</li>
                              </ul>
                              <div class="d-block text-center my-2">
                                  \\( Terminal Value =  Last Discounted Free Cash Flow \\) \\( * (1 + Growth In Perpetuity) / (RequiredRateOfReturn - Growth In Perpetuity )\\)
                              </div>
                              
                              *Margins refer to % of Revenue
                              `);
