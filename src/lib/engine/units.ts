// Curated unit catalogue: hand-owned TypeScript, no external units engine.
//
// Coverage is broad and Frink-inspired: a generic SI-prefix expander applied to
// the metric units, plus a large curated table of customary/imperial, physical,
// and domain units across every base dimension — and a few named constants.
//
// Each token maps to a base-unit signature + a `scale` converting one of that
// unit into the canonical base product (SI: m, kg, s, A, K, mol, cd, bit; plus
// per-name base dims for counts and currency so labels survive arithmetic).

import type { Dimension } from './value';

export interface UnitDef {
	dim: Dimension;
	scale: number; // 1 <unit> == scale (canonical base units)
	// Affine (offset) units: `base = scale·x + offset` (e.g. °C: scale 1, offset
	// 273.15; gauge pressure: offset = 1 atm). Absent for ordinary multiplicative
	// units, including temperature *difference* units (Cdeg/Δ°C).
	offset?: number;
	// Temperature *difference* unit (Cdeg/Δ°C): a value built from it is tagged a
	// `diff` so it converts to °C/°F without the offset.
	diff?: boolean;
	// Logarithmic (ratio) unit (dB/dBm/dBW): `base = ref·10^(x/factor)`. `factor`
	// is 10 for the power-domain decibel; `ref` pins the 0-point to a physical
	// quantity (1 mW for dBm, 1 W for dBW, 1 for the bare dimensionless dB).
	log?: { ref: number; factor: number };
}

export interface UnitTableOptions {
	monthDays: number; // toggleable (see README — Defined constants)
	yearDays: number;
}

// One catalogue entry per *unit* (not per alias): the canonical token, its
// synonyms, the section it belongs to, and enough of its definition to describe
// it. Emitted by `buildUnitTable` when a `collect` sink is passed, so the
// generated reference (scripts/gen-reference.ts) is derived from the exact same
// `add()` calls that build the lookup table — there is no second list to drift.
export interface UnitCatEntry {
	category: string;
	canonical: string;
	aliases: string[];
	dim: Dimension;
	scale: number;
	kind?: 'affine' | 'log' | 'diff';
	prefixed?: boolean; // accepts the full set of SI prefixes (metric units)
}

const DEFAULTS: UnitTableOptions = { monthDays: 30.436875, yearDays: 365.25 };

// Full SI decimal prefixes (quetta … quecto). `da`/deca omitted (rarely used,
// two-letter ambiguity); all others are single-letter so collisions are avoided
// by only ever emitting `prefix+unit` combinations, never bare prefixes.
const SI_PREFIXES: [string, number][] = [
	['Q', 1e30],
	['R', 1e27],
	['Y', 1e24],
	['Z', 1e21],
	['E', 1e18],
	['P', 1e15],
	['T', 1e12],
	['G', 1e9],
	['M', 1e6],
	['k', 1e3],
	['h', 1e2],
	['d', 1e-1],
	['c', 1e-2],
	['m', 1e-3],
	['u', 1e-6],
	['µ', 1e-6],
	['n', 1e-9],
	['p', 1e-12],
	['f', 1e-15],
	['a', 1e-18],
	['z', 1e-21],
	['y', 1e-24],
	['r', 1e-27],
	['q', 1e-30]
];

// IEC binary prefixes for data units.
const BIN_PREFIXES: [string, number][] = [
	['Ki', 2 ** 10],
	['Mi', 2 ** 20],
	['Gi', 2 ** 30],
	['Ti', 2 ** 40],
	['Pi', 2 ** 50],
	['Ei', 2 ** 60]
];

// --- base-dimension shorthands ---
const LEN = (e = 1): Dimension => ({ length: e });
const MASS = (e = 1): Dimension => ({ mass: e });
const TIME = (e = 1): Dimension => ({ time: e });
const CUR = (e = 1): Dimension => ({ current: e });
const TEMP = (e = 1): Dimension => ({ temperature: e });
const AMT = (e = 1): Dimension => ({ amount: e });
const LUM = (e = 1): Dimension => ({ luminosity: e });
const DATA = (e = 1): Dimension => ({ data: e });
const DIMLESS: Dimension = {};

