"""
    Model: Capital Asset Pricing Model (CAPM)

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description({
    "data": r"""
    ## Capital Asset Pricing Model (CAPM)
    
    The Capital Asset Pricing Model describes the relationship between risk and expected return for assets, particularly stocks. Its formula is used to calculate the cost of equity, or the rate of return a company is expected to pay to equity investors.
    
    Read more: [GitHub Model Documentation](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#discount-rate-cost-of-equity)
    """,
    "properties": {
        "width": "responsive"
    }
})

# Initialize assumptions
assumptions.init({
    "data": {
        "beta": data.get("profile:beta", default=1),
        "%risk_free_rate": data.get("treasury:year10"),
        "%market_premium": data.get("risk:totalEquityRiskPremium"),
    }
})

# Calculate the expected return
expected_return = assumptions.get("%risk_free_rate") + assumptions.get("beta") * assumptions.get("%market_premium")

model.set_final_value({
    "value": expected_return,
    "units": '%'
})

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
