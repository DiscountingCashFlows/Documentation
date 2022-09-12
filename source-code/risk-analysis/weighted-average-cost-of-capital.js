// +------------------------------------------------------------+
// | Model: WACC (Weighted Average Cost of Capital)				|
// | Copyright: https://discountingcashflows.com, 2022			|
// +------------------------------------------------------------+
var INPUT = Input({_MARKET_RETURN: 7,
  				   _RISK_FREE_RATE: '',
                   BETA: ''}); 

$.when(
  get_income_statement_ltm(),
  get_balance_sheet_statement_quarterly(),
  get_profile(),
  get_treasury()).done(
  function(income, balance_quarter, profile, treasury){
    balance_quarter = balance_quarter[0];
    income = income[0];
    profile = profile[0][0];

	setInputDefault('BETA', profile['beta']);
	setInputDefault('_RISK_FREE_RATE', treasury[0][0]['year10']);
    
    
    // Cost of Debt
    var costOfDebt = income['interestExpense'] / balance_quarter[0]['totalDebt']; // Total Debt = Short Term Debt + Long Term Debt
	
    // Tax Rate
    var taxRate = income['incomeTaxExpense'] / income['incomeBeforeTax'];
    if(taxRate < 0)
    {
		taxRate = 0;
    }
    
    // Cost of Equity
    var costOfEquity = INPUT._RISK_FREE_RATE + INPUT.BETA*(INPUT._MARKET_RETURN - INPUT._RISK_FREE_RATE);
    
    // Weights
    var totalDebt = balance_quarter[0]['shortTermDebt'] + balance_quarter[0]['longTermDebt'];
    var marketCap = profile['mktCap'];
    
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
    print(INPUT._MARKET_RETURN - INPUT._RISK_FREE_RATE, 'Market Premium', '%');
    print(debtWeight, 'Debt Weight', '%');
    print(costOfDebt, "Cost of Debt", '%');
    print(taxRate, "Tax Rate", '%');
    
    var context = [];
	
	var currency = '';
	if('convertedCurrency' in balance_quarter[0]){
		currency = balance_quarter[0]['convertedCurrency'];
	}else{
		currency = balance_quarter[0]['reportedCurrency'];
	}

    contextItem = {name:'WACC Calculation (In Millions of ' + currency + ' except for rates)', display:'table', 
                   rows:['WACC%','Interest Expense', 'Short Term Debt', 'Long Term Debt', 'Total Debt', 
                         'Cost of Debt%', 'Cost of Equity%', 'Market Cap', 'Debt Weight%', 'Equity Weight%', 'Income Tax Expense', 'Income Before Tax', 'Tax Rate%'], 
                   columns:['Values'], data:[[(100 * wacc).toFixed(2) + '%'], 
                                             [income['interestExpense']/1000000], 
                                             [balance_quarter[0]['shortTermDebt']/1000000], 
                                             [balance_quarter[0]['longTermDebt']/1000000], 
                                             [balance_quarter[0]['totalDebt']/1000000], 
                                             [(100 * costOfDebt).toFixed(2) + '%'],
                                             [(100 * costOfEquity).toFixed(2) + '%'],
                                             [(profile['mktCap']/1000000).toFixed(2)], 
                                             [(100 * debtWeight).toFixed(2) + '%'],
                                             [(100 * equityWeight).toFixed(2) + '%'],
                                             [income['incomeTaxExpense']/1000000], 
                                             [income['incomeBeforeTax']/1000000],
                                             [(100 * taxRate).toFixed(2) + '%']
                                            ]};
    context.push(contextItem);
    monitor(context);
});

var DESCRIPTION = Description(`
								<h5>WACC (Weighted Average Cost of Capital)</h5> 
								WACC is a financial metric that helps in calculating a firm’s cost of financing by combining the cost of debt and cost of equity structure together.
								<p>Reference: <a href='https://www.educba.com/wacc-formula/' target='_blank'>www.educba.com</a></p>
                                <small>*Please note that WACC values are not correctly computed for companies which report in other currencies except USD.</small>
								`, `
                                Formula used:
                                <div class="d-block text-center my-2">
                                  \\( WACC =  \\) \\( [(EquityWeight * CostOfEquity) + (DebtWeight * CostOfDebt)] *  \\) \\( (1 - TaxRate) \\)
                                </div>
                                <ul>
                                <li>Equity Weight Formula:</li>
                                $$ EquityWeight = {MarketCap \\over (MarketCap + TotalDebt)} $$
								<li>Cost of Equity Formula(Equivalent to CAPM <a href='https://www.investopedia.com/terms/c/capm.asp' target='_blank'>investopedia.com</a>):</li>
                                $$ ER\_i = R\_f + \\beta * (ER\_m - R\_f) $$
                                <ul>
                                <li>\\( ER\_i \\) : Expected return of the stock</li>
								<li>\\( R\_f \\) : The Risk Free Rate is the yield of the 10 Year Treasury Note today</li>
                                <li>\\( \\beta \\) : A measure of how risky the stock is compared to the market. Learn more: <a href="https://www.investopedia.com/terms/b/beta.asp">investopedia.com</a></li>
                                <li>\\( ER\_m \\) : Expected return of the broad market. In general markets yield on average 7% annually</li>
                                </ul>
                                <li>Debt Weight Formula:</li>
                                $$ DebtWeight = {TotalDebt \\over (MarketCap + TotalDebt)} $$
                                <li>Cost of Debt Formula:</li>
                                $$ CostOfDebt = {InterestExpense \\over TotalDebt} $$
                                </ul>
`);
