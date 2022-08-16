// +------------------------------------------------------------+
// | Model: Dividend Discount Model								|
// | Copyright: https://discountingcashflows.com, 2021			|
// +------------------------------------------------------------+

var INPUT = Input({YEARS: 10,
                   _REQUIRED_RATE_OF_RETURN: 7.5,
                   _GROWTH_PERPETUITY: 2,
                   _CUSTOM_GROWTH_RATE: '-'});  

$.when(
  get_cash_flow_statement(),
  get_quote()).done(
  function(_flows, _quote){
    var flows = JSON.parse(JSON.stringify(_flows));
    var quote = JSON.parse(JSON.stringify(_quote));
    
    var context = [];
    
    flows = flows[0].slice(0, INPUT.YEARS);
    quote = quote[0];
	
    var currency = '';
	if('convertedCurrency' in flows[0]){
		currency = flows[0]['convertedCurrency'];
	}else{
		currency = flows[0]['reportedCurrency'];
	}
    
    // price is the Current Last Price of a Share on the Stock Market
    var price = quote[0]['price'];
    // sharesOutstanding is the Current Number of Shares Outstanding
    // This is required for calculating per share values
    var sharesOutstanding = quote[0]['sharesOutstanding'];

    // g is the constant growth rate for dividends, in perpetuity
    var g = 0;
    // dgr stores the Historic Dividend Growth Rate
    var dgr = 0;
    // d1 stores the previous period Dividend
    var d1 = 0;
    // d0 stores the current period Dividend
    var d0 = flows[0]['dividendsPaid'];
    if(d0 == 0){
        print("A zero dividend was encountered!", "Error");
      	_StopIfWatch(0, currency);
        return;
    }
    // Calculate the Average Annual Dividend Growth Rate for the last YEARS
    for(var i = 1; i < INPUT.YEARS; i++){
      var period = flows[i];
      d1 = period['dividendsPaid'];
      if(d1 == 0){
        print("A zero dividend was encountered!", "Error");
        _StopIfWatch(0, currency);
        return;
      }
      dgr += (d0 - d1) / d1;
      d0 = d1;
    }
    dgr = dgr/( INPUT.YEARS - 1 );
    if(INPUT._CUSTOM_GROWTH_RATE != '-'){
      dgr = INPUT._CUSTOM_GROWTH_RATE;
      print(dgr , "Using custom Dividend Growth Rate", '%');
    }else{
      print(dgr , "Using historic Dividend Growth Rate", '%');
    }
    // If the dividend Growth Rate in perpetuity is set.
    if(INPUT._GROWTH_PERPETUITY != '-'){
      g = INPUT._GROWTH_PERPETUITY;
    }else{
      g = dgr;
    }
    print(g, "Dividend Growth in perpetuity", '%');
    // lastDividend is Last Dividend per Share
    var lastDividend = Math.abs(flows[0]['dividendsPaid']/sharesOutstanding);
    
    var normalDividends = [];
    var discountedDividends = [];
    var sumDiscountedDividends = 0;
    for(var i = 1; i <= INPUT.YEARS; i++){
      var normalDividend = lastDividend * Math.pow(1 + dgr, i);
      var discountedDividend = normalDividend / Math.pow(1 + INPUT._REQUIRED_RATE_OF_RETURN, i);
      sumDiscountedDividends += discountedDividend;
      normalDividends.push(normalDividend);
      discountedDividends.push(discountedDividend);
    }
    
    print(lastDividend, "Last Annual Dividend (" + flows[0]['date'] + ") (" + currency + ")", '#');
    // Estimated Dividend per Share for the next period
    // var nextDividend = lastDividend * (1 + dgr);
    print(sumDiscountedDividends, "Sum of discounted dividends (" + currency + ")", '#');
    print(discountedDividends[discountedDividends.length - 1], "Year " + INPUT.YEARS + " discounted dividend", '#'); 
    // The final value calculated by the Dividend Discount Model
    var valueOfStock = sumDiscountedDividends + discountedDividends[discountedDividends.length - 1] / (INPUT._REQUIRED_RATE_OF_RETURN - g);
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valueOfStock, currency)){
      return;
    }
    
    _SetEstimatedValue(valueOfStock, currency);
    print(valueOfStock, "Value of Stock (" + currency + ")", '#');
    print(price, "Current Price (" + currency + ")");
    
    var result = '';
    
    // Create Chart for X Years of Previous Dividends 
    var y_values = [];
    for(var i = INPUT.YEARS - 1; i >= 0; i--){
      y_values.push(-flows[i]['dividendsPaid']/sharesOutstanding);
    }
    // Append estimations
    var lastYearDate = parseInt(flows[0]['date']);
    for(var i = 1; i < INPUT.YEARS; i++){
      y_values.push(lastDividend * Math.pow(1 + dgr, i));
    }
    fillHistoricUsingList(y_values, 'dividends', lastYearDate + INPUT.YEARS);
    
    // Table of estimations
    var rows = ['Dividend estimations', 'Discounted dividends'];
    var columns = [];
    var data = [[], []];
    var lastYear = parseInt(flows[0]['date']);
    for(var i = 1; i <= INPUT.YEARS; i++){
      columns.push(lastYear + i);
      // revenue
      var normalDividend = lastDividend * Math.pow(1 + dgr, i);
      var discountedDividend = normalDividend / Math.pow(1 + INPUT._REQUIRED_RATE_OF_RETURN, i);
      data[0].push((normalDividend).toFixed(2));
      data[1].push((discountedDividend).toFixed(2));
    }
    contextItem = {name:'Dividend Projections Table (' + currency + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
    renderChart(INPUT.YEARS + ' Years of Previous Dividends and Projections');
    monitor(context);
});

var DESCRIPTION = Description(`
								<h5>Dividend Discount Model</h5>
								Used for predicting the price of a company's stock based on the theory that its present-day price is worth the sum of all of its future dividend payments when discounted back to their present value.
                                Dividends are projected using an average historic Dividend Growth Rate.
								<p>Reference: <a href='https://www.investopedia.com/terms/d/ddm.asp' target='_blank'>www.investopedia.com</a></p>
                                `, `
                                
                                <p>Formula used to calculate Value of Stock:</p>
                                <div class="d-block text-center my-2">
                                \\( ValueOfStock = \\) \\( Sum Of Discounted Dividends \\) \\( + {Discounted Dividend In Year ` + INPUT.YEARS + ` \\over (RequiredReturnRate - DividendGrowthInPerpetuity)} \\)
                                </div>
                                <ul>
                                <li>\\( RequiredReturnRate \\) : User Input</li>
								<li>\\( Discounted Dividend In Year ` + INPUT.YEARS + ` \\) : Check table last discounted value.</li>
                                <li>\\( DividendGrowthInPerpetuity \\) : Dividend growth rate. Default 2%</li>
                                </ul>
`);
