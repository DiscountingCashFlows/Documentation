"""
    Model: Two-Stage Excess Return Model

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Two-Stage Excess Return Model

Used to estimate the value of companies based on two stages of growth. An initial period of high growth, represented by [Sum of discounted excess returns in Growth Stage], followed by a period of stable growth, represented by [Discounted excess return in terminal stage]. Excess Return models are better suited to calculate the intrinsic value of a financial company than an enterprise valuation model (such as the Discounted Free Cash Flow Model).

Read more: [GitHub Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/excess-return-models.md#two-stage-excess-return-model-source-code)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "high_growth_years": 5,
        "%stable_return_on_equity": None,
        "%stable_growth_in_perpetuity": "2.5%",
        "%market_premium": data.get("risk:totalEquityRiskPremium"),
        "%risk_free_rate": data.get("treasury:year10"),
        "beta": data.get("profile:beta", default=1),
        "historical_years": 10,
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

# Compute historical values and ratios
data.compute({
    '#index': 1,
    "dividendsPaidToCommon": "dividend:adjDividend * income:weightedAverageShsOut",
    "#bookValue": "balance:totalStockholdersEquity / income:weightedAverageShsOut",
    "%returnOnEquity": "income:netIncome / balance:totalStockholdersEquity:-1",
    "%payoutRatio": "dividend:adjDividend / income:eps",
    "#retainedEarningsPerShare": "income:eps - dividend:adjDividend",
    '%adjDividendGrowth': "function:growth:dividend:adjDividend",
})

data.set_default_range(f"{-assumptions.get('historical_years')}->0")

# Calculate average payout ratio and return on equity
average_payout_ratio = data.average("%payoutRatio", 0)
average_return_on_equity = data.average("%returnOnEquity")
assumptions.set("%stable_return_on_equity", average_return_on_equity)
assumptions.set_bounds(
    "%stable_return_on_equity", low="0%", high="100%"
)
stable_payout_ratio = 1 - assumptions.get("%stable_growth_in_perpetuity") / assumptions.get("%stable_return_on_equity")

payout_increase = (stable_payout_ratio - average_payout_ratio) / assumptions.get('high_growth_years')

# Compute forecasted values and ratios
data.compute({
    "#index": "#index:-1 + 1",
    "%payoutIncrease": f"#index * {payout_increase}",
    "%payoutRatio": f"%payoutIncrease:-1 + {average_payout_ratio}",
    "#beginningBookValue": "#bookValue:-1",
    "%returnOnEquity": assumptions.get('%stable_return_on_equity'),
    "income:eps": "#beginningBookValue * %returnOnEquity",
    "dividend:adjDividend": f"income:eps * %payoutRatio",
    "#retainedEarningsPerShare": "income:eps - dividend:adjDividend",
    "#bookValue": "#beginningBookValue + #retainedEarningsPerShare",
    "#equityCostPerShare": f"#beginningBookValue * {assumptions.get('%discount_rate')}",
    "#excessReturnPerShare": "income:eps - #equityCostPerShare",
    "%costOfEquity": assumptions.get("%discount_rate"),
    "#discountedExcessReturnPerShare": """
        function:discount:#excessReturnPerShare 
        rate:%costOfEquity
    """,
}, forecast=assumptions.get("high_growth_years"))

# Terminal year value calculation
terminal_book_value = data.get(f"#bookValue:{assumptions.get('high_growth_years')}")
terminal_eps = terminal_book_value * assumptions.get("%stable_return_on_equity")
terminal_equity_cost = terminal_book_value * assumptions.get("%discount_rate")
terminal_excess_return = terminal_book_value * (
            assumptions.get("%stable_return_on_equity") - assumptions.get("%discount_rate"))

if terminal_excess_return <= 0:
    model.warn("Excess return is negative. The Cost of Equity (Discount Rate) is higher than the Return on Equity.")

sum_of_discounted_excess_returns = data.sum(
    f"#discountedExcessReturnPerShare:1->{assumptions.get('high_growth_years')}")
terminal_value_of_excess_returns = terminal_excess_return / (
            assumptions.get("%discount_rate") - assumptions.get("%stable_growth_in_perpetuity"))
discounted_terminal_value = terminal_value_of_excess_returns / (
            1 + assumptions.get("%discount_rate")) ** assumptions.get("high_growth_years")
ltm_book_value_of_equity = data.get("#bookValue")

stock_value = ltm_book_value_of_equity + discounted_terminal_value + sum_of_discounted_excess_returns

model.set_final_value({
    "value": stock_value,
    "units": "$"
})

# Render results
model.render_results([
    [stock_value, "Estimated Value", "$"],
    [ltm_book_value_of_equity, "Book value of equity invested", "$"],
    [sum_of_discounted_excess_returns, "Sum of discounted excess returns in Growth Stage", "$"],
    [terminal_eps, "Terminal stage EPS", "$"],
    [terminal_book_value, "Terminal stage Book Value", "$"],
    [terminal_equity_cost, "Terminal stage Equity Cost", "$"],
    [discounted_terminal_value, "Discounted excess return in terminal stage", "$"],
    [terminal_value_of_excess_returns, "Excess Returns in the Terminal Stage", "$"],
    [assumptions.get("%discount_rate"), "Terminal Cost of Equity (the discount rate)", "%"],
    [terminal_excess_return, "Terminal year's excess return", "$"],
    [average_return_on_equity, "Average historical Return on Equity", "%"],
    [average_payout_ratio, "Average historical Payout Ratio", "%"],
    [stable_payout_ratio, "Payout Ratio in stable stage", "%"],
    [data.get("treasury:year10"), "Yield of the U.S. 10 Year Treasury Bond", "%"],
])

# Render chart
model.render_chart({
    "data": {
        "#bookValue": "Ending Book Value",
        "income:eps": "EPS",
        "dividend:adjDividend": "Dividend",
        "%payoutRatio": "Payout Ratio",
        "%returnOnEquity": "Return on Equity",
        "%costOfEquity": "Cost of Equity"
    },
    "start": -assumptions.get('historical_years'),
    "properties": {
        "title": "Historical and Forecasted Data",
        "set_editable": [
            "#bookValue",
            "%payoutRatio",
            "%returnOnEquity",
            "%costOfEquity"
        ],
        "hidden_keys": [
            "%payoutRatio",
            "%returnOnEquity",
            "%costOfEquity"
        ]
    }
})

# Projections Table
model.render_table({
    "data": {
        "#beginningBookValue": "Beginning Book Value",
        "#bookValue": "Ending Book Value",
        "income:eps": "EPS",
        "%returnOnEquity": "Return on Equity",
        "dividend:adjDividend": "Dividend per Share",
        "%payoutRatio": "Payout Ratio",
        "#retainedEarningsPerShare": "Retained Earnings",
        "#equityCostPerShare": "Equity Cost",
        "%costOfEquity": "Cost of Equity",
        "#excessReturnPerShare": "Excess Return",
        "#discountedExcessReturnPerShare": "Discounted Excess Return",
    },
    "start": -1,
    "properties": {
        "title": "Projected data",
        "order": "ascending"
    },
})

# Historical Table
model.render_table({
    "data": {
        "income:netIncome": "Net Income",
        "balance:totalStockholdersEquity": "Total Stockholders Equity",
        "%returnOnEquity": "Return on Equity",
        "dividendsPaidToCommon": "Dividends Paid to Common Shareholders",
        "%payoutRatio": "Payout Ratio",
        "income:weightedAverageShsOut": "Shares Outstanding",
        "income:eps": "Earnings per Share",
        "dividend:adjDividend": "Dividend per Share",
        "%adjDividendGrowth": "Dividend Growth Rate",
        "#bookValue": "Book Value",
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

    "high_growth_years": r"""
        ## High Growth Years

        The estimated number of years during which the company is expected to experience high growth. After this period, the company will transition to a stable growth phase.
    """,

    "%stable_return_on_equity": r"""
        ## Stable Return on Equity

        The stable Return On Equity (ROE) estimated after the last projected period.
    """,

    "%stable_growth_in_perpetuity": r"""
        ## Stable Growth in Perpetuity

        The stable rate at which the company's book value is assumed to grow in perpetuity after the last projected period.
    """,

    "historical_years": r"""
        ## Historical Years

        The number of historical years used to calculate averages for historical data.
    """,
})

print("End of model.")
