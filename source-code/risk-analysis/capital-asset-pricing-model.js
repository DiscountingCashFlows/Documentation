// +------------------------------------------------------------+
//   Model: Capital Asset Pricing Model (CAPM)					
//   © Copyright: https://discountingcashflows.com	
// +------------------------------------------------------------+
var INPUT = Input({_MARKET_PREMIUM: 5.5,
  				   _RISK_FREE_RATE: '',
                   BETA: ''}); 

$.when(
  get_profile(),
  get_treasury()).done(
  function(_profile, _treasury){
    // Create deep copies of reports. This section is needed for watchlist compatibility.
    var profile = deepCopy(_profile);
    var treasury = deepCopy(_treasury);

    setInputDefault('BETA', profile['beta']);
	setInputDefault('_RISK_FREE_RATE', treasury['year10']);
	
    // Expected Return
    var expectedReturn = INPUT._RISK_FREE_RATE + INPUT.BETA*INPUT._MARKET_PREMIUM;
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(expectedReturn*100, '%')){
      return;
    }
    
    print(expectedReturn, "Cost of Equity", '%');
});

Description(`
	<h5>Capital Asset Pricing Model (CAPM)</h5> 
	The Capital Asset Pricing Model describes the relationship between risk and expected return for assets, particularly stocks. Its formula is used to calculate the cost of equity, or the rate of return a company is expected to pay to equity investors.
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#discount-rate-cost-of-equity' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
