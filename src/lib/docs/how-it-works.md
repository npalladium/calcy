A peek under the hood—the ideas behind how calcy works.

### Units are part of the maths

Every quantity carries its units, and calcy keeps them consistent as you go.
That's why `12 V / 4 ohm` comes out in amps, why conversions stay exact, and why
mixing things that don't belong together—metres and seconds—gets flagged instead
of quietly giving a wrong answer.

It handles the awkward cases too. Temperatures add an offset rather than just a
scale. Decibels live on a logarithmic scale. Currencies are kept apart so they
never mix by accident, and you can set your own exchange rates to convert between
them.

### Uncertainty is carried through

When a value is a range rather than a single number, calcy tracks the whole
spread as it flows through your calculation, so the final answer reflects how
unsure the inputs were. Reuse the same uncertain value twice and calcy remembers
it's the *same* value—so `x - x` comes out as exactly zero, the way it should.

### Exact when it can be, estimated when it can't

For familiar shapes—a bell curve, a lopsided spread, a plain range—and operations
that keep that shape, calcy uses the exact formula, so the average and the
percentiles come back with no guesswork. For everything else, it estimates the
answer by running the calculation many times across the range of possibilities
and summarising what comes out. You get the exact answer where one exists, and a
dependable estimate where it doesn't.

### The same numbers every time (until you ask otherwise)

Every sheet draws its random samples from a fixed **seed**—the starting point for
the randomness—so you see the same results each time you open it. Press
**Re-roll** to draw from a new seed when you want a fresh sample, to check that
your conclusion doesn't hinge on luck.

### Tested against worked examples

The maths behind calcy is tested against a large set of worked examples, so the
answers stay reliable as it grows.
