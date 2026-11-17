import type { PageServerLoad } from "./$types";
import { getCurrentIntensity, getCurrentGeneration } from "#lib/api/client.ts";

export const load: PageServerLoad = async () => {
	const [intensity, generation] = await Promise.all([
		getCurrentIntensity(fetch),
		getCurrentGeneration(fetch)
	])

	return { intensity, generation }
}
