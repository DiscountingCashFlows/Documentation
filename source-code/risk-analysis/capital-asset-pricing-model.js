// +------------------------------------------------------------+
//   Model: Capital Asset Pricing Model (CAPM)					
//   © Copyright: https://discountingcashflows.com	
// +------------------------------------------------------------+

Input(
  {
    _MARKET_PREMIUM: '',
    _RISK_FREE_RATE: '',
    BETA: '',
  }
);

$.when(
  get_profile(),
  get_treasury(),
  get_fx(),
  get_risk_premium()).done(
  function(_profile, _treasury, _fx, _risk_premium){
    var response = new Response({
      profile: _profile,
      treasury: _treasury,
      risk_premium: _risk_premium,
    });
    
    // +---------------- ASSUMPTIONS SECTION -----------------+
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
	// Set beta (used in calculating the discount rate)
    if(response.profile.beta){
    	setAssumption('BETA', response.profile.beta);
    }
    else{
    	setAssumption('BETA', 1);
    }
    // Risk free rate is the yield of the 10 year treasury note
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
	
    // Expected Return
    var expectedReturn = getAssumption('_RISK_FREE_RATE') + getAssumption('BETA')*getAssumption('_MARKET_PREMIUM');
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(toP(expectedReturn), '%')){
      return;
    }
    
    print(expectedReturn, "Cost of Equity", '%');
});

Description(`
	<h5>Capital Asset Pricing Model (CAPM)</h5> 
	The Capital Asset Pricing Model describes the relationship between risk and expected return for assets, particularly stocks. Its formula is used to calculate the cost of equity, or the rate of return a company is expected to pay to equity investors.
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#discount-rate-cost-of-equity' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
