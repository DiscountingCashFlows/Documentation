// +------------------------------------------------------------+
// | Model: Dividend Discount Model								|
// | Copyright: https://discountingcashflows.com, 2022			|
// +------------------------------------------------------------+

var INPUT = Input({_REQUIRED_RATE_OF_RETURN: 7.5,
                   EXPECTED_DIVIDEND: '',
                   _GROWTH_IN_PERPETUITY: '',
                   HISTORIC_YEARS: ''});  

// Returns the index at which flows period has a zero dividend
function getZeroDividendIndex(flows){
  for(var i=0; i<flows.length; i++){
    if(flows[i]['dividendsPaid'] == 0){
    	return i;
    }
  }
  return flows.length - 1;
}

$.when(
  get_cash_flow_statement(),
  get_quote(),
  get_treasury()).done(
  function(_flows, _quote, _treasury){
    var flows = JSON.parse(JSON.stringify(_flows));
    var quote = JSON.parse(JSON.stringify(_quote));
    var treasury = JSON.parse(JSON.stringify(_treasury));
    var context = [];
    var zeroDividendIndex = getZeroDividendIndex(flows[0]);
    if(!zeroDividendIndex){
    	warning("The company does not currently pay dividends!");
    }
    
    setInputDefault('HISTORIC_YEARS', zeroDividendIndex);
    setInputDefault('_GROWTH_IN_PERPETUITY', treasury[0][0]['year10']);
    
    flows = flows[0].slice(0, INPUT.HISTORIC_YEARS );
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
        warning("A zero dividend was encountered!");
      	_StopIfWatch(0, currency);
        return;
    }
    // Calculate the Average Annual Dividend Growth Rate for the last HISTORIC_YEARS
    for(var i = 1; i < flows.length; i++){
      var period = flows[i];
      d1 = period['dividendsPaid'];
      if(d1 == 0){
        warning("A zero dividend was encountered!");
        _StopIfWatch(0, currency);
        return;
      }
      dgr += (d0 - d1) / d1;
      d0 = d1;
    }
	dgr = dgr/( flows.length - 1 );
    // lastDividend is Last Dividend per Share
    var lastDividend = Math.abs(flows[0]['dividendsPaid']/sharesOutstanding);
    setInputDefault('EXPECTED_DIVIDEND', lastDividend * (1 + dgr));
    
    // The final value calculated by the Dividend Discount Model
    var valueOfStock = INPUT.EXPECTED_DIVIDEND / (INPUT._REQUIRED_RATE_OF_RETURN - INPUT._GROWTH_IN_PERPETUITY);
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valueOfStock, currency)){
      return;
    }
    
    _SetEstimatedValue(valueOfStock, currency);
    
    print(lastDividend, "Last Annual Dividend (" + flows[0]['date'] + ") (" + currency + ")", '#');
    print(lastDividend/price, "Dividend Yield", '%');
    print(INPUT.EXPECTED_DIVIDEND, "Next Year's Expected Dividend (" + currency + ")", '#');
    print(dgr, "Average Historic Dividend Growth Rate", '%');
    print(INPUT._GROWTH_IN_PERPETUITY, "Growth in Perpetuity", '%');
    print(INPUT._REQUIRED_RATE_OF_RETURN, "Required Rate of Return", '%');
    print(valueOfStock, "Value of Stock (" + currency + ")", '#');
    print(price, "Current Price (" + currency + ")");
    
    var result = '';
    
    // Create Chart for X Years of Previous Dividends 
    var y_values = [];
    for(var i = INPUT.HISTORIC_YEARS - 1; i >= 0; i--){
      y_values.push(-flows[i]['dividendsPaid']/sharesOutstanding);
    }
    y_values.push(INPUT.EXPECTED_DIVIDEND);
    // Append estimations
    var chartProjectionYears = 5;
    var lastYearDate = parseInt(flows[0]['date']);
    for(var i = 1; i < chartProjectionYears; i++){
      y_values.push(INPUT.EXPECTED_DIVIDEND * Math.pow(1 + INPUT._GROWTH_IN_PERPETUITY, i));
    }
    fillHistoricUsingList(y_values, 'dividends', parseInt(flows[0]['date']) + chartProjectionYears + 1);
    
    renderChart('Historic and Projected Dividends(In Mill. of ' + currency + ')');
    monitor(context);
});

var DESCRIPTION = Description(`
								<h5>Dividend Discount Model</h5>
								Used for predicting the price of a company's stock based on the theory that its present-day price is worth the sum of all of its future dividend payments when discounted back to their present value.
								<p>Reference: <a href='https://github.com/SimplyWallSt/Company-Analysis-Model/blob/master/MODEL.markdown#dividend-discount-model--how-is-this-calculated' target='_blank'>github.com/SimplyWallSt</a></p>
                                `, `
                                <p>User Inputs Description:</p>
                                <ul>
                                  <li><b>Required Rate Of Return:</b> The estimated stock value will be calculated based on this annual rate of return</li>
                                  <li><b>Expected Dividend:</b> The estimated dividend that the company will pay next year. The Average Historic Dividend Growth Rate will be used by default, unless setting this manually</li>
                                  <li><b>Growth in Perpetuity:</b> Growth rate at which the dividends are expected to grow in perpetuity</li>
                                  <li><b>Historic Years:</b> Past years used to calculate the average dividend growth rate</li>
                                </ul>
                                <p>Calculating the Expected Dividend:</p>
                                <div class="d-block text-center my-2">
                                \\( ExpectedDividend = \\) \\( Last Dividend Per Share * (1 + Average Historic Dividend Growth Rate) \\)
                                </div>
                                <p>Formula used to calculate Value of Stock:</p>
                                <div class="d-block text-center my-2">
                                \\( ValueOfStock = \\) \\( Expected Dividend Per Share \\over (RequiredReturnRate - Growth In Perpetuity) \\)
                                </div>
`);
