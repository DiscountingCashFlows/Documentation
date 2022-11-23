// +------------------------------------------------------------+
//   Model: Discounted Future Market Cap	
//   Copyright: https://discountingcashflows.com, 2022	
// +------------------------------------------------------------+
var INPUT = Input({_DISCOUNT_RATE: 7.5,
                   PE: '', 	
                   PROJECTION_YEARS: 5,
                   HISTORIC_YEARS: 10,
                   PROJECTED_REVENUE_SLOPE: 1,
		   _NET_INCOME_MARGIN: ''}); 

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_quote()).done(
  function(_income, _income_ltm, _quote){
    var income = JSON.parse(JSON.stringify(_income));
    var income_ltm = JSON.parse(JSON.stringify(_income_ltm));
    var quote = JSON.parse(JSON.stringify(_quote));
    
    income = income[0].slice(0, INPUT.HISTORIC_YEARS);
    quote = quote[0].slice(0, INPUT.HISTORIC_YEARS);
    income = replaceWithLTM(income, income_ltm);
    
    var linRevenue = linearRegressionGrowthRate(income, 'revenue', INPUT.PROJECTION_YEARS, INPUT.PROJECTED_REVENUE_SLOPE);
    var projectedRevenue = linRevenue[linRevenue.length - 1];
	
	setInputDefault('_NET_INCOME_MARGIN', 100 * averageMargin('netIncome', 'revenue', income));
    var projectedNetIncome = projectedRevenue * INPUT._NET_INCOME_MARGIN;
	
	setInputDefault('PE', quote[0]['pe']);
    var presentValue = INPUT.PE * projectedNetIncome / Math.pow(1 + INPUT._DISCOUNT_RATE, INPUT.PROJECTION_YEARS);
    
	var currency = income[0]['convertedCurrency'];
	
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(presentValue/quote[0]['sharesOutstanding'], currency)){
      return;
    }
    
    _SetEstimatedValue(presentValue/quote[0]['sharesOutstanding'], currency);
    print(presentValue/quote[0]['sharesOutstanding'], 'Present Value', '#', currency);
    print(projectedNetIncome, 'Estimated Net Income ' + String(parseInt(income[0]['date']) + INPUT.PROJECTION_YEARS), '#', currency);
    print(INPUT.PE * projectedNetIncome, 'Estimated Market Capitalisation ' + String(parseInt(income[0]['date']) + INPUT.PROJECTION_YEARS), '#', currency);
    print(INPUT.PE * projectedNetIncome / Math.pow(1 + INPUT._DISCOUNT_RATE, INPUT.PROJECTION_YEARS), 'Market Capitalisation discounted to present', '#', currency);
    print(quote[0]['sharesOutstanding'], 'Shares Outstanding', '#');

    var context = [];
    var lastYear = parseInt(income[0]['date']);
    
    // Table of estimations
    const revenue = income[0]['revenue']/1000000;
    var rows = ['Revenue', 'Revenue Growth Rate%', 'Net Income'];
    var columns = [];
    var data = [[], [], []];
    for(var i = 1; i <= INPUT.PROJECTION_YEARS; i++){
      columns.push(lastYear + i);
      // revenue
      data[0].push((linRevenue[income.length + i - 1]/1000000).toFixed(2));
      // revenue growth rate
      data[1].push((100*(linRevenue[income.length + i - 1] - linRevenue[income.length + i - 2])/linRevenue[income.length + i - 2]).toFixed(2) + '%');
      // net income = revenue * netIncome margin
      data[2].push((data[0][i-1] * INPUT._NET_INCOME_MARGIN).toFixed(2));
    }
    contextItem = {name:'Projections Table (Mil. ' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
    // Historic Table
    var rows = ['Revenue', 'Revenue Growth Rate%', 'Cost of Revenue', 
                'Gross Margin%', 'Gross Profit','Operating Expenses',
                'Operating Margin%', 'Operating Income', 'Tax Expenses', 'Net Income'];
    var columns = [];
    var data = [[], [], [], [], [], [], [], [], [], []];
    var firstYear = parseInt(income[income.length-1]['date']);
    
    for(var i = 0; i<income.length; i++){
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
      data[2].push((income[i_inverse]['costOfRevenue']/1000000).toFixed(2));
      data[3].push((100 * income[i_inverse]['grossProfit']/income[i_inverse]['revenue']).toFixed(2) + '%');
      // gross profit 
      data[4].push((income[i_inverse]['grossProfit']/1000000).toFixed(2));
      // operating expenses
      data[5].push((income[i_inverse]['operatingExpenses']/1000000).toFixed(2));
      // operating income
      data[6].push((100 * income[i_inverse]['operatingIncome']/income[i_inverse]['revenue']).toFixed(2) + '%');
      data[7].push((income[i_inverse]['operatingIncome']/1000000).toFixed(2));
      // tax expenses
      data[8].push(((income[i_inverse]['incomeTaxExpense'])/1000000).toFixed(2));
      // net income 
      data[9].push((income[i_inverse]['netIncome']/1000000).toFixed(2));
    }    
    contextItem = {name:'Historic Table (Mil. ' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
    // Chart for Revenues
    var x_dates = [];
    var y_prev_values = [];
    var y_est_values = [];
    for(var i = income.length - 1; i >= 0; i--){
      x_dates.push(parseInt(income[i]['date']));
      y_prev_values.push((income[i]['revenue']/1000000).toFixed(2));
      y_est_values.push((linRevenue[income.length - i - 1]/1000000).toFixed(2));
    }

    for(var i = 1; i <= INPUT.PROJECTION_YEARS; i++){
      x_dates.push(lastYear + i);
      y_est_values.push((linRevenue[income.length + i - 1]/1000000).toFixed(2));
    }
    context.push(
      {name:'Previous Revenues and Estimations', display:'chart', x:x_dates, y:[y_prev_values, y_est_values], labels:['Previous', 'Estimated']}
    );
    
    // Chart for Net Income
    var y_netIncome = [];
    var y_revenue = [];
    for(var i = income.length - 1; i >= 0; i--){
      y_netIncome.push(income[i]['netIncome']/1000000);
      y_revenue.push(income[i]['revenue']/1000000);
    }

    for(var i = 1; i <= INPUT.PROJECTION_YEARS; i++){
      var i_netIncome = linRevenue[income.length + i - 1] * INPUT._NET_INCOME_MARGIN;
      y_netIncome.push(i_netIncome/1000000);
      y_revenue.push(linRevenue[income.length + i - 1]/1000000);
    }
    fillHistoricUsingList(y_netIncome, 'netIncome', lastYear + INPUT.PROJECTION_YEARS + 1);
    fillHistoricUsingList(y_revenue, 'revenue');
    renderChart('Historic and Forecasted Net Income (In Mill. of ' + currency + ')');
    monitor(context);
});

var DESCRIPTION = Description(`<h5>Discounted Future Market Cap</h5>
								This model estimates the intrinsic value of a common share by projecting the Future Market Capitalization using the estimated PE Ratio and then discounting it to the Present using an Annual Required Rate of Return.
							  `,`
                              <p>User Inputs Description:</p>
                              <ul>
                                <li><b>Required Rate Of Return:</b> The estimated stock value will be calculated based on this annual rate of return</li>
                                <li><b>PE:</b> By default, it is equal to the company's current PE ratio, or edite this value to use a custom PE</li>
                                <li><b>Projection Years:</b> Amount of years projecting into the future</li>
                                <li><b>Historic Years:</b> Past years used to calculate the average margins</li>
                                <li><b>Projected Revenue Slope:</b> '> 1' for higher revenue growth, '< 1' for slower growth</li>
                               	<li><b>Net Income Margin:</b> Net Income as a percentage of revenue</li>
                              </ul>
                              <p>
                              Projecting the Future Market Capitalization:
                              <div class="d-block text-center my-2">
                              \\( Future Market Capitalization \\) \\( = Estimated PE Ratio \\) \\( * Projected Net Income \\)
                              </div>
                              <ul>
                                <li>Estimated PE Ratio (Up to the user, you can use the current PE or the forward PE)</li>
                               	<li>Projected Net Income (Calculation is explained below)</li>
                              </ul>

                              Then, we discount the Market Capitalization to Present:
                              <div class="d-block text-center my-2">
                                  \\( Estimated Value = \\) \\( {Future Market Capitalization \\over (1 + Required Rate Of Return)^{Years}} \\)
                              </div>
                              
                              <ul>
                              	<li>Required Rate of Return (Annual rate of return required by the investor, used as the Discount Rate)</li>
                               	<li>Years (Number of years used to discount the Future Market Capitalization)</li>
                              </ul>
                              </p>
                              The Projected Net Income is calculated as such:
                              <ol>
                              <li>Determine the Projected Revenue:
                              <ul>
                              <li>Apply Linear Regression for the Historic Revenue Curve</li>
                              <li>Use the determined regression curve to project the revenue in X years, where X is "Projection Years"</li>
							  </ul>
                              </li>
                              <li>Calculate the Net Income:</li>
                              <div class="d-block text-center my-2">
                                  \\( Projected Net Income \\) = \\( Projected Revenue * \\) \\( Net Income Margin \\)
                              </div>
                              </ol>
                              *Margins refer to % of Revenue
                              `);
