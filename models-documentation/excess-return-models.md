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

Used to estimate the value of companies that have reached maturity and earn stable excess returns with little to no high growth chance.

          [Estimated Value] = [Present value of future excess returns] + [Book value of equity invested]

### Calculating the [Present value of future excess returns] using the Gordon Growth Model

By using the Gordon Growth Model, we assume that the excess return will grow steadily at exactly the `[Growth In Perpetuity]` rate and we will discount them using the `[Cost of Equity (the discount rate)]`.

`[Present value of future excess returns] = [Excess Return per share] * ([Cost of Equity (the discount rate)] - [Growth In Perpetuity])`

![image](https://user-images.githubusercontent.com/46221053/198673930-2fe454e9-a72d-4594-ab2c-cb9c0fbccc76.png)

### Calculating the [Excess Return per share]

The `[Excess Return]` is the difference between the `[Net Income]` and the `[Equity Cost]`.

```
[Net Income] = [Total Equity] * [Return on Equity]
[Equity Cost] = [Total Equity] * [Cost of Equity]
```

Calculating the excess return per share:
`[Excess Return per share] = [Next year's estimated book value] * ([Return on Equity] - [Cost of Equity])`

![image](https://user-images.githubusercontent.com/46221053/198674549-715977c1-ffaa-4a42-96ac-077709df4c20.png)

### Getting the [Book value of equity invested]

This is the total equity in the last quarter's balance sheet divided by the common shares outstanding in the same quarter (also displayed in the LTM column).

`[Book value of equity invested] = [Total Equity](LTM) / [Common shares outstanding](LTM)`

![image](https://user-images.githubusercontent.com/46221053/198676668-c853239b-0c6c-4e62-bbe0-51b67feb65b5.png)

### Description of Assumptions
`[Discount Rate]:`

See [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)

`[Return On Equity]:`

- This is equal by default to the `[Average historic Return on Equity]`, which represents the `[Net Income]` as a percentage of `[Total Equity]`.

`[Return on Equity](t) = [Net Income](t) / [Total Equity](t)`

`[Growth In Perpetuity]:`
- This is the expected growth rate in perpetuity of future excess returns.
- By default, this is equal to the current `[Yield of the U.S. 10 Year Treasury Bond]`.

`[Historic Years]:`
- Number of historic years used to calculate averages. (such as the `[Average historic Return on Equity]` and the `[Average historic Payout Ratio]`)
- 10 years by default

## Two-Stage Excess Return Model ([Source Code](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/valuations/excess-returns-model.js))
Used to estimate the value of companies based on two stages of growth. An initial period of high growth, represented by `[Sum of discounted excess returns in Growth Stage]`, followed by a period of stable growth, represented by `[Discounted excess return in terminal stage]`.

    [Estimated Value] = [Sum of Discounted excess returns in Growth Stage] + [Discounted excess return in terminal stage] + [Book value of equity invested]
    
### The first stage (High growth phase):

In the first stage, we estimate the future excess returns for the next number of [High Growth Years] (the number of years of expected high growth), and then discount them to present value (using the `[Cost of equity](t)`).

Each period's excess return is calculated by subtracting the Equity cost from the Net Income. Values in the estimates table from the example image below are calculated on a per share basis:

```
[Excess return per share](t) = [EPS available to common shareholders](t) - [Equity cost per share](t) =
= [Beginning book value of equity per share](t) * ([Return on equity](t) - [Cost of equity](t))
```

![image](https://user-images.githubusercontent.com/46221053/198632102-92acf191-840f-4c26-a865-46e3395cda68.png)

All excess returns are then discounted at the `[Cost of Equity](t)` that can be defined in the forecast table:

![image](https://user-images.githubusercontent.com/46221053/198597829-c3d3fa66-83fa-46d6-988b-bf723568085e.png)

Then we sum up all these `[Discounted excess return per share]` to get the `[Sum of Discounted excess returns in Growth Stage]`.

#### Calculating the table values:

```
[Beginning book value of equity per share](t) = [Beginning book value of equity per share](t-1) + [Retained earnings](t-1)
[EPS available to common shareholders](t) = [Beginning book value of equity per share](t) * [Return on equity](t)
```
We estimate a `[Payout Ratio in stable stage]` in the stable phase using the following formula:

`[Payout Ratio in stable stage] =  1 - ([Stable Growth In Perpetuity] / [Stable Return On Equity])`

The payout ratio is then gradually adjusted up to the stable payout ratio as such:

`[Payout Ratio](t) = [Payout Ratio in stable stage] + (([High Growth Years] - t - 1) * ([Average historic Payout Ratio] - [Payout Ratio in stable stage]) / ([High Growth Years] - 1) )`

### The second stage (Stable phase):
In the second stage, we estimate the `[Excess Returns in the Terminal Stage]` term at the end of the growth phase (just like in the [Simple Excess Return Model](#simple-excess-return-model-source-code)) and discount it to present value using the `[Discount Rate]` (See Calculation [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)).

```
[Discounted excess return in terminal stage] = [Excess Returns in the Terminal Stage] / (1 + [Discount Rate]^[High Growth Years])
[Excess Returns in the Terminal Stage] = [Terminal year's excess return] * ([Discount Rate] - [Stable Growth In Perpetuity])
[Terminal year's excess return] = [Beginning book value of equity per share](Terminal Year) * ([Stable Return On Equity] - [Discount Rate])
```

This following example show the values of interest for the stable period highlighted in purple.
![image](https://user-images.githubusercontent.com/46221053/198622321-eda7e820-7700-47fa-aba7-a20b22a3a021.png)

`[Stable Return On Equity]:`

- The return on equity in the stable phase.

`[Stable Growth In Perpetuity]:`

- This is the expected growth rate of excess returns in perpetuity.
- By default, this is equal to the current `[Yield of the U.S. 10 Year Treasury Bond]`.

## Discount Rate (Cost of Equity)

`[Discount Rate]:`

- The discount rate is used to discount all future `[Excess return per share]` during the high growth period as well as the `[Excess Returns in the Terminal Stage]`, in the stable phase.
- This is calculated by default using the cost of equity formula:

> `[Discount Rate] = [Risk Free Rate] + [Beta] * [Market Premium]`

`[Beta]:`

- Beta is a numeric value that measures the fluctuations of a stock to changes in the overall stock market.

`[Risk Free Rate]:`

- By default, it is equal to the current yield of the U.S. 10 Year Treasury Bond.

`[Market Premium]:`

- Using the average U.S. market premium of 5.5%. 
- This is the average return of the U.S. market - average risk free rate.

## Calculating historic table values

Because some companies have preferred shares outstanding that receive dividends, we need to take them into account when calculating the common shareholders net income and dividends.

![image](https://user-images.githubusercontent.com/46221053/198636256-af5efd9e-60ec-47c0-b6c0-fdd7d4c225ce.png)

```
[Calculated preferred stock dividends & premiums](t) = [Net income](t) - [Net income available to common shareholders](t)
[Net income available to common shareholders](t) = [EPS available to Common shareholders](t) * [Common shares outstanding](t)
[Return on equity](t) = [Net income](t) / [Equity](t-1)
[Dividends paid to common shareholders](t) = [Dividends per common share](t) * [Common shares outstanding](t)
[Payout ratio (common)](t) = [Dividends paid to common shareholders](t) / [Net income available to common shareholders](t)
[Ending Book Value per share](t) = [Equity](t) / [Common shares outstanding](t)
```
