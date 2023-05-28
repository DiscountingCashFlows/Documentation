// +------------------------------------------------------------+
//   Model: WACC (Weighted Average Cost of Capital)				
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
  get_income_statement_ltm(),
  get_balance_sheet_statement_quarterly(),
  get_profile(),
  get_treasury(),
  get_fx(),
  get_risk_premium()).done(
  function(_income_ltm, _balance_quarterly, _profile, _treasury, _fx, _risk_premium){
  try{
    var response = new Response({
      income_ltm: _income_ltm,
      balance_quarterly: _balance_quarterly,
      balance_ltm: 'balance_quarterly:0',
      profile: _profile,
      treasury: _treasury,
      risk_premium: _risk_premium,
    }).toOneCurrency('income_ltm', _fx);
    
    // +---------------- ASSUMPTIONS SECTION -----------------+ 
	var currency = response.currency;    
    setAssumption('_MARKET_PREMIUM', response.risk_premium.totalEquityRiskPremium );
	setAssumption('BETA', response.profile.beta);
	setAssumption('_RISK_FREE_RATE', response.treasury.year10);
    // +------------- END OF ASSUMPTIONS SECTION -------------+
    
    // +---------------- MODEL VALUES SECTION ----------------+
    // Cost of Debt 
    // Total Debt = Short Term Debt + Long Term Debt
    var costOfDebt = response.income_ltm['interestExpense'] / response.balance_ltm['totalDebt'];
	
    // Tax Rate
    var taxRate = response.income_ltm['incomeTaxExpense'] / response.income_ltm['incomeBeforeTax'];
    if(taxRate < 0){
		taxRate = 0;
    }
    
    // Cost of Equity
    var costOfEquity = getAssumption('_RISK_FREE_RATE') + getAssumption('BETA')*getAssumption('_MARKET_PREMIUM');
    
    // Weights
    var totalDebt = response.balance_ltm['shortTermDebt'] + response.balance_ltm['longTermDebt'];
    var marketCap = response.profile['mktCap']; // get the market cap in reports currency
    
    var debtWeight = totalDebt / (marketCap + totalDebt);
    var equityWeight = marketCap / (marketCap + totalDebt);
    
    var wacc = debtWeight * costOfDebt * (1 - taxRate) + equityWeight * costOfEquity;
    
    // If we are calculating the value per share for a watch, we can stop right here.
    if(_StopIfWatch(toP(wacc), '%')){
      return;
    }
    
	print(wacc, "WACC", '%');
	print(marketCap, "Market Cap", '#', currency);
	print(response.income_ltm['interestExpense'], "Interest Expense", '#', currency);
	print(response.balance_ltm['shortTermDebt'], "Short Term Debt", '#', currency);
	print(response.balance_ltm['longTermDebt'], "Long Term Debt", '#', currency);
	print(response.balance_ltm['totalDebt'], "Total Debt", '#', currency);
    print(equityWeight, 'Equity Weight', '%');
    print(costOfEquity, "Cost of Equity", '%');
    print(debtWeight, 'Debt Weight', '%');
    print(costOfDebt, "Cost of Debt", '%');
	print(response.income_ltm['incomeTaxExpense'], "Income Tax Expense", '#', currency);
	print(response.income_ltm['incomeBeforeTax'], "Income Before Tax", '#', currency);
    print(taxRate, "Tax Rate", '%');
    // +------------- END OF MODEL VALUES SECTION ------------+
  }
  catch (error) {
    throwError(error);
  }
});

Description(`
	<h5>Weighted Average Cost of Capital (WACC)</h5> 
	<p>WACC is a financial metric that helps in calculating a firm’s cost of financing by combining the cost of debt and cost of equity structure together.</p>
	<p class='text-center'>Read more: <a href='https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discount-rate-wacc---weighted-average-cost-of-capital' target='_blank'><i class="fab fa-github"></i> GitHub Documentation</a></p>
`);
