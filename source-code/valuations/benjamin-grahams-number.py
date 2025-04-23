"""
    Model: Benjamin Graham's Number

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Benjamin Graham's Number

Graham number is a method developed for defensive investors as described in CHAPTER 14 in The Intelligent Investor. 
It evaluates a stock’s intrinsic value by calculating the square root of **22.5** times the multiplied value of the company’s **EPS** and **BVPS**.

**This fundamental value formula does not apply to asset-light companies with high growth rates and companies with negative earnings.**

Read more: [Using The Graham Number Correctly](https://www.grahamvalue.com/article/using-graham-number-correctly)
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "earnings_per_share": data.get("income:eps"),
        "book_value_per_share": data.get("balance:totalStockholdersEquity") / data.get("income:weightedAverageShsOut"),
        "graham_multiplier": 22.5,
        "historical_years": 10
    }
})

# Calculate Graham's Number
graham_squared = assumptions.get("graham_multiplier") * assumptions.get("book_value_per_share") * assumptions.get("earnings_per_share")
if graham_squared < 0:
    raise ValueError("Graham's number squared must be positive. A negative or zero value is not meaningful in this context.")
stock_value = graham_squared ** 0.5  # Square root

model.set_final_value({
    "value": stock_value,
    "units": "$"
})

# Compute historical values and ratios
data.compute({
    "#bookValue": "balance:totalStockholdersEquity / income:weightedAverageShsOut",
    "#var": f"#bookValue * income:eps * {assumptions.get('graham_multiplier')}",
    "#grahamNumber": "function:sqrt:#var",
    "%revenueGrowthRate": "function:growth:income:revenue",
})

# Calculate average revenue growth rate
average_revenue_growth_rate = data.average(f"%revenueGrowthRate:{-assumptions.get('historical_years')}->0")
if average_revenue_growth_rate > 10:
    model.warn(f"Average Revenue Growth Rate {average_revenue_growth_rate}% is higher than 10%.")

average_revenue = data.average(f"income:revenue:{-assumptions.get('historical_years')}->0")
if average_revenue < 100_000_000:
    model.warn(f"Average Revenue {average_revenue} Million is lower than 100 Million.")

minimum_eps = data.min(f"income:eps:{-assumptions.get('historical_years')}->0")
if minimum_eps < 0:
    model.warn(f"EPS is negative! Applying this valuation can be misleading.")

dividend_count = data.count("dividend:adjDividend:*", properties={"except_values": [None, 0]})
if dividend_count < 20:
    model.warn(f"Company does not have 20 years of consistent dividend payments.")

# Current and working capital details
current_assets = data.get("balance:totalCurrentAssets")
current_liabilities = data.get("balance:totalCurrentLiabilities")

if current_assets < 2 * current_liabilities:
    model.warn("Current assets should be at least twice current liabilities.")

working_capital = current_assets - current_liabilities
long_term_debt = data.get("balance:longTermDebt")

if long_term_debt > working_capital:
    model.warn(f"Long Term Debt exceeds the working capital.")

# Render results for Graham's Number and other metrics
model.render_results([
    [stock_value, "Benjamin Graham's Number", "$"],
    [assumptions.get("earnings_per_share"), "Earnings Per Share (EPS)", "$"],
    [assumptions.get("book_value_per_share"), "Book Value Per Share", "$"],
    [average_revenue_growth_rate, 'Average Revenue Growth Rate', "%"],
    [average_revenue, 'Average Revenue', "$"],
    [minimum_eps, 'Lowest EPS', "$"],
    [current_assets, "Current Assets", "$"],
    [current_liabilities, "Current Liabilities", "$"],
    [working_capital, "Working Capital", "$"],
    [long_term_debt, "Long Term Debt", "$"],
])

# Render historical values chart
model.render_chart({
    "data": {
        "income:eps": "Earnings per Share",
        "#bookValue": "Book Value",
        "#grahamNumber": "Graham's Number",
        "dividend:adjDividend": "Dividend"
    },
    "start": -assumptions.get('historical_years'),
    "properties": {
        "title": "Historical numbers",
    }
})

# Render historical data table
model.render_table({
    "data": {
        "income:eps": "Earnings Per Share (EPS)",
        "#bookValue": "Book Value Per Share",
        "#grahamNumber": "Graham's Number",
        "quote:close": "Reference Market Price"
    },
    "start": -assumptions.get('historical_years'),
    "end": 0,
    "properties": {
        "title": "Historical data",
        "display_averages": True,
        "column_order": "descending",
    },
})

# Set descriptions for assumptions
assumptions.set_description({
    "earnings_per_share": r"""
        ## Earnings Per Share
        
        Earnings per share (EPS) is a company's net income subtracted by preferred dividends and then divided by the number of common shares it has outstanding.
    """,
    "book_value_per_share": r"""
        ## Book Value Per Share

        A company's book value is the total shareholders' equity from the balance sheet. We use the book value per share.
        
        $
        \text{Book Value Per Share} = \frac{\text{Total Equity}}{\text{Shares Outstanding}}
        $
    """,
    "graham_multiplier": r"""
        ## Graham Multiplier

        According to Benjamin Graham, the current price should not be more than 1.5 times the book value last reported. However, a multiplier of earnings below 15 could justify a correspondingly higher multiplier of assets. As a rule of thumb, the product of the multiplier times the ratio of price to book value should not exceed 22.5
        
        $
        \text{Graham's Number} = \sqrt{15 * 1.5 * \text{EPS} * \text{Book Value}} = \sqrt{\text{Graham Multiplier} * \text{EPS} * \text{Book Value}}
        $
    """,
    "historical_years": r"""
        ## Historical Years

        The number of historical years used to calculate averages for historical data.
    """,
})

print(f"End of model.")
