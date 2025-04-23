# Dividend Discount Models
Used to predict the value of a company's stock based on the theory that its present-day value is the sum of all its future dividend payments, discounted back to their present value.

* For stable and mature companies, use the [`Simple Dividend Discount Model`](#simple-dividend-discount-model)
* For high-growth companies, use the [`Two-Stage Dividend Discount Model`](#two-stage-dividend-discount-model)
* Discount rate calculation: [`Discount Rate (Cost of Equity)`](#discount-rate-cost-of-equity)
* Table values calculation: [`Calculating historical table values`](#calculating-historical-table-values)

## Simple Dividend Discount Model

Used to estimate the value of companies that have reached maturity and pay stable dividends as a significant percentage of their Free Cash Flow to Equity, with little to no high-growth potential.

``Estimated Value = Expected Dividend / (Discount Rate (%) - Growth In Perpetuity (%))``

This is also known as the Gordon Growth formula, which assumes that the expected dividend growth rate in perpetuity is constant.

> This model was inspired by Prof. Aswath Damodaran's spreadsheet [ddmst.xls](https://pages.stern.nyu.edu/~adamodar/pc/ddmst.xls)

``Expected Dividend:``  
- The expected dividend for the next year.  
- It is calculated by taking the average between `Next Linear Regression Dividend` and the last twelve months of dividends `LTM Dividend`.

> ``Expected Dividend = (Next Linear Regression Dividend + LTM Dividend) / 2``

``Growth In Perpetuity (%):``  
- This is the expected perpetual growth rate of dividends.  
- By default, it equals the current yield of the U.S. 10-Year Treasury Bond.

## Two-Stage Dividend Discount Model

Used to estimate the value of companies experiencing two growth stages: an initial `High Growth Period` represented by ``Sum of Discounted Dividends``, followed by a `Stable Growth Period` represented by ``Discounted Terminal Value``.

``Estimated Value = Sum of Discounted Dividends + Discounted Terminal Value``

> This model was inspired by Prof. Aswath Damodaran's spreadsheet [ddm2st.xls](https://pages.stern.nyu.edu/~adamodar/pc/ddm2st.xls)

### The First Stage (High Growth Period)
In this stage, we estimate future dividends during the high-growth period, calculated as a percentage of forecasted EPS (Earnings Per Share), then discount them to present value.  
EPS is projected using a linear regression of past EPS and the ``Average Historical Dividend Growth Rate``.  
We use dividend growth over EPS growth because dividends tend to grow more consistently.

> ``Sum of Discounted Dividends = Dividend(t+1)/(1 + Discount Rate (%)) + Dividend(t+2)/(1 + Discount Rate (%))^2 + ... + Dividend(t+High Growth Years)/(1 + Discount Rate (%))^High Growth Years``

``High Growth Years:``  
- The number of years expected to experience high growth.

``High Growth Rate (%):``  
- The expected EPS growth rate during the high-growth period.  
- By default, this equals the `Average Historical Dividend Growth Rate`.

``High Growth Payout (%):``  
- The expected dividend payout ratio during the high-growth phase.

### The Second Stage (Stable Period)
In this stage, we estimate a terminal value at the end of the high-growth phase and discount it to present value.

> ``Terminal Value = EPS in Stable Phase * Stable Payout / (Discount Rate - Stable Growth In Perpetuity)``  
> ``Discounted Terminal Value = Terminal Value / (1 + Discount Rate)^High Growth Years``

``Stable Growth In Perpetuity (%):``  
- The expected perpetual growth rate of dividends and EPS.  
- By default, this equals the current yield of the U.S. 10-Year Treasury Bond.

``Stable Payout:``  
- The dividend payout ratio in the stable phase, expressed as a percentage of EPS.

> ``Stable Payout = 1 - Stable Growth In Perpetuity / Average Historical Return on Equity``

Return on equity is calculated as: ``Net Income / Equity``

Expanded:

``Stable Payout = (Net Income - Stable Growth In Perpetuity * Equity) / Net Income``

Here, ``Stable Growth In Perpetuity * Equity`` gives a rough estimate of the minimum retained earnings during the stable phase.

## Discount Rate (Cost of Equity)

``Discount Rate:``  
- Used to discount all future dividends during the high-growth period and the terminal value in the stable phase.  
- By default, it is calculated using the cost of equity formula:

> ``Discount Rate = Risk Free Rate + Beta * Market Premium``

``Beta:``  
- A numeric value that measures the stock's volatility relative to the overall market.

``Risk Free Rate (%):``  
- By default, this is equal to the current yield of the U.S. 10-Year Treasury Bond.

``Market Premium (%):``  
- Typically uses the U.S. market average of 5.5%.  
- Defined as the average market return minus the average risk-free rate.

## Calculating Historical Table Values

Some companies have preferred shares that receive dividends, so they must be accounted for when calculating net income and dividends available to common shareholders.

`Calculated Preferred Stock Dividends & Premiums (t)` = `Total Dividends Paid (t)` - `Dividends Paid to Common Shareholders (t)`

`Dividends Paid to Common Shareholders (t)` = `Dividends per Common Share (t)` * `Common Shares Outstanding (t)`

`Net Income Available to Common Shareholders (t)` = `Net Income (t)` - `Calculated Preferred Stock Dividends & Premiums (t)`

`Return on Equity (t)` = `Net Income (t)` / `Equity (t-1)`

`Payout Ratio (Common) (t)` = `Dividends Paid to Common Shareholders (t)` / `Net Income Available to Common Shareholders (t)`

`Dividend Yield (t)` = `Dividends per Common Share (t)` / `Reference Market Share Price (t)`
