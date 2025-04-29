"""
    Model: Discounted Free Cash Flow - Exit Multiple

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Discounted Free Cash Flow - Exit EBITDA Multiple

Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.

Read more: [GitHub Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discounted-free-cash-flow-model-source-code)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "beta": data.get("profile:beta", default=1),
        "%risk_free_rate": data.get("treasury:year10"),
        "%market_premium": data.get("risk:totalEquityRiskPremium"),
        "%revenue_growth_rate": None,
        "exit_ebitda_multiple": None,
        "%ebitda_margin": None,
        "%capital_expenditure_to_ebitda": None,
        "%operating_cash_flow_to_ebitda": None,
        "historical_years": 10,
        "projection_years": 5,
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

# Compute ratios
data.compute({
    "%operatingCashFlowToEbitda": "flow:operatingCashFlow / income:ebitda",
    "%capitalExpenditureToEbitda": "flow:capitalExpenditure / income:ebitda",
    "%netIncomeToEbitda": "income:netIncome / income:ebitda",
    "%freeCashFlowToEbitda": "flow:freeCashFlow / income:ebitda",
    "%grossMargin": "income:grossProfit / income:revenue",
    "%ebitdaMargin": "income:ebitda / income:revenue",
    "discountedFreeCashFlow": "flow:freeCashFlow",
    "%revenueGrowthRate": "function:growth:income:revenue",
})

# Calculate margins
ebitda_margin = data.average(f"%ebitdaMargin:{-assumptions.get('historical_years')}->0")
assumptions.set("%ebitda_margin", ebitda_margin)

operating_cash_flow_margin = data.average(f"%operatingCashFlowToEbitda:{-assumptions.get('historical_years')}->0")
assumptions.set("%operating_cash_flow_to_ebitda", operating_cash_flow_margin)

capital_expenditure_margin = -data.average(f"%capitalExpenditureToEbitda:{-assumptions.get('historical_years')}->0")
assumptions.set("%capital_expenditure_to_ebitda", capital_expenditure_margin)

average_revenue_growth_rate = data.average(f"%revenueGrowthRate:{-assumptions.get('historical_years')}->0")
assumptions.set("%revenue_growth_rate", average_revenue_growth_rate)

# Calculate the Enterprise Value and set the exit EBITDA multiple
ev = data.get("profile:mktCap") + data.get("balance:totalDebt") - data.get("balance:cashAndShortTermInvestments")
exit_ebitda_multiple = ev / data.get("income:ebitda")
assumptions.set("exit_ebitda_multiple", exit_ebitda_multiple)

data.compute({
    "linearRegressionRevenue": f"""
        function:linear_regression:income:revenue 
        start:{-assumptions.get('historical_years')}
    """,
}, forecast=assumptions.get("projection_years"))

# Compute forecasted values and ratios
data.compute({
    "income:revenue": f"""
        function:compound:{data.get('linearRegressionRevenue:1')} 
        rate:{assumptions.get('%revenue_growth_rate')} 
        offset:-1
    """,
    "income:ebitda": f"income:revenue * {assumptions.get('%ebitda_margin')}",
    "%revenueGrowthRate": "function:growth:income:revenue",
    "flow:operatingCashFlow": f"income:ebitda * {assumptions.get('%operating_cash_flow_to_ebitda')}",
    "computedCapitalExpenditure": f"income:ebitda * {assumptions.get('%capital_expenditure_to_ebitda')}",
    "flow:freeCashFlow": "flow:operatingCashFlow - computedCapitalExpenditure",
    "flow:capitalExpenditure": "flow:freeCashFlow - flow:operatingCashFlow",
    "discountedFreeCashFlow": f"""
        function:discount:flow:freeCashFlow 
        rate:{assumptions.get('%discount_rate')} 
        continuous:true
    """,
    # Informational computations
    "%operatingCashFlowToEbitda": "flow:operatingCashFlow / income:ebitda",
    "%capitalExpenditureToEbitda": "flow:capitalExpenditure / income:ebitda",
    "%freeCashFlowToEbitda": "flow:freeCashFlow / income:ebitda",
    "%ebitdaMargin": "income:ebitda / income:revenue",
    "#compoundedDiscountRate": f"""
        function:compound:1
        rate:{assumptions.get('%discount_rate')} 
        continuous:true
    """,
    "%compoundedDiscountRate": "#compoundedDiscountRate - 1",
}, forecast=assumptions.get("projection_years"))

# Calculate the terminal value
terminal_value = assumptions.get("exit_ebitda_multiple") * data.get(f"income:ebitda:{assumptions.get('projection_years')}")

# Discount the terminal value into the present
discounted_terminal_value = terminal_value / ((1 + assumptions.get("%discount_rate")) ** assumptions.get("projection_years"))

# Projected enterprise value calculation
projected_enterprise_value = discounted_terminal_value + data.sum(f"discountedFreeCashFlow:1->{assumptions.get('projection_years')}")

# Equity value calculation
equity_value = projected_enterprise_value + data.get("balance:cashAndShortTermInvestments") - data.get("balance:totalDebt")
value_per_share = equity_value / data.get("income:weightedAverageShsOut")

# Set the final value
model.set_final_value({
    "value": value_per_share,
    "units": "$"
})

# Render results
model.render_results([
    [exit_ebitda_multiple, "Exit EBITDA Multiple (EV/EBITDA)", "#"],
    [data.get(f"income:ebitda:{assumptions.get('projection_years')}"), "Terminal EBITDA", "$"],
    [terminal_value, "Terminal Enterprise Value", "$"],
    [discounted_terminal_value, "Discounted Terminal Enterprise Value", "$"],
    [projected_enterprise_value - discounted_terminal_value, "Sum of Discounted Free Cash Flow", "$"],
    [projected_enterprise_value, "Present Enterprise Value", "$"],
    [data.get("balance:cashAndShortTermInvestments"), "Cash and Equivalents", "$"],
    [data.get("balance:totalDebt"), "Total Debt", "$"],
    [equity_value, "Present Equity Value", "$"],
    [data.get("income:weightedAverageShsOut"), "Shares Outstanding", "#"],
    [value_per_share, "Estimated Value per Share", "$"],
    [data.get("treasury:year10"), "Yield of the U.S. 10 Year Treasury Note", "%"],
    [cost_of_equity, "Cost of Equity", "%"],
    [equity_weight, "Equity Weight", "%"],
    [cost_of_debt, "Cost of Debt", "%"],
    [debt_weight, "Debt Weight", "%"],
    [tax_rate, "EBIT Tax Rate", "%"],
])

# Render Chart
model.render_chart({
    "data": {
        "income:revenue": "Revenue",
        "flow:operatingCashFlow": "Operating Cash Flow",
        "income:ebitda": "EBITDA",
        "flow:freeCashFlow": "Free Cash Flow",
        "flow:capitalExpenditure": "Capital Expenditure",
        "linearRegressionRevenue": "Linear Regression Revenue",
        "discountedFreeCashFlow": "Discounted Free Cash Flow",
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": "Historical and Forecasted Data",
        "number_format": "M",
        "set_editable": [
            "income:revenue",
            "flow:operatingCashFlow",
            "flow:freeCashFlow",
            "income:ebitda",
        ],
        "hidden_keys": [
            "linearRegressionRevenue",
            "discountedFreeCashFlow"
        ],
    }
})

# Render Table for Estimated Future Data
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%revenueGrowthRate": "Revenue Growth Rate",
        "income:ebitda": "EBITDA",
        "%ebitdaMargin": "EBITDA Margin",
        "flow:operatingCashFlow": "Operating Cash Flow",
        "%operatingCashFlowToEbitda": "Operating Cash Flow to EBITDA",
        "flow:capitalExpenditure": "Capital Expenditure",
        "%capitalExpenditureToEbitda": "Capital Expenditure to EBITDA",
        "flow:freeCashFlow": "Free Cash Flow",
        "%freeCashFlowToEbitda": "Free Cash Flow to EBITDA",
        "%compoundedDiscountRate": "Compounded Discount Rate",
        "discountedFreeCashFlow": "Discounted Free Cash Flow",
    },
    "start": -1,
    "end": "*",
    "properties": {
        "title": "Estimated Future Data",
        "order": "ascending",
        "number_format": "M",
    }
})

# Render Historical Table
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%revenueGrowthRate": "Revenue Growth Rate",
        "income:costOfRevenue": "Cost of Revenue",
        "income:grossProfit": "Gross Profit",
        "%grossMargin": "Gross Margin",
        "income:ebitda": "EBITDA",
        "%ebitdaMargin": "EBITDA Margin",
        "income:netIncome": "Net Income",
        "%netIncomeToEbitda": "Net Income to EBITDA",
        "flow:operatingCashFlow": "Cash from Operating Activities",
        "%operatingCashFlowToEbitda": "Cash from Operating Activities to EBITDA",
        "flow:capitalExpenditure": "Capital Expenditure",
        "%capitalExpenditureToEbitda": "Capital Expenditure to EBITDA",
        "flow:freeCashFlow": "Free Cash Flow",
        "%freeCashFlowToEbitda": "Free Cash Flow to EBITDA",
    },
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Historical Data",
        "display_averages": True,
        "order": "descending",
        "number_format": "M",
    }
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

    "%revenue_growth_rate": r"""
        ## Revenue Growth Rate
        
        The annual growth rate applied to projected revenue, starting from the second projection year onward.
    """,

    "exit_ebitda_multiple": r"""
        ## Exit EBITDA Multiple
        
        The exit EV/EBITDA multiple used to calculate the terminal value.
    """,

    "%ebitda_margin": r"""
        ## EBITDA Margin
        
        EBITDA expressed as a percentage of Revenue.
    """,

    "%capital_expenditure_to_ebitda": r"""
        ## Capital Expenditure to EBITDA
        
        Capital expenditure expressed as a percentage of EBITDA.
    """,

    "%operating_cash_flow_to_ebitda": r"""
        ## Operating Cash Flow to EBITDA
        
        Operating cash flow expressed as a percentage of EBITDA.
    """,

    "historical_years": r"""
        ## Historical Years
        
        The number of years of historical data used to calculate averages and trends for analysis.
    """,

    "projection_years": r"""
        ## Projection Years
        
        The number of years into the future for which the analysis projects financial performance and metrics.
    """,
})

print(f"End of model.")
