# Excess Return Models
Excess return models are used to estimate the value of a company's stock based on the future excess returns (net income − equity cost) the company can generate.

Excess return valuation is more appropriate for financial companies than enterprise valuation models such as the discounted free-cash-flow model.  
See [Valuing financial service firms](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/valuing-financial-firms.md#valuing-financial-service-firms-banks-insurance-companies-and-investment-banks)

> These models were inspired by Prof. Aswath Damodaran's spreadsheet [⬇️eqexret.xls](https://pages.stern.nyu.edu/~adamodar/pc/eqexret.xls)

* For stable and mature companies, use [Simple Excess Return Model](#simple-excess-return-model)
* For high-growth companies, use the [Two-Stage Excess Return Model](#two-stage-excess-return-model)
* Discount-rate calculation: [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)
* Table-value calculation: [Calculating table values](#calculating-historical-table-values)

## Simple Excess Return Model

Used to estimate the value of companies that have reached maturity and earn stable excess returns with little or no remaining high-growth potential.

> `Estimated Value` = `Present value of future excess returns` + `Book value of equity invested`

### Calculating the `Present value of future excess returns` using the Gordon Growth Model

By using the Gordon Growth Model, we assume that excess returns will grow steadily at the `Growth in Perpetuity` rate, and we discount them using the `Cost of Equity` (the discount rate).

`Present value of future excess returns` = `Excess Return per share` / (`Cost of Equity (the discount rate)` − `Growth in Perpetuity`)

![image](https://github.com/user-attachments/assets/85662c23-8b8b-4bef-ae00-a693954ae947)

### Calculating the `Excess Return per share`

The `Excess Return` is the difference between `Net Income` and `Equity Cost`.

`Net Income` = `Total Equity` * `Return on Equity`

`Equity Cost` = `Total Equity` * `Cost of Equity`

### Calculating the excess return per share:  

> `Excess Return per share` = `Next year's estimated book value` * (`Average historical Return on Equity` − `Cost of Equity`)

![image](https://github.com/user-attachments/assets/9035444e-2a22-4cc7-a4bc-fe2a89279f0e)

### Getting the `Book value of equity invested`

This is the total equity in the most recent quarter's balance sheet divided by the common shares outstanding in the same quarter (also shown in the LTM column).

> `Book value of equity invested` = `Total Equity(LTM)` / `Common shares outstanding(LTM)`

![image](https://github.com/user-attachments/assets/393420a5-2fb4-4f63-8396-702ad04641e8)
![image](https://github.com/user-attachments/assets/a9518342-5fe8-4b09-a583-98789d45dfa9)

### Description of assumptions

#### `Discount Rate`

See [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)

#### `Return on Equity`

- By default, this equals the `Average historical Return on Equity`, which represents `Net Income` as a percentage of `Total Equity`.

> `Return on Equity(t)` = `Net Income(t)` / `Total Equity(t)`

#### `Growth in Perpetuity`  
- The expected perpetual growth rate of future excess returns.  
- By default, equal to the current `Yield of the U.S. 10-Year Treasury Bond`.

#### `Historical Years`  
- Number of historical years used to calculate averages (such as the `Average historical Return on Equity` and the `Average historical Payout Ratio`).  
- Ten years by default.

## Two-Stage Excess Return Model

Used to estimate the value of companies based on two stages of growth: an initial period of high growth, represented by `Sum of discounted excess returns in Growth Stage`, followed by a period of stable growth, represented by `Discounted excess return in terminal stage`.

> `Estimated Value` = `Sum of discounted excess returns in Growth Stage` + `Discounted excess return in terminal stage` + `Book value of equity invested`
    
### The first stage (high-growth phase)

In the first stage we estimate the future excess returns for the next number of `High-Growth Years` (the expected duration of high growth) and then discount them to present value using `Cost of equity(t)`.

Each period's excess return is calculated by subtracting the equity cost from net income. The values in the estimates table in the example below are calculated on a per-share basis:

> `Excess return per share(t)` = `EPS available to common shareholders(t)` - `Equity cost per share(t)` = `Beginning book value of equity per share(t)` * (`Return on equity(t)` - `Cost of equity(t)`)

![image](https://github.com/user-attachments/assets/98dac7f2-065d-446e-9b88-ec2a07fa6b7d)

All excess returns are then discounted at `Cost of Equity(t)`, which can be defined in the forecast table:

![image](https://github.com/user-attachments/assets/1b0ecf1b-ef75-4be3-bf5f-374e664f256d)

We then sum all these `Discounted excess return per share` values to obtain the `Sum of discounted excess returns in Growth Stage`.

#### Calculating the table values

> `Beginning book value of equity per share(t)` = `Beginning book value of equity per share(t-1)` + `Retained earnings(t-1)` `EPS available to common shareholders(t)` = `Beginning book value of equity per share(t)` * `Return on equity(t)`

We estimate a `Payout Ratio in stable stage` using the following formula:

> `Payout Ratio in stable stage` = 1 − (`Stable Growth in Perpetuity` / `Stable Return on Equity`)

The payout ratio is then gradually adjusted upward to the stable payout ratio:

> `Payout Ratio(t)` = `Payout Ratio in stable stage` + ((`High-Growth Years` − t − 1) × (`Average historical Payout Ratio` − `Payout Ratio in stable stage`) / (`High-Growth Years` − 1))

### The second stage (stable phase)

In the second stage we estimate the `Excess Returns in the Terminal Stage` at the end of the growth phase (similar to the Simple Excess Return Model) and discount it to present value using the `Discount Rate` (see [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)).

`Discounted excess return in terminal stage` = `Excess Returns in the Terminal Stage` / (1 + `Discount Rate`)^`High Growth Years` 

`Excess Returns in the Terminal Stage` = `Terminal year's excess return` * (`Discount Rate` - `Stable Growth in Perpetuity`) 

`Terminal year's excess return` = `Beginning book value of equity per share(Terminal Year)` * (`Stable Return on Equity` - `Discount Rate`)

The following example shows the values of interest for the stable period, highlighted in green.

![image](https://github.com/user-attachments/assets/0be5e6f3-3844-45ef-8ff8-6502492d93c1)

#### `Stable Return on Equity`  
- The return on equity in the stable phase.

#### `Stable Growth in Perpetuity`  
- The expected perpetual growth rate of excess returns.  
- By default, equal to the current `Yield of the U.S. 10-Year Treasury Bond`.

## Discount Rate (Cost of Equity)

#### `Discount Rate`

- The discount rate is used to discount all future `Excess return per share` values during the high-growth period, as well as the `Excess Returns in the Terminal Stage` in the stable phase.  
- By default, it is calculated using the cost-of-equity formula:

> `Discount Rate` = `Risk-Free Rate` + `Beta` × `Market Premium`

#### `Beta`  
- A numerical value that measures how much a stock's returns fluctuate relative to movements in the overall stock market.

#### `Risk-Free Rate`  
- By default, equal to the current yield of the U.S. 10-Year Treasury Bond.

#### `Market Premium`  
- The average U.S. market premium of 5.5 %, i.e., the average return of the U.S. market minus the average risk-free rate.

## Calculating historical table values

Because some companies have preferred shares outstanding that receive dividends, we need to account for them when calculating net income and dividends available to common shareholders.

`Return on equity(t)` = `Net Income (t)` / `Total Stockholders Equity (t-1)` 

`Dividends Paid to Common Shareholders(t)` = `Dividend per Share (t)` * `Shares Outstanding (t)` 

`Payout ratio (t)` = `Dividends Paid to Common Shareholders (t)` / `Net Income (t)` 

`Book Value (t)` = `Total Stockholders Equity (t)` / `Shares Outstanding (t)`

