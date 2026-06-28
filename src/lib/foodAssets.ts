import heroPasta from "@/assets/hero-pasta.jpg";
import sourdough from "@/assets/recipe-sourdough.jpg";
import pesto from "@/assets/recipe-pesto.jpg";
import salad from "@/assets/recipe-salad.jpg";
import chocolate from "@/assets/recipe-chocolate.jpg";
import croissant from "@/assets/recipe-croissant.jpg";
import carbonara from "@/assets/recipe-carbonara.jpg";
import elena from "@/assets/creator-elena.jpg";
import david from "@/assets/creator-david.jpg";
import marie from "@/assets/creator-marie.jpg";
import sarah from "@/assets/creator-sarah.jpg";

const recipeImages: Record<string, string> = {
  heroPasta,
  sourdough,
  pesto,
  salad,
  chocolate,
  croissant,
  carbonara,
};

const chefImages: Record<string, string> = {
  elena,
  david,
  marie,
  sarah,
};

export function recipeImage(imageKey?: string) {
  return imageKey ? recipeImages[imageKey] ?? heroPasta : heroPasta;
}

export function chefAvatar(avatarKey?: string) {
  return avatarKey ? chefImages[avatarKey] ?? elena : elena;
}
