import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

// Registers the "Inter" and "Fredoka" families; styles reference them by name.
loadInter("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
loadFredoka("normal", { weights: ["700"], subsets: ["latin"] });
