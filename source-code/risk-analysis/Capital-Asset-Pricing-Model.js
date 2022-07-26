// +------------------------------------------------------------+
// | Model: CAPM (Capital Asset Pricing Model) 					|
// | Copyright: https://discountingcashflows.com, 2022			|
// +------------------------------------------------------------+
var INPUT = Input({_MARKET_RETURN: 7,
  				   _RISK_FREE_RATE: '',
                   BETA: ''}); 

$.when(
  get_profile(),
  get_treasury()).done(
  function(profile, treasury){
    profile = profile[0][0];

    setInputDefault('BETA', profile['beta']);
	setInputDefault('_RISK_FREE_RATE', treasury[0][0]['year10']);
	
    // Expected Return
    var expectedReturn = INPUT._RISK_FREE_RATE + INPUT.BETA*(INPUT._MARKET_RETURN - INPUT._RISK_FREE_RATE);
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(expectedReturn*100, '%')){
      return;
    }
    
    print(expectedReturn, "Theoretical Expected Return of Investment", '%');
});

var DESCRIPTION = Description(`
								<h5>CAPM (Capital Asset Pricing Model)</h5> 
								The Capital Asset Pricing Model (CAPM) describes the relationship between systematic risk and expected return for assets, particularly stocks
								<p>Reference: <a href='https://www.investopedia.com/terms/c/capm.asp' target='_blank'>www.investopedia.com</a></p>
                                `, `
                                Formula used:
                                $$ ER\_i = R\_f + \\beta * (ER\_m - R\_f) $$
                                <ul>
                                <li>\\( ER\_i \\) : Expected return of the stock</li>
								<li>\\( R\_f \\) : The Risk Free Rate is the yield of the 10 Year Treasury Note today</li>
                                <li>\\( \\beta \\) : A measure of how risky the stock is compared to the market. Learn more: <a href="https://www.investopedia.com/terms/b/beta.asp">investopedia.com</a></li>
                                <li>\\( ER\_m \\) : Expected return of the broad market. In general markets yield on average 7% annually</li>
                                </ul>
`);