// --- derived-dimension shorthands ---
const AREA = LEN(2);
const VOLUME = LEN(3);
const SPEED: Dimension = { length: 1, time: -1 };
const ACCEL: Dimension = { length: 1, time: -2 };
const FREQ: Dimension = { time: -1 };
const FORCE: Dimension = { mass: 1, length: 1, time: -2 };
const ENERGY: Dimension = { mass: 1, length: 2, time: -2 };
const POWER: Dimension = { mass: 1, length: 2, time: -3 };
const PRESSURE: Dimension = { mass: 1, length: -1, time: -2 };
const CHARGE: Dimension = { current: 1, time: 1 };
const VOLTAGE: Dimension = { mass: 1, length: 2, time: -3, current: -1 };
const RESISTANCE: Dimension = { mass: 1, length: 2, time: -3, current: -2 };
const CONDUCTANCE: Dimension = { mass: -1, length: -2, time: 3, current: 2 };
const CAPACITANCE: Dimension = { mass: -1, length: -2, time: 4, current: 2 };
const INDUCTANCE: Dimension = { mass: 1, length: 2, time: -2, current: -2 };
const MAGFLUX: Dimension = { mass: 1, length: 2, time: -2, current: -1 };
const MAGFLUXDENSITY: Dimension = { mass: 1, time: -2, current: -1 };
const ILLUMINANCE: Dimension = { luminosity: 1, length: -2 };
const DOSE: Dimension = { length: 2, time: -2 }; // J/kg (Gy, Sv)

