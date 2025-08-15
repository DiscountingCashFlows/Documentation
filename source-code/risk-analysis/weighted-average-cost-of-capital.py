"""
    Model: WACC (Weighted Average Cost of Capital)

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Weighted Average Cost of Capital (WACC)

WACC is a financial metric that helps in calculating a firm’s cost of financing by combining the cost of debt and cost of equity structure together.

Read more: [GitHub Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/discounted-free-cash-flow.md#discount-rate-wacc---weighted-average-cost-of-capital)
""")

# Initialize assumptions
assumptions.init({
    "beta": data.get("profile:beta", default=1),
    "%risk_free_rate": data.get("treasury:year10"),
    "%market_premium": data.get("risk:totalEquityRiskPremium"),
    "%tax_rate": None,
})

# WACC Calculation
risk_free_rate = assumptions.get("%risk_free_rate")
beta = assumptions.get("beta")
market_premium = assumptions.get("%market_premium")
cost_of_equity = risk_free_rate + beta * market_premium
cost_of_debt = data.get("income:interestExpense / balance:totalDebt")
if cost_of_debt is None:
    # Use the 10-year Treasury yield instead
    cost_of_debt = data.get("treasury:year10")

tax_rate = data.get("income:incomeTaxExpense / income:incomeBeforeTax")
if tax_rate is None or tax_rate < 0:
    # Fall back to the statutory corporate rate
    tax_rate = data.get("risk:corporateTaxRate")
assumptions.set("%tax_rate", tax_rate)

market_cap = data.get("profile:price * income:weightedAverageShsOut")
debt_weight = data.get(f"balance:totalDebt / ({market_cap} + balance:totalDebt)")
if debt_weight is None:
    # Assume zero leverage if missing
    debt_weight = 0

equity_weight = 1 - debt_weight
wacc = debt_weight * cost_of_debt * (1 - assumptions.get("%tax_rate")) + equity_weight * cost_of_equity

model.set_final_value({
    "value": wacc,
    "units": '%'
})

# Render results
model.render_results([
    [wacc, "WACC", '%'],
    [market_cap, "Market Cap", '$'],
    [data.get("income:interestExpense"), "Interest Expense", '$'],
    [data.get("balance:shortTermDebt"), "Short Term Debt", '$'],
    [data.get("balance:longTermDebt"), "Long Term Debt", '$'],
    [data.get("balance:totalDebt"), "Total Debt", '$'],
    [equity_weight, "Equity Weight", '%'],
    [cost_of_equity, "Cost of Equity", '%'],
    [debt_weight, "Debt Weight", '%'],
    [cost_of_debt, "Cost of Debt", '%'],
    [data.get("income:incomeTaxExpense"), "Income Tax Expense", '$'],
    [data.get("income:incomeBeforeTax"), "Income Before Tax", '$'],
    [tax_rate, "Tax Rate", '%'],
])

# Set description for assumptions
assumptions.set_description({
    "beta": r"""
        ## Beta

        Beta is a value that measures the price fluctuations (volatility) of a stock with respect to fluctuations in the overall stock market.
    """,

    "%risk_free_rate": r"""
        ## Risk-Free Rate

        The risk-free rate represents the interest an investor would expect from an absolutely risk-free investment over a specified period of time.
        By default, it is equal to the current yield of the U.S. 10 Year Treasury Bond.
    """,

    "%market_premium": r"""
        ## Market Premium

        Market risk premium represents the excess returns over the risk-free rate that investors expect for taking on the incremental risks connected to the equities market.
    """,

    "%tax_rate": r"""
        ## Tax Rate
        
        `Tax Rate` = `Income Tax Expense` / `Income Before Tax`
        
        This is the company’s **effective tax rate**, reflecting the average rate of tax actually paid on its pre-tax earnings (including all statutory, deferred, and non-recurring items).
        
        This rate is used to adjust the after-tax cost of debt, since interest expense is tax-deductible.
        
        ## Discount Rate
        
        `Discount Rate` =  
        `Debt Weight` × `Cost of Debt` × (1 − `Tax Rate`)  
        + `Equity Weight` × `Cost of Equity`
    """,
})

print("End of model.")
