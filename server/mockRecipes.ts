// Mock recipe data for development when Spoonacular API is unavailable
export const mockRecipes = [
  {
    id: 641223,
    title: "Mediterranean Quinoa Bowl with Roasted Vegetables",
    image: "https://img.spoonacular.com/recipes/641223-556x370.jpg",
    readyInMinutes: 35,
    servings: 4,
    summary: "A healthy and colorful Mediterranean-inspired quinoa bowl packed with roasted vegetables, fresh herbs, and a tangy lemon dressing.",
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Preheat oven to 425°F (220°C)." },
        { number: 2, step: "Rinse quinoa and cook according to package instructions." },
        { number: 3, step: "Cut vegetables into bite-sized pieces and toss with olive oil, salt, and pepper." },
        { number: 4, step: "Roast vegetables for 20-25 minutes until tender and lightly caramelized." },
        { number: 5, step: "Whisk together lemon juice, olive oil, and herbs for dressing." },
        { number: 6, step: "Serve quinoa topped with roasted vegetables and drizzle with dressing." }
      ]
    }],
    extendedIngredients: [
      { id: 20035, name: "quinoa", amount: 1, unit: "cup", aisle: "Grain" },
      { id: 11821, name: "bell peppers", amount: 2, unit: "medium", aisle: "Produce" },
      { id: 11507, name: "sweet potato", amount: 1, unit: "large", aisle: "Produce" },
      { id: 11583, name: "red onion", amount: 0.5, unit: "medium", aisle: "Produce" },
      { id: 4053, name: "olive oil", amount: 3, unit: "tablespoons", aisle: "Oil, Vinegar, Salad Dressing" },
      { id: 9152, name: "lemon juice", amount: 2, unit: "tablespoons", aisle: "Produce" }
    ],
    nutrition: {
      nutrients: [
        { name: "Calories", amount: 320, unit: "kcal" },
        { name: "Carbohydrates", amount: 52, unit: "g" },
        { name: "Fat", amount: 8, unit: "g" },
        { name: "Protein", amount: 12, unit: "g" },
        { name: "Fiber", amount: 6, unit: "g" },
        { name: "Sugar", amount: 8, unit: "g" },
        { name: "Sodium", amount: 180, unit: "mg" }
      ]
    }
  },
  {
    id: 715437,
    title: "Creamy Mushroom Risotto",
    image: "https://img.spoonacular.com/recipes/715437-556x370.jpg",
    readyInMinutes: 45,
    servings: 4,
    summary: "A rich and creamy risotto made with mixed mushrooms, arborio rice, and parmesan cheese. Perfect comfort food for any occasion.",
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Heat vegetable broth in a saucepan and keep warm." },
        { number: 2, step: "Sauté mushrooms in butter until golden brown. Set aside." },
        { number: 3, step: "In the same pan, cook onion until translucent." },
        { number: 4, step: "Add arborio rice and stir for 2 minutes until lightly toasted." },
        { number: 5, step: "Add white wine and stir until absorbed." },
        { number: 6, step: "Add warm broth one ladle at a time, stirring constantly." },
        { number: 7, step: "Continue until rice is creamy and tender, about 20 minutes." },
        { number: 8, step: "Stir in mushrooms, parmesan, and butter. Season with salt and pepper." }
      ]
    }],
    extendedIngredients: [
      { id: 20040, name: "arborio rice", amount: 1.5, unit: "cups", aisle: "Grain" },
      { id: 11260, name: "mixed mushrooms", amount: 8, unit: "oz", aisle: "Produce" },
      { id: 6194, name: "vegetable broth", amount: 4, unit: "cups", aisle: "Canned and Jarred" },
      { id: 1033, name: "parmesan cheese", amount: 0.666667, unit: "cup", aisle: "Cheese" },
      { id: 11282, name: "onion", amount: 1, unit: "medium", aisle: "Produce" },
      { id: 14106, name: "white wine", amount: 0.25, unit: "cup", aisle: "Alcoholic Beverages" }
    ],
    nutrition: {
      nutrients: [
        { name: "Calories", amount: 380, unit: "kcal" },
        { name: "Carbohydrates", amount: 58, unit: "g" },
        { name: "Fat", amount: 12, unit: "g" },
        { name: "Protein", amount: 14, unit: "g" },
        { name: "Fiber", amount: 3, unit: "g" },
        { name: "Sugar", amount: 4, unit: "g" },
        { name: "Sodium", amount: 420, unit: "mg" }
      ]
    }
  },
  {
    id: 633091,
    title: "Asian-Style Sesame Ginger Salmon",
    image: "https://img.spoonacular.com/recipes/633091-556x370.jpg",
    readyInMinutes: 25,
    servings: 4,
    summary: "Tender salmon fillets glazed with a sweet and savory sesame ginger sauce, served with steamed vegetables.",
    analyzedInstructions: [{
      steps: [
        { number: 1, step: "Preheat oven to 400°F (200°C)." },
        { number: 2, step: "Mix soy sauce, honey, sesame oil, ginger, and garlic for glaze." },
        { number: 3, step: "Place salmon fillets on lined baking sheet." },
        { number: 4, step: "Brush salmon with half of the glaze." },
        { number: 5, step: "Bake for 12-15 minutes until fish flakes easily." },
        { number: 6, step: "Brush with remaining glaze and sprinkle with sesame seeds." },
        { number: 7, step: "Serve with steamed broccoli and rice." }
      ]
    }],
    extendedIngredients: [
      { id: 15076, name: "salmon fillets", amount: 4, unit: "pieces", aisle: "Seafood" },
      { id: 16124, name: "soy sauce", amount: 3, unit: "tablespoons", aisle: "Ethnic Foods" },
      { id: 19296, name: "honey", amount: 2, unit: "tablespoons", aisle: "Baking" },
      { id: 4058, name: "sesame oil", amount: 1, unit: "tablespoon", aisle: "Ethnic Foods" },
      { id: 11216, name: "fresh ginger", amount: 1, unit: "tablespoon", aisle: "Produce" },
      { id: 12023, name: "sesame seeds", amount: 1, unit: "tablespoon", aisle: "Baking" }
    ],
    nutrition: {
      nutrients: [
        { name: "Calories", amount: 280, unit: "kcal" },
        { name: "Carbohydrates", amount: 12, unit: "g" },
        { name: "Fat", amount: 16, unit: "g" },
        { name: "Protein", amount: 26, unit: "g" },
        { name: "Fiber", amount: 1, unit: "g" },
        { name: "Sugar", amount: 10, unit: "g" },
        { name: "Sodium", amount: 680, unit: "mg" }
      ]
    }
  }
];

export function getRandomMockRecipes(count: number = 10): typeof mockRecipes {
  const shuffled = [...mockRecipes].sort(() => 0.5 - Math.random());
  const repeated = [];
  
  for (let i = 0; i < count; i++) {
    const recipe = shuffled[i % shuffled.length];
    // Create unique IDs for repeated recipes
    repeated.push({
      ...recipe,
      id: recipe.id + (Math.floor(i / shuffled.length) * 1000)
    });
  }
  
  return repeated;
}