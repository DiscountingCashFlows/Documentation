"""
    Model: Annual Margin Report

    © Copyright discountingcashflows.com
"""

# Render model description
model.render_description(r"""
## Annual Margin Analysis Report

Margins refer to the ratio between a financial report item and the revenue (Example: Net Income Margin = Net Income / Revenue).

This analysis provides a report of the company's key margins, which could be further used in a valuation model.
""")

# Initialize assumptions
assumptions.init({
    "data": {
        "historical_years": 5,
    }
})

# Compute historical values and ratios
data.compute({
    "%revenueMargin": 1,
    "%operatingCashFlowMargin": "flow:operatingCashFlow / income:revenue",
    "%netCashProvidedByOperatingActivitiesMargin": "flow:netCashProvidedByOperatingActivities / income:revenue",
    "%freeCashFlowMargin": "flow:freeCashFlow / income:revenue",
    "%capitalExpenditureMargin": "flow:capitalExpenditure / income:revenue",
    "%grossMargin": "income:grossProfit / income:revenue",
    "%operatingMargin": "income:operatingIncome / income:revenue",
    "%netMargin": "income:netIncome / income:revenue",
    "discountedFreeCashFlow": "flow:freeCashFlow",
    "%revenueGrowthRate": "function:growth:income:revenue",
    "%depreciationAndAmortizationMargin": "flow:depreciationAndAmortization / income:revenue",
})

model.render_chart({
    "data": {
        "%revenueMargin": "Revenue Margin",
        "%netCashProvidedByOperatingActivitiesMargin": "Operating Margin",
        "%freeCashFlowMargin": "Free Cash Flow Margin",
        "%netMargin": "Net Margin",
        "%capitalExpenditureMargin": "Capital Expenditure Margin"
    },
    "start": -assumptions.get("historical_years"),
    "end": "*",
    "properties": {
        "title": "Margin Analysis (% of Revenue)",
        "hidden_keys": [
            "%revenueMargin",
            "%capitalExpenditureMargin"
        ],
        "bar_keys": "*",
        "include_ltm": True
    }
})

# Income Statement Table
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%revenueGrowthRate": "Revenue Growth Rate",
        "income:costOfRevenue": "Cost of Revenue",
        "income:grossProfit": "Gross Profit",
        "%grossMargin": "Gross Margin",
        "income:operatingIncome": "Operating Income",
        "%operatingMargin": "Operating Margin",
        "income:netIncome": "Net Income",
        "%netMargin": "Net Margin"
    },
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Income Statement Margins",
        "number_format": "M",
        "display_averages": True,
        "order": "descending",
    },
})

# Cash Flow Statement Table
model.render_table({
    "data": {
        "income:revenue": "Revenue",
        "%netCashProvidedByOperatingActivitiesMargin": "Cash From Operating Activities Margin",
        "flow:netCashProvidedByOperatingActivities": "Cash From Operating Activities",
        "%freeCashFlowMargin": "Free Cash Flow Margin",
        "flow:freeCashFlow": "Free Cash Flow",
        "%depreciationAndAmortizationMargin": "Depreciation and Amortization Margin",
        "flow:depreciationAndAmortization": "Depreciation and Amortization",
        "%capitalExpenditureMargin": "Capital Expenditure Margin",
        "flow:capitalExpenditure": "Capital Expenditure",
    },
    "start": -assumptions.get("historical_years"),
    "end": 0,
    "properties": {
        "title": "Cash Flow Statement Margins",
        "number_format": "M",
        "display_averages": True,
        "order": "descending",
    },
})

assumptions.set_description({
    "historical_years": r"""
        ## Historical Years

        Number of historical years used to render the Chart and Tables.
    """,
})

print("End of model.")
