// Engine worker: owns evaluation off the main thread. Holds one Engine
// instance; rebuilds it only when options/custom units change so accumulate()
// and statsTable() can reuse the sample arrays from the last eval.

import { Engine, type EngineOptions, type RatePeriod } from './index';

type Req =
	| {
			type: 'eval';
			id: number;
			text: string;
			opts: Partial<EngineOptions>;
			customUnits: Record<string, string>;
	  }
	| {
			type: 'accumulate';
			id: number;
			lineIndex: number;
			period: RatePeriod;
			count: number;
			growth?: number;
	  }
	| { type: 'stats'; id: number; lineIndex: number }
	| { type: 'sensitivity'; id: number; lineIndex: number }
	| { type: 'unitNames'; id: number };

let engine = new Engine();
let lastKey = '';

function ensureEngine(opts: Partial<EngineOptions>, customUnits: Record<string, string>) {
	const key = JSON.stringify({ opts, customUnits });
	if (key !== lastKey) {
		engine = new Engine(opts, customUnits);
		lastKey = key;
	}
	return engine;
}

self.onmessage = (e: MessageEvent<Req>) => {
	const msg = e.data;
	try {
		switch (msg.type) {
			case 'eval': {
				const eng = ensureEngine(msg.opts, msg.customUnits);
				const result = eng.evalSheet(msg.text);
				(self as unknown as Worker).postMessage({ id: msg.id, result });
				break;
			}
			case 'accumulate': {
				const display = engine.accumulate(msg.lineIndex, msg.period, msg.count, msg.growth ?? 0);
				(self as unknown as Worker).postMessage({ id: msg.id, display });
				break;
			}
			case 'stats': {
				const rows = engine.statsTable(msg.lineIndex);
				(self as unknown as Worker).postMessage({ id: msg.id, rows });
				break;
			}
			case 'sensitivity': {
				const entries = engine.sensitivity(msg.lineIndex);
				(self as unknown as Worker).postMessage({ id: msg.id, entries });
				break;
			}
			case 'unitNames': {
				const names = [...engine.units.keys()];
				(self as unknown as Worker).postMessage({ id: msg.id, names });
				break;
			}
		}
	} catch (err) {
		(self as unknown as Worker).postMessage({
			id: msg.id,
			error: err instanceof Error ? err.message : String(err)
		});
	}
};
