# Dividend Discount Models
Used to predict the value of a company's stock based on the theory that its present-day value is worth the sum of all of its future dividend payments when discounted back to their present value.

* For stable and mature companies, use [Simple Dividend Discount Model](#simple-dividend-discount-model)
* For high growth companies, use the [Two-Stage Dividend Discount Model](#two-stage-dividend-discount-model)
* Discount rate calculation [Discount Rate (Cost of Equity)](#discount-rate-cost-of-equity)
* Table values calculation [Calculating historic figures table values](#calculating-historic-figures-table-values)

## Simple Dividend Discount Model ([Source Code](https://github.com/DiscountingCashFlows/Documentation/blob/main/source-code/valuations/Simple-Dividend-Discount-Model.js))

Used to estimate the value of companies that have reached maturity and pay stable dividends as a significant percentage of their Free Cashflow to Equity with little to no high growth chance.

`[Estimated Value] = [Expected Dividend] / ([Discount Rate(%)] - [Growth In Perpetuity(%)])`

This is also known as the Gordon Growth formula, which assumes that the expected growth rate in perpetuity in dividends is constant forever.

`[Expected Dividend]`

The expected dividend for next year. It is calculated weighing the next year's linear regression of historical dividends `[Next Linear Regression Dividend]` and the `[LTM Dividend]`.

> `[Expected Dividend] = [Linear Regression Weight(%)] * [Next Linear Regression Dividend] + (1 - [Linear Regression Weight(%)]) * [LTM Dividend]`

`[Growth In Perpetuity(%)]`

This is the expected growth rate in perpetuity of dividends. By default, this is equal to the current yield of the U.S. 10 Year Treasury Bond.

`[Linear Regression Weight(%)]`

This rate represents how much will the `[Expected Dividend]` be affected by the `[Next Linear Regression Dividend]`. 
* 100% means the `[Expected Dividend]` will be equal to the `[Next Linear Regression Dividend]`.
* 0% means the `[Expected Dividend]` will be equal to the `[LTM Dividend]`.
* By default it is set to 50%.

## Two-Stage Dividend Discount Model

Used to estimate the value of companies based on two stages of growth. An initial [period of high growth](#the-first-stage-high-growth-period), represented by `[Sum of Discounted Dividends]`, followed by a [period of stable growth](#the-second-stage-stable-period), represented by `[Discounted Terminal Value]`.

`[Estimated Value] = [Sum of Discounted Dividends] + [Discounted Terminal Value]`

### The first stage (High growth period):
In the first stage, we estimate the future high growth period dividends, calculated as a percentage of future EPS(Earnings Per Share), and then discount them to present value.
The future EPS is forecasted using linear regression of past EPS and the `[Average historic Dividend Growth Rate]`.
We use the Dividend growth rate instead of the EPS growth rate because the dividends tend to grow more consistently than EPS.

> `[Sum of discounted dividends] = Dividend(t+1)/(1 + [Discount Rate(%)]) + Dividend(t+2)/(1 + [Discount Rate(%)])^2 + ... + Dividend(t+[High Growth Years])/(1 + [Discount Rate(%)])^[High Growth Years]`

`[High Growth Years]`

The number of years of expected high growth.

`[High Growth Rate(%)]`

The expected EPS growth rate during the high growth period. It is equal to `[Average historic Dividend Growth Rate]` by default.

`[High Growth Payout(%)]`

The expected payout ratio of dividends to common shareholders during the high growth period.

### The second stage (Stable period):
In the second stage, we estimate a Terminal Value at the end of the growth period and discount it to present value.

> `[Terminal value] = [Eps in stable phase] * [Stable Payout] / ([Discount Rate] - [Stable Growth In Perpetuity])`

> `[Discounted terminal value] = [Terminal value] / (1 + [Discount Rate])^[High Growth Years]`

`[Stable Growth In Perpetuity(%)]`

This is the expected growth rate in perpetuity of dividends and EPS. By default, this is equal to the current yield of the U.S. 10 Year Treasury Bond.

`[Stable Payout]`

The dividend payout in the stable phase as a percentage of EPS.

> `[Stable Payout] = 1 - [Stable Growth In Perpetuity] / [Average historic Return on Equity]`

The return on equity is calculated as: `[Net Income] / [Equity]`

If we expand the formula, it becomes `[Stable Payout] = ([Net Income] - [Stable Growth In Perpetuity] * [Equity]) / [Net Income]`

Where `[Stable Growth In Perpetuity] * [Equity]` gives us a rough estimation of the minimum retention of earnings during this stable phase.

## Discount Rate (Cost of Equity)

`[Discount Rate]`

The discount rate is used to discount all future dividends during the high growth period as well as the terminal value, in the stable phase. 
This is calculated by default using the cost of equity formula:

> `[Discount Rate] = [Risk Free Rate] + [Beta] * [Market Premium]`

`[Beta]`

Beta is a numeric value that measures the fluctuations of a stock to changes in the overall stock market.

`[Risk Free Rate(%)]`

By default, it is equal to the current yield of the U.S. 10 Year Treasury Bond.

`[Market Premium(%)]`

Using the average U.S. market premium of 5.5%. This is the average return of the U.S. market - average risk free rate.

## Calculating historic table values
`[Calculated preferred stock dividends & premiums](t) = [Total dividends paid](t) - [Dividends paid to common shareholders](t)`
Because some companies have preferred shares outstanding that receive dividends, we need to take them into account when calculating the common shareholders net income and dividends.

`[Dividends paid to common shareholders](t) = [Dividends per common share](t) * [Common shares outstanding](t)`

`[Net income available to common shareholders](t) = [Net income](t) - [Calculated preferred stock dividends & premiums](t)`

`[Return on equity](t) = [Net income](t) / [Equity](t-1)`

`[Payout ratio (common)](t) = [Dividends paid to common shareholders](t) / [Net income available to common shareholders](t)`

`[Dividend yield](t) = [Dividends per common share](t) / [Reference market share price](t)`
