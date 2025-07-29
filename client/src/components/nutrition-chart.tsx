import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NutritionData {
  calories: number;
  carbohydrates: number;
  fat: number;
  protein: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
  saturatedFat: number;
}

interface NutritionChartProps {
  nutrition: NutritionData;
  servings?: number;
}

export default function NutritionChart({ nutrition, servings = 1 }: NutritionChartProps) {
  // Calculate per-serving values
  const perServing = {
    calories: Math.round(nutrition.calories / servings),
    carbohydrates: Math.round((nutrition.carbohydrates / servings) * 10) / 10,
    fat: Math.round((nutrition.fat / servings) * 10) / 10,
    protein: Math.round((nutrition.protein / servings) * 10) / 10,
    fiber: Math.round((nutrition.fiber / servings) * 10) / 10,
    sugar: Math.round((nutrition.sugar / servings) * 10) / 10,
    sodium: Math.round(nutrition.sodium / servings),
    cholesterol: Math.round(nutrition.cholesterol / servings),
    saturatedFat: Math.round((nutrition.saturatedFat / servings) * 10) / 10,
  };

  // Macronutrient data for pie chart
  const macroData = [
    { name: 'Carbs', value: perServing.carbohydrates, color: '#8884d8', unit: 'g' },
    { name: 'Fat', value: perServing.fat, color: '#82ca9d', unit: 'g' },
    { name: 'Protein', value: perServing.protein, color: '#ffc658', unit: 'g' },
  ].filter(item => item.value > 0);

  // Micronutrient data for bar chart
  const microData = [
    { name: 'Fiber', value: perServing.fiber, unit: 'g', color: '#8dd1e1' },
    { name: 'Sugar', value: perServing.sugar, unit: 'g', color: '#d084d0' },
    { name: 'Sodium', value: perServing.sodium, unit: 'mg', color: '#ffb347' },
    { name: 'Cholesterol', value: perServing.cholesterol, unit: 'mg', color: '#ff7f7f' },
    { name: 'Saturated Fat', value: perServing.saturatedFat, unit: 'g', color: '#87ceeb' },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-300">
            {data.value}{data.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!nutrition || perServing.calories === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nutrition Information</CardTitle>
          <CardDescription>No nutrition data available for this recipe</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition Information</CardTitle>
        <CardDescription>Per serving nutrition breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="macros">Macros</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">{perServing.calories}</div>
                <div className="text-sm text-muted-foreground">Calories</div>
              </div>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <div className="text-xl font-semibold">{servings}</div>
                <div className="text-sm text-muted-foreground">Servings</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-600">{perServing.carbohydrates}g</div>
                <div className="text-xs text-muted-foreground">Carbs</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">{perServing.fat}g</div>
                <div className="text-xs text-muted-foreground">Fat</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-600">{perServing.protein}g</div>
                <div className="text-xs text-muted-foreground">Protein</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="macros" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={macroData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, value, unit}) => `${name}: ${value}${unit}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {macroData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={microData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              {microData.map((item) => (
                <div key={item.name} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span>{item.name}</span>
                  <span className="font-medium">{item.value}{item.unit}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}