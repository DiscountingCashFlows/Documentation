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
})

# Cost of Debt
# Total Debt = Short Term Debt + Long Term Debt
cost_of_debt = data.get("income:interestExpense") / data.get("balance:totalDebt")

# Tax Rate
tax_rate = data.get("income:incomeTaxExpense") / data.get("income:incomeBeforeTax")
if tax_rate < 0:
    tax_rate = 0

# Cost of Equity
cost_of_equity = assumptions.get("%risk_free_rate") + assumptions.get("beta") * assumptions.get("%market_premium")

# Weights
total_debt = data.get("balance:shortTermDebt") + data.get("balance:longTermDebt")
market_cap = data.get("profile:price") * data.get("income:weightedAverageShsOut")

debt_weight = total_debt / (market_cap + total_debt)
equity_weight = market_cap / (market_cap + total_debt)

# Calculate WACC
wacc = debt_weight * cost_of_debt * (1 - tax_rate) + equity_weight * cost_of_equity

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
})

print("End of model.")