// Build the full table for a given month/year convention.
export function buildUnitTable(
	opts: Partial<UnitTableOptions> = {},
	collect?: (e: UnitCatEntry) => void
): Map<string, UnitDef> {
	const o = { ...DEFAULTS, ...opts };
	const t = new Map<string, UnitDef>();
	// Catalogue capture. When `collect` is supplied (only by buildUnitCatalogue),
	// each helper emits one structured entry under the current `section`. On the
	// hot path (`collect` undefined) `emit` is a no-op, so the Map build is
	// unchanged.
	let category = '';
	const section = (label: string) => {
		category = label;
	};
	const emit = (
		canonical: string,
		aliases: string[],
		dim: Dimension,
		scale: number,
		extra: Partial<UnitCatEntry> = {}
	) => collect?.({ category, canonical, aliases, dim, scale, ...extra });
	const add = (names: string[], dim: Dimension, scale: number) => {
		for (const n of names) t.set(n, { dim, scale });
		emit(names[0], names.slice(1), dim, scale);
	};
	// Affine (offset) unit: `base = scale·x + offset`. Absolute temperatures and
	// gauge pressures. The magnitude-multiply consumes the offset (see eval.ts).
	const addAffine = (names: string[], dim: Dimension, scale: number, offset: number) => {
		for (const n of names) t.set(n, { dim, scale, offset });
		emit(names[0], names.slice(1), dim, scale, { kind: 'affine' });
	};
	// Logarithmic (ratio) unit: `base = ref·10^(x/factor)`. `scale` is set to
	// `ref` only so the catalogue's finite/non-zero invariant holds; the log
	// transform (eval.ts/format.ts) reads `log`, never `scale`.
	const addLog = (names: string[], dim: Dimension, ref: number, factor: number) => {
		for (const n of names) t.set(n, { dim, scale: ref, log: { ref, factor } });
		emit(names[0], names.slice(1), dim, ref, { kind: 'log' });
	};
	// Expand a metric symbol across SI prefixes (guard: never overwrite an
	// explicit unit). `dim` is shared by reference — fine, it is read-only.
	const metric = (sym: string, dim: Dimension, scale = 1, prefixes = SI_PREFIXES) => {
		if (!t.has(sym)) t.set(sym, { dim, scale });
		for (const [p, f] of prefixes) {
			const key = `${p}${sym}`;
			if (!t.has(key)) t.set(key, { dim, scale: scale * f });
		}
		emit(sym, [], dim, scale, { prefixed: true });
	};

	// ===================== LENGTH (base m) =====================
	section('Length');
	add(['m', 'meter', 'meters', 'metre', 'metres'], LEN(), 1);
	metric('m', LEN(), 1);
	add(['km', 'kilometer', 'kilometers'], LEN(), 1e3);
	add(['cm', 'centimeter', 'centimeters'], LEN(), 1e-2);
	add(['mm', 'millimeter', 'millimeters'], LEN(), 1e-3);
	add(['micron', 'microns'], LEN(), 1e-6);
	add(['angstrom', 'angstroms', 'Å', 'Å'], LEN(), 1e-10);
	add(['fermi'], LEN(), 1e-15);
	add(['inch', 'inches'], LEN(), 0.0254); // 'in' is reserved for conversion
	add(['mil', 'thou'], LEN(), 2.54e-5);
	add(['ft', 'foot', 'feet'], LEN(), 0.3048);
	add(['yd', 'yard', 'yards'], LEN(), 0.9144);
	add(['mi', 'mile', 'miles'], LEN(), 1609.344);
	add(['nmi', 'nauticalmile', 'nauticalmiles'], LEN(), 1852);
	add(['furlong', 'furlongs'], LEN(), 201.168);
	add(['chain', 'chains'], LEN(), 20.1168);
	add(['rod', 'rods', 'perch', 'pole'], LEN(), 5.0292);
	add(['fathom', 'fathoms'], LEN(), 1.8288);
	add(['league', 'leagues'], LEN(), 4828.032);
	add(['pt', 'point', 'points'], LEN(), 0.0254 / 72); // typographic
	add(['pica', 'picas'], LEN(), 0.0254 / 6);
	add(['au', 'AU', 'astronomicalunit'], LEN(), 1.495978707e11);
	add(['ly', 'lightyear', 'lightyears'], LEN(), 9.4607304725808e15);
	add(['pc', 'parsec', 'parsecs'], LEN(), 3.08567758149137e16);

	// ===================== AREA =====================
	section('Area');
	add(['m2', 'sqm'], AREA, 1);
	add(['km2', 'sqkm'], AREA, 1e6);
	add(['cm2'], AREA, 1e-4);
	add(['ha', 'hectare', 'hectares'], AREA, 1e4);
	add(['are', 'ares'], AREA, 1e2);
	add(['acre', 'acres'], AREA, 4046.8564224);
	add(['barn', 'barns'], AREA, 1e-28);
	add(['sqft', 'sqfeet'], AREA, 0.09290304);
	add(['sqmi'], AREA, 2.589988110336e6);
	add(['sqin'], AREA, 0.00064516);

	// ===================== VOLUME =====================
	section('Volume');
	add(['m3', 'cum'], VOLUME, 1);
	add(['cc', 'cm3'], VOLUME, 1e-6);
	add(['L', 'l', 'liter', 'liters', 'litre', 'litres'], VOLUME, 1e-3);
	metric('L', VOLUME, 1e-3);
	add(['mL', 'ml', 'milliliter', 'milliliters'], VOLUME, 1e-6);
	add(['cL', 'cl'], VOLUME, 1e-5);
	add(['dL', 'dl'], VOLUME, 1e-4);
	add(['gal', 'gallon', 'gallons'], VOLUME, 0.003785411784); // US
	add(['galuk', 'impgal'], VOLUME, 0.00454609); // imperial
	add(['qt', 'quart', 'quarts'], VOLUME, 0.000946352946);
	add(['pint', 'pints', 'pt_us'], VOLUME, 0.000473176473);
	add(['cup', 'cups'], VOLUME, 0.0002365882365);
	add(['floz', 'fluidounce'], VOLUME, 2.95735295625e-5);
	add(['tbsp', 'tablespoon'], VOLUME, 1.47867647813e-5);
	add(['tsp', 'teaspoon'], VOLUME, 4.92892159375e-6);
	add(['bbl', 'barrel', 'barrels'], VOLUME, 0.158987294928); // oil

	// ===================== MASS (base kg) =====================
	section('Mass');
	add(['kg', 'kilogram', 'kilograms'], MASS(), 1);
	add(['g', 'gram', 'grams', 'gramme', 'grammes'], MASS(), 1e-3);
	metric('g', MASS(), 1e-3);
	add(['t', 'tonne', 'tonnes', 'metricton'], MASS(), 1e3);
	add(['lb', 'lbs', 'pound', 'pounds'], MASS(), 0.45359237);
	add(['oz', 'ounce', 'ounces'], MASS(), 0.028349523125);
	add(['st', 'stone', 'stones'], MASS(), 6.35029318);
	add(['grain', 'grains'], MASS(), 6.479891e-5);
	add(['ct', 'carat', 'carats'], MASS(), 2e-4);
	add(['slug', 'slugs'], MASS(), 14.5939029372);
	add(['ton', 'tons', 'shortton'], MASS(), 907.18474); // US
	add(['longton'], MASS(), 1016.0469088);
	add(['amu', 'dalton', 'daltons', 'Da'], MASS(), 1.6605390666e-27);

	// ===================== TIME (base s) =====================
	section('Time');
	add(['s', 'sec', 'secs', 'second', 'seconds'], TIME(), 1);
	metric('s', TIME(), 1);
	add(['ms', 'millisecond', 'milliseconds'], TIME(), 1e-3);
	add(['min', 'minute', 'minutes'], TIME(), 60);
	add(['h', 'hr', 'hrs', 'hour', 'hours'], TIME(), 3600);
	add(['day', 'days', 'd'], TIME(), 86400);
	add(['week', 'weeks', 'wk'], TIME(), 604800);
	add(['fortnight', 'fortnights'], TIME(), 1209600);
	add(['month', 'months', 'mo'], TIME(), o.monthDays * 86400);
	add(['year', 'years', 'yr', 'yrs', 'y'], TIME(), o.yearDays * 86400);
	add(['decade', 'decades'], TIME(), 10 * o.yearDays * 86400);
	add(['century', 'centuries'], TIME(), 100 * o.yearDays * 86400);
	add(['millennium', 'millennia'], TIME(), 1000 * o.yearDays * 86400);

	// ===================== FREQUENCY =====================
	section('Frequency');
	metric('Hz', FREQ, 1);
	add(['hertz'], FREQ, 1);
	add(['rpm'], FREQ, 1 / 60);
	add(['bpm'], FREQ, 1 / 60);

	// ===================== SPEED / ACCELERATION =====================
	section('Speed & acceleration');
	add(['kph', 'kmh', 'kmph'], SPEED, 1000 / 3600);
	add(['mph'], SPEED, 1609.344 / 3600);
	add(['fps'], SPEED, 0.3048);
	add(['knot', 'knots', 'kn', 'kt'], SPEED, 1852 / 3600);
	add(['mach'], SPEED, 340.29); // approx, sea level
	add(['gal_accel', 'galileo'], ACCEL, 1e-2);

	// ===================== FORCE =====================
	section('Force');
	metric('N', FORCE, 1);
	add(['newton', 'newtons'], FORCE, 1);
	add(['dyn', 'dyne', 'dynes'], FORCE, 1e-5);
	add(['lbf', 'poundforce'], FORCE, 4.4482216152605);
	add(['kgf', 'kilogramforce'], FORCE, 9.80665);
	add(['kip'], FORCE, 4448.2216152605);

	// ===================== PRESSURE =====================
	section('Pressure');
	metric('Pa', PRESSURE, 1);
	add(['pascal', 'pascals'], PRESSURE, 1);
	add(['bar', 'bars'], PRESSURE, 1e5);
	add(['mbar', 'millibar'], PRESSURE, 1e2);
	add(['atm', 'atmosphere', 'atmospheres'], PRESSURE, 101325);
	add(['psi'], PRESSURE, 6894.757293168);
	// Gauge pressure is affine: absolute = gauge + 1 atm. Absolute aliases too.
	addAffine(['barg'], PRESSURE, 1e5, 101325);
	addAffine(['psig'], PRESSURE, 6894.757293168, 101325);
	add(['bara'], PRESSURE, 1e5);
	add(['psia'], PRESSURE, 6894.757293168);
	add(['torr'], PRESSURE, 101325 / 760);
	add(['mmHg'], PRESSURE, 133.322387415);
	add(['inHg'], PRESSURE, 3386.389);

	// ===================== ENERGY =====================
	section('Energy');
	metric('J', ENERGY, 1);
	add(['joule', 'joules'], ENERGY, 1);
	add(['erg', 'ergs'], ENERGY, 1e-7);
	add(['cal', 'calorie', 'calories'], ENERGY, 4.184);
	add(['kcal', 'Cal', 'kilocalorie'], ENERGY, 4184);
	add(['eV', 'electronvolt'], ENERGY, 1.602176634e-19);
	metric('eV', ENERGY, 1.602176634e-19);
	add(['Wh', 'watthour'], ENERGY, 3600);
	add(['kWh', 'kilowatthour'], ENERGY, 3.6e6);
	add(['MWh'], ENERGY, 3.6e9);
	add(['GWh'], ENERGY, 3.6e12);
	add(['BTU', 'btu'], ENERGY, 1055.05585262);
	add(['therm', 'therms'], ENERGY, 1.05506e8);
	add(['tonTNT', 'tonsTNT'], ENERGY, 4.184e9);

	// ===================== POWER =====================
	section('Power');
	metric('W', POWER, 1);
	add(['watt', 'watts'], POWER, 1);
	add(['hp', 'horsepower'], POWER, 745.6998715822702);
	add(['PS', 'metrichorsepower'], POWER, 735.49875);

	// ===================== ELECTRICAL & MAGNETIC =====================
	section('Electrical & magnetic');
	metric('A', CUR(), 1);
	add(['amp', 'amps', 'ampere', 'amperes'], CUR(), 1);
	metric('C', CHARGE, 1);
	add(['coulomb', 'coulombs'], CHARGE, 1);
	add(['Ah', 'amphour'], CHARGE, 3600);
	add(['mAh'], CHARGE, 3.6);
	metric('V', VOLTAGE, 1);
	add(['volt', 'volts'], VOLTAGE, 1);
	metric('ohm', RESISTANCE, 1);
	add(['Ω', 'Ω', 'ohms'], RESISTANCE, 1);
	metric('S', CONDUCTANCE, 1);
	add(['siemens', 'mho'], CONDUCTANCE, 1);
	metric('F', CAPACITANCE, 1);
	add(['farad', 'farads'], CAPACITANCE, 1);
	metric('H', INDUCTANCE, 1);
	add(['henry', 'henries'], INDUCTANCE, 1);
	metric('Wb', MAGFLUX, 1);
	add(['weber', 'webers'], MAGFLUX, 1);
	metric('T', MAGFLUXDENSITY, 1);
	add(['tesla', 'teslas'], MAGFLUXDENSITY, 1);
	add(['G_gauss', 'gauss'], MAGFLUXDENSITY, 1e-4);
	// Decibels — logarithmic units, power-domain (factor 10). `dB` is a bare
	// dimensionless ratio (ref 1); `dBm`/`dBW` are absolute power levels
	// referenced to 1 mW / 1 W. Amplitude dB (dBV, factor 20) is deferred.
	addLog(['dB', 'decibel', 'decibels'], DIMLESS, 1, 10);
	addLog(['dBm'], POWER, 1e-3, 10);
	addLog(['dBW'], POWER, 1, 10);

	// ===================== TEMPERATURE (base K) =====================
	section('Temperature');
	add(['K', 'kelvin', 'kelvins'], TEMP(), 1);
	metric('K', TEMP(), 1);
	// Absolute scales are affine: K = scale·x + offset. `20 °C` → 293.15 K.
	addAffine(['°C', 'degC', 'celsius', 'Celsius'], TEMP(), 1, 273.15);
	addAffine(['°F', 'degF', 'fahrenheit', 'Fahrenheit'], TEMP(), 5 / 9, 459.67 * (5 / 9));
	// Difference units (no offset, tagged `diff`): a 1 °C step is 1 K, 1 °F is 5/9 K.
	const addDiff = (names: string[], scale: number) => {
		for (const n of names) t.set(n, { dim: TEMP(), scale, diff: true });
		emit(names[0], names.slice(1), TEMP(), scale, { kind: 'diff' });
	};
	addDiff(['deltaC', 'Cdeg', 'Δ°C', 'ΔC'], 1);
	addDiff(['deltaF', 'Fdeg', 'Δ°F', 'ΔF'], 5 / 9);
	add(['rankine', 'degR'], TEMP(), 5 / 9);

	// ===================== AMOUNT / CATALYSIS =====================
	section('Amount');
	metric('mol', AMT(), 1);
	add(['mole', 'moles'], AMT(), 1);

	// ===================== LIGHT =====================
	section('Light');
	metric('cd', LUM(), 1);
	add(['candela', 'candelas'], LUM(), 1);
	metric('lm', LUM(), 1); // lumen ≈ cd·sr (sr dimensionless)
	add(['lumen', 'lumens'], LUM(), 1);
	metric('lx', ILLUMINANCE, 1);
	add(['lux'], ILLUMINANCE, 1);

	// ===================== RADIATION =====================
	section('Radiation');
	metric('Bq', FREQ, 1);
	add(['becquerel'], FREQ, 1);
	add(['Ci', 'curie'], FREQ, 3.7e10);
	metric('Gy', DOSE, 1);
	add(['gray'], DOSE, 1);
	metric('Sv', DOSE, 1);
	add(['sievert', 'sieverts'], DOSE, 1);

	// ===================== DATA (base bit) =====================
	section('Data');
	add(['bit', 'bits', 'b'], DATA(), 1);
	add(['B', 'byte', 'bytes', 'octet', 'octets'], DATA(), 8);
	add(['nibble', 'nybble'], DATA(), 4);
	add(['word'], DATA(), 16);
	const DEC = SI_PREFIXES.filter(([, f]) => f >= 1e3);
	for (const [p, f] of DEC) {
		add([`${p}bit`, `${p}b`], DATA(), f);
		add([`${p}B`], DATA(), 8 * f);
		add([`${p.toUpperCase()}B`], DATA(), 8 * f); // KB, MB… (common capitalisation)
	}
	for (const [p, f] of BIN_PREFIXES) {
		add([`${p}bit`], DATA(), f);
		add([`${p}B`], DATA(), 8 * f);
	}
	// data-rate convenience tokens
	add(['bps'], { data: 1, time: -1 }, 1);
	add(['kbps'], { data: 1, time: -1 }, 1e3);
	add(['Mbps'], { data: 1, time: -1 }, 1e6);
	add(['Gbps'], { data: 1, time: -1 }, 1e9);

	// ===================== ANGLE (dimensionless) =====================
	section('Angle');
	add(['rad', 'radian', 'radians'], DIMLESS, 1);
	add(['deg', 'degree', 'degrees', '°'], DIMLESS, Math.PI / 180);
	add(['grad', 'gradian', 'gon'], DIMLESS, Math.PI / 200);
	add(['arcmin', 'arcminute'], DIMLESS, Math.PI / 180 / 60);
	add(['arcsec', 'arcsecond'], DIMLESS, Math.PI / 180 / 3600);
	add(['turn', 'turns', 'rev', 'revolution', 'revolutions'], DIMLESS, 2 * Math.PI);
	add(['sr', 'steradian'], DIMLESS, 1);

	// ===================== DIMENSIONLESS RATIOS =====================
	section('Ratios');
	add(['percent', '%'], DIMLESS, 0.01);
	add(['permille', '‰'], DIMLESS, 1e-3);
	add(['ppm'], DIMLESS, 1e-6);
	add(['pphm'], DIMLESS, 1e-8); // parts per hundred million
	add(['ppb'], DIMLESS, 1e-9);
	add(['ppt'], DIMLESS, 1e-12);

	// ===================== COUNTS (each name is its own base dim) =====================
	section('Counts');
	const counts: [string, string[]][] = [
		['req', ['req', 'reqs', 'request', 'requests']],
		['event', ['event', 'events', 'evt']],
		['error', ['error', 'errors', 'err']],
		['query', ['query', 'queries', 'qry']],
		['op', ['op', 'ops', 'operation', 'operations']],
		['msg', ['msg', 'msgs', 'message', 'messages']],
		['user', ['user', 'users']],
		['hit', ['hit', 'hits']],
		['item', ['item', 'items']],
		['click', ['click', 'clicks']],
		['call', ['call', 'calls']],
		['view', ['view', 'views', 'impression', 'impressions']],
		['transaction', ['transaction', 'transactions', 'txn', 'txns']],
		['packet', ['packet', 'packets', 'pkt']],
		['job', ['job', 'jobs', 'task', 'tasks']],
		['count', ['count', 'counts', 'thing', 'things', 'piece', 'pieces']]
	];
	for (const [base, names] of counts) add(names, { [base]: 1 }, 1);
	// counting multipliers (dimensionless)
	add(['dozen', 'dozens'], DIMLESS, 12);
	add(['gross'], DIMLESS, 144);
	add(['score'], DIMLESS, 20);
	add(['thousand'], DIMLESS, 1e3);
	add(['million'], DIMLESS, 1e6);
	add(['billion'], DIMLESS, 1e9);
	add(['avogadro'], DIMLESS, 6.02214076e23);

	// ===================== CURRENCY (own base dim) =====================
	section('Currency');
	add(['$', 'usd', 'USD', 'dollar', 'dollars'], { usd: 1 }, 1);
	add(['cent', 'cents'], { usd: 1 }, 0.01);
	add(['k$', 'K$'], { usd: 1 }, 1e3);
	add(['€', 'eur', 'EUR', 'euro', 'euros'], { eur: 1 }, 1);
	add(['£', 'gbp', 'GBP', 'pound_sterling'], { gbp: 1 }, 1);
	add(['¥', 'jpy', 'JPY', 'yen'], { jpy: 1 }, 1);
	add(['₹', 'inr', 'INR', 'rupee', 'rupees'], { inr: 1 }, 1);

	// ===================== CARBON (own base dim) =====================
	section('Carbon');
	add(['gCO2', 'gCO2e'], { co2: 1 }, 1);
	add(['kgCO2', 'kgCO2e'], { co2: 1 }, 1e3);
	add(['tCO2', 'tCO2e', 'tonneCO2'], { co2: 1 }, 1e6);

	// ===================== NAMED CONSTANTS =====================
	section('Constants');
	// Dimensionless math constants. `e` (Euler's number) is the standalone
	// identifier only; inside a number literal `e` is still the exponent (`2e3`).
	add(['pi', 'π'], DIMLESS, Math.PI);
	add(['tau', 'τ'], DIMLESS, 2 * Math.PI);
	add(['e', 'euler'], DIMLESS, Math.E);
	add(['c', 'lightspeed'], SPEED, 299792458);
	add(['gravity', 'g0', 'standardgravity'], ACCEL, 9.80665);
	add(['G_grav', 'gravitationalconstant'], { length: 3, mass: -1, time: -2 }, 6.6743e-11);

	return t;
}

