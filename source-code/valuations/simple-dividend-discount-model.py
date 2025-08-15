"""
    Model: Simple Dividend Discount Model

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Simple Dividend Discount Model

This model estimates the value of companies that have reached maturity and pay stable dividends as a significant percentage of their Free Cash Flow to Equity, with little to no high growth prospects.

See our [GitHub Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#simple-dividend-discount-model-source-code)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "%discount_rate": None,
        "expected_dividend": None,
        "%growth_in_perpetuity": "2.5%",
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

# Calculate the discount rate as the cost of equity
risk_free_rate = assumptions.get("%risk_free_rate")
beta = assumptions.get("beta")
market_premium = assumptions.get("%market_premium")
cost_of_equity = risk_free_rate + beta * market_premium

assumptions.set("%discount_rate", cost_of_equity)

# Count all dividend payments excluding None and zero values
dividend_count = data.count("dividend:adjDividend:*", properties={"except_values": [None, 0]})

if dividend_count <= 0:
    raise ValueError("The company does not currently pay dividends!")

elif dividend_count > 10:
    assumptions.set("historical_years", 10)

else:
    # Set the historical years to the number of available dividend payments
    assumptions.set("historical_years", dividend_count)

# Compute the average annual dividend growth rate
data.compute({
    "%dividendGrowth": "function:growth:dividend:adjDividend"
}, forecast=0)

# Define the averaging period for historical dividend growth
averaging_period = f"-{assumptions.get('historical_years')}->0"
average_growth_rate = data.average(f"%dividendGrowth:{averaging_period}")

# Calculate next year's expected dividend by compounding the LTM dividend
# at the average growth rate over the remaining fiscal period (using continuous compounding)
ltm_dividend = data.get("dividend:adjDividend")
if ltm_dividend is not None:
    if average_growth_rate is not None:
        data.compute({
            "dividend:adjDividend": f"""
                function:compound:{ltm_dividend}
                rate:{average_growth_rate}
                continuous:true
            """
        }, forecast=1)
        expected_dividend = data.get(f"dividend:adjDividend:1")
        assumptions.set("expected_dividend", expected_dividend)
    else:
        # Fallback to the ltm_dividend, if the average dividend
        # growth rate could not be computed
        assumptions.set("expected_dividend", ltm_dividend)
else:
    model.error("Zero dividend encountered")

# Calculate the intrinsic stock value using the Dividend Discount Model formula
stock_value = assumptions.get("expected_dividend") / (
    assumptions.get("%discount_rate") - assumptions.get("%growth_in_perpetuity"))

# Set the calculated stock value as the model's final output
model.set_final_value({
    "value": stock_value,
    "units": '$'
})

# Compute additional historical metrics for analysis
data.compute({
    "dividendsPaidToCommon": "dividend:adjDividend * income:weightedAverageShsOut",
    "%returnOnEquity": "income:netIncome / balance:totalStockholdersEquity:-1",
    "%payoutRatio": "dividend:adjDividend / income:eps",
    "%dividendYield": "dividend:adjDividend / quote:close",
    "%adjDividendGrowth": "function:growth:dividend:adjDividend",
})

# Compute projected dividends and dividend growth for the forecast period
data.compute({
    "dividend:adjDividend": f"""
        function:compound:{assumptions.get('expected_dividend')} 
        rate:{assumptions.get('%growth_in_perpetuity')}
        continuous:true
    """,
    "%adjDividendGrowth": "function:growth:dividend:adjDividend",
}, forecast=assumptions.get("forecast_years"))

# Render key results
model.render_results([
    [data.get("dividend:adjDividend:0"), "LTM Dividend", "$"],
    [average_growth_rate, "Average Dividend Growth Rate", "%"],
    [assumptions.get("expected_dividend"), "Next Year's Expected Dividend", "$"],
    [assumptions.get("%discount_rate"), 'Cost of Equity', '%'],
    [assumptions.get("%growth_in_perpetuity"), 'Expected Growth Rate', '%'],
])

# Render a chart showing historical and projected dividends
model.render_chart({
    "data": {
        "dividend:adjDividend": "Dividends",
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": 'Historical and Projected Dividends',
        "include_ltm": True
    }
})

# Render a table for future dividend estimations
model.render_table({
    "data": {
        "dividend:adjDividend": "Dividend per Share",
        "%adjDividendGrowth": "Dividend Growth Rate",
    },
    "start": -1,
    "end": "*",
    "properties": {
        "title": "Future Estimations",
        "order": "ascending",
    },
})

# Render a table of historical financial values and dividend metrics
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
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Historical Values",
        "order": "descending",
        "display_averages": True,
        "number_format": "M"
    },
})

# Set descriptions for assumptions
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
