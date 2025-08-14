"""
    Model: Discounted Future Market Cap

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Discounted Future Market Cap

This model estimates the intrinsic value of a common share by projecting the Future Market Capitalization using the estimated PE Ratio and then discounting it to the Present using an Annual Required Rate of Return.
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "beta": data.get("profile:beta", default=1),
        "%risk_free_rate": data.get("treasury:year10"),
        "%market_premium": data.get("risk:totalEquityRiskPremium"),
        "pe_ratio": data.get("ratio:priceEarningsRatio"),
        "%revenue_growth_rate": None,
        "%net_income_margin": None,
        "historical_years": 10,
        "projection_years": 5,
    },
    "hierarchies": [{
        "parent": "%discount_rate",
        "children": ["beta", "%risk_free_rate", "%market_premium"]
    }]
})

# Calculate cost of equity
cost_of_equity = assumptions.get("%risk_free_rate") + assumptions.get("beta") * assumptions.get("%market_premium")
assumptions.set("%discount_rate", cost_of_equity)

# Compute metrics
data.compute({
    "%grossMargin": "income:grossProfit / income:revenue",
    "%operating_margin": "income:operatingIncome / income:revenue",
    "%netMargin": "income:netIncome / income:revenue",
    "%revenueGrowthRate": "function:growth:income:revenue",
    "%netIncomeGrowthRate": "function:growth:income:netIncome",
    "%totalStockholdersEquityGrowthRate": "function:growth:balance:totalStockholdersEquity",

    # Calculating NOPAT (Net Operating Profit After Taxes)
    "%taxRate": "income:incomeTaxExpense / income:incomeBeforeTax",
    "incomeTax": "income:operatingIncome * %taxRate",
    "nopat": "income:operatingIncome - incomeTax",

    # Calculating Invested Capital
    "investedCapital": [
        "balance:totalNonCurrentAssets", "-", "balance:cashAndCashEquivalents", "+",
        "balance:totalCurrentAssets", "-", "balance:totalCurrentLiabilities"
    ],
    "%roic": "nopat / investedCapital",
})

data.set_default_range(f"{-assumptions.get('historical_years')}->0")

assumptions.set("%net_income_margin", data.average(f"%netMargin"))
assumptions.set_bounds(
    "%net_income_margin", low=0, high="100%"
)

assumptions.set("%revenue_growth_rate", data.average(f"%revenueGrowthRate"))
assumptions.set_bounds(
    "%revenue_growth_rate", low=0, high="25%"
)

# Compute forecasted values and ratios
data.compute({
    "income:revenue": f"""
        income:revenue:-1 * 
        (1 + {assumptions.get('%revenue_growth_rate')})
    """,
    "%revenueGrowthRate": "function:growth:income:revenue",
    "income:netIncome": f"income:revenue * {assumptions.get('%net_income_margin')}",
}, forecast=assumptions.get("projection_years"))

projected_revenue = data.get("revenue")
projected_net_income = data.get(f"income:netIncome:{assumptions.get('projection_years')}")

shares_outstanding = data.get("income:weightedAverageShsOut")
future_market_cap = assumptions.get("pe_ratio") * projected_net_income
discounted_future_market_cap = future_market_cap / (
            (1 + assumptions.get("%discount_rate")) ** assumptions.get("projection_years"))

stock_value = discounted_future_market_cap / shares_outstanding

# Set the final value
model.set_final_value({
    "value": stock_value,
    "units": "$"
})

# Render results
model.render_results([
    [stock_value, "Present Value", "$"],
    [projected_net_income, "Estimated net income", "$"],
    [future_market_cap, "Estimated market capitalization", "$"],
    [discounted_future_market_cap, "Market capitalization discounted to present", "$"],
    [shares_outstanding, "Shares Outstanding", "#"],
    [data.get("income:eps"), "Earnings Per Share (EPS)", "$"],
    [data.get("profile:price"), "Market Price", "$"],
    [data.get("ratio:priceEarningsRatio"), "Price to Earnings (PE) Ratio", "#"]
])

# Render chart
model.render_chart({
    "data": {
        "income:revenue": "Revenue",
        "income:netIncome": "Net Income"
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": "Historical and forecasted data",
        "set_editable": [
            "income:revenue",
            "income:netIncome"
        ]
    }
})

# Render table for estimated future values
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%revenueGrowthRate": "Revenue Growth Rate",
        "income:netIncome": "Net Income",
    },
    "start": -1,
    "end": "*",
    "properties": {
        "title": "Estimated Future Values",
        "order": "ascending",
        "number_format": "M"
    }
})

# Render historical values table
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "income:costOfRevenue": "Cost of Revenue",
        "income:grossProfit": "Gross Profit",
        "%grossMargin": "Gross Margin",
        "income:operatingIncome": "Operating Income",
        "%operating_margin": "Operating Margin",
        "income:netIncome": "Net Income",
        "%netMargin": "Net Margin",
    },
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Historical Values",
        "display_averages": True,
        "order": "descending",
        "number_format": "M"
    },
})

# Render historical growth rates table
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%revenueGrowthRate": "Revenue Growth Rate",
        "income:netIncome": "Net Income",
        "%netMargin": "Net Margin",
        "%netIncomeGrowthRate": "Net Income Growth Rate",
        "balance:totalStockholdersEquity": "Stockholders Equity",
        "%totalStockholdersEquityGrowthRate": "Equity Growth Rate",
        "%roic": "Return on Invested Capital (ROIC)",
        "nopat": "After-tax Operating Income",
        "%taxRate": "Income Tax Rate",
        "investedCapital": "Invested Capital",
    },
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Historical Growth Rates",
        "display_averages": True,
        "order": "descending",
        "number_format": "M"
    },
})

# Set description for assumptions
assumptions.set_description({
    "%discount_rate": r"""
        ## Discount Rate

        `Discount Rate` = `Cost of Equity` = `Risk Free Rate` + `Beta` * `Market Premium`

        The cost of equity is the theoretical rate of return that an equity investment should generate. It is calculated using the CAPM formula.

        [Read More](https://www.investopedia.com/terms/c/costofequity.asp#mntl-sc-block_1-0-20)
    """,

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

    "pe_ratio": r"""
        ## Price to Earnings (PE) Ratio

        Estimated Price to Earnings (PE) Ratio at the end of the projection period.

        `Future Market Cap` = `PE Ratio` * `Projected Net Income`
    """,

    "%revenue_growth_rate": r"""
        ## Revenue Growth Rate

        The annual revenue growth rate is applied to projected revenue starting from the second projection year onward.
    """,

    "%net_income_margin": r"""
        ## Net Income Margin

        Net Income expressed as a percentage of Revenue.
    """,

    "historical_years": r"""
        ## Historical Years

        The number of historical years used to calculate averages for historical data.
    """,

    "projection_years": r"""
        ## Projection Years

        The number of years for projecting the analysis into the future.
    """,
})

print("End of model.")
