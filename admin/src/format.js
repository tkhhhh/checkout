const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

export const money = (cents) => gbp.format((cents ?? 0) / 100)
