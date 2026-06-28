import heroPasta from "@/assets/hero-pasta.jpg";
import sourdough from "@/assets/recipe-sourdough.jpg";
import pesto from "@/assets/recipe-pesto.jpg";
import salad from "@/assets/recipe-salad.jpg";
import chocolate from "@/assets/recipe-chocolate.jpg";
import croissant from "@/assets/recipe-croissant.jpg";
import carbonara from "@/assets/recipe-carbonara.jpg";
import blogJournal from "@/assets/blog-journal.jpg";
import ceramics from "@/assets/sponsored-ceramics.jpg";
import elena from "@/assets/creator-elena.jpg";
import david from "@/assets/creator-david.jpg";
import marie from "@/assets/creator-marie.jpg";
import sarah from "@/assets/creator-sarah.jpg";

export type Creator = {
  username: string;
  name: string;
  avatar: string;
  handle: string;
  bio: string;
  followers: number;
  following: number;
};

export type Recipe = {
  id: string;
  title: string;
  image: string;
  imageUrl?: string | null;
  imageKey?: string;
  creator: Creator;
  rating: number;
  reviews: number;
  prepTime: string;
  cookTime: string;
  servings: number;
  difficulty: "Easy" | "Intermediate" | "Advanced" | string;
  category: string;
  cuisine?: string;
  diet?: string;
  tags: string[];
  description: string;
  ingredients: { qty: string; item: string }[];
  steps: string[];
  userId?: string;
  likesCount?: number;
  commentCount?: number;
  createdAt?: string;
  deletedAt?: string | null;
};

export type Blog = {
  id: string;
  title: string;
  image: string;
  creator: Creator;
  tag: string;
  readTime: string;
  excerpt: string;
  content: string[];
};

export const creators: Creator[] = [
  { username: "elena", name: "Elena Rossi", avatar: elena, handle: "@elenarossi", bio: "Third-generation Italian home cook. Pasta, patience, and grandma's secrets.", followers: 24800, following: 312 },
  { username: "david", name: "David Wu", avatar: david, handle: "@davidferments", bio: "Modern fermentation, ancient flavors. Based in Brooklyn.", followers: 12400, following: 198 },
  { username: "marie", name: "Nonna Marie", avatar: marie, handle: "@nonnamarie", bio: "Sixty years at the same wooden table. Bread, biscuits, and stories.", followers: 41200, following: 86 },
  { username: "sarah", name: "Sarah Chen", avatar: sarah, handle: "@sarahcooks", bio: "Plant-forward weeknight dinners that don't feel like a compromise.", followers: 18300, following: 504 },
];

export const categories = [
  "For You", "Breakfast", "Lunch", "Dinner", "Desserts",
  "Vegan", "Healthy", "Quick Meals", "Baking", "Cultural Cuisines",
];

export const featured: Recipe = {
  id: "smoky-arrabbiata",
  title: "Smoky Arrabbiata with Burnt Garlic",
  image: heroPasta,
  creator: creators[0],
  rating: 4.9,
  reviews: 312,
  prepTime: "10 min",
  cookTime: "25 min",
  servings: 4,
  difficulty: "Easy",
  category: "Dinner",
  tags: ["Pasta", "Italian", "Spicy", "Weeknight"],
  description: "A loud, fragrant Roman classic given a modern, smoky twist with charred garlic and a whisper of pimentón.",
  ingredients: [
    { qty: "400g", item: "bronze-cut spaghetti" },
    { qty: "6", item: "garlic cloves, lightly crushed" },
    { qty: "2 tsp", item: "calabrian chili flakes" },
    { qty: "1 can", item: "San Marzano tomatoes" },
    { qty: "1/4 cup", item: "extra virgin olive oil" },
    { qty: "to taste", item: "sea salt and fresh basil" },
  ],
  steps: [
    "Bring a large pot of well-salted water to the boil for the pasta.",
    "Warm olive oil with the crushed garlic in a wide pan over medium-low heat until deeply golden — almost burnt at the edges.",
    "Add the chili flakes, swirl for 20 seconds, then crush in the tomatoes by hand. Simmer 12 minutes.",
    "Cook the pasta one minute shy of al dente, then finish in the sauce with a splash of pasta water.",
    "Toss until glossy. Tear over basil, drizzle with raw oil, and serve immediately.",
  ],
};

