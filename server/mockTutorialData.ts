// Mock data for onboarding tutorials

export const mockCookbookRecipes = [
  {
    id: "recipe_tutorial_1",
    spoonacularId: 999001,
    title: "Classic Spaghetti Carbonara",
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=312&h=231&fit=crop",
    readyInMinutes: 20,
    servings: 4,
    summary: "A classic Italian pasta dish with eggs, cheese, and pancetta.",
    instructions: [
      "Cook spaghetti in salted boiling water until al dente",
      "Fry pancetta until crispy",
      "Whisk eggs with Parmesan cheese",
      "Combine hot pasta with pancetta and egg mixture",
      "Serve immediately with black pepper"
    ],
    ingredients: [
      { id: 1, name: "spaghetti", amount: 400, unit: "g", aisle: "Pasta and Rice" },
      { id: 2, name: "pancetta", amount: 150, unit: "g", aisle: "Meat" },
      { id: 3, name: "eggs", amount: 3, unit: "large", aisle: "Dairy" },
      { id: 4, name: "parmesan cheese", amount: 100, unit: "g", aisle: "Dairy" },
      { id: 5, name: "black pepper", amount: 1, unit: "tsp", aisle: "Spices and Seasonings" }
    ],
    nutrition: {
      calories: 520,
      carbohydrates: 45,
      fat: 28,
      protein: 24,
      fiber: 2,
      sugar: 3,
      sodium: 680,
      cholesterol: 185,
      saturatedFat: 12
    }
  },
  {
    id: "recipe_tutorial_2",
    spoonacularId: 999002,
    title: "Chicken Caesar Salad",
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=312&h=231&fit=crop",
    readyInMinutes: 15,
    servings: 2,
    summary: "Fresh romaine lettuce with grilled chicken, croutons, and Caesar dressing.",
    instructions: [
      "Grill chicken breast and slice",
      "Wash and chop romaine lettuce",
      "Make Caesar dressing with anchovy paste",
      "Toast bread cubes for croutons",
      "Assemble salad and top with parmesan"
    ],
    ingredients: [
      { id: 6, name: "chicken breast", amount: 300, unit: "g", aisle: "Meat" },
      { id: 7, name: "romaine lettuce", amount: 2, unit: "heads", aisle: "Produce" },
      { id: 8, name: "bread", amount: 4, unit: "slices", aisle: "Bakery" },
      { id: 9, name: "parmesan cheese", amount: 50, unit: "g", aisle: "Dairy" },
      { id: 10, name: "anchovy paste", amount: 1, unit: "tbsp", aisle: "Condiments" }
    ],
    nutrition: {
      calories: 380,
      carbohydrates: 18,
      fat: 22,
      protein: 32,
      fiber: 4,
      sugar: 6,
      sodium: 890,
      cholesterol: 95,
      saturatedFat: 6
    }
  }
];

export const mockShoppingListItems = [
  // From Carbonara recipe
  { id: "tutorial_item_1", name: "spaghetti", amount: "400 g", aisle: "Pasta and Rice", checked: false, recipeId: "recipe_tutorial_1" },
  { id: "tutorial_item_2", name: "pancetta", amount: "150 g", aisle: "Meat", checked: false, recipeId: "recipe_tutorial_1" },
  { id: "tutorial_item_3", name: "eggs", amount: "3 large", aisle: "Dairy", checked: false, recipeId: "recipe_tutorial_1" },
  { id: "tutorial_item_4", name: "parmesan cheese", amount: "150 g", aisle: "Dairy", checked: false, recipeId: "recipe_tutorial_1" },
  { id: "tutorial_item_5", name: "black pepper", amount: "1 tsp", aisle: "Spices and Seasonings", checked: false, recipeId: "recipe_tutorial_1" },
  
  // From Caesar Salad recipe
  { id: "tutorial_item_6", name: "chicken breast", amount: "300 g", aisle: "Meat", checked: false, recipeId: "recipe_tutorial_2" },
  { id: "tutorial_item_7", name: "romaine lettuce", amount: "2 heads", aisle: "Produce", checked: false, recipeId: "recipe_tutorial_2" },
  { id: "tutorial_item_8", name: "bread", amount: "4 slices", aisle: "Bakery", checked: false, recipeId: "recipe_tutorial_2" },
  { id: "tutorial_item_9", name: "anchovy paste", amount: "1 tbsp", aisle: "Condiments", checked: false, recipeId: "recipe_tutorial_2" },
];