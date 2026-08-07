module.exports = new Proxy(
    {},
    {
        get: (target, prop) => (prop === '__esModule' ? true : prop),
    },
)
