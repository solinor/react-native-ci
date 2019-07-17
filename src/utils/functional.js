
const matchedCase = x => ({
  on: () => matchedCase(x),
  otherwise: () => x
})

const matchCase = x => ({
  on: (pred, fn) => (pred(x) ? matchedCase(fn(x)) : matchCase(x)),
  otherwise: fn => fn(x)
})

module.exports = {
  matchCase
}