export const recipes: Recipe[] = [
  featured,
  {
    id: "salted-honey-sourdough",
    title: "Salted Honey Sourdough",
    image: sourdough,
    creator: creators[2],
    rating: 4.9,
    reviews: 824,
    prepTime: "30 min",
    cookTime: "45 min",
    servings: 8,
    difficulty: "Intermediate",
    category: "Baking",
    tags: ["Bread", "Sourdough", "Weekend"],
    description: "A tender, honey-kissed crumb with a deeply blistered crust — the loaf that built our weekend ritual.",
    ingredients: [
      { qty: "500g", item: "bread flour" },
      { qty: "350g", item: "warm water" },
      { qty: "100g", item: "active sourdough starter" },
      { qty: "2 tbsp", item: "raw honey" },
      { qty: "10g", item: "fine sea salt" },
      { qty: "to finish", item: "flaky salt" },
    ],
    steps: [
      "Mix flour, water, starter, and honey. Rest 45 minutes (autolyse).",
      "Add salt, perform four sets of stretch and folds 30 minutes apart.",
      "Bulk ferment until risen 50%. Shape, then cold proof overnight.",
      "Bake at 240°C in a covered Dutch oven for 25 minutes, then uncovered for 20.",
      "Cool completely on a rack. Top with flaky salt. Resist slicing for at least an hour.",
    ],
  },
  {
    id: "walnut-basil-pesto",
    title: "Walnut & Basil Summer Pesto",
    image: pesto,
    creator: creators[0],
    rating: 4.8,
    reviews: 210,
    prepTime: "10 min",
    cookTime: "12 min",
    servings: 4,
    difficulty: "Easy",
    category: "Quick Meals",
    tags: ["Pasta", "Vegetarian", "Summer"],
    description: "Toasted walnuts and lemon zest brighten a classic pesto into a 20-minute weeknight hero.",
    ingredients: [
      { qty: "80g", item: "fresh basil leaves" },
      { qty: "60g", item: "toasted walnuts" },
      { qty: "50g", item: "parmesan, grated" },
      { qty: "1", item: "garlic clove" },
      { qty: "120ml", item: "extra virgin olive oil" },
      { qty: "1", item: "lemon, zested" },
    ],
    steps: [
      "Pulse basil, walnuts, parmesan, and garlic in a food processor.",
      "Stream in olive oil with the motor running until silky.",
      "Finish with lemon zest and a pinch of salt. Loosen with pasta water to serve.",
    ],
  },
  {
    id: "edible-flower-salad",
    title: "Early Spring Harvest Bowl",
    image: salad,
    creator: creators[3],
    rating: 4.7,
    reviews: 96,
    prepTime: "15 min",
    cookTime: "0 min",
    servings: 2,
    difficulty: "Easy",
    category: "Healthy",
    tags: ["Vegan", "Salad", "Spring"],
    description: "Edible flowers, shaved radish, and a champagne vinaigrette — pure season on a plate.",
    ingredients: [
      { qty: "2 handfuls", item: "mixed baby greens" },
      { qty: "6", item: "breakfast radishes, shaved" },
      { qty: "1/2 cup", item: "edible flowers (pansy, marigold)" },
      { qty: "2 tbsp", item: "champagne vinegar" },
      { qty: "4 tbsp", item: "cold-pressed olive oil" },
    ],
    steps: [
      "Whisk vinegar and olive oil with a pinch of salt.",
      "Lay greens loosely in a bowl, scatter radish coins, dress lightly.",
      "Crown with edible flowers just before serving.",
    ],
  },
  {
    id: "midnight-mousse",
    title: "Midnight Cocoa Mousse",
    image: chocolate,
    creator: creators[1],
    rating: 4.9,
    reviews: 433,
    prepTime: "20 min",
    cookTime: "0 min",
    servings: 6,
    difficulty: "Intermediate",
    category: "Desserts",
    tags: ["Chocolate", "Make-ahead"],
    description: "A bittersweet, two-bowl mousse that sets in three hours and disappears in three minutes.",
    ingredients: [
      { qty: "200g", item: "70% dark chocolate" },
      { qty: "4", item: "large eggs, separated" },
      { qty: "60g", item: "caster sugar" },
      { qty: "pinch", item: "flaky salt" },
    ],
    steps: [
      "Melt chocolate gently over a bain-marie. Cool slightly.",
      "Whisk yolks with half the sugar until pale; whip whites with the rest to soft peaks.",
      "Fold yolks into chocolate, then the whites in three additions. Chill 3 hours.",
    ],
  },
  {
    id: "lamination-croissant",
    title: "72-Hour Laminated Croissants",
    image: croissant,
    creator: creators[2],
    rating: 4.8,
    reviews: 178,
    prepTime: "3 days",
    cookTime: "20 min",
    servings: 12,
    difficulty: "Advanced",
    category: "Baking",
    tags: ["Pastry", "Patience"],
    description: "Three days, three folds, and the most honey-coloured laminated layers you'll ever see at home.",
    ingredients: [
      { qty: "500g", item: "T55 flour" },
      { qty: "300ml", item: "cold milk" },
      { qty: "50g", item: "sugar" },
      { qty: "10g", item: "salt" },
      { qty: "250g", item: "European butter, cold" },
    ],
    steps: [
      "Day 1: Mix dough, chill overnight.",
      "Day 2: Encase butter block, perform three single folds with 1-hour rests.",
      "Day 3: Shape, proof 2 hours, egg wash, bake at 200°C for 18-20 minutes.",
    ],
  },
  {
    id: "lemon-pea-carbonara",
    title: "Lemon-Pea Carbonara",
    image: carbonara,
    creator: creators[3],
    rating: 4.9,
    reviews: 240,
    prepTime: "5 min",
    cookTime: "15 min",
    servings: 2,
    difficulty: "Easy",
    category: "Quick Meals",
    tags: ["Pasta", "Spring", "20-min"],
    description: "A bright, peppery carbonara that swaps guanciale for sweet peas. Done in 20.",
    ingredients: [
      { qty: "200g", item: "rigatoni" },
      { qty: "1 cup", item: "fresh peas" },
      { qty: "2", item: "egg yolks" },
      { qty: "50g", item: "pecorino, grated" },
      { qty: "1", item: "lemon, zested" },
      { qty: "to taste", item: "black pepper" },
    ],
    steps: [
      "Cook pasta in salted water, adding peas in the last minute.",
      "Whisk yolks with pecorino, lemon zest, and pepper.",
      "Off the heat, toss pasta with the egg mixture and a splash of pasta water until silky.",
    ],
  },
];

