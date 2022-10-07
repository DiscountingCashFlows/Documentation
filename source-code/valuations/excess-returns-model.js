// +------------------------------------------------------------+
//   Model: Excess Returns Model 								
//   Copyright: https://discountingcashflows.com, 2022			
// +------------------------------------------------------------+

var INPUT = Input({_DISCOUNT_RATE: '',
                   _GROWTH_IN_PERPETUITY: '',
                   _MARKET_PREMIUM: 5.5,
                   _RISK_FREE_RATE: '',
                   BETA: '',
                   EPS: ''
                   }); 

$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement(),
  get_profile(),
  get_treasury()).done(
  function(_income, _income_ltm, _balance, _profile, _treasury){
    // context is a must-have. it is used to display charts, tables and values
    let context = [];
    let income = JSON.parse(JSON.stringify(_income));
    let income_ltm = JSON.parse(JSON.stringify(_income_ltm));
    let balance = JSON.parse(JSON.stringify(_balance));
    let profile = JSON.parse(JSON.stringify(_profile));
    let treasury = JSON.parse(JSON.stringify(_treasury));
    
    income = income[0];
    income_ltm = income_ltm[0];
    balance = balance[0][0];  // last period balance
    profile = profile[0][0];
    let valuePerShare = 0;
    let currency = '';
	if('convertedCurrency' in income_ltm){
		currency = income_ltm['convertedCurrency'];
	}else{
		currency = income_ltm['reportedCurrency'];
	}
    
	setInputDefault('_RISK_FREE_RATE', treasury[0][0]['year10']);
    setInputDefault('_GROWTH_IN_PERPETUITY', treasury[0][0]['year10']);
    setInputDefault('BETA', profile['beta']);
    setInputDefault('EPS', income_ltm['netIncome'] / income_ltm['weightedAverageShsOutDil']);
    setInputDefault('_DISCOUNT_RATE', 100*(INPUT._RISK_FREE_RATE + INPUT.BETA*INPUT._MARKET_PREMIUM));
    
    // Fill chart historic
    var y_historic = [];
    var len = 10;
    if(income.length - 1 < 10){
      	len = income.length - 1;
    }
    for(var i = len; i >= 0; i--){
      y_historic.push((income[i]['eps']).toFixed(2));
    }
    
    let startAt = 1;
    if(parseInt(income[0]['date']) <= parseInt(income_ltm['date'])){
      startAt = 0;
    }
    for(var i = startAt; i <= 10; i++){
      y_historic.push((INPUT.EPS * Math.pow((1 + INPUT._GROWTH_IN_PERPETUITY), i)).toFixed(2));
    }
    fillHistoricUsingList(y_historic, 'eps', parseInt(income_ltm['date']) + 11);
	
    let bookValue = balance['totalStockholdersEquity'] / income_ltm['weightedAverageShsOutDil'];
    let costOfEquity = INPUT._DISCOUNT_RATE;
    let returnOnEquity = INPUT.EPS / bookValue;
	let excessReturns = bookValue * (returnOnEquity - costOfEquity);
    let terminalValue = excessReturns / (costOfEquity - INPUT._GROWTH_IN_PERPETUITY);
    
    valuePerShare = terminalValue + bookValue;
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(valuePerShare, currency)){
      return;
    }
    
    _SetEstimatedValue(valuePerShare, currency);
    var stringCurrency = ' ('+currency+')';
    print(valuePerShare, 'Value per Share' + stringCurrency, '#');
    print(income_ltm['weightedAverageShsOutDil']/1000000, 'Diluted Shares Outstanding (mil.)','#');
    print(INPUT._RISK_FREE_RATE, 'Risk Free Rate from the 10 Year U.S. Treasury Note', '%');
    print(bookValue, "Book Value" + stringCurrency, '#');
    print(costOfEquity, "Cost of Equity (Discount Rate)", '%');
    print(returnOnEquity, "Return on Equity", '%');
    print(excessReturns, "Excess Returns" + stringCurrency, '#');
    print(terminalValue, "Terminal Value" + stringCurrency, '#');
	renderChart('EPS (Historic and Forecasts) in ' + currency);
    monitor(context);
});

var DESCRIPTION = Description(`<h5>Excess Returns Model</h5>
                                Excess Returns method is better suited to calculate the intrinsic value of financial companies than the traditional discounted cash flows model.
								<br>
                                More at: <a href='https://github.com/SimplyWallSt/Company-Analysis-Model/blob/master/MODEL.markdown#excess-returns-model--how-is-this-calculated' target='_blank'>github.com/SimplyWallSt</a>
							  `,`
                              <p>The key assumption for this model is that equity value is how much the firm can earn, over and above its cost of equity, given the level of equity it has in the company at the moment. The returns above the cost of equity is known as excess returns:</p>
                              <div class="d-block text-center my-2">
                              \\( Excess Return = (Return on Equity – \\) \\(  Cost Of Equity) * Book Value Of Equity \\)
                              </div>

                              <p>We use this value to calculate the terminal value of the company, which is how much we expect the company to continue to earn every year, forever. This is a common component of discounted cash flow models:</p>
                              <div class="d-block text-center my-2">
                                  \\( Terminal Value = Excess Return \\) \\( / (Cost Of Equity – Expected Growth Rate) \\)
                              </div>
                              
                              <p>Putting this all together, we get the value of the company:</p>
                              <div class="d-block text-center my-2">
                                  \\( Company Valuation = Book Value Of Equity +\\) \\( Present Value Of Terminal Value \\)
                              </div>
                              <div class="d-block text-center my-2">
                                  \\( Value Per Share = (Book Value Of Equity + \\) \\( Present Value Of Terminal Value) / Shares Outstanding \\)
                              </div>
                              `);
