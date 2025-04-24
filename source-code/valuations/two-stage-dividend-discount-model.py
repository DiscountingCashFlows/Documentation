"""
    Model: Two-Stage Dividend Discount Model

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Two-Stage Dividend Discount Model

Used to estimate the value of companies based on two stages of growth. An initial period of high growth, calculated using **[Sum of Discounted Dividends]**, followed by a period of stable growth, calculated using **[Discounted Terminal Value]**.

Read more: [GitHub Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#two-stage-dividend-discount-model-source-code)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "beta": data.get("profile:beta", default=1),
        "%risk_free_rate": data.get("treasury:year10"),
        "%market_premium": data.get("risk:totalEquityRiskPremium"),
        "high_growth_years": 5,
        "historical_years": None,
        "%high_growth_rate": None,
        "%high_growth_payout": None,
        "%stable_growth_in_perpetuity": data.get("treasury:year10"),
        "%stable_payout": None,
    },
    "hierarchies": [{
        "parent": "%discount_rate",
        "children": ["beta", "%risk_free_rate", "%market_premium"]
    }]
})

# Set the discount rate to the cost of equity
risk_free_rate = assumptions.get("%risk_free_rate")
beta = assumptions.get("beta")
market_premium = assumptions.get("%market_premium")
cost_of_equity = risk_free_rate + beta * market_premium

assumptions.set("%discount_rate", cost_of_equity)

# Count all dividends excluding None and 0 values
dividend_count = data.count("dividend:adjDividend:*", properties={"except_values": [None, 0]})

if dividend_count <= 0:
    raise ValueError("The company does not currently pay dividends!")

elif dividend_count > 10:
    assumptions.set("historical_years", 10)

else:
    # Set the default historical years to the number of historical dividends
    assumptions.set("historical_years", dividend_count)

# Compute historical values and ratios
data.compute({
    "dividendsPaidToCommon": "dividend:adjDividend * income:weightedAverageShsOut",
    "%returnOnEquity": "income:netIncome / balance:totalStockholdersEquity:-1",
    "%payoutRatio": "dividend:adjDividend / income:eps",
    "%dividendYield": "dividend:adjDividend / quote:close",
    "%adjDividendGrowth": "function:growth:dividend:adjDividend",
    "#discountedAdjDividend": "dividend:adjDividend",
})

# Calculate average return on equity
average_return_on_equity = data.average(f"%returnOnEquity:{-assumptions.get('historical_years')}->0")
stable_payout = 1 - assumptions.get("%stable_growth_in_perpetuity") / average_return_on_equity
assumptions.set("%stable_payout", stable_payout)

# Calculate the average payout ratio
average_payout_ratio = data.average(f"%payoutRatio:{-assumptions.get('historical_years')}->0")
if average_payout_ratio > 1:
    assumptions.set("%high_growth_payout", assumptions.get("%stable_payout"))
else:
    assumptions.set("%high_growth_payout", average_payout_ratio)

# Calculate average dividend growth rate
average_dividend_growth_rate = data.average(f"%adjDividendGrowth:{-assumptions.get('historical_years')}->0")
assumptions.set("%high_growth_rate", average_dividend_growth_rate)

data.compute({
    "#linearRegressionEps": f"function:linear_regression:income:eps start:{-assumptions.get('historical_years')}"
}, forecast=assumptions.get("high_growth_years"))

# Compute 5 years of forecasted values and ratios
data.compute({
    "income:eps": f"function:compound:{data.get('#linearRegressionEps')} rate:{assumptions.get('%high_growth_rate')} offset:-1",
    "dividend:adjDividend": f"income:eps * {assumptions.get('%high_growth_payout')}",
    "#discountedAdjDividend": f"function:discount:dividend:adjDividend rate:{assumptions.get('%discount_rate')}",
    "%adjDividendGrowth": "function:growth:dividend:adjDividend",
}, forecast=assumptions.get("high_growth_years"))

# Discount the projected dividends and sum them
sum_of_discounted_dividends = data.sum(f"#discountedAdjDividend:1->{assumptions.get('high_growth_years')}")

# Calculate the discounted terminal value
stable_eps = data.get(f"income:eps:{assumptions.get('high_growth_years')}") * (1 + assumptions.get("%stable_growth_in_perpetuity"))
stable_dividend = stable_eps * assumptions.get("%stable_payout")
terminal_value = stable_dividend / (assumptions.get("%discount_rate") - assumptions.get("%stable_growth_in_perpetuity"))
discounted_terminal_value = terminal_value / ((1 + assumptions.get("%discount_rate")) ** assumptions.get("high_growth_years"))

# The final value calculated by the Two-Stage Dividend Discount Model
final_value = discounted_terminal_value + sum_of_discounted_dividends

model.set_final_value({
    "value": final_value,
    "units": "$"
})

# Render results
model.render_results([
    [sum_of_discounted_dividends, "Sum of discounted dividends", "$"],
    [discounted_terminal_value, "Discounted terminal value", "$"],
    [terminal_value, "Terminal value", "$"],
    [stable_dividend, "Dividend in stable phase", "$"],
    [stable_eps, "EPS in stable phase", "$"],
    [average_dividend_growth_rate, "Average historical Dividend Growth Rate", "%"],
    [average_payout_ratio, "Average historical Payout Ratio", "%"],
    [average_return_on_equity, "Average historical Return on Equity", "%"],
])

# Render chart for projected dividends
model.render_chart({
    "data": {
        "income:eps": "Earnings Per Share",
        "dividend:adjDividend": "Dividend",
        "#linearRegressionEps": "Linear Regression of EPS",
        "#discountedAdjDividend": "Discounted Dividends"
    },
    "start": -assumptions.get('historical_years'),
    "properties": {
        "title": "Historical and Projected Dividends",
        "set_editable": [
            "income:eps",
            "dividend:adjDividend"
        ],
        "hidden_keys": [
            "#linearRegressionEps",
            "#discountedAdjDividend"
        ],
    }
})

# Render Dividend Table
model.render_table({
    "data": {
        "income:eps": "Earnings Per Share",
        "dividend:adjDividend": "Dividend per Share",
        "%adjDividendGrowth": "Dividend Growth Rate",
        "#discountedAdjDividend": "Discounted Dividend",
    },
    "start": -1,
    "properties": {
        "title": "Projected data",
        "column_order": "ascending",
    },
})

# Render Historical Table
model.render_table({
    "data": {
        "income:netIncome": "Net Income",
        "balance:totalStockholdersEquity": "Equity",
        "%returnOnEquity": "Return on Equity",
        "dividendsPaidToCommon": "Common Dividends",
        "%payoutRatio": "Payout Ratio",
        "income:weightedAverageShsOut": "Shares Outstanding",
        "quote:close": "Reference Market Price",
        "income:eps": "EPS",
        "dividend:adjDividend": "Dividend per Share",
        "%adjDividendGrowth": "Dividend Growth Rate",
        "%dividendYield": "Dividend Yield",
    },
    "start": -assumptions.get('historical_years'),
    "end": 0,
    "properties": {
        "title": "Historical data",
        "number_format": "M",
        "display_averages": True
    },
})

assumptions.set_description({
    "%discount_rate": r"""
        ## Discount Rate

        $
        \text{Discount Rate} = \text{Cost of Equity}
          = \text{Risk Free Rate} + \text{Beta} \times \text{Market Premium}
        $

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

    "high_growth_years": r"""
        ## High Growth Years

        The estimated number of years during which the company is expected to experience high growth. After this period, the company will transition to a stable growth phase.
    """,

    "historical_years": r"""
        ## Historical Years

        The number of historical years used to calculate averages for historical data.
    """,

    "%high_growth_rate": r"""
        ## High Growth Rate

        The estimated growth rate of Earnings Per Share (EPS) during the high-growth phase.
    """,

    "%high_growth_payout": r"""
        ## High Growth Payout

        The estimated dividend payout rate expressed as a percentage of Earnings Per Share (EPS) during the high-growth phase.
    """,

    "%stable_growth_in_perpetuity": r"""
        ## Stable Growth in Perpetuity

        The estimated stable rate at which the company's Earnings Per Share (EPS) will grow in perpetuity after the last projected period.
    """,

    "%stable_payout": r"""
        ## Stable Payout

        The estimated dividend payout rate expressed as a percentage of Earnings Per Share (EPS) after the last projected period.
    """,
})

print("End of model")