export const blogs: Blog[] = [
  {
    id: "handwritten-journals",
    title: "Why we still cook from hand-written journals",
    image: blogJournal,
    creator: creators[1],
    tag: "Kitchen Rituals",
    readTime: "6 min read",
    excerpt: "In a digital world, the smudge of oil on a recipe page tells a story that pixels never can.",
    content: [
      "There is a particular page in my grandmother's recipe journal — somewhere around the middle, where the spine has loosened from years of being folded open — that I can find with my eyes closed. It's the page for her tomato sauce. The corner is darkened by olive oil. There's a brown crescent where a coffee cup once rested. Her handwriting wavers slightly in two places, where she went back years later and corrected the salt.",
      "No app has ever made me feel the way that page does. No glowing screen can hold a fingerprint.",
      "I think about this often, in a season when our kitchens have become extensions of our phones. We pin, we save, we screenshot. But when I want to cook something I actually love, I still reach for the journal on the shelf above the stove — the one with the cracked leather cover and the ribbon I keep meaning to replace.",
      "The journal is a slower medium. It demands that I write things down before I cook them, which means I have to understand them first. It records not the recipe I was sent, but the recipe I made — with the substitutions, the timing notes, the little stars next to the version my partner liked best.",
      "Start one this weekend. Any notebook will do. The first stain is the hardest. After that, it just becomes a record of your life through the things you fed the people you love.",
    ],
  },
  {
    id: "flavor-journal",
    title: "Keeping a flavor journal changed how I cook",
    image: salad,
    creator: creators[3],
    tag: "Craft",
    readTime: "4 min read",
    excerpt: "After five years in professional kitchens, the one tool I take everywhere isn't a knife — it's a small Moleskine.",
    content: [
      "Flavor is a vocabulary. The more words you have for it, the more precisely you can speak it back into a dish.",
      "I started writing down what I tasted — at restaurants, at markets, at my own stove — about three years into cooking professionally. It changed everything about how I built menus.",
      "Try this for a week: every time you eat something memorable, write three words. Not 'good.' Three real words. 'Charred, citric, mineral.' 'Buttery, dusty, slow.' The exercise teaches your palate to listen.",
    ],
  },
  {
    id: "slow-sunday-supper",
    title: "The art of the slow Sunday supper",
    image: heroPasta,
    creator: creators[0],
    tag: "Gathering",
    readTime: "8 min read",
    excerpt: "What if the meal isn't the point — what if it's the four hours it takes to get there?",
    content: [
      "Sunday supper, in my family, was never a meal you arrived at. It was a meal you assembled, slowly, in shifts, in the kitchen, with whoever happened to be there.",
      "Someone always peeled the garlic. Someone always set the table wrong. Someone always brought a wine no one liked. It was perfect.",
      "Start with one dish that takes longer than it should. Invite people earlier than the food will be ready. Let them stand in the kitchen with you. That's the meal.",
    ],
  },
];

export const sponsored = {
  label: "Kitchen Find",
  title: "The Ceramic Series",
  copy: "Elevate your plating with handcrafted stoneware. Community members get 15% off today.",
  image: ceramics,
  cta: "Shop the Collection",
};

export function findRecipe(id: string) {
  return recipes.find((r) => r.id === id);
}
export function findBlog(id: string) {
  return blogs.find((b) => b.id === id);
}
export function findCreator(username: string) {
  return creators.find((c) => c.username === username);
}
