# Third-party notices

calcy adapts code, data, and design from the projects below. Their notices are
reproduced here as their licenses require. calcy as a whole is licensed under
GPL-3.0 (see `LICENSE`); incorporating Rink's GPL-3.0 unit-definition data is
part of why the combined work is GPL-3.0.

---

## Rink (rink-rs) — unit catalogue & unit-aware evaluation

<https://github.com/tiffany352/rink-rs> · author: tiffany352

Rink is dual-licensed: the source code under the **Mozilla Public License
2.0**, and the `definitions.units` data file under the **GNU General Public
License v3.0**. calcy's curated unit catalogue (`src/lib/engine/units.ts`) draws
on Rink's unit definitions and its approach to dimensional, unit-aware
arithmetic. Because that data is GPL-3.0, the combined work is GPL-3.0.

- MPL-2.0: <https://www.mozilla.org/MPL/2.0/>
- GPL-3.0: see `LICENSE` in this repository.

---

## Frink — expression-language & units inspiration

<https://frinklang.org/> · author: Alan Eliasen

Frink is a calculating tool and programming language with first-class units of
measure. calcy's unit-aware expression language and the breadth of its unit
catalogue are inspired by Frink. Frink itself is not open source; no Frink code
is included — only design influence and publicly known unit values (facts).

---

## distribution-calculator-android — uncertainty model & `to` interval syntax

<https://github.com/NunoSempere/distribution-calculator-android>

The "every value is a distribution" model and the `lo to hi` 90%-confidence-
interval syntax are taken from Nuño Sempere's distribution calculator.

```
MIT License

Copyright 2025 Nuño Sempere

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## numutil — human number parsing & formatting

<https://github.com/naftaliharris/numutil>

calcy's spelled-out number support (`two hundred and fifty`, the `and`
connector) and the "newspaper" number format (`1.04 billion`) are modelled on
numutil's `str2num` / `num2str`.

```
Copyright (c) 2013, Naftali Harris
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NAFTALI HARRIS BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
