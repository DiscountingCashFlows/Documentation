// +------------------------------------------------------------+
//   Model: WACC (Weighted Average Cost of Capital)				
//   Copyright: https://discountingcashflows.com, 2022			
// +------------------------------------------------------------+
var INPUT = Input({_MARKET_PREMIUM: 5.5,
                   _RISK_FREE_RATE: '',
                   BETA: ''}); 

$.when(
  get_income_statement_ltm(),
  get_balance_sheet_statement_quarterly(),
  get_profile(),
  get_treasury(),
  get_fx()).done(
  function(_income_ltm, _balance_quarterly, _profile, _treasury, _fx){
    var context = [];
    // Create deep copies of reports. This section is needed for watchlist compatibility.
    var income_ltm = JSON.parse(JSON.stringify(_income_ltm));
    var balance_last_quarter = JSON.parse(JSON.stringify(_balance_quarterly));
    var profile = JSON.parse(JSON.stringify(_profile));
    var treasury = JSON.parse(JSON.stringify(_treasury));
    var fx = JSON.parse(JSON.stringify(_fx));
    
    balance_last_quarter = balance_last_quarter[0][0];
    income_ltm = income_ltm[0];
    profile = profile[0][0];
    treasury = treasury[0][0];
    fx = fx[0];
    
    // Check if the currency is being converted 
    // The profile can have a different currency from the reports.
	var currency = balance_last_quarter['convertedCurrency'];
    var currencyProfile = profile['convertedCurrency'];
    var ccyRate = currencyRate(fx,  currency, currencyProfile);
    
	// ---------------- SETTING ASSUMPTIONS SECTION ---------------- 
	setInputDefault('BETA', profile['beta']);
	setInputDefault('_RISK_FREE_RATE', treasury['year10']);
    // ---------------- END OF SETTING ASSUMPTIONS SECTION ----------------
    
    // ---------------- VALUES OF INTEREST SECTION ---------------- 
    // Cost of Debt
    var costOfDebt = income_ltm['interestExpense'] / balance_last_quarter['totalDebt']; // Total Debt = Short Term Debt + Long Term Debt
	
    // Tax Rate
    var taxRate = income_ltm['incomeTaxExpense'] / income_ltm['incomeBeforeTax'];
    if(taxRate < 0){
		taxRate = 0;
    }
    
    // Cost of Equity
    var costOfEquity = INPUT._RISK_FREE_RATE + INPUT.BETA*INPUT._MARKET_PREMIUM;
    
    // Weights
    var totalDebt = balance_last_quarter['shortTermDebt'] + balance_last_quarter['longTermDebt'];
    var marketCap = profile['mktCap'] / ccyRate; // get the market cap in reports currency
    
    var debtWeight = totalDebt / (marketCap + totalDebt);
    var equityWeight = marketCap / (marketCap + totalDebt);
    
    var wacc = debtWeight * costOfDebt * (1 - taxRate) + equityWeight * costOfEquity;
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(wacc*100, '%')){
      return;
    }
    
	print(wacc, "WACC", '%');
    print(equityWeight, 'Equity Weight', '%');
    print(costOfEquity, "Cost of Equity", '%');
    print(debtWeight, 'Debt Weight', '%');
    print(costOfDebt, "Cost of Debt", '%');
    print(taxRate, "Tax Rate", '%');
	// ---------------- END OF VALUES OF INTEREST SECTION ---------------- 
    
	// ---------------- TABLES SECTION ---------------- 
    contextItem = {name:'WACC Calculation (In Millions of ' + currency + ' except for rates)', display:'table', 
                   rows:['WACC%','Interest Expense', 'Short Term Debt', 'Long Term Debt', 'Total Debt', 
                         'Cost of Debt%', 'Cost of Equity%', 'Market Cap', 'Debt Weight%', 'Equity Weight%', 'Income Tax Expense', 'Income Before Tax', 'Tax Rate%'], 
                   columns:['Values'], data:[[(100 * wacc).toFixed(2) + '%'], 
                                             [toM(income_ltm['interestExpense'])], 
                                             [toM(balance_last_quarter['shortTermDebt'])], 
                                             [toM(balance_last_quarter['longTermDebt'])], 
                                             [toM(balance_last_quarter['totalDebt'])], 
                                             [(100 * costOfDebt).toFixed(2) + '%'],
                                             [(100 * costOfEquity).toFixed(2) + '%'],
                                             [(toM(marketCap)).toFixed(2)], 
                                             [(100 * debtWeight).toFixed(2) + '%'],
                                             [(100 * equityWeight).toFixed(2) + '%'],
                                             [toM(income_ltm['incomeTaxExpense'])], 
                                             [toM(income_ltm['incomeBeforeTax'])],
                                             [(100 * taxRate).toFixed(2) + '%']
                                            ]};
    context.push(contextItem);
    monitor(context);
    // ---------------- END OF TABLES SECTION ---------------- 
});

var DESCRIPTION = Description(`
								<h5>Weighted Average Cost of Capital (WACC)</h5> 
								<p>WACC is a financial metric that helps in calculating a firm’s cost of financing by combining the cost of debt and cost of equity structure together.</p>
								<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discount-rate-wacc---weighted-average-cost-of-capital' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
                                `);
