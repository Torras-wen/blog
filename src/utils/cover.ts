// Deterministic, "designed-looking" cover art generator.
// Given a stable seed (e.g. a post slug) it returns a warm mesh-gradient
// background plus a geometric variant, so every post gets a unique but
// on-brand cover without relying on stock photography.

export interface Cover {
	/** CSS value for `background` — a layered mesh gradient. */
	background: string;
	/** Base hue, used for the solid fallback color behind the mesh. */
	hue: number;
	/** Geometry variant 0–3. */
	variant: number;
	/** Stable unique id, handy for SVG pattern ids. */
	uid: string;
}

// Warm, on-brand recipes (hue anchored around the terracotta accent).
const RECIPES = [
	{ base: 12, spread: 18 }, // terracotta → coral
	{ base: 350, spread: 16 }, // rose
	{ base: 26, spread: 16 }, // amber
	{ base: 4, spread: 16 }, // red clay
	{ base: 336, spread: 18 }, // berry / magenta
	{ base: 32, spread: 14 }, // warm gold
];

/** FNV-1a hash — deterministic across SSR/build. */
export function hashString(str: string): number {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function cover(seed: string): Cover {
	const h = hashString(seed);
	const recipe = RECIPES[h % RECIPES.length];
	const variant = Math.floor(h / 7) % 4;
	const { base, spread } = recipe;

	// Four balanced anchors keep the mesh filling the frame evenly,
	// with a small deterministic jitter so each cover feels distinct.
	const anchors = [
		[20, 24],
		[80, 18],
		[22, 80],
		[82, 72],
	];
	const hues = [base - spread, base - spread * 0.2, base + spread * 0.5, base + spread];
	const sats = [80, 86, 72, 64];
	const lums = [62, 58, 52, 47];

	const layers = anchors.map((a, i) => {
		const jx = ((h >> (i * 3)) % 13) - 6;
		const jy = ((h >> (i * 3 + 2)) % 13) - 6;
		const x = a[0] + jx;
		const y = a[1] + jy;
		const hue = (((hues[i] % 360) + 360) % 360).toFixed(0);
		return `radial-gradient(circle at ${x}% ${y}%, hsla(${hue}, ${sats[i]}%, ${lums[i]}%, 0.92) 0%, transparent 52%)`;
	});

	return {
		background: layers.join(', '),
		hue: ((base % 360) + 360) % 360,
		variant,
		uid: h.toString(36),
	};
}
