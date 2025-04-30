"""
    Model: Return on Invested Capital (ROIC)

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Return on Invested Capital (ROIC)

The return on capital or invested capital in a business attempts to measure the return earned on capital invested in an investment.

Read more: [Aswath Damodaran - Return Measures PDF](https://pages.stern.nyu.edu/~adamodar/pdfiles/papers/returnmeasures.pdf)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "historical_years": 10,
    }
})

# Compute historical values and ratios
data.compute({
    # Calculating NOPAT (Net Operating Profit After Taxes)
    "%taxRate": "income:incomeTaxExpense / income:incomeBeforeTax",
    "incomeTax": "income:operatingIncome * %taxRate",
    "nopat": "income:operatingIncome - incomeTax",

    # Calculating Invested Capital
    "investedCapital": """
        balance:totalNonCurrentAssets - balance:cashAndCashEquivalents +  
        balance:totalCurrentAssets - balance:totalCurrentLiabilities
    """,
    "%roic": "nopat / investedCapital",
})

# Get the last value of ROIC
model.set_final_value({
    "value": data.get("%roic"),
    "units": "%"
})

# Render a chart for historical ROIC values
model.render_chart({
    "data": {
        "%roic": "Return on Invested Capital"
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": "Historical ROIC Values",
    }
})

model.render_description(r"""
### ROIC Formula
`Return on Capital (ROIC)` = `After-tax Operating Income` / `Invested Capital`

After-tax Operating Income or sometimes called Net Operating Profit After Tax (NOPAT) is calculated using the reported Earnings Before Interest and Taxes (EBIT) or Operating Income on the income statement adjusted for the tax liability.

`After-tax Operating Income` = `Operating Income` * (1 - `Income Tax Rate`)

There are two ways to calculate invested capital: One looks at the company's assets, and another looks at its financing from debt and equity. In this model, we are using the Asset based approach.

`Invested Capital` = `Total Non-Current Assets` + `Total Current Assets` - `Total Current Liabilities` - `Cash and Equivalents`
""")

# Render a table for historical data
model.render_table({
    "data": {
        "%roic": "Return on Invested Capital (ROIC)",
        "nopat": "After-tax Operating Income",
        "income:operatingIncome": "Operating Income",
        "%taxRate": "Income Tax Rate",
        "investedCapital": "Invested Capital",
        "balance:totalNonCurrentAssets": "Fixed (Non-Current) Assets",
        "balance:totalCurrentAssets": "Current Assets",
        "balance:totalCurrentLiabilities": "Current Liabilities",
        "balance:cashAndCashEquivalents": "Cash",
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": "Historical data",
        "order": "descending",
        "number_format": "M",
        "display_averages": True,
    },
})

assumptions.set_description({
    "historical_years": r"""
        ## Historical Years
        
        The number of years of historical data used to calculate averages and trends for analysis.
    """
})

print("End of model.")
