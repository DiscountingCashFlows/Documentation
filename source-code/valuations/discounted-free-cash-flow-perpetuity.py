"""
    Model: Discounted Free Cash Flow - Perpetuity

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Discounted Free Cash Flow Model

Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.

See our [GitHub Model Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discounted-free-cash-flow-model-source-code)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "beta": data.get("profile:beta", default=1),
        "%risk_free_rate": data.get("treasury:year10"),
        "%market_premium": data.get("risk:totalEquityRiskPremium"),
        "%growth_in_perpetuity": data.get("treasury:year10"),
        "historical_years": 10,
        "projection_years": 5,
        "%revenue_growth_rate": None,
        "%operating_cash_flow_margin": None,
        "%capital_expenditure_margin": None,
    },
    "hierarchies": [{
        "parent": "%discount_rate",
        "children": ["beta", "%risk_free_rate", "%market_premium"]
    }]
})

# WACC Calculation
risk_free_rate = assumptions.get("%risk_free_rate")
beta = assumptions.get("beta")
market_premium = assumptions.get("%market_premium")
cost_of_equity = risk_free_rate + beta * market_premium
cost_of_debt = data.get("income:interestExpense") / data.get("balance:totalDebt")

tax_rate = data.get("income:incomeTaxExpense") / data.get("income:incomeBeforeTax")

if tax_rate < 0:
    tax_rate = 0

market_cap = data.get("profile:price") * data.get("income:weightedAverageShsOut")
debt_weight = data.get("balance:totalDebt") / (market_cap + data.get("balance:totalDebt"))
equity_weight = 1 - debt_weight
wacc = debt_weight * cost_of_debt * (1 - tax_rate) + equity_weight * cost_of_equity

# Set the discount rate to the WACC
assumptions.set("%discount_rate", wacc)

data.compute({
    "%operatingCashFlowMargin": "flow:operatingCashFlow / income:revenue",
    "%capitalExpenditureMargin": "flow:capitalExpenditure / income:revenue",
    "%grossMargin": "income:grossProfit / income:revenue",
    "%operatingMargin": "income:operatingIncome / income:revenue",
    "%netMargin": "income:netIncome / income:revenue",
    "discountedFreeCashFlow": "flow:freeCashFlow",
    "%revenueGrowthRate": "function:growth:income:revenue",
})

data.set_default_range(f"{-assumptions.get('historical_years')}->0")

assumptions.set("%revenue_growth_rate", data.average("%revenueGrowthRate"))
# Limit revenue growth rate between 0% and 25%
assumptions.set_bounds(
    "%revenue_growth_rate", low=0, high="25%"
)

average_operating_cash_flow_margin = data.average("%operatingCashFlowMargin")
assumptions.set("%operating_cash_flow_margin", average_operating_cash_flow_margin)
# Limit OCF range from 0 to 100% (all revenue converted to OCF)
assumptions.set_bounds(
    "%operating_cash_flow_margin", low=0, high="100%"
)

average_capital_expenditure_margin = -data.average("%capitalExpenditureMargin")
assumptions.set("%capital_expenditure_margin", average_capital_expenditure_margin)

# Limit CapEx range from 0 to 90% of OCF Margin
assumptions.set_bounds(
    "%capital_expenditure_margin",
    low=0,
    high=assumptions.get("%operating_cash_flow_margin")*.9
)

data.compute({
    "income:revenue": f"""
        income:revenue:-1 * 
        (1 + {assumptions.get('%revenue_growth_rate')})
    """,
    "%revenueGrowthRate": "function:growth:income:revenue",
    "flow:operatingCashFlow": f"""
        income:revenue * 
        {assumptions.get('%operating_cash_flow_margin')}
    """,
    "computedCapitalExpenditure": f"""
        income:revenue * 
        {assumptions.get('%capital_expenditure_margin')}
    """,
    "flow:freeCashFlow": "flow:operatingCashFlow - computedCapitalExpenditure",
    "flow:capitalExpenditure": "flow:freeCashFlow - flow:operatingCashFlow",
    "discountedFreeCashFlow": f"""
        function:discount:flow:freeCashFlow 
        rate:{assumptions.get('%discount_rate')}
        continuous:true
    """,
    # Informational computations
    "%operatingCashFlowMargin": "flow:operatingCashFlow / income:revenue",
    "%capitalExpenditureMargin": "flow:capitalExpenditure / income:revenue",
    "%freeCashFlowMargin": "flow:freeCashFlow / income:revenue",
    "#compoundedDiscountRate": f"""
        function:compound:1
        rate:{assumptions.get('%discount_rate')} 
        continuous:true
    """,
    "%compoundedDiscountRate": "#compoundedDiscountRate - 1",
}, forecast=assumptions.get("projection_years"))

# Calculating the Terminal Value
# TV = FCF * (1 + Growth in Perpetuity) / (Discount Rate - Growth in Perpetuity)
terminal_value = \
    data.get(f"flow:freeCashFlow:{assumptions.get('projection_years')}") * \
    (1 + assumptions.get("%growth_in_perpetuity")) / \
    (assumptions.get("%discount_rate") - assumptions.get("%growth_in_perpetuity"))

# Discount the terminal value into the present
tv_discount_rate = (1 + assumptions.get("%discount_rate")) ** assumptions.get('projection_years')
discounted_terminal_value = terminal_value / tv_discount_rate

# Get the sum between current date and projection years
discounted_free_cash_flow_sum = data.sum("discountedFreeCashFlow:1->*")

# Add all Discounted FCFs and the Discounted Terminal Value to calculate the enterprise value
enterprise_value = discounted_terminal_value + discounted_free_cash_flow_sum

# Equity value is calculated by adding cash and subtracting total debt from the enterprise value
equity_value = enterprise_value + data.get("balance:cashAndShortTermInvestments") - \
               data.get("balance:totalDebt")

stock_value = equity_value / data.get("income:weightedAverageShsOut")

model.set_final_value({
    "value": stock_value,
    "units": '$'
})

model.render_results([
    [terminal_value, "Terminal Value", "$"],
    [discounted_terminal_value, "Discounted Terminal Value", "$"],
    [discounted_free_cash_flow_sum, "Sum of Discounted Free Cash Flow", "$"],
    [enterprise_value, "Enterprise Value", "$"],
    [data.get("balance:cashAndCashEquivalents"), "Cash and Equivalents", "$"],
    [data.get("balance:totalDebt"), "Total Debt", "$"],
    [equity_value, "Equity Value", "$"],
    [data.get("income:weightedAverageShsOut"), "Shares Outstanding", "$"],
    [stock_value, "Estimated Value per Share", "$"],
    [data.get("treasury:year10"), "Yield of the U.S. 10 Year Treasury Note", "%"],
    [average_operating_cash_flow_margin, "Average Cash from Operating Activities Margin", "%"],
    [average_capital_expenditure_margin, "Average Capital Expenditure Margin", "%"],
    [cost_of_equity, "Cost of Equity", "%"],
    [equity_weight, "Equity Weight", "%"],
    [cost_of_debt, "Cost of Debt", "%"],
    [debt_weight, "Debt Weight", "%"],
    [tax_rate, "Tax Rate", "%"],
])

model.render_chart({
    "data": {
        "income:revenue": "Revenue",
        "flow:operatingCashFlow": "Operating Cash Flow",
        "flow:freeCashFlow": "Free Cash Flow",
        "flow:capitalExpenditure": "Capital Expenditure",
        "discountedFreeCashFlow": "Discounted Free Cash Flow"
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": "Historical Values",
        "set_editable": [
            "income:revenue",
            "flow:operatingCashFlow",
            "flow:freeCashFlow"
        ],
        "hidden_keys": [
            "flow:capitalExpenditure",
            "discountedFreeCashFlow"
        ],
        "width": "full"
    },
})

# Forecast table
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%revenueGrowthRate": "Revenue Growth Rate",
        "flow:operatingCashFlow": "Operating Cash Flow",
        "%operatingCashFlowMargin": "Operating Cash Flow Margin",
        "flow:capitalExpenditure": "Capital Expenditure",
        "%capitalExpenditureMargin": "Capital Expenditure Margin",
        "flow:freeCashFlow": "Free Cash Flow",
        "%freeCashFlowMargin": "Free Cash Flow Margin",
        "%compoundedDiscountRate": "Compounded Discount Rate",
        "discountedFreeCashFlow": "Discounted Free Cash Flow",
    },
    "start": -1,
    "end": "*",
    "properties": {
        "title": "Forecast Data",
        "order": "ascending",
        "include_ltm": False,
        "number_format": "M",
        "width": "full"
    },
})

# Historical table
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%revenueGrowthRate": "Revenue Growth Rate",
        "income:costOfRevenue": "Cost of Revenue",
        "income:grossProfit": "Gross Profit",
        "%grossMargin": "Gross Margin",
        "income:operatingIncome": "Operating Income",
        "%operatingMargin": "Operating Margin",
        "income:netIncome": "Net Income",
        "%netMargin": "Net Margin",
        "flow:operatingCashFlow": "Cash from Operating Activities",
        "%operatingCashFlowMargin": "Cash from Operating Activities Margin",
        "flow:capitalExpenditure": "Capital Expenditure",
        "flow:freeCashFlow": "Free Cash Flow",
    },
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Historical Data",
        "display_averages": True,
        "order": "descending",
        "number_format": "M"
    },
})

assumptions.set_description({
    "%discount_rate": r"""
        ## Discount Rate
        
        `Discount Rate` = `Equity Weight` * `Cost of Equity` + `Debt Weight` * `Cost of Debt` * (1 - `Tax Rate`)
        
        Calculated using Weighted Average Cost of Capital (WACC) formula. It represents a firm’s average after-tax cost of capital from all sources, including common stock, preferred stock, bonds, and other forms of debt.
        
        [Read More](https://www.investopedia.com/terms/w/wacc.asp)
        
        ---
        
        ### Cost of Equity
        
        `Cost of Equity` = `Risk Free Rate` + `Beta` * `Market Premium`
        
        The cost of equity is the theoretical rate of return that an equity investment should generate. It is calculated using the CAPM formula.
        
        [Read More](https://www.investopedia.com/terms/c/costofequity.asp#mntl-sc-block_1-0-20)
        
        ---
        
        ### Cost of Debt
        
        `Cost of Debt` = `Interest Expense` / `Total Debt`
        
        The cost of debt is the effective rate that a company pays on its debt, such as bonds and loans.
        
        [Read More](https://www.investopedia.com/terms/c/costofdebt.asp)
        
        ---
        
        ### Equity & Debt Weights
        
        `Debt Weight` = `Total Debt` / (`Market Capitalization` + `Total Debt`) = 1 - `Equity Weight`
        
        The Equity Weight represents the proportion of equity-based financing (Market Capitalization), while the Debt Weight represents the proportion of debt-based financing (Total Debt).
        
        ---
        
        ### Tax Rate
        
        `Tax Rate` = `Income Tax Expense` / `Income Before Tax`
        
        The overall tax rate paid by the company on its earned income.
    """,

    "beta": r"""
        ## Beta
        
        Beta measures the volatility of a stock's price in relation to the overall stock market. A higher beta indicates greater price fluctuations relative to the market.
    """,

    "%risk_free_rate": r"""
        ## Risk-Free Rate
        
        The risk-free rate represents the return an investor expects from an absolutely risk-free investment over a specified time period. By default, it is set to the current yield of the U.S. 10-Year Treasury Bond.
    """,

    "%market_premium": r"""
        ## Market Premium
        
        The market risk premium represents the additional return over the risk-free rate that investors expect for taking on the risks associated with equities.
    """,


    "%growth_in_perpetuity": r"""
        ## Growth in Perpetuity
        
        The rate at which the company's free cash flow is assumed to grow indefinitely. By default, this rate equals the yield of the U.S. 10-Year Treasury Bond.
    """,

    "historical_years": r"""
        ## Historical Years
        
        The number of years of historical data used to calculate averages and trends for analysis.
    """,

    "projection_years": r"""
        ## Projection Years
        
        The number of years into the future for which the analysis projects financial performance and metrics.
    """,

    "%revenue_growth_rate": r"""
        ## Revenue Growth Rate
        
        The annual growth rate applied to projected revenue, starting from the second projection year onward.
    """,

    "%operating_cash_flow_margin": r"""
        ## Operating Cash Flow Margin
        
        `Projected Operating Cash Flow` = `Projected Revenue` * `Operating Cash Flow Margin`
        
        This margin represents the percentage of revenue used to estimate future Operating Cash Flow.
    """,

    "%capital_expenditure_margin": r"""
        ## Capital Expenditure Margin
        
        `Projected Free Cash Flow` = `Projected Operating Cash Flow` - `Projected Revenue` * `Capital Expenditure Margin`
        
        This margin is used to estimate future capital expenditures as a percentage of revenue, which in turn is subtracted from Operating Cash Flow to calculate Free Cash Flow.
    """,
})

print(f"End of model.")
