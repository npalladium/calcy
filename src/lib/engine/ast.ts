// Pretty-print a parsed AST back to a one-line s-expr-like form so it
// renders readably in the gutter next to each line. The grammar isn't
// 1:1 with source (e.g. bare units become idents, `to`/`in`/`about`
// collapse to `ci`/`convert`), and that's the point — this is what the
// engine actually evaluated.

import type { Node } from './parse';

export function astText(node: Node): string {
	switch (node.type) {
		case 'num':
			return Number.isInteger(node.value) ? String(node.value) : String(node.value);
		case 'ident':
			return node.name;
		case 'neg':
			return `(- ${astText(node.operand)})`;
		case 'bin':
			return `(${node.op} ${astText(node.left)} ${astText(node.right)})`;
		case 'ci': {
			const pct =
				node.loP != null && node.hiP != null ? ` @${node.loP * 100}/${node.hiP * 100}` : '';
			return `(ci ${astText(node.lo)} ${astText(node.hi)}${pct})`;
		}
		case 'given':
			return `(given ${astText(node.body)} ${astText(node.pred)})`;
		case 'where': {
			const binds = node.bindings.map((b) => `${b.name}=${astText(b.value)}`).join(' ');
			return `(where ${astText(node.body)} ${binds})`;
		}
		case 'convert':
			return `(convert ${astText(node.expr)} ${node.unitText}${node.via ? ` via ${node.via}` : ''})`;
		case 'call': {
			const args = node.args
				.map((a) => {
					if (a.weight && a.value) return `${astText(a.weight)}: ${astText(a.value)}`;
					if (a.weight) return `${astText(a.weight)}:`;
					if (a.name && a.value) return `${a.name}=${astText(a.value)}`;
					if (a.value) return astText(a.value);
					return '?';
				})
				.join(' ');
			return `(${node.name}${args ? ` ${args}` : ''})`;
		}
		case 'list':
			return `[${node.items.map(astText).join(' ')}]`;
		case 'range': {
			const step = node.step ? ` ${astText(node.step)}` : '';
			return `(range ${astText(node.lo)} ${astText(node.hi)}${step})`;
		}
		case 'scenario': {
			const coords = node.coords.map((c) => `${c.label}: ${astText(c.value)}`).join(' ');
			return `(scenario[${node.axis}] ${coords})`;
		}
		case 'str':
			return JSON.stringify(node.value);
	}
}
