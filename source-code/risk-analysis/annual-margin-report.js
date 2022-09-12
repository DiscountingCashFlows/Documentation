// +------------------------------------------------------------+
//   Model: Annual Margin Report				
//   Copyright: https://discountingcashflows.com, 2022		
// +------------------------------------------------------------+
var INPUT = Input({YEARS: 10}); 


$.when(
  get_income_statement(),
  get_income_statement_ltm(),
  get_balance_sheet_statement(),
  get_cash_flow_statement(),
  get_cash_flow_statement_ltm()).done(
  function(income, income_ltm, balance, flows, flows_ltm){
    var context = [];
    income = income[0].slice(0, INPUT.YEARS);
    income_ltm = income_ltm[0];
    balance = balance[0].slice(0, INPUT.YEARS);
    flows_ltm = flows_ltm[0];
    flows = flows[0].slice(0, INPUT.YEARS);
    flows = addKey('revenue', income, flows);
    flows_ltm['revenue'] = income_ltm['revenue'];
    
    // Print Average Margins
    // Avg. Revenue Growth Rate
    print(averageGrowthRate('revenue', income), 'Avg. Revenue Growth Rate', '%');
    // Avg. Gross Margin
    print(averageMargin('grossProfit', 'revenue', income), 'Avg. Gross Margin', '%');
    // Avg. Operating Expenses to Revenue
    print(averageMargin('operatingExpenses', 'revenue', income), 'Avg. Operating Expenses to Revenue', '%');
    // Avg. Operating Margin
    print(averageMargin('operatingIncome', 'revenue', income), 'Avg. Operating Margin', '%');
    // Avg. Net Income Margin
    print(averageMargin('netIncome', 'revenue', income), 'Avg. Net Income Margin', '%');
    
    // Avg. Cash From Operating Activities to Revenue
    print(averageMargin('netCashProvidedByOperatingActivities', 'revenue', flows), 'Avg. Cash From Operating Activities to Revenue', '%');
    // Avg. Free Cash Flow to Revenue
    print(averageMargin('freeCashFlow', 'revenue', flows), 'Avg. Free Cash Flow to Revenue', '%');
    // Avg. Depreciation and Amortization to Revenue
    print(averageMargin('depreciationAndAmortization', 'revenue', flows), 'Avg. Depreciation and Amortization to Revenue', '%');
    // Avg. Capital Expenditure to Revenue
    print(averageMargin('capitalExpenditure', 'revenue', flows), 'Avg. Capital Expenditure to Revenue', '%');
    
    // Flows Chart 
    var x_dates = [];
    var y_revenue = [];
    var y_coa = [];
    var y_fcf = [];
    var y_ni = [];
    var y_ce = [];

    for(var i = flows.length - 1; i >= 0; i--){
      if(flows[i]['revenue'] == 0){
        y_revenue.push(0);
        y_coa.push(0);
        y_fcf.push(0);
        y_ni.push(0);
        y_ce.push(0);
      }
      else{
        y_revenue.push(100);
        y_coa.push((100*flows[i]['netCashProvidedByOperatingActivities']/flows[i]['revenue']).toFixed(2));
        y_fcf.push((100*flows[i]['freeCashFlow']/flows[i]['revenue']).toFixed(2));
        y_ni.push((100*flows[i]['netIncome']/flows[i]['revenue']).toFixed(2));
        y_ce.push((-100*flows[i]['capitalExpenditure']/flows[i]['revenue']).toFixed(2));
      }
    }
    x_dates.push('LTM');
    if(flows_ltm['revenue'] == 0){
      	y_revenue.push(0);
        y_coa.push(0);
        y_fcf.push(0);
        y_ni.push(0);
        y_ce.push(0);
    }
    else{
      y_revenue.push(100);
      y_coa.push((100*flows_ltm['netCashProvidedByOperatingActivities']/flows_ltm['revenue']).toFixed(2));
      y_fcf.push((100*flows_ltm['freeCashFlow']/flows_ltm['revenue']).toFixed(2));
      y_ni.push((100*flows_ltm['netIncome']/flows_ltm['revenue']).toFixed(2));
      y_ce.push((-100*flows_ltm['capitalExpenditure']/flows_ltm['revenue']).toFixed(2));
    }
    fillHistoricUsingList(y_revenue, 'revenue', parseInt(flows[0]['date']));
    fillHistoricUsingList(y_coa, 'netCashProvidedByOperatingActivities');
    fillHistoricUsingList(y_fcf, 'freeCashFlow');
    fillHistoricUsingList(y_ni, 'netIncome');
    fillHistoricUsingList(y_ce, 'capitalExpenditure');
    
    // Income Statement Margins Table
    var rows = ['Revenue', 'Revenue Growth Rate%', 'Gross Margin%', 'Gross Profit', 'Operating Expenses to Revenue%', 'Operating Expenses',
                'Operating Margin%', 'Operating Income', 'Net Income Margin%', 'Net Income'];
    var columns = [];
    var data = [[], [], [], [], [], [], [], [], [], []];
    var firstYear = parseInt(income[income.length-1]['date']);
    
    for(var i = 0; i<income.length; i++){
      var i_inverse = income.length - i - 1;
      columns.push(firstYear + i);
      // revenue
      data[0].push((income[i_inverse]['revenue']/1000000).toFixed(2));
      // revenue growth rate
      if(i > 0){
      	data[1].push((100*(data[0][i] - data[0][i-1])/data[0][i-1]).toFixed(2) + '%');
      }
      else{
        data[1].push('-');
      }
      data[2].push((100 * income[i_inverse]['grossProfit']/income[i_inverse]['revenue']).toFixed(2) + '%');
      // gross profit 
      data[3].push((income[i_inverse]['grossProfit']/1000000).toFixed(2));
      // operating expenses 
      data[4].push((100 * income[i_inverse]['operatingExpenses']/income[i_inverse]['revenue']).toFixed(2) + '%');
      data[5].push((income[i_inverse]['operatingExpenses']/1000000).toFixed(2));
      // operating income
      data[6].push((100 * income[i_inverse]['operatingIncome']/income[i_inverse]['revenue']).toFixed(2) + '%');
      data[7].push((income[i_inverse]['operatingIncome']/1000000).toFixed(2));
      // net income 
      data[8].push((100 * income[i_inverse]['netIncome']/income[i_inverse]['revenue']).toFixed(2) + '%');
      data[9].push((income[i_inverse]['netIncome']/1000000).toFixed(2));
    }
    columns.push('LTM');
    data[0].push((income_ltm['revenue']/1000000).toFixed(2));
    data[1].push((100*(income_ltm['revenue'] - income[0]['revenue'])/income[0]['revenue']).toFixed(2) + '%');
    data[2].push((100 * income_ltm['grossProfit']/income_ltm['revenue']).toFixed(2) + '%');
    // gross profit 
    data[3].push((income_ltm['grossProfit']/1000000).toFixed(2));
    // operating expenses 
    data[4].push((100 * income_ltm['operatingExpenses']/income_ltm['revenue']).toFixed(2) + '%');
    data[5].push((income_ltm['operatingExpenses']/1000000).toFixed(2));
    // operating income
    data[6].push((100 * income_ltm['operatingIncome']/income_ltm['revenue']).toFixed(2) + '%');
    data[7].push((income_ltm['operatingIncome']/1000000).toFixed(2));
    // net income 
    data[8].push((100 * income_ltm['netIncome']/income_ltm['revenue']).toFixed(2) + '%');
    data[9].push((income_ltm['netIncome']/1000000).toFixed(2));
    
    contextItem = {name:'Income Statement Margins (Mil. ' + income[0]['reportedCurrency'] + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
    // Cash Flow Statement Margins Table
    var rows = ['Revenue', 'Cash From Operating Activities(% of Revenue)',  'Cash From Operating Activities', 'Free Cash Flow(% of Revenue)', 'Free Cash Flow',
                'Depreciation and Amortization(% of Revenue)', 'Depreciation and Amortization', 'Capital Expenditure(% of Revenue)', 'Capital Expenditure'];
    var columns = [];
    var data = [[], [], [], [], [], [], [], [], []];
    var firstYear = parseInt(flows[flows.length-1]['date']);

    for(var i = 0; i<flows.length; i++){
      var i_inverse = flows.length - i - 1;
      columns.push(firstYear + i);
      // netCashProvidedByOperatingActivities
      data[0].push((flows[i_inverse]['revenue']/1000000).toFixed(2));
      data[1].push((100 * flows[i_inverse]['netCashProvidedByOperatingActivities']/flows[i_inverse]['revenue']).toFixed(2) + '%');
      data[2].push((flows[i_inverse]['netCashProvidedByOperatingActivities']/1000000).toFixed(2));
      // freeCashFlow
      data[3].push((100 * flows[i_inverse]['freeCashFlow']/flows[i_inverse]['revenue']).toFixed(2) + '%');
      data[4].push((flows[i_inverse]['freeCashFlow']/1000000).toFixed(2));
      // depreciationAndAmortization
      data[5].push((100 * flows[i_inverse]['depreciationAndAmortization']/flows[i_inverse]['revenue']).toFixed(2) + '%');
      data[6].push((flows[i_inverse]['depreciationAndAmortization']/1000000).toFixed(2));
      // capitalExpenditure
      data[7].push((100 * flows[i_inverse]['capitalExpenditure']/flows[i_inverse]['revenue']).toFixed(2) + '%');
      data[8].push((flows[i_inverse]['capitalExpenditure']/1000000).toFixed(2));
    }
    columns.push('LTM');
    data[0].push((flows_ltm['revenue']/1000000).toFixed(2));
    data[1].push((100 * flows_ltm['netCashProvidedByOperatingActivities']/flows_ltm['revenue']).toFixed(2) + '%');
    data[2].push((flows_ltm['netCashProvidedByOperatingActivities']/1000000).toFixed(2));
    // freeCashFlow
    data[3].push((100 * flows_ltm['freeCashFlow']/flows_ltm['revenue']).toFixed(2) + '%');
    data[4].push((flows_ltm['freeCashFlow']/1000000).toFixed(2));
    // depreciationAndAmortization
    data[5].push((100 * flows_ltm['depreciationAndAmortization']/flows_ltm['revenue']).toFixed(2) + '%');
    data[6].push((flows_ltm['depreciationAndAmortization']/1000000).toFixed(2));
    // capitalExpenditure
    data[7].push((100 * flows_ltm['capitalExpenditure']/flows_ltm['revenue']).toFixed(2) + '%');
    data[8].push((flows_ltm['capitalExpenditure']/1000000).toFixed(2));

    contextItem = {name:'Cash Flow Statement Margins (Mil. ' + flows[0]['reportedCurrency'] + ')', display:'table', rows:rows, columns:columns, data:data};
    context.push(contextItem);
    
	renderChart('Cash Flow Statement Margins(% of Revenue)');
    monitor(context);
});

var DESCRIPTION = Description(`<h5>Annual Margin Analysis Report</h5>
                                Margins refer to the ratio between a financial report item and the revenue (Example: Net Income Margin = Net Income / Revenue).
                                This analysis provides a report of the company's key margins, which could be further used in a valuation model.
                                `);
