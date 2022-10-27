# Excess Return Models 
Used to predict the value of a company's stock based on the future excess returns (Net Income - Equity Cost) that the company is able to generate. 

Excess Returns are better suited for financial companies, rather than an enterprise valuation model (such as the Discounted Free Cash Flow Model). 
See [Valuing financial service firms](https://github.com/DiscountingCashFlows/Documentation/blob/main/models-documentation/valuing-financial-firms.md#valuing-financial-service-firms-banks-insurance-companies-and-investment-banks)

> These models were inspired by prof. Aswath Damodaran's spreadsheet [eqexret.xls](https://pages.stern.nyu.edu/~adamodar/pc/eqexret.xls)

* For stable and mature companies, use [Simple Excess Return Model](#simple-excess-return-model-source-code)
* For high growth companies, use the [Two-Stage Excess Return Model](#two-stage-excess-return-model-source-code)
* Discount rate calculation [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)
* Table values calculation [Calculating table values](#calculating-historic-table-values)

## Simple Excess Return Model ([Source Code](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/valuations/excess-returns-model.js))

          [Estimated Value] = [Excess Return] / ([Discount Rate(%)] - [Growth In Perpetuity(%)]) + [Book value of equity invested]
### Description of Assumptions
`[Discount Rate(%)]:`

See [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)

`[Return On Equity(%)]:`

`[Growth In Perpetuity(%)]:`
- This is the expected growth rate in perpetuity of excess returns.
- By default, this is equal to the current [Yield of the U.S. 10 Year Treasury Bond].

`[Historic Years]:`

## Two-Stage Excess Return Model ([Source Code](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/valuations/excess-returns-model.js))
Used to estimate the value of companies based on two stages of growth. An initial period of high growth, represented by [Sum of Discounted excess returns in Growth Stage], followed by a period of stable growth, represented by [Discounted excess return in terminal stage].

    [Estimated Value] = [Discounted excess return in terminal stage] + [Sum of Discounted excess returns in Growth Stage] + [Book value of equity invested (LTM)]
    
### The first stage (High growth period):
TODO...

`[High Growth Years]:` 

- The number of years of expected high growth.

### The second stage (Stable period):
TODO...

`[Stable Return On Equity(%)]:`

- The return on equity in the stable phase.

`[Stable Growth In Perpetuity(%)]:`

- This is the expected growth rate of excess returns in perpetuity.
- By default, this is equal to the current [Yield of the U.S. 10 Year Treasury Bond].

## Discount Rate (Cost of Equity)

`[Discount Rate]:`

- The discount rate is used to discount all future `[Excess return per share]` during the high growth period as well as the `[Excess Returns in the Terminal Stage]`, in the stable phase.
- This is calculated by default using the cost of equity formula:

> `[Discount Rate] = [Risk Free Rate] + [Beta] * [Market Premium]`

`[Beta]:`

- Beta is a numeric value that measures the fluctuations of a stock to changes in the overall stock market.

`[Risk Free Rate(%)]:`

- By default, it is equal to the current yield of the U.S. 10 Year Treasury Bond.

`[Market Premium(%)]:`

- Using the average U.S. market premium of 5.5%. 
- This is the average return of the U.S. market - average risk free rate.

## Calculating historic table values

Because some companies have preferred shares outstanding that receive dividends, we need to take them into account when calculating the common shareholders net income and dividends.

```
[Calculated preferred stock dividends & premiums](t) = [Net income](t) - [Net income available to common shareholders](t)
[Net income available to common shareholders](t) = [EPS available to Common shareholders](t) * [Common shares outstanding](t)
[Return on equity](t) = [Net income](t) / [Equity](t-1)
[Dividends paid to common shareholders](t) = [Dividends per common share](t) * [Common shares outstanding](t)
[Payout ratio (common)](t) = [Dividends paid to common shareholders](t) / [Net income available to common shareholders](t)
[Ending Book Value per share](t) = [Equity](t) / [Common shares outstanding](t)
```
