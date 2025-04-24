"""
    Model: Simple Dividend Discount Model

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Simple Dividend Discount Model

This model is used to estimate the value of companies that have reached maturity and pay stable dividends as a significant percentage of their Free Cashflow to Equity, with little to no high growth chance.

See our [GitHub Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#simple-dividend-discount-model-source-code)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "expected_dividend": None,
        "%growth_in_perpetuity": data.get("treasury:year10"),
        "beta": data.get("profile:beta", default=1),
        "%risk_free_rate": data.get("treasury:year10"),
        "%market_premium": data.get("risk:totalEquityRiskPremium"),
        "historical_years": None,
        "forecast_years": 5,
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

# Calculate additional values
data.compute({
    # Predict the next 5 future dividends using a linear regression line
    "#linearRegression": f"function:linear_regression:dividend:adjDividend start:{-assumptions.get('historical_years')}",
}, forecast=assumptions.get("forecast_years"))

# By default, we want the next year's expected dividend to be the average
# between the LTM dividend and the regression value of next year
linear_regression_weight = 0.5
expected_dividend = linear_regression_weight * data.get("#linearRegression:1") + (
    1 - linear_regression_weight) * data.get("dividend:adjDividend")
assumptions.set("expected_dividend", expected_dividend)

stock_value = assumptions.get("expected_dividend") / (
    assumptions.get("%discount_rate") - assumptions.get("%growth_in_perpetuity"))

# Set stock_value as the stock's estimated value
model.set_final_value({
    "value": stock_value,
    "units": '$'
})

# Compute historical values
data.compute({
    "dividendsPaidToCommon": "dividend:adjDividend * income:weightedAverageShsOut",
    "%returnOnEquity": "income:netIncome / balance:totalStockholdersEquity:-1",
    "%payoutRatio": "dividend:adjDividend / income:eps",
    "%dividendYield": "dividend:adjDividend / quote:close",
    "%adjDividendGrowth": "function:growth:dividend:adjDividend",
})

data.compute({
    "dividend:adjDividend": f"function:compound:{assumptions.get('expected_dividend')} rate:{assumptions.get('%growth_in_perpetuity')} offset:-1",
    "%adjDividendGrowth": "function:growth:dividend:adjDividend",
}, forecast=assumptions.get("forecast_years"))

model.render_results([
    [data.get("dividend:adjDividend:0"), "LTM dividend", "$"],  # Set currency
    [assumptions.get("expected_dividend"), "Next year's expected dividend", "$"],  # Set currency
    [assumptions.get("%discount_rate"), 'Cost of Equity', '%'],
    [assumptions.get("%growth_in_perpetuity"), 'Expected Growth Rate', '%'],
])

model.render_chart({
    "data": {
        "dividend:adjDividend": "Dividends",
        "#linearRegression": "Regression Line",
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": 'Historical and Projected Dividends',
        "disabled_keys": ['#linearRegression'],
    }
})

# Future Estimations
model.render_table({
    "data": {
        "dividend:adjDividend": "Dividend per Share",
        "%adjDividendGrowth": "Dividend Growth Rate",
        "#linearRegression": "Linear Regression of Dividends",
    },
    "start": -1,
    "end": "*",
    "properties": {
        "title": "Future Estimations",
        "column_order": "ascending",
    },
})

# Historical Values
model.render_table({
    "data": {
        "income:revenue": "Revenue",
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
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Historical Values",
        "column_order": "descending",
        "display_averages": True,
        "number_format": "M"
    },
})

assumptions.set_description({
    "%discount_rate": r"""
        ## Discount Rate

        $
        \text{Discount Rate} = \text{Cost of Equity} = \text{Risk Free Rate} + \text{Beta} \times \text{Market Premium}
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

        The risk-free rate represents the interest an investor would expect from an absolutely risk-free investment over a specified period of time. By default, it is equal to the current yield of the U.S. 10-Year Treasury Bond.
    """,

    "%market_premium": r"""
        ## Market Premium

        The market risk premium represents the excess returns over the risk-free rate that investors expect for taking on the incremental risks connected to the equities market.
    """,

    "expected_dividend": r"""
        ## Expected Dividend

        The estimated annual dividend per share for the next year.
    """,

    "%growth_in_perpetuity": r"""
        ## Growth in Perpetuity

        The rate at which the company's free cash flow is assumed to grow indefinitely. By default, this is equal to the yield of the U.S. 10-Year Treasury Bond.
    """,

    "historical_years": r"""
        ## Historical Years

        The number of historical years used to calculate averages for historical data.
    """,

    "forecast_years": r"""
        ## Forecast Years
        
        The number of years into the future for which the analysis projects financial performance and metrics.
    """,
})

print("End of model.")
