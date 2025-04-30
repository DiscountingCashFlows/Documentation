## Discounted Free Cash Flow Model ([Source Code](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/valuations/discounted-free-cash-flow.js))
The Discounted Free Cash Flow model calculates the value of a share based on the company's estimated future Free Cash Flow figures.

> This model is not recommended for valuing financial service firms (banks, insurance companies, and investment banks). Check out [Valuing financial service firms](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/valuing-financial-firms.md#valuing-financial-service-firms-banks-insurance-companies-and-investment-banks)

* Assumptions: [`Description of Assumptions`](#description-of-assumptions)
* Discount rate calculation: [`Discount Rate (WACC - Weighted Average Cost of Capital)`](#discount-rate-wacc---weighted-average-cost-of-capital)
* Table values calculation: [`Calculating historical table values`](#calculating-historical-table-values)

### Forecasting Free Cash Flow
To estimate future free cash flow, we use projected revenues (based on a linear regression curve of past revenues) along with the `Operating Cash Flow Margin` and `Average Capital Expenditure Margin` (calculated as the average capital expenditure margin over the past `Historical Years`).  
The difference between the two is considered the free cash flow margin.

**t ranges between 1 and `Projection Years`**  
> `Free Cash Flow(t) = Revenue(t) * (Operating Cash Flow Margin - Average Capital Expenditure Margin)`

Next, we discount each Free Cash Flow to the present:  
> `Discounted Free Cash Flow(t) = Free Cash Flow(t) / (1 + Discount Rate)`<sup>`t`</sup>

![image](https://github.com/user-attachments/assets/3b59ea83-aaf5-4a27-95e7-36c5d5ca30b0)

### Calculating the Terminal Value
The `Terminal Value` represents the expected value of the company at the end of the projection period.  
It is calculated using the Gordon Growth formula with `Growth In Perpetuity(%)` based on the final projected free cash flow (i.e., Free Cash Flow(`Projection Years`)).

> `Terminal Value = Free Cash Flow(Projection Years) * (1 + Growth In Perpetuity(%)) / (Discount Rate - Growth In Perpetuity(%))`

We then discount the terminal value to the present:  
> `Discounted Terminal Value = Terminal Value / (1 + Discount Rate)`<sup>`Projection Years`</sup>

### Calculating the Value per Share
The `Enterprise Value` is calculated by adding all `Discounted Free Cash Flow` values (from years 1 to `Projection Years`) and adding the `Discounted Terminal Value`:  
> `Enterprise Value = Discounted Free Cash Flow(1) + ... + Discounted Free Cash Flow(Projection Years) + Discounted Terminal Value`

`Equity Value`:  
> `Equity Value = Enterprise Value + Cash and Equivalents - Total Debt`

The `Estimated Value per Share` is the estimated value of one common share:  
> `Estimated Value per Share = Equity Value / Shares Outstanding`

![image](https://github.com/user-attachments/assets/fc1518d0-3eae-4186-858c-a2d29a090da7)

## Description of Assumptions

`Growth In Perpetuity(%)`:  
- The rate at which the company's free cash flow is assumed to grow indefinitely.  
- By default, this is equal to the `Yield of the U.S. 10 Year Treasury Note`.

`Projection Years`:  
- The number of years over which future values are projected.  
- Default: 5 years.

`Historical Years`:  
- The number of historical years used to calculate average margins.  
- Default: 10 years.

`Revenue Growth Rate`:  
- Future revenues are projected using a growth rate, which is applied to the next year's revenue figure derived from linear regression, as described in the following formula:
```
"income:revenue": f"""
    function:compound:{data.get('linearRegressionRevenue:1')} 
    rate:{assumptions.get('%revenue_growth_rate')}
    offset:-1
"""
```

`Operating Cash Flow Margin`:  
- The margin for future Operating Cash Flow (or Cash From Operating Activities).  
- By default, this is the average Operating Cash Flow margin over the past `Historical Years`.

### Discount Rate (WACC - Weighted Average Cost of Capital)

`Discount Rate`:  
- The rate used to discount future free cash flow and the terminal value.  
- By default, this is calculated using the Weighted Average Cost of Capital (WACC) formula ([source](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/risk-analysis/weighted-average-cost-of-capital.js)):

> `Discount Rate = Debt Weight * Cost of Debt * (1 - Tax Rate) + Equity Weight * Cost of Equity`

`Debt Weight`:  
- The proportion of total debt relative to the company's market capitalization plus total debt.  
> `Debt Weight = Total Debt / (Market Cap + Total Debt) = 1 - Equity Weight`

`Cost of Debt`:  
- The company's effective borrowing cost.  
> `Cost of Debt = Interest Expense / Total Debt`

`Tax Rate`:  
- Taxes paid as a percentage of earnings before tax.  
> `Tax Rate = Income Tax Expense / Income Before Tax`

`Equity Weight`:  
- The proportion of equity relative to the company's market capitalization plus total debt.  
> `Equity Weight = Market Cap / (Market Cap + Total Debt) = 1 - Debt Weight`

`Cost of Equity`, `Beta`, `Risk Free Rate(%)`, `Market Premium(%)`:  
- See: [Calculating the Cost of Equity](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#discount-rate-cost-of-equity)

## Calculating Historical Table Values

> `Free Cash Flow(t) = Cash from Operating Activities(t) - Capital Expenditure(t)`

![image](https://github.com/user-attachments/assets/e648c623-474c-4538-9f99-11fcab2ab990)