// Default month/year convention table, for callers that don't need toggling.
export const DEFAULT_UNITS = buildUnitTable();

// Structured catalogue of every unit and named constant, in declaration order
// and grouped by section. Derived from the same `add()` calls as the lookup
// table (via the `collect` sink), so it can never list a unit the engine doesn't
// know or miss one it does. Drives the generated reference; safe for the app to
// import too (e.g. a unit picker). Entries are deduped/merged by canonical name
// within a section so a base symbol that is both `add()`ed and `metric()`-prefixed
// (e.g. `m`) appears once, carrying its aliases and the prefixable flag.
export function buildUnitCatalogue(opts: Partial<UnitTableOptions> = {}): UnitCatEntry[] {
	const raw: UnitCatEntry[] = [];
	buildUnitTable(opts, (e) => raw.push(e));
	const byKey = new Map<string, UnitCatEntry>();
	const order: string[] = [];
	for (const e of raw) {
		const key = `${e.category} ${e.canonical}`;
		const prev = byKey.get(key);
		if (!prev) {
			byKey.set(key, { ...e, aliases: [...e.aliases] });
			order.push(key);
			continue;
		}
		for (const a of e.aliases) if (!prev.aliases.includes(a)) prev.aliases.push(a);
		prev.prefixed = prev.prefixed || e.prefixed;
		prev.kind = prev.kind ?? e.kind;
	}
	return order.map((k) => byKey.get(k) as UnitCatEntry);
}

export const UNIT_CATALOGUE = buildUnitCatalogue();

export function lookupUnit(table: Map<string, UnitDef>, name: string): UnitDef | undefined {
	return table.get(name);
}

export function isUnit(table: Map<string, UnitDef>, name: string): boolean {
	return table.has(name);
}
