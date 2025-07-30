import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatQuantity } from "@/lib/utils";
import { ShoppingCart, Trash2 } from "lucide-react";

interface ShoppingListItem {
  id: string;
  userId: string;
  name: string;
  amount: string | null;
  aisle: string;
  checked: boolean;
  recipeId: string | null;
  createdAt: string;
}

type GroupedItems = Record<string, ShoppingListItem[]>;

const aisleColors = {
  "Produce": "bg-success/10 text-success",
  "Dairy": "bg-secondary/10 text-secondary", 
  "Meat": "bg-primary/10 text-primary",
  "Pantry": "bg-lavender/10 text-lavender",
  "Bakery": "bg-accent/50 text-accent-foreground",
  "Other": "bg-muted/50 text-muted-foreground",
};

const aisleIcons = {
  "Produce": "🥬",
  "Dairy": "🥛",
  "Meat": "🥩", 
  "Pantry": "🥫",
  "Bakery": "🍞",
  "Other": "📦",
};

export default function ShoppingView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groupedItems = {}, isLoading, error } = useQuery<GroupedItems>({
    queryKey: ["/api/shopping-list"],
    retry: false,
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ checked }),
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive",
        duration: 1000,
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shopping-list/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      toast({
        title: "Item Removed",
        description: "Item removed from shopping list",
        duration: 1000,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
          duration: 1000,
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
        duration: 1000,
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/shopping-list", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      toast({
        title: "Shopping List Cleared",
        description: "All items removed from shopping list",
        duration: 1000,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
          duration: 1000,
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to clear shopping list. Please try again.",
        variant: "destructive",
        duration: 1000,
      });
    },
  });

  const totalItems = Object.values(groupedItems).flat().length;
  const checkedItems = Object.values(groupedItems).flat().filter(item => item.checked).length;

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
      duration: 1000,
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your shopping list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Shopping List</h2>
          {totalItems > 0 && (
            <p className="text-sm text-muted-foreground">
              {checkedItems} of {totalItems} items completed
            </p>
          )}
        </div>
        {totalItems > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAllMutation.mutate()}
            disabled={clearAllMutation.isPending}
            className="text-destructive hover:text-destructive/80"
          >
            {clearAllMutation.isPending ? "Clearing..." : "Clear All"}
          </Button>
        )}
      </div>

      {totalItems === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your shopping list is empty</h3>
            <p className="text-muted-foreground mb-4">
              Add ingredients from recipes to get started!
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-full pb-20">
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([aisle, items]) => (
              <div key={aisle} className="bg-white rounded-xl shadow-sm border border-border p-4">
                <h3 className="font-bold text-foreground mb-3 flex items-center">
                  <span className="text-lg mr-2">{aisleIcons[aisle as keyof typeof aisleIcons] || "📦"}</span>
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${aisleColors[aisle as keyof typeof aisleColors] || aisleColors.Other}`}></span>
                  {aisle}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 group">
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={(checked) =>
                          updateItemMutation.mutate({ id: item.id, checked: !!checked })
                        }
                        disabled={updateItemMutation.isPending}
                        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                      />
                      <label
                        htmlFor={item.id}
                        className={`flex-1 text-sm cursor-pointer ${
                          item.checked
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.name}
                      </label>
                      <span
                        className={`text-sm ${
                          item.checked
                            ? "line-through text-muted-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatQuantity(item.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 p-1 h-auto"
                        onClick={() => removeItemMutation.mutate(item.id)}
                        disabled={removeItemMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
