const eq = curry((a, b) => a === b)
const notMatch = curry((what, s) => !s.match(what))
const match = curry((what, s) => s && s.match(what))
const includes = curry((what,s) => s && s.includes(what))
const map = curry((fn, f) => f.map(fn))
const filter = curry((fn, xs) => xs.filter(fn))
const replace = curry((re, rpl, str) => str.replace(re, rpl))
const find = curry((fn, s) => s.find(fn))
const forEach = curry((fn, xs) => xs.forEach(fn))

const matchedCase = x => ({
  on: () => matchedCase(x),
  otherwise: () => x,
})

const matchCase = x => ({  
  on: (pred, fn) => (pred(x) ? matchedCase(fn(x)) : matchCase(x)),
  otherwise: fn => fn(x),
})

const compose = (...functions) => data =>
  functions.reduceRight((value, func) => func(value), data)

function curry(fn) {
  const arity = fn.length
  return function $curry(...args) {
    if (args.length < arity) {
      return $curry.bind(null, ...args)
    }
    return fn.call(null, ...args)
  }
}

module.exports = {
	eq,
	notMatch,
	match,
	includes,
	map,
  filter,
  replace,
  find,
  forEach,
  curry,
  compose,
  matchCase,
}