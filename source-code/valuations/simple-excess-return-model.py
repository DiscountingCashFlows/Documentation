"""
    Model: Simple Excess Return Model

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Simple Excess Return Model

Used to estimate the value of companies that have reached maturity and earn stable excess returns with little to no high growth chance. Excess Return models are better suited to calculate the intrinsic value of a financial company than an enterprise valuation model (such as the Discounted Free Cash Flow Model).

See our [GitHub Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/excess-return-models.md#simple-excess-return-model-source-code)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "%return_on_equity": None,
        "%growth_in_perpetuity": data.get("treasury:year10"),
        "%risk_free_rate": data.get("treasury:year10"),
        "%market_premium":data.get("risk:totalEquityRiskPremium"),
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

# Compute historical data
data.compute({
    "dividendsPaidToCommon": "dividend:adjDividend * income:weightedAverageShsOut",
    "#bookValue": "balance:totalStockholdersEquity / income:weightedAverageShsOut",
    "%returnOnEquity": "income:netIncome / balance:totalStockholdersEquity:-1",
    "%payoutRatio": "dividend:adjDividend / income:eps",
    "#retainedEarnings": "income:eps - dividend:adjDividend",
})

# Calculate the average return on equity over the historical years
average_return_on_equity = data.average(f"%returnOnEquity:{-assumptions.get('historical_years')}->0")

assumptions.set("%return_on_equity", average_return_on_equity)

# Calculate stable payout ratio
stable_payout_ratio = 1 - (assumptions.get("%growth_in_perpetuity") / assumptions.get("%return_on_equity"))

# Compute 5 years of forecasted values and ratios
data.compute({
    "income:eps": f"#bookValue:-1 * {assumptions.get('%return_on_equity')}",
    "dividend:adjDividend": f"income:eps * {stable_payout_ratio}",
    "#retainedEarnings": "income:eps - dividend:adjDividend",
    "#bookValue": "#bookValue:-1 + #retainedEarnings",
    "%returnOnEquity": "income:eps / #bookValue:-1",
    "#equityCostPerShare": f"#bookValue:-1 * {assumptions.get('%discount_rate')}",
    "#excessReturn": "income:eps - #equityCostPerShare",
    "%costOfEquity": assumptions.get("%discount_rate"),
    "#beginningBookValue": "#bookValue:-1",
}, forecast=5)

book_value = data.get("#bookValue")
excess_returns = data.get("#excessReturn:1")
if excess_returns and excess_returns <= 0:
    model.warn("Warning: Excess return is negative. Either EPS is negative or the Cost of Equity (Discount Rate) is higher than the Return on Equity.")

# Calculate the terminal value
terminal_value = excess_returns / (assumptions.get("%discount_rate") - assumptions.get("%growth_in_perpetuity"))

# Calculate value per share
stock_value = terminal_value + book_value

model.set_final_value({
    "value": stock_value,
    "units": '$'
})

model.render_results([
    [stock_value, 'Estimated Value', '$'],
    [book_value, "Book value of equity invested", '$'],
    [data.get('#bookValue:1'), "Next year's estimated book value", '$'],
    [terminal_value, "Present value of future excess returns", '$'],
    [excess_returns, "Excess Return per share", '$'],
    [assumptions.get("%discount_rate"), "Cost of Equity (the discount rate)", '%'],
    [average_return_on_equity, "Average historical Return on Equity", '%'],
    [data.average(f"%payoutRatio:{-assumptions.get('historical_years')}->0"), "Average historical Payout Ratio", '%'],
    [stable_payout_ratio, "Payout Ratio used", '%'],
    [data.get("treasury:year10"), 'Risk Free Rate of the 10 Year U.S. Treasury Note', '%']
])

# Render a chart for historical and forecasted data
model.render_chart({
    "data": {
        "income:eps": "Earnings Per Share",
        "#bookValue": "Book Value Per Share",
        "dividend:adjDividend": "Dividend",
        "#retainedEarnings": "Retained Earnings"
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": "Historical and Forecasted Data"
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
        "#retainedEarnings": "Retained Earnings",
        "#equityCostPerShare": "Equity Cost per Share",
        "%costOfEquity": "Cost of Equity",
        "#excessReturn": "Excess Return"
    },
    "start": -1,
    "end": "*",
    "properties": {
        "title": "Projected Data",
        "column_order": "ascending",
    }
})

# Prepare properties for table rendering
properties = {
    "title": "Historical data",
    "number_format": "M",
    "display_averages": True
}

# Historical Table
model.render_table({
    "data": {
        "income:netIncome": "Net Income",
        "balance:totalStockholdersEquity": "Total Equity",
        "%returnOnEquity": "Return on Equity",
        "dividendsPaidToCommon": "Dividends Paid to Common Shareholders",
        "%payoutRatio": "Payout Ratio",
        "income:weightedAverageShsOut": "Shares Outstanding",
        "income:eps": "EPS",
        "dividend:adjDividend": "Dividend per Share",
        "#bookValue": "Book Value"
    },
    "start": -assumptions.get('historical_years'),
    "end": 0,
    "properties": properties
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

    "historical_years": r"""
        ## Historical Years

        The number of historical years used to calculate averages for historical data.
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

    "beta": r"""
        ## Beta

        Beta is a value that measures the price fluctuations (volatility) of a stock with respect to fluctuations in the overall stock market.
    """,

    "%growth_in_perpetuity": r"""
        ## Growth in Perpetuity

        The rate at which the company's free cash flow is assumed to grow in perpetuity. By default, this is equal to the yield of the U.S. 10 Year Treasury Bond.
    """,

    "%return_on_equity": r"""
        ## Return on Equity

        Return On Equity (ROE) is used to estimate the Earnings Per Share (EPS) expressed as a percentage of Book Value.
    """
})

print(f"End of model.")
