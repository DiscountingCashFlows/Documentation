## Discounted Free Cash Flow Model ([Source Code](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/valuations/discounted-free-cash-flow.js))
Discounted Free Cash Flow calculates the value of a share based on the company's estimated future Free Cash Flow figures.

> This model is not recommended for valuing financial service firms(banks, insurance companies and investment banks). Check out [Valuing financial service firms](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/valuing-financial-firms.md#valuing-financial-service-firms-banks-insurance-companies-and-investment-banks)

* Assumptions: [Description of Assumptions](#description-of-assumptions)
* Discount rate calculation: [Discount Rate (WACC - Weighted Average Cost of Capital)](#discount-rate-wacc---weighted-average-cost-of-capital)
* Table values calculation: [Calculating historic table values](#calculating-historic-table-values)

### Forecasting the Free Cash Flow
To estimate the future free cash flow we use the future revenues(projected using a linear regression curve of past revenues) and the `[Operating Cash Flow Margin]` and `[Average Capital Expenditure Margin]`(calculated as the average capital expenditure margin for the past `[Historic Years]`). 
The difference between the two can be considered the free cash flow margin.

**t ranges between 1 and `[Projection Years]`**
> `[Free Cash Flow]`(t) = Revenue(t) * (`[Operating Cash Flow Margin]` - `[Average Capital Expenditure Margin]`)

Then, we need to discount each Free Cash Flow to the present:
> `[Discounted Free Cash Flow]`(t) = `[Free Cash Flow]`(t) / (1 + `[Discount Rate]`)<sup>t</sup>

![image](https://user-images.githubusercontent.com/46221053/189624161-0c1a9a16-546b-4d91-b6d8-90aeb01da32d.png)

### Calculating the Terminal Value
The `[Terminal Value]` is the expected value of the company at the end of the projection period. 
It is calculated using the Gordon Growth formula for `[Growth In Perpetuity(%)]` based on the last free cash flow of the projection period (or Free Cash Flow(`[Projection Years]`))

> `[Terminal Value]` = `[Free Cash Flow]`(`[Projection Years]`) * (1 + `[Growth In Perpetuity(%)]`) / (`[Discount Rate]` - `[Growth In Perpetuity(%)]`)

We need to discount the terminal value to the present

> `[Discounted Terminal Value]` = `[Terminal Value]` / (1 + `[Discount Rate]`)<sup>`[Projection Years]`</sup>

### Calculating the Estimated Value per Share
`[Enterprise value]` is calculated by summing up all `[Discounted Free Cash Flow]` (for years 1 to `[Projection Years]`) and adding `[Discounted Terminal Value]`:
> `[Enterprise Value]` = `[Discounted Free Cash Flow]`(1) + ... + `[Discounted Free Cash Flow]`(`[Projection Years]`) + `[Discounted Terminal Value]`

`[Equity value]`
> `[Equity value]` = `[Enterprise Value]` + `[Cash and Equivalents]` - `[Total Debt]`

`[Estimated Value per Share]` is the estimated value for one common share.
> `[Estimated Value per Share]` = `[Equity value]` / `[Shares Outstanding]`

![image](https://user-images.githubusercontent.com/46221053/189624460-223a51c1-bc58-4aef-a3a3-e34ceee98c1b.png)

## Description of Assumptions

`[Growth In Perpetuity(%)]`

The rate at which the company's free cash flow is assumed to grow in perpetuity. By default, this is equal to the `[Yield of the U.S. 10 Year Treasury Note]`.

`[Projection Years]`

Number of years for projecting future values. 5 years by default

`[Historic Years]` 

Number of historic years used to calculate average margins. 10 years by default

`[Revenue Regression Slope]` 

Future revenues are projected using a linear regression curve of past revenues. Set the slope '>1' for a steeper revenue regression curve, '0' for flat, '<0' for inverse slope

`[Operating Cash Flow Margin]` 

The margin of future Operating Cash Flow (or Cash From Operating Activities). This is by default the average Operating Cash Flow margin for the past `[Historic Years]`

### Discount Rate (WACC - Weighted Average Cost of Capital)

`[Discount Rate]`

The discount rate is used to discount all future free cash flow during the high growth period as well as the terminal value, in the stable phase. 
This is calculated by default using the Weighted Average Cost of Capital (WACC) formula (also available at [risk-analysis/weighted-average-cost-of-capital.js](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/risk-analysis/weighted-average-cost-of-capital.js))

> `[Discount Rate] = [Debt Weight] * [Cost of Debt] * (1 - [Tax Rate]) + [Equity Weight] * [Cost of Equity]`

`[Debt Weight]`

Weight of the total debt compared to the equity value (or market capitalization) + total debt
> [Debt Weight] = Total Debt / (Market Cap + Total Debt) = 1 - [Equity Weight]

`[Cost of Debt]`

The company's current cost of borrowing. 
> [Cost of Debt] = Interest Expense / Total Debt

`[Tax Rate]`

The taxes paid as a percentage of earnings before tax
> [Tax Rate] = Income Tax Expense / Income Before Tax

`[Equity Weight]`

Weight of the equity (or market capitalization) compared to the equity + total debt
> [Equity Weight] = Market Cap / (Market Cap + Total Debt) = 1 - [Debt Weight]

`[Cost of Equity];[Beta];[Risk Free Rate(%)];[Market Premium(%)]`

Check out [Calculating the Cost of Equity](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/dividend-discount-models.md#discount-rate-cost-of-equity)

## Calculating historic table values
`[Free Cash Flow](t) = [Cash from Operating Activities](t) - [Capital Expenditure](t)`

![image](https://user-images.githubusercontent.com/46221053/189626261-445b016c-0731-4daa-9070-a1f646e7b9d0.png)
